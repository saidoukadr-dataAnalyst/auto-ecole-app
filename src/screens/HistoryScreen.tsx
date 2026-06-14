import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import { useLanguage } from '../services/i18n';

interface Transaction {
  id: number;
  amount: number;
  type: string;
  description: string;
  date: string;
  category_name: string;
}

export default function HistoryScreen() {
  const { t, isRTL } = useLanguage();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const data = await DatabaseService.getTransactions();
      setTransactions(data);
    } catch {
      setTransactions([]);
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

  const renderTransaction = ({ item }: { item: Transaction }) => {
    const isIncome = item.type === 'INCOME';
    const icon = isIncome ? '⬆️' : '⬇️';
    const amountColor = isIncome ? '#16a34a' : '#dc2626';
    const prefix = isIncome ? '+' : '-';

    return (
      <View style={[styles.card, isRTL && styles.cardRTL]}>
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
          {transactions.length} {t('transactions') ?? 'transactions'}
        </Text>
      </View>

      <FlatList
        data={transactions}
        renderItem={renderTransaction}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={[
          styles.listContent,
          transactions.length === 0 && styles.emptyList,
        ]}
        ListEmptyComponent={renderEmpty}
        showsVerticalScrollIndicator={false}
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
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
    marginRight: 8,
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  description: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 3,
  },
  date: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 4,
  },
  textRTL: {
    textAlign: 'right',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
  },
});
