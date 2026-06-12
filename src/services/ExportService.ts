import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { DatabaseService } from './DatabaseService';
import * as SQLite from 'expo-sqlite';

export class ExportService {

  /**
   * 1. GÉNÉRATION DE PDF (Approche HTML vers PDF)
   * Crée un bilan ou un reçu sous forme de PDF, puis propose de le partager.
   */
  static async generateAndSharePDF(title: string, transactions: any[]): Promise<void> {
    try {
      // Construction dynamique du tableau HTML
      let tableRows = '';
      let totalIncome = 0;
      let totalExpense = 0;

      transactions.forEach(t => {
        if (t.type === 'INCOME') totalIncome += t.amount;
        if (t.type === 'EXPENSE') totalExpense += t.amount;
        
        tableRows += `
          <tr>
            <td>${new Date(t.transaction_date).toLocaleDateString()}</td>
            <td>${t.description || t.category_name}</td>
            <td style="color: ${t.type === 'INCOME' ? 'green' : 'red'}; font-weight: bold;">
              ${t.type === 'INCOME' ? '+' : '-'}${t.amount} DH
            </td>
          </tr>
        `;
      });

      const net = totalIncome - totalExpense;

      // Le template HTML brut
      const htmlContent = `
        <html>
          <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no" />
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #333; }
              h1 { color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
              .summary-box { background-color: #f1f5f9; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th, td { border: 1px solid #cbd5e1; padding: 12px; text-align: left; }
              th { background-color: #f8fafc; color: #475569; }
              .total { font-size: 18px; font-weight: bold; text-align: right; margin-top: 20px; }
            </style>
          </head>
          <body>
            <h1>Auto-École - ${title}</h1>
            
            <div class="summary-box">
              <p><strong>Total Encaissé :</strong> <span style="color: green;">${totalIncome} DH</span></p>
              <p><strong>Total Dépensé :</strong> <span style="color: red;">${totalExpense} DH</span></p>
              <p style="font-size: 20px;"><strong>Bénéfice Net :</strong> <span style="color: ${net >= 0 ? 'blue' : 'red'};">${net} DH</span></p>
            </div>

            <table>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Montant</th>
              </tr>
              ${tableRows}
            </table>

            <div class="total">
              Document généré le ${new Date().toLocaleDateString()}
            </div>
          </body>
        </html>
      `;

      // Conversion HTML -> PDF
      const { uri } = await Print.printToFileAsync({ html: htmlContent });

      // Partage Natif (WhatsApp, Email, Drive...)
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
      }
    } catch (error) {
      console.error("Erreur lors de la génération du PDF", error);
    }
  }

  /**
   * 2. EXPORTATION DU GRAND LIVRE (CSV)
   * Génère un fichier CSV pour le comptable.
   */
  static async exportToCSV(): Promise<void> {
    try {
      const db = await SQLite.openDatabaseAsync('autoecole_finance.db');
      const transactions = await db.getAllAsync(`
        SELECT t.id, t.transaction_date, t.amount, t.type, c.name as category, t.description 
        FROM Transactions t
        JOIN Categories c ON t.category_id = c.id
        ORDER BY t.transaction_date DESC
      `);

      let csvString = "ID,Date,Montant(DH),Type,Categorie,Description\n";
      transactions.forEach((t: any) => {
        csvString += `${t.id},"${t.transaction_date}",${t.amount},${t.type},"${t.category}","${t.description || ''}"\n`;
      });

      const fileUri = FileSystem.documentDirectory + 'Export_Comptable_AutoEcole.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
      }
    } catch (error) {
      console.error("Erreur lors de l'export CSV", error);
    }
  }

  /**
   * 3. SAUVEGARDE DE LA BASE DE DONNÉES (Anti-Perte)
   * Permet d'exporter le fichier .db physique pour le stocker sur Drive ou iCloud.
   */
  static async backupDatabase(): Promise<void> {
    try {
      // Le chemin où expo-sqlite stocke la base de données
      const dbDir = FileSystem.documentDirectory + 'SQLite/';
      const dbFileUri = dbDir + 'autoecole_finance.db';

      const fileInfo = await FileSystem.getInfoAsync(dbFileUri);
      if (!fileInfo.exists) {
        throw new Error("Base de données introuvable.");
      }

      // Copie vers un nom plus explicite avant l'export
      const backupUri = FileSystem.documentDirectory + `Backup_AutoEcole_${new Date().toISOString().split('T')[0]}.db`;
      await FileSystem.copyAsync({ from: dbFileUri, to: backupUri });

      // Partage
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupUri, { 
          dialogTitle: 'Sauvegarder la base de données (Google Drive / iCloud / WhatsApp)',
          mimeType: 'application/x-sqlite3' 
        });
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde de la base de données", error);
    }
  }
}
