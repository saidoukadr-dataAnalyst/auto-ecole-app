import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

export const HistoryScreen = ({ navigation }: any) => {
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadTransactions = async () => {
    try {
      const data = await DatabaseService.getTransactions();
      setTransactions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadTransactions();
    });
    return unsubscribe;
  }, [navigation]);

  const renderTransaction = ({ item }: { item: any }) => {
    const isIncome = item.type === 'INCOME';
    
    return (
      <View style={styles.card}>
        <View style={styles.cardIcon}>
          <Text style={styles.iconText}>{isIncome ? '⬆️' : '⬇️'}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.titleText}>{item.description}</Text>
          <Text style={styles.dateText}>{item.date}</Text>
        </View>
        <View style={styles.amountContainer}>
          <Text style={[styles.amountText, { color: isIncome ? '#16a34a' : '#ef4444' }]}>
            {isIncome ? '+' : '-'}{item.amount.toLocaleString()} DA
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Historique</Text>
      </View>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTransaction}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucune transaction enregistrée.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  listContainer: { padding: 16 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#f1f5f9', justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  iconText: { fontSize: 18 },
  cardInfo: { flex: 1 },
  titleText: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  dateText: { fontSize: 13, color: '#64748b' },
  amountContainer: { alignItems: 'flex-end' },
  amountText: { fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 16 }
});
