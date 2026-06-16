import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
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
  const [sections, setSections] = useState<MonthSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const groupTransactionsByMonth = (data: Transaction[]) => {
    const groups: { [key: string]: MonthSection } = {};
    
    data.forEach((t) => {
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
  };

  const loadTransactions = useCallback(async () => {
    try {
      const data = await DatabaseService.getTransactions();
      setTotalCount(data.length);
      const groupedData = groupTransactionsByMonth(data);
      setSections(groupedData);
    } catch {
      setSections([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isRTL]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadTransactions();
  }, [loadTransactions]);

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
        <Text style={styles.emptyText}>{t('no_transactions')}</Text>
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
          {totalCount} {t('transactions') ?? 'transactions'}
        </Text>
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
  listContent: {
    padding: 16,
    gap: 12,
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
