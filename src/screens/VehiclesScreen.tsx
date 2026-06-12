import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';

export const VehiclesScreen = ({ navigation }: any) => {
  const [vehicles, setVehicles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadVehicles = async () => {
    try {
      const data = await DatabaseService.getVehicles();
      setVehicles(data);
    } catch (error) {
      Alert.alert("Erreur", "Impossible de charger les véhicules.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadVehicles();
    });
    return unsubscribe;
  }, [navigation]);

  const renderVehicle = ({ item }: { item: any }) => {
    const remainingKm = item.next_oil_change_km - item.current_mileage;
    const isOilAlert = remainingKm <= 1000;
    
    // Simplification pour l'alerte date : on vérifie si on est à moins de 30 jours
    const today = new Date().toISOString().split('T')[0];
    const isTechnicalVisitAlert = item.technical_visit_date <= today; // À améliorer avec calcul de dates

    return (
      <TouchableOpacity style={styles.card} onPress={() => {}}>
        <View style={styles.cardHeader}>
          <Text style={styles.vehicleName}>{item.brand} - {item.registration_number}</Text>
        </View>
        
        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Kilométrage Actuel:</Text>
            <Text style={styles.infoValue}>{item.current_mileage.toLocaleString()} km</Text>
          </View>
          
          <View style={styles.alertBox}>
            <Text style={styles.alertTitle}>Alertes & Entretien</Text>
            
            <View style={styles.alertRow}>
              <Text style={styles.alertLabel}>Prochaine Vidange:</Text>
              <Text style={[styles.alertValue, { color: isOilAlert ? '#ef4444' : '#16a34a' }]}>
                Dans {remainingKm > 0 ? remainingKm.toLocaleString() : 0} km
              </Text>
            </View>

            <View style={styles.alertRow}>
              <Text style={styles.alertLabel}>Visite Technique:</Text>
              <Text style={[styles.alertValue, { color: isTechnicalVisitAlert ? '#ef4444' : '#16a34a' }]}>
                {item.technical_visit_date}
              </Text>
            </View>
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
        <Text style={styles.title}>Véhicules</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => {
          Alert.alert("Ajout", "Fonctionnalité d'ajout de véhicule");
        }}>
          <Text style={styles.addButtonText}>+ Nouveau</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={vehicles}
        keyExtractor={item => item.id.toString()}
        renderItem={renderVehicle}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <Text style={styles.emptyText}>Aucun véhicule trouvé.</Text>
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
  listContainer: { padding: 16 },
  card: { backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 16, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  cardHeader: { marginBottom: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 12 },
  vehicleName: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  cardBody: { gap: 12 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between' },
  infoLabel: { fontSize: 14, color: '#64748b', fontWeight: '600' },
  infoValue: { fontSize: 14, color: '#0f172a', fontWeight: 'bold' },
  alertBox: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', marginTop: 8 },
  alertTitle: { fontSize: 12, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 'bold', marginBottom: 8 },
  alertRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  alertLabel: { fontSize: 14, color: '#475569' },
  alertValue: { fontSize: 14, fontWeight: 'bold' },
  emptyText: { textAlign: 'center', color: '#94a3b8', marginTop: 40, fontSize: 16 }
});
