import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { DatabaseService } from '../services/DatabaseService';
import * as SQLite from 'expo-sqlite';

export const InputIncomeScreen = ({ onSaveSuccess, onCancel }: { onSaveSuccess: () => void, onCancel: () => void }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  useEffect(() => {
    loadDropdownData();
  }, []);

  const loadDropdownData = async () => {
    try {
      const db = await SQLite.openDatabaseAsync('autoecole_finance.db');
      const cats = await db.getAllAsync('SELECT * FROM Categories WHERE type = "INCOME"');
      const studs = await db.getAllAsync('SELECT * FROM Students');
      setCategories(cats);
      setStudents(studs);
    } catch (e) {
      console.log("Erreur chargement listes: ", e);
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

    try {
      const db = await SQLite.openDatabaseAsync('autoecole_finance.db');
      await db.runAsync(
        'INSERT INTO Transactions (amount, type, category_id, student_id, description) VALUES (?, ?, ?, ?, ?)',
        Number(amount), 'INCOME', selectedCategoryId, selectedStudentId, description
      );
      
      Alert.alert("Succès", "Encaissement enregistré.");
      onSaveSuccess();
    } catch (e) {
      Alert.alert("Erreur", "Impossible d'enregistrer l'encaissement.");
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.headerTitle}>Nouvel Encaissement 🟢</Text>

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
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ÉLÈVE (Optionnel) */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Élève concerné (Optionnel)</Text>
        <View style={styles.chipContainer}>
          {students.map(s => (
            <TouchableOpacity 
              key={s.id} 
              style={[styles.chip, selectedStudentId === s.id && styles.chipActive]}
              onPress={() => setSelectedStudentId(s.id === selectedStudentId ? null : s.id)}
            >
              <Text style={[styles.chipText, selectedStudentId === s.id && styles.chipTextActive]}>
                {s.name}
              </Text>
            </TouchableOpacity>
          ))}
          {students.length === 0 && <Text style={{color: '#94a3b8', fontStyle: 'italic'}}>Aucun élève enregistré.</Text>}
        </View>
      </View>

      {/* DESCRIPTION */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Description / Note (Optionnel)</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder="Détails du paiement..." 
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
          <Text style={styles.saveButtonText}>Encaisser</Text>
        </TouchableOpacity>
      </View>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  content: { padding: 24 },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#16a34a', marginBottom: 24 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#334155', marginBottom: 8 },
  inputAmount: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 16, fontSize: 32, fontWeight: 'bold', color: '#16a34a', textAlign: 'center' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 16 },
  textArea: { height: 80, textAlignVertical: 'top' },
  chipContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#e2e8f0', borderWidth: 1, borderColor: '#cbd5e1' },
  chipActive: { backgroundColor: '#2563eb', borderColor: '#1d4ed8' },
  chipText: { fontSize: 14, color: '#475569', fontWeight: '500' },
  chipTextActive: { color: '#ffffff', fontWeight: 'bold' },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 12 },
  cancelButton: { flex: 1, padding: 16, borderRadius: 12, backgroundColor: '#e2e8f0', alignItems: 'center' },
  saveButton: { flex: 2, padding: 16, borderRadius: 12, backgroundColor: '#16a34a', alignItems: 'center' },
  cancelButtonText: { color: '#475569', fontSize: 16, fontWeight: 'bold' },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
