import React, { useState } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';

const DatabaseReset: React.FC = () => {
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingDemo, setIsResettingDemo] = useState(false);

  const handleResetDatabase = async () => {
    if (!confirm('⚠️ WARNING: This will permanently delete ALL data!\n\nAre you sure you want to reset the database to completely empty state?')) {
      return;
    }

    setIsResetting(true);
    try {
      await db.resetDatabase();
      toast.success('✅ Database reset successfully! All data has been cleared.');
    } catch (error) {
      console.error('Failed to reset database:', error);
      toast.error(`❌ Failed to reset database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetToDemo = async () => {
    if (!confirm('This will reset the database and add sample data.\n\nAre you sure you want to continue?')) {
      return;
    }

    setIsResettingDemo(true);
    try {
      await db.resetToDemoData();
      toast.success('✅ Database reset with demo data successfully!');
    } catch (error) {
      console.error('Failed to reset to demo data:', error);
      toast.error(`❌ Failed to reset to demo data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsResettingDemo(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">Database Reset</h2>
      
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="font-medium text-red-900 mb-2">⚠️ Complete Reset</h3>
          <p className="text-sm text-red-700 mb-3">
            This will permanently delete ALL data and start with an empty database.
          </p>
          <button
            onClick={handleResetDatabase}
            disabled={isResetting || isResettingDemo}
            className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResetting ? 'Resetting...' : 'Reset to Empty Database'}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">🎯 Reset with Demo Data</h3>
          <p className="text-sm text-blue-700 mb-3">
            This will reset the database and add sample products and customers to get you started.
          </p>
          <button
            onClick={handleResetToDemo}
            disabled={isResetting || isResettingDemo}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isResettingDemo ? 'Resetting...' : 'Reset with Demo Data'}
          </button>
        </div>
      </div>

      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Developer Console Method</h4>
        <p className="text-xs text-gray-600 mb-2">
          You can also reset from the browser console:
        </p>
        <code className="block text-xs bg-gray-100 p-2 rounded">
          // Complete reset<br/>
          await window.db.resetDatabase();<br/><br/>
          // Reset with demo data<br/>
          await window.db.resetToDemoData();
        </code>
      </div>
    </div>
  );
};

export default DatabaseReset;
