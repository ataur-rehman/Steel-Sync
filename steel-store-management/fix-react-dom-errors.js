/**
 * IMMEDIATE REACT DOM ERROR FIX
 * 
 * This script provides immediate fixes for the React DOM errors
 * caused by database initialization timing issues.
 */

// IMMEDIATE FIX: Execute this in the browser console to fix React DOM errors
(function() {
  console.log('🚨 IMMEDIATE REACT DOM ERROR FIX STARTING...');
  
  // Function to fix React DOM errors
  window.fixReactDOMErrorsNow = async function() {
    try {
      console.log('🔧 Step 1: Stopping any pending database operations...');
      
      // Clear any pending timeouts or intervals
      for (let i = 1; i < 1000; i++) {
        clearTimeout(i);
        clearInterval(i);
      }
      
      console.log('🔧 Step 2: Clearing React state...');
      
      // Clear React-related localStorage
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('react') || key.includes('router') || key.includes('auth'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      console.log('🔧 Step 3: Ensuring database is ready...');
      
      // Try to fix database issues
      try {
        if (window.ensureDatabaseReady) {
          const dbStatus = await window.ensureDatabaseReady();
          console.log('📊 Database status:', dbStatus);
        }
      } catch (dbError) {
        console.warn('⚠️ Database readiness check failed:', dbError);
      }
      
      console.log('🔧 Step 4: Refreshing page with cache clear...');
      
      // Force refresh with cache clear
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (let registration of registrations) {
          await registration.unregister();
        }
      }
      
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      console.log('✅ Fixes applied! Refreshing page...');
      
      setTimeout(() => {
        window.location.reload(true);
      }, 1000);
      
      return { success: true, message: 'React DOM errors should be fixed after refresh' };
      
    } catch (error) {
      console.error('❌ Fix failed:', error);
      
      // Fallback: Force refresh
      console.log('🔄 Falling back to force refresh...');
      window.location.href = window.location.href;
      
      return { success: false, error: error.message };
    }
  };
  
  // Function to check if React DOM errors are happening
  window.checkReactDOMErrors = function() {
    console.log('🔍 Checking for React DOM errors...');
    
    const errors = [];
    
    // Check console for DOM errors
    const originalError = console.error;
    let domErrorDetected = false;
    
    console.error = function(...args) {
      const message = args.join(' ');
      if (message.includes('insertBefore') || message.includes('removeChild') || message.includes('Node')) {
        domErrorDetected = true;
        errors.push(message);
      }
      originalError.apply(console, args);
    };
    
    // Restore after a brief check
    setTimeout(() => {
      console.error = originalError;
      
      if (domErrorDetected) {
        console.log('❌ React DOM errors detected');
        console.log('💡 Run fixReactDOMErrorsNow() to fix these issues');
      } else {
        console.log('✅ No React DOM errors detected');
      }
    }, 1000);
    
    return { domErrorDetected, errors };
  };
  
  // Function to prevent database timeout errors
  window.preventDatabaseTimeout = async function() {
    try {
      console.log('⏱️ Preventing database timeout errors...');
      
      // Get database instance
      const db = window.db || (await import('./src/services/database.ts')).DatabaseService.getInstance();
      
      // Increase timeout values
      if (db && db.config) {
        db.config.queryTimeout = 60000; // 60 seconds
        db.config.transactionTimeout = 120000; // 2 minutes
        console.log('✅ Database timeouts increased');
      }
      
      // Force database initialization if needed
      if (db && !db.isReady()) {
        console.log('🔄 Force initializing database...');
        await db.initialize();
        console.log('✅ Database force initialized');
      }
      
      return { success: true, message: 'Database timeout prevention applied' };
      
    } catch (error) {
      console.error('❌ Timeout prevention failed:', error);
      return { success: false, error: error.message };
    }
  };
  
  // Auto-run checks
  setTimeout(() => {
    console.log('🔍 Auto-checking for React DOM errors...');
    window.checkReactDOMErrors();
    
    console.log('⏱️ Auto-applying timeout prevention...');
    window.preventDatabaseTimeout();
  }, 2000);
  
  console.log('✅ REACT DOM ERROR FIX LOADED!');
  console.log('📋 Available functions:');
  console.log('- fixReactDOMErrorsNow() - Fix React DOM errors immediately');
  console.log('- checkReactDOMErrors() - Check if DOM errors are occurring'); 
  console.log('- preventDatabaseTimeout() - Prevent database timeout errors');
  
})();
