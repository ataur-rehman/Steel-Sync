import { invoke } from '@tauri-apps/api/core';
import { BaseDirectory, writeFile, readTextFile } from '@tauri-apps/plugin-fs';

export class BackupService {
  async createBackup(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `backup-${timestamp}.db`;
    
    // Get database content
    const dbContent = await invoke<string>('get_database_content');
    
    // Save to backup directory
    const dbContentBytes = new TextEncoder().encode(dbContent);
    await writeFile(filename, dbContentBytes, {
      baseDir: BaseDirectory.AppData
    });

    return filename;
  }

  async restoreBackup(filename: string): Promise<void> {
    // Read backup file
    const backupContent = await readTextFile(filename, {
      baseDir: BaseDirectory.AppData
    });

    // Restore database
    await invoke('restore_database_content', { content: backupContent });
  }

  async listBackups(): Promise<string[]> {
    // Implementation to list all backup files
    return [];
  }
}

export const backupService = new BackupService();