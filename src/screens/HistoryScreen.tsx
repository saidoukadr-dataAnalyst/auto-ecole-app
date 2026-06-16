import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, TextInput, ScrollView } from 'react-native';
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

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

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
      // Format "Mois Année" (ex: Juin 2026)
      const monthKey = dateObj.toLocaleDateString(isRTL ? 'ar' : 'fr-FR', {
        month: 'long',
        year: 'numeric'
      });

      if (!groups[monthKey]) {
        groups[monthKey] = {
          title: monthKey.charAt(0).toUpperCase() + monthKey.slice(1),
          income: 0,
          expense: 0,
          data: []
        };
      }

      groups[monthKey].data.push(t);
      if (t.type === 'INCOME') {
        groups[monthKey].income += t.amount;
      } else {
        groups[monthKey].expense += t.amount;
      }
    });

    return Object.values(groups);
  }, [filteredData, isRTL]);

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

  const handleDeleteTransaction = (item: Transaction) => {
    Alert.alert(
      "Supprimer",
      `Voulez-vous supprimer cette transaction de ${item.amount} DH ?\nCatégorie: ${item.category_name}`,
      [
        { text: t('cancel') || "Annuler", style: "cancel" },
        { 
          text: "Supprimer", 
          style: "destructive",
          onPress: async () => {
            try {
              await DatabaseService.deleteTransaction(item.id);
              showToast("Transaction supprimée");
              loadTransactions();
            } catch (e) {
              showToast(t('error'));
            }
          }
        }
      ]
    );
  };

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'INCOME';
    const icon = isIncome ? '⬆️' : '⬇️';
    const amountColor = isIncome ? colors.success : colors.danger;
    const prefix = isIncome ? '+' : '-';
    
    const iconBgColor = isIncome ? (isDark ? 'rgba(16, 185, 129, 0.15)' : '#dcfce7') : (isDark ? 'rgba(239, 68, 68, 0.15)' : '#fee2e2');

    return (
      <TouchableOpacity 
        style={[styles.card, isRTL && styles.cardRTL]}
        onLongPress={() => handleDeleteTransaction(item)}
        delayLongPress={500}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
          <Text style={styles.icon}>{icon}</Text>
        </View>

        <View style={[styles.cardContent, isRTL && styles.cardContentRTL]}>
          <View style={[styles.cardHeader, isRTL && styles.rowRTL]}>
            <Text style={[styles.categoryName, isRTL && styles.textRTL]} numberOfLines={1}>
              {item.category_name}
            </Text>
            <Text style={[styles.amount, { color: amountColor }]}>
              {prefix}{Math.abs(item.amount).toFixed(2)} DH
            </Text>
          </View>

          {item.description ? (
            <Text style={[styles.description, isRTL && styles.textRTL]} numberOfLines={2}>
              {item.description}
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
    return (
      <View style={styles.sectionHeaderContainer}>
        <Text style={[styles.sectionTitle, isRTL && styles.textRTL]}>{section.title}</Text>
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
      </View>
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
              <Text style={[styles.chipText, activeFilter === cat && styles.activeChipText]}>{cat}</Text>
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
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
});
