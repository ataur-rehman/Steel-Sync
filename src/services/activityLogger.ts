/**
 * COMPREHENSIVE ACTIVITY LOGGING SERVICE
 * 
 * This service provides centralized activity logging for all system modules.
 * It integrates with the existing auditLogService to provide comprehensive
 * activity tracking across the entire Steel Store Management System.
 */

import { auditLogService } from './auditLogService';
import { formatInvoiceNumber } from '../utils/numberFormatting';

// Activity Types for Business Operations
export enum ActivityType {
  // CRUD Operations
  CREATE = 'CREATE',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  VIEW = 'VIEW',
  
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  
  // Business Operations
  PAYMENT = 'PAYMENT',
  INVOICE = 'INVOICE',
  EXPORT = 'EXPORT',
  APPROVE = 'APPROVE',
  REJECT = 'REJECT',
  SUBMIT = 'SUBMIT',
  
  // Status Changes
  ACTIVATE = 'ACTIVATE',
  DEACTIVATE = 'DEACTIVATE',
  
  // Special Operations
  BACKUP = 'BACKUP',
  RESTORE = 'RESTORE',
  IMPORT = 'IMPORT'
}

// Module Types for System Organization
export enum ModuleType {
  CUSTOMERS = 'CUSTOMER',
  PRODUCTS = 'PRODUCT', 
  INVOICES = 'INVOICE',
  PAYMENTS = 'PAYMENT',
  PAYMENT_CHANNELS = 'PAYMENT_CHANNEL',
  VENDORS = 'VENDOR',
  STOCK = 'STOCK',
  REPORTS = 'REPORT',
  STAFF = 'STAFF',
  SYSTEM = 'SYSTEM'
}

// Interface for Activity Logging
interface ActivityLogData {
  userId: number;
  username: string;
  action: ActivityType;
  module: ModuleType;
  entityId: string | number;
  description: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

class ActivityLoggingService {
  private static instance: ActivityLoggingService;

  public static getInstance(): ActivityLoggingService {
    if (!ActivityLoggingService.instance) {
      ActivityLoggingService.instance = new ActivityLoggingService();
    }
    return ActivityLoggingService.instance;
  }

  /**
   * Log a user activity
   */
  async logActivity(data: ActivityLogData): Promise<void> {
    try {
      await auditLogService.logEvent({
        user_id: data.userId,
        user_name: data.username,
        action: this.mapActivityTypeToAuditAction(data.action),
        entity_type: data.module as any, // Type assertion for compatibility
        entity_id: data.entityId,
        description: data.description,
        old_values: data.oldValues,
        new_values: data.newValues,
        ip_address: data.ipAddress,
        user_agent: data.userAgent,
        session_id: data.sessionId
      });
    } catch (error) {
      console.error('Failed to log activity:', error);
      // Don't throw error to avoid breaking main functionality
    }
  }

  /**
   * Map ActivityType to AuditLog action format
   */
  private mapActivityTypeToAuditAction(activityType: ActivityType): any {
    const mapping: Record<ActivityType, string> = {
      [ActivityType.CREATE]: 'CREATE',
      [ActivityType.UPDATE]: 'UPDATE',
      [ActivityType.DELETE]: 'DELETE',
      [ActivityType.VIEW]: 'UPDATE', // Map VIEW to UPDATE for audit compatibility
      [ActivityType.LOGIN]: 'LOGIN',
      [ActivityType.LOGOUT]: 'LOGOUT',
      [ActivityType.PAYMENT]: 'UPDATE',
      [ActivityType.INVOICE]: 'UPDATE',
      [ActivityType.EXPORT]: 'UPDATE',
      [ActivityType.APPROVE]: 'STATUS_CHANGE',
      [ActivityType.REJECT]: 'STATUS_CHANGE',
      [ActivityType.SUBMIT]: 'UPDATE',
      [ActivityType.ACTIVATE]: 'STATUS_CHANGE',
      [ActivityType.DEACTIVATE]: 'STATUS_CHANGE',
      [ActivityType.BACKUP]: 'UPDATE',
      [ActivityType.RESTORE]: 'UPDATE',
      [ActivityType.IMPORT]: 'CREATE'
    };
    return mapping[activityType] || 'UPDATE';
  }

  // ============ CUSTOMER MANAGEMENT ACTIVITIES ============

  async logCustomerCreated(userId: number, username: string, customerId: number, customerName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.CREATE,
      module: ModuleType.CUSTOMERS,
      entityId: customerId,
      description: `Created new customer: ${customerName}`
    });
  }

  async logCustomerUpdated(userId: number, username: string, customerId: number, customerName: string, changes?: Record<string, any>): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.CUSTOMERS,
      entityId: customerId,
      description: `Updated customer: ${customerName}`,
      newValues: changes
    });
  }

  async logCustomerDeleted(userId: number, username: string, customerId: number, customerName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.DELETE,
      module: ModuleType.CUSTOMERS,
      entityId: customerId,
      description: `Deleted customer: ${customerName}`
    });
  }

  async logCustomerViewed(userId: number, username: string, customerId: number, customerName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.VIEW,
      module: ModuleType.CUSTOMERS,
      entityId: customerId,
      description: `Viewed customer profile: ${customerName}`
    });
  }

  // ============ PRODUCT MANAGEMENT ACTIVITIES ============

  async logProductCreated(userId: number, username: string, productId: number, productName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.CREATE,
      module: ModuleType.PRODUCTS,
      entityId: productId,
      description: `Added new product: ${productName}`
    });
  }

  async logProductUpdated(userId: number, username: string, productId: number, productName: string, changes?: Record<string, any>): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.PRODUCTS,
      entityId: productId,
      description: `Updated product: ${productName}`,
      newValues: changes
    });
  }

  async logProductDeleted(userId: number, username: string, productId: number, productName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.DELETE,
      module: ModuleType.PRODUCTS,
      entityId: productId,
      description: `Deleted product: ${productName}`
    });
  }

  async logProductStockUpdated(userId: number, username: string, productId: number, productName: string, oldQuantity: number, newQuantity: number): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.PRODUCTS,
      entityId: productId,
      description: `Updated stock for ${productName}: ${oldQuantity} → ${newQuantity}`
    });
  }

  // ============ INVOICE MANAGEMENT ACTIVITIES ============

  async logInvoiceCreated(invoiceId: string, customerName: string, amount: number): Promise<void> {
    await this.logActivity({
      userId: 1, // System user for now
      username: 'System',
      action: ActivityType.CREATE,
      module: ModuleType.INVOICES,
      entityId: invoiceId,
      description: `Created invoice #${formatInvoiceNumber(invoiceId)} for ${customerName} - ₹${amount.toFixed(2)}`
    });
  }

  async logInvoiceUpdated(userId: number, username: string, invoiceId: string, description: string, changes?: Record<string, any>): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.INVOICES,
      entityId: invoiceId,
      description: `Updated invoice #${formatInvoiceNumber(invoiceId)}: ${description}`,
      newValues: changes
    });
  }

  async logInvoiceDeleted(userId: number, username: string, invoiceId: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.DELETE,
      module: ModuleType.INVOICES,
      entityId: invoiceId,
      description: `Deleted invoice #${formatInvoiceNumber(invoiceId)}`
    });
  }

  async logInvoiceViewed(userId: number, username: string, invoiceId: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.VIEW,
      module: ModuleType.INVOICES,
      entityId: invoiceId,
      description: `Viewed invoice #${formatInvoiceNumber(invoiceId)}`
    });
  }

  // ============ PAYMENT ACTIVITIES ============

  async logPaymentReceived(userId: number, username: string, paymentId: number, invoiceId: string, amount: number, customerName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.PAYMENT,
      module: ModuleType.PAYMENTS,
      entityId: paymentId,
      description: `Payment received: ₹${amount.toFixed(2)} for invoice #${formatInvoiceNumber(invoiceId)} from ${customerName}`
    });
  }

  async logPaymentUpdated(userId: number, username: string, paymentId: number, description: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.PAYMENTS,
      entityId: paymentId,
      description: `Updated payment #${paymentId}: ${description}`
    });
  }

  async logPaymentDeleted(userId: number, username: string, paymentId: number): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.DELETE,
      module: ModuleType.PAYMENTS,
      entityId: paymentId,
      description: `Deleted payment #${paymentId}`
    });
  }

  // ============ VENDOR MANAGEMENT ACTIVITIES ============

  async logVendorCreated(userId: number, username: string, vendorId: number, vendorName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.CREATE,
      module: ModuleType.VENDORS,
      entityId: vendorId,
      description: `Added new vendor: ${vendorName}`
    });
  }

  async logVendorUpdated(userId: number, username: string, vendorId: number, vendorName: string, changes?: Record<string, any>): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.VENDORS,
      entityId: vendorId,
      description: `Updated vendor: ${vendorName}`,
      newValues: changes
    });
  }

  async logVendorDeleted(userId: number, username: string, vendorId: number, vendorName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.DELETE,
      module: ModuleType.VENDORS,
      entityId: vendorId,
      description: `Deleted vendor: ${vendorName}`
    });
  }

  // ============ PAYMENT CHANNEL ACTIVITIES ============

  async logPaymentChannelCreated(userId: number, username: string, channelId: number, channelName: string, channelType: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.CREATE,
      module: ModuleType.PAYMENT_CHANNELS,
      entityId: channelId,
      description: `Created payment channel: ${channelName} (${channelType})`
    });
  }

  async logPaymentChannelUpdated(userId: number, username: string, channelId: number, channelName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.PAYMENT_CHANNELS,
      entityId: channelId,
      description: `Updated payment channel: ${channelName}`
    });
  }

  async logPaymentChannelDeleted(userId: number, username: string, channelId: number, channelName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.DELETE,
      module: ModuleType.PAYMENT_CHANNELS,
      entityId: channelId,
      description: `Deleted payment channel: ${channelName}`
    });
  }

  async logPaymentChannelStatusChanged(userId: number, username: string, channelId: number, channelName: string, isActive: boolean): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.PAYMENT_CHANNELS,
      entityId: channelId,
      description: `${isActive ? 'Activated' : 'Deactivated'} payment channel: ${channelName}`
    });
  }

  // ============ STOCK MANAGEMENT ACTIVITIES ============

  async logStockReceivingCreated(userId: number, username: string, receivingId: number, vendorName: string, totalAmount: number): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.CREATE,
      module: ModuleType.STOCK,
      entityId: receivingId,
      description: `Created stock receiving #${receivingId} from ${vendorName} - ₹${totalAmount.toFixed(2)}`
    });
  }

  async logStockReceivingUpdated(userId: number, username: string, receivingId: number, description: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.STOCK,
      entityId: receivingId,
      description: `Updated stock receiving #${receivingId}: ${description}`
    });
  }

  async logStockReceivingPayment(userId: number, username: string, receivingId: number, amount: number, paymentType: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.PAYMENT,
      module: ModuleType.STOCK,
      entityId: receivingId,
      description: `${paymentType} payment of ₹${amount.toFixed(2)} for stock receiving #${receivingId}`
    });
  }

  // ============ REPORTS ACTIVITIES ============

  async logReportExported(userId: number, username: string, reportType: string, filters?: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.EXPORT,
      module: ModuleType.REPORTS,
      entityId: `report-${Date.now()}`,
      description: `Exported ${reportType} report${filters ? ` with filters: ${filters}` : ''}`
    });
  }

  async logReportViewed(userId: number, username: string, reportType: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.VIEW,
      module: ModuleType.REPORTS,
      entityId: `report-${Date.now()}`,
      description: `Viewed ${reportType} report`
    });
  }

  // ============ STAFF MANAGEMENT ACTIVITIES ============

  async logStaffCreated(userId: number, username: string, staffId: number, staffName: string, role: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.CREATE,
      module: ModuleType.STAFF,
      entityId: staffId,
      description: `Created staff account for ${staffName} with role: ${role}`
    });
  }

  async logStaffUpdated(userId: number, username: string, staffId: number, staffName: string, changes?: Record<string, any>): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.STAFF,
      entityId: staffId,
      description: `Updated staff account: ${staffName}`,
      newValues: changes
    });
  }

  async logStaffRoleChanged(userId: number, username: string, staffId: number, staffName: string, oldRole: string, newRole: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.UPDATE,
      module: ModuleType.STAFF,
      entityId: staffId,
      description: `Changed role for ${staffName}: ${oldRole} → ${newRole}`
    });
  }

  async logStaffActivated(userId: number, username: string, staffId: number, staffName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.ACTIVATE,
      module: ModuleType.STAFF,
      entityId: staffId,
      description: `Activated staff account: ${staffName}`
    });
  }

  async logStaffDeactivated(userId: number, username: string, staffId: number, staffName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.DEACTIVATE,
      module: ModuleType.STAFF,
      entityId: staffId,
      description: `Deactivated staff account: ${staffName}`
    });
  }

  async logStaffDeleted(userId: number, username: string, staffId: number, staffName: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.DELETE,
      module: ModuleType.STAFF,
      entityId: staffId,
      description: `Deleted staff account: ${staffName}`
    });
  }

  // ============ AUTHENTICATION ACTIVITIES ============

  async logUserLogin(userId: number, username: string, ipAddress?: string, userAgent?: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.LOGIN,
      module: ModuleType.SYSTEM,
      entityId: userId,
      description: `User logged in: ${username}`,
      ipAddress,
      userAgent
    });
  }

  async logUserLogout(userId: number, username: string, ipAddress?: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.LOGOUT,
      module: ModuleType.SYSTEM,
      entityId: userId,
      description: `User logged out: ${username}`,
      ipAddress
    });
  }

  // ============ SYSTEM ACTIVITIES ============

  async logSystemBackup(userId: number, username: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.BACKUP,
      module: ModuleType.SYSTEM,
      entityId: `backup-${Date.now()}`,
      description: 'System database backup created'
    });
  }

  async logSystemRestore(userId: number, username: string, backupFile: string): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.RESTORE,
      module: ModuleType.SYSTEM,
      entityId: `restore-${Date.now()}`,
      description: `System restored from backup: ${backupFile}`
    });
  }

  async logDataImport(userId: number, username: string, dataType: string, recordCount: number): Promise<void> {
    await this.logActivity({
      userId,
      username,
      action: ActivityType.IMPORT,
      module: ModuleType.SYSTEM,
      entityId: `import-${Date.now()}`,
      description: `Imported ${recordCount} ${dataType} records`
    });
  }
}

// Export singleton instance
export const activityLogger = ActivityLoggingService.getInstance();
