/**
 * Refactored Staff Management Service
 * Simplified for Pakistani steel store operations with audit logging
 * - Removed department field completely
 * - Auto-generated employee IDs
 * - Simplified form fields for Admin/Manager roles
 * - Comprehensive audit logging
 */

import { db } from './database';
import { eventBus, BUSINESS_EVENTS } from '../utils/eventBus';
import { auditLogService } from './auditLogService';

// PERFORMANCE: Track initialization to prevent repeated calls
let staffTablesInitialized = false;

export interface Staff {
  id: number;
  full_name: string;
  phone?: string;
  role: 'admin' | 'manager' | 'worker';
  hire_date: string;
  salary?: number;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
  employee_id: string; // Auto-generated, required
  staff_code?: string; // Unique code
  address?: string;
  cnic?: string;
  emergency_contact?: string;
}

export interface StaffFormData {
  full_name: string;
  phone?: string;
  role: Staff['role'];
  hire_date: string;
  salary?: number;
  is_active: boolean;
  address?: string;
  cnic?: string;
  emergency_contact?: string;
}

export interface StaffSession {
  id: number;
  staff_id: number;
  token: string;
  created_at: string;
  expires_at: string;
  is_active: boolean;
  ip_address?: string;
  user_agent?: string;
}

export interface StaffActivity {
  id: number;
  staff_id: number;
  staff_name: string;
  activity_type: 'login' | 'logout' | 'action' | 'error';
  description: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface StaffStatistics {
  total: number;
  active: number;
  inactive: number;
  by_role: Record<string, number>;
  recent_activities: number;
  online_now: number;
}

// Database interface only

class StaffService {
  private static instance: StaffService;

  public static getInstance(): StaffService {
    if (!StaffService.instance) {
      StaffService.instance = new StaffService();
    }
    return StaffService.instance;
  }

  /**
   * Initialize staff tables with audit logging support
   */
  async initializeTables(): Promise<void> {
    // PERFORMANCE: Skip if already initialized
    if (staffTablesInitialized) {
      console.log('✅ [STAFF] Tables already initialized, skipping...');
      return;
    }

    try {
      console.log('🔄 [STAFF] Initializing staff tables...');
      
      // Initialize audit logging first
      await auditLogService.initializeTables();

      // Migration: Recreate staff table with simplified schema (no authentication fields)
      // Check if we need to migrate from old schema
      const tableInfo = await db.executeCommand(`PRAGMA table_info(staff);`);
      const hasUsernameColumn = tableInfo.some((col: any) => col.name === 'username');
      
      if (hasUsernameColumn) {
        console.log('🔄 Migrating staff table to remove authentication fields...');
        
        // Create new staff table with correct schema
        await db.executeCommand(`
          CREATE TABLE IF NOT EXISTS staff_new (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            employee_id TEXT UNIQUE NOT NULL,
            phone TEXT,
            role TEXT NOT NULL),
            hire_date TEXT NOT NULL,
            salary REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            address TEXT,
            cnic TEXT,
            emergency_contact TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
        
        // Copy data from old table (only compatible fields)
        await db.executeCommand(`
          INSERT INTO staff_new (
            id, full_name, employee_id, phone, role, hire_date, 
            salary, is_active, address, cnic, emergency_contact,
            created_by, created_at, updated_at
          )
          SELECT 
            id, full_name, employee_id, phone, role, hire_date,
            salary, is_active, address, cnic, emergency_contact,
            COALESCE(created_by, 'system') as created_by,
            COALESCE(created_at, datetime('now')) as created_at,
            COALESCE(updated_at, datetime('now')) as updated_at
          FROM staff_management;
        `);
        
        // Drop old table and rename new one
        await db.executeCommand(`DROP TABLE staff;`);
        await db.executeCommand(`ALTER TABLE staff_new RENAME TO staff;`);
        
        console.log('✅ Staff table migration completed');
      } else {
        // Create table normally if it doesn't exist or is already correct
        await db.executeCommand(`
          CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            employee_id TEXT UNIQUE NOT NULL,
            phone TEXT,
            role TEXT NOT NULL),
            hire_date TEXT NOT NULL,
            salary REAL DEFAULT 0,
            is_active BOOLEAN DEFAULT 1,
            address TEXT,
            cnic TEXT,
            emergency_contact TEXT,
            created_by TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
          );
        `);
      }

      // Simplified staff management - no authentication tables needed

      // Create indexes for performance
      await db.executeCommand(`CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(employee_id);`);

      console.log('✅ Staff tables initialized successfully (without department field)');
      
      // Mark as initialized to prevent repeated calls
      staffTablesInitialized = true;
      console.log('✅ [STAFF] Staff service initialization completed');
    } catch (error) {
      console.error('❌ Error initializing staff tables:', error);
      throw error;
    }
  }

  /**
   * Generate unique employee ID
   */
  async generateEmployeeId(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substr(2, 4).toUpperCase();
      const employeeId = `EMP-${timestamp.slice(-6)}-${random}`;
      
      // Check if it already exists
      const existing = await db.executeRawQuery(
        'SELECT id FROM staff_management WHERE employee_id = ?',
        [employeeId]
      );
      
      if (existing.length === 0) {
        return employeeId;
      }
      
      attempts++;
      // Add small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    throw new Error('Failed to generate unique employee ID after multiple attempts');
  }

  /**
   * Generate unique staff code
   */
  async generateStaffCode(): Promise<string> {
    let attempts = 0;
    const maxAttempts = 10;
    
    while (attempts < maxAttempts) {
      const timestamp = Date.now().toString();
      const random = Math.random().toString(36).substr(2, 3).toUpperCase();
      const staffCode = `STF-${timestamp.slice(-4)}-${random}`;
      
      // Check if it already exists
      const existing = await db.executeRawQuery(
        'SELECT id FROM staff_management WHERE staff_code = ?',
        [staffCode]
      );
      
      if (existing.length === 0) {
        return staffCode;
      }
      
      attempts++;
      // Add small delay to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    throw new Error('Failed to generate unique staff code after multiple attempts');
  }

  /**
   * Create new staff member with audit logging - simplified without authentication
   */
  async createStaff(staffData: Partial<StaffFormData> & { created_by: string; full_name: string; role: Staff['role'] }): Promise<Staff> {
    try {
      // Validate only essential fields
      if (!staffData.full_name || !staffData.role) {
        throw new Error('Missing required fields: full_name and role are required');
      }

      // Auto-generate employee ID and staff code
      const employeeId = await this.generateEmployeeId();
      const staffCode = await this.generateStaffCode();

      console.log(`Creating staff member: ${staffData.full_name} with role: ${staffData.role}`);

      // Create staff record - use staff_management table consistently with all required columns
      await db.executeCommand(
        `INSERT INTO staff_management (
          full_name, employee_id, staff_code, phone, role,
          hire_date, salary, is_active, address, cnic, emergency_contact,
          created_by, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
        [
          staffData.full_name,
          employeeId,
          staffCode,
          staffData.phone || null,
          staffData.role,
          staffData.hire_date || new Date().toISOString().split('T')[0],
          staffData.salary || 0,
          staffData.is_active ? 1 : 0,
          staffData.address || null,
          staffData.cnic || null,
          staffData.emergency_contact || null,
          staffData.created_by
        ]
      );

      // Get the created staff by employee ID
      const newStaff = await this.getStaffByEmployeeId(employeeId);
      if (!newStaff) {
        throw new Error('Failed to create staff member');
      }

      // Log audit event
      await auditLogService.logEvent({
        user_id: 1, // TODO: Get from current session
        user_name: staffData.created_by,
        action: 'CREATE',
        entity_type: 'STAFF',
        entity_id: newStaff.id,
        new_values: {
          full_name: staffData.full_name,
          role: staffData.role,
          employee_id: employeeId
        },
        description: `Created new staff member: ${staffData.full_name} (${staffData.role})`
      });

      // Emit real-time event
      eventBus.emit(BUSINESS_EVENTS.STAFF_CREATED, newStaff);

      console.log(`✅ Staff member created: ${newStaff.full_name} (${newStaff.employee_id})`);
      return newStaff;
    } catch (error) {
      console.error('❌ Error creating staff:', error);
      throw error;
    }
  }

  /**
   * Update staff member with audit logging
   */
  async updateStaff(id: number, staffData: Partial<StaffFormData> & { updated_by: string }): Promise<Staff> {
    try {
      const existingStaff = await this.getStaffById(id);
      if (!existingStaff) {
        throw new Error('Staff member not found');
      }

      // Store old values for audit
      const oldValues = { ...existingStaff };

      // Build update query dynamically - only essential fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];

      if (staffData.full_name !== undefined) {
        updateFields.push('full_name = ?');
        updateValues.push(staffData.full_name);
      }

      if (staffData.phone !== undefined) {
        updateFields.push('phone = ?');
        updateValues.push(staffData.phone);
      }

      if (staffData.role !== undefined) {
        updateFields.push('role = ?');
        updateValues.push(staffData.role);
      }

      if (staffData.hire_date !== undefined) {
        updateFields.push('hire_date = ?');
        updateValues.push(staffData.hire_date);
      }

      if (staffData.salary !== undefined) {
        updateFields.push('salary = ?');
        updateValues.push(staffData.salary);
      }

      if (staffData.is_active !== undefined) {
        updateFields.push('is_active = ?');
        updateValues.push(staffData.is_active ? 1 : 0);
      }

      if (staffData.address !== undefined) {
        updateFields.push('address = ?');
        updateValues.push(staffData.address);
      }

      if (staffData.cnic !== undefined) {
        updateFields.push('cnic = ?');
        updateValues.push(staffData.cnic);
      }

      if (staffData.emergency_contact !== undefined) {
        updateFields.push('emergency_contact = ?');
        updateValues.push(staffData.emergency_contact);
      }

      if (updateFields.length === 0) {
        throw new Error('No fields to update');
      }

      // Add updated_at timestamp
      updateFields.push('updated_at = datetime(\'now\')');
      updateValues.push(id);

      // Execute update
      await db.executeCommand(
        `UPDATE staff_management SET ${updateFields.join(', ')} WHERE id = ?`,
        updateValues
      );

      // Get updated staff
      const updatedStaff = await this.getStaffById(id);
      if (!updatedStaff) {
        throw new Error('Failed to retrieve updated staff');
      }

      // Log audit event
      await auditLogService.logEvent({
        user_id: 1, // TODO: Get from current session
        user_name: staffData.updated_by,
        action: 'UPDATE',
        entity_type: 'STAFF',
        entity_id: id,
        old_values: oldValues,
        new_values: updatedStaff,
        description: `Updated staff member: ${updatedStaff.full_name}`
      });

      // Emit real-time event
      eventBus.emit(BUSINESS_EVENTS.STAFF_UPDATED, updatedStaff);

      console.log(`✅ Staff member updated: ${updatedStaff.full_name}`);
      return updatedStaff;
    } catch (error) {
      console.error('❌ Error updating staff:', error);
      throw error;
    }
  }

  /**
   * Update staff permissions with audit logging
   */
  async updateStaffPermissions(id: number, permissions: Record<string, string>, updatedBy: string): Promise<void> {
    try {
      const existingStaff = await this.getStaffById(id);
      if (!existingStaff) {
        throw new Error('Staff member not found');
      }

      // Convert permissions object to JSON string
      const permissionsJson = JSON.stringify(permissions);

      // Check if staff table has permissions column, if not add it
      try {
        const tableInfo = await db.executeCommand(`PRAGMA table_info(staff);`);
        const hasPermissionsColumn = tableInfo.some((col: any) => col.name === 'permissions');
        
        if (!hasPermissionsColumn) {
          console.log('Adding permissions column to staff table...');
          await db.executeCommand(`ALTER TABLE staff ADD COLUMN permissions TEXT DEFAULT '{}'`);
        }
      } catch (error) {
        console.warn('Could not check/add permissions column:', error);
      }

      // Update staff table with permissions
      await db.executeCommand(
        `UPDATE staff SET permissions = ?, updated_at = datetime('now') WHERE id = ?`,
        [permissionsJson, id]
      );

      // Log the permission change
      await auditLogService.logEvent({
        user_id: parseInt(updatedBy) || 1,
        user_name: updatedBy,
        action: 'UPDATE',
        entity_type: 'STAFF',
        entity_id: id.toString(),
        old_values: { permissions: 'previous_permissions' },
        new_values: { permissions: permissions },
        description: `Updated permissions for staff member: ${existingStaff.full_name}`
      });

      // Emit real-time event
      eventBus.emit(BUSINESS_EVENTS.STAFF_UPDATED, { 
        ...existingStaff, 
        permissions: permissions,
        updated_at: new Date().toISOString()
      });

      console.log(`✅ Permissions updated for staff member: ${existingStaff.full_name}`);
    } catch (error) {
      console.error('❌ Error updating staff permissions:', error);
      throw error;
    }
  }

  /**
   * Get staff permissions from staff table
   */
  async getStaffPermissions(id: number): Promise<Record<string, string>> {
    try {
      // First check if permissions column exists
      const tableInfo = await db.executeCommand(`PRAGMA table_info(staff);`);
      const hasPermissionsColumn = tableInfo.some((col: any) => col.name === 'permissions');
      
      if (!hasPermissionsColumn) {
        // If no permissions column, return empty permissions
        return {};
      }

      const result = await db.executeCommand(
        `SELECT permissions FROM staff_management WHERE id = ?`,
        [id]
      );

      if (result.length > 0 && result[0].permissions) {
        try {
          return JSON.parse(result[0].permissions);
        } catch (parseError) {
          console.warn('Could not parse permissions JSON:', parseError);
          return {};
        }
      }

      // Return empty permissions if not found
      return {};
    } catch (error) {
      console.warn('Could not retrieve permissions from staff table:', error);
      return {};
    }
  }

  /**
   * Delete staff member with audit logging
   */
  async deleteStaff(id: number, deletedBy: string): Promise<void> {
    try {
      const existingStaff = await this.getStaffById(id);
      if (!existingStaff) {
        throw new Error('Staff member not found');
      }

      // Don't allow deleting the last admin
      if (existingStaff.role === 'admin') {
        const adminCount = await this.getStaffCount({ role: 'admin' });
        if (adminCount <= 1) {
          throw new Error('Cannot delete the last admin user');
        }
      }

      await db.executeCommand('DELETE FROM staff_management WHERE id = ?', [id]);

      // Log audit event
      await auditLogService.logEvent({
        user_id: 1, // TODO: Get from current session
        user_name: deletedBy,
        action: 'DELETE',
        entity_type: 'STAFF',
        entity_id: id,
        old_values: existingStaff,
        description: `Deleted staff member: ${existingStaff.full_name}`
      });

      // Emit real-time event
      eventBus.emit(BUSINESS_EVENTS.STAFF_DELETED, { id, name: existingStaff.full_name });

      console.log(`✅ Staff member deleted: ${existingStaff.full_name}`);
    } catch (error) {
      console.error('❌ Error deleting staff:', error);
      throw error;
    }
  }

  /**
   * Get staff by ID
   */
  async getStaffById(id: number): Promise<Staff | null> {
    try {
      const rows = await db.executeRawQuery('SELECT * FROM staff_management WHERE id = ?', [id]);
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        full_name: row.full_name,
        phone: row.phone,
        role: row.role,
        hire_date: row.hire_date,
        salary: row.salary,
        is_active: Boolean(row.is_active),
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        employee_id: row.employee_id,
        address: row.address,
        cnic: row.cnic,
        emergency_contact: row.emergency_contact
      };
    } catch (error) {
      console.error('❌ Error fetching staff by ID:', error);
      throw error;
    }
  }

  /**
   * Get staff by employee ID
   */
  async getStaffByEmployeeId(employeeId: string): Promise<Staff | null> {
    try {
      const rows = await db.executeRawQuery('SELECT * FROM staff_management WHERE employee_id = ?', [employeeId]);
      if (rows.length === 0) return null;

      const row = rows[0];
      return {
        id: row.id,
        full_name: row.full_name,
        phone: row.phone,
        role: row.role,
        hire_date: row.hire_date,
        salary: row.salary,
        is_active: Boolean(row.is_active),
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        employee_id: row.employee_id,
        address: row.address,
        cnic: row.cnic,
        emergency_contact: row.emergency_contact
      };
    } catch (error) {
      console.error('❌ Error fetching staff by employee ID:', error);
      throw error;
    }
  }

  /**
   * Get all staff with filters
   */
  async getAllStaff(filters: {
    role?: string;
    search?: string;
    active?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<Staff[]> {
    try {
      let query = 'SELECT * FROM staff_management WHERE 1=1';
      const params: any[] = [];

      if (filters.role) {
        query += ' AND role = ?';
        params.push(filters.role);
      }

      if (filters.search) {
        query += ' AND (full_name LIKE ? OR employee_id LIKE ?)';
        const searchPattern = `%${filters.search}%`;
        params.push(searchPattern, searchPattern);
      }

      if (filters.active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.active ? 1 : 0);
      }

      query += ' ORDER BY created_at DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
        
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const rows = await db.executeRawQuery(query, params);
      
      return rows.map(row => ({
        id: row.id,
        full_name: row.full_name,
        phone: row.phone,
        role: row.role,
        hire_date: row.hire_date,
        salary: row.salary,
        is_active: Boolean(row.is_active),
        created_by: row.created_by,
        created_at: row.created_at,
        updated_at: row.updated_at,
        employee_id: row.employee_id,
        address: row.address,
        cnic: row.cnic,
        emergency_contact: row.emergency_contact
      }));
    } catch (error) {
      console.error('❌ Error fetching all staff:', error);
      throw error;
    }
  }

  /**
   * Get staff statistics
   */
  async getStaffStatistics(): Promise<StaffStatistics> {
    try {
      // Initialize default values in case tables don't exist
      let totalCount = 0;
      let activeCount = 0;
      let inactiveCount = 0;
      let roleStats: any[] = [];
      let recentActivitiesCount = 0;
      let onlineCount = 0;

      try {
        const [totalResult] = await db.executeRawQuery('SELECT COUNT(*) as count FROM staff_management');
        totalCount = totalResult.count;
      } catch (error: any) {
        if (error.message?.includes('no such table: staff_management')) {
          console.warn('Staff management table not found, returning default values');
        } else {
          throw error;
        }
      }

      try {
        const [activeResult] = await db.executeRawQuery('SELECT COUNT(*) as count FROM staff_management WHERE is_active = 1');
        activeCount = activeResult.count;
      } catch (error: any) {
        if (!error.message?.includes('no such table')) {
          throw error;
        }
      }

      try {
        const [inactiveResult] = await db.executeRawQuery('SELECT COUNT(*) as count FROM staff_management WHERE is_active = 0');
        inactiveCount = inactiveResult.count;
      } catch (error: any) {
        if (!error.message?.includes('no such table')) {
          throw error;
        }
      }
      
      try {
        roleStats = await db.executeRawQuery(`
          SELECT role, COUNT(*) as count 
          FROM staff_management 
          GROUP BY role
        `);
      } catch (error: any) {
        if (!error.message?.includes('no such table')) {
          throw error;
        }
      }
      
      try {
        const [recentActivitiesResult] = await db.executeRawQuery(`
          SELECT COUNT(*) as count 
          FROM staff_activities 
          WHERE created_at >= date('now', '-7 days')
        `);
        recentActivitiesCount = recentActivitiesResult.count;
      } catch (error: any) {
        if (!error.message?.includes('no such table')) {
          throw error;
        }
      }
      
      try {
        const [onlineResult] = await db.executeRawQuery(`
          SELECT COUNT(DISTINCT staff_id) as count 
          FROM staff_sessions 
          WHERE is_active = 1 AND expires_at > datetime('now')
        `);
        onlineCount = onlineResult.count;
      } catch (error: any) {
        if (!error.message?.includes('no such table')) {
          throw error;
        }
      }

      const by_role: Record<string, number> = {};
      roleStats.forEach((stat: any) => {
        by_role[stat.role] = stat.count;
      });

      return {
        total: totalCount,
        active: activeCount,
        inactive: inactiveCount,
        by_role,
        recent_activities: recentActivitiesCount,
        online_now: onlineCount
      };
    } catch (error) {
      console.error('❌ Error fetching staff statistics:', error);
      throw error;
    }
  }

  /**
   * Get staff count with filters
   */
  async getStaffCount(filters: { role?: string; active?: boolean } = {}): Promise<number> {
    try {
      let query = 'SELECT COUNT(*) as count FROM staff_management WHERE 1=1';
      const params: any[] = [];

      if (filters.role) {
        query += ' AND role = ?';
        params.push(filters.role);
      }

      if (filters.active !== undefined) {
        query += ' AND is_active = ?';
        params.push(filters.active ? 1 : 0);
      }

      const [result] = await db.executeRawQuery(query, params);
      return result.count;
    } catch (error) {
      console.error('❌ Error getting staff count:', error);
      return 0;
    }
  }

  /**
   * Toggle staff status with audit logging
   */
  async toggleStaffStatus(id: number, updatedBy: string): Promise<boolean> {
    try {
      const staff = await this.getStaffById(id);
      if (!staff) {
        throw new Error('Staff member not found');
      }

      const newStatus = !staff.is_active;
      
      await db.executeCommand(
        'UPDATE staff SET is_active = ?, updated_at = datetime(\'now\') WHERE id = ?',
        [newStatus ? 1 : 0, id]
      );

      // Log audit event
      await auditLogService.logEvent({
        user_id: 1, // TODO: Get from current session
        user_name: updatedBy,
        action: 'STATUS_CHANGE',
        entity_type: 'STAFF',
        entity_id: id,
        old_values: { is_active: staff.is_active },
        new_values: { is_active: newStatus },
        description: `${newStatus ? 'Activated' : 'Deactivated'} staff member: ${staff.full_name}`
      });

      // Emit real-time event
      eventBus.emit(BUSINESS_EVENTS.STAFF_STATUS_CHANGED, { id, status: newStatus });

      console.log(`✅ Staff status updated: ${staff.full_name} is now ${newStatus ? 'active' : 'inactive'}`);
      return newStatus;
    } catch (error) {
      console.error('❌ Error toggling staff status:', error);
      throw error;
    }
  }

  // Authentication removed - staff management only for basic information
}

export const staffService = StaffService.getInstance();
