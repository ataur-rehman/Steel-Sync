import React, { useState } from 'react';
import { Wrench, Database, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { db } from '../../services/database';
import { getCurrentSystemDateTime } from '../../utils/formatters';
import toast from 'react-hot-toast';

interface TIronTestResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
}

const TIronDebug: React.FC = () => {
    const [results, setResults] = useState<Record<string, TIronTestResult>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});

    // Test form data
    const [testData, setTestData] = useState({
        t_iron_pieces: 11,
        t_iron_length_per_piece: 12,
        unit_price: 124,
        t_iron_unit: 'pcs'
    });

    const setTestLoading = (test: string, isLoading: boolean) => {
        setLoading(prev => ({ ...prev, [test]: isLoading }));
    };

    const setTestResult = (test: string, result: TIronTestResult) => {
        setResults(prev => ({ ...prev, [test]: result }));
    };

    const testTIronSave = async () => {
        setTestLoading('save', true);
        try {
            console.log('🧪 [T-IRON DEBUG] Testing T-Iron data save...');

            // Calculate total feet
            const totalFeet = testData.t_iron_pieces * testData.t_iron_length_per_piece;
            const totalPrice = totalFeet * testData.unit_price;

            // Create test invoice item data
            const testInvoiceItem = {
                invoice_id: 999999, // Test invoice ID
                product_id: 1,
                product_name: 'T-Iron Test Item',
                quantity: totalFeet,
                unit_price: testData.unit_price,
                total_price: totalPrice,
                is_non_stock_item: true,
                t_iron_pieces: testData.t_iron_pieces,
                t_iron_length_per_piece: testData.t_iron_length_per_piece,
                t_iron_total_feet: totalFeet,
                t_iron_unit: testData.t_iron_unit
            };

            console.log('🧪 [T-IRON DEBUG] Test data to save:', testInvoiceItem);

            // Test the unified T-Iron data preparation
            await db.initialize();

            // Use the prepareTIronData method to test data processing
            const processedData = (db as any).prepareTIronData(testInvoiceItem);
            console.log('🧪 [T-IRON DEBUG] Processed T-Iron data:', processedData);

            // Try to save to a test table or just validate the processing
            const validationResult = {
                originalData: testInvoiceItem,
                processedData,
                expectedDisplay: `${testData.t_iron_pieces}${testData.t_iron_unit} × ${testData.t_iron_length_per_piece}ft/${testData.t_iron_unit} × Rs.${testData.unit_price}`,
                totalCalculation: `${testData.t_iron_pieces} × ${testData.t_iron_length_per_piece} = ${totalFeet}ft × Rs.${testData.unit_price} = Rs.${totalPrice}`
            };

            setTestResult('save', {
                success: true,
                message: 'T-Iron data processing successful!',
                data: validationResult
            });

            toast.success('T-Iron save test completed successfully!');

        } catch (error: any) {
            console.error('🧪 [T-IRON DEBUG] Save test failed:', error);
            setTestResult('save', {
                success: false,
                message: 'T-Iron save test failed',
                error: error.message
            });
            toast.error('T-Iron save test failed');
        } finally {
            setTestLoading('save', false);
        }
    };

    const testTIronSchema = async () => {
        setTestLoading('schema', true);
        try {
            console.log('🧪 [T-IRON DEBUG] Testing T-Iron schema...');

            await db.initialize();

            // Check if T-Iron columns exist in invoice_items table
            const schemaQuery = `PRAGMA table_info(invoice_items)`;
            const columns = await db.executeRawQuery(schemaQuery, []);

            const tIronColumns = columns.filter((col: any) =>
                col.name.includes('t_iron') || col.name.includes('non_stock')
            );

            console.log('🧪 [T-IRON DEBUG] T-Iron related columns:', tIronColumns);

            const requiredColumns = [
                't_iron_pieces',
                't_iron_length_per_piece',
                't_iron_total_feet',
                't_iron_unit',
                'is_non_stock_item'
            ];

            const missingColumns = requiredColumns.filter(reqCol =>
                !tIronColumns.some((col: any) => col.name === reqCol)
            );

            setTestResult('schema', {
                success: missingColumns.length === 0,
                message: missingColumns.length === 0
                    ? 'All T-Iron columns exist in database'
                    : `Missing columns: ${missingColumns.join(', ')}`,
                data: {
                    foundColumns: tIronColumns,
                    missingColumns,
                    allColumns: columns
                }
            });

            if (missingColumns.length === 0) {
                toast.success('T-Iron schema validation passed!');
            } else {
                toast.error(`Missing T-Iron columns: ${missingColumns.join(', ')}`);
            }

        } catch (error: any) {
            console.error('🧪 [T-IRON DEBUG] Schema test failed:', error);
            setTestResult('schema', {
                success: false,
                message: 'Schema validation failed',
                error: error.message
            });
            toast.error('Schema validation failed');
        } finally {
            setTestLoading('schema', false);
        }
    };

    const testSystemDateTime = async () => {
        setTestLoading('datetime', true);
        try {
            console.log('🧪 [T-IRON DEBUG] Testing system datetime...');

            await db.initialize();

            // Test the getCurrentSystemDateTime function
            const systemDateTime = getCurrentSystemDateTime();

            // Test database datetime vs system datetime
            const dbTimeQuery = `SELECT datetime('now') as db_time, datetime('now', 'localtime') as db_local_time`;
            const dbTimeResult = await db.executeRawQuery(dbTimeQuery, []);

            const comparisonData = {
                systemDateTime,
                databaseUTC: dbTimeResult[0]?.db_time,
                databaseLocal: dbTimeResult[0]?.db_local_time,
                javascriptNow: new Date().toISOString(),
                javascriptLocal: new Date().toLocaleString('en-PK', { timeZone: 'Asia/Karachi' })
            };

            console.log('🧪 [T-IRON DEBUG] DateTime comparison:', comparisonData);

            setTestResult('datetime', {
                success: true,
                message: 'DateTime comparison completed',
                data: comparisonData
            });

            toast.success('DateTime test completed!');

        } catch (error: any) {
            console.error('🧪 [T-IRON DEBUG] DateTime test failed:', error);
            setTestResult('datetime', {
                success: false,
                message: 'DateTime test failed',
                error: error.message
            });
            toast.error('DateTime test failed');
        } finally {
            setTestLoading('datetime', false);
        }
    };

    const testInvoiceItemsQuery = async () => {
        setTestLoading('query', true);
        try {
            console.log('🧪 [T-IRON DEBUG] Testing recent invoice items query...');

            await db.initialize();

            // Query recent invoice items to see actual T-Iron data
            const recentItemsQuery = `
        SELECT 
          ii.*,
          i.bill_number,
          i.customer_name,
          i.created_at as invoice_created_at
        FROM invoice_items ii
        LEFT JOIN invoices i ON ii.invoice_id = i.id
        WHERE ii.t_iron_pieces IS NOT NULL 
           OR ii.is_non_stock_item = 1
           OR ii.product_name LIKE '%iron%'
           OR ii.product_name LIKE '%Iron%'
        ORDER BY ii.created_at DESC
        LIMIT 10
      `;

            const recentItems = await db.executeRawQuery(recentItemsQuery, []);

            console.log('🧪 [T-IRON DEBUG] Recent T-Iron items:', recentItems);

            setTestResult('query', {
                success: true,
                message: `Found ${recentItems.length} T-Iron related items`,
                data: {
                    items: recentItems,
                    summary: recentItems.map((item: any) => ({
                        bill_number: item.bill_number,
                        product_name: item.product_name,
                        t_iron_pieces: item.t_iron_pieces,
                        t_iron_length_per_piece: item.t_iron_length_per_piece,
                        t_iron_total_feet: item.t_iron_total_feet,
                        quantity: item.quantity,
                        unit_price: item.unit_price,
                        is_non_stock_item: item.is_non_stock_item
                    }))
                }
            });

            toast.success(`Found ${recentItems.length} T-Iron items in database`);

        } catch (error: any) {
            console.error('🧪 [T-IRON DEBUG] Query test failed:', error);
            setTestResult('query', {
                success: false,
                message: 'Invoice items query failed',
                error: error.message
            });
            toast.error('Query test failed');
        } finally {
            setTestLoading('query', false);
        }
    };

    const ResultCard: React.FC<{ test: string; result: TIronTestResult }> = ({ test, result }) => (
        <div className={`p-4 rounded-lg border ${result.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center mb-2">
                {result.success ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                    <XCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <h4 className="font-medium">{test.charAt(0).toUpperCase() + test.slice(1)} Test</h4>
            </div>
            <p className={`text-sm ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                {result.message}
            </p>
            {result.error && (
                <p className="text-xs text-red-600 mt-1 font-mono">{result.error}</p>
            )}
            {result.data && (
                <details className="mt-2">
                    <summary className="text-xs text-gray-600 cursor-pointer">View Details</summary>
                    <pre className="text-xs bg-gray-100 p-2 rounded mt-1 overflow-auto max-h-40">
                        {JSON.stringify(result.data, null, 2)}
                    </pre>
                </details>
            )}
        </div>
    );

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <div className="mb-8">
                <div className="flex items-center mb-4">
                    <Wrench className="h-6 w-6 text-blue-600 mr-3" />
                    <h1 className="text-2xl font-bold text-gray-900">T-Iron Debug Tool</h1>
                </div>
                <p className="text-gray-600">
                    Debug T-Iron data flow, schema validation, and datetime handling within the Tauri app context.
                </p>
            </div>

            {/* Test Form */}
            <div className="bg-white rounded-lg shadow border border-gray-200 p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">T-Iron Test Data</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Pieces</label>
                        <input
                            type="number"
                            value={testData.t_iron_pieces}
                            onChange={(e) => setTestData(prev => ({ ...prev, t_iron_pieces: parseInt(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="11"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Length per Piece (ft)</label>
                        <input
                            type="number"
                            value={testData.t_iron_length_per_piece}
                            onChange={(e) => setTestData(prev => ({ ...prev, t_iron_length_per_piece: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="12"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price (Rs.)</label>
                        <input
                            type="number"
                            value={testData.unit_price}
                            onChange={(e) => setTestData(prev => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            placeholder="124"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                        <select
                            value={testData.t_iron_unit}
                            onChange={(e) => setTestData(prev => ({ ...prev, t_iron_unit: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                        >
                            <option value="pcs">pcs</option>
                            <option value="pieces">pieces</option>
                        </select>
                    </div>
                </div>
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-700">
                        <strong>Expected Display:</strong> {testData.t_iron_pieces}{testData.t_iron_unit} × {testData.t_iron_length_per_piece}ft/{testData.t_iron_unit} × Rs.{testData.unit_price}
                    </p>
                    <p className="text-sm text-blue-700 mt-1">
                        <strong>Total:</strong> {testData.t_iron_pieces} × {testData.t_iron_length_per_piece} = {testData.t_iron_pieces * testData.t_iron_length_per_piece}ft × Rs.{testData.unit_price} = Rs.{(testData.t_iron_pieces * testData.t_iron_length_per_piece * testData.unit_price).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Test Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <button
                    onClick={testTIronSave}
                    disabled={loading.save}
                    className="flex items-center justify-center px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                    <Database className="h-4 w-4 mr-2" />
                    {loading.save ? 'Testing...' : 'Test T-Iron Save'}
                </button>

                <button
                    onClick={testTIronSchema}
                    disabled={loading.schema}
                    className="flex items-center justify-center px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                    <Database className="h-4 w-4 mr-2" />
                    {loading.schema ? 'Checking...' : 'Check T-Iron Schema'}
                </button>

                <button
                    onClick={testSystemDateTime}
                    disabled={loading.datetime}
                    className="flex items-center justify-center px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                    <Clock className="h-4 w-4 mr-2" />
                    {loading.datetime ? 'Testing...' : 'Test System DateTime'}
                </button>

                <button
                    onClick={testInvoiceItemsQuery}
                    disabled={loading.query}
                    className="flex items-center justify-center px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                    <Database className="h-4 w-4 mr-2" />
                    {loading.query ? 'Querying...' : 'Query T-Iron Items'}
                </button>
            </div>

            {/* Results */}
            {Object.keys(results).length > 0 && (
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-900">Test Results</h2>
                    {Object.entries(results).map(([test, result]) => (
                        <ResultCard key={test} test={test} result={result} />
                    ))}
                </div>
            )}

            {/* Instructions */}
            <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 mr-3" />
                    <div>
                        <h3 className="text-sm font-medium text-yellow-800">Debug Instructions</h3>
                        <div className="text-sm text-yellow-700 mt-1 space-y-1">
                            <p>1. <strong>Test T-Iron Save:</strong> Validates unified T-Iron data processing</p>
                            <p>2. <strong>Check T-Iron Schema:</strong> Verifies database has required T-Iron columns</p>
                            <p>3. <strong>Test System DateTime:</strong> Compares system vs database datetime handling</p>
                            <p>4. <strong>Query T-Iron Items:</strong> Shows actual T-Iron data in the database</p>
                            <p className="mt-2 text-yellow-800"><strong>This tool runs within the Tauri app context and has full database access.</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default TIronDebug;
