/**
 * Production Database Configuration
 * Real database setup for production deployment
 */

// Environment configuration
export const DATABASE_CONFIG = {
  // Development (SQLite)
  development: {
    type: 'sqlite',
    database: './steel_store.db',
    synchronize: false, // Never use in production
    logging: true
  },
  
  // Production (PostgreSQL recommended)
  production: {
    type: 'postgresql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'steel_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steel_store_db',
    synchronize: false, // Never use in production
    logging: false,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    
    // Connection pooling for production
    extra: {
      max: 20, // Maximum connections in pool
      min: 5,  // Minimum connections in pool
      acquire: 30000, // Maximum time to acquire connection
      idle: 10000     // Maximum time connection can be idle
    }
  },
  
  // Staging (MySQL alternative)
  staging: {
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306'),
    username: process.env.DB_USERNAME || 'steel_user',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'steel_store_staging',
    synchronize: false,
    logging: true
  }
};

// Production Environment Variables Template
export const REQUIRED_ENV_VARS = {
  production: [
    'DB_HOST',
    'DB_PORT', 
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_SECRET',
    'ENCRYPTION_KEY',
    'ADMIN_EMAIL',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS'
  ]
};

// Database Migration Scripts
export const PRODUCTION_MIGRATIONS = {
  // Initial schema creation
  '001_initial_schema.sql': `
    -- Staff table
    CREATE TABLE IF NOT EXISTS staff (
      id SERIAL PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      employee_id VARCHAR(20) UNIQUE NOT NULL,
      phone VARCHAR(20),
      role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'worker')),
      hire_date DATE NOT NULL,
      salary DECIMAL(10,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      permissions TEXT NOT NULL DEFAULT '[]',
      created_by VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Customers table
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      customer_id VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      address TEXT,
      cnic VARCHAR(20),
      credit_limit DECIMAL(12,2) DEFAULT 0,
      current_balance DECIMAL(12,2) DEFAULT 0,
      is_active BOOLEAN DEFAULT true,
      created_by VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Products table
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      product_id VARCHAR(20) UNIQUE NOT NULL,
      name VARCHAR(100) NOT NULL,
      category VARCHAR(50),
      unit_price DECIMAL(10,2) NOT NULL,
      stock_quantity INTEGER DEFAULT 0,
      min_stock_level INTEGER DEFAULT 0,
      unit VARCHAR(20) DEFAULT 'kg',
      is_active BOOLEAN DEFAULT true,
      created_by VARCHAR(50) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit logs table
    CREATE TABLE IF NOT EXISTS audit_logs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL,
      user_name VARCHAR(50) NOT NULL,
      action VARCHAR(20) NOT NULL,
      entity_type VARCHAR(20) NOT NULL,
      entity_id VARCHAR(50) NOT NULL,
      old_values TEXT,
      new_values TEXT,
      description TEXT NOT NULL,
      ip_address VARCHAR(45),
      user_agent TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      session_id VARCHAR(100)
    );

    -- Indexes for performance
    CREATE INDEX IF NOT EXISTS idx_staff_username ON staff(username);
    CREATE INDEX IF NOT EXISTS idx_staff_employee_id ON staff(employee_id);
    CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);
    CREATE INDEX IF NOT EXISTS idx_customers_customer_id ON customers(customer_id);
    CREATE INDEX IF NOT EXISTS idx_products_product_id ON products(product_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
  `,

  // Performance optimizations
  '002_performance_optimizations.sql': `
    -- Additional indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_staff_active ON staff(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(is_active) WHERE is_active = true;
    CREATE INDEX IF NOT EXISTS idx_products_active ON products(is_active) WHERE is_active = true;
    
    -- Composite indexes for complex queries
    CREATE INDEX IF NOT EXISTS idx_audit_logs_user_action ON audit_logs(user_id, action, timestamp);
    CREATE INDEX IF NOT EXISTS idx_staff_role_active ON staff(role, is_active);
    
    -- Enable auto-vacuum for SQLite (if using SQLite)
    PRAGMA auto_vacuum = FULL;
    PRAGMA journal_mode = WAL;
  `,

  // Data validation triggers
  '003_data_validation.sql': `
    -- Update timestamp trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
    END;
    $$ language 'plpgsql';

    -- Apply update triggers
    CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON staff
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `
};

// Production Security Settings
export const SECURITY_CONFIG = {
  // Password requirements
  password: {
    minLength: 8,
    requireUppercase: true,
    requireLowercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
    maxAttempts: 5,
    lockoutDuration: 900000 // 15 minutes
  },

  // Session management
  session: {
    maxAge: 28800000, // 8 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'strict'
  },

  // Rate limiting
  rateLimit: {
    windowMs: 900000, // 15 minutes
    maxAttempts: 100, // Per IP
    skipSuccessfulRequests: true
  },

  // CORS settings
  cors: {
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
    credentials: true
  }
};

// Production Logging Configuration
export const LOGGING_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  format: 'json',
  
  transports: {
    file: {
      filename: 'logs/steel-store.log',
      maxSize: '20m',
      maxFiles: '14d'
    },
    
    error: {
      filename: 'logs/error.log',
      level: 'error'
    }
  },

  // Structured logging fields
  defaultMeta: {
    service: 'steel-store-management',
    version: process.env.APP_VERSION || '1.0.0'
  }
};

// Production Backup Configuration
export const BACKUP_CONFIG = {
  // Automated backup schedule
  schedule: '0 2 * * *', // Daily at 2 AM
  
  // Retention policy
  retention: {
    daily: 7,    // Keep 7 daily backups
    weekly: 4,   // Keep 4 weekly backups
    monthly: 12  // Keep 12 monthly backups
  },

  // Storage options
  storage: {
    local: {
      path: './backups',
      compress: true
    },
    
    s3: {
      bucket: process.env.BACKUP_S3_BUCKET,
      region: process.env.AWS_REGION || 'us-east-1',
      encrypt: true
    }
  }
};

// Health Check Configuration
export const HEALTH_CHECK = {
  endpoints: [
    '/health',
    '/health/database',
    '/health/detailed'
  ],
  
  checks: {
    database: {
      timeout: 5000,
      query: 'SELECT 1'
    },
    
    memory: {
      threshold: 0.9 // 90% memory usage
    },
    
    disk: {
      threshold: 0.85 // 85% disk usage
    }
  }
};

export default {
  DATABASE_CONFIG,
  REQUIRED_ENV_VARS,
  PRODUCTION_MIGRATIONS,
  SECURITY_CONFIG,
  LOGGING_CONFIG,
  BACKUP_CONFIG,
  HEALTH_CHECK
};
