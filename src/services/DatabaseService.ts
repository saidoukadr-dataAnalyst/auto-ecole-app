import * as SQLite from 'expo-sqlite';

export class DatabaseService {
  private static db: SQLite.SQLiteDatabase | null = null;

  static async initDB(): Promise<void> {
    if (!this.db) {
      this.db = await SQLite.openDatabaseAsync('autoecole_finance.db');
    }
    await this.createTables();
    await this.seedDefaultCategories();
  }

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

  private static async seedDefaultCategories(): Promise<void> {
    if (!this.db) return;

    const result = await this.db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM Categories');

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
  // STUDENTS
  // =========================================================================

  static async getStudents(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT s.id, s.name, s.package_price, s.phone, s.created_at,
        COALESCE((SELECT SUM(t.amount) FROM Transactions t WHERE t.student_id = s.id AND t.type = 'INCOME'), 0) as paid_amount
      FROM Students s
      ORDER BY s.created_at DESC
    `);
  }

  static async addStudent(name: string, phone: string, packagePrice: number, advance?: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.withTransactionAsync(async () => {
      const result = await this.db!.runAsync(
        'INSERT INTO Students (name, phone, package_price) VALUES (?, ?, ?)',
        name, phone, packagePrice
      );
      if (advance && advance > 0) {
        const cat = await this.db!.getFirstAsync<{id: number}>(
          "SELECT id FROM Categories WHERE name = 'Paiement Forfait' AND type = 'INCOME'"
        );
        if (cat) {
          await this.db!.runAsync(
            'INSERT INTO Transactions (amount, type, category_id, student_id, description) VALUES (?, ?, ?, ?, ?)',
            advance, 'INCOME', cat.id, result.lastInsertRowId, 'Avance sur forfait'
          );
        }
      }
    });
  }

  static async updateStudent(id: number, name: string, phone: string, packagePrice: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'UPDATE Students SET name = ?, phone = ?, package_price = ? WHERE id = ?',
      name, phone, packagePrice, id
    );
  }

  static async deleteStudent(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('DELETE FROM Transactions WHERE student_id = ?', id);
    await this.db!.runAsync('DELETE FROM Students WHERE id = ?', id);
  }

  // =========================================================================
  // VEHICLES
  // =========================================================================

  static async getVehicles(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT v.id, v.name, v.registration, v.current_mileage, v.next_technical_visit,
        COALESCE(
          (SELECT o.next_mileage FROM OilChanges o WHERE o.vehicle_id = v.id ORDER BY o.id DESC LIMIT 1),
          v.current_mileage + 10000
        ) as next_oil_change_km
      FROM Vehicles v
      ORDER BY v.created_at DESC
    `);
  }

  static async addVehicle(name: string, registration: string, mileage: number, nextVisit: string, oilChangeDate?: string): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.withTransactionAsync(async () => {
      const result = await this.db!.runAsync(
        'INSERT INTO Vehicles (name, registration, current_mileage, next_technical_visit) VALUES (?, ?, ?, ?)',
        name, registration, mileage, nextVisit || null
      );
      if (oilChangeDate) {
        const nextOilMileage = mileage + 10000;
        await this.db!.runAsync(
          'INSERT INTO OilChanges (vehicle_id, change_date, mileage_at_change, next_mileage) VALUES (?, ?, ?, ?)',
          result.lastInsertRowId, oilChangeDate, mileage, nextOilMileage
        );
      }
    });
  }

  static async updateVehicle(id: number, name: string, registration: string, mileage: number, nextVisit: string): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'UPDATE Vehicles SET name = ?, registration = ?, current_mileage = ?, next_technical_visit = ? WHERE id = ?',
      name, registration, mileage, nextVisit || null, id
    );
  }

  static async deleteVehicle(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('DELETE FROM OilChanges WHERE vehicle_id = ?', id);
    await this.db!.runAsync('DELETE FROM Transactions WHERE vehicle_id = ?', id);
    await this.db!.runAsync('DELETE FROM Vehicles WHERE id = ?', id);
  }

  // =========================================================================
  // TRANSACTIONS
  // =========================================================================

  static async getTransactions(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT t.id, t.amount, t.type, t.description, t.transaction_date as date, c.name as category_name
      FROM Transactions t
      LEFT JOIN Categories c ON t.category_id = c.id
      ORDER BY t.transaction_date DESC
    `);
  }

  static async addExpense(
    amount: number,
    categoryId: number,
    vehicleId: number | null,
    currentMileage: number | null,
    description: string
  ): Promise<void> {
    if (!this.db) await this.initDB();

    await this.db!.withTransactionAsync(async () => {
      await this.db!.runAsync(
        'INSERT INTO Transactions (amount, type, category_id, vehicle_id, description) VALUES (?, ?, ?, ?, ?)',
        amount, 'EXPENSE', categoryId, vehicleId, description
      );

      if (vehicleId && currentMileage) {
        await this.db!.runAsync(
          'UPDATE Vehicles SET current_mileage = ? WHERE id = ?',
          currentMileage, vehicleId
        );

        // Auto-créer un enregistrement de vidange si la catégorie est "Vidange"
        const category = await this.db!.getFirstAsync<{name: string}>('SELECT name FROM Categories WHERE id = ?', [categoryId]);
        if (category && category.name === 'Vidange') {
          const nextOilChangeMileage = currentMileage + 10000; // Alerte dans 10 000 km
          await this.db!.runAsync(
            'INSERT INTO OilChanges (vehicle_id, mileage_at_change, next_mileage) VALUES (?, ?, ?)',
            vehicleId, currentMileage, nextOilChangeMileage
          );
        }
      }
    });
  }

  static async addIncome(
    amount: number,
    categoryId: number,
    studentId: number | null,
    description: string
  ): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'INSERT INTO Transactions (amount, type, category_id, student_id, description) VALUES (?, ?, ?, ?, ?)',
      amount, 'INCOME', categoryId, studentId, description
    );
  }

  // =========================================================================
  // REPORTING & ALERTS
  // =========================================================================

  static async getFinancialSummary(year: number, month: string): Promise<{ income: number; expense: number }> {
    if (!this.db) await this.initDB();

    const likePattern = `${year}-${month}-%`;

    const result = await this.db!.getFirstAsync<{ income: number; expense: number }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
      FROM Transactions
      WHERE transaction_date LIKE ?
    `, [likePattern]);

    return result || { income: 0, expense: 0 };
  }

  static async getOilChangeAlerts(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT v.name, v.registration, v.current_mileage, o.next_mileage, (o.next_mileage - v.current_mileage) as remaining_km
      FROM Vehicles v
      JOIN OilChanges o ON v.id = o.vehicle_id
      WHERE (o.next_mileage - v.current_mileage) <= 1000
      AND o.id = (SELECT MAX(id) FROM OilChanges WHERE vehicle_id = v.id)
    `);
  }

  static async getTechnicalVisitAlerts(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT id, name, registration, next_technical_visit, 
             julianday(next_technical_visit) - julianday('now') as days_remaining
      FROM Vehicles
      WHERE (julianday(next_technical_visit) - julianday('now')) <= 30
      AND (julianday(next_technical_visit) - julianday('now')) >= 0
    `);
  }

  static async updateVehicleVisitDate(vehicleId: number, nextVisitDate: string): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Vehicles SET next_technical_visit = ? WHERE id = ?', nextVisitDate, vehicleId);
  }

  // =========================================================================
  // CATEGORIES
  // =========================================================================

  static async getCategories(type: 'INCOME' | 'EXPENSE'): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync('SELECT * FROM Categories WHERE type = ?', [type]);
  }
}
