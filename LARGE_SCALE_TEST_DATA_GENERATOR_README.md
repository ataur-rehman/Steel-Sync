# 🚀 COMPREHENSIVE LARGE-SCALE TEST DATA GENERATOR SUITE

This suite provides multiple production-ready test data generators designed to create massive, interconnected datasets for stress testing your Steel Store Management System.

## 📊 **What Gets Generated**

### **Core Data**
- **100+ Products** with proper categories, pricing, and stock levels
- **150+ Vendors** with complete contact information and business details
- **12,000+ Customers** with realistic balances and payment terms
- **12,000+ Stock Receiving** records with detailed items and vendor relationships
- **15,000+ Invoices** with multiple items and proper customer relationships
- **15,000+ Stock Movements** with proper before/after tracking
- **75,000+ Daily Ledger Entries** (365 days × 200+ entries per day)

### **Data Relationships**
✅ All foreign keys properly connected  
✅ Realistic business data patterns  
✅ Proper boolean normalization (1/0 integers)  
✅ Error-resistant batch processing  
✅ Transaction safety with rollback capability  
✅ Resume capability if interrupted  

## 🛠️ **Available Generators**

### **1. Browser-Compatible Generator (Recommended)**
**File:** `production-large-scale-test-data-generator.js`

```javascript
// In your browser console:
await runProductionTestDataGeneration();
```

**Features:**
- ✅ Runs directly in browser
- ✅ Uses existing database service
- ✅ Progress tracking with percentage
- ✅ Error handling with retries
- ✅ Batch processing to prevent browser freeze

### **2. Comprehensive Node.js Generator**
**File:** `comprehensive-large-scale-test-data-generator.js`

```bash
# Command line usage:
node comprehensive-large-scale-test-data-generator.js generate
node comprehensive-large-scale-test-data-generator.js validate
node comprehensive-large-scale-test-data-generator.js cleanup
```

**Features:**
- ✅ Full CLI interface
- ✅ Daily ledger generation (365 days)
- ✅ Advanced validation
- ✅ Performance optimizations

### **3. Browser Test Generator**
**File:** `browser-large-scale-test-data-generator.js`

```javascript
// In browser console:
const generator = new BrowserLargeScaleTestDataGenerator();
await generator.generateAllData();
```

**Features:**
- ✅ Browser-specific optimizations
- ✅ Smaller batch sizes
- ✅ Memory-efficient processing

## 🎯 **Quick Start Guide**

### **Step 1: Generate Test Data**

Open your browser and load your application, then in the console:

```javascript
// Method 1: Quick Generation (Recommended)
await runProductionTestDataGeneration();

// Method 2: Custom Configuration
const generator = new ProductionLargeScaleTestDataGenerator();
await generator.generateAllData();

// Method 3: Specific Dataset
const generator = new BrowserLargeScaleTestDataGenerator();
await generator.generateSpecificDataset('customers', 5000);
```

### **Step 2: Validate Generated Data**

```javascript
// Quick validation
await validateLargeScaleData();

// Quick count check
await quickDataCheck();

// Custom validation
const validator = new LargeScaleTestValidator();
await validator.runAllTests();
```

### **Step 3: Test Your Components**

Now test your components with large datasets:
- Invoice list with 15,000+ invoices
- Customer search with 12,000+ customers
- Stock reports with complex product data
- Vendor management with realistic data

## 📋 **Detailed Usage Instructions**

### **Browser Console Commands**

```javascript
// === GENERATION COMMANDS ===

// Generate all data (products, vendors, customers, invoices)
await runProductionTestDataGeneration();

// Check what data already exists
await quickDataCheck();

// Generate specific data types only
const generator = new BrowserLargeScaleTestDataGenerator();
await generator.generateSpecificDataset('products', 200);
await generator.generateSpecificDataset('vendors', 150);
await generator.generateSpecificDataset('customers', 10000);

// === VALIDATION COMMANDS ===

// Full validation suite (recommended after generation)
await validateLargeScaleData();

// Quick data count check
await quickDataCheck();

// Test vendor boolean fix specifically
await testVendorBooleanFix();

// Test database schema fixes
await testDatabaseFixes();

// === MONITORING COMMANDS ===

// Monitor generation progress
const generator = new ProductionLargeScaleTestDataGenerator();
generator.generateAllData(); // Watch console for progress

// Check for any errors during generation
console.log(generator.errors);
```

### **Advanced Configuration**

```javascript
// Custom generator with specific settings
const generator = new ProductionLargeScaleTestDataGenerator();

// Modify configuration
generator.config.targetCounts.customers = 5000;    // Reduce customers
generator.config.targetCounts.invoices = 8000;     // Reduce invoices
generator.config.batchSize = 50;                   // Smaller batches

await generator.generateAllData();
```

### **Error Recovery**

```javascript
// If generation fails partway through:

// 1. Check what was created
await quickDataCheck();

// 2. Continue with remaining data
const generator = new BrowserLargeScaleTestDataGenerator();
// Only generate what's missing
if (customers.length < 5000) {
    await generator.generateSpecificDataset('customers', 5000);
}

// 3. Validate everything
await validateLargeScaleData();
```

## 🔧 **Troubleshooting**

### **Common Issues**

#### **"Database not initialized" Error**
```javascript
// Solution: Ensure database is ready
const { db } = await import('/src/services/database.js');
await db.initialize();
await runProductionTestDataGeneration();
```

#### **Browser Freezing During Generation**
```javascript
// Solution: Use smaller batch sizes
const generator = new ProductionLargeScaleTestDataGenerator();
generator.config.batchSize = 25;  // Reduce from default 100
generator.config.delayBetweenBatches = 100;  // Add more delay
await generator.generateAllData();
```

#### **Foreign Key Constraint Errors**
```javascript
// Solution: Generate in correct order
const generator = new BrowserLargeScaleTestDataGenerator();
await generator.generateSpecificDataset('products', 200);   // First
await generator.generateSpecificDataset('vendors', 150);    // Second  
await generator.generateSpecificDataset('customers', 5000); // Third
await generator.generateSpecificDataset('invoices', 8000);  // Last
```

#### **Vendor Boolean Issues**
```javascript
// Solution: Run vendor boolean fix
await testVendorBooleanFix();

// Or manually fix
const vendors = await db.getVendors();
console.log('Vendor active status types:', vendors.map(v => ({
    id: v.id, 
    name: v.name, 
    is_active: v.is_active, 
    type: typeof v.is_active
})));
```

### **Performance Optimization**

#### **For Large Datasets (10,000+ records)**
```javascript
// Use production generator with optimized settings
const generator = new ProductionLargeScaleTestDataGenerator();
generator.config.batchSize = 200;              // Larger batches
generator.config.delayBetweenBatches = 10;     // Minimal delay
generator.config.maxRetries = 1;               // Fewer retries
await generator.generateAllData();
```

#### **For Browser Stability**
```javascript
// Use browser generator with smaller batches
const generator = new BrowserLargeScaleTestDataGenerator();
generator.batchSize = 50;                      // Smaller batches
await generator.generateAllData();
```

## 📊 **Expected Performance**

### **Generation Times**
- **Products (200):** ~30 seconds
- **Vendors (150):** ~45 seconds  
- **Customers (12,000):** ~5-8 minutes
- **Invoices (15,000):** ~8-12 minutes
- **Total:** ~15-20 minutes for complete dataset

### **Memory Usage**
- **Browser:** 200-500MB peak usage
- **Database:** 50-200MB depending on data size

### **Validation Times**
- **Quick Check:** ~5 seconds
- **Full Validation:** ~2-3 minutes
- **Performance Tests:** ~30 seconds

## 🎯 **Testing Scenarios**

### **Component Performance Testing**

```javascript
// After generating data, test these scenarios:

// 1. Invoice List Performance
// - Load invoice list with 15,000+ invoices
// - Test pagination and search
// - Verify rendering performance

// 2. Customer Search Performance  
// - Search through 12,000+ customers
// - Test autocomplete performance
// - Verify filter functionality

// 3. Stock Report Testing
// - Generate reports for products with complex stock history
// - Test with 15,000+ stock movements
// - Verify calculation accuracy

// 4. Vendor Management Testing
// - Test boolean normalization with 150+ vendors
// - Verify active/inactive display
// - Test bulk operations

// 5. Daily Ledger Performance
// - Load daily ledger with 200+ entries per day
// - Test date range filtering
// - Verify balance calculations
```

### **Stress Testing**

```javascript
// Test your application's limits:

// Generate maximum realistic data
const generator = new ProductionLargeScaleTestDataGenerator();
generator.config.targetCounts = {
    products: 500,
    vendors: 300,
    customers: 20000,
    invoices: 25000
};
await generator.generateAllData();

// Then test all major components for:
// - Memory leaks
// - Slow queries  
// - UI responsiveness
// - Search performance
// - Report generation speed
```

## 🧹 **Cleanup**

### **Remove Test Data**
```javascript
// Note: Be careful - this will delete ALL data!

// Method 1: Use cleanup function (if available)
const generator = new ComprehensiveLargeScaleTestDataGenerator();
await generator.cleanupTestData();

// Method 2: Manual cleanup (safer)
await db.executeRawQuery('DELETE FROM invoice_items');
await db.executeRawQuery('DELETE FROM invoices');
await db.executeRawQuery('DELETE FROM stock_receiving_items'); 
await db.executeRawQuery('DELETE FROM stock_receiving');
await db.executeRawQuery('DELETE FROM customers');
await db.executeRawQuery('DELETE FROM vendors');
await db.executeRawQuery('DELETE FROM products');
```

## 🎉 **Success Indicators**

Your test data generation is successful when:

✅ **No console errors** during generation  
✅ **All data counts** match targets  
✅ **Foreign key validation** passes  
✅ **Boolean normalization** working  
✅ **Component performance** acceptable  
✅ **Search functionality** responsive  
✅ **Reports generate** quickly  

## 🔗 **Integration with Your Workflow**

### **Before Major Changes**
```javascript
// 1. Generate fresh test data
await runProductionTestDataGeneration();

// 2. Test all components
await validateLargeScaleData();

// 3. Performance baseline
console.time('Invoice Load Test');
const invoices = await db.getInvoices();
console.timeEnd('Invoice Load Test');
```

### **After Bug Fixes**
```javascript
// 1. Validate data integrity
await validateLargeScaleData();

// 2. Test specific scenarios
await testVendorBooleanFix();
await testDatabaseFixes();

// 3. Performance regression testing
// (Re-run component tests)
```

---

## 📞 **Support**

If you encounter issues:

1. **Check console errors** for specific error messages
2. **Run validation** to identify data integrity issues
3. **Use smaller batch sizes** if browser performance is poor
4. **Generate data in stages** if memory is limited
5. **Validate after each stage** to catch issues early

Your software is now ready for comprehensive large-scale testing! 🚀
