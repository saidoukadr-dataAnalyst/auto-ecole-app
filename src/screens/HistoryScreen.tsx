import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';
import { showToast } from '../services/ToastService';

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
    const amountColor = isIncome ? '#16a34a' : '#dc2626';
    const prefix = isIncome ? '+' : '-';

    return (
      <TouchableOpacity 
        style={[styles.card, isRTL && styles.cardRTL]}
        onLongPress={() => handleDeleteTransaction(item)}
        delayLongPress={500}
      >
        <View style={[styles.iconContainer, { backgroundColor: isIncome ? '#dcfce7' : '#fee2e2' }]}>
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
            <Text style={[styles.statValue, { color: '#16a34a' }]}>+{section.income.toFixed(0)} DH</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('expense_label') || 'Sorties'}</Text>
            <Text style={[styles.statValue, { color: '#dc2626' }]}>-{section.expense.toFixed(0)} DH</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statLabel}>{t('profit_label') || 'Bénéfice'}</Text>
            <Text style={[styles.statValue, { color: net >= 0 ? '#2563eb' : '#dc2626' }]}>
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

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#6366f1" />
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
            colors={['#6366f1']}
            tintColor="#6366f1"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerRTL: {
    alignItems: 'flex-end',
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#94a3b8',
    marginTop: 2,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  emptyList: {
    flex: 1,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardRTL: {
    flexDirection: 'row-reverse',
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
  },
  cardContent: {
    flex: 1,
    marginLeft: 12,
  },
  cardContentRTL: {
    marginLeft: 0,
    marginRight: 12,
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
    color: '#0f172a',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 6,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
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
    color: '#94a3b8',
    fontWeight: '500',
  },
  sectionHeaderContainer: {
    marginTop: 16,
    marginBottom: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    padding: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 8,
  },
  sectionStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 10,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
});
