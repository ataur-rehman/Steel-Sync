/**
 * Database Health Check Utility
 * Provides simple health monitoring for the main database service
 */

import { db } from '../services/database';

export interface DatabaseHealthResult {
  isHealthy: boolean;
  checks: {
    name: string;
    status: 'pass' | 'fail';
    details?: string;
    duration?: number;
  }[];
  timestamp: string;
}

export async function performDatabaseHealthCheck(): Promise<DatabaseHealthResult> {
  const checks: DatabaseHealthResult['checks'] = [];
  
  // Check 1: Database initialization
  try {
    const initStart = Date.now();
    await db.initialize();
    checks.push({
      name: 'Database Initialization',
      status: 'pass',
      duration: Date.now() - initStart
    });
  } catch (error) {
    checks.push({
      name: 'Database Initialization',
      status: 'fail',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Check 2: Basic data operations
  try {
    const queryStart = Date.now();
    const customers = await db.getAllCustomers();
    
    checks.push({
      name: 'Basic Data Access',
      status: 'pass',
      details: `Retrieved ${customers?.length || 0} customers`,
      duration: Date.now() - queryStart
    });
  } catch (error) {
    checks.push({
      name: 'Basic Data Access',
      status: 'fail',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Check 3: Product data access
  try {
    const productStart = Date.now();
    const products = await db.getAllProducts();
    
    checks.push({
      name: 'Product Data Access',
      status: 'pass',
      details: `Retrieved ${products?.length || 0} products`,
      duration: Date.now() - productStart
    });
  } catch (error) {
    checks.push({
      name: 'Product Data Access',
      status: 'fail',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  const isHealthy = checks.every(check => check.status === 'pass');
  
  return {
    isHealthy,
    checks,
    timestamp: new Date().toISOString()
  };
}

export function logHealthCheckResult(result: DatabaseHealthResult): void {
  console.log('🏥 Database Health Check Results:', {
    overall: result.isHealthy ? '✅ HEALTHY' : '❌ UNHEALTHY',
    timestamp: result.timestamp,
    checks: result.checks.map(check => ({
      name: check.name,
      status: check.status === 'pass' ? '✅' : '❌',
      duration: check.duration ? `${check.duration}ms` : undefined,
      details: check.details
    }))
  });
}
