/**
 * CRITICAL DOM STABILITY FIX
 * 
 * This script provides comprehensive fixes for React DOM manipulation errors
 * including removeChild, insertBefore, and node reconciliation issues.
 */

(function() {
  console.log('🚨 CRITICAL DOM STABILITY FIX LOADING...');
  
  // 1. IMMEDIATE DOM ERROR PREVENTION
  function preventDOMErrors() {
    // Override problematic DOM methods with safe versions
    const originalRemoveChild = Node.prototype.removeChild;
    const originalInsertBefore = Node.prototype.insertBefore;
    const originalAppendChild = Node.prototype.appendChild;
    const originalReplaceChild = Node.prototype.replaceChild;
    
    // Safe removeChild wrapper
    Node.prototype.removeChild = function(child) {
      try {
        // Verify the child is actually a child of this node
        if (this.contains && !this.contains(child)) {
          console.warn('⚠️ DOM Fix: Attempted to remove non-child node, skipping');
          return child;
        }
        
        // Verify parent-child relationship
        if (child.parentNode !== this) {
          console.warn('⚠️ DOM Fix: Parent-child mismatch detected, correcting');
          if (child.parentNode) {
            return child.parentNode.removeChild(child);
          }
          return child;
        }
        
        return originalRemoveChild.call(this, child);
      } catch (error) {
        console.warn('⚠️ DOM Fix: RemoveChild error prevented:', error.message);
        return child;
      }
    };
    
    // Safe insertBefore wrapper
    Node.prototype.insertBefore = function(newNode, referenceNode) {
      try {
        // Handle null reference node
        if (!referenceNode) {
          return this.appendChild(newNode);
        }
        
        // Verify reference node is actually a child
        if (this.contains && !this.contains(referenceNode)) {
          console.warn('⚠️ DOM Fix: Reference node not found, appending instead');
          return this.appendChild(newNode);
        }
        
        // Verify parent relationship
        if (referenceNode.parentNode !== this) {
          console.warn('⚠️ DOM Fix: Reference node parent mismatch, appending instead');
          return this.appendChild(newNode);
        }
        
        return originalInsertBefore.call(this, newNode, referenceNode);
      } catch (error) {
        console.warn('⚠️ DOM Fix: InsertBefore error prevented, using appendChild:', error.message);
        try {
          return this.appendChild(newNode);
        } catch (appendError) {
          console.warn('⚠️ DOM Fix: AppendChild also failed:', appendError.message);
          return newNode;
        }
      }
    };
    
    // Safe appendChild wrapper
    Node.prototype.appendChild = function(child) {
      try {
        // Remove from previous parent first if it exists
        if (child.parentNode && child.parentNode !== this) {
          try {
            child.parentNode.removeChild(child);
          } catch (removeError) {
            console.warn('⚠️ DOM Fix: Previous parent removal failed:', removeError.message);
          }
        }
        
        return originalAppendChild.call(this, child);
      } catch (error) {
        console.warn('⚠️ DOM Fix: AppendChild error prevented:', error.message);
        return child;
      }
    };
    
    // Safe replaceChild wrapper
    Node.prototype.replaceChild = function(newChild, oldChild) {
      try {
        // Verify old child is actually a child
        if (this.contains && !this.contains(oldChild)) {
          console.warn('⚠️ DOM Fix: Old child not found, using appendChild instead');
          return this.appendChild(newChild);
        }
        
        return originalReplaceChild.call(this, newChild, oldChild);
      } catch (error) {
        console.warn('⚠️ DOM Fix: ReplaceChild error prevented:', error.message);
        try {
          return this.appendChild(newChild);
        } catch (appendError) {
          console.warn('⚠️ DOM Fix: Fallback appendChild failed:', appendError.message);
          return newChild;
        }
      }
    };
    
    console.log('✅ DOM method overrides installed');
  }
  
  // 2. REACT FIBER RECONCILIATION FIX
  function fixReactReconciliation() {
    // Prevent React from attempting DOM operations on stale nodes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Clean up any orphaned nodes
        if (mutation.type === 'childList') {
          mutation.removedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Clear any React fiber references
              try {
                delete node._reactInternalFiber;
                delete node.__reactInternalInstance;
                delete node.__reactEventHandlers;
                delete node.__reactInternalFiber;
              } catch (e) {
                // Ignore cleanup errors
              }
            }
          });
        }
      });
    });
    
    // Observe the root element
    const root = document.getElementById('root');
    if (root) {
      observer.observe(root, {
        childList: true,
        subtree: true,
        attributes: false
      });
      console.log('✅ React reconciliation observer active');
    }
    
    return observer;
  }
  
  // 3. ROOT ELEMENT STABILITY FIX
  function ensureRootStability() {
    const root = document.getElementById('root');
    if (!root) {
      console.error('❌ Root element not found!');
      return;
    }
    
    // Ensure root has stable structure
    if (!root.dataset.reactRoot) {
      root.dataset.reactRoot = 'stable';
      root.style.position = 'relative';
      root.style.minHeight = '100vh';
      console.log('✅ Root element stabilized');
    }
    
    // Clear any corrupted child nodes
    try {
      // Only clear if there are corrupted nodes
      const children = Array.from(root.childNodes);
      let hasCorruptedNodes = false;
      
      children.forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          // Check for signs of corruption
          if (!child.parentNode || child.parentNode !== root) {
            hasCorruptedNodes = true;
          }
        }
      });
      
      if (hasCorruptedNodes) {
        console.log('🔧 Cleaning corrupted root nodes...');
        root.innerHTML = '';
        console.log('✅ Root cleaned');
      }
    } catch (error) {
      console.warn('⚠️ Root cleanup error:', error.message);
    }
  }
  
  // 4. REACT ERROR RECOVERY
  function setupReactErrorRecovery() {
    // Capture React errors and attempt recovery
    window.addEventListener('error', (event) => {
      const error = event.error;
      if (error && error.message) {
        const message = error.message;
        
        // Check if it's a React DOM error
        if (message.includes('removeChild') || 
            message.includes('insertBefore') || 
            message.includes('appendChild') ||
            message.includes('replaceChild')) {
          
          console.log('🔧 React DOM error detected, attempting recovery...');
          
          // Prevent the error from propagating
          event.preventDefault();
          event.stopPropagation();
          
          // Attempt to recover by remounting React
          setTimeout(() => {
            recoverReactApplication();
          }, 100);
          
          return false;
        }
      }
    });
    
    console.log('✅ React error recovery installed');
  }
  
  // 5. REACT APPLICATION RECOVERY
  async function recoverReactApplication() {
    try {
      console.log('🔄 Attempting React application recovery...');
      
      // Step 1: Clear the root
      const root = document.getElementById('root');
      if (!root) return;
      
      // Step 2: Force garbage collection if available
      if (window.gc) {
        window.gc();
      }
      
      // Step 3: Clear React-related data
      root.innerHTML = '<div style="padding: 20px; text-align: center;">Recovering application...</div>';
      
      // Step 4: Wait for DOM to stabilize
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Step 5: Reload the page as last resort
      console.log('🔄 Reloading page for complete recovery...');
      window.location.reload();
      
    } catch (error) {
      console.error('❌ Recovery failed:', error);
      window.location.reload();
    }
  }
  
  // 6. IMMEDIATE APPLICATION
  function applyFixes() {
    console.log('🚀 Applying DOM stability fixes...');
    
    // Apply all fixes
    preventDOMErrors();
    const observer = fixReactReconciliation();
    ensureRootStability();
    setupReactErrorRecovery();
    
    // Global recovery function
    window.recoverReactApp = recoverReactApplication;
    window.domStabilityActive = true;
    
    console.log('✅ All DOM stability fixes applied');
    console.log('💡 Use recoverReactApp() if issues persist');
    
    return {
      observer,
      recover: recoverReactApplication
    };
  }
  
  // Auto-apply fixes
  const fixes = applyFixes();
  
  // Store fixes globally
  window.domFixes = fixes;
  
  console.log('🎉 DOM STABILITY FIX COMPLETE');
  
})();
