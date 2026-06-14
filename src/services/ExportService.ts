import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { DatabaseService } from './DatabaseService';
import * as SQLite from 'expo-sqlite';

export class ExportService {

  /**
   * Génère un bilan PDF du mois en cours et propose le partage.
   * Appelé par SettingsScreen via ExportService.generatePDFReport()
   */
  static async exportPDF(): Promise<void> {
    // Charger toutes les transactions depuis la DB
    const transactions = await DatabaseService.getTransactions();
    const title = `Bilan ${new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}`;

    // Construction dynamique du tableau HTML
    let tableRows = '';
    let totalIncome = 0;
    let totalExpense = 0;

    transactions.forEach((t: any) => {
      if (t.type === 'INCOME') totalIncome += t.amount;
      if (t.type === 'EXPENSE') totalExpense += t.amount;

      tableRows += `
        <tr>
          <td>${t.date || ''}</td>
          <td>${t.description || t.category_name || '-'}</td>
          <td style="color: ${t.type === 'INCOME' ? '#16a34a' : '#ef4444'}; font-weight: bold;">
            ${t.type === 'INCOME' ? '+' : '-'}${t.amount} DH
          </td>
        </tr>
      `;
    });

    const net = totalIncome - totalExpense;

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 24px; color: #333; }
            h1 { color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; font-size: 22px; }
            .summary-box { background-color: #f1f5f9; padding: 16px; border-radius: 8px; margin-bottom: 20px; }
            .summary-box p { margin: 6px 0; font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 13px; }
            th { background-color: #f8fafc; color: #475569; font-weight: 600; }
            .footer { font-size: 12px; text-align: right; margin-top: 20px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>🏫 Auto-École - ${title}</h1>

          <div class="summary-box">
            <p><strong>Total Encaissé :</strong> <span style="color: #16a34a;">${totalIncome.toLocaleString()} DH</span></p>
            <p><strong>Total Dépensé :</strong> <span style="color: #ef4444;">${totalExpense.toLocaleString()} DH</span></p>
            <p style="font-size: 18px;"><strong>Bénéfice Net :</strong> <span style="color: ${net >= 0 ? '#2563eb' : '#ef4444'};">${net.toLocaleString()} DH</span></p>
          </div>

          ${transactions.length > 0 ? `
          <table>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Montant</th>
            </tr>
            ${tableRows}
          </table>
          ` : '<p style="text-align:center; color: #94a3b8;">Aucune transaction enregistrée.</p>'}

          <div class="footer">
            Document généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  }

  /**
   * Génère un fichier CSV et propose le partage.
   * Appelé par SettingsScreen via ExportService.generateCSVExport()
   */
  static async exportCSV(): Promise<void> {
    const transactions = await DatabaseService.getTransactions();

    // BOM UTF-8 pour que Excel affiche correctement les accents
    let csvString = "\uFEFFID,Date,Montant(DH),Type,Catégorie,Description\n";
    transactions.forEach((t: any) => {
      const desc = (t.description || '').replace(/"/g, '""');
      const cat = (t.category_name || '').replace(/"/g, '""');
      csvString += `${t.id},"${t.date || ''}",${t.amount},${t.type === 'INCOME' ? 'Entrée' : 'Sortie'},"${cat}","${desc}"\n`;
    });

    const fileName = `Export_AutoEcole_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
    }
  }

  /**
   * Sauvegarde de la base de données (export du fichier .db).
   * Appelé par SettingsScreen via ExportService.backupDatabase()
   */
  static async backupDatabase(): Promise<void> {
    // expo-sqlite v16 stocke la DB dans documentDirectory/SQLite/
    const dbDir = FileSystem.documentDirectory + 'SQLite/';
    const dbFileUri = dbDir + 'autoecole_finance.db';

    const fileInfo = await FileSystem.getInfoAsync(dbFileUri);
    if (!fileInfo.exists) {
      // Fallback: essayer directement dans documentDirectory
      const altUri = FileSystem.documentDirectory + 'autoecole_finance.db';
      const altInfo = await FileSystem.getInfoAsync(altUri);
      if (!altInfo.exists) {
        throw new Error("Base de données introuvable.");
      }
      // Utiliser le chemin alternatif
      const backupUri = FileSystem.documentDirectory + `Backup_AutoEcole_${new Date().toISOString().split('T')[0]}.db`;
      await FileSystem.copyAsync({ from: altUri, to: backupUri });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(backupUri, {
          dialogTitle: 'Sauvegarder la base de données',
          mimeType: 'application/x-sqlite3'
        });
      }
      return;
    }

    const backupUri = FileSystem.documentDirectory + `Backup_AutoEcole_${new Date().toISOString().split('T')[0]}.db`;
    await FileSystem.copyAsync({ from: dbFileUri, to: backupUri });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(backupUri, {
        dialogTitle: 'Sauvegarder la base de données',
        mimeType: 'application/x-sqlite3'
      });
    }
  }
}
