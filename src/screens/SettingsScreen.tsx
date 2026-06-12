import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { ExportService } from '../services/ExportService';

export const SettingsScreen = () => {
  const [loading, setLoading] = useState(false);

  const handleExportPDF = async () => {
    setLoading(true);
    try {
      await ExportService.generatePDFReport();
    } catch (error) {
      Alert.alert("Erreur", "Génération du PDF échouée.");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = async () => {
    setLoading(true);
    try {
      await ExportService.generateCSVExport();
    } catch (error) {
      Alert.alert("Erreur", "Exportation CSV échouée.");
    } finally {
      setLoading(false);
    }
  };

  const handleBackupDB = async () => {
    setLoading(true);
    try {
      await ExportService.backupDatabase();
    } catch (error) {
      Alert.alert("Erreur", "Sauvegarde de la base de données échouée.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color="#2563eb" /></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Paramètres & Export</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Comptabilité</Text>
        
        <TouchableOpacity style={styles.actionButton} onPress={handleExportPDF}>
          <Text style={styles.actionIcon}>📄</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Générer le Bilan PDF</Text>
            <Text style={styles.actionDesc}>Crée un reçu ou un rapport financier</Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionButton} onPress={handleExportCSV}>
          <Text style={styles.actionIcon}>📊</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Exporter en Excel (CSV)</Text>
            <Text style={styles.actionDesc}>Format adapté pour votre comptable</Text>
          </View>
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sauvegarde Locale</Text>
        
        <TouchableOpacity style={[styles.actionButton, { borderColor: '#3b82f6', borderWidth: 1 }]} onPress={handleBackupDB}>
          <Text style={styles.actionIcon}>💾</Text>
          <View style={styles.actionTextContainer}>
            <Text style={styles.actionTitle}>Sauvegarder la Base de Données</Text>
            <Text style={styles.actionDesc}>Protégez vos données (Copie de sécurité)</Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 20, paddingTop: 60, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  title: { fontSize: 24, fontWeight: 'bold', color: '#0f172a' },
  section: { padding: 20 },
  sectionTitle: { fontSize: 14, textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold', marginBottom: 16 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ffffff', borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2 },
  actionIcon: { fontSize: 24, marginRight: 16 },
  actionTextContainer: { flex: 1 },
  actionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a', marginBottom: 4 },
  actionDesc: { fontSize: 13, color: '#64748b' }
});
