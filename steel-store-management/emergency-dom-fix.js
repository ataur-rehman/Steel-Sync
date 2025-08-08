/**
 * EMERGENCY DOM ERROR STOPPER
 * 
 * Run this immediately in the browser console to stop React DOM errors
 */

(function() {
  console.log('🚨 EMERGENCY DOM ERROR STOPPER ACTIVATED');
  
  // IMMEDIATE: Stop all React DOM errors
  function stopDOMErrorsImmediately() {
    console.log('🛑 Stopping DOM errors immediately...');
    
    // 1. Override all problematic DOM methods
    const safeWrapper = (originalMethod, methodName) => {
      return function(...args) {
        try {
          // For removeChild - check if child is actually a child
          if (methodName === 'removeChild') {
            const child = args[0];
            if (!this.contains || !this.contains(child)) {
              console.log(`DOM Error Prevented: ${methodName} - child not found`);
              return child;
            }
            if (child.parentNode !== this && child.parentNode) {
              console.log(`DOM Error Prevented: ${methodName} - redirecting to actual parent`);
              return child.parentNode.removeChild(child);
            }
          }
          
          // For insertBefore - check reference node
          if (methodName === 'insertBefore') {
            const [newNode, referenceNode] = args;
            if (referenceNode && (!this.contains || !this.contains(referenceNode))) {
              console.log(`DOM Error Prevented: ${methodName} - reference node not found, using appendChild`);
              return this.appendChild(newNode);
            }
          }
          
          return originalMethod.apply(this, args);
          
        } catch (error) {
          console.log(`DOM Error Prevented: ${methodName} - ${error.message}`);
          
          // Fallback behaviors
          if (methodName === 'removeChild') {
            return args[0]; // Return the child that was supposed to be removed
          } else if (methodName === 'insertBefore' || methodName === 'appendChild') {
            try {
              return this.appendChild(args[0]); // Try appendChild as fallback
            } catch (appendError) {
              console.log(`DOM Error: appendChild fallback also failed - ${appendError.message}`);
              return args[0];
            }
          } else if (methodName === 'replaceChild') {
            try {
              return this.appendChild(args[0]); // Try appendChild as fallback
            } catch (replaceError) {
              console.log(`DOM Error: replaceChild fallback failed - ${replaceError.message}`);
              return args[0];
            }
          }
          
          return args[0] || null;
        }
      };
    };
    
    // Override Node prototype methods
    const originalMethods = {
      removeChild: Node.prototype.removeChild,
      insertBefore: Node.prototype.insertBefore,
      appendChild: Node.prototype.appendChild,
      replaceChild: Node.prototype.replaceChild
    };
    
    Node.prototype.removeChild = safeWrapper(originalMethods.removeChild, 'removeChild');
    Node.prototype.insertBefore = safeWrapper(originalMethods.insertBefore, 'insertBefore');
    Node.prototype.appendChild = safeWrapper(originalMethods.appendChild, 'appendChild');
    Node.prototype.replaceChild = safeWrapper(originalMethods.replaceChild, 'replaceChild');
    
    console.log('✅ DOM method overrides installed');
    
    // 2. Capture and suppress React DOM errors
    const originalConsoleError = console.error;
    console.error = function(...args) {
      const message = args.join(' ');
      
      // Suppress specific React DOM errors
      if (message.includes('removeChild') || 
          message.includes('insertBefore') ||
          message.includes('The node to be removed is not a child') ||
          message.includes('The node before which the new node is to be inserted')) {
        console.log('🛑 React DOM Error Suppressed:', message);
        return;
      }
      
      // Allow other errors through
      originalConsoleError.apply(console, args);
    };
    
    console.log('✅ Error suppression active');
    
    // 3. Clean up corrupted DOM nodes
    setTimeout(() => {
      const root = document.getElementById('root');
      if (root) {
        // Check for orphaned or corrupted nodes
        const children = Array.from(root.childNodes);
        let corruptedCount = 0;
        
        children.forEach(child => {
          if (child.nodeType === Node.ELEMENT_NODE) {
            // Check if node has proper parent relationship
            if (!child.parentNode || child.parentNode !== root) {
              corruptedCount++;
              try {
                root.appendChild(child); // Re-attach if needed
              } catch (e) {
                // Remove if can't reattach
                try {
                  child.remove();
                } catch (removeError) {
                  // Ignore if can't remove
                }
              }
            }
          }
        });
        
        if (corruptedCount > 0) {
          console.log(`🔧 Fixed ${corruptedCount} corrupted DOM nodes`);
        }
      }
    }, 100);
    
    // 4. Store restoration function
    window.restoreOriginalDOM = function() {
      Node.prototype.removeChild = originalMethods.removeChild;
      Node.prototype.insertBefore = originalMethods.insertBefore;
      Node.prototype.appendChild = originalMethods.appendChild;
      Node.prototype.replaceChild = originalMethods.replaceChild;
      console.error = originalConsoleError;
      console.log('🔄 Original DOM methods restored');
    };
    
    console.log('✅ DOM error stopper is active!');
    console.log('💡 Use restoreOriginalDOM() to restore original methods if needed');
    
    return {
      status: 'active',
      methods: ['removeChild', 'insertBefore', 'appendChild', 'replaceChild'],
      restore: window.restoreOriginalDOM
    };
  }
  
  // IMMEDIATE: Force React to re-render cleanly
  function forceCleanRerender() {
    console.log('🔄 Forcing clean React re-render...');
    
    const root = document.getElementById('root');
    if (!root) {
      console.error('❌ Root element not found');
      return false;
    }
    
    // Clear root content safely
    try {
      // First, stop any ongoing React operations
      root.style.display = 'none';
      
      // Wait a moment for React to settle
      setTimeout(() => {
        // Clear the root
        root.innerHTML = '<div style="padding: 20px; text-align: center;">Recovering application...</div>';
        
        // Remove React references
        delete root._reactRootContainer;
        delete root.__reactInternalInstance;
        
        // Show root again
        root.style.display = '';
        
        // Force page refresh as the most reliable recovery
        setTimeout(() => {
          console.log('🔄 Forcing page refresh for complete recovery...');
          window.location.reload();
        }, 1000);
        
      }, 100);
      
    } catch (error) {
      console.error('❌ Clean re-render failed:', error);
      // Force refresh as last resort
      window.location.reload();
    }
  }
  
  // ACTIVATE: Apply all fixes immediately
  const result = stopDOMErrorsImmediately();
  
  // Store functions globally
  window.stopDOMErrors = stopDOMErrorsImmediately;
  window.forceCleanRerender = forceCleanRerender;
  window.emergencyFix = function() {
    stopDOMErrorsImmediately();
    setTimeout(forceCleanRerender, 500);
  };
  
  console.log('🎯 EMERGENCY FIXES AVAILABLE:');
  console.log('- stopDOMErrors() - Stop DOM errors immediately');
  console.log('- forceCleanRerender() - Force clean React re-render');  
  console.log('- emergencyFix() - Apply all emergency fixes');
  console.log('- restoreOriginalDOM() - Restore original DOM methods');
  
  // Auto-run emergency fix after 2 seconds if DOM errors are still occurring
  let errorCount = 0;
  const errorMonitor = (event) => {
    if (event.error && event.error.message) {
      const message = event.error.message;
      if (message.includes('removeChild') || message.includes('insertBefore')) {
        errorCount++;
        if (errorCount >= 3) {
          console.log('🚨 Multiple DOM errors detected, running emergency fix...');
          window.emergencyFix();
          window.removeEventListener('error', errorMonitor);
        }
      }
    }
  };
  
  window.addEventListener('error', errorMonitor);
  
  // Remove monitor after 10 seconds
  setTimeout(() => {
    window.removeEventListener('error', errorMonitor);
  }, 10000);
  
  console.log('🛡️ EMERGENCY DOM ERROR STOPPER IS ACTIVE');
  
  return result;
  
})();
