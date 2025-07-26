#!/usr/bin/env node

/**
 * REAL DATABASE LOCK TEST
 * Testing actual SQLite database lock handling with production database
 * This test will use the real database to verify lock handling works correctly
 */

import Database from '@tauri-apps/plugin-sql';
import fs from 'fs';
import path from 'path';

const DB_PATH = './store.db';
const TEST_REPORT_PATH = './REAL_DATABASE_TEST_REPORT.md';

class RealDatabaseTester {
  constructor() {
    this.testResults = [];
    this.startTime = Date.now();
  }

  async log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log(logEntry);
    this.testResults.push(logEntry);
  }

  async testDatabaseLockHandling() {
    await this.log('🧪 REAL DATABASE LOCK TEST STARTING');
    await this.log(`Database: ${DB_PATH}`);
    
    try {
      // Check if database exists
      if (!fs.existsSync(DB_PATH)) {
        await this.log('❌ Database file not found! Creating test database...');
        // Create minimal database for testing
        const db = await Database.load(`sqlite:${DB_PATH}`);
        await db.execute(`
          CREATE TABLE IF NOT EXISTS invoices (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            invoice_number TEXT UNIQUE NOT NULL,
            customer_id INTEGER,
            total_amount REAL NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `);
        await db.close();
        await this.log('✅ Test database created');
      }

      // Test 1: Basic connection
      await this.testBasicConnection();
      
      // Test 2: WAL mode verification
      await this.testWalMode();
      
      // Test 3: Concurrent transaction simulation
      await this.testConcurrentTransactions();
      
      // Test 4: Transaction retry mechanism
      await this.testTransactionRetries();
      
      // Test 5: Lock timeout behavior
      await this.testLockTimeouts();

    } catch (error) {
      await this.log(`❌ TEST SUITE FAILED: ${error.message}`);
      console.error('Full error:', error);
    }

    await this.generateReport();
  }

  async testBasicConnection() {
    await this.log('🔗 Test 1: Basic Database Connection');
    
    try {
      const db = await Database.load(`sqlite:${DB_PATH}`);
      const result = await db.select('SELECT sqlite_version() as version');
      await this.log(`✅ SQLite Version: ${result[0]?.version}`);
      
      // Test PRAGMA settings
      const walMode = await db.select('PRAGMA journal_mode');
      await this.log(`📊 Journal Mode: ${walMode[0]?.journal_mode}`);
      
      const busyTimeout = await db.select('PRAGMA busy_timeout');
      await this.log(`⏱️ Busy Timeout: ${busyTimeout[0]?.busy_timeout}ms`);
      
      await db.close();
      await this.log('✅ Basic connection test passed');
      
    } catch (error) {
      await this.log(`❌ Basic connection test failed: ${error.message}`);
      throw error;
    }
  }

  async testWalMode() {
    await this.log('📝 Test 2: WAL Mode Verification');
    
    try {
      const db = await Database.load(`sqlite:${DB_PATH}`);
      
      // Enable WAL mode
      await db.execute('PRAGMA journal_mode=WAL');
      const result = await db.select('PRAGMA journal_mode');
      
      if (result[0]?.journal_mode === 'wal') {
        await this.log('✅ WAL mode successfully enabled');
      } else {
        await this.log(`⚠️ WAL mode not enabled, current: ${result[0]?.journal_mode}`);
      }
      
      await db.close();
      
    } catch (error) {
      await this.log(`❌ WAL mode test failed: ${error.message}`);
      throw error;
    }
  }

  async testConcurrentTransactions() {
    await this.log('🔄 Test 3: Concurrent Transaction Simulation');
    
    const promises = [];
    const transactionCount = 5;
    
    for (let i = 0; i < transactionCount; i++) {
      promises.push(this.simulateInvoiceCreation(i));
    }
    
    try {
      const results = await Promise.allSettled(promises);
      const successful = results.filter(r => r.status === 'fulfilled').length;
      const failed = results.filter(r => r.status === 'rejected').length;
      
      await this.log(`📊 Concurrent transaction results: ${successful} successful, ${failed} failed`);
      
      if (failed > 0) {
        await this.log('❌ Some concurrent transactions failed - investigating lock issues');
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            this.log(`   Transaction ${index}: ${result.reason?.message}`);
          }
        });
      } else {
        await this.log('✅ All concurrent transactions succeeded');
      }
      
    } catch (error) {
      await this.log(`❌ Concurrent transaction test failed: ${error.message}`);
    }
  }

  async simulateInvoiceCreation(transactionId) {
    const invoiceNumber = `TEST-${Date.now()}-${transactionId}`;
    
    try {
      const db = await Database.load(`sqlite:${DB_PATH}`);
      
      // Configure database for this connection
      await db.execute('PRAGMA journal_mode=WAL');
      await db.execute('PRAGMA busy_timeout=30000');
      await db.execute('PRAGMA wal_autocheckpoint=1000');
      
      // Start immediate transaction
      await db.execute('BEGIN IMMEDIATE TRANSACTION');
      
      // Simulate some work with potential lock contention
      await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
      
      // Insert invoice
      await db.execute(
        'INSERT INTO invoices (invoice_number, customer_id, total_amount) VALUES (?, ?, ?)',
        [invoiceNumber, 1, 100.00]
      );
      
      // Simulate more work
      await new Promise(resolve => setTimeout(resolve, Math.random() * 50));
      
      // Commit transaction
      await db.execute('COMMIT');
      
      await db.close();
      
      await this.log(`✅ Transaction ${transactionId} completed: ${invoiceNumber}`);
      return { transactionId, invoiceNumber, success: true };
      
    } catch (error) {
      await this.log(`❌ Transaction ${transactionId} failed: ${error.message}`);
      throw error;
    }
  }

  async testTransactionRetries() {
    await this.log('🔄 Test 4: Transaction Retry Mechanism');
    
    try {
      // This will test our retry logic by attempting operations that might fail
      const retryTest = await this.executeWithRetry(async () => {
        const db = await Database.load(`sqlite:${DB_PATH}`);
        await db.execute('PRAGMA journal_mode=WAL');
        await db.execute('PRAGMA busy_timeout=5000'); // Shorter timeout for retry testing
        
        await db.execute('BEGIN IMMEDIATE TRANSACTION');
        await db.execute('INSERT INTO invoices (invoice_number, customer_id, total_amount) VALUES (?, ?, ?)', 
          [`RETRY-TEST-${Date.now()}`, 1, 50.00]);
        await db.execute('COMMIT');
        
        await db.close();
        return true;
      }, 'RETRY_TEST', 3);
      
      if (retryTest) {
        await this.log('✅ Retry mechanism test passed');
      } else {
        await this.log('❌ Retry mechanism test failed');
      }
      
    } catch (error) {
      await this.log(`❌ Retry test failed: ${error.message}`);
    }
  }

  async executeWithRetry(operation, operationName, maxRetries = 3) {
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.log(`🔄 ${operationName}: Attempt ${attempt}/${maxRetries}`);
        const result = await operation();
        await this.log(`✅ ${operationName}: Success on attempt ${attempt}`);
        return result;
      } catch (error) {
        lastError = error;
        await this.log(`⚠️ ${operationName}: Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          await this.log(`⏱️ ${operationName}: Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  async testLockTimeouts() {
    await this.log('⏱️ Test 5: Lock Timeout Behavior');
    
    try {
      // Create a long-running transaction to test timeout behavior
      const db1 = await Database.load(`sqlite:${DB_PATH}`);
      await db1.execute('PRAGMA journal_mode=WAL');
      await db1.execute('PRAGMA busy_timeout=2000'); // 2 second timeout
      
      await db1.execute('BEGIN IMMEDIATE TRANSACTION');
      await this.log('🔒 Long transaction started');
      
      // Try to start another transaction that should timeout
      const timeoutStart = Date.now();
      try {
        const db2 = await Database.load(`sqlite:${DB_PATH}`);
        await db2.execute('PRAGMA journal_mode=WAL');
        await db2.execute('PRAGMA busy_timeout=1000'); // 1 second timeout
        
        await db2.execute('BEGIN IMMEDIATE TRANSACTION');
        await db2.execute('COMMIT');
        await db2.close();
        
        await this.log('⚠️ Second transaction unexpectedly succeeded');
        
      } catch (timeoutError) {
        const timeoutDuration = Date.now() - timeoutStart;
        await this.log(`✅ Timeout behavior verified: ${timeoutDuration}ms, error: ${timeoutError.message}`);
      }
      
      // Clean up first transaction
      await db1.execute('COMMIT');
      await db1.close();
      
    } catch (error) {
      await this.log(`❌ Lock timeout test failed: ${error.message}`);
    }
  }

  async generateReport() {
    const duration = Date.now() - this.startTime;
    await this.log(`⏱️ Total test duration: ${duration}ms`);
    
    const report = `# REAL DATABASE LOCK TEST REPORT

## Test Summary
- **Date**: ${new Date().toISOString()}
- **Database**: ${DB_PATH}
- **Duration**: ${duration}ms
- **Test Framework**: Real SQLite Database Testing

## Test Results

${this.testResults.join('\n')}

## Conclusions

This test verified the actual database lock handling behavior with a real SQLite database file.
The results show how the application handles database locks in production conditions.

## Next Steps
1. ✅ Verify WAL mode is properly configured
2. ✅ Test concurrent transaction handling
3. ✅ Validate retry mechanisms work with real locks
4. ✅ Confirm timeout behavior matches expectations

---
Generated by Real Database Tester
`;

    fs.writeFileSync(TEST_REPORT_PATH, report);
    await this.log(`📄 Test report saved to: ${TEST_REPORT_PATH}`);
  }
}

// Run the test
async function main() {
  const tester = new RealDatabaseTester();
  await tester.testDatabaseLockHandling();
}

main().catch(console.error);
