// Auth Context Error Prevention and Recovery System
// This file contains additional safeguards to prevent the "useAuth must be used within an AuthProvider" error

// Global error handler for auth context issues
if (typeof window !== 'undefined') {
  // Override the default React error handling for auth context issues
  window.addEventListener('error', (event) => {
    if (event.error && event.error.message && 
        event.error.message.includes('useAuth must be used within an AuthProvider')) {
      
      console.error('🚨 Auth context error detected, attempting recovery...');
      
      // Prevent the default error handling
      event.preventDefault();
      
      // Clear any potentially corrupted data
      try {
        localStorage.removeItem('auth_user');
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }
      
      // Show a user-friendly error message instead of crashing
      const errorDiv = document.createElement('div');
      errorDiv.innerHTML = `
        <div style="
          position: fixed; 
          top: 0; 
          left: 0; 
          width: 100%; 
          height: 100%; 
          background: rgba(0,0,0,0.8); 
          display: flex; 
          align-items: center; 
          justify-content: center;
          z-index: 10000;
          font-family: system-ui, sans-serif;
        ">
          <div style="
            background: white; 
            padding: 2rem; 
            border-radius: 8px; 
            text-align: center;
            max-width: 400px;
            margin: 1rem;
          ">
            <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
            <h2 style="margin-bottom: 1rem;">Application Error</h2>
            <p style="margin-bottom: 1rem; color: #666;">
              There was an error with the authentication system. 
              Please reload the application.
            </p>
            <button 
              onclick="localStorage.clear(); sessionStorage.clear(); window.location.reload();" 
              style="
                background: #3B82F6; 
                color: white; 
                border: none; 
                padding: 0.5rem 1rem; 
                border-radius: 4px; 
                cursor: pointer;
                font-size: 1rem;
              "
            >
              Clear Data & Reload
            </button>
          </div>
        </div>
      `;
      
      document.body.appendChild(errorDiv);
      
      // Auto-reload after 10 seconds if user doesn't click
      setTimeout(() => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }, 10000);
      
      return true; // Indicate we handled the error
    }
  });

  // Also handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason && event.reason.message && 
        event.reason.message.includes('useAuth must be used within an AuthProvider')) {
      
      console.error('🚨 Unhandled auth context promise rejection detected');
      event.preventDefault();
      
      // Same recovery logic as above
      localStorage.clear();
      sessionStorage.clear();
      setTimeout(() => window.location.reload(), 1000);
    }
  });
}

export const AuthContextErrorHandler = {
  install: () => {
    console.log('🛡️ Auth context error handler installed');
  }
};

export default AuthContextErrorHandler;
