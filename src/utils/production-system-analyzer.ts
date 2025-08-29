// COMPREHENSIVE PRODUCTION SYSTEM ANALYSIS
// Critical Business Logic Analyzer for Invoice Balance System

import { db } from '../services/database';

interface SystemIssue {
    severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    category: string;
    issue: string;
    impact: string;
    recommendation: string;
    sqlQuery?: string;
    data?: any[];
}

interface AnalysisReport {
    overallStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY';
    totalIssues: number;
    criticalIssues: number;
    issues: SystemIssue[];
    dataIntegrityScore: number;
    businessLogicScore: number;
    performanceScore: number;
}

export class ProductionSystemAnalyzer {

    static async performComprehensiveAnalysis(): Promise<AnalysisReport> {
        console.log('🏭 === PRODUCTION SYSTEM COMPREHENSIVE ANALYSIS ===');
        console.log('⚠️ ANALYZING CRITICAL BUSINESS LOGIC AND DATA INTEGRITY');

        const issues: SystemIssue[] = [];

        // 1. Database Schema Integrity
        issues.push(...await this.analyzeDatabaseSchema());

        // 2. Data Consistency Analysis
        issues.push(...await this.analyzeDataConsistency());

        // 3. Business Logic Validation
        issues.push(...await this.analyzeBusinessLogic());

        // 4. Financial Calculation Integrity
        issues.push(...await this.analyzeFinancialIntegrity());

        // 5. Trigger and Constraint Analysis
        issues.push(...await this.analyzeTriggerIntegrity());

        // 6. Performance and Scalability
        issues.push(...await this.analyzePerformance());

        // 7. Data Corruption Detection
        issues.push(...await this.analyzeDataCorruption());

        // Generate comprehensive report
        const report = this.generateReport(issues);
        this.printDetailedReport(report);

        return report;
    }

    // 1. DATABASE SCHEMA INTEGRITY
    static async analyzeDatabaseSchema(): Promise<SystemIssue[]> {
        console.log('\n📊 === ANALYZING DATABASE SCHEMA INTEGRITY ===');
        const issues: SystemIssue[] = [];

        try {
            // Check critical tables exist
            const tables = await db.executeRawQuery(`
        SELECT name FROM sqlite_master WHERE type='table'
      `);

            const criticalTables = ['invoices', 'invoice_items', 'return_items', 'customers', 'products'];
            const existingTables = tables.map(t => t.name);

            for (const table of criticalTables) {
                if (!existingTables.includes(table)) {
                    issues.push({
                        severity: 'CRITICAL',
                        category: 'DATABASE_SCHEMA',
                        issue: `Critical table '${table}' is missing`,
                        impact: 'System cannot function without this table',
                        recommendation: 'Restore table from backup or recreate schema'
                    });
                }
            }

            // Check foreign key constraints
            const fkCheck = await db.executeRawQuery(`PRAGMA foreign_keys`);
            if (!fkCheck[0] || !fkCheck[0].foreign_keys) {
                issues.push({
                    severity: 'HIGH',
                    category: 'DATABASE_SCHEMA',
                    issue: 'Foreign key constraints are disabled',
                    impact: 'Data integrity cannot be enforced at database level',
                    recommendation: 'Enable foreign key constraints: PRAGMA foreign_keys = ON'
                });
            }

            // Check invoice table structure
            const invoiceColumns = await db.executeRawQuery(`PRAGMA table_info(invoices)`);
            const requiredColumns = ['id', 'bill_number', 'grand_total', 'remaining_balance', 'payment_amount', 'customer_id'];
            const existingColumns = invoiceColumns.map(col => col.name);

            for (const col of requiredColumns) {
                if (!existingColumns.includes(col)) {
                    issues.push({
                        severity: 'CRITICAL',
                        category: 'DATABASE_SCHEMA',
                        issue: `Required column '${col}' missing from invoices table`,
                        impact: 'Core billing functionality will fail',
                        recommendation: `Add missing column: ALTER TABLE invoices ADD COLUMN ${col}`
                    });
                }
            }

        } catch (error) {
            issues.push({
                severity: 'CRITICAL',
                category: 'DATABASE_SCHEMA',
                issue: 'Cannot access database schema',
                impact: 'Database may be corrupted or inaccessible',
                recommendation: 'Check database file permissions and integrity'
            });
        }

        return issues;
    }

    // 2. DATA CONSISTENCY ANALYSIS
    static async analyzeDataConsistency(): Promise<SystemIssue[]> {
        console.log('\n🔍 === ANALYZING DATA CONSISTENCY ===');
        const issues: SystemIssue[] = [];

        try {
            // Check for orphaned invoice items
            const orphanedItems = await db.executeRawQuery(`
        SELECT COUNT(*) as count FROM invoice_items ii
        LEFT JOIN invoices i ON ii.invoice_id = i.id
        WHERE i.id IS NULL
      `);

            if (orphanedItems[0].count > 0) {
                issues.push({
                    severity: 'HIGH',
                    category: 'DATA_CONSISTENCY',
                    issue: `${orphanedItems[0].count} orphaned invoice items found`,
                    impact: 'Orphaned data can cause calculation errors',
                    recommendation: 'Clean up orphaned records or restore missing parent records',
                    data: orphanedItems
                });
            }

            // Check for orphaned return items
            const orphanedReturns = await db.executeRawQuery(`
        SELECT COUNT(*) as count FROM return_items ri
        LEFT JOIN invoice_items ii ON ri.original_invoice_item_id = ii.id
        WHERE ii.id IS NULL
      `);

            if (orphanedReturns[0].count > 0) {
                issues.push({
                    severity: 'CRITICAL',
                    category: 'DATA_CONSISTENCY',
                    issue: `${orphanedReturns[0].count} orphaned return items found`,
                    impact: 'Returns cannot be properly linked to invoices, causing balance calculation errors',
                    recommendation: 'URGENT: Fix orphaned return items or recalculate all balances',
                    data: orphanedReturns
                });
            }

            // Check for null critical values
            const nullGrandTotals = await db.executeRawQuery(`
        SELECT COUNT(*) as count FROM invoices WHERE grand_total IS NULL
      `);

            if (nullGrandTotals[0].count > 0) {
                issues.push({
                    severity: 'CRITICAL',
                    category: 'DATA_CONSISTENCY',
                    issue: `${nullGrandTotals[0].count} invoices have NULL grand_total`,
                    impact: 'Cannot calculate balances for invoices with NULL totals',
                    recommendation: 'Fix NULL grand_total values immediately'
                });
            }

            // Check for duplicate bill numbers
            const duplicateBills = await db.executeRawQuery(`
        SELECT bill_number, COUNT(*) as count 
        FROM invoices 
        GROUP BY bill_number 
        HAVING COUNT(*) > 1
      `);

            if (duplicateBills.length > 0) {
                issues.push({
                    severity: 'HIGH',
                    category: 'DATA_CONSISTENCY',
                    issue: `${duplicateBills.length} duplicate bill numbers found`,
                    impact: 'Duplicate bill numbers can cause confusion and reporting errors',
                    recommendation: 'Implement unique constraint on bill_number',
                    data: duplicateBills
                });
            }

        } catch (error) {
            issues.push({
                severity: 'CRITICAL',
                category: 'DATA_CONSISTENCY',
                issue: 'Cannot analyze data consistency',
                impact: 'Unknown data integrity status',
                recommendation: 'Check database accessibility and run manual data validation'
            });
        }

        return issues;
    }

    // 3. BUSINESS LOGIC VALIDATION
    static async analyzeBusinessLogic(): Promise<SystemIssue[]> {
        console.log('\n💼 === ANALYZING BUSINESS LOGIC INTEGRITY ===');
        const issues: SystemIssue[] = [];

        try {
            // Check for negative quantities
            const negativeQuantities = await db.executeRawQuery(`
        SELECT COUNT(*) as count FROM invoice_items WHERE quantity < 0
      `);

            if (negativeQuantities[0].count > 0) {
                issues.push({
                    severity: 'HIGH',
                    category: 'BUSINESS_LOGIC',
                    issue: `${negativeQuantities[0].count} invoice items have negative quantities`,
                    impact: 'Negative quantities can cause incorrect calculations',
                    recommendation: 'Review and fix negative quantity items'
                });
            }

            // Check for negative return quantities
            const negativeReturns = await db.executeRawQuery(`
        SELECT COUNT(*) as count FROM return_items WHERE return_quantity < 0
      `);

            if (negativeReturns[0].count > 0) {
                issues.push({
                    severity: 'HIGH',
                    category: 'BUSINESS_LOGIC',
                    issue: `${negativeReturns[0].count} return items have negative quantities`,
                    impact: 'Negative returns can cause balance calculation errors',
                    recommendation: 'Fix negative return quantities'
                });
            }

            // Check for returns exceeding original quantity
            const excessiveReturns = await db.executeRawQuery(`
        SELECT 
          ii.id,
          ii.quantity as original_qty,
          COALESCE(SUM(ri.return_quantity), 0) as total_returned,
          ii.invoice_id
        FROM invoice_items ii
        LEFT JOIN return_items ri ON ri.original_invoice_item_id = ii.id
        GROUP BY ii.id, ii.quantity, ii.invoice_id
        HAVING COALESCE(SUM(ri.return_quantity), 0) > ii.quantity
      `);

            if (excessiveReturns.length > 0) {
                issues.push({
                    severity: 'CRITICAL',
                    category: 'BUSINESS_LOGIC',
                    issue: `${excessiveReturns.length} items have returns exceeding original quantity`,
                    impact: 'CRITICAL: Returns exceed sold quantities, causing negative inventory and incorrect balances',
                    recommendation: 'URGENT: Review and fix excessive return quantities',
                    data: excessiveReturns
                });
            }

            // Check for zero or negative prices
            const invalidPrices = await db.executeRawQuery(`
        SELECT COUNT(*) as count FROM invoice_items WHERE unit_price <= 0
      `);

            if (invalidPrices[0].count > 0) {
                issues.push({
                    severity: 'MEDIUM',
                    category: 'BUSINESS_LOGIC',
                    issue: `${invalidPrices[0].count} items have zero or negative prices`,
                    impact: 'Can cause incorrect revenue calculations',
                    recommendation: 'Review pricing data for validity'
                });
            }

        } catch (error) {
            issues.push({
                severity: 'HIGH',
                category: 'BUSINESS_LOGIC',
                issue: 'Cannot analyze business logic',
                impact: 'Business rule violations may exist',
                recommendation: 'Manual review of business logic required'
            });
        }

        return issues;
    }

    // 4. FINANCIAL CALCULATION INTEGRITY
    static async analyzeFinancialIntegrity(): Promise<SystemIssue[]> {
        console.log('\n💰 === ANALYZING FINANCIAL CALCULATION INTEGRITY ===');
        const issues: SystemIssue[] = [];

        try {
            // Find invoices with balance calculation errors
            const balanceErrors = await db.executeRawQuery(`
        SELECT 
          i.id,
          i.bill_number,
          i.grand_total,
          i.remaining_balance as current_balance,
          COALESCE(i.payment_amount, 0) as payment_amount,
          COALESCE(SUM(ri.return_quantity * ri.unit_price), 0) as total_returned,
          ROUND(
            i.grand_total - 
            COALESCE(SUM(ri.return_quantity * ri.unit_price), 0) - 
            COALESCE(i.payment_amount, 0), 2
          ) as correct_balance,
          ABS(
            i.remaining_balance - 
            ROUND(
              i.grand_total - 
              COALESCE(SUM(ri.return_quantity * ri.unit_price), 0) - 
              COALESCE(i.payment_amount, 0), 2
            )
          ) as balance_error
        FROM invoices i
        LEFT JOIN invoice_items ii ON i.id = ii.invoice_id
        LEFT JOIN return_items ri ON ii.id = ri.original_invoice_item_id
        GROUP BY i.id, i.bill_number, i.grand_total, i.remaining_balance, i.payment_amount
        HAVING ABS(
          i.remaining_balance - 
          ROUND(
            i.grand_total - 
            COALESCE(SUM(ri.return_quantity * ri.unit_price), 0) - 
            COALESCE(i.payment_amount, 0), 2
          )
        ) > 0.01
        ORDER BY balance_error DESC
      `);

            if (balanceErrors.length > 0) {
                const totalErrorAmount = balanceErrors.reduce((sum, inv) => sum + inv.balance_error, 0);
                issues.push({
                    severity: 'CRITICAL',
                    category: 'FINANCIAL_INTEGRITY',
                    issue: `${balanceErrors.length} invoices have incorrect balance calculations`,
                    impact: `CRITICAL FINANCIAL IMPACT: Total calculation errors of Rs. ${totalErrorAmount.toFixed(2)}`,
                    recommendation: 'URGENT: Recalculate all invoice balances and review calculation logic',
                    data: balanceErrors.slice(0, 10) // Show first 10 for analysis
                });
            }

            // Check for payments exceeding invoice total
            const excessivePayments = await db.executeRawQuery(`
        SELECT 
          id, bill_number, grand_total, payment_amount,
          (payment_amount - grand_total) as excess_amount
        FROM invoices 
        WHERE payment_amount > grand_total
      `);

            if (excessivePayments.length > 0) {
                issues.push({
                    severity: 'HIGH',
                    category: 'FINANCIAL_INTEGRITY',
                    issue: `${excessivePayments.length} invoices have payments exceeding total amount`,
                    impact: 'Overpayments may indicate data entry errors or system bugs',
                    recommendation: 'Review overpayment cases and implement payment validation',
                    data: excessivePayments
                });
            }

            // Check customer balance consistency
            const customerBalanceErrors = await db.executeRawQuery(`
        SELECT 
          c.id,
          c.name,
          c.balance as stored_balance,
          COALESCE(SUM(i.remaining_balance), 0) as calculated_balance,
          ABS(c.balance - COALESCE(SUM(i.remaining_balance), 0)) as balance_diff
        FROM customers c
        LEFT JOIN invoices i ON c.id = i.customer_id
        GROUP BY c.id, c.name, c.balance
        HAVING ABS(c.balance - COALESCE(SUM(i.remaining_balance), 0)) > 0.01
      `);

            if (customerBalanceErrors.length > 0) {
                issues.push({
                    severity: 'HIGH',
                    category: 'FINANCIAL_INTEGRITY',
                    issue: `${customerBalanceErrors.length} customers have balance inconsistencies`,
                    impact: 'Customer balance reports will be incorrect',
                    recommendation: 'Recalculate customer balances from invoice data',
                    data: customerBalanceErrors
                });
            }

        } catch (error) {
            issues.push({
                severity: 'CRITICAL',
                category: 'FINANCIAL_INTEGRITY',
                issue: 'Cannot analyze financial integrity',
                impact: 'Financial data integrity unknown - CRITICAL RISK',
                recommendation: 'URGENT: Manual financial audit required'
            });
        }

        return issues;
    }

    // 5. TRIGGER AND CONSTRAINT ANALYSIS
    static async analyzeTriggerIntegrity(): Promise<SystemIssue[]> {
        console.log('\n🔧 === ANALYZING TRIGGER AND CONSTRAINT INTEGRITY ===');
        const issues: SystemIssue[] = [];

        try {
            // Check for required triggers
            const triggers = await db.executeRawQuery(`
        SELECT name, tbl_name, sql FROM sqlite_master WHERE type='trigger'
      `);

            const requiredTriggers = [
                'trg_return_items_balance_update',
                'trg_invoice_payment_balance_update',
                'trg_return_items_balance_update_delete'
            ];

            const existingTriggers = triggers.map(t => t.name);

            for (const triggerName of requiredTriggers) {
                if (!existingTriggers.includes(triggerName)) {
                    issues.push({
                        severity: 'CRITICAL',
                        category: 'TRIGGER_INTEGRITY',
                        issue: `Required trigger '${triggerName}' is missing`,
                        impact: 'CRITICAL: Balance calculations will not update automatically',
                        recommendation: 'URGENT: Create missing triggers to maintain data consistency'
                    });
                }
            }

            // Check trigger quality
            for (const trigger of triggers) {
                if (trigger.sql && !trigger.sql.includes('remaining_balance')) {
                    if (trigger.name.includes('balance') || trigger.name.includes('payment') || trigger.name.includes('return')) {
                        issues.push({
                            severity: 'HIGH',
                            category: 'TRIGGER_INTEGRITY',
                            issue: `Trigger '${trigger.name}' may not update remaining_balance`,
                            impact: 'Trigger exists but may not maintain balance consistency',
                            recommendation: 'Review trigger logic for remaining_balance updates'
                        });
                    }
                }
            }

        } catch (error) {
            issues.push({
                severity: 'HIGH',
                category: 'TRIGGER_INTEGRITY',
                issue: 'Cannot analyze triggers',
                impact: 'Trigger integrity unknown',
                recommendation: 'Manual trigger review required'
            });
        }

        return issues;
    }

    // 6. PERFORMANCE ANALYSIS
    static async analyzePerformance(): Promise<SystemIssue[]> {
        console.log('\n⚡ === ANALYZING PERFORMANCE AND SCALABILITY ===');
        const issues: SystemIssue[] = [];

        try {
            // Check table sizes
            const tableSizes = await db.executeRawQuery(`
        SELECT 
          name,
          (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name = outer_table.name) as record_count
        FROM sqlite_master outer_table WHERE type='table'
      `);

            // Check for missing indexes on critical columns
            const indexes = await db.executeRawQuery(`
        SELECT name, tbl_name, sql FROM sqlite_master WHERE type='index'
      `);

            const criticalIndexes = [
                { table: 'invoices', column: 'customer_id' },
                { table: 'invoice_items', column: 'invoice_id' },
                { table: 'return_items', column: 'original_invoice_item_id' },
                { table: 'invoices', column: 'bill_number' }
            ];

            for (const idx of criticalIndexes) {
                const indexExists = indexes.some(i =>
                    i.sql && i.sql.includes(idx.table) && i.sql.includes(idx.column)
                );

                if (!indexExists) {
                    issues.push({
                        severity: 'MEDIUM',
                        category: 'PERFORMANCE',
                        issue: `Missing index on ${idx.table}.${idx.column}`,
                        impact: 'Slow query performance, especially with large datasets',
                        recommendation: `Create index: CREATE INDEX idx_${idx.table}_${idx.column} ON ${idx.table}(${idx.column})`
                    });
                }
            }

        } catch (error) {
            issues.push({
                severity: 'LOW',
                category: 'PERFORMANCE',
                issue: 'Cannot analyze performance',
                impact: 'Performance optimization opportunities unknown',
                recommendation: 'Manual performance review recommended'
            });
        }

        return issues;
    }

    // 7. DATA CORRUPTION DETECTION
    static async analyzeDataCorruption(): Promise<SystemIssue[]> {
        console.log('\n🚨 === ANALYZING DATA CORRUPTION ===');
        const issues: SystemIssue[] = [];

        try {
            // Database integrity check
            const integrityCheck = await db.executeRawQuery(`PRAGMA integrity_check`);

            if (integrityCheck[0].integrity_check !== 'ok') {
                issues.push({
                    severity: 'CRITICAL',
                    category: 'DATA_CORRUPTION',
                    issue: 'Database integrity check failed',
                    impact: 'CRITICAL: Database may be corrupted',
                    recommendation: 'URGENT: Backup current data and restore from known good backup',
                    data: integrityCheck
                });
            }

            // Check for impossible data combinations
            const impossibleData = await db.executeRawQuery(`
        SELECT COUNT(*) as count FROM invoices 
        WHERE remaining_balance < 0 AND payment_amount >= grand_total
      `);

            if (impossibleData[0].count > 0) {
                issues.push({
                    severity: 'HIGH',
                    category: 'DATA_CORRUPTION',
                    issue: `${impossibleData[0].count} invoices have impossible balance/payment combinations`,
                    impact: 'Data inconsistency indicates potential corruption',
                    recommendation: 'Investigate and fix impossible data combinations'
                });
            }

        } catch (error) {
            issues.push({
                severity: 'HIGH',
                category: 'DATA_CORRUPTION',
                issue: 'Cannot check for data corruption',
                impact: 'Data corruption status unknown',
                recommendation: 'Manual corruption check required'
            });
        }

        return issues;
    }

    // GENERATE COMPREHENSIVE REPORT
    static generateReport(issues: SystemIssue[]): AnalysisReport {
        const criticalIssues = issues.filter(i => i.severity === 'CRITICAL').length;
        const highIssues = issues.filter(i => i.severity === 'HIGH').length;

        let overallStatus: 'CRITICAL' | 'WARNING' | 'HEALTHY' = 'HEALTHY';
        if (criticalIssues > 0) overallStatus = 'CRITICAL';
        else if (highIssues > 0) overallStatus = 'WARNING';

        // Calculate scores
        const dataIntegrityScore = Math.max(0, 100 - (criticalIssues * 50) - (highIssues * 20));
        const businessLogicScore = Math.max(0, 100 - (issues.filter(i => i.category === 'BUSINESS_LOGIC').length * 25));
        const performanceScore = Math.max(0, 100 - (issues.filter(i => i.category === 'PERFORMANCE').length * 15));

        return {
            overallStatus,
            totalIssues: issues.length,
            criticalIssues,
            issues,
            dataIntegrityScore,
            businessLogicScore,
            performanceScore
        };
    }

    static printDetailedReport(report: AnalysisReport) {
        console.log('\n🏭 === PRODUCTION SYSTEM ANALYSIS REPORT ===');
        console.log(`📊 Overall Status: ${report.overallStatus}`);
        console.log(`🔍 Total Issues Found: ${report.totalIssues}`);
        console.log(`🚨 Critical Issues: ${report.criticalIssues}`);
        console.log(`📈 Data Integrity Score: ${report.dataIntegrityScore}/100`);
        console.log(`💼 Business Logic Score: ${report.businessLogicScore}/100`);
        console.log(`⚡ Performance Score: ${report.performanceScore}/100`);

        if (report.criticalIssues > 0) {
            console.log('\n🚨 === CRITICAL ISSUES REQUIRING IMMEDIATE ATTENTION ===');
            report.issues.filter(i => i.severity === 'CRITICAL').forEach((issue, index) => {
                console.log(`\n${index + 1}. ${issue.issue}`);
                console.log(`   Category: ${issue.category}`);
                console.log(`   Impact: ${issue.impact}`);
                console.log(`   Recommendation: ${issue.recommendation}`);
                if (issue.data) {
                    console.log(`   Data Sample:`, issue.data.slice(0, 3));
                }
            });
        }

        console.log('\n📋 === COMPLETE ISSUE BREAKDOWN ===');
        const categories = [...new Set(report.issues.map(i => i.category))];
        categories.forEach(category => {
            const categoryIssues = report.issues.filter(i => i.category === category);
            console.log(`\n📂 ${category}: ${categoryIssues.length} issues`);
            categoryIssues.forEach(issue => {
                console.log(`   ${issue.severity}: ${issue.issue}`);
            });
        });
    }
}
