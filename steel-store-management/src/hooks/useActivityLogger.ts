/**
 * Hook for Activity Logging with User Context
 * 
 * This hook provides an easy way to log activities throughout the application
 * with automatic user context injection.
 */

import { useAuth } from './useAuth';
import { activityLogger, ActivityType, ModuleType } from '../services/activityLogger';

export const useActivityLogger = () => {
  const { user } = useAuth();

  // Helper function to get user context
  const getUserContext = () => {
    if (!user) {
      throw new Error('User must be logged in to log activities');
    }
    return {
      userId: parseInt(user.id) || 0, // Convert string ID to number
      username: user.username
    };
  };

  // Helper function to get browser context
  const getBrowserContext = () => ({
    ipAddress: undefined, // Could be obtained from server-side if needed
    userAgent: navigator.userAgent,
    sessionId: sessionStorage.getItem('sessionId') || undefined
  });

  return {
    // Customer Activities
    logCustomerCreated: (customerId: number, customerName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logCustomerCreated(userId, username, customerId, customerName);
    },

    logCustomerUpdated: (customerId: number, customerName: string, changes?: Record<string, any>) => {
      const { userId, username } = getUserContext();
      return activityLogger.logCustomerUpdated(userId, username, customerId, customerName, changes);
    },

    logCustomerDeleted: (customerId: number, customerName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logCustomerDeleted(userId, username, customerId, customerName);
    },

    logCustomerViewed: (customerId: number, customerName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logCustomerViewed(userId, username, customerId, customerName);
    },

    // Product Activities
    logProductCreated: (productId: number, productName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logProductCreated(userId, username, productId, productName);
    },

    logProductUpdated: (productId: number, productName: string, changes?: Record<string, any>) => {
      const { userId, username } = getUserContext();
      return activityLogger.logProductUpdated(userId, username, productId, productName, changes);
    },

    logProductDeleted: (productId: number, productName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logProductDeleted(userId, username, productId, productName);
    },

    logProductStockUpdated: (productId: number, productName: string, oldQuantity: number, newQuantity: number) => {
      const { userId, username } = getUserContext();
      return activityLogger.logProductStockUpdated(userId, username, productId, productName, oldQuantity, newQuantity);
    },

    // Invoice Activities
    logInvoiceCreated: (invoiceId: string, customerName: string, amount: number) => {
      return activityLogger.logInvoiceCreated(invoiceId, customerName, amount);
    },

    logInvoiceUpdated: (invoiceId: string, description: string, changes?: Record<string, any>) => {
      const { userId, username } = getUserContext();
      return activityLogger.logInvoiceUpdated(userId, username, invoiceId, description, changes);
    },

    logInvoiceDeleted: (invoiceId: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logInvoiceDeleted(userId, username, invoiceId);
    },

    logInvoiceViewed: (invoiceId: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logInvoiceViewed(userId, username, invoiceId);
    },

    // Payment Activities
    logPaymentReceived: (paymentId: number, invoiceId: string, amount: number, customerName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logPaymentReceived(userId, username, paymentId, invoiceId, amount, customerName);
    },

    logPaymentUpdated: (paymentId: number, description: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logPaymentUpdated(userId, username, paymentId, description);
    },

    logPaymentDeleted: (paymentId: number) => {
      const { userId, username } = getUserContext();
      return activityLogger.logPaymentDeleted(userId, username, paymentId);
    },

    // Vendor Activities
    logVendorCreated: (vendorId: number, vendorName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logVendorCreated(userId, username, vendorId, vendorName);
    },

    logVendorUpdated: (vendorId: number, vendorName: string, changes?: Record<string, any>) => {
      const { userId, username } = getUserContext();
      return activityLogger.logVendorUpdated(userId, username, vendorId, vendorName, changes);
    },

    logVendorDeleted: (vendorId: number, vendorName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logVendorDeleted(userId, username, vendorId, vendorName);
    },

    // Payment Channel Activities
    logPaymentChannelCreated: (channelId: number, channelName: string, channelType: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logPaymentChannelCreated(userId, username, channelId, channelName, channelType);
    },

    logPaymentChannelUpdated: (channelId: number, channelName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logPaymentChannelUpdated(userId, username, channelId, channelName);
    },

    logPaymentChannelDeleted: (channelId: number, channelName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logPaymentChannelDeleted(userId, username, channelId, channelName);
    },

    logPaymentChannelStatusChanged: (channelId: number, channelName: string, isActive: boolean) => {
      const { userId, username } = getUserContext();
      return activityLogger.logPaymentChannelStatusChanged(userId, username, channelId, channelName, isActive);
    },

    // Stock Activities
    logStockReceivingCreated: (receivingId: number, vendorName: string, totalAmount: number) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStockReceivingCreated(userId, username, receivingId, vendorName, totalAmount);
    },

    logStockReceivingUpdated: (receivingId: number, description: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStockReceivingUpdated(userId, username, receivingId, description);
    },

    logStockReceivingPayment: (receivingId: number, amount: number, paymentType: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStockReceivingPayment(userId, username, receivingId, amount, paymentType);
    },

    // Report Activities
    logReportExported: (reportType: string, filters?: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logReportExported(userId, username, reportType, filters);
    },

    logReportViewed: (reportType: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logReportViewed(userId, username, reportType);
    },

    // Staff Activities
    logStaffCreated: (staffId: number, staffName: string, role: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStaffCreated(userId, username, staffId, staffName, role);
    },

    logStaffUpdated: (staffId: number, staffName: string, changes?: Record<string, any>) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStaffUpdated(userId, username, staffId, staffName, changes);
    },

    logStaffRoleChanged: (staffId: number, staffName: string, oldRole: string, newRole: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStaffRoleChanged(userId, username, staffId, staffName, oldRole, newRole);
    },

    logStaffActivated: (staffId: number, staffName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStaffActivated(userId, username, staffId, staffName);
    },

    logStaffDeactivated: (staffId: number, staffName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStaffDeactivated(userId, username, staffId, staffName);
    },

    logStaffDeleted: (staffId: number, staffName: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logStaffDeleted(userId, username, staffId, staffName);
    },

    // Authentication Activities
    logUserLogin: () => {
      const { userId, username } = getUserContext();
      const { userAgent } = getBrowserContext();
      return activityLogger.logUserLogin(userId, username, undefined, userAgent);
    },

    logUserLogout: () => {
      const { userId, username } = getUserContext();
      return activityLogger.logUserLogout(userId, username);
    },

    // System Activities
    logSystemBackup: () => {
      const { userId, username } = getUserContext();
      return activityLogger.logSystemBackup(userId, username);
    },

    logSystemRestore: (backupFile: string) => {
      const { userId, username } = getUserContext();
      return activityLogger.logSystemRestore(userId, username, backupFile);
    },

    logDataImport: (dataType: string, recordCount: number) => {
      const { userId, username } = getUserContext();
      return activityLogger.logDataImport(userId, username, dataType, recordCount);
    },

    // Generic activity logging
    logCustomActivity: (action: ActivityType, module: ModuleType, entityId: string | number, description: string, changes?: Record<string, any>) => {
      const { userId, username } = getUserContext();
      const { ipAddress, userAgent, sessionId } = getBrowserContext();
      return activityLogger.logActivity({
        userId,
        username,
        action,
        module,
        entityId,
        description,
        oldValues: undefined,
        newValues: changes,
        ipAddress,
        userAgent,
        sessionId
      });
    }
  };
};
