import React, { useState } from 'react';
import { Database, Play, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const DatabaseInitPanel: React.FC = () => {
  const [initStatus, setInitStatus] = useState<'idle' | 'initializing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [tableStatus, setTableStatus] = useState<Record<string, boolean>>({});

  const initializeDatabase = async () => {
    try {
      setInitStatus('initializing');
      setStatusMessage('Initializing database tables...');
      
      // Initialize staff service tables
      const { staffService } = await import('../../services/staffService');
      await staffService.initializeTables();
      
      // Verify tables were created
      await checkTableStatus();
      
      setInitStatus('success');
      setStatusMessage('Database initialized successfully!');
      toast.success('Database tables created successfully!');
      
    } catch (error) {
      console.error('Database initialization error:', error);
      setInitStatus('error');
      setStatusMessage(`Database initialization failed: ${error}`);
      toast.error('Failed to initialize database tables');
    }
  };

  const checkTableStatus = async () => {
    try {
      const { db } = await import('../../services/database');
      
      // Check if staff table exists
      const staffTableResult = await db.executeRawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='staff'",
        []
      );
      
      // Check if audit_logs table exists
      const auditTableResult = await db.executeRawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='audit_logs'",
        []
      );
      
      // Check if staff_sessions table exists
      const sessionsTableResult = await db.executeRawQuery(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='staff_sessions'",
        []
      );
      
      setTableStatus({
        staff: staffTableResult.length > 0,
        audit_logs: auditTableResult.length > 0,
        staff_sessions: sessionsTableResult.length > 0,
      });
      
    } catch (error) {
      console.error('Error checking table status:', error);
    }
  };

  const createTestAdmin = async () => {
    try {
      const { staffService } = await import('../../services/staffService');
      
      const adminData = {
        username: 'testadmin',
        password: 'admin123',
        role: 'admin' as const,
        full_name: 'Test Administrator',
        hire_date: new Date().toISOString().split('T')[0],
        is_active: true,
        permissions: ['all'],
        created_by: 'system'
      };
      
      const result = await staffService.createStaff(adminData);
      toast.success(`Test admin created! Employee ID: ${result.employee_id}`);
      setStatusMessage(`Test admin created with username: testadmin, password: admin123`);
      
    } catch (error) {
      console.error('Error creating test admin:', error);
      toast.error(`Failed to create test admin: ${error}`);
    }
  };

  React.useEffect(() => {
    checkTableStatus();
  }, []);

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center mb-4">
        <Database className="h-6 w-6 text-blue-600 mr-2" />
        <h2 className="text-lg font-semibold text-gray-900">Database Initialization Panel</h2>
      </div>

      {/* Table Status */}
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-900 mb-2">Table Status</h3>
        <div className="grid grid-cols-1 gap-2">
          {[
            { key: 'staff', name: 'Staff Table', description: 'Main staff management table' },
            { key: 'audit_logs', name: 'Audit Logs Table', description: 'System audit trail' },
            { key: 'staff_sessions', name: 'Staff Sessions Table', description: 'Authentication sessions' }
          ].map((table) => (
            <div key={table.key} className="flex items-center justify-between p-3 border rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">{table.name}</h4>
                <p className="text-sm text-gray-600">{table.description}</p>
              </div>
              <div className="flex items-center">
                {tableStatus[table.key] ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                    <span className="text-sm font-medium text-green-600">Created</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <span className="text-sm font-medium text-red-600">Missing</span>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={checkTableStatus}
          className="mt-2 px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
        >
          <RefreshCw className="h-4 w-4 inline mr-1" />
          Refresh Status
        </button>
      </div>

      {/* Initialize Database */}
      <div className="mb-6">
        <h3 className="text-md font-medium text-gray-900 mb-2">Database Initialization</h3>
        <div className="space-y-3">
          <button
            onClick={initializeDatabase}
            disabled={initStatus === 'initializing'}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Play className="h-4 w-4 mr-2" />
            {initStatus === 'initializing' ? 'Initializing...' : 'Initialize Database Tables'}
          </button>

          {Object.values(tableStatus).every(status => status) && (
            <button
              onClick={createTestAdmin}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Database className="h-4 w-4 mr-2" />
              Create Test Admin User
            </button>
          )}
        </div>
      </div>

      {/* Status Display */}
      {statusMessage && (
        <div className={`p-3 rounded ${
          initStatus === 'success' ? 'bg-green-50 border border-green-200 text-green-800' :
          initStatus === 'error' ? 'bg-red-50 border border-red-200 text-red-800' :
          'bg-blue-50 border border-blue-200 text-blue-800'
        }`}>
          <div className="flex items-center">
            {initStatus === 'success' && <CheckCircle className="h-5 w-5 mr-2" />}
            {initStatus === 'error' && <AlertCircle className="h-5 w-5 mr-2" />}
            {initStatus === 'initializing' && <RefreshCw className="h-5 w-5 mr-2 animate-spin" />}
            <span className="text-sm font-medium">{statusMessage}</span>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-3">
        <h4 className="text-sm font-medium text-yellow-800 mb-1">Quick Fix Instructions:</h4>
        <div className="text-xs text-yellow-700 space-y-1">
          <p>1. Click "Initialize Database Tables" to create missing tables</p>
          <p>2. After successful initialization, click "Create Test Admin User"</p>
          <p>3. Use credentials: testadmin / admin123 to login</p>
          <p>4. Once logged in, you can create more staff members normally</p>
        </div>
      </div>
    </div>
  );
};

export default DatabaseInitPanel;
