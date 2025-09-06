import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import VendorDetail from './components/vendor/VendorDetail';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './hooks/useAuth';
import { useSafeAuth } from './hooks/withAuth';
import { SafeAuthProvider } from './components/auth/AuthErrorBoundary';
import AuthContextErrorHandler from './utils/authErrorHandler';
import { NavigationProvider } from './hooks/useNavigation';
import { settingsService } from './services/settingsService';
import LoadingAnimation from './components/common/LoadingAnimation';
import InitialLoading from './components/common/InitialLoading';
import { useAppPreloader } from './hooks/useAppPreloader';
import AppLayout from './components/layout/AppLayout';
import Dashboard from './components/dashboard/Dashboard';
import ProductListNoRefresh from './components/products/ProductListNoRefresh';
import CustomerList from './components/customers/CustomerList';
import InvoiceForm from './components/billing/InvoiceForm';
import InvoiceList from './components/billing/InvoiceList';
import InvoiceDetailsPage from './components/billing/InvoiceDetailsPage';
import DailyLedger from './components/reports/DailyLedger';
import CustomerLedger from './components/reports/CustomerLedger';
import StockReport from './components/reports/StockReport';
import StockHistory from './components/reports/StockHistory';
import RootCauseAnalysis from './components/RootCauseAnalysis';
import PerformanceTestDataGenerator from './components/test/PerformanceTestDataGenerator';
import StockReceivingListNoRefresh from './components/stock/StockReceivingListNoRefresh';
import StockReceivingNew from './components/stock/StockReceivingNew';
import PaymentChannelManagement from './components/payment/PaymentChannelManagementPermanent';
import DataIntegrityManager from './components/admin/DataIntegrityManager';
import StaffManagementIntegrated from './components/staff/StaffManagementIntegrated';
import SimpleFinanceDashboard from './components/finance/SimpleFinanceDashboard';
import VendorManagement from './components/vendor/VendorManagement';
import Returns from "./components/returns/Returns";
import DateTimeFormatTest from './components/test/DateTimeFormatTest';
import DateTimeFormatAudit from './components/test/DateTimeFormatAudit';
import RealTimeEventMonitor from './components/common/RealTimeEventMonitor';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import DatabaseInitPanel from './components/admin/DatabaseInitPanel';
import toast from 'react-hot-toast';
import './styles/globals.css';
import StockReceivingDetail from './components/stock/StockReceivingDetail';
import StockReceivingPayment from "./components/stock/StockReceivingPayment";
import { Activity } from 'lucide-react';
import './utils/searchRefreshDebugger'; // Auto-initializes in dev mode
import { ProductionBackupDashboard } from './components/backup/ProductionBackupDashboard';
import BackupSystemTest from './components/backup/BackupSystemTest';
import { BackupDebugTest } from './components/debug/BackupDebugTest';
import { EmergencyCleanup } from './components/debug/EmergencyCleanup';
import { RestoreDiagnostic } from './components/debug/RestoreDiagnostic';
import ManualRestoreTrigger from './components/debug/ManualRestoreTrigger';
import { SimpleBackupTest } from './components/debug/SimpleBackupTest';

function LoginForm() {
  const { login } = useSafeAuth(); // Use safe auth hook to prevent crashes
  const [username, setUsername] = React.useState('ittehad');
  const [password, setPassword] = React.useState('store!123');
  const [loading, setLoading] = React.useState(false);
  const [companyName, setCompanyName] = React.useState('Ittehad Iron Store');

  // Load company name from settings
  React.useEffect(() => {
    const generalSettings = settingsService.getSettings('general');
    setCompanyName(generalSettings.companyName || 'Ittehad Iron Store');
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 animate-fadeInScale">
      <div className="bg-white p-8 rounded-xl shadow-xl max-w-md w-full animate-fadeInUp">
        <div className="text-center mb-8">
          <div className="mx-auto h-16 w-16 bg-gradient-to-br from-gray-600 to-gray-800 rounded-2xl flex items-center justify-center mb-6 animate-pulse">
            {/* Steel Bar Logo */}
            <div className="flex space-x-1">
              <div className="w-1.5 h-10 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm shadow-inner"></div>
              <div className="w-1.5 h-8 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm shadow-inner mt-1"></div>
              <div className="w-1.5 h-9 bg-gradient-to-b from-gray-300 to-gray-500 rounded-sm shadow-inner"></div>
              <div className="w-1.5 h-7 bg-gradient-to-b from-gray-400 to-gray-600 rounded-sm shadow-inner mt-1.5"></div>
            </div>
          </div>
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
          <p className="text-xs text-gray-600 text-center mb-2">Default Credentials:</p>
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Username:</strong> ittehad</p>
            <p><strong>Password:</strong> store!123</p>
          </div>
        </div>


      </div>
    </div>
  );
}

function AppContent() {
  const { user } = useAuth();
  const [showEventMonitor, setShowEventMonitor] = React.useState(false);
  const [showInitialLoading, setShowInitialLoading] = React.useState(true);
  const [showLoginLoadingAnimation, setShowLoginLoadingAnimation] = React.useState(false);
  const [appFullyReady, setAppFullyReady] = React.useState(false);

  // High-performance preloader
  const {
    isPreloading,
    startPreloading,
    isReady: preloadReady
  } = useAppPreloader();

  // Step 1: Show initial loading for exactly 5 seconds
  const handleInitialLoadingComplete = React.useCallback(() => {
    console.log('📱 Initial loading complete - Login page ready');
    setShowInitialLoading(false);
  }, []);

  // Step 2: When user logs in, start preloading and show animation
  React.useEffect(() => {
    if (user && !appFullyReady) {
      console.log('🚀 User logged in - Starting high-performance preloading');
      setShowLoginLoadingAnimation(true);
      startPreloading(); // Start preloading components in background
    }
  }, [user, appFullyReady, startPreloading]);

  // Step 3: When preloading is complete, show main app
  React.useEffect(() => {
    if (preloadReady && user) {
      console.log('✅ Preloading complete - App fully ready');
      setAppFullyReady(true);
      setShowLoginLoadingAnimation(false);
    }
  }, [preloadReady, user]);

  // Handle login animation completion (fallback if preloading is faster than 5s)
  const handleLoginAnimationComplete = React.useCallback(() => {
    if (!appFullyReady) {
      console.log('⏱️ Animation complete but still preloading...');
      // If preloading isn't done, keep showing animation
      return;
    }
    setShowLoginLoadingAnimation(false);
  }, [appFullyReady]);

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

  // Show initial loading screen (5 seconds)
  if (showInitialLoading) {
    return (
      <InitialLoading
        onComplete={handleInitialLoadingComplete}
        duration={5000}
      />
    );
  }

  // Skip the intermediate auth loading to prevent glitch
  if (!user) {
    return <LoginForm />;
  }

  // Show loading animation while preloading components
  if (showLoginLoadingAnimation || isPreloading) {
    return (
      <LoadingAnimation
        isVisible={true}
        onAnimationComplete={handleLoginAnimationComplete}
        duration={5000}
      />
    );
  }

  return (
    <>
      <Router key={user?.id || 'no-user'}>
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
              <Route path="/" element={
                <>
                  {import.meta.env.DEV && <ManualRestoreTrigger />}
                  <Dashboard />
                </>
              } />
              <Route path="/dashboard" element={
                <>
                  {import.meta.env.DEV && <ManualRestoreTrigger />}
                  <Dashboard />
                </>
              } />

              {/* Products Management */}
              <Route path="/products" element={
                <ProtectedRoute module="products" level="view">
                  <ProductListNoRefresh />
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
                  <CustomerLedger />
                </ProtectedRoute>
              } />
              <Route path="/customers/:id/edit" element={
                <ProtectedRoute module="customers" level="edit">
                  <CustomerLedger />
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
              <Route path="/billing/edit/:id" element={
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
              <Route path="/reports/customer-ledger" element={
                <ProtectedRoute module="reports" level="view">
                  <CustomerLedger />
                </ProtectedRoute>
              } />
              <Route path="/reports/stock" element={
                <ProtectedRoute module="reports" level="view">
                  <StockReport />
                </ProtectedRoute>
              } />
              <Route path="/reports/stock-details/:productId" element={
                <ProtectedRoute module="reports" level="view">
                  <StockHistory />
                </ProtectedRoute>
              } />
              <Route path="/reports/stock-history/:productId" element={
                <ProtectedRoute module="reports" level="view">
                  <StockHistory />
                </ProtectedRoute>
              } />

              {/* Balance Diagnostic Tool */}
              <Route path="/debug/balance" element={
                <ProtectedRoute module="reports" level="view">
                  <RootCauseAnalysis />
                </ProtectedRoute>
              } />

              {/* Performance Test Data Generator */}
              <Route path="/debug/test-data" element={
                <PerformanceTestDataGenerator />
              } />

              {/* Enhanced Customer Management */}


              {/* Payment Channel Management */}
              <Route path="/payment-channels" element={
                <ProtectedRoute module="payments" level="view">
                  <PaymentChannelManagement />
                </ProtectedRoute>
              } />

              <Route path="/payment/channels" element={
                <ProtectedRoute module="payments" level="view">
                  <PaymentChannelManagement />
                </ProtectedRoute>
              } />


              {/* Integrated Staff & Salary Management */}
              <Route path="/staff" element={
                <ProtectedRoute module="user_management" level="view">
                  <StaffManagementIntegrated />
                </ProtectedRoute>
              } />

              {/* Redirect old salary route to integrated staff management */}
              <Route path="/staff-salary" element={<Navigate to="/staff" replace />} />



              {/* Data Integrity Manager (Admin Only) */}
              <Route path="/admin/data-integrity" element={
                <ProtectedRoute module="audit" level="view">
                  <DataIntegrityManager />
                </ProtectedRoute>
              } />

              {/* Backup & Restore Dashboard */}
              <Route path="/backup" element={
                <ProtectedRoute module="audit" level="view">
                  <ProductionBackupDashboard />
                </ProtectedRoute>
              } />

              {/* Backup System Test */}
              <Route path="/backup-test" element={
                <SimpleBackupTest />
              } />

              {/* Emergency Cleanup */}
              <Route path="/emergency-cleanup" element={
                <EmergencyCleanup />
              } />

              {/* Restore Diagnostic */}
              <Route path="/restore-diagnostic" element={
                <RestoreDiagnostic />
              } />

              {/* Simple Finance Dashboard */}
              <Route path="/finance" element={
                <ProtectedRoute module="reports" level="view">
                  <SimpleFinanceDashboard />
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
                  <StockReceivingListNoRefresh />
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


              {/* Activity Timeline */}
              <Route path="/activity" element={
                <div className="p-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4">Activity Timeline</h2>
                  <p className="text-gray-600">Global activity timeline with entity links will be implemented here.</p>
                </div>
              } />




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



              {/* Date/Time Format Test */}
              <Route path="/test/datetime" element={<DateTimeFormatTest />} />

              {/* Comprehensive Date/Time Format Audit */}
              <Route path="/test/audit" element={<DateTimeFormatAudit />} />

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
  // Install global auth error handler
  React.useEffect(() => {
    AuthContextErrorHandler.install();
  }, []);

  // 🛡️ GLOBAL SEARCH FIX - Prevents page refreshes on search inputs
  // useGlobalSearchFix(); // TEMPORARILY DISABLED TO DEBUG REFRESH ISSUE

  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    }>
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
    </React.Suspense>
  );
}

export default App;