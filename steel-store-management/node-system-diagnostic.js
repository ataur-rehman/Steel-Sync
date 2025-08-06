// NODE.JS SYSTEM DIAGNOSTIC - ROOT CAUSE IDENTIFICATION
console.log('🔍 SYSTEM INCONSISTENCY DIAGNOSTIC - STARTING...');

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 1. FILE SYSTEM ANALYSIS
console.log('\n📂 ANALYZING FILE SYSTEM STRUCTURE...');

function analyzeFiles() {
    const results = {
        databaseFiles: [],
        serviceFiles: [],
        componentFiles: [],
        inconsistencies: []
    };

    try {
        const files = fs.readdirSync(__dirname, { recursive: true });
        
        files.forEach(file => {
            const filePath = path.join(__dirname, file);
            if (fs.statSync(filePath).isFile()) {
                if (file.includes('database') || file.includes('Database')) {
                    results.databaseFiles.push(file);
                }
                if (file.includes('service') || file.includes('Service')) {
                    results.serviceFiles.push(file);
                }
                if (file.includes('vendor') || file.includes('Vendor')) {
                    results.componentFiles.push(file);
                }
            }
        });

        console.log('📊 DATABASE FILES FOUND:', results.databaseFiles.length);
        results.databaseFiles.forEach(f => console.log(`  - ${f}`));

        console.log('📊 SERVICE FILES FOUND:', results.serviceFiles.length);
        results.serviceFiles.forEach(f => console.log(`  - ${f}`));

        console.log('📊 VENDOR-RELATED FILES FOUND:', results.componentFiles.length);
        results.componentFiles.forEach(f => console.log(`  - ${f}`));

    } catch (error) {
        console.error('❌ FILE ANALYSIS ERROR:', error.message);
    }

    return results;
}

// 2. SOURCE CODE ANALYSIS
function analyzeSourceCode() {
    console.log('\n🔍 ANALYZING SOURCE CODE PATTERNS...');
    
    const patterns = {
        databaseServiceReferences: 0,
        enhancedDatabaseServiceReferences: 0,
        deleteVendorCalls: 0,
        checkVendorSafetyCalls: 0,
        errorHandlingPatterns: 0
    };

    try {
        // Check main database file
        if (fs.existsSync(path.join(__dirname, 'src', 'database.ts'))) {
            const dbContent = fs.readFileSync(path.join(__dirname, 'src', 'database.ts'), 'utf8');
            
            console.log('📋 DATABASE.TS ANALYSIS:');
            console.log(`  - File size: ${dbContent.length} characters`);
            console.log(`  - Contains deleteVendor: ${dbContent.includes('deleteVendor')}`);
            console.log(`  - Contains checkVendorDeletionSafety: ${dbContent.includes('checkVendorDeletionSafety')}`);
            console.log(`  - Contains transaction handling: ${dbContent.includes('BEGIN TRANSACTION')}`);
            console.log(`  - Contains error throwing: ${dbContent.includes('throw new Error')}`);
            
            // Check for inconsistent return patterns
            const executeMatches = dbContent.match(/execute\([^)]*\)/g) || [];
            const selectMatches = dbContent.match(/select\([^)]*\)/g) || [];
            console.log(`  - execute() calls: ${executeMatches.length}`);
            console.log(`  - select() calls: ${selectMatches.length}`);
        }

        // Check VendorManagement component
        if (fs.existsSync(path.join(__dirname, 'src', 'components', 'VendorManagement.tsx'))) {
            const vmContent = fs.readFileSync(path.join(__dirname, 'src', 'components', 'VendorManagement.tsx'), 'utf8');
            
            console.log('📋 VENDORMANAGEMENT.TSX ANALYSIS:');
            console.log(`  - File size: ${vmContent.length} characters`);
            console.log(`  - Contains confirmDeleteVendor: ${vmContent.includes('confirmDeleteVendor')}`);
            console.log(`  - Contains error handling: ${vmContent.includes('catch')}`);
            console.log(`  - Contains alert/notification: ${vmContent.includes('alert') || vmContent.includes('notification')}`);
            
            // Check for database service usage
            console.log(`  - Uses db.deleteVendor: ${vmContent.includes('db.deleteVendor')}`);
            console.log(`  - Uses db.checkVendorDeletionSafety: ${vmContent.includes('db.checkVendorDeletionSafety')}`);
        }

    } catch (error) {
        console.error('❌ SOURCE CODE ANALYSIS ERROR:', error.message);
    }

    return patterns;
}

// 3. CONFIGURATION ANALYSIS
function analyzeConfiguration() {
    console.log('\n⚙️ ANALYZING CONFIGURATION...');
    
    try {
        // Check package.json
        if (fs.existsSync(path.join(__dirname, 'package.json'))) {
            const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
            console.log('📦 PACKAGE.JSON ANALYSIS:');
            console.log(`  - Project name: ${packageJson.name || 'Not specified'}`);
            console.log(`  - Dependencies: ${Object.keys(packageJson.dependencies || {}).length}`);
            console.log(`  - Dev dependencies: ${Object.keys(packageJson.devDependencies || {}).length}`);
            
            // Check for database-related dependencies
            const deps = {...(packageJson.dependencies || {}), ...(packageJson.devDependencies || {})};
            console.log(`  - SQLite dependencies: ${Object.keys(deps).filter(d => d.includes('sqlite')).join(', ') || 'None'}`);
            console.log(`  - Database dependencies: ${Object.keys(deps).filter(d => d.includes('db') || d.includes('database')).join(', ') || 'None'}`);
        }

        // Check for Vite config
        if (fs.existsSync(path.join(__dirname, 'vite.config.ts'))) {
            console.log('⚡ VITE CONFIG FOUND');
        }

        // Check for TypeScript config
        if (fs.existsSync(path.join(__dirname, 'tsconfig.json'))) {
            console.log('📘 TYPESCRIPT CONFIG FOUND');
        }

    } catch (error) {
        console.error('❌ CONFIGURATION ANALYSIS ERROR:', error.message);
    }
}

// 4. INCONSISTENCY DETECTION
function detectInconsistencies() {
    console.log('\n🚨 DETECTING INCONSISTENCIES...');
    
    const inconsistencies = [];

    try {
        // Check for multiple database service files
        const dbFiles = [
            'src/database.ts',
            'src/services/database.ts', 
            'src/services/enhanced-database.ts',
            'src/enhanced-service.ts'
        ];

        const existingDbFiles = dbFiles.filter(f => fs.existsSync(path.join(__dirname, f)));
        
        if (existingDbFiles.length > 1) {
            inconsistencies.push({
                type: 'MULTIPLE_DATABASE_SERVICES',
                severity: 'CRITICAL',
                description: `Found ${existingDbFiles.length} database service files`,
                files: existingDbFiles,
                impact: 'Different parts of app might use different database instances'
            });
        }

        // Check for emergency fix files
        const emergencyFiles = fs.readdirSync(__dirname).filter(f => 
            f.includes('emergency') || f.includes('fix') || f.includes('comprehensive')
        );

        if (emergencyFiles.length > 5) {
            inconsistencies.push({
                type: 'TOO_MANY_FIXES',
                severity: 'HIGH',
                description: `Found ${emergencyFiles.length} emergency/fix files`,
                files: emergencyFiles.slice(0, 5).concat(['...']),
                impact: 'Indicates repeated failed attempts to fix the same issue'
            });
        }

        // Check for database backup files
        const backupFiles = fs.readdirSync(__dirname).filter(f => 
            f.includes('backup') || f.includes('errors')
        );

        if (backupFiles.length > 0) {
            inconsistencies.push({
                type: 'DATABASE_CORRUPTION_EVIDENCE',
                severity: 'HIGH',
                description: `Found ${backupFiles.length} backup/error database files`,
                files: backupFiles,
                impact: 'Suggests database corruption or migration issues'
            });
        }

        console.log(`🔍 FOUND ${inconsistencies.length} INCONSISTENCIES:`);
        inconsistencies.forEach((inc, i) => {
            console.log(`\n${i + 1}. ${inc.type} (${inc.severity})`);
            console.log(`   📝 ${inc.description}`);
            console.log(`   📁 Files: ${inc.files.join(', ')}`);
            console.log(`   💥 Impact: ${inc.impact}`);
        });

    } catch (error) {
        console.error('❌ INCONSISTENCY DETECTION ERROR:', error.message);
    }

    return inconsistencies;
}

// 5. GENERATE RECOMMENDATIONS
function generateRecommendations(inconsistencies) {
    console.log('\n💡 GENERATING RECOMMENDATIONS...');
    
    const recommendations = [];

    inconsistencies.forEach(inc => {
        switch (inc.type) {
            case 'MULTIPLE_DATABASE_SERVICES':
                recommendations.push({
                    priority: 1,
                    action: 'CONSOLIDATE_DATABASE_SERVICES',
                    description: 'Merge all database services into a single, authoritative service',
                    steps: [
                        '1. Identify which database service is currently being used by the UI',
                        '2. Migrate all functionality to that single service',
                        '3. Remove or rename backup services to prevent confusion',
                        '4. Update all imports to use the single service'
                    ]
                });
                break;
                
            case 'TOO_MANY_FIXES':
                recommendations.push({
                    priority: 1,
                    action: 'CLEAN_UP_FIX_FILES',
                    description: 'Remove emergency fix files and implement permanent solution',
                    steps: [
                        '1. Archive all emergency fix files',
                        '2. Identify the root cause from diagnostic results',
                        '3. Implement clean, permanent fix in the main codebase',
                        '4. Test thoroughly to ensure fix works'
                    ]
                });
                break;
                
            case 'DATABASE_CORRUPTION_EVIDENCE':
                recommendations.push({
                    priority: 2,
                    action: 'DATABASE_INTEGRITY_CHECK',
                    description: 'Verify and repair database integrity',
                    steps: [
                        '1. Check database file integrity',
                        '2. Verify table structure matches expected schema',
                        '3. Check for foreign key constraint violations',
                        '4. Repair or rebuild database if necessary'
                    ]
                });
                break;
        }
    });

    console.log(`📋 ${recommendations.length} RECOMMENDATIONS GENERATED:`);
    recommendations.forEach((rec, i) => {
        console.log(`\n${i + 1}. ${rec.action} (Priority: ${rec.priority})`);
        console.log(`   📝 ${rec.description}`);
        rec.steps.forEach(step => console.log(`   ${step}`));
    });

    return recommendations;
}

// MAIN EXECUTION
async function runDiagnostic() {
    console.log('🚀 STARTING COMPREHENSIVE SYSTEM DIAGNOSTIC...\n');
    
    const fileAnalysis = analyzeFiles();
    const sourceAnalysis = analyzeSourceCode();
    const configAnalysis = analyzeConfiguration();
    const inconsistencies = detectInconsistencies();
    const recommendations = generateRecommendations(inconsistencies);
    
    console.log('\n📊 DIAGNOSTIC SUMMARY:');
    console.log('════════════════════════════════════════');
    console.log(`📂 Database files found: ${fileAnalysis.databaseFiles.length}`);
    console.log(`🔧 Service files found: ${fileAnalysis.serviceFiles.length}`);
    console.log(`🚨 Inconsistencies detected: ${inconsistencies.length}`);
    console.log(`💡 Recommendations generated: ${recommendations.length}`);
    
    if (inconsistencies.length > 0) {
        console.log('\n🎯 TOP PRIORITY ACTIONS:');
        recommendations
            .filter(r => r.priority === 1)
            .forEach(r => console.log(`  ⭐ ${r.action}: ${r.description}`));
    } else {
        console.log('\n✅ NO CRITICAL INCONSISTENCIES DETECTED');
        console.log('   The vendor deletion issue might be in the execution flow or data handling');
    }
    
    console.log('\n🔍 DIAGNOSTIC COMPLETE');
    console.log('════════════════════════════════════════');
}

runDiagnostic().catch(console.error);
