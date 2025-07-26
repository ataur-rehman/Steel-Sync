// services/database-queue.ts
export class DatabaseQueue {
  private static instance: DatabaseQueue;
  private queue: Array<{
    id: string;
    operation: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (reason?: any) => void;
  }> = [];
  private processing = false;
  private currentTransaction: string | null = null;

  static getInstance(): DatabaseQueue {
    if (!DatabaseQueue.instance) {
      DatabaseQueue.instance = new DatabaseQueue();
    }
    return DatabaseQueue.instance;
  }

  async enqueue<T>(operation: () => Promise<T>, operationId: string): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        id: operationId,
        operation,
        resolve,
        reject
      });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (!item) continue;
      
      try {
        this.currentTransaction = item.id;
        const result = await item.operation();
        item.resolve(result);
      } catch (error) {
        item.reject(error);
      } finally {
        this.currentTransaction = null;
        // Small delay between operations to prevent lock contention
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    }
    
    this.processing = false;
  }

  isProcessing(): boolean {
    return this.processing;
  }

  getCurrentTransaction(): string | null {
    return this.currentTransaction;
  }
}