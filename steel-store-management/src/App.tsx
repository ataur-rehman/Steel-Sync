import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VendorDetail from './components/vendor/VendorDetail';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { SafeAuthProvider } from './components/auth/AuthErrorBoundary';
import { NavigationProvider } from './hooks/useNavigation';
import { settingsService } from './services/settingsService';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import ProductList from './components/products/ProductList';
import CustomerList from './components/customers/CustomerList';
import CustomerProfile from './components/customers/CustomerProfile';
import InvoiceForm from './components/billing/InvoiceForm';
import InvoiceList from './components/billing/InvoiceList';
import InvoiceDetailsPage from './components/billing/InvoiceDetailsPage';
import DailyLedger from './components/reports/DailyLedger';
import CustomerLedger from './components/reports/CustomerLedger';
import StockReport from './components/reports/StockReport';
import StockReceivingList from './components/stock/StockReceivingList';
import StockReceivingNew from './components/stock/StockReceivingNew';
import LoanLedger from './components/loan/LoanLedger';
import CustomerLoanDetail from './components/loan/CustomerLoanDetail';
import PaymentChannelManagement from './components/payment/PaymentChannelManagement';
import PaymentChannelDetailView from './components/payment/PaymentChannelDetailView';
import StaffManagement from './components/staff/StaffManagement';
import ActivityLogger from './components/admin/ActivityLogger';
import BusinessFinanceDashboard from './components/finance/BusinessFinanceDashboard';
import VendorManagement from './components/vendor/VendorManagement';
import Returns from "./components/returns/Returns";
import NotificationsPage from './components/notifications/NotificationsPage';
import RealTimeEventMonitor from './components/common/RealTimeEventMonitor';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

import DatabaseInitPanel from './components/admin/DatabaseInitPanel';
import RoleManagementComplete from './components/admin/RoleManagementComplete';
import PermissionManagementSimple from './components/admin/PermissionManagementSimple';
import ActivityLoggerProfessional from './components/admin/ActivityLoggerProfessional';
import PaymentChannelDebug from './components/debug/PaymentChannelDebug';

import toast from 'react-hot-toast';
import './styles/globals.css';
import StockReceivingDetail from './components/stock/StockReceivingDetail';
import StockReceivingPayment from "./components/stock/StockReceivingPayment";
import { Activity } from 'lucide-react';

function LoginForm() {
  const { login } = useAuth();
  const [username, setUsername] = React.useState('admin');
  const [password, setPassword] = React.useState('admin123');
  const [loading, setLoading] = React.useState(false);
const [companyName, setCompanyName] = React.useState('Itehad Iron Store');

  // Load company name from settings
  React.useEffect(() => {
    const generalSettings = settingsService.getSettings('general');
    setCompanyName(generalSettings.companyName || 'Itehad Iron Store');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const success = await login(username, password);
      if (success) {
        toast.success('Login successful! Deep linking system ready.');
      } else {
        toast.error('Invalid credentials');
      }
    } catch (error) {
      toast.error('Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{companyName}</h2>
          <p className="text-gray-600">Complete Business Management with Full Traceability</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
<label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={loading}
            />
          </div>

          <div>
<label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Signing in...
              </div>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
        
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 text-center mb-2">Test Credentials:</p>
        <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Username:</strong> admin</p>
            <p><strong>Password:</strong> admin123</p>
          </div>
        </div>
        
      
      </div>
          </div>
  );
}

function AppContent() {
  const { user, loading } = useAuth();
  const [showEventMonitor, setShowEventMonitor] = React.useState(false);
  
  // Show event monitor in development mode with Ctrl+Shift+E
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E') {
        e.preventDefault();
        setShowEventMonitor(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
<p className="text-gray-600">Initializing Deep Linking System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
<p className="text-gray-600">Initializing Deep Linking System...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <>
      <Router>
        <NavigationProvider>
          <AppLayout>
            {/* Development tool: Event Monitor Button (only in development) */}
            {import.meta.env.DEV && (
              <button
                onClick={() => setShowEventMonitor(true)}
                className="fixed bottom-4 right-4 z-40 rounded-full bg-green-600 p-3 text-white shadow-lg hover:bg-green-700 transition-colors"
                title="Real-Time Event Monitor (Ctrl+Shift+E)"
              >
                <Activity className="h-5 w-5" />
              </button>
            )}
            
            <Routes>
            {/* Dashboard - Enhanced with drill-down capabilities */}
            <Route path="/" element={<Dashboard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            
            {/* Products Management */}
            <Route path="/products" element={
              <ProtectedRoute module="products" level="view">
                <ProductList />
              </ProtectedRoute>
            } />
            
            
            {/* Customer Management with Deep Linking */}
            <Route path="/customers" element={
              <ProtectedRoute module="customers" level="view">
                <CustomerList />
              </ProtectedRoute>
            } />
            <Route path="/customers/new" element={
              <ProtectedRoute module="customers" level="edit">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Add New Customer</h2>
                  <p className="text-gray-600">Customer creation form will be implemented here.</p>
                </div>
              </ProtectedRoute>
            } />
            <Route path="/customers/:id" element={
              <ProtectedRoute module="customers" level="view">
                <CustomerProfile />
              </ProtectedRoute>
            } />
            <Route path="/customers/:id/edit" element={
              <ProtectedRoute module="customers" level="edit">
                <CustomerProfile />
              </ProtectedRoute>
            } />
            <Route path="/customers/:id/ledger" element={
              <ProtectedRoute module="customers" level="view">
                <CustomerLedger />
              </ProtectedRoute>
            } />
            
            {/* Billing System with Full Traceability */}
            <Route path="/billing/new" element={
              <ProtectedRoute module="sales" level="edit">
                <InvoiceForm />
              </ProtectedRoute>
            } />
            <Route path="/billing/list" element={
              <ProtectedRoute module="reports" level="view">
                <InvoiceList />
              </ProtectedRoute>
            } />
            <Route path="/billing/view/:id" element={
              <ProtectedRoute module="sales" level="view">
                <InvoiceDetailsPage />
              </ProtectedRoute>
            } />
            
           
<Route path="/stock/receiving/:id/add-payment" element={
  <ProtectedRoute module="inventory" level="edit">
    <StockReceivingPayment />
  </ProtectedRoute>
} />

            {/* Returns with Original Invoice Linking */}
            <Route path="/returns" element={<Returns />} />
            <Route path="/returns/new" element={
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Process Return</h2>
                <p className="text-gray-600">Return processing form will be implemented here.</p>
              </div>
            } />
            <Route path="/returns/:id" element={
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Return Details</h2>
                <p className="text-gray-600">Return details with original invoice & customer links will be implemented here.</p>
              </div>
            } />
            
            {/* Reports with Drill-down Capabilities */}
            <Route path="/reports/daily" element={
              <ProtectedRoute module="reports" level="view">
                <DailyLedger />
              </ProtectedRoute>
            } />
            <Route path="/reports/customer" element={
              <ProtectedRoute module="reports" level="view">
                <CustomerLedger />
              </ProtectedRoute>
            } />
            <Route path="/reports/stock" element={
              <ProtectedRoute module="reports" level="view">
                <StockReport />
              </ProtectedRoute>
            } />
        
            {/* Enhanced Customer Management */}
           
            
            {/* Payment Channel Management */}
            <Route path="/payment/channels" element={
              <ProtectedRoute module="payments" level="view">
                <PaymentChannelManagement />
              </ProtectedRoute>
            } />
            <Route path="/payment/channels/:id" element={
              <ProtectedRoute module="payments" level="view">
                <PaymentChannelDetailView />
              </ProtectedRoute>
            } />
            
            {/* Staff Management - Professional Version */}
            <Route path="/staff" element={
              <ProtectedRoute module="user_management" level="view">
                <StaffManagement />
              </ProtectedRoute>
            } />
            
            {/* Activity Logger - NEW REDESIGNED VERSION */}
            <Route path="/audit" element={
              <ProtectedRoute module="audit" level="view">
                <ActivityLoggerProfessional />
              </ProtectedRoute>
            } />
            
            {/* Legacy Activity Logger - OLD VERSION */}
            <Route path="/audit/legacy" element={
              <ProtectedRoute module="audit" level="view">
                <ActivityLogger />
              </ProtectedRoute>
            } />
            
            {/* Role Management System - NEW COMPLETE VERSION */}
            <Route path="/admin/roles" element={
              <ProtectedRoute module="user_management" level="full">
                <RoleManagementComplete />
              </ProtectedRoute>
            } />
            
         
            
            {/* Role Management System (Admin Only) */}
            <Route path="/admin/users" element={
              <ProtectedRoute module="user_management" level="full">
                <RoleManagementComplete />
              </ProtectedRoute>
            } />
            
            {/* Permission Management (Admin Only) */}
            <Route path="/admin/permissions" element={
              <ProtectedRoute module="user_management" level="full">
                <PermissionManagementSimple />
              </ProtectedRoute>
            } />
            
            {/* Activity Logger Redesigned (Admin Only) */}
            <Route path="/admin/activity" element={
              <ProtectedRoute module="audit" level="view">
                <ActivityLoggerProfessional />
              </ProtectedRoute>
            } />
            
            {/* Business Finance Dashboard */}
            <Route path="/finance" element={
              <ProtectedRoute module="reports" level="view">
                <BusinessFinanceDashboard />
              </ProtectedRoute>
            } />
            
            {/* Product Movement Details */}

            <Route path="/stock/receiving/:id" element={
              <ProtectedRoute module="inventory" level="view">
                <StockReceivingDetail />
              </ProtectedRoute>
            } />
            {/* Stock Management */}
            <Route path="/stock/receiving" element={
              <ProtectedRoute module="inventory" level="view">
                <StockReceivingList />
              </ProtectedRoute>
            } />
            <Route path="/stock/receiving/new" element={
              <ProtectedRoute module="inventory" level="edit">
                <StockReceivingNew />
              </ProtectedRoute>
            } />
            
            {/* Vendor Management */}
            <Route path="/vendors" element={
              <ProtectedRoute module="vendors" level="view">
                <VendorManagement />
              </ProtectedRoute>
            } />
            <Route path="/vendors/:id" element={
              <ProtectedRoute module="vendors" level="view">
                <VendorDetail />
              </ProtectedRoute>
            } />
            <Route path="/vendors/edit/:id" element={
              <ProtectedRoute module="vendors" level="edit">
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Vendor</h2>
                  <p className="text-gray-600">Vendor edit form will be implemented here.</p>
                </div>
              </ProtectedRoute>
            } />
            
            {/* Loan Management */}
            <Route path="/loan/ledger" element={
              <ProtectedRoute module="reports" level="view">
                <LoanLedger />
              </ProtectedRoute>
            } />
            <Route path="/loan-detail/:customerId" element={
              <ProtectedRoute module="reports" level="view">
                <CustomerLoanDetail />
              </ProtectedRoute>
            } />
            
            {/* Activity Timeline */}
            <Route path="/activity" element={
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Activity Timeline</h2>
                <p className="text-gray-600">Global activity timeline with entity links will be implemented here.</p>
              </div>
            } />
            
            {/* Notifications Center */}
            <Route path="/notifications" element={<NotificationsPage />} />
            
            {/* Settings */}

            
            {/* Backwards compatibility for notification settings */}

            
            {/* Notification Test (for development) */}
            <Route path="/settings/notifications/test" element={
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Notification Test</h2>
                <div className="space-y-4">
                  <button
                    onClick={() => {
                      import('./services/notifications').then(({ notificationService }) => {
                        notificationService.createNotification({
                          id: 'test-notification',
                          type: 'system_alert',
                          category: 'system',
                          title: 'Test Notification',
                          message: 'This is a test notification to verify the system is working correctly.',
                          priority: 'medium',
                          actionUrl: '/dashboard',
                          actionText: 'Go to Dashboard'
                        });
                      });
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Test Notification
                  </button>
                  <button
                    onClick={() => {
                      import('./services/notifications').then(({ notificationService }) => {
                        notificationService.notifyProductLowStock('test-product', 'Test Product', 2, 5);
                      });
                    }}
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    Test Low Stock Alert
                  </button>
                  <button
                    onClick={() => {
                      import('./services/notifications').then(({ notificationService }) => {
                        notificationService.notifyCustomerHighBalance('test-customer', 'Test Customer', 75000);
                      });
                    }}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  >
                    Test High Balance Alert
                  </button>
                </div>
              </div>
            } />
            
            {/* Database Debug Tools */}

            
            {/* Database Initialization (Public Access) */}
            <Route path="/init-db" element={
              <div className="min-h-screen bg-gray-50 p-6">
                <div className="max-w-4xl mx-auto">
                  <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900">Database Initialization</h1>
                    <p className="text-gray-600">Initialize the database tables for the Steel Store Management System</p>
                  </div>
                  <DatabaseInitPanel />
                </div>
              </div>
            } />
            
            {/* Debug Routes for Development */}
            {import.meta.env.DEV && (
              <Route path="/debug/payment-channels" element={<PaymentChannelDebug />} />
            )}
            
            {/* Catch-all redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppLayout>
      </NavigationProvider>
    </Router>
    
    {/* Real-Time Event Monitor for Development */}
    {import.meta.env.DEV && (
      <RealTimeEventMonitor 
        isOpen={showEventMonitor} 
        onClose={() => setShowEventMonitor(false)} 
      />
    )}
    </>
  );
}

function App() {
  return (
    <SafeAuthProvider>
      <AppContent />
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#333',
            color: '#fff',
          },
          success: {
            style: {
              background: '#10B981',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#10B981',
            },
          },
          error: {
            style: {
              background: '#EF4444',
              color: '#fff',
            },
            iconTheme: {
              primary: '#fff',
              secondary: '#EF4444',
            },
          },
        }}
      />
    </SafeAuthProvider>
  );
}

export default App;