#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

use tauri_plugin_sql::{Migration, Builder as SqlPlugin};

#[tauri::command]
async fn authenticate_user(username: String, password: String) -> Result<bool, String> {
    println!("Authentication attempt: {} / {}", username, password);
    
    if username == "admin" && password == "admin123" {
        println!("Authentication successful");
        Ok(true)
    } else {
        println!("Authentication failed");
        Ok(false)
    }
}

fn main() {
    tauri::Builder::default()
        .plugin(SqlPlugin::default().add_migrations(
            "sqlite:store.db",
            vec![
                Migration {
                    version: 1,
                    description: "create_users_table",
                    sql: "CREATE TABLE IF NOT EXISTS users (
                        id INTEGER PRIMARY KEY AUTOINCREMENT,
                        username TEXT NOT NULL UNIQUE,
                        password TEXT NOT NULL,
                        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                    );",
                    kind: tauri_plugin_sql::MigrationKind::Up,
                },
                Migration {
                    version: 2,
                    description: "insert_default_admin",
                    sql: "INSERT OR IGNORE INTO users (username, password) VALUES ('admin', 'admin123');",
                    kind: tauri_plugin_sql::MigrationKind::Up,
                }
            ]
        ).build())
        .invoke_handler(tauri::generate_handler![authenticate_user])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}