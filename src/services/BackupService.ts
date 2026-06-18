import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export class BackupService {
  
  static async exportBackup(): Promise<void> {
    try {
      const db = await SQLite.openDatabaseAsync('autoecole_finance.db');
      
      // Récupérer toutes les données de toutes les tables
      const students = await db.getAllAsync('SELECT * FROM Students');
      const vehicles = await db.getAllAsync('SELECT * FROM Vehicles');
      const categories = await db.getAllAsync('SELECT * FROM Categories');
      const transactions = await db.getAllAsync('SELECT * FROM Transactions');
      const staff = await db.getAllAsync('SELECT * FROM Staff');
      const oilChanges = await db.getAllAsync('SELECT * FROM OilChanges');
      
      const backupData = {
        version: 1,
        exportedAt: new Date().toISOString(),
        data: {
          students,
          vehicles,
          categories,
          transactions,
          staff,
          oilChanges
        }
      };
      
      const jsonString = JSON.stringify(backupData, null, 2);
      const filename = `backup_autoecole_${new Date().toISOString().split('T')[0]}.json`;
      
      if (Platform.OS === 'web') {
        // Mode Web : Téléchargement direct du fichier
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Mode Mobile : Écriture locale et partage
        const fileUri = `${FileSystem.cacheDirectory}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, jsonString, { encoding: FileSystem.EncodingType.UTF8 });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'application/json',
            dialogTitle: 'Sauvegarde Auto-École',
            UTI: 'public.json'
          });
        }
      }
    } catch (e) {
      console.error('Backup export failed', e);
      throw e;
    }
  }
  
  static async importBackup(): Promise<boolean> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true
      });
      
      if (result.canceled || !result.assets || result.assets.length === 0) {
        return false;
      }
      
      const fileUri = result.assets[0].uri;
      let jsonContent = '';
      
      if (Platform.OS === 'web') {
        const response = await fetch(fileUri);
        jsonContent = await response.text();
      } else {
        jsonContent = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
      }
      
      const backup = JSON.parse(jsonContent);
      
      // Validation du format
      if (!backup || backup.version !== 1 || !backup.data) {
        throw new Error('Invalid backup format');
      }
      
      const { students, vehicles, categories, transactions, staff, oilChanges } = backup.data;
      
      if (!Array.isArray(categories) || !Array.isArray(transactions)) {
        throw new Error('Missing core tables in backup');
      }
      
      const db = await SQLite.openDatabaseAsync('autoecole_finance.db');
      
      // Restauration en base sous transaction sécurisée
      await db.withTransactionAsync(async () => {
        // Désactiver temporairement les clés étrangères pour éviter les conflits d'ordre de suppression
        await db.execAsync('PRAGMA foreign_keys = OFF;');
        
        // Vider toutes les tables existantes
        await db.execAsync('DELETE FROM OilChanges;');
        await db.execAsync('DELETE FROM Transactions;');
        await db.execAsync('DELETE FROM Categories;');
        await db.execAsync('DELETE FROM Staff;');
        await db.execAsync('DELETE FROM Vehicles;');
        await db.execAsync('DELETE FROM Students;');
        
        // Réinsérer les Catégories
        for (const cat of categories) {
          await db.runAsync(
            `INSERT INTO Categories (id, name, type, is_vehicle_related, is_staff_related, icon) VALUES (?, ?, ?, ?, ?, ?)`,
            [cat.id, cat.name, cat.type, cat.is_vehicle_related || 0, cat.is_staff_related || 0, cat.icon || null]
          );
        }
        
        // Réinsérer les Élèves
        if (Array.isArray(students)) {
          for (const s of students) {
            await db.runAsync(
              `INSERT INTO Students (id, name, package_price, phone, status, exit_date, outcome_status, is_deleted, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
              [s.id, s.name, s.package_price, s.phone || null, s.status || 'ACTIVE', s.exit_date || null, s.outcome_status || null, s.is_deleted || 0, s.created_at]
            );
          }
        }
        
        // Réinsérer les Véhicules
        if (Array.isArray(vehicles)) {
          for (const v of vehicles) {
            await db.runAsync(
              `INSERT INTO Vehicles (id, name, registration, current_mileage, next_technical_visit, insurance_date, vignette_date, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [v.id, v.name, v.registration, v.current_mileage || 0, v.next_technical_visit || null, v.insurance_date || null, v.vignette_date || null, v.created_at]
            );
          }
        }
        
        // Réinsérer le Personnel
        if (Array.isArray(staff)) {
          for (const st of staff) {
            await db.runAsync(
              `INSERT INTO Staff (id, name, phone, role, base_salary, created_at) VALUES (?, ?, ?, ?, ?, ?)`,
              [st.id, st.name, st.phone || null, st.role || null, st.base_salary || 0, st.created_at]
            );
          }
        }
        
        // Réinsérer les Transactions
        for (const t of transactions) {
          await db.runAsync(
            `INSERT INTO Transactions (id, amount, transaction_date, type, category_id, student_id, vehicle_id, description, payment_method, is_deleted, staff_id, fuel_liters, mileage_at_transaction) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [t.id, t.amount, t.transaction_date, t.type, t.category_id, t.student_id || null, t.vehicle_id || null, t.description || null, t.payment_method || null, t.is_deleted || 0, t.staff_id || null, t.fuel_liters || null, t.mileage_at_transaction || null]
          );
        }
        
        // Réinsérer les Vidanges
        if (Array.isArray(oilChanges)) {
          for (const o of oilChanges) {
            await db.runAsync(
              `INSERT INTO OilChanges (id, vehicle_id, change_date, mileage_at_change, next_mileage) VALUES (?, ?, ?, ?, ?)`,
              [o.id, o.vehicle_id, o.change_date, o.mileage_at_change, o.next_mileage]
            );
          }
        }
        
        // Réactiver les clés étrangères
        await db.execAsync('PRAGMA foreign_keys = ON;');
      });
      
      return true;
    } catch (e) {
      console.error('Backup import failed', e);
      throw e;
    }
  }
}
