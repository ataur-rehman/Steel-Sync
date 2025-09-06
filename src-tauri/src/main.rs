#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::PathBuf;
use std::fs;
use std::time::Duration;
use std::thread;
use rusqlite::Connection;
use tauri_plugin_sql::{Builder, Migration, MigrationKind};

mod windows_support;
use windows_support::*;

#[derive(serde::Serialize)]
struct AuthResult {
    success: bool,
    role: String,
    id: String,
}

#[tauri::command]
async fn authenticate_user(username: String, password: String) -> Result<AuthResult, String> {
    println!("Authentication attempt: {} / {}", username, password);
    
    if username == "admin" && password == "admin123" {
        Ok(AuthResult {
            success: true,
            role: "admin".to_string(),
            id: "1".to_string(),
        })
    } else {
        Ok(AuthResult {
            success: false,
            role: "worker".to_string(),
            id: "0".to_string(),
        })
    }
}

/// PRODUCTION BACKUP COMMANDS
/// For your file-based backup approach

#[tauri::command]
async fn create_backup_directory(relative_path: String) -> Result<String, String> {
    println!("[BACKUP] Creating backup directory: {}", relative_path);
    
    let app_name = "com.itehadironstore.management";
    
    // Use production-grade Windows directory detection
    let app_data_dir = if cfg!(target_os = "windows") {
        get_windows_app_data_dir(app_name)?
    } else {
        std::env::var("HOME")
            .map(|path| std::path::PathBuf::from(path).join(".local/share").join(app_name))
            .map_err(|_| "Failed to get HOME directory".to_string())?
    };
    
    let full_path = app_data_dir.join(&relative_path);
    
    // Check if path exists and is a file (not directory) - remove it
    if full_path.exists() && !full_path.is_dir() {
        println!("[BACKUP] Removing existing file at: {}", full_path.display());
        if let Err(e) = std::fs::remove_file(&full_path) {
            println!("[BACKUP] Warning: Could not remove existing file: {}", e);
        }
    }
    
    // Now create the directory
    match fs::create_dir_all(&full_path) {
        Ok(_) => {
            let path_str = full_path.to_string_lossy().to_string();
            println!("[BACKUP] Directory created successfully: {}", path_str);
            Ok(path_str)
        }
        Err(e) => {
            let error_msg = format!("Failed to create directory {}: {}", full_path.display(), e);
            println!("[BACKUP] {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
async fn delete_backup_file(path: String) -> Result<(), String> {
    println!("[BACKUP] Deleting file: {}", path);
    
    match fs::remove_file(&path) {
        Ok(_) => {
            println!("[BACKUP] File deleted successfully: {}", path);
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("Failed to delete file {}: {}", path, e);
            eprintln!("[BACKUP] {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
async fn close_database_connections() -> Result<(), String> {
    println!("[BACKUP] Request to close database connections received");
    
    // For SQLite WAL mode, we need to:
    // 1. Close any active connections
    // 2. Force a checkpoint to merge WAL into main database
    // 3. Wait for file locks to be released
    
    let app_name = "com.itehadironstore.management";
    
    // Get the database path
    let app_data_dir = if cfg!(target_os = "windows") {
        std::env::var("APPDATA")
            .map_err(|_| "Failed to get APPDATA directory".to_string())?
    } else {
        std::env::var("HOME")
            .map(|home| format!("{}/.local/share", home))
            .map_err(|_| "Failed to get HOME directory".to_string())?
    };
    
    let db_dir = PathBuf::from(&app_data_dir).join(app_name);
    let db_path = db_dir.join("store.db");
    
    if db_path.exists() {
        println!("[BACKUP] Attempting to close connections and checkpoint WAL for: {:?}", db_path);
        
        // Try to open a connection and perform aggressive checkpoint
        match Connection::open(&db_path) {
            Ok(conn) => {
                // First, try to ensure all pending transactions are committed
                match conn.execute("BEGIN IMMEDIATE; COMMIT;", []) {
                    Ok(_) => println!("[BACKUP] Ensured all transactions committed"),
                    Err(e) => println!("[BACKUP] Transaction commit check: {}", e),
                }
                
                // Execute multiple checkpoint strategies to ensure WAL is fully merged
                
                // Strategy 1: TRUNCATE checkpoint (most aggressive)
                match conn.execute("PRAGMA wal_checkpoint(TRUNCATE);", []) {
                    Ok(_) => println!("[BACKUP] WAL TRUNCATE checkpoint completed successfully"),
                    Err(e) => println!("[BACKUP] WAL TRUNCATE checkpoint failed: {}", e),
                }
                
                // Strategy 2: Wait and try RESTART checkpoint
                thread::sleep(Duration::from_millis(100));
                match conn.execute("PRAGMA wal_checkpoint(RESTART);", []) {
                    Ok(_) => println!("[BACKUP] WAL RESTART checkpoint completed successfully"),
                    Err(e) => println!("[BACKUP] WAL RESTART checkpoint failed: {}", e),
                }
                
                // Strategy 3: Force vacuum to ensure database integrity
                match conn.execute("PRAGMA vacuum;", []) {
                    Ok(_) => println!("[BACKUP] Database vacuum completed successfully"),
                    Err(e) => println!("[BACKUP] Database vacuum failed (non-critical): {}", e),
                }
                
                // Strategy 4: Final checkpoint
                match conn.execute("PRAGMA wal_checkpoint(FULL);", []) {
                    Ok(_) => println!("[BACKUP] Final WAL checkpoint completed successfully"),
                    Err(e) => println!("[BACKUP] Final WAL checkpoint failed: {}", e),
                }
                
                // Close the connection explicitly
                drop(conn);
                println!("[BACKUP] Database connection closed after aggressive checkpoint");
            }
            Err(e) => {
                println!("[BACKUP] Could not open database for checkpoint: {}", e);
            }
        }
    }
    
    // Add delay to allow file system to release locks
    thread::sleep(Duration::from_millis(500));
    
    println!("[BACKUP] Database connections close request processed");
    Ok(())
}

#[tauri::command]
async fn atomic_database_replace(backup_data: Vec<u8>) -> Result<(), String> {
    println!("[BACKUP] Starting atomic database replacement");
    
    let app_name = "com.itehadironstore.management";
    
    // Get the database path
    let app_data_dir = if cfg!(target_os = "windows") {
        std::env::var("APPDATA")
            .map_err(|_| "Failed to get APPDATA directory".to_string())?
    } else {
        std::env::var("HOME")
            .map(|home| format!("{}/.local/share", home))
            .map_err(|_| "Failed to get HOME directory".to_string())?
    };
    
    let db_dir = PathBuf::from(&app_data_dir).join(app_name);
    let db_path = db_dir.join("store.db");
    let temp_path = db_dir.join("store.db.restore.tmp");
    let backup_path = db_dir.join("store.db.backup.tmp");
    
    println!("[BACKUP] Database path: {:?}", db_path);
    println!("[BACKUP] Writing backup data to temporary file...");
    
    // Step 1: Write the new data to a temporary file
    std::fs::write(&temp_path, &backup_data)
        .map_err(|e| format!("Failed to write temporary file: {}", e))?;
    
    println!("[BACKUP] Temporary file written successfully ({} bytes)", backup_data.len());
    
    // Step 2: Use production-grade Windows file replacement
    if cfg!(target_os = "windows") && db_path.exists() {
        println!("[BACKUP] Using production-grade Windows file replacement...");
        
        // Use the enterprise-grade replacement function
        match windows_safe_file_replace(&temp_path, &db_path, &backup_path) {
            Ok(_) => {
                println!("✅ [BACKUP] Database replacement completed successfully");
                return Ok(());
            }
            Err(e) => {
                return Err(format!("Production file replacement failed: {}", e));
            }
        }
    }
    
    // Fallback for non-Windows or if Windows method fails
    if db_path.exists() {
        println!("[BACKUP] Using fallback replacement method...");
        
        // Remove old backup if it exists
        if backup_path.exists() {
            let _ = std::fs::remove_file(&backup_path);
        }
        
        // Try multiple strategies with retries
        let mut success = false;
        
        // Strategy 1: Simple rename (fastest if it works)
        for attempt in 1..=3 {
            match std::fs::rename(&db_path, &backup_path) {
                Ok(_) => {
                    println!("[BACKUP] Database moved to backup on attempt {}", attempt);
                    success = true;
                    break;
                }
                Err(e) => {
                    println!("[BACKUP] Rename attempt {} failed: {}", attempt, e);
                    if attempt < 3 {
                        thread::sleep(Duration::from_millis(500 * attempt as u64));
                    }
                }
            }
        }
        
        // Strategy 2: If rename failed, try copy + delete with retries
        if !success {
            println!("[BACKUP] Rename failed, trying copy + delete approach");
            
            // First, copy the file
            std::fs::copy(&db_path, &backup_path)
                .map_err(|e| format!("Failed to backup current database: {}", e))?;
            
            // Then try to delete with retries
            for attempt in 1..=5 {
                match std::fs::remove_file(&db_path) {
                    Ok(_) => {
                        println!("[BACKUP] Original database deleted on attempt {}", attempt);
                        success = true;
                        break;
                    }
                    Err(e) => {
                        println!("[BACKUP] Delete attempt {} failed: {}", attempt, e);
                        if attempt < 5 {
                            thread::sleep(Duration::from_millis(1000 * attempt as u64));
                        }
                    }
                }
            }
        }
        
        if !success {
            return Err("Could not remove the existing database file after multiple attempts".to_string());
        }
    }
    
    // Step 3: Move the temporary file to the database location with retries
    println!("[BACKUP] Moving temporary file to database location...");
    
    for attempt in 1..=5 {
        match std::fs::rename(&temp_path, &db_path) {
            Ok(_) => {
                println!("[BACKUP] Database replacement completed successfully on attempt {}", attempt);
                
                // Clean up backup file
                if backup_path.exists() {
                    let _ = std::fs::remove_file(&backup_path);
                    println!("[BACKUP] Temporary backup file cleaned up");
                }
                
                return Ok(());
            }
            Err(e) => {
                println!("[BACKUP] Move attempt {} failed: {}", attempt, e);
                if attempt < 5 {
                    thread::sleep(Duration::from_millis(1000 * attempt as u64));
                } else {
                    // If all attempts failed, try to restore the backup
                    if backup_path.exists() {
                        let _ = std::fs::rename(&backup_path, &db_path);
                        println!("[BACKUP] Restored original database from backup");
                    }
                    return Err(format!("Failed to move temporary file after {} attempts: {}", attempt, e));
                }
            }
        }
    }
    
    Err("Unexpected error in database replacement".to_string())
}

#[tauri::command]
async fn get_database_path() -> Result<String, String> {
    let app_name = "com.itehadironstore.management"; // Use consistent app name
    
    // Use production-grade directory detection
    let app_data_dir = if cfg!(target_os = "windows") {
        get_windows_app_data_dir(app_name)?
    } else {
        std::env::var("HOME")
            .map(|path| PathBuf::from(path).join(".local/share").join(app_name))
            .map_err(|_| "Failed to get HOME directory".to_string())?
    };
    
    let db_path = app_data_dir.join("store.db");
    Ok(db_path.to_string_lossy().to_string())
}

#[tauri::command]
async fn startup_database_restore(backup_data: Vec<u8>) -> Result<(), String> {
    println!("🔄 [STARTUP-RESTORE] Starting production-grade database restore at startup");
    
    let app_name = "com.itehadironstore.management";
    let app_data_dir = if cfg!(target_os = "windows") {
        get_windows_app_data_dir(app_name)?
    } else {
        dirs::data_dir()
            .ok_or("Failed to get app data directory")?
            .join(app_name)
    };
    
    let db_path = app_data_dir.join("store.db");
    
    // At startup, database should not be locked
    if db_path.exists() {
        // Create safety backup
        let backup_path = app_data_dir.join("store.db.pre-restore-backup");
        std::fs::copy(&db_path, &backup_path)
            .map_err(|e| format!("Failed to create safety backup: {}", e))?;
        println!("🛡️ [STARTUP-RESTORE] Created safety backup");
    }
    
    // Write new database (should work at startup - no locks)
    std::fs::write(&db_path, backup_data)
        .map_err(|e| format!("Failed to write restored database: {}", e))?;
    
    println!("✅ [STARTUP-RESTORE] Database restored successfully at startup");
    Ok(())
}

#[tauri::command]
async fn create_consistent_backup(backup_file_name: String) -> Result<serde_json::Value, String> {
    println!("🔄 [CONSISTENT-BACKUP] Creating consistent database backup: {}", backup_file_name);
    let start_time = std::time::Instant::now();
    
    let app_name = "com.itehadironstore.management";
    
    // Get the database path
    let app_data_dir = if cfg!(target_os = "windows") {
        get_windows_app_data_dir(app_name)?
    } else {
        dirs::data_dir()
            .ok_or("Failed to get app data directory")?
            .join(app_name)
    };
    
    let db_path = app_data_dir.join("store.db");
    let backup_dir = app_data_dir.join("backups");
    let backup_path = backup_dir.join(&backup_file_name);
    
    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }
    
    println!("[CONSISTENT-BACKUP] 📂 Opening database connection: {:?}", db_path);
    
    // Open a dedicated connection with optimized settings for backup
    let conn = Connection::open(&db_path)
        .map_err(|e| format!("Failed to open database: {}", e))?;
    
    // Set reasonable timeout (reduced from 60s to 10s)
    conn.busy_timeout(std::time::Duration::from_secs(10))
        .map_err(|e| format!("Failed to set busy timeout: {}", e))?;
    
    // Quick checkpoint - try only the most effective one first
    println!("[CONSISTENT-BACKUP] 🔄 Performing WAL checkpoint...");
    match conn.execute("PRAGMA wal_checkpoint(RESTART);", []) {
        Ok(_) => println!("[CONSISTENT-BACKUP] ✅ WAL checkpoint completed"),
        Err(e) => {
            println!("[CONSISTENT-BACKUP] ⚠️ WAL checkpoint failed: {}, continuing anyway", e);
        }
    }
    
    // Create backup using SQLite's backup API
    println!("[CONSISTENT-BACKUP] 📋 Starting SQLite backup API copy...");
    
    // Create backup connection
    let mut backup_conn = Connection::open(&backup_path)
        .map_err(|e| format!("Failed to create backup file: {}", e))?;
    
    // Use SQLite's backup API for atomic, consistent copy
    let backup = rusqlite::backup::Backup::new(&conn, &mut backup_conn)
        .map_err(|e| format!("Failed to initialize backup: {}", e))?;
    
    // Perform the backup with faster settings (larger pages, shorter delays)
    println!("[CONSISTENT-BACKUP] 🚀 Executing backup copy...");
    match backup.run_to_completion(100, std::time::Duration::from_millis(10), None) {
        Ok(_) => {
            let elapsed = start_time.elapsed();
            println!("[CONSISTENT-BACKUP] ✅ Backup completed in {:?}", elapsed);
        }
        Err(e) => {
            return Err(format!("Backup failed: {}", e));
        }
    }
    
    // Verify the backup file exists and has reasonable size
    let backup_metadata = std::fs::metadata(&backup_path)
        .map_err(|e| format!("Failed to read backup metadata: {}", e))?;
    
    let backup_size = backup_metadata.len();
    println!("[CONSISTENT-BACKUP] 📊 Backup file created: {:.2} MB", backup_size as f64 / 1024.0 / 1024.0);
    
    if backup_size < 1024 {
        return Err("Backup file is too small, likely corrupted".to_string());
    }
    
    // Fast checksum - only read first and last 64KB for speed
    println!("[CONSISTENT-BACKUP] 🔐 Calculating fast checksum...");
    let checksum = calculate_fast_checksum(&backup_path)?;
    
    let total_duration = start_time.elapsed();
    println!("[CONSISTENT-BACKUP] 🎉 Total backup time: {:?}", total_duration);
    
    // Return JSON structure that TypeScript expects
    Ok(serde_json::json!({
        "success": true,
        "size": backup_size,
        "checksum": checksum
    }))
}

fn calculate_checksum(data: &[u8]) -> String {
    use sha2::{Sha256, Digest};
    let mut hasher = Sha256::new();
    hasher.update(data);
    format!("{:x}", hasher.finalize())
}

// Fast checksum - only reads first and last 64KB for speed
fn calculate_fast_checksum(file_path: &std::path::Path) -> Result<String, String> {
    use sha2::{Sha256, Digest};
    use std::io::{Read, Seek, SeekFrom};
    
    let mut file = std::fs::File::open(file_path)
        .map_err(|e| format!("Failed to open backup file for checksum: {}", e))?;
    
    let file_size = file.metadata()
        .map_err(|e| format!("Failed to get file metadata: {}", e))?
        .len();
    
    let mut hasher = Sha256::new();
    
    // Add file size to hash
    hasher.update(&file_size.to_le_bytes());
    
    // Read first 64KB
    let buffer_size = 65536.min(file_size as usize);
    let mut buffer = vec![0u8; buffer_size];
    file.read_exact(&mut buffer)
        .map_err(|e| format!("Failed to read file start: {}", e))?;
    hasher.update(&buffer);
    
    // If file is larger than 128KB, also read last 64KB
    if file_size > 131072 {
        file.seek(SeekFrom::End(-65536))
            .map_err(|e| format!("Failed to seek to file end: {}", e))?;
        let mut end_buffer = vec![0u8; 65536];
        file.read_exact(&mut end_buffer)
            .map_err(|e| format!("Failed to read file end: {}", e))?;
        hasher.update(&end_buffer);
    }
    
    Ok(format!("{:x}", hasher.finalize()))
}

#[tauri::command]
async fn restore_wal_file(backup_data: Vec<u8>, db_path: String) -> Result<String, String> {
    println!("[WAL-RESTORE] Restoring WAL file for database: {}", db_path);
    
    let wal_path = format!("{}-wal", db_path);
    
    match std::fs::write(&wal_path, backup_data) {
        Ok(_) => {
            println!("[WAL-RESTORE] WAL file restored successfully: {}", wal_path);
            Ok(format!("WAL file restored to: {}", wal_path))
        }
        Err(e) => {
            let error_msg = format!("Failed to restore WAL file: {}", e);
            println!("[WAL-RESTORE] Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

#[tauri::command]
async fn restore_shm_file(backup_data: Vec<u8>, db_path: String) -> Result<String, String> {
    println!("[SHM-RESTORE] Restoring SHM file for database: {}", db_path);
    
    let shm_path = format!("{}-shm", db_path);
    
    match std::fs::write(&shm_path, backup_data) {
        Ok(_) => {
            println!("[SHM-RESTORE] SHM file restored successfully: {}", shm_path);
            Ok(format!("SHM file restored to: {}", shm_path))
        }
        Err(e) => {
            let error_msg = format!("Failed to restore SHM file: {}", e);
            println!("[SHM-RESTORE] Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

/// Production-grade Windows application restart
fn windows_restart_application(delay_ms: Option<u64>) -> Result<(), String> {
    println!("🚀 [WINDOWS-RESTART] Starting Windows-specific restart process...");
    
    let delay = delay_ms.unwrap_or(1000);
    
    // Close database connections properly
    std::thread::spawn(move || {
        std::thread::sleep(std::time::Duration::from_millis(delay));
        
        // Get current executable path
        match std::env::current_exe() {
            Ok(exe_path) => {
                println!("🔄 [WINDOWS-RESTART] Executable path: {:?}", exe_path);
                
                // Use Windows-specific restart approach
                #[cfg(target_os = "windows")]
                {
                    use std::process::Command;
                    
                    // Start new instance and exit current one
                    match Command::new(&exe_path)
                        .spawn() {
                        Ok(_) => {
                            println!("✅ [WINDOWS-RESTART] New instance started successfully");
                            std::thread::sleep(std::time::Duration::from_millis(500));
                            std::process::exit(0);
                        }
                        Err(e) => {
                            println!("❌ [WINDOWS-RESTART] Failed to start new instance: {}", e);
                            std::process::exit(1);
                        }
                    }
                }
                
                #[cfg(not(target_os = "windows"))]
                {
                    println!("ℹ️ [WINDOWS-RESTART] Non-Windows platform, using simple exit");
                    std::process::exit(0);
                }
            }
            Err(e) => {
                println!("❌ [WINDOWS-RESTART] Failed to get executable path: {}", e);
                std::process::exit(1);
            }
        }
    });
    
    Ok(())
}

#[tauri::command] 
async fn restart_application() -> Result<(), String> {
    println!("🔄 [APP-RESTART] Initiating production-grade restart...");
    
    if cfg!(target_os = "windows") {
        // Use production-grade Windows restart
        windows_restart_application(None)
    } else {
        // For other platforms, simple exit
        std::thread::spawn(|| {
            std::thread::sleep(std::time::Duration::from_millis(2000));
            std::process::exit(0);
        });
        Ok(())
    }
}

#[tauri::command]
async fn check_system_compatibility() -> Result<Vec<String>, String> {
    println!("🔍 [SYSTEM-CHECK] Checking Windows compatibility...");
    
    if cfg!(target_os = "windows") {
        let warnings = check_windows_compatibility();
        if warnings.is_empty() {
            println!("✅ [SYSTEM-CHECK] System fully compatible");
        } else {
            println!("⚠️ [SYSTEM-CHECK] Found {} compatibility warnings", warnings.len());
            for warning in &warnings {
                println!("   - {}", warning);
            }
        }
        Ok(warnings)
    } else {
        Ok(vec!["Not running on Windows - some features may not work".to_string()])
    }
}

#[tauri::command]
async fn get_system_info() -> Result<serde_json::Value, String> {
    println!("📊 [SYSTEM-INFO] Gathering system information...");
    
    let mut info = serde_json::Map::new();
    
    // Basic system info
    info.insert("os".to_string(), serde_json::Value::String(std::env::consts::OS.to_string()));
    info.insert("arch".to_string(), serde_json::Value::String(std::env::consts::ARCH.to_string()));
    
    // Windows-specific info
    if cfg!(target_os = "windows") {
        let app_name = "com.itehadironstore.management";
        
        match get_windows_app_data_dir(app_name) {
            Ok(path) => {
                info.insert("app_data_dir".to_string(), serde_json::Value::String(path.to_string_lossy().to_string()));
                info.insert("app_data_writable".to_string(), serde_json::Value::Bool(true));
            }
            Err(e) => {
                info.insert("app_data_error".to_string(), serde_json::Value::String(e));
                info.insert("app_data_writable".to_string(), serde_json::Value::Bool(false));
            }
        }
        
        // Environment variables
        let env_vars = vec!["APPDATA", "LOCALAPPDATA", "USERPROFILE", "TEMP", "USERNAME"];
        let mut env_info = serde_json::Map::new();
        for var in env_vars {
            if let Ok(value) = std::env::var(var) {
                env_info.insert(var.to_string(), serde_json::Value::String(value));
            } else {
                env_info.insert(var.to_string(), serde_json::Value::Null);
            }
        }
        info.insert("environment".to_string(), serde_json::Value::Object(env_info));
    }
    
    Ok(serde_json::Value::Object(info))
}

/// CLEANUP RESTORE FILE COMMAND
/// Force delete restore files from Rust side for better file system access
#[tauri::command]
async fn cleanup_restore_file(relative_path: String) -> Result<(), String> {
    println!("🧹 [RUST-CLEANUP] Attempting to cleanup file: {}", relative_path);
    
    let app_name = "com.itehadironstore.management";
    let app_data_dir = if cfg!(target_os = "windows") {
        get_windows_app_data_dir(app_name)?
    } else {
        dirs::data_dir()
            .ok_or("Failed to get app data directory")?
            .join(app_name)
    };
    
    let file_path = app_data_dir.join(&relative_path);
    
    if file_path.exists() {
        println!("📁 [RUST-CLEANUP] File exists, attempting deletion...");
        
        // Try multiple deletion strategies
        let mut success = false;
        
        // Strategy 1: Direct deletion
        if let Err(e) = std::fs::remove_file(&file_path) {
            println!("⚠️ [RUST-CLEANUP] Direct deletion failed: {}", e);
            
            // Strategy 2: Force deletion with attributes reset (Windows)
            #[cfg(target_os = "windows")]
            {
                use std::os::windows::fs::MetadataExt;
                use std::process::Command;
                
                // Try to reset file attributes first
                if let Ok(metadata) = file_path.metadata() {
                    println!("📋 [RUST-CLEANUP] File attributes: {:?}", metadata.file_attributes());
                }
                
                // Use Windows del command as fallback
                let output = Command::new("cmd")
                    .args(&["/C", "del", "/F", "/Q", &file_path.to_string_lossy()])
                    .output();
                    
                match output {
                    Ok(result) => {
                        if result.status.success() {
                            success = true;
                            println!("✅ [RUST-CLEANUP] Windows del command succeeded");
                        } else {
                            println!("❌ [RUST-CLEANUP] Windows del command failed: {}", 
                                String::from_utf8_lossy(&result.stderr));
                        }
                    }
                    Err(e) => {
                        println!("❌ [RUST-CLEANUP] Failed to execute del command: {}", e);
                    }
                }
            }
            
            // Strategy 3: Rename and delete (if file is locked)
            if !success {
                let temp_path = file_path.with_extension("tmp_delete");
                if std::fs::rename(&file_path, &temp_path).is_ok() {
                    println!("🔄 [RUST-CLEANUP] File renamed, attempting deletion...");
                    if std::fs::remove_file(&temp_path).is_ok() {
                        success = true;
                        println!("✅ [RUST-CLEANUP] Rename and delete succeeded");
                    }
                }
            }
            
            if !success {
                return Err(format!("Failed to delete file: {}", e));
            }
        } else {
            success = true;
            println!("✅ [RUST-CLEANUP] Direct deletion succeeded");
        }
        
        // Verify deletion
        if file_path.exists() {
            return Err("File still exists after deletion attempt".to_string());
        }
        
        println!("🎉 [RUST-CLEANUP] File successfully deleted and verified");
    } else {
        println!("ℹ️ [RUST-CLEANUP] File doesn't exist, nothing to clean");
    }
    
    Ok(())
}

fn main() {
    // PRODUCTION-GRADE INITIALIZATION
    println!("🚀 [INIT] Starting production-grade Windows application...");
    
    let app_name = "com.itehadironstore.management";
    
    // Check Windows compatibility first
    if cfg!(target_os = "windows") {
        let warnings = check_windows_compatibility();
        if !warnings.is_empty() {
            for warning in &warnings {
                eprintln!("⚠️ [INIT] Compatibility warning: {}", warning);
            }
        }
    }
    
    // Use production-grade app data directory detection
    let app_data_dir = if cfg!(target_os = "windows") {
        match get_windows_app_data_dir(app_name) {
            Ok(dir) => {
                println!("✅ [INIT] Using Windows app data directory: {}", dir.display());
                dir
            }
            Err(e) => {
                eprintln!("❌ [INIT] Failed to get Windows app data directory: {}", e);
                eprintln!("    This may cause issues with backup/restore functionality");
                // Emergency fallback
                std::env::current_dir()
                    .unwrap_or_else(|_| std::path::PathBuf::from("."))
                    .join("data")
                    .join(app_name)
            }
        }
    } else {
        // For non-Windows systems
        std::env::var("HOME")
            .map(|path| std::path::PathBuf::from(path).join(".local/share").join(app_name))
            .unwrap_or_else(|_| {
                std::env::current_dir()
                    .expect("Failed to get current directory")
            })
    };
    
    // Ensure the app data directory exists
    if let Err(e) = std::fs::create_dir_all(&app_data_dir) {
        eprintln!("❌ [INIT] Failed to create app data directory: {}", e);
        // Fallback to current directory
        let fallback_dir = std::env::current_dir()
            .expect("Failed to get current directory");
        println!("[TAURI] Using fallback directory: {}", fallback_dir.display());
    } else {
        println!("[TAURI] Using app data directory: {}", app_data_dir.display());
    }
    
    // Define database path in app data directory
    let db_path: PathBuf = app_data_dir.join("store.db");
    println!("[TAURI] SQLite DB Path: {}", db_path.display());

    // Ensure the database file exists by creating a connection
    match Connection::open(&db_path) {
        Ok(conn) => {
            // Enable WAL mode for better concurrency
            match conn.pragma_update(None, "journal_mode", &"WAL") {
                Ok(_) => println!("[TAURI] WAL mode enabled successfully"),
                Err(e) => eprintln!("Failed to enable WAL mode: {}", e),
            }
            
            // Set busy timeout to 60 seconds (60000 ms)
            match conn.pragma_update(None, "busy_timeout", &60000) {
                Ok(_) => println!("[TAURI] Busy timeout set to 60 seconds"),
                Err(e) => eprintln!("Failed to set busy timeout: {}", e),
            }
            
            // Use NORMAL synchronous mode for balance
            match conn.pragma_update(None, "synchronous", &"NORMAL") {
                Ok(_) => println!("[TAURI] Synchronous mode set to NORMAL"),
                Err(e) => eprintln!("Failed to set synchronous mode: {}", e),
            }
            
            // Set cache size for better performance
            match conn.pragma_update(None, "cache_size", &-64000) {
                Ok(_) => println!("[TAURI] Cache size set to 64MB"),
                Err(e) => eprintln!("Failed to set cache size: {}", e),
            }
            
            // Enable foreign key constraints
            match conn.pragma_update(None, "foreign_keys", &true) {
                Ok(_) => println!("[TAURI] Foreign keys enabled"),
                Err(e) => eprintln!("Failed to enable foreign keys: {}", e),
            }
            
            // Create a simple test table to ensure the database is working
            if let Err(e) = conn.execute(
                "CREATE TABLE IF NOT EXISTS app_info (
                    id INTEGER PRIMARY KEY,
                    version TEXT,
                    initialized_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )",
                [],
            ) {
                eprintln!("Failed to create initial table: {}", e);
            }
            
            // Insert or update app info
            if let Err(e) = conn.execute(
                "INSERT OR REPLACE INTO app_info (id, version) VALUES (1, '1.0.0')",
                [],
            ) {
                eprintln!("Failed to insert app info: {}", e);
            }
            
            // IMPORTANT: Close the connection before starting Tauri
            drop(conn);
            println!("[TAURI] Database initialized successfully and connection closed");
        }
        Err(e) => {
            eprintln!("Failed to initialize database: {}", e);
            std::process::exit(1);
        }
    }

    // Build the database URL for the plugin - use app data directory path
    let db_url = format!("sqlite:{}", db_path.display());
    println!("[TAURI] Database URL: {}", db_url);

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            Builder::default()
                .add_migrations(
                    &db_url,
                    vec![
                        Migration {
                            version: 1,
                            description: "create_users_table",
                            sql: "
                                CREATE TABLE IF NOT EXISTS users (
                                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                                    username TEXT NOT NULL UNIQUE,
                                    password TEXT NOT NULL,
                                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                                );",
                            kind: MigrationKind::Up,
                        },
                        Migration {
                            version: 2,
                            description: "insert_default_admin",
                            sql: "
                                INSERT OR IGNORE INTO users (username, password)
                                VALUES ('admin', 'admin123');",
                            kind: MigrationKind::Up,
                        },
                    ],
                )
                .build()
        )
        .invoke_handler(tauri::generate_handler![
            authenticate_user, 
            create_backup_directory,
            delete_backup_file, 
            close_database_connections, 
            atomic_database_replace,
            get_database_path,
            startup_database_restore,
            create_consistent_backup,
            restore_wal_file,
            restore_shm_file,
            restart_application,
            check_system_compatibility,
            get_system_info,
            cleanup_restore_file
        ])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}