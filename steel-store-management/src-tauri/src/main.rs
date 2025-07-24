#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use std::path::PathBuf;
use rusqlite::Connection;
use tauri_plugin_sql::{Builder, Migration, MigrationKind};

#[tauri::command]
async fn authenticate_user(username: String, password: String) -> Result<bool, String> {
    println!("Authentication attempt: {} / {}", username, password);
    Ok(username == "admin" && password == "admin123")
}

fn main() {
    // Create database in the root directory to match TypeScript path
    let data_dir = std::env::current_dir()
        .expect("Failed to get current directory");
    
    // Define database path - put it directly in the working directory
    let db_path: PathBuf = data_dir.join("store.db");
    println!("[TAURI] SQLite DB Path: {}", db_path.display());

    // Ensure the database file exists by creating a connection
    match Connection::open(&db_path) {
        Ok(conn) => {
            // Enable WAL mode for better concurrency
            if let Err(e) = conn.execute("PRAGMA journal_mode=WAL", []) {
                eprintln!("Failed to enable WAL mode: {}", e);
            }
            
            // Set moderate busy timeout
            if let Err(e) = conn.execute("PRAGMA busy_timeout=10000", []) {
                eprintln!("Failed to set busy timeout: {}", e);
            }
            
            // Use NORMAL synchronous mode for balance
            if let Err(e) = conn.execute("PRAGMA synchronous=NORMAL", []) {
                eprintln!("Failed to set synchronous mode: {}", e);
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

    // Build the database URL for the plugin - use the same path that works in TypeScript
    let db_url = "sqlite:store.db".to_string();
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
        .invoke_handler(tauri::generate_handler![authenticate_user])
        .run(tauri::generate_context!())
        .expect("error while running Tauri application");
}