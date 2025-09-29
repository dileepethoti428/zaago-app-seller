import { queryClient } from './queryClient';
import { supabase } from '@/integrations/supabase/client';

interface SyncOperation {
  id: string;
  type: 'mutation' | 'query';
  key: string;
  data: any;
  retries: number;
  maxRetries: number;
  timestamp: number;
}

class BackgroundSyncManager {
  private static instance: BackgroundSyncManager;
  private operations: Map<string, SyncOperation> = new Map();
  private isProcessing = false;
  private retryTimeouts: Map<string, NodeJS.Timeout> = new Map();

  static getInstance(): BackgroundSyncManager {
    if (!BackgroundSyncManager.instance) {
      BackgroundSyncManager.instance = new BackgroundSyncManager();
    }
    return BackgroundSyncManager.instance;
  }

  constructor() {
    this.setupEventListeners();
    this.loadPersistedOperations();
  }

  private setupEventListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
      this.processOperations();
    });

    // Process operations periodically when online
    setInterval(() => {
      if (navigator.onLine && this.operations.size > 0) {
        this.processOperations();
      }
    }, 30000); // Every 30 seconds
  }

  private loadPersistedOperations(): void {
    try {
      const stored = localStorage.getItem('background_sync_operations');
      if (stored) {
        const operations = JSON.parse(stored);
        operations.forEach((op: SyncOperation) => {
          this.operations.set(op.id, op);
        });
      }
    } catch (error) {
      console.warn('Failed to load persisted operations:', error);
    }
  }

  private persistOperations(): void {
    try {
      const operations = Array.from(this.operations.values());
      localStorage.setItem('background_sync_operations', JSON.stringify(operations));
    } catch (error) {
      console.warn('Failed to persist operations:', error);
    }
  }

  addOperation(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retries'>): string {
    const id = `${operation.type}_${operation.key}_${Date.now()}_${Math.random()}`;
    const fullOperation: SyncOperation = {
      ...operation,
      id,
      timestamp: Date.now(),
      retries: 0,
    };

    this.operations.set(id, fullOperation);
    this.persistOperations();

    // Try to process immediately if online
    if (navigator.onLine) {
      this.processOperations();
    }

    return id;
  }

  removeOperation(id: string): void {
    this.operations.delete(id);
    this.clearRetryTimeout(id);
    this.persistOperations();
  }

  private clearRetryTimeout(id: string): void {
    const timeout = this.retryTimeouts.get(id);
    if (timeout) {
      clearTimeout(timeout);
      this.retryTimeouts.delete(id);
    }
  }

  async processOperations(): Promise<void> {
    if (this.isProcessing || !navigator.onLine) return;

    this.isProcessing = true;

    for (const [id, operation] of this.operations) {
      try {
        await this.executeOperation(operation);
        this.removeOperation(id);
      } catch (error) {
        console.warn(`Failed to execute operation ${id}:`, error);
        this.handleOperationError(id, operation, error);
      }
    }

    this.isProcessing = false;
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    switch (operation.type) {
      case 'mutation':
        await this.executeMutation(operation);
        break;
      case 'query':
        await this.executeQuery(operation);
        break;
      default:
        throw new Error(`Unknown operation type: ${operation.type}`);
    }
  }

  private async executeMutation(operation: SyncOperation): Promise<void> {
    const { key, data } = operation;
    
    // Execute the mutation based on the key
    switch (key) {
      case 'cart_update':
        await this.updateCart(data);
        break;
      case 'location_update':
        await this.updateLocation(data);
        break;
      case 'profile_update':
        await this.updateProfile(data);
        break;
      default:
        console.warn(`Unknown mutation key: ${key}`);
    }
  }

  private async executeQuery(operation: SyncOperation): Promise<void> {
    // Invalidate and refetch the query
    await queryClient.invalidateQueries({ queryKey: [operation.key] });
  }

  private async updateCart(data: any): Promise<void> {
    const { action, ...params } = data;
    
    switch (action) {
      case 'add':
        const { data: cartData, error: cartError } = await supabase
          .from('cart_items')
          .upsert(params);
        if (cartError) throw cartError;
        break;
      case 'remove':
        const { error: removeError } = await supabase
          .from('cart_items')
          .delete()
          .eq('id', params.id);
        if (removeError) throw removeError;
        break;
      case 'update':
        const { error: updateError } = await supabase
          .from('cart_items')
          .update(params.updates)
          .eq('id', params.id);
        if (updateError) throw updateError;
        break;
    }
  }

  private async updateLocation(data: any): Promise<void> {
    const { error } = await supabase
      .from('user_locations')
      .upsert(data);
    if (error) throw error;
  }

  private async updateProfile(data: any): Promise<void> {
    const { error } = await supabase
      .from('profiles')
      .update(data.updates)
      .eq('user_id', data.user_id);
    if (error) throw error;
  }

  private handleOperationError(id: string, operation: SyncOperation, error: any): void {
    operation.retries++;

    if (operation.retries >= operation.maxRetries) {
      console.error(`Operation ${id} failed after ${operation.maxRetries} retries:`, error);
      this.removeOperation(id);
      return;
    }

    // Exponential backoff: 2^retries * 1000ms
    const delay = Math.pow(2, operation.retries) * 1000;
    
    const timeout = setTimeout(() => {
      this.retryTimeouts.delete(id);
      if (navigator.onLine) {
        this.processOperations();
      }
    }, delay);

    this.retryTimeouts.set(id, timeout);
    this.persistOperations();
  }

  getQueuedOperationsCount(): number {
    return this.operations.size;
  }

  clearAllOperations(): void {
    for (const id of this.operations.keys()) {
      this.clearRetryTimeout(id);
    }
    this.operations.clear();
    this.persistOperations();
  }
}

export const backgroundSync = BackgroundSyncManager.getInstance();

// Helper functions for common operations
export const queueCartUpdate = (action: 'add' | 'remove' | 'update', data: any) => {
  return backgroundSync.addOperation({
    type: 'mutation',
    key: 'cart_update',
    data: { action, ...data },
    maxRetries: 3,
  });
};

export const queueLocationUpdate = (locationData: any) => {
  return backgroundSync.addOperation({
    type: 'mutation',
    key: 'location_update',
    data: locationData,
    maxRetries: 3,
  });
};

export const queueProfileUpdate = (user_id: string, updates: any) => {
  return backgroundSync.addOperation({
    type: 'mutation',
    key: 'profile_update',
    data: { user_id, updates },
    maxRetries: 3,
  });
};