import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput, ScrollView, Modal, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  date: string;
  category_name: string;
  category_id: number;
  student_id: number | null;
  vehicle_id: number | null;
  staff_id: number | null;
  fuel_liters: number | null;
  mileage_at_transaction: number | null;
}

interface MonthSection {
  title: string;
  income: number;
  expense: number;
  data: Transaction[];
}

export function HistoryScreen() {
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('ALL');
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Collapsible months state
  const [collapsedMonths, setCollapsedMonths] = useState<Record<string, boolean>>({});

  // Metadata for editing transactions
  const [categories, setCategories] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);

  // Modals state
  const [actionsModalVisible, setActionsModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Edit transaction form state
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState<'INCOME' | 'EXPENSE'>('INCOME');
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const [editStudentId, setEditStudentId] = useState<number | null>(null);
  const [editVehicleId, setEditVehicleId] = useState<number | null>(null);
  const [editStaffId, setEditStaffId] = useState<number | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editFuelLiters, setEditFuelLiters] = useState('');
  const [editMileage, setEditMileage] = useState('');
  const [editDate, setEditDate] = useState<Date>(new Date());
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const loadTransactions = useCallback(async () => {
    try {
      const data = await DatabaseService.getTransactions();
      setAllTransactions(data);
    } catch {
      setAllTransactions([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMetadata = useCallback(async () => {
    try {
      const catsIncome = await DatabaseService.getCategories('INCOME');
      const catsExpense = await DatabaseService.getCategories('EXPENSE');
      setCategories([...catsIncome, ...catsExpense]);

      const studs = await DatabaseService.getStudents();
      setStudents(studs);

      const vehs = await DatabaseService.getVehicles();
      setVehicles(vehs);

      const staff = await DatabaseService.getStaff();
      setStaffList(staff);
    } catch (e) {
      console.log('Error loading metadata in HistoryScreen', e);
    }
  }, []);

  useEffect(() => {
    loadTransactions();
    loadMetadata();
  }, [loadTransactions, loadMetadata]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [loadTransactions]);

  const availableCategories = useMemo(() => {
    const cats = new Set<string>();
    allTransactions.forEach(t => {
      if (t.category_name) cats.add(t.category_name);
    });
    return Array.from(cats).sort();
  }, [allTransactions]);

  const filteredData = useMemo(() => {
    return allTransactions.filter(t => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchCat = t.category_name?.toLowerCase().includes(q);
        const matchDesc = t.description?.toLowerCase().includes(q);
        const matchAmount = t.amount.toString().includes(q);
        if (!matchCat && !matchDesc && !matchAmount) return false;
      }
      
      // 2. Chip Filter
      if (activeFilter === 'INCOME') return t.type === 'INCOME';
      if (activeFilter === 'EXPENSE') return t.type === 'EXPENSE';
      if (activeFilter !== 'ALL') return t.category_name === activeFilter;
      
      return true;
    });
  }, [allTransactions, searchQuery, activeFilter]);

  const sections = useMemo(() => {
    const groups: { [key: string]: MonthSection } = {};
    
    filteredData.forEach((t) => {
      const dateObj = new Date(t.date);
      const monthKey = dateObj.toLocaleDateString(isRTL ? 'ar' : 'fr-FR', {
        month: 'long',
        year: 'numeric'
      });
      const formattedTitle = monthKey.charAt(0).toUpperCase() + monthKey.slice(1);

      if (!groups[monthKey]) {
        groups[monthKey] = {
          title: formattedTitle,
          income: 0,
          expense: 0,
          data: []
        };
      }

      if (t.type === 'INCOME') {
        groups[monthKey].income += t.amount;
      } else {
        groups[monthKey].expense += t.amount;
      }

      // Add to data if not collapsed
      if (!collapsedMonths[formattedTitle]) {
        groups[monthKey].data.push(t);
      }
    });

    return Object.values(groups);
  }, [filteredData, isRTL, collapsedMonths]);

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString(isRTL ? 'ar' : 'fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const toggleMonthCollapse = (title: string) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  const getTranslatedCategory = (name: string) => {
    switch (name) {
      case 'Carburant': return t('cat_fuel') || 'Carburant';
      case 'Entretien & Réparation': return t('cat_maintenance') || 'Entretien & Réparation';
      case 'Vidange': return t('cat_oil') || 'Vidange';
      case 'Assurance': return t('cat_insurance') || 'Assurance';
      case 'Loyer Local': return t('cat_rent') || 'Loyer Local';
      case 'Salaires': return t('cat_salaries') || 'Salaires';
      case 'Électricité & Internet': return t('cat_electricity') || 'Électricité & Internet';
      case 'Autre': return t('cat_other') || 'Autre';
      case 'Paiement Forfait': return t('paid_amount') || 'Paiement Forfait';
      default: return name;
    }
  };

  const handleLongPress = (item: Transaction) => {
    setSelectedTransaction(item);
    setActionsModalVisible(true);
  };

  const handleOpenEdit = () => {
    if (!selectedTransaction) return;
    setActionsModalVisible(false);

    // Initialize Form State
    setEditAmount(String(selectedTransaction.amount));
    setEditType(selectedTransaction.type as 'INCOME' | 'EXPENSE');
    setEditCategoryId(selectedTransaction.category_id);
    setEditStudentId(selectedTransaction.student_id);
    setEditVehicleId(selectedTransaction.vehicle_id);
    setEditStaffId(selectedTransaction.staff_id);
    setEditDescription(selectedTransaction.description || '');
    setEditFuelLiters(selectedTransaction.fuel_liters ? String(selectedTransaction.fuel_liters) : '');
    setEditMileage(selectedTransaction.mileage_at_transaction ? String(selectedTransaction.mileage_at_transaction) : '');
    setEditDate(new Date(selectedTransaction.date));
    setStudentSearchQuery('');

    setEditModalVisible(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedTransaction || !editCategoryId) return;

    const parsedAmount = parseFloat(editAmount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      showToast(t('invalid_amount') || "Montant invalide");
      return;
    }

    // Validation matching category rules
    const selectedCategoryObj = categories.find(c => c.id === editCategoryId);
    const isVehicle = selectedCategoryObj?.is_vehicle_related === 1;
    const isStaff = selectedCategoryObj?.is_staff_related === 1;
    const isFuel = selectedCategoryObj?.name === 'Carburant';

    if (isVehicle && !editVehicleId) {
      showToast(t('vehicle_required') || "Véhicule obligatoire");
      return;
    }

    if (isStaff && !editStaffId) {
      showToast(t('staff_required') || "Personnel obligatoire");
      return;
    }

    setSavingEdit(true);
    try {
      await DatabaseService.updateTransaction(
        selectedTransaction.id,
        parsedAmount,
        editCategoryId,
        editType === 'INCOME' ? editStudentId : null,
        editType === 'EXPENSE' ? editVehicleId : null,
        editDescription.trim(),
        editType === 'EXPENSE' && isFuel ? parseFloat(editFuelLiters) : null,
        editType === 'EXPENSE' && isVehicle ? parseInt(editMileage) : null,
        editType === 'EXPENSE' ? editStaffId : null,
        editDate.toISOString()
      );
      showToast(t('transaction_updated_toast') || "Transaction mise à jour");
      setEditModalVisible(false);
      setSelectedTransaction(null);
      loadTransactions();
    } catch (e) {
      showToast(t('error') || "Erreur");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeletePress = () => {
    if (!selectedTransaction) return;
    setActionsModalVisible(false);

    Alert.alert(
      t('confirm_delete') || "Supprimer",
      `${t('confirm_delete_msg') || 'Voulez-vous supprimer cette transaction de'} ${selectedTransaction.amount} DH ?\nCatégorie: ${getTranslatedCategory(selectedTransaction.category_name)}`,
      [
        { text: t('cancel') || "Annuler", style: "cancel" },
        { 
          text: t('delete') || "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              await DatabaseService.softDeleteTransaction(selectedTransaction.id);
              showToast(t('transaction_deleted_toast') || "Transaction déplacée dans la corbeille");
              setSelectedTransaction(null);
              loadTransactions();
            } catch (e) {
              showToast(t('error'));
            }
          }
        }
      ]
    );
  };

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (date) {
      setEditDate(date);
    }
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const isIncome = item.type === 'INCOME';
    const icon = isIncome ? '⬆️' : '⬇️';
    const amountColor = isIncome ? colors.success : colors.danger;
    const prefix = isIncome ? '+' : '-';
    
    const iconBgColor = isIncome ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7') : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2');

    let mainTitle = getTranslatedCategory(item.category_name);
    let subTitle = item.description || '';

    if (item.student_name) {
      mainTitle = `🎓 ${item.student_name} (Permis ${item.license_type || 'B'})`;
      subTitle = `${getTranslatedCategory(item.category_name)}${item.description ? ' • ' + item.description : ''}`;
    } else if (item.vehicle_name) {
      mainTitle = `🚘 ${item.vehicle_name} [${item.vehicle_reg || ''}]`;
      subTitle = `${getTranslatedCategory(item.category_name)}${item.description ? ' • ' + item.description : ''}`;
    } else if (item.staff_name) {
      mainTitle = `👤 ${item.staff_name} (${item.staff_role || ''})`;
      subTitle = `${getTranslatedCategory(item.category_name)}${item.description ? ' • ' + item.description : ''}`;
    }

    return (
      <TouchableOpacity 
        style={[styles.card, isRTL && styles.cardRTL]}
        onLongPress={() => handleLongPress(item)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={[styles.cardContent, isRTL && styles.cardContentRTL]}>
          <View style={[styles.cardHeader, isRTL && styles.rowRTL]}>
            <Text style={[styles.categoryName, isRTL && styles.textRTL]} numberOfLines={1}>
              {mainTitle}
            </Text>
            <Text style={[styles.amount, { color: amountColor }]}>
              {prefix}{Math.abs(item.amount).toFixed(2)} DH
            </Text>
          </View>

          {subTitle ? (
            <Text style={[styles.description, isRTL && styles.textRTL]} numberOfLines={2}>
              {subTitle}
            </Text>
          ) : null}

          <Text style={[styles.date, isRTL && styles.textRTL]}>
            {formatDate(item.date)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: MonthSection }) => {
    const net = section.income - section.expense;
    const isCollapsed = !!collapsedMonths[section.title];
    return (
      <TouchableOpacity 
        style={styles.sectionHeaderContainer}
        onPress={() => toggleMonthCollapse(section.title)}
        activeOpacity={0.8}
      >
        <View style={[styles.sectionTitleRow, isRTL && styles.rowRTL]}>
          <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{section.title}</Text>
          <Ionicons 
            name={isCollapsed ? "chevron-down" : "chevron-up"} 
            size={22} 
            color={colors.text} 
          />
        </View>
        <View style={[styles.sectionStats, isRTL && styles.rowRTL]}>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('income_label') || 'Entrées'}</Text>
            <Text style={[styles.statValue, { color: colors.success }]}>+{section.income.toFixed(0)} DH</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('expense_label') || 'Sorties'}</Text>
            <Text style={[styles.statValue, { color: colors.danger }]}>-{section.expense.toFixed(0)} DH</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('profit_label') || 'Bénéfice'}</Text>
            <Text style={[styles.statValue, { color: net >= 0 ? colors.primary : colors.danger }]}>
              {net >= 0 ? '+' : ''}{net.toFixed(0)} DH
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyIcon}>📋</Text>
        <Text style={styles.emptyText}>{searchQuery || activeFilter !== 'ALL' ? 'Aucune transaction trouvée.' : t('no_transactions')}</Text>
      </View>
    );
  };

  const filteredCategories = useMemo(() => {
    return categories.filter(c => c.type === editType);
  }, [categories, editType]);

  const selectedCategoryObj = useMemo(() => {
    return categories.find(c => c.id === editCategoryId);
  }, [categories, editCategoryId]);

  const isVehicleRelated = selectedCategoryObj?.is_vehicle_related === 1;
  const isStaffRelated = selectedCategoryObj?.is_staff_related === 1;
  const isFuel = selectedCategoryObj?.name === 'Carburant';

  const styles = getStyles(colors, isDark);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, isRTL && styles.headerRTL]}>
        <Text style={[styles.headerTitle, isRTL && styles.textRTL]}>{t('history')}</Text>
        <Text style={[styles.headerSubtitle, isRTL && styles.textRTL]}>
          {filteredData.length} {t('transactions') ?? 'transactions'}
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <TextInput
          style={[styles.searchInput, isRTL && styles.textRTL]}
          placeholder={`🔍 ${t('search')}... (ex: Carburant, Vidange, Montant)`}
          placeholderTextColor={colors.textSecondary}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false} 
          style={styles.chipScroll} 
          contentContainerStyle={[styles.chipContent, isRTL && styles.rowRTL]}
        >
          <TouchableOpacity 
            style={[styles.chip, activeFilter === 'ALL' && styles.activeChip]} 
            onPress={() => setActiveFilter('ALL')}
          >
            <Text style={[styles.chipText, activeFilter === 'ALL' && styles.activeChipText]}>Tous</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.chip, activeFilter === 'INCOME' && styles.activeChip]} 
            onPress={() => setActiveFilter('INCOME')}
          >
            <Text style={[styles.chipText, activeFilter === 'INCOME' && styles.activeChipText]}>Entrées</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.chip, activeFilter === 'EXPENSE' && styles.activeChip]} 
            onPress={() => setActiveFilter('EXPENSE')}
          >
            <Text style={[styles.chipText, activeFilter === 'EXPENSE' && styles.activeChipText]}>Sorties</Text>
          </TouchableOpacity>
          
          {availableCategories.map(cat => (
            <TouchableOpacity 
              key={cat}
              style={[styles.chip, activeFilter === cat && styles.activeChip]} 
              onPress={() => setActiveFilter(cat)}
            >
              <Text style={[styles.chipText, activeFilter === cat && styles.activeChipText]}>{getTranslatedCategory(cat)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <SectionList
        sections={sections}
        renderItem={renderTransaction}
        renderSectionHeader={renderSectionHeader}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      />

      {/* ACTIONS MODAL (LONG PRESS) */}
      <Modal
        visible={actionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setActionsModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setActionsModalVisible(false)}
        >
          <View style={styles.actionsModalContent}>
            <Text style={styles.actionsModalTitle}>{t('transaction_actions') || 'Actions de Transaction'}</Text>
            {selectedTransaction && (
              <View style={styles.actionsSummary}>
                <Text style={styles.summaryCategory}>{getTranslatedCategory(selectedTransaction.category_name)}</Text>
                <Text style={[styles.summaryAmount, { color: selectedTransaction.type === 'INCOME' ? colors.success : colors.danger }]}>
                  {selectedTransaction.type === 'INCOME' ? '+' : '-'}{selectedTransaction.amount.toFixed(2)} DH
                </Text>
                <Text style={styles.summaryDate}>{formatDate(selectedTransaction.date)}</Text>
              </View>
            )}

            <TouchableOpacity 
              style={[styles.actionBtn, styles.editActionBtn, isRTL && styles.rowRTL]} 
              onPress={handleOpenEdit}
            >
              <Ionicons name="create-outline" size={20} color={colors.primary} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
              <Text style={styles.editActionText}>{t('edit') || 'Modifier'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.deleteActionBtn, isRTL && styles.rowRTL]} 
              onPress={handleDeletePress}
            >
              <Ionicons name="trash-outline" size={20} color={colors.danger} style={isRTL ? { marginLeft: 10 } : { marginRight: 10 }} />
              <Text style={styles.deleteActionText}>{t('delete') || 'Supprimer'}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={[styles.actionBtn, styles.cancelActionBtn]} 
              onPress={() => setActionsModalVisible(false)}
            >
              <Text style={styles.cancelActionText}>{t('cancel') || 'Annuler'}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* TRANSACTION EDIT FORM MODAL */}
      <Modal
        visible={editModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.editModalContent}>
            <View style={[styles.modalHeader, isRTL && styles.rowRTL]}>
              <Text style={styles.modalTitle}>{t('edit_transaction') || 'Modifier la Transaction'}</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Ionicons name="close" size={26} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Type selector */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('type') || 'Type'}</Text>
              <View style={styles.typeSelectorContainer}>
                <TouchableOpacity 
                  style={[styles.typeBtn, editType === 'INCOME' && styles.typeBtnIncomeSelected]}
                  onPress={() => {
                    setEditType('INCOME');
                    setEditCategoryId(null);
                  }}
                >
                  <Text style={[styles.typeBtnText, editType === 'INCOME' && styles.typeBtnTextSelected]}>
                    {t('income') || 'Revenu'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.typeBtn, editType === 'EXPENSE' && styles.typeBtnExpenseSelected]}
                  onPress={() => {
                    setEditType('EXPENSE');
                    setEditCategoryId(null);
                  }}
                >
                  <Text style={[styles.typeBtnText, editType === 'EXPENSE' && styles.typeBtnTextSelected]}>
                    {t('expense') || 'Dépense'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Amount */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('amount')}</Text>
              <View style={[styles.amountInputRow, isRTL && styles.rowRTL]}>
                <TextInput
                  style={[styles.amountInput, isRTL && styles.textRTL]}
                  value={editAmount}
                  onChangeText={setEditAmount}
                  placeholder="0.00"
                  keyboardType="numeric"
                  placeholderTextColor={colors.textSecondary}
                />
                <Text style={styles.currencySuffix}>DH</Text>
              </View>

              {/* Date */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('date') || 'Date'}</Text>
              <TouchableOpacity 
                style={[styles.dateButton, isRTL && styles.rowRTL]} 
                onPress={() => setShowDatePicker(true)}
              >
                <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} style={isRTL ? { marginLeft: 8 } : { marginRight: 8 }} />
                <Text style={styles.dateButtonText}>{formatDate(editDate.toISOString())}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={editDate}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}

              {/* Categories */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('category')}</Text>
              <View style={[styles.chipContainer, isRTL && styles.rowRTL]}>
                {filteredCategories.map(cat => {
                  const selected = editCategoryId === cat.id;
                  const chipSelectedStyle = editType === 'INCOME' ? styles.chipSelectedIncome : styles.chipSelectedExpense;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[styles.formChip, selected && chipSelectedStyle]}
                      onPress={() => setEditCategoryId(cat.id)}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                        {getTranslatedCategory(cat.name)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Conditional Options: Student, Vehicle, Staff */}
              {editType === 'INCOME' && (
                <View style={styles.formSection}>
                  <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>
                    {t('student_concerned') || 'Élève concerné'} <Text style={styles.optionalLabel}>({t('optional')})</Text>
                  </Text>
                  <TextInput
                    style={[styles.searchInput, isRTL && styles.textRTL]}
                    placeholder={t('search') ?? 'Rechercher un élève...'}
                    placeholderTextColor={colors.textSecondary}
                    value={studentSearchQuery}
                    onChangeText={setStudentSearchQuery}
                  />
                  <View style={[styles.chipContainer, isRTL && styles.rowRTL]}>
                    {students.filter(s => s.name.toLowerCase().includes(studentSearchQuery.toLowerCase())).slice(0, 8).map(s => {
                      const selected = editStudentId === s.id;
                      return (
                        <TouchableOpacity
                          key={s.id}
                          style={[styles.formChip, selected && styles.chipSelectedIncome]}
                          onPress={() => setEditStudentId(selected ? null : s.id)}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                            🎓 {s.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {editType === 'EXPENSE' && isVehicleRelated && (
                <View style={styles.formSection}>
                  <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('vehicle_concerned') || 'Véhicule concerné'}</Text>
                  <View style={[styles.chipContainer, isRTL && styles.rowRTL]}>
                    {vehicles.map(v => {
                      const selected = editVehicleId === v.id;
                      return (
                        <TouchableOpacity
                          key={v.id}
                          style={[styles.formChip, selected && styles.chipSelectedExpense]}
                          onPress={() => setEditVehicleId(selected ? null : v.id)}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                            🚗 {v.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('current_mileage') || 'Kilométrage actuel'}</Text>
                  <TextInput
                    style={[styles.inputField, isRTL && styles.textRTL]}
                    value={editMileage}
                    onChangeText={setEditMileage}
                    keyboardType="numeric"
                    placeholder="km"
                    placeholderTextColor={colors.textSecondary}
                  />

                  {isFuel && (
                    <>
                      <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('fuel_liters') || 'Quantité en Litres (L)'}</Text>
                      <TextInput
                        style={[styles.inputField, isRTL && styles.textRTL]}
                        value={editFuelLiters}
                        onChangeText={setEditFuelLiters}
                        keyboardType="numeric"
                        placeholder="L"
                        placeholderTextColor={colors.textSecondary}
                      />
                    </>
                  )}
                </View>
              )}

              {editType === 'EXPENSE' && isStaffRelated && (
                <View style={styles.formSection}>
                  <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('staff')}</Text>
                  <View style={[styles.chipContainer, isRTL && styles.rowRTL]}>
                    {staffList.map(st => {
                      const selected = editStaffId === st.id;
                      return (
                        <TouchableOpacity
                          key={st.id}
                          style={[styles.formChip, selected && styles.chipSelectedExpense]}
                          onPress={() => setEditStaffId(selected ? null : st.id)}
                        >
                          <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                            👤 {st.name} ({st.role})
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Description */}
              <Text style={[styles.fieldLabel, isRTL && styles.textRTL]}>{t('description')}</Text>
              <TextInput
                style={[styles.textAreaField, isRTL && styles.textRTL]}
                value={editDescription}
                onChangeText={setEditDescription}
                placeholder={t('description_placeholder') || 'Détails...'}
                placeholderTextColor={colors.textSecondary}
                multiline
                numberOfLines={3}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.cancelBtn]} 
                  onPress={() => setEditModalVisible(false)}
                >
                  <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.modalBtn, styles.saveBtn]} 
                  onPress={handleSaveEdit}
                  disabled={savingEdit}
                >
                  {savingEdit ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.saveBtnText}>{t('save')}</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const getStyles = (colors: ThemeColors, isDark: boolean) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: colors.text,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    marginBottom: 12,
  },
  chipScroll: {
    flexGrow: 0,
  },
  chipContent: {
    gap: 8,
    paddingRight: 20,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textSecondary,
  },
  activeChipText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    gap: 12,
    paddingBottom: 40,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  cardContentRTL: {
    marginLeft: 0,
    marginRight: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  date: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  textRTL: {
    textAlign: 'right',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  sectionHeaderContainer: {
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  sectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
  },

  // Modals Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  actionsModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '90%',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'stretch',
  },
  actionsModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  actionsSummary: {
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.03)' : '#f8fafc',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  summaryCategory: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    marginVertical: 6,
  },
  summaryDate: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  editActionBtn: {
    backgroundColor: isDark ? 'rgba(59, 130, 246, 0.08)' : '#eff6ff',
    borderColor: isDark ? 'rgba(59, 130, 246, 0.2)' : '#bfdbfe',
  },
  editActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteActionBtn: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.08)' : '#fef2f2',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.2)' : '#fecaca',
  },
  deleteActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.danger,
  },
  cancelActionBtn: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    marginTop: 6,
  },
  cancelActionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textSecondary,
  },

  // Edit Modal Form Styles
  editModalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxHeight: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 14,
    marginBottom: 8,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    borderRadius: 12,
    padding: 4,
    marginBottom: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeBtnIncomeSelected: {
    backgroundColor: colors.success,
  },
  typeBtnExpenseSelected: {
    backgroundColor: colors.danger,
  },
  typeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  typeBtnTextSelected: {
    color: '#fff',
  },
  amountInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    backgroundColor: colors.background,
    paddingHorizontal: 16,
  },
  amountInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  currencySuffix: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dateButtonText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
  },
  chipContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  formChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: isDark ? 'rgba(255, 255, 255, 0.05)' : '#f1f5f9',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipSelectedIncome: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  chipSelectedExpense: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  chipTextSelected: {
    color: '#fff',
    fontWeight: '600',
  },
  optionalLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: 'normal',
  },
  formSection: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
  },
  inputField: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    marginBottom: 8,
  },
  textAreaField: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  saveBtn: {
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16,
  },
});

