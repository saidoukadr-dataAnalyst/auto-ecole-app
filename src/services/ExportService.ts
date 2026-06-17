import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { DatabaseService } from './DatabaseService';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

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

    if (!FileSystem.documentDirectory) throw new Error("Document directory not available");

    const fileName = `Export_AutoEcole_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
    } else {
      throw new Error("Le partage n'est pas disponible sur cet appareil.");
    }
  }

  /**
   * Sauvegarde de la base de données (export du fichier .db).
   * Appelé par SettingsScreen via ExportService.backupDatabase()
   */
  static async backupDatabase(): Promise<void> {
    if (!FileSystem.documentDirectory) throw new Error("Document directory not available");

    const possiblePaths: string[] = [];
    
    // 1. Classic iOS/Expo path
    possiblePaths.push(FileSystem.documentDirectory + 'SQLite/autoecole_finance.db');
    // 2. Direct documentDirectory fallback
    possiblePaths.push(FileSystem.documentDirectory + 'autoecole_finance.db');
    
    // 3. Android specific paths
    if (Platform.OS === 'android') {
      const baseDbPath = FileSystem.documentDirectory.replace('files/', 'databases/');
      possiblePaths.push(baseDbPath + 'autoecole_finance.db');
      possiblePaths.push(baseDbPath + 'SQLite/autoecole_finance.db');
    }

    let actualDbUri: string | null = null;

    for (const path of possiblePaths) {
      try {
        const info = await FileSystem.getInfoAsync(path);
        if (info.exists) {
          actualDbUri = path;
          break;
        }
      } catch (e) {
        // silent
      }
    }

    if (!actualDbUri) {
      // Si la copie échoue, on lève une erreur claire.
      throw new Error("Base de données introuvable sur cet appareil.");
    }

    const backupUri = FileSystem.documentDirectory + `Backup_AutoEcole_${new Date().toISOString().split('T')[0]}.db`;
    await FileSystem.copyAsync({ from: actualDbUri, to: backupUri });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(backupUri, {
        dialogTitle: 'Sauvegarder la base de données',
        mimeType: 'application/x-sqlite3'
      });
    } else {
      throw new Error("Le partage n'est pas disponible sur cet appareil.");
    }
  }

  /**
   * Exporte la liste des élèves (Actifs ou Archivés) en PDF.
   */
  static async exportStudentsPDF(students: any[], title: string, isArchived: boolean): Promise<void> {
    let tableRows = '';
    
    students.forEach((s: any) => {
      const regDate = s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '';
      if (isArchived) {
        const exitDate = s.exit_date ? new Date(s.exit_date).toLocaleDateString('fr-FR') : '—';
        let statusLabel = '—';
        if (s.outcome_status === 'PASSED') statusLabel = 'Réussi';
        else if (s.outcome_status === 'FAILED') statusLabel = 'Raté';
        else if (s.outcome_status === 'ABANDONED') statusLabel = 'Abandonné';

        tableRows += `
          <tr>
            <td>${s.name || ''}</td>
            <td>${s.phone || '—'}</td>
            <td>${regDate}</td>
            <td>${exitDate}</td>
            <td>${statusLabel}</td>
          </tr>
        `;
      } else {
        const balance = (s.package_price || 0) - (s.paid_amount || 0);
        tableRows += `
          <tr>
            <td>${s.name || ''}</td>
            <td>${s.phone || '—'}</td>
            <td>${regDate}</td>
            <td>${(s.package_price || 0).toLocaleString()} DH</td>
            <td>${(s.paid_amount || 0).toLocaleString()} DH</td>
            <td style="color: ${balance > 0 ? '#ef4444' : '#16a34a'}; font-weight: bold;">
              ${balance > 0 ? `${balance.toLocaleString()} DH` : 'Soldé'}
            </td>
          </tr>
        `;
      }
    });

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 24px; color: #333; }
            h1 { color: #2563eb; text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; font-size: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 12px; }
            th { background-color: #f8fafc; color: #475569; font-weight: 600; }
            .footer { font-size: 11px; text-align: right; margin-top: 20px; color: #94a3b8; }
          </style>
        </head>
        <body>
          <h1>🎓 Liste des Élèves - ${title}</h1>
          <table>
            <tr>
              <th>Nom</th>
              <th>Téléphone</th>
              <th>Date Inscription</th>
              ${isArchived ? `
              <th>Date Sortie</th>
              <th>Statut</th>
              ` : `
              <th>Forfait</th>
              <th>Payé</th>
              <th>Reste à Payer</th>
              `}
            </tr>
            ${tableRows.length > 0 ? tableRows : `<tr><td colspan="${isArchived ? 5 : 6}" style="text-align: center; color: #94a3b8;">Aucun élève trouvé.</td></tr>`}
          </table>
          <div class="footer">
            Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
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
   * Exporte la liste des élèves (Actifs ou Archivés) en CSV.
   */
  static async exportStudentsCSV(students: any[], isArchived: boolean): Promise<void> {
    let csvString = "\uFEFF"; // BOM UTF-8

    if (isArchived) {
      csvString += "Nom,Téléphone,Date Inscription,Date Sortie,Statut\n";
      students.forEach((s: any) => {
        const regDate = s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '';
        const exitDate = s.exit_date ? new Date(s.exit_date).toLocaleDateString('fr-FR') : '—';
        let statusLabel = '—';
        if (s.outcome_status === 'PASSED') statusLabel = 'Réussi';
        else if (s.outcome_status === 'FAILED') statusLabel = 'Raté';
        else if (s.outcome_status === 'ABANDONED') statusLabel = 'Abandonné';

        const name = (s.name || '').replace(/"/g, '""');
        const phone = (s.phone || '').replace(/"/g, '""');
        csvString += `"${name}","${phone}","${regDate}","${exitDate}","${statusLabel}"\n`;
      });
    } else {
      csvString += "Nom,Téléphone,Date Inscription,Prix Forfait(DH),Montant Payé(DH),Reste à Payer(DH)\n";
      students.forEach((s: any) => {
        const regDate = s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '';
        const balance = (s.package_price || 0) - (s.paid_amount || 0);
        const name = (s.name || '').replace(/"/g, '""');
        const phone = (s.phone || '').replace(/"/g, '""');
        csvString += `"${name}","${phone}","${regDate}",${s.package_price},${s.paid_amount},${balance}\n`;
      });
    }

    if (!FileSystem.documentDirectory) throw new Error("Document directory not available");

    const fileName = `Export_Eleves_${isArchived ? 'Archive' : 'Actifs'}_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = FileSystem.documentDirectory + fileName;
    await FileSystem.writeAsStringAsync(fileUri, csvString, { encoding: FileSystem.EncodingType.UTF8 });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, { mimeType: 'text/csv' });
    } else {
      throw new Error("Le partage n'est pas disponible sur cet appareil.");
    }
  }

  /**
   * Génère un rapport annuel de la TVA en PDF.
   */
  static async exportTVAReportPDF(year: string, studentCount: number, totalTVA: number, students: any[]): Promise<void> {
    let tableRows = '';

    students.forEach((s: any, idx: number) => {
      const regDate = s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '';
      tableRows += `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.name || ''}</td>
          <td>${s.phone || '—'}</td>
          <td>${regDate}</td>
          <td>850 DH</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 24px; color: #333; }
            h1 { color: #1e3a8a; text-align: center; border-bottom: 3px double #1e3a8a; padding-bottom: 12px; font-size: 20px; margin-bottom: 24px; }
            .kpi-box { display: flex; justify-content: space-between; background-color: #eff6ff; border: 1px solid #bfdbfe; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
            .kpi-item { flex: 1; text-align: center; }
            .kpi-label { font-size: 11px; color: #475569; text-transform: uppercase; margin-bottom: 6px; }
            .kpi-value { font-size: 18px; font-weight: bold; color: #1e3a8a; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 11px; }
            th { background-color: #f8fafc; color: #475569; font-weight: 600; }
            .footer { font-size: 10px; text-align: center; margin-top: 30px; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h1>🏛️ Bilan Annuel de la TVA - Exercice ${year}</h1>
          
          <div class="kpi-box">
            <div class="kpi-item" style="border-right: 1px solid #bfdbfe;">
              <div class="kpi-label">Élèves Enregistrés</div>
              <div class="kpi-value">${studentCount}</div>
            </div>
            <div class="kpi-item" style="border-right: 1px solid #bfdbfe;">
              <div class="kpi-label">TVA par élève</div>
              <div class="kpi-value">850 DH</div>
            </div>
            <div class="kpi-item">
              <div class="kpi-label">Montant Total de la TVA</div>
              <div class="kpi-value" style="color: #16a34a;">${totalTVA.toLocaleString()} DH</div>
            </div>
          </div>

          <h3>Liste des élèves inscrits en ${year}</h3>
          <table>
            <tr>
              <th style="width: 40px;">#</th>
              <th>Nom de l'élève</th>
              <th>Téléphone</th>
              <th>Date d'inscription</th>
              <th>Part de TVA due</th>
            </tr>
            ${tableRows.length > 0 ? tableRows : '<tr><td colspan="5" style="text-align: center; color: #94a3b8;">Aucun élève inscrit pour cette année.</td></tr>'}
          </table>

          <div class="footer">
            Ce document récapitule les déclarations de TVA de l'auto-école pour l'exercice fiscal ${year}.<br/>
            Généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}
          </div>
        </body>
      </html>
    `;

    const { uri } = await Print.printToFileAsync({ html: htmlContent });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
    }
  }
}
