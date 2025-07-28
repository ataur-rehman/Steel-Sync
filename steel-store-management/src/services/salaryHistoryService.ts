/**
 * Salary History Service
 * Track all salary payments with full/partial payment support
 * Production-level with proper indexing and audit trails
 */

import { db } from './database';
import { auditLogService } from './auditLogService';

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

  public static getInstance(): SalaryHistoryService {
    if (!SalaryHistoryService.instance) {
      SalaryHistoryService.instance = new SalaryHistoryService();
    }
    return SalaryHistoryService.instance;
  }

  /**
   * Initialize salary history tables
   */
  async initializeTables(): Promise<void> {
    try {
      // Create salary_payments table
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS salary_payments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          staff_id INTEGER NOT NULL,
          staff_name TEXT NOT NULL,
          employee_id TEXT NOT NULL,
          payment_date TEXT NOT NULL DEFAULT (datetime('now', 'localtime')),
          salary_amount REAL NOT NULL,
          payment_amount REAL NOT NULL,
          payment_type TEXT NOT NULL CHECK (payment_type IN ('full', 'partial', 'advance', 'bonus', 'deduction')),
          payment_percentage REAL NOT NULL,
          payment_month TEXT NOT NULL,
          payment_year INTEGER NOT NULL,
          notes TEXT,
          payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'cheque')),
          reference_number TEXT,
          paid_by TEXT NOT NULL,
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
      
      // Get staff information
      const staffResult = await db.executeRawQuery(
        'SELECT id, full_name, employee_id, salary FROM staff WHERE id = ?',
        [data.staff_id]
      );

      if (staffResult.length === 0) {
        throw new Error(`Staff member not found with ID: ${data.staff_id}`);
      }

      const staff = staffResult[0] as any;
      const baseSalary = staff.salary || 0;
      const paymentPercentage = baseSalary > 0 ? (data.payment_amount / baseSalary) * 100 : 0;

      // Insert payment record
      const result = await db.executeCommand(`
        INSERT INTO salary_payments (
          staff_id, staff_name, employee_id, payment_date, salary_amount,
          payment_amount, payment_type, payment_percentage, payment_month,
          payment_year, notes, payment_method, reference_number, paid_by
        ) VALUES (?, ?, ?, datetime('now', 'localtime'), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
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
        paidBy
      ]);

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
   * Get salary payments for a staff member
   */
  async getStaffPayments(staffId: number, limit: number = 50): Promise<SalaryPayment[]> {
    try {
      const result = await db.executeRawQuery(`
        SELECT * FROM salary_payments 
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
      let query = 'SELECT * FROM salary_payments WHERE 1=1';
      const params: any[] = [];

      if (options.month) {
        query += ' AND payment_month = ?';
        params.push(options.month);
      }

      if (options.year) {
        query += ' AND payment_year = ?';
        params.push(options.year);
      }

      if (options.staff_id) {
        query += ' AND staff_id = ?';
        params.push(options.staff_id);
      }

      if (options.payment_type) {
        query += ' AND payment_type = ?';
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
      const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
      const currentYear = new Date().getFullYear();

      // Total paid this month
      const monthResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(payment_amount), 0) as total
        FROM salary_payments 
        WHERE payment_month = ?
      `, [currentMonth]);

      // Total paid this year
      const yearResult = await db.executeRawQuery(`
        SELECT COALESCE(SUM(payment_amount), 0) as total
        FROM salary_payments 
        WHERE payment_year = ?
      `, [currentYear]);

      // Staff payment summary
      const summaryResult = await db.executeRawQuery(`
        SELECT 
          s.id as staff_id,
          s.full_name as staff_name,
          s.employee_id,
          s.salary as current_salary,
          COALESCE(SUM(CASE WHEN sp.payment_month = ? THEN sp.payment_amount ELSE 0 END), 0) as total_paid_this_month,
          MAX(sp.payment_date) as last_payment_date,
          CASE 
            WHEN COALESCE(SUM(CASE WHEN sp.payment_month = ? THEN sp.payment_amount ELSE 0 END), 0) >= s.salary THEN 'paid'
            WHEN COALESCE(SUM(CASE WHEN sp.payment_month = ? THEN sp.payment_amount ELSE 0 END), 0) > 0 THEN 'partial'
            ELSE 'pending'
          END as payment_status
        FROM staff s
        LEFT JOIN salary_payments sp ON s.id = sp.staff_id
        WHERE s.is_active = 1
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
