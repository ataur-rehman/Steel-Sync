    #![cfg_attr(
        all(not(debug_assertions), target_os = "windows"),
        windows_subsystem = "windows"
    )]

    use std::fs;
    use std::path::PathBuf;
    use rusqlite::Connection;
    use tauri_plugin_sql::{Builder, Migration, MigrationKind};

    #[tauri::command]
    async fn authenticate_user(username: String, password: String) -> Result<bool, String> {
        println!("Authentication attempt: {} / {}", username, password);
        Ok(username == "admin" && password == "admin123")
    }

    fn main() {
        // Create data dir
        let data_dir = std::env::current_dir().unwrap().join("data");
        fs::create_dir_all(&data_dir).expect("Failed to create data directory");

        // Define DB path
        let db_path: PathBuf = data_dir.join("store.db");
        println!("[TAURI] SQLite DB Path: {}", db_path.display());
        let db_url = format!("sqlite:{}", db_path.display());

        // Force create DB
        if let Ok(conn) = Connection::open(&db_path) {
            conn.execute(
                "CREATE TABLE IF NOT EXISTS test_table (id INTEGER PRIMARY KEY, note TEXT);",
                [],
            ).ok();
        }

        tauri::Builder::default()
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
                    .build()  // 🔑 produces a Plugin<Wry>
            )
            .invoke_handler(tauri::generate_handler![authenticate_user])
            .run(tauri::generate_context!())
            .expect("error while running Tauri application");
    }
