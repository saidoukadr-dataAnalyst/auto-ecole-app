import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

export const StudentsScreen = ({ navigation }: any) => {
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadStudents = async () => {
    try {
      const data = await DatabaseService.getStudents();
      setStudents(data);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les élèves.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadStudents();
    });
    return unsubscribe;
  }, [navigation]);

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(search.toLowerCase()) || 
    s.phone.includes(search)
  );

  const renderStudent = ({ item }: { item: any }) => {
    // Calcul de la balance : Paiements (Revenus liés à l'élève) - Forfait initial
    const balance = item.paid_amount - item.total_package_price;
    const isFullyPaid = balance >= 0;

    return (
      <TouchableOpacity style={styles.card} onPress={() => {}}>
        <View style={styles.cardHeader}>
          <Text style={styles.studentName}>{item.name}</Text>
          <View style={[styles.statusBadge, { backgroundColor: isFullyPaid ? '#dcfce7' : '#fee2e2' }]}>
            <Text style={[styles.statusText, { color: isFullyPaid ? '#16a34a' : '#ef4444' }]}>
              {isFullyPaid ? 'Soldé' : 'Dette'}
            </Text>
          </View>
        </View>
        
        <View style={styles.cardBody}>
          <Text style={styles.infoText}>📞 {item.phone}</Text>
          <Text style={styles.infoText}>📅 Inscrit le: {item.enrollment_date}</Text>
          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Reste à payer:</Text>
            <Text style={[styles.balanceAmount, { color: isFullyPaid ? '#16a34a' : '#ef4444' }]}>
              {isFullyPaid ? '0' : Math.abs(balance).toLocaleString()} DA
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Élèves</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => {
          // Naviguer vers un écran d'ajout (à faire ou modal)
          Alert.alert("Ajout", "Fonctionnalité d'ajout d'élève");
        }}>
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher par nom ou téléphone..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList
        data={filteredStudents}
        keyExtractor={item => item.id.toString()}
        renderItem={renderStudent}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun élève trouvé.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  addButton: { backgroundColor: '#2563eb', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addButtonText: { color: '#ffffff', fontWeight: 'bold' },
  searchContainer: { padding: 16, backgroundColor: '#ffffff' },
  searchInput: { backgroundColor: '#f1f5f9', borderRadius: 8, padding: 12, fontSize: 16, color: '#334155' },
  listContainer: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  studentName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  cardBody: { gap: 8 },
  infoText: { fontSize: 14, color: '#64748b' },
  balanceContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  balanceLabel: { fontSize: 14, fontWeight: '600', color: '#475569' },
  balanceAmount: { fontSize: 16, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 16 }
});
