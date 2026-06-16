import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Modal, ActivityIndicator, RefreshControl, Alert, ScrollView } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';
import { useTheme } from '../theme/ThemeContext';
import { ThemeColors } from '../theme/colors';

export function StudentsScreen() {
  const { t, isRTL } = useLanguage();
  const { colors, isDark } = useTheme();
  const [students, setStudents] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ACTIVE'|'ARCHIVED'>('ACTIVE');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // History modal state
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [selectedStudentForHistory, setSelectedStudentForHistory] = useState<any>(null);

  // Modal state
  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<any>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [packagePrice, setPackagePrice] = useState('');
  const [advance, setAdvance] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStudents = useCallback(async () => {
    try {
      const data = await DatabaseService.getStudents();
      setStudents(data);
      setFiltered(data);
      setSearch('');
    } catch {
      // silent
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  useEffect(() => {
    let filteredData = students.filter(s => (s.status || 'ACTIVE') === filterStatus);
    
    if (!search.trim()) {
      setFiltered(students);
    } else {
      const q = search.toLowerCase();
      filteredData = filteredData.filter((s) => s.name?.toLowerCase().includes(q) || s.phone?.includes(q));
    }
    setFiltered(filteredData);
  }, [search, students, filterStatus]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadStudents();
  }, [loadStudents]);

  const resetForm = () => {
    setName('');
    setPhone('');
    setPackagePrice('');
    setAdvance('');
    setEditingStudent(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalVisible(true);
  };

  const openEditModal = (student: any) => {
    setEditingStudent(student);
    setName(student.name || '');
    setPhone(student.phone || '');
    setPackagePrice(String(student.package_price || 0));
    setAdvance('');
    setModalVisible(true);
  };

  const handleDelete = (student: any) => {
    Alert.alert(
      t('confirm_delete'),
      t('confirm_delete_msg'),
      [
        { text: t('no'), style: 'cancel' },
        {
          text: t('yes'),
          style: 'destructive',
          onPress: async () => {
            try {
              await DatabaseService.deleteStudent(student.id);
              showToast(t('student_deleted'));
              loadStudents();
            } catch {
              showToast(t('error'));
            }
          },
        },
      ]
    );
  };

  const handleToggleStatus = async (student: any) => {
    const newStatus = student.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED';
    const actionText = newStatus === 'ARCHIVED' ? 'archiver cet élève (permis obtenu/abandon)' : 'réactiver cet élève';
    
    Alert.alert(
      "Changer le statut",
      `Voulez-vous vraiment ${actionText} ?`,
      [
        { text: t('cancel') || 'Annuler', style: 'cancel' },
        {
          text: t('yes') || 'Oui',
          onPress: async () => {
            try {
              await DatabaseService.updateStudentStatus(student.id, newStatus);
              showToast("Statut mis à jour");
              loadStudents();
            } catch {
              showToast(t('error'));
            }
          }
        }
      ]
    );
  };

  const openHistoryModal = async (student: any) => {
    setSelectedStudentForHistory(student);
    setHistoryModalVisible(true);
    setLoadingHistory(true);
    try {
      const data = await DatabaseService.getStudentTransactions(student.id);
      setStudentHistory(data);
    } catch {
      showToast(t('error'));
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim() || !packagePrice.trim()) {
      showToast(t('fill_required'));
      return;
    }
    const priceVal = parseFloat(packagePrice);
    const advanceVal = parseFloat(advance) || 0;

    if (isNaN(priceVal) || priceVal <= 0) {
      showToast(t('invalid_amount'));
      return;
    }
    if (editingStudent && advanceVal > Math.max(0, priceVal - (editingStudent.paid_amount || 0))) {
      showToast(t('invalid_amount'));
      return;
    }
    if (!editingStudent && advanceVal > priceVal) {
      showToast(t('invalid_amount'));
      return;
    }

    setSaving(true);
    try {
      if (editingStudent) {
        await DatabaseService.updateStudent(editingStudent.id, name.trim(), phone.trim(), priceVal);
        if (advanceVal > 0) {
          const cats = await DatabaseService.getCategories('INCOME');
          const catId = cats.length > 0 ? cats[0].id : 1;
          await DatabaseService.addIncome(advanceVal, catId, editingStudent.id, 'Avance sur forfait');
        }
        showToast(t('student_updated'));
      } else {
        await DatabaseService.addStudent(name.trim(), phone.trim(), priceVal, advanceVal > 0 ? advanceVal : undefined);
        showToast(t('student_added'));
      }
      resetForm();
      setModalVisible(false);
      loadStudents();
    } catch {
      showToast(t('error'));
    } finally {
      setSaving(false);
    }
  };

  const renderStudent = ({ item }: { item: any }) => {
    const balance = (item.package_price || 0) - (item.paid_amount || 0);
    const isPaid = balance <= 0;
    const enrolledDate = item.created_at ? new Date(item.created_at).toLocaleDateString() : '';

    return (
      <View style={styles.card}>
        <View style={[styles.cardHeader, isRTL && styles.rowReverse]}>
          <Text style={[styles.cardName, isRTL && styles.textRight]}>{item.name}</Text>
          <View style={[styles.cardActions, isRTL && styles.rowReverse]}>
            <TouchableOpacity style={styles.historyBtn} onPress={() => openHistoryModal(item)}>
              <Text style={styles.historyBtnText}>📋</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.statusBtn} onPress={() => handleToggleStatus(item)}>
              <Text style={styles.statusBtnText}>{item.status === 'ARCHIVED' ? '♻️' : '📦'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} onPress={() => openEditModal(item)}>
              <Text style={styles.editBtnText}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={() => handleDelete(item)}>
              <Text style={styles.deleteBtnText}>🗑️</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 4 }]}>
          <Text style={styles.cardDetail}>📞 {item.phone || '—'}</Text>
        </View>
        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 4 }]}>
          <Text style={styles.cardDetail}>📅 {t('enrolled')}: {enrolledDate}</Text>
        </View>

        {/* Price and payment info */}
        <View style={[styles.paymentInfo, isRTL && styles.rowReverse]}>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>{t('package_price')}</Text>
            <Text style={styles.paymentValue}>{(item.package_price || 0).toFixed(0)} DH</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>{t('advance')}</Text>
            <Text style={[styles.paymentValue, styles.greenText]}>{(item.paid_amount || 0).toFixed(0)} DH</Text>
          </View>
          <View style={styles.paymentItem}>
            <Text style={styles.paymentLabel}>{t('remaining_amount')}</Text>
            <Text style={[styles.paymentValue, !isPaid && styles.redText]}>
              {isPaid ? '0' : balance.toFixed(0)} DH
            </Text>
          </View>
        </View>

        <View style={[styles.row, isRTL && styles.rowReverse, { marginTop: 12 }]}>
          {isPaid ? (
            <View style={[styles.badge, styles.badgeGreen]}>
              <Text style={styles.badgeTextGreen}>✅ {t('paid')}</Text>
            </View>
          ) : (
            <View style={[styles.badge, styles.badgeRed]}>
              <Text style={styles.badgeTextRed}>⚠️ {t('debt')}: {balance.toFixed(0)} DH</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const styles = getStyles(colors, isDark);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, isRTL && styles.rowReverse]}>
        <Text style={styles.headerTitle}>{t('students')}</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAddModal}>
          <Text style={styles.addBtnText}>+ {t('add_new')}</Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.filterContainer}>
        <View style={styles.tabContainer}>
          <TouchableOpacity 
            style={[styles.tab, filterStatus === 'ACTIVE' && styles.activeTab]}
            onPress={() => setFilterStatus('ACTIVE')}
          >
            <Text style={[styles.tabText, filterStatus === 'ACTIVE' && styles.activeTabText]}>Actifs</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, filterStatus === 'ARCHIVED' && styles.activeTab]}
            onPress={() => setFilterStatus('ARCHIVED')}
          >
            <Text style={[styles.tabText, filterStatus === 'ARCHIVED' && styles.activeTabText]}>Archivés</Text>
          </TouchableOpacity>
        </View>
        <TextInput
          style={[styles.searchBar, isRTL && styles.textRight]}
          placeholder={`🔍 ${t('search')}...`}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={colors.textSecondary}
        />
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderStudent}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} tintColor={colors.primary} />}
        ListEmptyComponent={
          <View style={styles.center}>
            <Text style={styles.emptyText}>{t('no_data')}</Text>
          </View>
        }
      />

      {/* Add/Edit Student Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={[styles.modalTitle, isRTL && styles.textRight]}>
              {editingStudent ? t('edit_student') : t('add_student')}
            </Text>

            <ScrollView 
              showsVerticalScrollIndicator={false}
              style={{ flexShrink: 1, width: '100%' }}
              contentContainerStyle={{ paddingBottom: 20 }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Nom */}
            <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('name')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder={t('name')}
              value={name}
              onChangeText={setName}
              placeholderTextColor={colors.textSecondary}
            />

            {/* Téléphone */}
            <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('phone')}</Text>
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder={t('phone')}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Prix du forfait */}
            <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>{t('package_price')} (DH)</Text>
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder="0"
              value={packagePrice}
              onChangeText={setPackagePrice}
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Avance (works for both new and editing) */}
            <Text style={[styles.fieldLabel, isRTL && styles.textRight]}>
              {editingStudent ? 'Nouvelle Avance (Optionnel)' : t('advance')} (DH)
            </Text>
            <TextInput
              style={[styles.input, isRTL && styles.textRight]}
              placeholder="0"
              value={advance}
              onChangeText={setAdvance}
              keyboardType="numeric"
              placeholderTextColor={colors.textSecondary}
            />

            {/* Show remaining */}
            <View style={styles.remainingBox}>
              {editingStudent && (
                <Text style={styles.remainingLabel}>Total déjà payé : {editingStudent?.paid_amount?.toFixed(0) || 0} DH</Text>
              )}
              <Text style={styles.remainingValue}>
                Reste à payer : {
                  Math.max(0, 
                    (parseFloat(packagePrice) || 0) - 
                    (editingStudent ? (editingStudent.paid_amount || 0) : 0) - 
                    (parseFloat(advance) || 0)
                  ).toFixed(0)
                } DH
              </Text>
            </View>
            </ScrollView>

            <View style={[styles.modalActions, isRTL && styles.rowReverse]}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => {
                  setModalVisible(false);
                  resetForm();
                }}
              >
                <Text style={styles.cancelBtnText}>{t('cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleSave} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>{t('save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* History Modal */}
      <Modal visible={historyModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Historique : {selectedStudentForHistory?.name}</Text>
              <TouchableOpacity onPress={() => setHistoryModalVisible(false)}>
                <Text style={styles.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {loadingHistory ? (
              <ActivityIndicator size="large" color={colors.primary} style={{ margin: 20 }} />
            ) : (
              <FlatList
                data={studentHistory}
                keyExtractor={(item) => String(item.id)}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={styles.historyCard}>
                    <Text style={styles.historyDate}>{new Date(item.date).toLocaleDateString()}</Text>
                    <Text style={styles.historyAmount}>+{item.amount} DH</Text>
                    {item.description ? <Text style={styles.historyDesc}>{item.description}</Text> : null}
                  </View>
                )}
                ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: colors.textSecondary }}>Aucun paiement enregistré.</Text>}
              />
            )}
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
  },
  addBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
  },
  addBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  searchBar: {
    backgroundColor: colors.surface,
    marginHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: isDark ? 0.3 : 0.05,
    shadowRadius: 10,
    elevation: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 8,
  },
  historyBtn: {
    backgroundColor: isDark ? 'rgba(139, 92, 246, 0.15)' : '#F3E8FF',
    borderRadius: 10,
    padding: 10,
  },
  historyBtnText: {
    fontSize: 16,
  },
  statusBtn: {
    backgroundColor: isDark ? 'rgba(99, 102, 241, 0.15)' : '#E0E7FF',
    borderRadius: 10,
    padding: 10,
  },
  statusBtnText: {
    fontSize: 16,
  },
  editBtn: {
    backgroundColor: colors.iconBg,
    borderRadius: 10,
    padding: 10,
  },
  editBtnText: {
    fontSize: 16,
  },
  deleteBtn: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.15)' : '#FEF2F2',
    borderRadius: 10,
    padding: 10,
  },
  deleteBtnText: {
    fontSize: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowReverse: {
    flexDirection: 'row-reverse',
  },
  textRight: {
    textAlign: 'right',
  },
  cardDetail: {
    fontSize: 15,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  filterContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: isDark ? colors.border : '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: isDark ? 0 : 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  activeTabText: {
    color: colors.text,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    fontSize: 22,
    color: colors.textSecondary,
    padding: 4,
  },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  historyDate: {
    color: colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
  historyAmount: {
    color: colors.success,
    fontWeight: '700',
    fontSize: 16,
  },
  historyDesc: {
    color: colors.textSecondary,
    fontSize: 14,
    fontStyle: 'italic',
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  paymentItem: {
    alignItems: 'center',
    flex: 1,
  },
  paymentLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  paymentValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  greenText: {
    color: colors.success,
  },
  redText: {
    color: colors.danger,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  badgeGreen: {
    backgroundColor: isDark ? 'rgba(16, 185, 129, 0.1)' : '#f0fdf4',
    borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : '#bbf7d0',
  },
  badgeRed: {
    backgroundColor: isDark ? 'rgba(239, 68, 68, 0.1)' : '#fef2f2',
    borderColor: isDark ? 'rgba(239, 68, 68, 0.3)' : '#fecaca',
  },
  badgeTextGreen: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.success,
  },
  badgeTextRed: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.danger,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: 24,
    maxHeight: '85%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 8,
    marginTop: 8,
  },
  input: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    color: colors.text,
  },
  remainingBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: isDark ? 'rgba(245, 158, 11, 0.1)' : '#FFF7ED',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: isDark ? 'rgba(245, 158, 11, 0.3)' : '#FED7AA',
  },
  remainingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: isDark ? '#FBBF24' : '#C2410C',
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: '700',
    color: isDark ? '#FBBF24' : '#C2410C',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    gap: 12,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
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
