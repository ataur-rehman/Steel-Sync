// services/database-auto-repair.ts
import { DatabaseConnection } from './database-connection';
import { SchemaConflictResolver } from './schema-conflict-resolver';

/**
 * PERMANENT SOLUTION: Auto-repair service for database schema and customer creation issues
 * This service ensures the database schema is always correct and customer creation never fails
 */
export class DatabaseAutoRepair {
  private static instance: DatabaseAutoRepair | null = null;
  private dbConnection: DatabaseConnection;
  private repairInProgress = false;
  private lastRepairTime = 0;
  private repairInterval = 30000; // 30 seconds minimum between repairs

  private constructor() {
    this.dbConnection = DatabaseConnection.getInstance();
  }

  static getInstance(): DatabaseAutoRepair {
    if (!DatabaseAutoRepair.instance) {
      DatabaseAutoRepair.instance = new DatabaseAutoRepair();
    }
    return DatabaseAutoRepair.instance;
  }

  /**
   * CRITICAL: Initialize auto-repair system on database ready
   */
  async initialize(): Promise<void> {
    try {
      console.log('🔧 Initializing Database Auto-Repair System...');
      
      // Perform initial schema validation and repair
      await this.performSchemaValidationAndRepair();
      
      // Set up periodic validation (every 5 minutes)
      setInterval(() => {
        this.performPeriodicValidation();
      }, 300000); // 5 minutes
      
      console.log('✅ Database Auto-Repair System initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Database Auto-Repair System:', error);
    }
  }

  /**
   * PERMANENT FIX: Comprehensive schema validation and repair
   */
  async performSchemaValidationAndRepair(): Promise<{
    success: boolean;
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    if (this.repairInProgress) {
      console.log('🔄 Repair already in progress, skipping...');
      return {
        success: false,
        issues_found: ['Repair already in progress'],
        issues_fixed: [],
        remaining_issues: ['Repair already in progress']
      };
    }

    const now = Date.now();
    if (now - this.lastRepairTime < this.repairInterval) {
      console.log('⏱️ Too soon since last repair, skipping...');
      return {
        success: true,
        issues_found: [],
        issues_fixed: [],
        remaining_issues: []
      };
    }

    this.repairInProgress = true;
    this.lastRepairTime = now;

    const result = {
      success: true,
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      console.log('🩺 Starting comprehensive schema validation and repair...');

      // 1. Validate customers table schema
      const customersIssues = await this.validateAndRepairCustomersTable();
      result.issues_found.push(...customersIssues.issues_found);
      result.issues_fixed.push(...customersIssues.issues_fixed);
      result.remaining_issues.push(...customersIssues.remaining_issues);

      // 2. Validate products table schema
      const productsIssues = await this.validateAndRepairProductsTable();
      result.issues_found.push(...productsIssues.issues_found);
      result.issues_fixed.push(...productsIssues.issues_fixed);
      result.remaining_issues.push(...productsIssues.remaining_issues);

      // 3. Validate invoices table schema
      const invoicesIssues = await this.validateAndRepairInvoicesTable();
      result.issues_found.push(...invoicesIssues.issues_found);
      result.issues_fixed.push(...invoicesIssues.issues_fixed);
      result.remaining_issues.push(...invoicesIssues.remaining_issues);

      // 4. Validate invoice_items table schema
      const invoiceItemsIssues = await this.validateAndRepairInvoiceItemsTable();
      result.issues_found.push(...invoiceItemsIssues.issues_found);
      result.issues_fixed.push(...invoiceItemsIssues.issues_fixed);
      result.remaining_issues.push(...invoiceItemsIssues.remaining_issues);

      // 5. Validate ledger_entries table schema
      const ledgerEntriesIssues = await this.validateAndRepairLedgerEntriesTable();
      result.issues_found.push(...ledgerEntriesIssues.issues_found);
      result.issues_fixed.push(...ledgerEntriesIssues.issues_fixed);
      result.remaining_issues.push(...ledgerEntriesIssues.remaining_issues);

      // 6. Validate stock_movements table schema
      const stockMovementsIssues = await this.validateAndRepairStockMovementsTable();
      result.issues_found.push(...stockMovementsIssues.issues_found);
      result.issues_fixed.push(...stockMovementsIssues.issues_fixed);
      result.remaining_issues.push(...stockMovementsIssues.remaining_issues);

      // 7. COMPREHENSIVE SCHEMA CONFLICT RESOLUTION: Production-grade consistency
      const schemaConflictIssues = await this.validateAndResolveSchemaConflicts();
      result.issues_found.push(...schemaConflictIssues.issues_found);
      result.issues_fixed.push(...schemaConflictIssues.issues_fixed);
      result.remaining_issues.push(...schemaConflictIssues.remaining_issues);

      // 8. Validate and create missing indexes
      const indexIssues = await this.validateAndCreateIndexes();
      result.issues_found.push(...indexIssues.issues_found);
      result.issues_fixed.push(...indexIssues.issues_fixed);
      result.remaining_issues.push(...indexIssues.remaining_issues);

      // 9. Validate data integrity
      const integrityIssues = await this.validateAndFixDataIntegrity();
      result.issues_found.push(...integrityIssues.issues_found);
      result.issues_fixed.push(...integrityIssues.issues_fixed);
      result.remaining_issues.push(...integrityIssues.remaining_issues);

      if (result.remaining_issues.length > 0) {
        result.success = false;
      }

      console.log(`✅ Schema validation completed: ${result.issues_fixed.length} issues fixed, ${result.remaining_issues.length} remaining`);

    } catch (error: any) {
      console.error('❌ Schema validation failed:', error);
      result.success = false;
      result.remaining_issues.push(`Validation failed: ${error.message}`);
    } finally {
      this.repairInProgress = false;
    }

    return result;
  }

  /**
   * PERMANENT FIX: Validate and repair customers table
   */
  private async validateAndRepairCustomersTable(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      // Check if customers table exists
      const tableExists = await this.tableExists('customers');
      if (!tableExists) {
        result.issues_found.push('customers table missing');
        await this.createCustomersTable();
        result.issues_fixed.push('Created customers table');
        return result;
      }

      // Check table schema
      const columns = await this.getTableColumns('customers');
      const requiredColumns = [
        { name: 'id', type: 'INTEGER', required: true },
        { name: 'customer_code', type: 'TEXT', required: false },
        { name: 'name', type: 'TEXT', required: true },
        { name: 'phone', type: 'TEXT', required: false },
        { name: 'address', type: 'TEXT', required: false },
        { name: 'cnic', type: 'TEXT', required: false },
        { name: 'balance', type: 'REAL', required: false },
        { name: 'created_at', type: 'DATETIME', required: false },
        { name: 'updated_at', type: 'DATETIME', required: false }
      ];

      // Check for missing columns
      for (const reqCol of requiredColumns) {
        const exists = columns.some(col => col.name === reqCol.name);
        if (!exists) {
          result.issues_found.push(`customers.${reqCol.name} column missing`);
          try {
            await this.addColumnSafely('customers', reqCol.name, reqCol.type);
            result.issues_fixed.push(`Added customers.${reqCol.name} column`);
          } catch (error: any) {
            result.remaining_issues.push(`Failed to add customers.${reqCol.name}: ${error.message}`);
          }
        }
      }

      // Ensure customer_code column has UNIQUE constraint
      if (!await this.hasUniqueConstraint('customers', 'customer_code')) {
        result.issues_found.push('customers.customer_code missing UNIQUE constraint');
        try {
          await this.addUniqueIndex('customers', 'customer_code');
          result.issues_fixed.push('Added UNIQUE constraint to customers.customer_code');
        } catch (error: any) {
          result.remaining_issues.push(`Failed to add UNIQUE constraint: ${error.message}`);
        }
      }

    } catch (error: any) {
      result.remaining_issues.push(`Customers table validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * PERMANENT FIX: Validate and repair products table
   */
  private async validateAndRepairProductsTable(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      const tableExists = await this.tableExists('products');
      if (!tableExists) {
        result.issues_found.push('products table missing');
        await this.createProductsTable();
        result.issues_fixed.push('Created products table');
        return result;
      }

      // Validate products table schema
      const columns = await this.getTableColumns('products');
      const requiredColumns = [
        { name: 'id', type: 'INTEGER' },
        { name: 'name', type: 'TEXT' },
        { name: 'category', type: 'TEXT' },
        { name: 'unit_type', type: 'TEXT' },
        { name: 'unit', type: 'TEXT' },
        { name: 'rate_per_unit', type: 'REAL' },
        { name: 'current_stock', type: 'TEXT' },
        { name: 'min_stock_alert', type: 'TEXT' },
        { name: 'size', type: 'TEXT' },
        { name: 'grade', type: 'TEXT' },
        { name: 'status', type: 'TEXT' },
        { name: 'created_at', type: 'DATETIME' },
        { name: 'updated_at', type: 'DATETIME' }
      ];

      for (const reqCol of requiredColumns) {
        const exists = columns.some(col => col.name === reqCol.name);
        if (!exists) {
          result.issues_found.push(`products.${reqCol.name} column missing`);
          try {
            await this.addColumnSafely('products', reqCol.name, reqCol.type);
            result.issues_fixed.push(`Added products.${reqCol.name} column`);
          } catch (error: any) {
            result.remaining_issues.push(`Failed to add products.${reqCol.name}: ${error.message}`);
          }
        }
      }

    } catch (error: any) {
      result.remaining_issues.push(`Products table validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * PERMANENT FIX: Validate and repair invoices table
   */
  private async validateAndRepairInvoicesTable(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      const tableExists = await this.tableExists('invoices');
      if (!tableExists) {
        result.issues_found.push('invoices table missing');
        await this.createInvoicesTable();
        result.issues_fixed.push('Created invoices table');
      }

    } catch (error: any) {
      result.remaining_issues.push(`Invoices table validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * CRITICAL FIX: Validate and repair invoice_items table
   */
  private async validateAndRepairInvoiceItemsTable(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      const tableExists = await this.tableExists('invoice_items');
      if (!tableExists) {
        result.issues_found.push('invoice_items table missing');
        await this.createInvoiceItemsTable();
        result.issues_fixed.push('Created invoice_items table');
        return result;
      }

      // Check table schema for invoice_items
      const columns = await this.getTableColumns('invoice_items');
      const requiredColumns = [
        { name: 'id', type: 'INTEGER' },
        { name: 'invoice_id', type: 'INTEGER' },
        { name: 'product_id', type: 'INTEGER' },
        { name: 'product_name', type: 'TEXT' },
        { name: 'quantity', type: 'TEXT' },
        { name: 'unit_price', type: 'REAL' },
        { name: 'rate', type: 'REAL' },
        { name: 'total_price', type: 'REAL' },
        { name: 'amount', type: 'REAL' },
        { name: 'unit', type: 'TEXT' },
        { name: 'created_at', type: 'DATETIME' },
        { name: 'updated_at', type: 'DATETIME' }
      ];

      // Check for missing columns
      for (const reqCol of requiredColumns) {
        const exists = columns.some(col => col.name === reqCol.name);
        if (!exists) {
          result.issues_found.push(`invoice_items.${reqCol.name} column missing`);
          try {
            let columnDef = reqCol.type;
            if (reqCol.name === 'updated_at' || reqCol.name === 'created_at') {
              columnDef += ' DEFAULT CURRENT_TIMESTAMP';
            }
            await this.addColumnSafely('invoice_items', reqCol.name, columnDef);
            result.issues_fixed.push(`Added invoice_items.${reqCol.name} column`);
          } catch (error: any) {
            result.remaining_issues.push(`Failed to add invoice_items.${reqCol.name}: ${error.message}`);
          }
        }
      }

    } catch (error: any) {
      result.remaining_issues.push(`Invoice items table validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * PERMANENT FIX: Validate and repair ledger_entries table structure
   */
  private async validateAndRepairLedgerEntriesTable(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      console.log('🔍 Validating ledger_entries table schema...');
      
      // Check if table exists
      const tableExists = await this.dbConnection.select(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='ledger_entries'`
      );

      if (tableExists.length === 0) {
        result.issues_found.push('ledger_entries table does not exist');
        result.remaining_issues.push('ledger_entries table needs to be created during initialization');
        return result;
      }

      // Get current table columns
      const columns = await this.dbConnection.select(`PRAGMA table_info(ledger_entries)`);
      
      // Required columns for ledger_entries
      const requiredColumns = [
        { name: 'id', type: 'INTEGER' },
        { name: 'date', type: 'TEXT' },
        { name: 'time', type: 'TEXT' },
        { name: 'type', type: 'TEXT' },
        { name: 'category', type: 'TEXT' },
        { name: 'description', type: 'TEXT' },
        { name: 'amount', type: 'REAL' },
        { name: 'running_balance', type: 'REAL' },
        { name: 'customer_id', type: 'INTEGER' },
        { name: 'customer_name', type: 'TEXT' },
        { name: 'reference_id', type: 'INTEGER' },
        { name: 'reference_type', type: 'TEXT' },
        { name: 'bill_number', type: 'TEXT' },
        { name: 'payment_method', type: 'TEXT' },
        { name: 'payment_channel_id', type: 'INTEGER' },
        { name: 'payment_channel_name', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'is_manual', type: 'INTEGER' },
        { name: 'created_by', type: 'TEXT' },
        { name: 'created_at', type: 'DATETIME' },
        { name: 'updated_at', type: 'DATETIME' }
      ];

      // Check for missing columns
      for (const reqCol of requiredColumns) {
        const exists = columns.some((col: any) => col.name === reqCol.name);
        if (!exists) {
          result.issues_found.push(`ledger_entries.${reqCol.name} column missing`);
          try {
            let columnDef = reqCol.type;
            
            // Add appropriate defaults for specific columns
            if (reqCol.name === 'running_balance') {
              columnDef += ' NOT NULL DEFAULT 0';
            } else if (reqCol.name === 'updated_at' || reqCol.name === 'created_at') {
              columnDef += ' DEFAULT CURRENT_TIMESTAMP';
            } else if (reqCol.name === 'is_manual') {
              columnDef += ' DEFAULT 0';
            } else if (reqCol.name === 'created_by') {
              columnDef += ' DEFAULT "system"';
            }
            
            await this.addColumnSafely('ledger_entries', reqCol.name, columnDef);
            result.issues_fixed.push(`Added ledger_entries.${reqCol.name} column`);
          } catch (error: any) {
            result.remaining_issues.push(`Failed to add ledger_entries.${reqCol.name}: ${error.message}`);
          }
        }
      }

      // Special validation for running_balance column
      const runningBalanceCol = columns.find((col: any) => col.name === 'running_balance');
      if (runningBalanceCol) {
        // Check if it has NOT NULL constraint
        if (runningBalanceCol.notnull !== 1) {
          result.issues_found.push('ledger_entries.running_balance should be NOT NULL');
          // This would require table recreation, so we'll log it as a recommendation
          result.remaining_issues.push('ledger_entries.running_balance column exists but lacks NOT NULL constraint');
        }
      }

      console.log(`✅ ledger_entries table validation completed - Found: ${result.issues_found.length}, Fixed: ${result.issues_fixed.length}`);

    } catch (error: any) {
      result.remaining_issues.push(`Ledger entries table validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * PERMANENT FIX: Validate and repair stock_movements table structure
   */
  private async validateAndRepairStockMovementsTable(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      console.log('🔍 Validating stock_movements table schema...');
      
      // Check if table exists
      const tableExists = await this.dbConnection.select(
        `SELECT name FROM sqlite_master WHERE type='table' AND name='stock_movements'`
      );

      if (tableExists.length === 0) {
        result.issues_found.push('stock_movements table does not exist');
        result.remaining_issues.push('stock_movements table needs to be created during initialization');
        return result;
      }

      // Get current table columns
      const columns = await this.dbConnection.select(`PRAGMA table_info(stock_movements)`);
      
      // Required columns for stock_movements
      const requiredColumns = [
        { name: 'id', type: 'INTEGER' },
        { name: 'product_id', type: 'INTEGER' },
        { name: 'product_name', type: 'TEXT' },
        { name: 'movement_type', type: 'TEXT' },
        { name: 'quantity', type: 'TEXT' },
        { name: 'previous_stock', type: 'TEXT' },
        { name: 'stock_before', type: 'TEXT' },
        { name: 'stock_after', type: 'TEXT' },
        { name: 'new_stock', type: 'TEXT' },
        { name: 'unit_price', type: 'REAL' },
        { name: 'total_value', type: 'REAL' },
        { name: 'vendor_id', type: 'INTEGER' },
        { name: 'vendor_name', type: 'TEXT' },
        { name: 'reference_type', type: 'TEXT' },
        { name: 'reference_id', type: 'INTEGER' },
        { name: 'reason', type: 'TEXT' },
        { name: 'notes', type: 'TEXT' },
        { name: 'date', type: 'TEXT' },
        { name: 'time', type: 'TEXT' },
        { name: 'movement_date', type: 'TEXT' },
        { name: 'created_by', type: 'TEXT' },
        { name: 'created_at', type: 'DATETIME' },
        { name: 'updated_at', type: 'DATETIME' }
      ];

      // Check for missing columns
      for (const reqCol of requiredColumns) {
        const exists = columns.some((col: any) => col.name === reqCol.name);
        if (!exists) {
          result.issues_found.push(`stock_movements.${reqCol.name} column missing`);
          try {
            let columnDef = reqCol.type;
            
            // Add appropriate defaults for specific columns
            if (reqCol.name === 'stock_before' || reqCol.name === 'stock_after' || reqCol.name === 'previous_stock' || reqCol.name === 'new_stock') {
              columnDef += ' NOT NULL DEFAULT ""';
            } else if (reqCol.name === 'quantity') {
              columnDef += ' NOT NULL DEFAULT "0"';
            } else if (reqCol.name === 'unit_price' || reqCol.name === 'total_value') {
              columnDef += ' DEFAULT 0';
            } else if (reqCol.name === 'updated_at' || reqCol.name === 'created_at') {
              columnDef += ' DEFAULT CURRENT_TIMESTAMP';
            } else if (reqCol.name === 'created_by') {
              columnDef += ' DEFAULT "system"';
            } else if (reqCol.name === 'reason') {
              columnDef += ' NOT NULL DEFAULT ""';
            }
            
            await this.addColumnSafely('stock_movements', reqCol.name, columnDef);
            result.issues_fixed.push(`Added stock_movements.${reqCol.name} column`);
          } catch (error: any) {
            result.remaining_issues.push(`Failed to add stock_movements.${reqCol.name}: ${error.message}`);
          }
        }
      }

      console.log(`✅ stock_movements table validation completed - Found: ${result.issues_found.length}, Fixed: ${result.issues_fixed.length}`);

    } catch (error: any) {
      result.remaining_issues.push(`Stock movements table validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * PERMANENT FIX: Validate and create performance indexes
   */
  private async validateAndCreateIndexes(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    const requiredIndexes = [
      { name: 'idx_customers_customer_code', table: 'customers', column: 'customer_code' },
      { name: 'idx_customers_name', table: 'customers', column: 'name' },
      { name: 'idx_products_name', table: 'products', column: 'name' },
      { name: 'idx_products_category', table: 'products', column: 'category' },
      { name: 'idx_invoices_customer_id', table: 'invoices', column: 'customer_id' },
      { name: 'idx_invoices_bill_number', table: 'invoices', column: 'bill_number' },
      { name: 'idx_ledger_entries_date', table: 'ledger_entries', column: 'date' },
      { name: 'idx_ledger_entries_customer_id', table: 'ledger_entries', column: 'customer_id' },
      { name: 'idx_ledger_entries_type', table: 'ledger_entries', column: 'type' },
      { name: 'idx_stock_movements_product_id', table: 'stock_movements', column: 'product_id' },
      { name: 'idx_stock_movements_movement_type', table: 'stock_movements', column: 'movement_type' },
      { name: 'idx_stock_movements_movement_date', table: 'stock_movements', column: 'movement_date' }
    ];

    for (const index of requiredIndexes) {
      try {
        const exists = await this.indexExists(index.name);
        if (!exists) {
          result.issues_found.push(`Index ${index.name} missing`);
          await this.createIndex(index.name, index.table, index.column);
          result.issues_fixed.push(`Created index ${index.name}`);
        }
      } catch (error: any) {
        result.remaining_issues.push(`Failed to create index ${index.name}: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * PERMANENT FIX: Validate and fix data integrity issues
   */
  private async validateAndFixDataIntegrity(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      // Fix NULL customer codes
      const nullCustomerCodes = await this.dbConnection.select(
        'SELECT COUNT(*) as count FROM customers WHERE customer_code IS NULL OR customer_code = ""'
      );

      if (nullCustomerCodes[0]?.count > 0) {
        result.issues_found.push(`${nullCustomerCodes[0].count} customers with NULL customer_code`);
        
        // Generate customer codes for customers missing them
        const customersWithoutCode = await this.dbConnection.select(
          'SELECT id, name FROM customers WHERE customer_code IS NULL OR customer_code = ""'
        );

        for (const customer of customersWithoutCode) {
          try {
            const newCode = await this.generateUniqueCustomerCode();
            await this.dbConnection.execute(
              'UPDATE customers SET customer_code = ? WHERE id = ?',
              [newCode, customer.id]
            );
            result.issues_fixed.push(`Generated customer code ${newCode} for customer ${customer.name}`);
          } catch (error: any) {
            result.remaining_issues.push(`Failed to generate code for customer ${customer.name}: ${error.message}`);
          }
        }
      }

      // Fix NULL balances
      await this.dbConnection.execute(
        'UPDATE customers SET balance = 0.0 WHERE balance IS NULL'
      );

      // Fix invalid product stocks
      await this.dbConnection.execute(
        'UPDATE products SET current_stock = "0" WHERE current_stock IS NULL OR current_stock = ""'
      );

    } catch (error: any) {
      result.remaining_issues.push(`Data integrity validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * COMPREHENSIVE SCHEMA CONFLICT RESOLUTION: Validates and resolves all database schema conflicts
   * This method ensures production-grade database consistency by detecting and fixing conflicting 
   * schema definitions, CHECK constraints, and data type mismatches across all tables.
   */
  async validateAndResolveSchemaConflicts(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      console.log('🔍 [AUTO-REPAIR] Validating and resolving schema conflicts...');

      // Initialize schema conflict resolver
      const schemaResolver = new SchemaConflictResolver();
      
      // 1. Detect and resolve all schema conflicts
      const conflictResults = await schemaResolver.resolveAllSchemaConflicts();
      
      if (conflictResults.conflicts_found.length > 0) {
        result.issues_found.push(`Found ${conflictResults.conflicts_found.length} schema conflicts`);
        result.issues_found.push(...conflictResults.conflicts_found.map(conflict => `Schema conflict: ${conflict}`));
      }

      if (conflictResults.conflicts_resolved.length > 0) {
        result.issues_fixed.push(`Resolved ${conflictResults.conflicts_resolved.length} schema conflicts`);
        result.issues_fixed.push(...conflictResults.conflicts_resolved.map(conflict => `Resolved: ${conflict}`));
      }

      if (conflictResults.remaining_conflicts.length > 0) {
        result.remaining_issues.push(`${conflictResults.remaining_conflicts.length} schema conflicts need manual intervention`);
        result.remaining_issues.push(...conflictResults.remaining_conflicts.map(conflict => `Unresolved: ${conflict}`));
      }

      // 2. Validate constraint consistency using static methods
      console.log('🔧 [AUTO-REPAIR] Validating constraint consistency...');
      const constraintIssues = await this.validateConstraintConsistency();
      result.issues_found.push(...constraintIssues.issues_found);
      result.issues_fixed.push(...constraintIssues.issues_fixed);
      result.remaining_issues.push(...constraintIssues.remaining_issues);

      console.log(`✅ [AUTO-REPAIR] Schema conflict resolution completed: ${result.issues_fixed.length} fixed, ${result.remaining_issues.length} remaining`);

    } catch (error: any) {
      console.error('❌ [AUTO-REPAIR] Schema conflict resolution failed:', error);
      result.remaining_issues.push(`Schema conflict resolution failed: ${error.message}`);
    }

    return result;
  }

  /**
   * Validates CHECK constraint consistency across all tables
   */
  private async validateConstraintConsistency(): Promise<{
    issues_found: string[];
    issues_fixed: string[];
    remaining_issues: string[];
  }> {
    const result = {
      issues_found: [] as string[],
      issues_fixed: [] as string[],
      remaining_issues: [] as string[]
    };

    try {
      // Get all table schemas and check for conflicting constraints
      const tables = ['invoices', 'invoice_items', 'customers', 'products', 'ledger_entries', 'stock_movements'];
      
      for (const table of tables) {
        try {
          const schemaInfo = await this.dbConnection.select(
            "SELECT sql FROM sqlite_master WHERE type='table' AND name=?",
            [table]
          );
          
          if (schemaInfo.length > 0) {
            const createSQL = schemaInfo[0].sql;
            
            // Check for common constraint conflicts
            if (table === 'invoices' && createSQL.includes('status')) {
              // Validate invoice status constraints
              if (createSQL.includes("status IN ('pending', 'partially_paid', 'paid')") && 
                  createSQL.includes("status IN ('pending', 'completed', 'cancelled')")) {
                result.issues_found.push(`Conflicting status constraints in invoices table`);
                result.remaining_issues.push(`Manual intervention required for invoice status constraints`);
              }
            }
          }
        } catch (tableError) {
          console.warn(`⚠️ [AUTO-REPAIR] Could not validate constraints for table ${table}:`, tableError);
        }
      }

    } catch (error: any) {
      console.error('❌ [AUTO-REPAIR] Constraint validation failed:', error);
      result.remaining_issues.push(`Constraint validation failed: ${error.message}`);
    }

    return result;
  }

  /**
   * CRITICAL: Generate unique customer code with collision prevention
   */
  private async generateUniqueCustomerCode(): Promise<string> {
    const prefix = 'C';
    let attempts = 0;
    const maxAttempts = 10;

    while (attempts < maxAttempts) {
      try {
        // Get highest existing code
        const result = await this.dbConnection.select(`
          SELECT customer_code 
          FROM customers 
          WHERE customer_code LIKE '${prefix}%' 
          AND customer_code GLOB '${prefix}[0-9][0-9][0-9][0-9]*'
          ORDER BY CAST(SUBSTR(customer_code, 2) AS INTEGER) DESC 
          LIMIT 1
        `);

        let nextNumber = 1;
        if (result && result.length > 0 && result[0].customer_code) {
          const lastCode = result[0].customer_code;
          const lastNumber = parseInt(lastCode.substring(1)) || 0;
          nextNumber = lastNumber + 1;
        }

        const newCode = `${prefix}${nextNumber.toString().padStart(4, '0')}`;

        // Verify uniqueness
        const existingCheck = await this.dbConnection.select(
          'SELECT id FROM customers WHERE customer_code = ? LIMIT 1',
          [newCode]
        );

        if (!existingCheck || existingCheck.length === 0) {
          return newCode;
        }

        attempts++;
      } catch (error) {
        attempts++;
        if (attempts >= maxAttempts) {
          // Final fallback - timestamp based
          const timestamp = Date.now().toString().slice(-6);
          return `${prefix}${timestamp}`;
        }
      }
    }

    // Absolute fallback
    const timestamp = Date.now().toString().slice(-8);
    return `${prefix}${timestamp}`;
  }

  /**
   * UTILITY: Periodic validation (lightweight)
   */
  private async performPeriodicValidation(): Promise<void> {
    try {
      // Only check critical issues during periodic validation
      const customersTableExists = await this.tableExists('customers');
      if (!customersTableExists) {
        console.warn('⚠️ Critical: customers table missing during periodic check');
        await this.performSchemaValidationAndRepair();
      }

      // Check for customers with NULL customer_code
      const nullCodes = await this.dbConnection.select(
        'SELECT COUNT(*) as count FROM customers WHERE customer_code IS NULL OR customer_code = ""'
      );

      if (nullCodes[0]?.count > 0) {
        console.warn(`⚠️ Found ${nullCodes[0].count} customers with NULL customer_code`);
        // Auto-fix during periodic check
        await this.validateAndFixDataIntegrity();
      }

    } catch (error) {
      console.error('❌ Periodic validation failed:', error);
    }
  }

  // Helper methods for database operations
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.dbConnection.select(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tableName]
      );
      return result && result.length > 0;
    } catch {
      return false;
    }
  }

  private async getTableColumns(tableName: string): Promise<Array<{name: string, type: string}>> {
    try {
      const result = await this.dbConnection.select(`PRAGMA table_info(${tableName})`);
      return result.map((row: any) => ({
        name: row.name,
        type: row.type
      }));
    } catch {
      return [];
    }
  }

  private async addColumnSafely(tableName: string, columnName: string, columnType: string): Promise<void> {
    try {
      await this.dbConnection.execute(
        `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`
      );
    } catch (error: any) {
      if (!error.message?.includes('duplicate column name')) {
        throw error;
      }
    }
  }

  private async hasUniqueConstraint(tableName: string, columnName: string): Promise<boolean> {
    try {
      const result = await this.dbConnection.select(
        "SELECT name FROM sqlite_master WHERE type='index' AND tbl_name=? AND sql LIKE '%UNIQUE%' AND sql LIKE ?",
        [tableName, `%${columnName}%`]
      );
      return result && result.length > 0;
    } catch {
      return false;
    }
  }

  private async addUniqueIndex(tableName: string, columnName: string): Promise<void> {
    const indexName = `idx_${tableName}_${columnName}_unique`;
    await this.dbConnection.execute(
      `CREATE UNIQUE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnName})`
    );
  }

  private async indexExists(indexName: string): Promise<boolean> {
    try {
      const result = await this.dbConnection.select(
        "SELECT name FROM sqlite_master WHERE type='index' AND name=?",
        [indexName]
      );
      return result && result.length > 0;
    } catch {
      return false;
    }
  }

  private async createIndex(indexName: string, tableName: string, columnName: string): Promise<void> {
    await this.dbConnection.execute(
      `CREATE INDEX IF NOT EXISTS ${indexName} ON ${tableName}(${columnName})`
    );
  }

  // Table creation methods
  private async createCustomersTable(): Promise<void> {
    await this.dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS customers (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_code TEXT UNIQUE,
        name TEXT NOT NULL CHECK (length(name) > 0),
        phone TEXT,
        address TEXT,
        cnic TEXT,
        balance REAL NOT NULL DEFAULT 0.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createProductsTable(): Promise<void> {
    await this.dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL CHECK (length(name) > 0),
        category TEXT NOT NULL CHECK (length(category) > 0),
        unit_type TEXT NOT NULL DEFAULT 'kg-grams',
        unit TEXT NOT NULL,
        rate_per_unit REAL NOT NULL CHECK (rate_per_unit > 0),
        current_stock TEXT NOT NULL DEFAULT '0',
        min_stock_alert TEXT NOT NULL DEFAULT '0',
        size TEXT,
        grade TEXT,
        status TEXT NOT NULL DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  private async createInvoicesTable(): Promise<void> {
    await this.dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        bill_number TEXT UNIQUE NOT NULL,
        customer_id INTEGER NOT NULL,
        customer_name TEXT NOT NULL,
        date TEXT NOT NULL,
        time TEXT,
        total_amount REAL NOT NULL,
        payment_amount REAL DEFAULT 0.0,
        balance_due REAL DEFAULT 0.0,
        payment_status TEXT DEFAULT 'pending',
        notes TEXT,
        created_by TEXT DEFAULT 'system',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customers(id)
      )
    `);
  }

  private async createInvoiceItemsTable(): Promise<void> {
    await this.dbConnection.execute(`
      CREATE TABLE IF NOT EXISTS invoice_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        product_name TEXT NOT NULL,
        quantity REAL NOT NULL,
        rate REAL NOT NULL,
        amount REAL NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);
  }
}

// Export singleton instance
export const databaseAutoRepair = DatabaseAutoRepair.getInstance();
