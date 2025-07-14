import React, { createContext, useContext, useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';

interface User {
  id: string;
  username: string;
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
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
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

  useEffect(() => {
    setLoading(false);
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      console.log('Attempting to authenticate:', username);
      
      let isAuthenticated = false;
      
      if (isTauri()) {
        // Use Tauri authentication
        isAuthenticated = await invoke('authenticate_user', {
          username: username,
          password: password
        });
        console.log('Tauri authentication result:', isAuthenticated);
      } else {
        // Browser fallback - simulate authentication
        console.log('Using browser fallback authentication');
        isAuthenticated = username === 'admin' && password === 'admin123';
        console.log('Browser authentication result:', isAuthenticated);
      }

      if (isAuthenticated) {
        const newUser: User = {
          id: '1',
          username: username
        };
        
        setUser(newUser);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};