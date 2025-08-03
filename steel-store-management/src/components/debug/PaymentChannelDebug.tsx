import React, { useState } from 'react';
import { db } from '../../services/database';
import toast from 'react-hot-toast';

const PaymentChannelDebug: React.FC = () => {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runDebug = async () => {
    try {
      setLoading(true);
      console.log('🔍 Starting payment channels debug...');
      
      const data = await db.debugPaymentChannelsTransactions();
      setDebugData(data);
      
      console.log('📊 Debug data:', data);
      toast.success('Debug completed - check console for details');
    } catch (error) {
      console.error('❌ Debug failed:', error);
      toast.error('Debug failed');
    } finally {
      setLoading(false);
    }
  };

  const runMigration = async () => {
    try {
      setLoading(true);
      console.log('🔄 Running vendor payment migration...');
      
      await db.migrateVendorPaymentsToPaymentChannels();
      
      toast.success('Migration completed');
      // Run debug again to see results
      await runDebug();
    } catch (error) {
      console.error('❌ Migration failed:', error);
      toast.error('Migration failed');
    } finally {
      setLoading(false);
    }
  };

  const checkPaymentChannelStats = async () => {
    try {
      setLoading(true);
      console.log('📈 Checking payment channel stats...');
      
      const stats = await db.getPaymentChannelStats();
      console.log('📊 Payment channel stats:', stats);
      
      const channels = await db.getPaymentChannels(true); // Include inactive
      console.log('💳 All payment channels:', channels);
      
      toast.success('Stats checked - check console for details');
    } catch (error) {
      console.error('❌ Stats check failed:', error);
      toast.error('Stats check failed');
    } finally {
      setLoading(false);
    }
  };

  const createTestPayment = async () => {
    try {
      setLoading(true);
      console.log('💰 Creating test payment...');
      
      // Create a test payment in the payments table
      await db.executeRawQuery(`
        INSERT INTO payments (
          customer_id, customer_name, payment_code, amount, payment_method, 
          payment_type, payment_channel_id, payment_channel_name, reference, 
          notes, date, time, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
      `, [
        -999, // Test vendor ID
        'Test Vendor',
        'TEST001',
        1000,
        'Cash',
        'vendor_payment',
        1, // Assuming channel ID 1 exists
        'Cash',
        'Test payment',
        'Test payment for debugging',
        new Date().toISOString().split('T')[0],
        new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', hour12: true })
      ]);
      
      toast.success('Test payment created');
      await runDebug();
    } catch (error) {
      console.error('❌ Test payment creation failed:', error);
      toast.error('Test payment creation failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold mb-6">Payment Channels Debug</h2>
        
        <div className="space-y-4 mb-6">
          <button
            onClick={runDebug}
            disabled={loading}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? 'Running...' : 'Run Debug'}
          </button>
          
          <button
            onClick={runMigration}
            disabled={loading}
            className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50 ml-2"
          >
            {loading ? 'Migrating...' : 'Run Migration'}
          </button>
          
          <button
            onClick={checkPaymentChannelStats}
            disabled={loading}
            className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50 ml-2"
          >
            {loading ? 'Checking...' : 'Check Stats'}
          </button>
          
          <button
            onClick={createTestPayment}
            disabled={loading}
            className="bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-50 ml-2"
          >
            {loading ? 'Creating...' : 'Create Test Payment'}
          </button>
        </div>

        {debugData && (
          <div className="bg-gray-100 p-4 rounded">
            <h3 className="font-bold mb-2">Debug Results:</h3>
            <pre className="text-sm overflow-auto max-h-96">
              {JSON.stringify(debugData, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentChannelDebug;
