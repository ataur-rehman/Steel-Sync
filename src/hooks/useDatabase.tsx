import { useContext, createContext, useEffect, useState } from 'react';
import { DatabaseService, db } from '../services/database';

interface DatabaseContextType {
  db: DatabaseService;
  initialized: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  console.log('🏗️ DatabaseProvider mounting...', { children: !!children });

  useEffect(() => {
    const initDb = async () => {
      try {
        console.log('🔄 DatabaseProvider: Initializing database...');
        await db.initialize();
        console.log('✅ DatabaseProvider: Database initialized successfully');
        setInitialized(true);
      } catch (error) {
        console.error('❌ DatabaseProvider: Failed to initialize database:', error);
      }
    };
    initDb();
  }, []);

  console.log('🏗️ DatabaseProvider rendering with context:', { db: !!db, initialized });

  return (
    <DatabaseContext.Provider value={{ db, initialized }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);

  // Debug logging
  console.log('🔍 useDatabase called:', {
    contextExists: !!context,
    contextValue: context,
    stackTrace: new Error().stack?.split('\n').slice(0, 3)
  });

  if (!context) {
    console.error('❌ CRITICAL: useDatabase called outside DatabaseProvider');
    console.error('Current context:', context);
    console.error('DOM state:', {
      body: document.body?.children?.length,
      hasAuthProvider: document.querySelector('[data-provider="auth"]') !== null,
      reactRoot: document.querySelector('#root')?.children?.length
    });
    console.error('Stack trace:', new Error().stack);
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
}