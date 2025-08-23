import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface User {
  id: string;
  username: string;
  role: string;
  permissions?: Record<string, string> | string[]; // Support both module-based and legacy permissions
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);

  // Enhanced debugging
  console.log('useAuth called - context check:', {
    contextExists: context !== undefined,
    contextValue: context,
    stackTrace: new Error().stack?.split('\n').slice(1, 4)
  });

  if (context === undefined) {
    // More detailed error with debugging info
    console.error('❌ CRITICAL: useAuth called outside AuthProvider');
    console.error('Current context:', context);
    console.error('DOM state:', {
      body: document.body?.innerHTML?.length || 'no body',
      hasAuthProvider: document.querySelector('[data-auth-provider]') !== null,
      reactRoot: document.querySelector('#root')?.innerHTML?.length || 'no root'
    });
    console.error('Stack trace:', new Error().stack);

    // Try to recover by checking if we're in the middle of a hot reload
    if (process.env.NODE_ENV === 'development') {
      console.warn('🔄 Development mode - attempting graceful degradation');
      // Return a fallback context for development
      return {
        user: null,
        loading: true,
        login: async () => false,
        logout: () => { }
      };
    }

    throw new Error('useAuth must be used within an AuthProvider. Make sure your component is wrapped with <AuthProvider>.');
  }
  return context;
};

// Check if we're running in Tauri
const isTauri = () => {
  return typeof window !== 'undefined' && '__TAURI__' in window;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Initialize auth state
    console.log('AuthProvider initializing...');

    // Add small delay to ensure DOM is ready
    const initAuth = async () => {
      try {
        // Check for existing authentication state
        const savedUser = localStorage.getItem('auth_user');
        if (savedUser) {
          const parsedUser = JSON.parse(savedUser);
          console.log('Restored user from localStorage:', parsedUser);
          setUser(parsedUser);
        }
      } catch (error) {
        console.warn('Failed to restore user from localStorage:', error);
        localStorage.removeItem('auth_user'); // Clear corrupted data
      }

      setLoading(false);
      setIsInitialized(true);
      console.log('AuthProvider initialized');
    };

    // Small delay to prevent race conditions
    setTimeout(initAuth, 10);
  }, []);

  // Don't render children until initialized
  if (!isInitialized) {
    return (
      <div data-auth-provider="initializing" className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting to authenticate:', username);

      let isAuthenticated = false;
      let userRole = 'worker';
      let userId = '1';

      if (isTauri()) {
        try {
          // Use Tauri authentication with database check
          const authResult = await invoke('authenticate_user', {
            username: username,
            password: password
          });

          if (authResult && typeof authResult === 'object' && 'success' in authResult) {
            const result = authResult as { success: boolean; role?: string; id?: string };
            isAuthenticated = result.success || false;
            userRole = result.role || 'worker';
            userId = result.id || '1';
          } else {
            isAuthenticated = !!authResult;
          }

          console.log('Tauri authentication result:', { isAuthenticated, userRole, userId });
        } catch (error) {
          console.error('Tauri authentication error:', error);
          // Fallback to browser authentication
          isAuthenticated = false;
        }
      }

      // Browser fallback - check against common test credentials and database
      if (!isAuthenticated) {
        console.log('Using browser fallback authentication');

        // Check hardcoded credentials
        if ((username === 'admin' && password === 'admin123') ||
          (username === 'ittehad' && password === 'store!123')) {
          isAuthenticated = true;
          userRole = username === 'admin' ? 'admin' : 'admin'; // Both have admin privileges
          userId = username === 'admin' ? '1' : '2';
        } else {
          // Try to authenticate against the staff database
          try {
            console.log('Attempting staff lookup for:', username);
            const { staffService } = await import('../services/staffService');
            // Since authentication is removed, just verify staff exists and is active
            const allStaff = await staffService.getAllStaff({ search: username });
            const staff = allStaff.find(s =>
              s.full_name.toLowerCase() === username.toLowerCase() && s.is_active
            );

            if (staff) {
              isAuthenticated = true;
              userRole = staff.role;
              userId = staff.id.toString();

              // 🔧 CRITICAL FIX: Load actual custom permissions from database
              try {
                const { staffService } = await import('../services/staffService');
                const customPermissions = await staffService.getStaffPermissions(staff.id);

                console.log('✅ Staff authentication successful:', {
                  username,
                  role: userRole,
                  userId,
                  employeeId: staff.employee_id,
                  customPermissions: customPermissions
                });

                // Set user with actual database permissions (this is the critical fix!)
                setUser({
                  id: userId,
                  username: username,
                  role: userRole,
                  permissions: customPermissions // Use database permissions instead of hardcoded ones
                });

              } catch (error) {
                console.error('Failed to load custom permissions, using role defaults:', error);
                // Fallback to empty permissions if database load fails
                setUser({
                  id: userId,
                  username: username,
                  role: userRole,
                  permissions: {} // This will make useRoleAccess fall back to role defaults
                });
              }

              // Early return for database authentication
              // Log the login event
              try {
                const { auditLogService } = await import('../services/auditLogService');
                await auditLogService.logEvent({
                  user_id: parseInt(userId),
                  user_name: username,
                  action: 'LOGIN',
                  entity_type: 'SYSTEM',
                  entity_id: parseInt(userId),
                  description: `User ${username} logged in with role: ${userRole}`,
                  new_values: { role: userRole, login_time: new Date().toISOString() }
                });
              } catch (error) {
                console.error('Failed to log login event:', error);
              }

              return true;
            } else {
              console.log('❌ Database authentication failed: Invalid credentials or user not found');
            }
          } catch (error) {
            console.error('❌ Database authentication error:', error);
          }
        }

        console.log('Browser authentication result:', { isAuthenticated, userRole });
      }

      if (isAuthenticated) {
        const newUser: User = {
          id: userId,
          username: username,
          role: userRole
        };

        setUser(newUser);

        // Save to localStorage for persistence
        try {
          localStorage.setItem('auth_user', JSON.stringify(newUser));
          console.log('User state saved to localStorage');
        } catch (error) {
          console.warn('Failed to save user to localStorage:', error);
        }

        // Log the login event
        try {
          const { auditLogService } = await import('../services/auditLogService');
          await auditLogService.logEvent({
            user_id: parseInt(userId),
            user_name: username,
            action: 'LOGIN',
            entity_type: 'SYSTEM',
            entity_id: parseInt(userId),
            description: `User ${username} logged in with role: ${userRole}`,
            new_values: { role: userRole, login_time: new Date().toISOString() }
          });
        } catch (error) {
          console.error('Failed to log login event:', error);
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = async () => {
    if (user) {
      // Log the logout event
      try {
        const { auditLogService } = await import('../services/auditLogService');
        await auditLogService.logEvent({
          user_id: parseInt(user.id),
          user_name: user.username,
          action: 'LOGOUT',
          entity_type: 'SYSTEM',
          entity_id: parseInt(user.id),
          description: `User ${user.username} logged out`,
          old_values: { logout_time: new Date().toISOString() }
        });
      } catch (error) {
        console.error('Failed to log logout event:', error);
      }
    }

    setUser(null);

    // Clear localStorage
    try {
      localStorage.removeItem('auth_user');
      console.log('User state cleared from localStorage');
    } catch (error) {
      console.warn('Failed to clear user from localStorage:', error);
    }
  };

  return (
    <div data-auth-provider="true">
      <AuthContext.Provider value={{ user, loading, login, logout }}>
        {children}
      </AuthContext.Provider>
    </div>
  );
};