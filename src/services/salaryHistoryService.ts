/**
 * Salary History Service
 * Track all salary payments with full/partial payment support
 * Production-level with proper indexing and audit trails
 */

import { DatabaseService } from './database';
import { auditLogService } from './auditLogService';

// Get database instance
const db = DatabaseService.getInstance();

// PERFORMANCE: Track initialization to prevent repeated calls
let salaryTablesInitialized = false;

export interface SalaryPayment {
  id: number;
  staff_id: number;
  staff_name: string;
  employee_id: string;
  payment_date: string;
  salary_amount: number; // Current/base salary
  payment_amount: number; // Amount actually paid
  payment_type: 'full' | 'partial' | 'advance' | 'bonus' | 'deduction';
  payment_percentage: number; // Percentage of base salary paid
  payment_month: string; // Format: YYYY-MM
  payment_year: number;
  notes?: string;
  payment_method: 'cash' | 'bank_transfer' | 'cheque';
  reference_number?: string;
  paid_by: string; // Who authorized/made the payment
  created_at: string;
  updated_at: string;
}

export interface SalaryHistoryFormData {
  staff_id: number;
  payment_amount: number;
  payment_type: SalaryPayment['payment_type'];
  payment_month: string;
  notes?: string;
  payment_method: SalaryPayment['payment_method'];
  reference_number?: string;
}

export interface SalaryStatistics {
  total_paid_this_month: number;
  total_paid_this_year: number;
  pending_payments: number;
  average_monthly_payment: number;
  staff_payment_summary: {
    staff_id: number;
    staff_name: string;
    employee_id: string;
    current_salary: number;
    total_paid_this_month: number;
    last_payment_date: string;
    payment_status: 'paid' | 'partial' | 'pending';
  }[];
}

class SalaryHistoryService {
  private static instance: SalaryHistoryService;
  private salaryPaymentsSchema: 'management' | 'service' | 'unified' = 'unified';

  public static getInstance(): SalaryHistoryService {
    if (!SalaryHistoryService.instance) {
      SalaryHistoryService.instance = new SalaryHistoryService();
    }
    return SalaryHistoryService.instance;
  }

  /**
   * PERMANENT SOLUTION: Detect and handle different salary_payments table schemas
   * This ensures compatibility with any schema variation
   */
  private async ensureSalaryPaymentsCompatibility(): Promise<void> {
    try {
      console.log('🔧 [SALARY] Ensuring salary_payments table compatibility...');

      // Check which columns exist in salary_payments table
      const tableInfo = await db.executeRawQuery("PRAGMA table_info(salary_payments)");
      const columns = tableInfo.map((col: any) => col.name);

      console.log('📋 [SALARY] Salary payments columns:', columns);

      // Detect schema type
      const hasPaymentCode = columns.includes('payment_code');
      const hasBasicSalary = columns.includes('basic_salary');
      const hasEmployeeId = columns.includes('employee_id');
      const hasSalaryAmount = columns.includes('salary_amount');
      const hasPaymentAmount = columns.includes('payment_amount');
      const hasPaymentType = columns.includes('payment_type');

      if (hasPaymentCode && hasBasicSalary) {
        console.log('📋 [SALARY] Detected Schema 1 (management style)');
        this.salaryPaymentsSchema = 'management';
      } else if (hasEmployeeId && hasSalaryAmount && hasPaymentAmount && hasPaymentType) {
        console.log('📋 [SALARY] Detected Schema 2 (service style)');
        this.salaryPaymentsSchema = 'service';
      } else {
        console.log('🔧 [SALARY] Unknown schema, creating unified schema...');
        await this.createUnifiedSalaryPaymentsSchema();
        this.salaryPaymentsSchema = 'unified';
      }

    } catch (error) {
      console.warn('⚠️ [SALARY] Error checking salary_payments compatibility:', error);
      // Try to create the table if it doesn't exist
      await this.createUnifiedSalaryPaymentsSchema();
      this.salaryPaymentsSchema = 'unified';
    }
  }

  /**
   * Create a unified salary_payments schema that works for all cases
   */
  private async createUnifiedSalaryPaymentsSchema(): Promise<void> {
    try {
      console.log('🔧 [SALARY] Creating unified salary_payments schema...');

      // First, try to rename existing table as backup
      try {
        await db.executeCommand(`ALTER TABLE salary_payments RENAME TO salary_payments_backup_${Date.now()}`);
        console.log('📦 [SALARY] Backed up existing salary_payments table');
      } catch (error) {
        console.log('ℹ️ [SALARY] No existing table to backup (this is normal for new installations)');
      }

      // Create unified schema with ALL possible columns
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS salary_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          staff_name TEXT NOT NULL,
          employee_id TEXT,
          payment_code TEXT,
          payment_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          salary_month TEXT NOT NULL,
          payment_month TEXT,
          payment_year INTEGER,
          basic_salary REAL DEFAULT 0,
          salary_amount REAL DEFAULT 0,
          payment_amount REAL NOT NULL,
          payment_type TEXT DEFAULT 'full',
          payment_percentage REAL DEFAULT 100,
          overtime_hours REAL DEFAULT 0,
          overtime_rate REAL DEFAULT 0,
          overtime_amount REAL DEFAULT 0,
          bonus REAL DEFAULT 0,
          deductions REAL DEFAULT 0,
          total_amount REAL,
          payment_method TEXT DEFAULT 'cash',
          reference_number TEXT,
          notes TEXT,
          paid_by TEXT,
          status TEXT DEFAULT 'paid',
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
        )
      `);

      console.log('✅ [SALARY] Unified salary_payments schema created');

    } catch (error) {
      console.error('❌ [SALARY] Error creating unified schema:', error);
      throw error;
    }
  }

  /**
   * Get appropriate INSERT query based on detected schema
   */
  private getInsertQuery(schema: string): { query: string; columnMapping: (data: any, staff: any, paidBy?: string) => any[] } {
    if (schema === 'management') {
      // Schema 1: payment_code, basic_salary, overtime, etc.
      return {
        query: `
          INSERT INTO salary_payments (
            staff_id, staff_name, payment_code, salary_month, basic_salary,
            overtime_hours, overtime_rate, overtime_amount, bonus, deductions,
            total_amount, payment_method, payment_date, notes, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'), ?, ?)
        `,
        columnMapping: (data: any, staff: any) => {
          const timestamp = Date.now();
          const paymentCode = `SAL-${data.staff_id}-${timestamp}`;
          const baseSalary = staff.salary || data.payment_amount;

          return [
            data.staff_id,
            staff.full_name,
            paymentCode,
            data.payment_month,
            Math.max(baseSalary, data.payment_amount), // Ensure > 0 constraint
            0, // overtime_hours
            0, // overtime_rate  
            0, // overtime_amount
            0, // bonus
            0, // deductions
            data.payment_amount, // total_amount
            data.payment_method,
            data.notes || '',
            'paid' // status
          ];
        }
      };
    } else if (schema === 'service') {
      // Schema 2: employee_id, salary_amount, payment_amount, payment_type, etc.
      return {
        query: `
          INSERT INTO salary_payments (
            staff_id, staff_name, employee_id, payment_date, salary_amount,
            payment_amount, payment_type, payment_percentage, payment_month,
            payment_year, notes, payment_method, reference_number, paid_by
          ) VALUES (?, ?, ?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        columnMapping: (data: any, staff: any, paidBy?: string) => {
          const baseSalary = staff.salary || 0;
          const paymentPercentage = baseSalary > 0 ? (data.payment_amount / baseSalary) * 100 : 100;

          return [
            data.staff_id,
            staff.full_name,
            staff.employee_id,
            baseSalary,
            data.payment_amount,
            data.payment_type,
            paymentPercentage,
            data.payment_month,
            parseInt(data.payment_month.split('-')[0]),
            data.notes || '',
            data.payment_method,
            data.reference_number || '',
            paidBy || 'system'
          ];
        }
      };
    } else {
      // Unified schema: all columns available
      return {
        query: `
          INSERT INTO salary_payments (
            staff_id, staff_name, employee_id, payment_code, salary_month,
            payment_month, payment_year, basic_salary, salary_amount,
            payment_amount, payment_type, payment_percentage, total_amount,
            payment_method, reference_number, notes, paid_by, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
        columnMapping: (data: any, staff: any, paidBy?: string) => {
          const timestamp = Date.now();
          const paymentCode = `SAL-${data.staff_id}-${timestamp}`;
          const baseSalary = staff.salary || 0;
          const paymentPercentage = baseSalary > 0 ? (data.payment_amount / baseSalary) * 100 : 100;

          return [
            data.staff_id,
            staff.full_name,
            staff.employee_id,
            paymentCode,
            data.payment_month, // salary_month
            data.payment_month, // payment_month
            parseInt(data.payment_month.split('-')[0]), // payment_year
            baseSalary, // basic_salary
            baseSalary, // salary_amount
            data.payment_amount, // payment_amount
            data.payment_type, // payment_type
            paymentPercentage, // payment_percentage
            data.payment_amount, // total_amount
            data.payment_method,
            data.reference_number || '',
            data.notes || '',
            paidBy || 'system',
            'paid' // status
          ];
        }
      };
    }
  }

  /**
   * Get the appropriate WHERE clause for active staff based on table schema
   */
  private async getActiveStaffCondition(): Promise<string> {
    try {
      const tableInfo = await db.executeRawQuery("PRAGMA table_info(staff)");
      const columns = tableInfo.map((col: any) => col.name);

      if (columns.includes('is_active')) {
        return '(s.is_active = 1 OR s.is_active = true)';
      } else if (columns.includes('status')) {
        return "s.status = 'active'";
      } else {
        // No active status column, include all staff
        return '1=1';
      }
    } catch (error) {
      console.warn('⚠️ [SALARY] Error checking staff table schema, including all staff:', error);
      return '1=1'; // Fallback to include all staff
    }
  }

  /**
   * Ensure staff table has proper schema for salary operations
   * This fixes the column mismatch issues permanently
   */
  private async ensureStaffTableCompatibility(): Promise<void> {
    try {
      // Check which columns exist in the staff table
      const tableInfo = await db.executeRawQuery("PRAGMA table_info(staff)");
      const columns = tableInfo.map((col: any) => col.name);

      console.log('📋 [SALARY] Staff table columns:', columns);

      // Check if we have the right active status column
      const hasIsActive = columns.includes('is_active');
      const hasStatus = columns.includes('status');

      if (!hasIsActive && !hasStatus) {
        // Add is_active column if neither exists
        console.log('🔧 [SALARY] Adding is_active column to staff table...');
        await db.executeCommand(`
          ALTER TABLE staff ADD COLUMN is_active BOOLEAN DEFAULT 1
        `);

        // Update all existing records to be active
        await db.executeCommand(`
          UPDATE staff SET is_active = 1 WHERE is_active IS NULL
        `);
      }

      // Ensure we have full_name column (some schemas use 'name' instead)
      const hasFullName = columns.includes('full_name');
      const hasName = columns.includes('name');

      if (!hasFullName && hasName) {
        console.log('🔧 [SALARY] Adding full_name column to staff table...');
        await db.executeCommand(`
          ALTER TABLE staff ADD COLUMN full_name TEXT
        `);

        // Copy name to full_name for existing records
        await db.executeCommand(`
          UPDATE staff SET full_name = name WHERE full_name IS NULL
        `);
      }

      // Ensure we have salary column (some schemas use 'basic_salary' instead)
      const hasSalary = columns.includes('salary');
      const hasBasicSalary = columns.includes('basic_salary');

      if (!hasSalary && hasBasicSalary) {
        console.log('🔧 [SALARY] Adding salary column to staff table...');
        await db.executeCommand(`
          ALTER TABLE staff ADD COLUMN salary REAL DEFAULT 0
        `);

        // Copy basic_salary to salary for existing records
        await db.executeCommand(`
          UPDATE staff SET salary = basic_salary WHERE salary IS NULL OR salary = 0
        `);
      }

      console.log('✅ [SALARY] Staff table compatibility ensured');
    } catch (error) {
      console.warn('⚠️ [SALARY] Error ensuring staff table compatibility:', error);
      // Don't throw - this is a safety feature, not critical
    }
  }

  /**
   * Initialize salary history tables
   */
  async initializeTables(): Promise<void> {
    // PERFORMANCE: Skip if already initialized
    if (salaryTablesInitialized) {
      console.log('✅ [SALARY] Tables already initialized, skipping...');
      return;
    }

    try {
      console.log('🔄 [SALARY] Initializing salary history tables...');

      // Ensure staff table compatibility first
      await this.ensureStaffTableCompatibility();

      // Ensure salary payments table compatibility
      await this.ensureSalaryPaymentsCompatibility();

      // PERFORMANCE: Skip if already initialized
      if (salaryTablesInitialized) {
        console.log('✅ [SALARY] Tables already initialized, skipping...');
        return;
      }

      // Create salary_payments table
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS salary_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          staff_name TEXT NOT NULL,
          employee_id TEXT,
          payment_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          salary_amount REAL DEFAULT 0,
          payment_amount REAL NOT NULL,
          payment_type TEXT DEFAULT 'full',
          payment_percentage REAL DEFAULT 100,
          payment_month TEXT,
          payment_year INTEGER,
          notes TEXT,
          payment_method TEXT DEFAULT 'cash',
          reference_number TEXT,
          paid_by TEXT DEFAULT 'system',
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          updated_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
        )
      `);

      // Create indexes for performance
      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_salary_payments_staff_id ON salary_payments(staff_id)
      `);

      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_salary_payments_date ON salary_payments(payment_date)
      `);

      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_salary_payments_month ON salary_payments(payment_month)
      `);

      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_salary_payments_year ON salary_payments(payment_year)
      `);

      // Create salary_adjustments table for salary changes tracking
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS salary_adjustments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          staff_name TEXT NOT NULL,
          employee_id TEXT NOT NULL,
          old_salary REAL NOT NULL,
          new_salary REAL NOT NULL,
          adjustment_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          adjustment_reason TEXT NOT NULL,
          adjustment_type TEXT NOT NULL CHECK (adjustment_type IN ('increase', 'decrease', 'promotion', 'demotion')),
          approved_by TEXT NOT NULL,
          effective_date TEXT NOT NULL,
          notes TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          FOREIGN KEY (staff_id) REFERENCES staff(id) ON DELETE CASCADE
        )
      `);

      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_salary_adjustments_staff_id ON salary_adjustments(staff_id)
      `);

      console.log('Salary history tables initialized successfully');

      // Mark as initialized to prevent repeated calls
      salaryTablesInitialized = true;
      console.log('✅ [SALARY] Salary service initialization completed');
    } catch (error) {
      console.error('Error initializing salary history tables:', error);
      throw error;
    }
  }

  /**
   * Record a salary payment
   */
  async recordPayment(data: SalaryHistoryFormData, paidBy: string): Promise<SalaryPayment> {
    try {
      await this.initializeTables();

      // Validate required fields
      if (!data.staff_id || data.staff_id <= 0) {
        throw new Error('Invalid staff ID provided');
      }

      if (!data.payment_amount || data.payment_amount <= 0) {
        throw new Error('Payment amount must be greater than 0');
      }

      console.log('Recording payment for staff_id:', data.staff_id, 'amount:', data.payment_amount);

      // PRODUCTION FIX: Ensure staff data integrity using centralized system
      await db.ensureCentralizedStaffExist();

      // Get staff information using centralized system
      const allStaff = await db.getCentralizedStaff();
      const staff = allStaff.find((s: any) => s.id === data.staff_id);

      if (!staff) {
        // Log available staff for debugging
        console.warn(`⚠️ [SALARY] Staff member with ID ${data.staff_id} not found. Available staff:`,
          allStaff.map((s: any) => ({ id: s.id, name: s.full_name, employee_id: s.employee_id })));
        throw new Error(`Staff member not found with ID: ${data.staff_id}. Available staff count: ${allStaff.length}`);
      }
      const baseSalary = staff.salary || 0;
      const paymentPercentage = baseSalary > 0 ? (data.payment_amount / baseSalary) * 100 : 0;

      // Get the appropriate insert query based on current schema
      const insertInfo = this.getInsertQuery(this.salaryPaymentsSchema);
      const values = insertInfo.columnMapping(data, staff, paidBy);

      // Insert payment record using dynamic schema
      const result = await db.executeCommand(insertInfo.query, values);

      console.log('Payment insert result:', {
        lastInsertRowId: result.lastInsertRowId,
        changes: result.changes
      });

      // Get the created payment
      let paymentResult = await db.executeRawQuery(
        'SELECT * FROM salary_payments WHERE id = ?',
        [result.lastInsertRowId]
      );

      // If direct query fails, try alternative approach
      if (paymentResult.length === 0) {
        console.log('Trying alternative query approach...');
        paymentResult = await db.executeRawQuery(
          'SELECT * FROM salary_payments WHERE staff_id = ? ORDER BY id DESC LIMIT 1',
          [data.staff_id]
        );
      }

      console.log('Payment query result:', paymentResult);

      if (paymentResult.length === 0) {
        throw new Error('Failed to retrieve created payment record');
      }

      const payment = paymentResult[0] as SalaryPayment;
      console.log('Retrieved payment object:', payment);

      // Create a minimal payment object if the full object is problematic
      const safePayment: SalaryPayment = {
        id: payment.id || result.lastInsertRowId as number,
        staff_id: data.staff_id,
        staff_name: staff.full_name,
        employee_id: staff.employee_id,
        payment_date: payment.payment_date || new Date().toISOString(),
        salary_amount: baseSalary,
        payment_amount: data.payment_amount,
        payment_type: data.payment_type,
        payment_percentage: paymentPercentage,
        payment_month: data.payment_month,
        payment_year: parseInt(data.payment_month.split('-')[0]),
        notes: data.notes || '',
        payment_method: data.payment_method,
        reference_number: data.reference_number || '',
        paid_by: paidBy,
        created_at: payment.created_at || new Date().toISOString(),
        updated_at: payment.updated_at || new Date().toISOString()
      };

      // Ensure payment has an id before using it
      if (!safePayment.id) {
        throw new Error(`Created payment record is missing required id field. Payment object: ${JSON.stringify(payment)}`);
      }

      // CRITICAL FIX: Create ledger entry for salary payment so it appears in Daily Ledger
      try {
        console.log('🔄 Creating ledger entry for salary payment...');

        const paymentDate = data.payment_month ?
          new Date(data.payment_month + '-01').toISOString().split('T')[0] :
          new Date().toISOString().split('T')[0];

        await db.createDailyLedgerEntry({
          date: paymentDate,
          type: 'outgoing',
          category: 'Staff Salary',
          description: `Salary payment to ${staff.full_name}`,
          amount: data.payment_amount,
          customer_id: null, // Salary payments don't have customer_id
          customer_name: `Staff: ${staff.full_name}`,
          payment_method: data.payment_method,
          payment_channel_id: undefined, // To be enhanced when payment channels are added to salary system
          payment_channel_name: data.payment_method,
          notes: data.notes || `${data.payment_type} salary payment via ${data.payment_method}`,
          is_manual: false
        });

        console.log('✅ Ledger entry created for salary payment');
      } catch (ledgerEntryError) {
        console.error('❌ Failed to create ledger entry for salary payment:', ledgerEntryError);
        // Don't fail the whole payment - this is for Daily Ledger display only
      }

      // Log audit event (optional - don't fail payment if audit logging fails)
      try {
        await auditLogService.logEvent({
          user_id: 1, // System user for now
          user_name: paidBy,
          action: 'CREATE',
          entity_type: 'PAYMENT',
          entity_id: safePayment.id.toString(),
          description: `Salary payment recorded: ${data.payment_type} payment of ${data.payment_amount} for ${staff.full_name}`,
          new_values: safePayment
        });
      } catch (auditError) {
        console.warn('Failed to log audit event for payment:', auditError);
        // Continue anyway - payment was successful
      }

      return safePayment;
    } catch (error) {
      console.error('Error recording salary payment:', error);
      throw error;
    }
  }

  /**
   * Get column mapping for different schemas
   */
  private getColumnMapping(): any {
    const baseMapping = {
      id: 'id',
      staff_id: 'staff_id',
      staff_name: 'staff_name',
      payment_date: 'payment_date',
      payment_amount: this.salaryPaymentsSchema === 'management' ? 'total_amount' : 'payment_amount',
      payment_method: 'payment_method',
      notes: 'notes',
      created_at: 'created_at'
    };

    if (this.salaryPaymentsSchema === 'management') {
      return {
        ...baseMapping,
        employee_id: 'staff_name', // Use staff_name as fallback
        salary_amount: 'basic_salary',
        payment_type: "'full'", // Default value
        payment_percentage: '100',
        payment_month: 'salary_month',
        payment_year: "strftime('%Y', payment_date)",
        reference_number: 'payment_code',
        paid_by: "'system'"
      };
    } else if (this.salaryPaymentsSchema === 'service') {
      return {
        ...baseMapping,
        employee_id: 'employee_id',
        salary_amount: 'salary_amount',
        payment_type: 'payment_type',
        payment_percentage: 'payment_percentage',
        payment_month: 'payment_month',
        payment_year: 'payment_year',
        reference_number: 'reference_number',
        paid_by: 'paid_by'
      };
    } else {
      // Unified schema has all columns
      return {
        ...baseMapping,
        employee_id: 'employee_id',
        salary_amount: 'salary_amount',
        payment_type: 'payment_type',
        payment_percentage: 'payment_percentage',
        payment_month: 'payment_month',
        payment_year: 'payment_year',
        reference_number: 'reference_number',
        paid_by: 'paid_by'
      };
    }
  }

  /**
   * Get salary payments for a staff member
   */
  async getStaffPayments(staffId: number, limit: number = 50): Promise<SalaryPayment[]> {
    try {
      await this.initializeTables(); // Ensure schema compatibility

      const columns = this.getColumnMapping();

      const result = await db.executeRawQuery(`
        SELECT 
          ${columns.id} as id,
          ${columns.staff_id} as staff_id,
          ${columns.staff_name} as staff_name,
          ${columns.employee_id} as employee_id,
          ${columns.payment_date} as payment_date,
          ${columns.salary_amount} as salary_amount,
          ${columns.payment_amount} as payment_amount,
          ${columns.payment_type} as payment_type,
          ${columns.payment_percentage} as payment_percentage,
          ${columns.payment_month} as payment_month,
          ${columns.payment_year} as payment_year,
          ${columns.notes} as notes,
          ${columns.payment_method} as payment_method,
          ${columns.reference_number} as reference_number,
          ${columns.paid_by} as paid_by,
          ${columns.created_at} as created_at,
          ${columns.created_at} as updated_at
        FROM salary_payments 
        WHERE staff_id = ? 
        ORDER BY payment_date DESC 
        LIMIT ?
      `, [staffId, limit]);

      return result as SalaryPayment[];
    } catch (error) {
      console.error('Error getting staff payments:', error);
      throw error;
    }
  }

  /**
   * Get all salary payments with filtering
   */
  async getAllPayments(options: {
    month?: string;
    year?: number;
    staff_id?: number;
    payment_type?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<SalaryPayment[]> {
    try {
      await this.initializeTables(); // Ensure schema compatibility

      const columns = this.getColumnMapping();

      let query = `
        SELECT 
          ${columns.id} as id,
          ${columns.staff_id} as staff_id,
          ${columns.staff_name} as staff_name,
          ${columns.employee_id} as employee_id,
          ${columns.payment_date} as payment_date,
          ${columns.salary_amount} as salary_amount,
          ${columns.payment_amount} as payment_amount,
          ${columns.payment_type} as payment_type,
          ${columns.payment_percentage} as payment_percentage,
          ${columns.payment_month} as payment_month,
          ${columns.payment_year} as payment_year,
          ${columns.notes} as notes,
          ${columns.payment_method} as payment_method,
          ${columns.reference_number} as reference_number,
          ${columns.paid_by} as paid_by,
          ${columns.created_at} as created_at,
          ${columns.created_at} as updated_at
        FROM salary_payments WHERE 1=1
      `;
      const params: any[] = [];

      if (options.month) {
        query += ` AND ${columns.payment_month} = ?`;
        params.push(options.month);
      }

      if (options.year) {
        query += ` AND ${columns.payment_year} = ?`;
        params.push(options.year);
      }

      if (options.staff_id) {
        query += ' AND staff_id = ?';
        params.push(options.staff_id);
      }

      if (options.payment_type && this.salaryPaymentsSchema !== 'management') {
        query += ` AND ${columns.payment_type} = ?`;
        params.push(options.payment_type);
      }

      query += ' ORDER BY payment_date DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);

        if (options.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const result = await db.executeRawQuery(query, params);
      return result as SalaryPayment[];
    } catch (error) {
      console.error('Error getting all payments:', error);
      throw error;
    }
  }

  /**
   * Get salary statistics
   */
  async getSalaryStatistics(): Promise<SalaryStatistics> {
    try {
      await this.initializeTables(); // Ensure schema compatibility

      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const currentYear = new Date().getFullYear();
      const columns = this.getColumnMapping();

      // Total paid this month
      const monthResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(${columns.payment_amount}), 0) as total
        FROM salary_payments 
        WHERE ${columns.payment_month} = ?
      `, [currentMonth]);

      // Total paid this year
      const yearResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(${columns.payment_amount}), 0) as total
        FROM salary_payments 
        WHERE ${columns.payment_year} = ?
      `, [currentYear]);

      // Get the appropriate condition for active staff
      const activeCondition = await this.getActiveStaffCondition();

      // Staff payment summary - Use dynamic condition for active staff
      const summaryResult = await db.executeRawQuery(`
        SELECT 
          s.id as staff_id,
          s.full_name as staff_name,
          s.employee_id,
          s.salary as current_salary,
          COALESCE(SUM(CASE WHEN ${columns.payment_month} = ? THEN ${columns.payment_amount} ELSE 0 END), 0) as total_paid_this_month,
          MAX(sp.payment_date) as last_payment_date,
          CASE 
            WHEN COALESCE(SUM(CASE WHEN ${columns.payment_month} = ? THEN ${columns.payment_amount} ELSE 0 END), 0) >= s.salary THEN 'paid'
            WHEN COALESCE(SUM(CASE WHEN ${columns.payment_month} = ? THEN ${columns.payment_amount} ELSE 0 END), 0) > 0 THEN 'partial'
            ELSE 'pending'
          END as payment_status
        FROM staff s
        LEFT JOIN salary_payments sp ON s.id = sp.staff_id
        WHERE ${activeCondition}
        GROUP BY s.id, s.full_name, s.employee_id, s.salary
        ORDER BY s.full_name
      `, [currentMonth, currentMonth, currentMonth]);

      const totalPaidThisMonth = (monthResult[0] as any).total;
      const totalPaidThisYear = (yearResult[0] as any).total;
      const staffSummary = summaryResult as any[];

      const pendingPayments = staffSummary.filter(s => s.payment_status === 'pending').length;
      const averageMonthlyPayment = staffSummary.length > 0 ? totalPaidThisMonth / staffSummary.length : 0;

      return {
        total_paid_this_month: totalPaidThisMonth,
        total_paid_this_year: totalPaidThisYear,
        pending_payments: pendingPayments,
        average_monthly_payment: averageMonthlyPayment,
        staff_payment_summary: staffSummary
      };
    } catch (error) {
      console.error('Error getting salary statistics:', error);
      throw error;
    }
  }

  /**
   * Record salary adjustment (for salary changes)
   */
  async recordSalaryAdjustment(
    staffId: number,
    oldSalary: number,
    newSalary: number,
    reason: string,
    adjustmentType: 'increase' | 'decrease' | 'promotion' | 'demotion',
    approvedBy: string,
    effectiveDate: string,
    notes?: string
  ): Promise<void> {
    try {
      // Get staff information
      const staffResult = await db.executeRawQuery(
        'SELECT full_name, employee_id FROM staff WHERE id = ?',
        [staffId]
      );

      if (staffResult.length === 0) {
        throw new Error('Staff member not found');
      }

      const staff = staffResult[0] as any;

      // Insert adjustment record
      await db.executeCommand(`
        INSERT INTO salary_adjustments (
          staff_id, staff_name, employee_id, old_salary, new_salary,
          adjustment_reason, adjustment_type, approved_by, effective_date, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        staffId,
        staff.full_name,
        staff.employee_id,
        oldSalary,
        newSalary,
        reason,
        adjustmentType,
        approvedBy,
        effectiveDate,
        notes || ''
      ]);

      // Log audit event
      await auditLogService.logEvent({
        user_id: 1,
        user_name: approvedBy,
        action: 'UPDATE',
        entity_type: 'STAFF',
        entity_id: staffId.toString(),
        description: `Salary ${adjustmentType}: ${oldSalary} → ${newSalary} (${reason})`,
        old_values: { salary: oldSalary },
        new_values: { salary: newSalary, reason, effective_date: effectiveDate }
      });
    } catch (error) {
      console.error('Error recording salary adjustment:', error);
      throw error;
    }
  }

  /**
   * Get salary adjustments for a staff member
   */
  async getStaffSalaryAdjustments(staffId: number): Promise<any[]> {
    try {
      const result = await db.executeRawQuery(`
        SELECT * FROM salary_adjustments 
        WHERE staff_id = ? 
        ORDER BY adjustment_date DESC
      `, [staffId]);

      return result as any[];
    } catch (error) {
      console.error('Error getting salary adjustments:', error);
      throw error;
    }
  }
}

export const salaryHistoryService = SalaryHistoryService.getInstance();
