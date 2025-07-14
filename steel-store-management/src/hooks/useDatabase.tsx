import { useContext, createContext, useEffect, useState } from 'react';
import { DatabaseService, db } from '../services/database';

interface DatabaseContextType {
  db: DatabaseService;
  initialized: boolean;
}

const DatabaseContext = createContext<DatabaseContextType | undefined>(undefined);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initDb = async () => {
      try {
        await db.initialize();
        setInitialized(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    initDb();
  }, []);

  return (
    <DatabaseContext.Provider value={{ db, initialized }}>
      {children}
    </DatabaseContext.Provider>
  );
}

export function useDatabase() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error('useDatabase must be used within DatabaseProvider');
  }
  return context;
}