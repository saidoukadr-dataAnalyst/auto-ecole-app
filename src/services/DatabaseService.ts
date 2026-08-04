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
        status TEXT DEFAULT "ACTIVE",
        exit_date TEXT,
        outcome_status TEXT,
        is_deleted INTEGER DEFAULT 0,
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
        is_deleted INTEGER DEFAULT 0,
        FOREIGN KEY (category_id) REFERENCES Categories (id),
        FOREIGN KEY (student_id) REFERENCES Students (id),
        FOREIGN KEY (vehicle_id) REFERENCES Vehicles (id)
      );

      -- Personnel (Staff)
      CREATE TABLE IF NOT EXISTS Staff (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT,
        role TEXT,
        base_salary REAL NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      -- Historique des vidanges pour anticiper la prochaine
      CREATE TABLE IF NOT EXISTS OilChanges (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        vehicle_id INTEGER NOT NULL,
        change_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        mileage_at_change INTEGER NOT NULL,
        next_mileage INTEGER NOT NULL,
        -- Table des Agences (Multi-Agences)
      CREATE TABLE IF NOT EXISTS Agencies (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        city TEXT,
        sync_code TEXT,
        is_main INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migrations multi-agences
    try {
      await this.db.execAsync('ALTER TABLE Students ADD COLUMN agency_id INTEGER DEFAULT 1;');
    } catch (e) {}
    try {
      await this.db.execAsync('ALTER TABLE Vehicles ADD COLUMN agency_id INTEGER DEFAULT 1;');
    } catch (e) {}
    try {
      await this.db.execAsync('ALTER TABLE Transactions ADD COLUMN agency_id INTEGER DEFAULT 1;');
    } catch (e) {}
    try {
      await this.db.execAsync('ALTER TABLE Staff ADD COLUMN agency_id INTEGER DEFAULT 1;');
    } catch (e) {}
    try {
      await this.db.execAsync('ALTER TABLE OilChanges ADD COLUMN agency_id INTEGER DEFAULT 1;');
    } catch (e) {}

    // Initialiser l'agence principale par défaut s'il n'y en a aucune
    try {
      await this.db.execAsync(`
        INSERT INTO Agencies (id, name, city, is_main)
        SELECT 1, 'Auto-École Principale', 'Casablanca', 1
        WHERE NOT EXISTS (SELECT 1 FROM Agencies WHERE id = 1);
      `);
    } catch (e) {}

    // Migrations pour ajouter les colonnes liées au personnel si elles n'existent pas
    try {
      await this.db.execAsync('ALTER TABLE Transactions ADD COLUMN staff_id INTEGER REFERENCES Staff(id);');
    } catch (e) {}
    
    try {
      await this.db.execAsync('ALTER TABLE Categories ADD COLUMN is_staff_related BOOLEAN DEFAULT 0;');
      await this.db.runAsync('UPDATE Categories SET is_staff_related = 1 WHERE name = "Salaires"');
    } catch (e) {}

    // Migrations pour ajouter les colonnes liées au carburant
    try {
      await this.db.execAsync('ALTER TABLE Transactions ADD COLUMN fuel_liters REAL;');
    } catch (e) {}

    try {
      await this.db.execAsync('ALTER TABLE Transactions ADD COLUMN mileage_at_transaction INTEGER;');
    } catch (e) {}

    // Migrations pour assurance, vignette et statut étudiant
    try {
      await this.db.execAsync('ALTER TABLE Vehicles ADD COLUMN insurance_date TEXT;');
      await this.db.execAsync('ALTER TABLE Vehicles ADD COLUMN vignette_date TEXT;');
    } catch (e) {}

    try {
      await this.db.execAsync('ALTER TABLE Students ADD COLUMN status TEXT DEFAULT "ACTIVE";');
    } catch (e) {}

    try {
      await this.db.execAsync('ALTER TABLE Students ADD COLUMN exit_date TEXT;');
    } catch (e) {}

    try {
      await this.db.execAsync('ALTER TABLE Students ADD COLUMN outcome_status TEXT;');
    } catch (e) {}

    try {
      await this.db.execAsync('ALTER TABLE Students ADD COLUMN is_deleted INTEGER DEFAULT 0;');
    } catch (e) {}

    try {
      await this.db.execAsync('ALTER TABLE Transactions ADD COLUMN is_deleted INTEGER DEFAULT 0;');
    } catch (e) {}

    try {
      await this.db.execAsync('ALTER TABLE Students ADD COLUMN license_type TEXT DEFAULT "B";');
    } catch (e) {}

    try {
      await this.db.execAsync('ALTER TABLE Vehicles ADD COLUMN image_uri TEXT;');
    } catch (e) {}

    // Migration pour ajouter la catégorie "Autre"
    try {
      await this.db.execAsync(`
        INSERT INTO Categories (name, type, is_vehicle_related, is_staff_related, icon)
        SELECT 'Autre', 'EXPENSE', 0, 0, 'dots-horizontal'
        WHERE NOT EXISTS (SELECT 1 FROM Categories WHERE name = 'Autre' AND type = 'EXPENSE');
      `);
    } catch (e) {}
  }

  private static async seedDefaultCategories(): Promise<void> {
    if (!this.db) return;

    const defaultCategories = [
      { name: 'Paiement Forfait', type: 'INCOME', is_vehicle: 0, is_staff: 0, icon: 'wallet' },
      { name: 'Leçon supplémentaire', type: 'INCOME', is_vehicle: 0, is_staff: 0, icon: 'cash' },
      { name: 'Carburant', type: 'EXPENSE', is_vehicle: 1, is_staff: 0, icon: 'gas-station' },
      { name: 'Entretien & Réparation', type: 'EXPENSE', is_vehicle: 1, is_staff: 0, icon: 'wrench' },
      { name: 'Vidange', type: 'EXPENSE', is_vehicle: 1, is_staff: 0, icon: 'water' },
      { name: 'Assurance', type: 'EXPENSE', is_vehicle: 1, is_staff: 0, icon: 'shield-check' },
      { name: 'Loyer Local', type: 'EXPENSE', is_vehicle: 0, is_staff: 0, icon: 'home' },
      { name: 'Salaires', type: 'EXPENSE', is_vehicle: 0, is_staff: 1, icon: 'account-group' },
      { name: 'Électricité & Internet', type: 'EXPENSE', is_vehicle: 0, is_staff: 0, icon: 'lightning-bolt' },
      { name: 'Autre', type: 'EXPENSE', is_vehicle: 0, is_staff: 0, icon: 'dots-horizontal' }
    ];

    for (const cat of defaultCategories) {
      await this.db.execAsync(`
        INSERT INTO Categories (name, type, is_vehicle_related, is_staff_related, icon)
        SELECT '${cat.name}', '${cat.type}', ${cat.is_vehicle}, ${cat.is_staff}, '${cat.icon}'
        WHERE NOT EXISTS (SELECT 1 FROM Categories WHERE name = '${cat.name}' AND type = '${cat.type}');
      `);
    }
  }

  // =========================================================================
  // STUDENTS
  // =========================================================================

  // =========================================================================
  // STUDENTS
  // =========================================================================

  static async getStudents(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT s.id, s.name, s.package_price, s.phone, s.created_at, s.status, s.exit_date, s.outcome_status, s.license_type,
        COALESCE((SELECT SUM(t.amount) FROM Transactions t WHERE t.student_id = s.id AND t.type = 'INCOME' AND t.is_deleted = 0), 0) as paid_amount
      FROM Students s
      WHERE s.is_deleted = 0
      ORDER BY s.created_at DESC
    `);
  }

  static async addStudent(name: string, phone: string, packagePrice: number, advance?: number, licenseType: string = 'B'): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.withTransactionAsync(async () => {
      const result = await this.db!.runAsync(
        'INSERT INTO Students (name, phone, package_price, license_type) VALUES (?, ?, ?, ?)',
        name || 'Élève', phone || '', packagePrice || 0, licenseType || 'B'
      );
      if (advance && advance > 0) {
        const cat = await this.db!.getFirstAsync<{id: number}>(
          "SELECT id FROM Categories WHERE type = 'INCOME' ORDER BY id ASC LIMIT 1"
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

  static async updateStudent(id: number, name: string, phone: string, packagePrice: number, licenseType: string = 'B'): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'UPDATE Students SET name = ?, phone = ?, package_price = ?, license_type = ? WHERE id = ?',
      name || 'Élève', phone || '', packagePrice || 0, licenseType || 'B', id
    );
  }

  static async updateStudentStatus(id: number, status: 'ACTIVE' | 'ARCHIVED'): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'UPDATE Students SET status = ? WHERE id = ?',
      status, id
    );
  }

  static async deleteStudent(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Transactions SET student_id = NULL WHERE student_id = ?', id);
    await this.db!.runAsync('DELETE FROM Students WHERE id = ?', id);
  }

  // =========================================================================
  // VEHICLES
  // =========================================================================

  static async getVehicles(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT v.id, v.name, v.registration, v.current_mileage, v.next_technical_visit, v.insurance_date, v.vignette_date, v.image_uri,
        COALESCE((SELECT SUM(t.amount) FROM Transactions t WHERE t.vehicle_id = v.id AND t.type = 'EXPENSE' AND t.is_deleted = 0), 0) as total_expenses,
        COALESCE(
          (SELECT o.next_mileage FROM OilChanges o WHERE o.vehicle_id = v.id ORDER BY o.id DESC LIMIT 1),
          v.current_mileage + 10000
        ) as next_oil_change_km,
        (
          SELECT 
            CASE 
              WHEN (MAX(t.mileage_at_transaction) - MIN(t.mileage_at_transaction)) > 0 
              THEN (SUM(t.fuel_liters) / (MAX(t.mileage_at_transaction) - MIN(t.mileage_at_transaction))) * 100
              ELSE 0 
            END
          FROM Transactions t
          JOIN Categories c ON t.category_id = c.id
          WHERE t.vehicle_id = v.id AND c.name = 'Carburant' AND t.fuel_liters IS NOT NULL AND t.is_deleted = 0
        ) as avg_consumption
      FROM Vehicles v
      ORDER BY v.created_at DESC
    `);
  }

  static async addVehicle(
    name: string, 
    registration: string, 
    mileage: number, 
    nextVisit?: string, 
    oilChangeDate?: string,
    insuranceDate?: string,
    vignetteDate?: string,
    imageUri?: string
  ): Promise<void> {
    if (!this.db) await this.initDB();
    const cleanVisit = nextVisit && nextVisit.trim() ? nextVisit.trim() : null;
    const cleanIns = insuranceDate && insuranceDate.trim() ? insuranceDate.trim() : null;
    const cleanVig = vignetteDate && vignetteDate.trim() ? vignetteDate.trim() : null;
    const cleanOil = oilChangeDate && oilChangeDate.trim() ? oilChangeDate.trim() : null;

    await this.db!.withTransactionAsync(async () => {
      const result = await this.db!.runAsync(
        'INSERT INTO Vehicles (name, registration, current_mileage, next_technical_visit, insurance_date, vignette_date, image_uri) VALUES (?, ?, ?, ?, ?, ?, ?)',
        name || 'Véhicule', registration || '—', mileage || 0, cleanVisit, cleanIns, cleanVig, imageUri || null
      );
      if (cleanOil) {
        const nextOilMileage = (mileage || 0) + 10000;
        await this.db!.runAsync(
          'INSERT INTO OilChanges (vehicle_id, change_date, mileage_at_change, next_mileage) VALUES (?, ?, ?, ?)',
          result.lastInsertRowId, cleanOil, mileage || 0, nextOilMileage
        );
      }
    });
  }

  static async updateVehicle(
    id: number, 
    name: string, 
    registration: string, 
    mileage: number, 
    nextVisit?: string,
    insuranceDate?: string,
    vignetteDate?: string,
    imageUri?: string
  ): Promise<void> {
    if (!this.db) await this.initDB();
    const cleanVisit = nextVisit && nextVisit.trim() ? nextVisit.trim() : null;
    const cleanIns = insuranceDate && insuranceDate.trim() ? insuranceDate.trim() : null;
    const cleanVig = vignetteDate && vignetteDate.trim() ? vignetteDate.trim() : null;

    await this.db!.runAsync(
      'UPDATE Vehicles SET name = ?, registration = ?, current_mileage = ?, next_technical_visit = ?, insurance_date = ?, vignette_date = ?, image_uri = ? WHERE id = ?',
      name || 'Véhicule', registration || '—', mileage || 0, cleanVisit, cleanIns, cleanVig, imageUri || null, id
    );
  }

  static async deleteVehicle(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('DELETE FROM OilChanges WHERE vehicle_id = ?', id);
    await this.db!.runAsync('UPDATE Transactions SET vehicle_id = NULL WHERE vehicle_id = ?', id);
    await this.db!.runAsync('DELETE FROM Vehicles WHERE id = ?', id);
  }

  // =========================================================================
  // TRANSACTIONS
  // =========================================================================

  static async getStudentTransactions(studentId: number): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT t.id, t.amount, t.description, t.transaction_date as date, c.name as category_name
      FROM Transactions t
      LEFT JOIN Categories c ON t.category_id = c.id
      WHERE t.student_id = ? AND t.type = 'INCOME' AND t.is_deleted = 0
      ORDER BY t.transaction_date DESC
    `, studentId);
  }

  static async deleteTransaction(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('DELETE FROM Transactions WHERE id = ?', id);
  }

  static async getTransactions(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT t.id, t.amount, t.type, t.description, t.transaction_date as date, 
             t.category_id, t.student_id, t.vehicle_id, t.staff_id, t.fuel_liters, t.mileage_at_transaction,
             c.name as category_name,
             s.name as student_name, s.license_type,
             v.name as vehicle_name, v.registration as vehicle_reg,
             st.name as staff_name, st.role as staff_role
      FROM Transactions t
      LEFT JOIN Categories c ON t.category_id = c.id
      LEFT JOIN Students s ON t.student_id = s.id
      LEFT JOIN Vehicles v ON t.vehicle_id = v.id
      LEFT JOIN Staff st ON t.staff_id = st.id
      WHERE t.is_deleted = 0
      ORDER BY t.transaction_date DESC
    `);
  }

  static async getTodayTransactions(): Promise<any[]> {
    if (!this.db) await this.initDB();
    const today = new Date().toISOString().split('T')[0];
    const likePattern = `${today}%`;
    return await this.db!.getAllAsync(`
      SELECT t.id, t.amount, t.type, t.description, t.transaction_date as date, 
             t.category_id, t.student_id, t.vehicle_id, t.staff_id, t.fuel_liters, t.mileage_at_transaction,
             c.name as category_name,
             s.name as student_name, s.license_type,
             v.name as vehicle_name, v.registration as vehicle_reg,
             st.name as staff_name, st.role as staff_role
      FROM Transactions t
      LEFT JOIN Categories c ON t.category_id = c.id
      LEFT JOIN Students s ON t.student_id = s.id
      LEFT JOIN Vehicles v ON t.vehicle_id = v.id
      LEFT JOIN Staff st ON t.staff_id = st.id
      WHERE t.transaction_date LIKE ? AND t.is_deleted = 0
      ORDER BY t.transaction_date DESC
    `, [likePattern]);
  }

  // =========================================================================
  // STAFF (Personnel)
  // =========================================================================

  static async getStaff(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT s.id, s.name, s.phone, s.role, s.base_salary, s.created_at,
        COALESCE((SELECT SUM(t.amount) FROM Transactions t WHERE t.staff_id = s.id AND t.type = 'EXPENSE' AND t.is_deleted = 0), 0) as paid_amount,
        COALESCE((SELECT COUNT(t.id) FROM Transactions t WHERE t.staff_id = s.id AND t.is_deleted = 0), 0) as total_sessions
      FROM Staff s
      ORDER BY s.created_at DESC
    `);
  }

  static async addStaff(name: string, phone: string, role: string, baseSalary: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'INSERT INTO Staff (name, phone, role, base_salary) VALUES (?, ?, ?, ?)',
      name, phone, role, baseSalary
    );
  }

  static async updateStaff(id: number, name: string, phone: string, role: string, baseSalary: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'UPDATE Staff SET name = ?, phone = ?, role = ?, base_salary = ? WHERE id = ?',
      name, phone, role, baseSalary, id
    );
  }

  static async deleteStaff(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Transactions SET staff_id = NULL WHERE staff_id = ?', id);
    await this.db!.runAsync('DELETE FROM Staff WHERE id = ?', id);
  }

  static async addExpense(
    amount: number,
    categoryId: number,
    vehicleId: number | null,
    currentMileage: number | null,
    description: string,
    staffId?: number | null,
    fuelLiters?: number | null
  ): Promise<void> {
    if (!this.db) await this.initDB();

    await this.db!.withTransactionAsync(async () => {
      await this.db!.runAsync(
        'INSERT INTO Transactions (amount, type, category_id, vehicle_id, staff_id, description, fuel_liters, mileage_at_transaction) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        amount, 'EXPENSE', categoryId, vehicleId || null, staffId || null, description, fuelLiters || null, currentMileage || null
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
      WHERE transaction_date LIKE ? AND is_deleted = 0
    `, [likePattern]);

    return result || { income: 0, expense: 0 };
  }

  static async getFinancialSummaryByPeriod(period: 'TODAY' | 'WEEK' | 'MONTH' | 'YEAR'): Promise<{ income: number; expense: number }> {
    if (!this.db) await this.initDB();

    let startDate = new Date();
    const endDate = new Date().toISOString().split('T')[0] + ' 23:59:59';
    let startStr = '';

    if (period === 'TODAY') {
      startStr = startDate.toISOString().split('T')[0] + ' 00:00:00';
    } else if (period === 'WEEK') {
      const day = startDate.getDay() || 7;
      if (day !== 1) startDate.setHours(-24 * (day - 1));
      startStr = startDate.toISOString().split('T')[0] + ' 00:00:00';
    } else if (period === 'MONTH') {
      startDate.setDate(1);
      startStr = startDate.toISOString().split('T')[0] + ' 00:00:00';
    } else if (period === 'YEAR') {
      startDate.setMonth(0, 1);
      startStr = startDate.toISOString().split('T')[0] + ' 00:00:00';
    }

    const result = await this.db!.getFirstAsync<{ income: number; expense: number }>(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
        COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
      FROM Transactions
      WHERE (transaction_date BETWEEN ? AND ?) AND is_deleted = 0
    `, [startStr, endDate]);

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

  static async getVehicleAlerts(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync(`
      SELECT id, name, registration, next_technical_visit, insurance_date, vignette_date,
             julianday(next_technical_visit) - julianday('now') as visit_days,
             julianday(insurance_date) - julianday('now') as insurance_days,
             julianday(vignette_date) - julianday('now') as vignette_days
      FROM Vehicles
      WHERE 
        ((julianday(next_technical_visit) - julianday('now')) <= 30 AND (julianday(next_technical_visit) - julianday('now')) >= 0)
        OR
        ((julianday(insurance_date) - julianday('now')) <= 30 AND (julianday(insurance_date) - julianday('now')) >= 0)
        OR
        ((julianday(vignette_date) - julianday('now')) <= 30 AND (julianday(vignette_date) - julianday('now')) >= 0)
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
    return await this.db!.getAllAsync('SELECT * FROM Categories WHERE type = ?', type);
  }

  // =========================================================================
  // ARCHIVING & FILTERING
  // =========================================================================

  static async archiveStudent(id: number, exitDate: string, outcomeStatus: 'PASSED' | 'FAILED' | 'ABANDONED'): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'UPDATE Students SET status = "ARCHIVED", exit_date = ?, outcome_status = ? WHERE id = ?',
      exitDate, outcomeStatus, id
    );
  }

  static async reactivateStudent(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync(
      'UPDATE Students SET status = "ACTIVE", exit_date = NULL, outcome_status = NULL WHERE id = ?',
      id
    );
  }

  static async getFilteredStudents(options: {
    status?: 'ACTIVE' | 'ARCHIVED';
    year?: string;
    month?: string;
    outcomeStatus?: string;
    licenseType?: string;
  }): Promise<any[]> {
    if (!this.db) await this.initDB();
    
    let query = `
      SELECT s.id, s.name, s.package_price, s.phone, s.created_at, s.status, s.exit_date, s.outcome_status, s.license_type,
        COALESCE((SELECT SUM(t.amount) FROM Transactions t WHERE t.student_id = s.id AND t.type = 'INCOME' AND t.is_deleted = 0), 0) as paid_amount
      FROM Students s
      WHERE s.is_deleted = 0
    `;
    const params: any[] = [];

    if (options.status) {
      query += ` AND s.status = ?`;
      params.push(options.status);
    }

    if (options.outcomeStatus && options.outcomeStatus !== 'ALL') {
      query += ` AND s.outcome_status = ?`;
      params.push(options.outcomeStatus);
    }

    if (options.licenseType && options.licenseType !== 'ALL') {
      query += ` AND s.license_type = ?`;
      params.push(options.licenseType);
    }

    if (options.year && options.year !== 'ALL') {
      query += ` AND strftime('%Y', s.created_at) = ?`;
      params.push(options.year);
    }

    if (options.month && options.month !== 'ALL') {
      query += ` AND strftime('%m', s.created_at) = ?`;
      params.push(options.month);
    }

    query += ` ORDER BY s.created_at DESC`;

    return await this.db!.getAllAsync(query, params);
  }

  // =========================================================================
  // TVA CALCULATIONS
  // =========================================================================

  static async getAnnualTVAReport(year: string): Promise<{ studentCount: number; totalTVA: number; students: any[] }> {
    if (!this.db) await this.initDB();
    
    const students = await this.db!.getAllAsync<any>(
      `SELECT id, name, phone, created_at, package_price 
       FROM Students 
       WHERE strftime('%Y', created_at) = ? AND is_deleted = 0
       ORDER BY created_at DESC`,
      [year]
    );

    const count = students.length;
    return {
      studentCount: count,
      totalTVA: count * 450,
      students
    };
  }

  // =========================================================================
  // TRANSACTION UPDATES
  // =========================================================================

  static async updateTransaction(
    id: number,
    amount: number,
    categoryId: number,
    studentId: number | null,
    vehicleId: number | null,
    description: string,
    fuelLiters?: number | null,
    mileageAtTransaction?: number | null,
    staffId?: number | null,
    date?: string
  ): Promise<void> {
    if (!this.db) await this.initDB();
    if (date) {
      await this.db!.runAsync(
        `UPDATE Transactions 
         SET amount = ?, category_id = ?, student_id = ?, vehicle_id = ?, description = ?, fuel_liters = ?, mileage_at_transaction = ?, staff_id = ?, transaction_date = ?
         WHERE id = ?`,
        amount, categoryId, studentId, vehicleId, description, fuelLiters || null, mileageAtTransaction || null, staffId || null, date, id
      );
    } else {
      await this.db!.runAsync(
        `UPDATE Transactions 
         SET amount = ?, category_id = ?, student_id = ?, vehicle_id = ?, description = ?, fuel_liters = ?, mileage_at_transaction = ?, staff_id = ?
         WHERE id = ?`,
        amount, categoryId, studentId, vehicleId, description, fuelLiters || null, mileageAtTransaction || null, staffId || null, id
      );
    }
  }

  // =========================================================================
  // CORBEILLE (TRASH / SOFT DELETE)
  // =========================================================================

  static async softDeleteStudent(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Students SET is_deleted = 1 WHERE id = ?', id);
  }

  static async restoreStudent(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Students SET is_deleted = 0 WHERE id = ?', id);
  }

  static async hardDeleteStudent(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Transactions SET student_id = NULL WHERE student_id = ?', id);
    await this.db!.runAsync('DELETE FROM Students WHERE id = ?', id);
  }

  static async softDeleteTransaction(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Transactions SET is_deleted = 1 WHERE id = ?', id);
  }

  static async restoreTransaction(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Transactions SET is_deleted = 0 WHERE id = ?', id);
  }

  static async hardDeleteTransaction(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('DELETE FROM Transactions WHERE id = ?', id);
  }

  static async getTrashedItems(): Promise<{ students: any[]; transactions: any[] }> {
    if (!this.db) await this.initDB();

    const students = await this.db!.getAllAsync(`
      SELECT s.id, s.name, s.package_price, s.phone, s.created_at, s.status
      FROM Students s
      WHERE s.is_deleted = 1
      ORDER BY s.created_at DESC
    `);

    const transactions = await this.db!.getAllAsync(`
      SELECT t.id, t.amount, t.type, t.description, t.transaction_date as date, c.name as category_name
      FROM Transactions t
      LEFT JOIN Categories c ON t.category_id = c.id
      WHERE t.is_deleted = 1
      ORDER BY t.transaction_date DESC
    `);

    return { students, transactions };
  }

  static async emptyTrash(): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.withTransactionAsync(async () => {
      await this.db!.runAsync(`
        UPDATE Transactions 
        SET student_id = NULL 
        WHERE student_id IN (SELECT id FROM Students WHERE is_deleted = 1)
      `);
      await this.db!.runAsync('DELETE FROM Students WHERE is_deleted = 1');
      await this.db!.runAsync('DELETE FROM Transactions WHERE is_deleted = 1');
    });
  }

  static async getFinancialHistoryLast6Months(): Promise<{ month: string; income: number; expense: number }[]> {
    if (!this.db) await this.initDB();
    const result: { month: string; income: number; expense: number }[] = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const likePattern = `${year}-${month}-%`;
      
      const summary = await this.db!.getFirstAsync<{ income: number; expense: number }>(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
        FROM Transactions
        WHERE transaction_date LIKE ? AND is_deleted = 0
      `, [likePattern]);
      
      const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
      const monthName = monthNames[d.getMonth()];
      
      result.push({
        month: `${monthName} ${String(year).slice(-2)}`,
        income: summary?.income || 0,
        expense: summary?.expense || 0
      });
    }

    return result;
  }

  // =========================================================================
  // AGENCIES & NETWORK COMPARATIVE SUMMARY (Multi-Agences)
  // =========================================================================

  static async getAgencies(): Promise<any[]> {
    if (!this.db) await this.initDB();
    return await this.db!.getAllAsync('SELECT * FROM Agencies ORDER BY is_main DESC, id ASC');
  }

  static async addAgency(name: string, city: string, isMain: number = 0): Promise<void> {
    if (!this.db) await this.initDB();
    const syncCode = `SYNC_${name.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)}_${Math.floor(1000 + Math.random() * 9000)}`;
    await this.db!.runAsync(
      'INSERT INTO Agencies (name, city, sync_code, is_main) VALUES (?, ?, ?, ?)',
      name, city || null, syncCode, isMain
    );
  }

  static async updateAgency(id: number, name: string, city: string): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('UPDATE Agencies SET name = ?, city = ? WHERE id = ?', name, city || null, id);
  }

  static async deleteAgency(id: number): Promise<void> {
    if (!this.db) await this.initDB();
    await this.db!.runAsync('DELETE FROM Agencies WHERE id = ? AND is_main = 0', id);
  }

  static async getNetworkSummary(): Promise<any[]> {
    if (!this.db) await this.initDB();
    const agencies = await this.getAgencies();
    const summaryList: any[] = [];

    for (const a of agencies) {
      const studentCountRes = await this.db!.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Students WHERE agency_id = ? AND is_deleted = 0',
        [a.id]
      );
      const passedCountRes = await this.db!.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Students WHERE agency_id = ? AND outcome_status = "PASSED" AND is_deleted = 0',
        [a.id]
      );
      const examinedCountRes = await this.db!.getFirstAsync<{ count: number }>(
        'SELECT COUNT(*) as count FROM Students WHERE agency_id = ? AND outcome_status IN ("PASSED", "FAILED") AND is_deleted = 0',
        [a.id]
      );
      const finRes = await this.db!.getFirstAsync<{ income: number; expense: number }>(`
        SELECT 
          COALESCE(SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END), 0) as income,
          COALESCE(SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END), 0) as expense
        FROM Transactions
        WHERE agency_id = ? AND is_deleted = 0
      `, [a.id]);

      const studentCount = studentCountRes?.count || 0;
      const passedCount = passedCountRes?.count || 0;
      const examinedCount = examinedCountRes?.count || 0;
      const income = finRes?.income || 0;
      const expense = finRes?.expense || 0;
      const net = income - expense;
      const passRate = examinedCount > 0 ? Math.round((passedCount / examinedCount) * 100) : 0;

      summaryList.push({
        id: a.id,
        name: a.name,
        city: a.city,
        sync_code: a.sync_code,
        is_main: a.is_main,
        student_count: studentCount,
        income,
        expense,
        net,
        pass_rate: passRate
      });
    }

    return summaryList;
  }
}
