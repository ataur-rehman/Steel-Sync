// PERMANENT SINGLE DATABASE PATH ENFORCER
// This module ensures the database service ALWAYS uses the Tauri backend path

// The SINGLE database path that both Tauri backend and frontend MUST use
let SINGLE_DATABASE_PATH: string | null = null;
let SINGLE_DATABASE_URL: string | null = null;

/**
 * Get the single database path that matches Tauri backend
 * This function MUST be called before any database operations
 */
export async function getSingleDatabasePath(): Promise<{ path: string; url: string }> {
  
  if (SINGLE_DATABASE_PATH && SINGLE_DATABASE_URL) {
    return {
      path: SINGLE_DATABASE_PATH,
      url: SINGLE_DATABASE_URL
    };
  }
  
  try {
    console.log('[SINGLE_DB] Getting Tauri backend database path...');
    
    // Import Tauri path API - same as main.rs uses
    const { appDataDir } = await import('@tauri-apps/api/path');
    const { join } = await import('@tauri-apps/api/path');
    
    // Get app data directory - matches main.rs logic exactly
    const appDataPath = await appDataDir();
    const dbPath = await join(appDataPath, 'store.db');
    
    // Create database URL in format expected by tauri-plugin-sql
    const dbUrl = `sqlite:${dbPath}`;
    
    // Cache the single path permanently
    SINGLE_DATABASE_PATH = dbPath;
    SINGLE_DATABASE_URL = dbUrl;
    
    console.log('[SINGLE_DB] Database path synchronized with Tauri backend:');
    console.log(`[SINGLE_DB] Path: ${dbPath}`);
    console.log(`[SINGLE_DB] URL: ${dbUrl}`);
    
    return {
      path: dbPath,
      url: dbUrl
    };
    
  } catch (error) {
    console.error('[SINGLE_DB] CRITICAL: Cannot get Tauri backend database path:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`CRITICAL: Cannot synchronize with Tauri backend database: ${errorMessage}`);
  }
}

/**
 * Validates that we're using the single database path
 */
export function validateSingleDatabasePath(dbUrl: string): void {
  if (!SINGLE_DATABASE_URL) {
    throw new Error('CRITICAL: Single database path not initialized. Call getSingleDatabasePath() first.');
  }
  
  if (dbUrl !== SINGLE_DATABASE_URL) {
    console.error('[SINGLE_DB] CRITICAL: Attempted to use wrong database path!');
    console.error(`[SINGLE_DB] Expected: ${SINGLE_DATABASE_URL}`);
    console.error(`[SINGLE_DB] Attempted: ${dbUrl}`);
    throw new Error('CRITICAL: Database path mismatch. This would create dual databases.');
  }
  
  console.log('[SINGLE_DB] Database path validated - using single database');
}
