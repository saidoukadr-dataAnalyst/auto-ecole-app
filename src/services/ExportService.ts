import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { DatabaseService } from './DatabaseService';
import { SecurityService } from './SecurityService';
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

export class ExportService {

  /**
   * Génère un bilan PDF du mois en cours et propose le partage.
   * Appelé par SettingsScreen via ExportService.generatePDFReport()
   */
  static async exportPDF(): Promise<void> {
    const schoolName = await SecurityService.getSchoolName();
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
          <h1>🏫 ${schoolName} - ${title}</h1>

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
    const schoolName = await SecurityService.getSchoolName();
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
          <h1>🎓 ${schoolName} - ${title}</h1>
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
  static async exportStudentsCSV(students: any[], isArchived: boolean, customFileName?: string): Promise<void> {
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

    const cleanFileName = (customFileName || `Export_Eleves_${isArchived ? 'Archive' : 'Actifs'}`)
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Supprimer les accents
      .replace(/[^a-zA-Z0-9\s_-]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, '_'); // Remplacer les espaces par des tirets bas
    const fileName = `${cleanFileName}_${new Date().toISOString().split('T')[0]}.csv`;
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
    const schoolName = await SecurityService.getSchoolName();
    let tableRows = '';

    students.forEach((s: any, idx: number) => {
      const regDate = s.created_at ? new Date(s.created_at).toLocaleDateString('fr-FR') : '';
      tableRows += `
        <tr>
          <td>${idx + 1}</td>
          <td>${s.name || ''}</td>
          <td>${s.phone || '—'}</td>
          <td>${regDate}</td>
          <td>450 DH</td>
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
          <h1>🏛️ ${schoolName} - Bilan Annuel TVA ${year}</h1>
          
          <div class="kpi-box">
            <div class="kpi-item" style="border-right: 1px solid #bfdbfe;">
              <div class="kpi-label">Élèves Enregistrés</div>
              <div class="kpi-value">${studentCount}</div>
            </div>
            <div class="kpi-item" style="border-right: 1px solid #bfdbfe;">
              <div class="kpi-label">TVA par élève</div>
              <div class="kpi-value">450 DH</div>
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

  static async exportStudentReceiptPDF(student: any, transactions: any[]): Promise<void> {
    const schoolName = await SecurityService.getSchoolName();
    const regDate = student.created_at ? new Date(student.created_at).toLocaleDateString('fr-FR') : '';
    const paidAmount = student.paid_amount || 0;
    const packagePrice = student.package_price || 0;
    const remaining = packagePrice - paidAmount;

    let rowsHtml = '';
    transactions.forEach((t: any) => {
      const tDate = t.transaction_date ? new Date(t.transaction_date).toLocaleDateString('fr-FR') : '';
      rowsHtml += `
        <tr>
          <td>${tDate}</td>
          <td>${t.description || 'Paiement Forfait'}</td>
          <td>${t.payment_method || 'Espèces'}</td>
          <td style="font-weight: bold; color: #16a34a;">+ ${t.amount.toLocaleString()} DH</td>
        </tr>
      `;
    });

    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 30px; color: #333; }
            .header-table { width: 100%; border: none; margin-bottom: 30px; }
            .school-title { font-size: 24px; font-weight: bold; color: #1e3a8a; }
            .receipt-title { font-size: 20px; font-weight: bold; text-align: right; color: #475569; }
            .info-section { background-color: #f8fafc; border: 1px solid #e2e8f0; padding: 16px; border-radius: 8px; margin-bottom: 24px; }
            .info-grid { display: flex; justify-content: space-between; }
            .info-col { flex: 1; }
            .info-col p { margin: 4px 0; font-size: 13px; }
            table.data-table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            table.data-table th, table.data-table td { border: 1px solid #cbd5e1; padding: 10px; text-align: left; font-size: 12px; }
            table.data-table th { background-color: #f1f5f9; color: #475569; font-weight: 600; }
            .totals-box { width: 40%; margin-left: 60%; margin-top: 20px; border-top: 2px solid #cbd5e1; padding-top: 10px; }
            .totals-row { display: flex; justify-content: space-between; margin: 6px 0; font-size: 13px; }
            .signature-section { margin-top: 50px; display: flex; justify-content: space-between; }
            .signature-box { width: 200px; text-align: center; font-size: 13px; color: #64748b; }
            .signature-line { height: 60px; border-bottom: 1px dashed #cbd5e1; margin-bottom: 8px; }
            .footer { font-size: 10px; text-align: center; margin-top: 60px; color: #94a3b8; border-top: 1px solid #cbd5e1; padding-top: 10px; }
          </style>
        </head>
        <body>
          <table class="header-table">
            <tr>
              <td>
                <div class="school-title">🏫 ${schoolName}</div>
              </td>
              <td>
                <div class="receipt-title">REÇU DE PAIEMENT</div>
              </td>
            </tr>
          </table>

          <div class="info-section">
            <div class="info-grid">
              <div class="info-col">
                <p><strong>Élève :</strong> ${student.name}</p>
                <p><strong>Téléphone :</strong> ${student.phone || '—'}</p>
              </div>
              <div class="info-col" style="text-align: right;">
                <p><strong>Date d'inscription :</strong> ${regDate}</p>
                <p><strong>Statut :</strong> ${student.status === 'ARCHIVED' ? 'Archivé' : 'Actif'}</p>
              </div>
            </div>
          </div>

          <h3>Historique des règlements</h3>
          <table class="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Mode de paiement</th>
                <th>Montant</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml.length > 0 ? rowsHtml : '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">Aucun versement enregistré.</td></tr>'}
            </tbody>
          </table>

          <div class="totals-box">
            <div class="totals-row">
              <span>Prix Forfait :</span>
              <strong>${packagePrice.toLocaleString()} DH</strong>
            </div>
            <div class="totals-row">
              <span>Total Versé :</span>
              <span style="color: #16a34a; font-weight: bold;">${paidAmount.toLocaleString()} DH</span>
            </div>
            <div class="totals-row" style="border-top: 1px solid #e2e8f0; padding-top: 6px; margin-top: 6px;">
              <span>Reste à Payer :</span>
              <span style="color: ${remaining > 0 ? '#ef4444' : '#16a34a'}; font-weight: bold; font-size: 15px;">
                ${remaining > 0 ? `${remaining.toLocaleString()} DH` : 'Soldé'}
              </span>
            </div>
          </div>

          <div class="signature-section">
            <div class="signature-box">
              <div class="signature-line"></div>
              <span>Signature Élève</span>
            </div>
            <div class="signature-box">
              <div class="signature-line"></div>
              <span>Cachet & Signature Auto-École</span>
            </div>
          </div>

          <div class="footer">
            Document officiel généré le ${new Date().toLocaleDateString('fr-FR')} à ${new Date().toLocaleTimeString('fr-FR')}.
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
