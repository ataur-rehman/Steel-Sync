# 🔧 Database Troubleshooting Guide

## 🚨 **COMMON ISSUES AND SOLUTIONS**

### **Issue 1: Enhanced Service Not Initializing**
**Symptoms**: App falls back to standard database initialization
**Solutions**:
```typescript
// Check if enhanced service is properly imported
import { EnhancedDatabaseService } from './database/enhanced-service';

// Verify the enhanced service initialization
const health = await db.healthCheck();
console.log('Enhanced service status:', health.components);
```

### **Issue 2: Cache Not Working**
**Symptoms**: Queries still slow, no cache hits
**Solutions**:
```typescript
// Check cache configuration
const stats = db.getStats();
console.log('Cache stats:', stats.cache);

// Manually warm up cache
await db.cacheManager?.warmupCache();
```

### **Issue 3: Events Not Firing**
**Symptoms**: UI not updating automatically
**Solutions**:
```typescript
// Check event manager status
const eventHealth = db.eventManager.getHealthStatus();
console.log('Event system:', eventHealth);

// Manually test event emission
await db.eventManager.emitCustomerCreated(1, { name: 'Test' });
```

### **Issue 4: Database Locks/Timeouts**
**Symptoms**: "Database is locked" errors
**Solutions**:
```typescript
// Check transaction stats
const txStats = db.getTransactionStats();
console.log('Active transactions:', txStats.activeTransactions);

// Enable more detailed logging
console.log('WAL mode check:', await db.database.select('PRAGMA journal_mode'));
```

### **Issue 5: Memory Usage Too High**
**Symptoms**: App becomes slow over time
**Solutions**:
```typescript
// Check cache memory usage
const cacheStats = db.getCacheStats();
if (cacheStats.memoryUsage > 100 * 1024 * 1024) { // > 100MB
  db.cacheManager.clearAll();
}

// Implement periodic cleanup
setInterval(() => {
  db.cacheManager.cleanupCache();
}, 300000); // Every 5 minutes
```

---

## 🔍 **DIAGNOSTIC COMMANDS**

### **Health Check**
```typescript
const health = await db.healthCheck();
console.log('Overall health:', health.healthy);
console.log('Component status:', health.components);
```

### **Performance Analysis**
```typescript
const stats = db.getStats();
console.log('Database performance:', {
  cacheHitRate: stats.cache?.hitRate || 0,
  averageQueryTime: stats.cache?.averageTime || 0,
  activeTransactions: stats.transactions?.activeTransactions || 0,
  eventSubscriptions: stats.events?.subscriptions || 0
});
```

### **Schema Validation**
```typescript
const integrity = await db.schemaManager?.validateDatabaseIntegrity();
console.log('Schema integrity:', integrity);
```

---

## 🛠️ **DEBUGGING TOOLS**

### **Enable Debug Logging**
```typescript
// Add to database initialization
console.log('Debug mode enabled for database operations');

// Override console methods for detailed logging
const originalLog = console.log;
console.log = (...args) => {
  originalLog(new Date().toISOString(), '[DB]', ...args);
};
```

### **Query Performance Monitoring**
```typescript
// Wrap database queries for performance monitoring
const originalSelect = db.database.select;
db.database.select = async function(query, params) {
  const startTime = Date.now();
  const result = await originalSelect.call(this, query, params);
  const duration = Date.now() - startTime;
  
  if (duration > 100) { // Log slow queries
    console.warn(`Slow query (${duration}ms):`, query);
  }
  
  return result;
};
```

### **Event Debugging**
```typescript
// Listen to all events for debugging
db.eventManager.on('*', (event) => {
  console.log('Database event:', event.type, event);
});
```

---

## 🔄 **RECOVERY PROCEDURES**

### **Reset Cache**
```typescript
// Clear all cached data
db.cacheManager?.clearAll();
await db.cacheManager?.warmupCache();
```

### **Reset Event System**
```typescript
// Clear all event subscribers
db.eventManager.shutdown();
// Re-initialize if needed
```

### **Emergency Fallback**
```typescript
// Disable enhanced features if needed
const basicDb = new DatabaseService();
await basicDb.initialize();
// Use basic database operations only
```

### **Database Repair**
```typescript
// Check and repair database integrity
const integrity = await db.database.select('PRAGMA integrity_check');
if (integrity[0]?.integrity_check !== 'ok') {
  console.error('Database corruption detected');
  // Consider database rebuild or restoration from backup
}
```

---

## 📊 **MONITORING DASHBOARD**

```typescript
// Create a simple monitoring dashboard
function createMonitoringDashboard() {
  setInterval(async () => {
    const health = await db.healthCheck();
    const stats = db.getStats();
    
    console.table({
      'Database Health': health.healthy ? '✅' : '❌',
      'Cache Size': stats.cache?.size || 0,
      'Cache Memory (MB)': Math.round((stats.cache?.memoryUsage || 0) / 1024 / 1024),
      'Active Transactions': stats.transactions?.activeTransactions || 0,
      'Event Subscriptions': stats.events?.subscriptions || 0
    });
    
    // Alert on issues
    if (!health.healthy) {
      console.error('🚨 Database health issues detected:', health.components);
    }
  }, 10000); // Every 10 seconds
}

// Start monitoring
createMonitoringDashboard();
```

---

## 🔧 **CONFIGURATION TUNING**

### **Performance Tuning**
```typescript
// Optimize for your specific use case
const enhancedDb = EnhancedDatabaseService.getInstance({
  enableCaching: true,
  enableEvents: true,
  cacheConfig: {
    maxSize: 500,        // Increase for more caching
    maxMemoryMB: 200,    // Increase for larger cache
    defaultTtl: 120000   // 2 minutes for longer cache
  },
  transactionConfig: {
    maxRetries: 10,      // More retries for busy systems
    timeout: 60000       // Longer timeout for complex operations
  }
});
```

### **Memory-Constrained Environment**
```typescript
// Optimize for low memory usage
const enhancedDb = EnhancedDatabaseService.getInstance({
  enableCaching: true,
  enableEvents: true,
  cacheConfig: {
    maxSize: 50,         // Fewer cached queries
    maxMemoryMB: 25,     // Smaller memory footprint
    defaultTtl: 15000    // Shorter cache duration
  }
});
```

---

## 🚨 **EMERGENCY CONTACTS**

When database issues occur:

1. **Check logs** for specific error messages
2. **Run health check** to identify problem areas
3. **Try recovery procedures** appropriate to the issue
4. **Consider fallback** to basic database operations if needed
5. **Document the issue** for future improvement

---

This troubleshooting guide should help resolve most common database-related issues in the enhanced steel store management system.
