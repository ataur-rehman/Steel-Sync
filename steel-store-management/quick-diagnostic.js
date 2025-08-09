// Quick Financial Data Check
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔍 FINANCIAL SUMMARY DIAGNOSTIC');
console.log('================================');

// Check if database file exists
const dbPath = join(__dirname, 'steel_store.db');
if (!existsSync(dbPath)) {
  console.log('❌ Database file not found at:', dbPath);
  console.log('   This could be why financial summary shows PKR 0');
  
  // Check alternative locations
  const altPaths = [
    'steel_store.db',
    'src/steel_store.db',
    '../steel_store.db'
  ];
  
  for (const alt of altPaths) {
    if (existsSync(alt)) {
      console.log('✅ Found database at:', alt);
      break;
    }
  }
} else {
  console.log('✅ Database file found');
  
  // Check file size
  const stats = readFileSync(dbPath);
  console.log(`   Database size: ${stats.length} bytes`);
  
  if (stats.length < 1000) {
    console.log('⚠️  Database appears to be very small - might be empty');
  }
}

// Check if we're in the right directory
console.log('\n📁 CURRENT ENVIRONMENT:');
console.log(`   Working directory: ${process.cwd()}`);
console.log(`   Script location: ${__dirname}`);

// Look for any database files in the current directory
import { readdirSync } from 'fs';

const files = readdirSync('.');
const dbFiles = files.filter(f => f.endsWith('.db') || f.endsWith('.sqlite') || f.endsWith('.sqlite3'));

console.log('\n📊 DATABASE FILES FOUND:');
if (dbFiles.length === 0) {
  console.log('   No database files found in current directory');
  console.log('   This explains why Financial Summary shows PKR 0');
} else {
  dbFiles.forEach(file => {
    const stats = readFileSync(file);
    console.log(`   ${file}: ${stats.length} bytes`);
  });
}

console.log('\n💡 LIKELY ISSUE:');
console.log('   The financial summary is showing PKR 0 because:');
console.log('   1. Database file is missing or empty');
console.log('   2. Order S01 data exists but not in the expected database');
console.log('   3. Financial calculation is looking in wrong tables/database');

console.log('\n🔧 SUGGESTED FIXES:');
console.log('   1. Verify database connection and initialization');
console.log('   2. Check if order S01 was created in the correct database');
console.log('   3. Re-run database setup/migration if needed');
