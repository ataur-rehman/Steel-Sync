import React, { useState, useEffect } from 'react';
import { db } from '../../services/database';

/**
 * Simple Database Debug Component
 * Check if database connection and products table exists
 */

const DatabaseDebug: React.FC = () => {
    const [dbStatus, setDbStatus] = useState<string>('Checking...');
    const [productCount, setProductCount] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);

    const checkDatabase = async () => {
        try {
            console.log('🔍 Checking database connection...');

            // Check if products table exists
            const tables = await db.executeSmartQuery(`
                SELECT name FROM sqlite_master 
                WHERE type='table' AND name='products'
            `);

            if (tables.length === 0) {
                setDbStatus('❌ Products table not found');
                setError('Products table does not exist. Please run the app to create database schema.');
                return;
            }

            setDbStatus('✅ Products table exists');

            // Get product count
            const countResult = await db.executeSmartQuery('SELECT COUNT(*) as count FROM products');
            const count = (countResult[0] as any)?.count || 0;
            setProductCount(count);

            console.log(`📊 Products in database: ${count}`);

        } catch (err: any) {
            console.error('❌ Database error:', err);
            setError(err.message || 'Database connection failed');
            setDbStatus('❌ Database connection failed');
        }
    };

    useEffect(() => {
        checkDatabase();
    }, []);

    return (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg mb-4">
            <h3 className="font-bold text-blue-800 mb-2">🔧 Database Debug Info</h3>
            <div className="space-y-2 text-sm">
                <div><strong>Status:</strong> {dbStatus}</div>
                {productCount !== null && (
                    <div><strong>Product Count:</strong> {productCount}</div>
                )}
                {error && (
                    <div className="text-red-600"><strong>Error:</strong> {error}</div>
                )}
                <button
                    onClick={checkDatabase}
                    className="px-3 py-1 bg-blue-500 text-white rounded text-xs"
                >
                    Refresh Check
                </button>
            </div>
        </div>
    );
};

export default DatabaseDebug;
