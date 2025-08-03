/**
 * Audit Logging Service
 * Comprehensive audit trail for all system operations
 */

import { db } from './database';

// PERFORMANCE: Track initialization to prevent repeated calls
let auditTablesInitialized = false;

export interface AuditLog {
  id: number;
  user_id: number;
  user_name: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'STATUS_CHANGE';
  entity_type: 'STAFF' | 'CUSTOMER' | 'PRODUCT' | 'INVOICE' | 'PAYMENT' | 'SYSTEM';
  entity_id: number | string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  table_name: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
  session_id?: string;
}

export interface AuditLogFormData {
  user_id: number;
  user_name: string;
  action: AuditLog['action'];
  entity_type: AuditLog['entity_type'];
  entity_id: number | string;
  old_values?: Record<string, any>;
  new_values?: Record<string, any>;
  table_name?: string;
  description: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
}

class AuditLogService {
  private static instance: AuditLogService;

  public static getInstance(): AuditLogService {
    if (!AuditLogService.instance) {
      AuditLogService.instance = new AuditLogService();
    }
    return AuditLogService.instance;
  }

  /**
   * Initialize audit log tables
   */
  async initializeTables(): Promise<void> {
    // PERFORMANCE: Skip if already initialized
    if (auditTablesInitialized) {
      console.log('✅ [AUDIT] Tables already initialized, skipping...');
      return;
    }

    try {
      console.log('🔄 [AUDIT] Initializing audit log tables...');
      
      await db.executeCommand(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          user_name TEXT NOT NULL,
          action TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'STATUS_CHANGE')),
          entity_type TEXT NOT NULL CHECK (entity_type IN ('STAFF', 'CUSTOMER', 'PRODUCT', 'INVOICE', 'PAYMENT', 'SYSTEM')),
          entity_id TEXT NOT NULL,
          old_values TEXT,
          new_values TEXT,
          description TEXT NOT NULL,
          ip_address TEXT,
          user_agent TEXT,
          timestamp TEXT NOT NULL DEFAULT (datetime('now')),
          session_id TEXT,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );
      `);

      // Create indexes for performance
      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_audit_user_id ON audit_logs(user_id);
      `);

      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
      `);

      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp);
      `);

      await db.executeCommand(`
        CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
      `);

      console.log('✅ Audit log tables initialized successfully');
      
      // Mark as initialized to prevent repeated calls
      auditTablesInitialized = true;
      console.log('✅ [AUDIT] Audit service initialization completed');
    } catch (error) {
      console.error('❌ Error initializing audit log tables:', error);
      throw error;
    }
  }

  /**
   * Log an audit event
   */
  async logEvent(data: AuditLogFormData): Promise<void> {
    try {
      const oldValuesJson = data.old_values ? JSON.stringify(data.old_values) : null;
      const newValuesJson = data.new_values ? JSON.stringify(data.new_values) : null;

      // Defensive: Ensure required fields for NOT NULL constraints
      const action = data.action || 'CREATE';
      const entity_type = data.entity_type || 'SYSTEM';
      const entity_id = data.entity_id != null ? String(data.entity_id) : '0';
      const description = data.description || '';
      const user_id = data.user_id != null ? data.user_id : 0;
      const user_name = data.user_name || 'system';
      const table_name = data.table_name || entity_type || 'unknown';

      await db.executeCommand(
        `INSERT INTO audit_logs (
          user_id, user_name, action, entity_type, entity_id,
          old_values, new_values, table_name, description, ip_address, user_agent,
          timestamp, session_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
        [
          user_id,
          user_name,
          action,
          entity_type,
          entity_id,
          oldValuesJson,
          newValuesJson,
          table_name,
          description,
          data.ip_address || null,
          data.user_agent || null,
          data.session_id || null
        ]
      );

      console.log(`📝 Audit logged: ${action} on ${entity_type} by ${user_name}`);
    } catch (error) {
      console.error('❌ Error logging audit event:', error);
      // Don't throw error to prevent breaking main operations
    }
  }

  /**
   * Get all audit logs with search and pagination
   */
  async getAllLogs(options: {
    limit?: number;
    offset?: number;
    search?: string;
    action?: string;
    entity_type?: string;
    user_name?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<AuditLog[]> {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];

      if (options.search) {
        query += ' AND (user_name LIKE ? OR description LIKE ?)';
        const searchPattern = `%${options.search}%`;
        params.push(searchPattern, searchPattern);
      }

      if (options.action) {
        query += ' AND action = ?';
        params.push(options.action);
      }

      if (options.entity_type) {
        query += ' AND entity_type = ?';
        params.push(options.entity_type);
      }

      if (options.user_name) {
        query += ' AND user_name = ?';
        params.push(options.user_name);
      }

      if (options.date_from) {
        query += ' AND timestamp >= ?';
        params.push(options.date_from);
      }

      if (options.date_to) {
        query += ' AND timestamp <= ?';
        params.push(options.date_to);
      }

      query += ' ORDER BY timestamp DESC';

      if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);

        if (options.offset) {
          query += ' OFFSET ?';
          params.push(options.offset);
        }
      }

      const rows = await db.executeRawQuery(query, params);

      return rows.map(row => ({
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        old_values: row.old_values ? JSON.parse(row.old_values) : undefined,
        new_values: row.new_values ? JSON.parse(row.new_values) : undefined,
        table_name: row.table_name,
        description: row.description,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        timestamp: row.timestamp,
        session_id: row.session_id
      }));
    } catch (error) {
      console.error('❌ Error fetching audit logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs with filters
   */
  async getAuditLogs(filters: {
    user_id?: number;
    entity_type?: string;
    entity_id?: string;
    action?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<AuditLog[]> {
    try {
      let query = 'SELECT * FROM audit_logs WHERE 1=1';
      const params: any[] = [];

      if (filters.user_id) {
        query += ' AND user_id = ?';
        params.push(filters.user_id);
      }

      if (filters.entity_type) {
        query += ' AND entity_type = ?';
        params.push(filters.entity_type);
      }

      if (filters.entity_id) {
        query += ' AND entity_id = ?';
        params.push(filters.entity_id);
      }

      if (filters.action) {
        query += ' AND action = ?';
        params.push(filters.action);
      }

      if (filters.from_date) {
        query += ' AND timestamp >= ?';
        params.push(filters.from_date);
      }

      if (filters.to_date) {
        query += ' AND timestamp <= ?';
        params.push(filters.to_date);
      }

      query += ' ORDER BY timestamp DESC';

      if (filters.limit) {
        query += ' LIMIT ?';
        params.push(filters.limit);
        
        if (filters.offset) {
          query += ' OFFSET ?';
          params.push(filters.offset);
        }
      }

      const result = await db.executeRawQuery(query, params);
      
      return result.map((row: any) => ({
        id: row.id,
        user_id: row.user_id,
        user_name: row.user_name,
        action: row.action,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        old_values: row.old_values ? JSON.parse(row.old_values) : undefined,
        new_values: row.new_values ? JSON.parse(row.new_values) : undefined,
        table_name: row.table_name,
        description: row.description,
        ip_address: row.ip_address,
        user_agent: row.user_agent,
        timestamp: row.timestamp,
        session_id: row.session_id
      }));
    } catch (error) {
      console.error('❌ Error fetching audit logs:', error);
      throw error;
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(): Promise<{
    total_events: number;
    events_today: number;
    events_this_week: number;
    top_users: Array<{ user_name: string; count: number }>;
    action_breakdown: Array<{ action: string; count: number }>;
  }> {
    try {
      const [totalResult] = await db.executeRawQuery('SELECT COUNT(*) as count FROM audit_logs');
      
      const [todayResult] = await db.executeRawQuery(
        "SELECT COUNT(*) as count FROM audit_logs WHERE date(timestamp) = date('now')"
      );
      
      const [weekResult] = await db.executeRawQuery(
        "SELECT COUNT(*) as count FROM audit_logs WHERE timestamp >= date('now', '-7 days')"
      );
      
      const topUsers = await db.executeRawQuery(`
        SELECT user_name, COUNT(*) as count 
        FROM audit_logs 
        GROUP BY user_name 
        ORDER BY count DESC 
        LIMIT 5
      `);
      
      const actionBreakdown = await db.executeRawQuery(`
        SELECT action, COUNT(*) as count 
        FROM audit_logs 
        GROUP BY action 
        ORDER BY count DESC
      `);

      return {
        total_events: totalResult.count,
        events_today: todayResult.count,
        events_this_week: weekResult.count,
        top_users: topUsers,
        action_breakdown: actionBreakdown
      };
    } catch (error) {
      console.error('❌ Error fetching audit statistics:', error);
      throw error;
    }
  }

  /**
   * Clean up old audit logs (older than specified days)
   */
  async cleanupOldLogs(daysToKeep: number = 365): Promise<number> {
    try {
      const result = await db.executeCommand(
        "DELETE FROM audit_logs WHERE timestamp < date('now', '-' || ? || ' days')",
        [daysToKeep]
      );
      
      console.log(`🧹 Cleaned up ${result.changes} old audit log entries`);
      return result.changes || 0;
    } catch (error) {
      console.error('❌ Error cleaning up audit logs:', error);
      throw error;
    }
  }

  /**
   * Utility method to generate employee ID
   */
  generateEmployeeId(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `EMP-${timestamp.slice(-6)}-${random}`;
  }
}

export const auditLogService = AuditLogService.getInstance();
