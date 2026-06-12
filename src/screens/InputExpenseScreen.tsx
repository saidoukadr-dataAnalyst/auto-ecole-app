import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import * as SQLite from 'expo-sqlite';

export const InputExpenseScreen = ({ onSaveSuccess, onCancel }: { onSaveSuccess: () => void, onCancel: () => void }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [vehicles, setVehicles] = useState<any[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedCategoryIsVehicleRelated, setSelectedCategoryIsVehicleRelated] = useState<boolean>(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | null>(null);
  const [currentMileage, setCurrentMileage] = useState('');

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const db = await SQLite.openDatabaseAsync('autoecole_finance.db');
      const cats = await db.getAllAsync('SELECT * FROM Categories WHERE type = "EXPENSE"');
      const vehs = await db.getAllAsync('SELECT * FROM Vehicles');
      setCategories(cats);
      setVehicles(vehs);
    } catch (e) {
      console.log("Erreur chargement listes: ", e);
    }
  };

  const handleCategorySelect = (cat: any) => {
    setSelectedCategoryId(cat.id);
    setSelectedCategoryIsVehicleRelated(cat.is_vehicle_related === 1);
    // Reset vehicle fields if not related
    if (cat.is_vehicle_related === 0) {
      setSelectedVehicleId(null);
      setCurrentMileage('');
    }
  };

  const handleSave = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un montant valide.");
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert("Erreur", "Veuillez sélectionner une catégorie.");
      return;
    }

    if (selectedCategoryIsVehicleRelated) {
      if (!selectedVehicleId) {
        Alert.alert("Erreur", "Veuillez sélectionner le véhicule concerné.");
        return;
      }
      if (!currentMileage || isNaN(Number(currentMileage))) {
        Alert.alert("Requis", "Le kilométrage actuel au compteur est OBLIGATOIRE pour anticiper la prochaine vidange.");
        return;
      }
    }

    try {
      await DatabaseService.addExpense(
        Number(amount),
        selectedCategoryId,
        selectedVehicleId,
        selectedCategoryIsVehicleRelated ? Number(currentMileage) : null,
        description
      );
      Alert.alert("Succès", "Dépense enregistrée.");
      onSaveSuccess();
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'enregistrer la dépense.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Nouvelle Dépense 💸</Text>

      {/* MONTANT */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Montant (DH) *</Text>
        <TextInput 
          style={styles.inputAmount} 
          placeholder="0.00" 
          keyboardType="numeric" 
          value={amount} 
          onChangeText={setAmount} 
        />
      </View>

      {/* CATÉGORIE */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Catégorie *</Text>
        <View style={styles.chipContainer}>
          {categories.map(cat => (
            <TouchableOpacity 
              key={cat.id} 
              style={[styles.chip, selectedCategoryId === cat.id && styles.chipActive]}
              onPress={() => handleCategorySelect(cat)}
            >
              <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* VÉHICULE & KILOMÉTRAGE (Conditionnel) */}
      {selectedCategoryIsVehicleRelated && (
        <View style={styles.vehicleBlock}>
          <Text style={styles.warningText}>
            ℹ️ Cette dépense concerne un véhicule. Les données ci-dessous permettront de calculer les alertes de vidange.
          </Text>
          
          <Text style={styles.label}>Véhicule concerné *</Text>
          <View style={styles.chipContainer}>
            {vehicles.map(v => (
              <TouchableOpacity 
                key={v.id} 
                style={[styles.chip, selectedVehicleId === v.id && styles.chipActive]}
                onPress={() => setSelectedVehicleId(v.id)}
              >
                <Text style={[styles.chipText, selectedVehicleId === v.id && styles.chipTextActive]}>
                  {v.name} ({v.registration})
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[styles.label, {marginTop: 16}]}>Kilométrage actuel au compteur *</Text>
          <TextInput 
            style={styles.input} 
            placeholder="Ex: 145000" 
            keyboardType="numeric" 
            value={currentMileage} 
            onChangeText={setCurrentMileage} 
          />
        </View>
      )}

      {/* DESCRIPTION */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description / Note (Optionnel)</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Détails de l'achat..." 
          multiline 
          value={description} 
          onChangeText={setDescription} 
        />
      </View>

      {/* BOUTONS */}
      <View style={styles.buttonRow}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel}>
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Enregistrer</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#0f172a', marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  inputAmount: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 16, fontSize: 32, fontWeight: 'bold', color: '#ef4444', textAlign: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#1d4ed8' },
  chipText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  vehicleBlock: { backgroundColor: '#eff6ff', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#bfdbfe', marginBottom: 20 },
  warningText: { fontSize: 13, color: '#1e40af', marginBottom: 16, fontStyle: 'italic', lineHeight: 18 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center' },
  saveButton: { flex: 2, padding: 16, borderRadius: 12, backgroundColor: '#ef4444', alignItems: 'center' },
  cancelButtonText: { color: '#475569', fontSize: 16, fontWeight: 'bold' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
