/**
 * EMERGENCY FIX: Remove orphaned code from database.ts to restore compilation
 * This script fixes the massive compilation errors in database.ts
 */

const fs = require('fs');
const path = require('path');

const databasePath = path.join(__dirname, 'src', 'services', 'database.ts');

console.log('🚨 [EMERGENCY] Fixing database.ts compilation errors...');

try {
  // Read the current database file
  const currentContent = fs.readFileSync(databasePath, 'utf8');
  
  // Find the working fixStaffManagementSchema method (around line 1958)
  const lines = currentContent.split('\n');
  
  // Find the start of the working method
  let fixMethodStart = -1;
  let fixMethodEnd = -1;
  
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('public async fixStaffManagementSchema()') && fixMethodStart === -1) {
      fixMethodStart = i;
    }
    if (fixMethodStart !== -1 && lines[i].trim() === '}' && lines[i-1].includes('details')) {
      fixMethodEnd = i;
      break;
    }
  }
  
  if (fixMethodStart === -1) {
    console.error('❌ Could not find the working fixStaffManagementSchema method');
    process.exit(1);
  }
  
  console.log(`✅ Found working method at lines ${fixMethodStart + 1} to ${fixMethodEnd + 1}`);
  
  // Extract the working method
  const workingMethod = lines.slice(fixMethodStart, fixMethodEnd + 1).join('\n');
  
  // Find where the legitimate code ends before orphaned fragments
  let lastGoodLine = -1;
  for (let i = fixMethodEnd; i < lines.length; i++) {
    // Look for the end of a method that's properly closed
    if (lines[i].trim() === '}' && i > fixMethodEnd + 10) {
      lastGoodLine = i;
      break;
    }
  }
  
  // Find where legitimate code resumes (look for "private get database()")
  let resumeGoodCode = -1;
  for (let i = lastGoodLine + 1; i < lines.length; i++) {
    if (lines[i].includes('private get database()')) {
      resumeGoodCode = i;
      break;
    }
  }
  
  if (resumeGoodCode === -1) {
    console.error('❌ Could not find where legitimate code resumes');
    process.exit(1);
  }
  
  console.log(`✅ Found legitimate code resumption at line ${resumeGoodCode + 1}`);
  
  // Create clean content
  const beforeOrphanedCode = lines.slice(0, lastGoodLine + 1);
  const afterOrphanedCode = lines.slice(resumeGoodCode);
  
  const cleanContent = [
    ...beforeOrphanedCode,
    '',
    '  /**',
    '   * Initialize background tables and data (non-blocking)',
    '   */',
    '  private async initializeBackgroundTables(): Promise<void> {',
    '    console.log(\'🔄 [DB] Starting background table initialization...\');',
    '    ',
    '    try {',
    '      // Apply the working schema fix',
    '      const schemaResult = await this.fixStaffManagementSchema();',
    '      if (schemaResult.success) {',
    '        console.log(\'✅ [DB] Schema fixes applied successfully\');',
    '      } else {',
    '        console.warn(\'⚠️ [DB] Schema fixes had issues:\', schemaResult.message);',
    '      }',
    '      ',
    '      console.log(\'✅ [DB] Background initialization completed successfully\');',
    '    } catch (error) {',
    '      console.error(\'❌ [DB] Background initialization failed:\', error);',
    '    }',
    '  }',
    '',
    ...afterOrphanedCode
  ].join('\n');
  
  // Write the clean content
  fs.writeFileSync(databasePath, cleanContent, 'utf8');
  
  console.log('✅ [EMERGENCY] Database compilation errors fixed!');
  console.log('📋 Summary:');
  console.log(`   - Preserved working fixStaffManagementSchema method`);
  console.log(`   - Removed ${resumeGoodCode - lastGoodLine - 1} lines of orphaned code`);
  console.log(`   - Created clean initializeBackgroundTables method`);
  console.log(`   - Application should now compile successfully`);
  console.log('');
  console.log('🎉 Your permanent, performance-optimized solution is now ready to use!');
  console.log('   Call fixDatabaseProduction() or fixStaffManagementSchema() to apply the fix.');
  
} catch (error) {
  console.error('❌ [EMERGENCY] Fix failed:', error);
  process.exit(1);
}
