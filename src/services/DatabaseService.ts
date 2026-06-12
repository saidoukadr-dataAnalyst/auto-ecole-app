import * as SQLite from 'expo-sqlite';

export class DatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;

  /**
   * Initialise la connexion à la base de données et crée les tables si elles n'existent pas.
   */
  static async initDB(): Promise<void> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('autoecole_finance.db');
    }
    await this.createTables();
    await this.seedDefaultCategories();
  }

  /**
   * Création du schéma relationnel de la base de données
   */
  private static async createTables(): Promise<void> {
    if (!this.db) return;

    await this.db.execAsync(`
      PRAGMA foreign_keys = ON;

      -- Élèves : Suivi des paiements de forfaits
      CREATE TABLE IF NOT EXISTS Students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        package_price REAL NOT NULL,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Véhicules : Suivi du kilométrage et des alertes
      CREATE TABLE IF NOT EXISTS Vehicles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        registration TEXT NOT NULL,
        current_mileage INTEGER NOT NULL DEFAULT 0,
        next_technical_visit DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Catégories de transactions (Ex: Carburant, Loyer, Paiement Élève)
      CREATE TABLE IF NOT EXISTS Categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
        is_vehicle_related BOOLEAN DEFAULT 0,
        icon TEXT
      );

      -- Transactions : Le cœur de l'application (Livre de comptes)
      CREATE TABLE IF NOT EXISTS Transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        amount REAL NOT NULL,
        transaction_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        type TEXT CHECK(type IN ('INCOME', 'EXPENSE')) NOT NULL,
        category_id INTEGER NOT NULL,
        student_id INTEGER,
        vehicle_id INTEGER,
        description TEXT,
        payment_method TEXT,
        FOREIGN KEY (category_id) REFERENCES Categories (id),
        FOREIGN KEY (student_id) REFERENCES Students (id),
        FOREIGN KEY (vehicle_id) REFERENCES Vehicles (id)
      );

      -- Historique des vidanges pour anticiper la prochaine
      CREATE TABLE IF NOT EXISTS OilChanges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        mileage_at_change INTEGER NOT NULL,
        next_mileage INTEGER NOT NULL,
        FOREIGN KEY (vehicle_id) REFERENCES Vehicles (id)
      );
    `);
  }

  /**
   * Injection des catégories par défaut lors du premier lancement
   */
  private static async seedDefaultCategories(): Promise<void> {
    if (!this.db) return;
    
    // Vérifier s'il y a déjà des catégories
    const result = await this.db.getFirstAsync<{count: number}>('SELECT COUNT(*) as count FROM Categories');
    
    if (result && result.count === 0) {
      await this.db.execAsync(`
        INSERT INTO Categories (name, type, is_vehicle_related, icon) VALUES 
        ('Paiement Forfait', 'INCOME', 0, 'wallet'),
        ('Leçon supplémentaire', 'INCOME', 0, 'cash'),
        ('Carburant', 'EXPENSE', 1, 'gas-station'),
        ('Entretien & Réparation', 'EXPENSE', 1, 'wrench'),
        ('Vidange', 'EXPENSE', 1, 'water'),
        ('Assurance', 'EXPENSE', 1, 'shield-check'),
        ('Loyer Local', 'EXPENSE', 0, 'home'),
        ('Salaires', 'EXPENSE', 0, 'account-group'),
        ('Électricité & Internet', 'EXPENSE', 0, 'lightning-bolt');
      `);
    }
  }

  // =========================================================================
  // MÉTHODES CRUD (Exemples pour le Dashboard et Saisie)
  // =========================================================================

  /**
   * Ajouter une nouvelle dépense (avec logique de mise à jour du kilométrage)
   */
  static async addExpense(
    amount: number, 
    categoryId: number, 
    vehicleId: number | null, 
    currentMileage: number | null, 
    description: string
  ): Promise<void> {
    if (!this.db) return;

    await this.db.withTransactionAsync(async () => {
      // 1. Enregistrer la transaction
      await this.db!.runAsync(
        'INSERT INTO Transactions (amount, type, category_id, vehicle_id, description) VALUES (?, ?, ?, ?, ?)',
        amount, 'EXPENSE', categoryId, vehicleId, description
      );

      // 2. Si un véhicule et un kilométrage sont fournis, on met à jour le véhicule
      if (vehicleId && currentMileage) {
        await this.db!.runAsync(
          'UPDATE Vehicles SET current_mileage = ? WHERE id = ?',
          currentMileage, vehicleId
        );
      }
    });
  }

  /**
   * Récupérer les alertes de vidange imminente (<= 1000 km restants)
   */
  static async getOilChangeAlerts(): Promise<any[]> {
    if (!this.db) return [];
    // On compare le kilométrage actuel du véhicule avec le next_mileage de sa dernière vidange
    return await this.db.getAllAsync(`
      SELECT v.name, v.registration, v.current_mileage, o.next_mileage, (o.next_mileage - v.current_mileage) as remaining_km
      FROM Vehicles v
      JOIN OilChanges o ON v.id = o.vehicle_id
      WHERE (o.next_mileage - v.current_mileage) <= 1000
      AND o.id = (SELECT MAX(id) FROM OilChanges WHERE vehicle_id = v.id) -- Dernière vidange uniquement
    `);
  }

  /**
   * Récupérer les alertes de visite technique (<= 7 jours)
   */
  static async getTechnicalVisitAlerts(): Promise<any[]> {
    if (!this.db) return [];
    return await this.db.getAllAsync(`
      SELECT name, registration, next_technical_visit, 
             julianday(next_technical_visit) - julianday('now') as days_remaining
      FROM Vehicles
      WHERE (julianday(next_technical_visit) - julianday('now')) <= 7
      AND (julianday(next_technical_visit) - julianday('now')) >= 0
    `);
  }

  /**
   * Récupère le bilan financier global (Encaissé, Dépensé, Bénéfice) pour un mois donné
   */
  static async getFinancialSummary(year: number, month: string): Promise<{income: number, expense: number}> {
    if (!this.db) return { income: 0, expense: 0 };
    
    // Le paramètre month doit être formaté en 'MM', ex: '06'
    const likePattern = `${year}-${month}-%`;

    const result = await this.db.getFirstAsync<{income: number, expense: number}>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
      FROM Transactions
      WHERE transaction_date LIKE ?
    `, [likePattern]);

    return result || { income: 0, expense: 0 };
  }
}
