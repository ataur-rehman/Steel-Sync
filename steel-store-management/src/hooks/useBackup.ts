import { invoke } from '@tauri-apps/api/core';
import { save, open } from '@tauri-apps/plugin-dialog';

export function useBackup() {
  const backupDatabase = async () => {
    const filePath = await save({
      defaultPath: `steel-store-backup-${new Date().toISOString().slice(0, 10)}.db`,
      filters: [{
        name: 'Database',
        extensions: ['db']
      }]
    });

    if (filePath) {
      await invoke('backup_database', { backupPath: filePath });
    }
  };

  const restoreDatabase = async () => {
    const selected = await open({
      multiple: false,
      filters: [{
        name: 'Database',
        extensions: ['db']
      }]
    });

    if (selected && typeof selected === 'string') {
      await invoke('restore_database', { restorePath: selected });
    }
  };

  return {
    backupDatabase,
    restoreDatabase
  };
}