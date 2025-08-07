// Event system for Tasky Task Manager
// Simplified version adapted from Agent's event system

export type EventHandler<T = any> = (data: T) => void;

export class TypedEventBus<TEventMap extends Record<string, any> = Record<string, any>> {
  private listeners: Map<keyof TEventMap, Set<EventHandler<any>>> = new Map();

  /**
   * Subscribe to an event
   */
  on<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(handler);
  }

  /**
   * Subscribe to an event (one-time only)
   */
  once<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void {
    const onceHandler = (data: TEventMap[K]) => {
      handler(data);
      this.off(event, onceHandler);
    };
    this.on(event, onceHandler);
  }

  /**
   * Unsubscribe from an event
   */
  off<K extends keyof TEventMap>(event: K, handler: EventHandler<TEventMap[K]>): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(handler);
      if (eventListeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  /**
   * Emit an event
   */
  emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in event handler for ${String(event)}:`, error);
        }
      });
    }
  }

  /**
   * Remove all listeners for a specific event
   */
  removeAllListeners<K extends keyof TEventMap>(event?: K): void {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
  }

  /**
   * Get list of events that have listeners
   */
  getEventNames(): Array<keyof TEventMap> {
    return Array.from(this.listeners.keys());
  }

  /**
   * Get number of listeners for an event
   */
  listenerCount<K extends keyof TEventMap>(event: K): number {
    const eventListeners = this.listeners.get(event);
    return eventListeners ? eventListeners.size : 0;
  }

  /**
   * Check if there are any listeners for an event
   */
  hasListeners<K extends keyof TEventMap>(event: K): boolean {
    return this.listenerCount(event) > 0;
  }
}

// Utility function to create a typed event bus
export function createEventBus<TEventMap extends Record<string, any>>(): TypedEventBus<TEventMap> {
  return new TypedEventBus<TEventMap>();
}

// Event bus instance for global task events
export const globalTaskEventBus = new TypedEventBus();

// Helper function to create event data with timestamp
export function createEventData<T>(type: string, data: T): { type: string; timestamp: Date; data: T } {
  return {
    type,
    timestamp: new Date(),
    data
  };
}

// Async event handler type
export type AsyncEventHandler<T = any> = (data: T) => Promise<void>;

// Extended event bus with async support
export class AsyncEventBus<TEventMap extends Record<string, any> = Record<string, any>> extends TypedEventBus<TEventMap> {
  private asyncListeners: Map<keyof TEventMap, Set<AsyncEventHandler<any>>> = new Map();

  /**
   * Subscribe to an event with async handler
   */
  onAsync<K extends keyof TEventMap>(event: K, handler: AsyncEventHandler<TEventMap[K]>): void {
    if (!this.asyncListeners.has(event)) {
      this.asyncListeners.set(event, new Set());
    }
    this.asyncListeners.get(event)!.add(handler);
  }

  /**
   * Subscribe to an event with async handler (one-time only)
   */
  onceAsync<K extends keyof TEventMap>(event: K, handler: AsyncEventHandler<TEventMap[K]>): void {
    const onceHandler = async (data: TEventMap[K]) => {
      await handler(data);
      this.offAsync(event, onceHandler);
    };
    this.onAsync(event, onceHandler);
  }

  /**
   * Unsubscribe from an async event
   */
  offAsync<K extends keyof TEventMap>(event: K, handler: AsyncEventHandler<TEventMap[K]>): void {
    const eventListeners = this.asyncListeners.get(event);
    if (eventListeners) {
      eventListeners.delete(handler);
      if (eventListeners.size === 0) {
        this.asyncListeners.delete(event);
      }
    }
  }

  /**
   * Emit an event and wait for all async handlers to complete
   */
  async emitAsync<K extends keyof TEventMap>(event: K, data: TEventMap[K]): Promise<void> {
    // First emit to sync handlers
    this.emit(event, data);

    // Then handle async listeners
    const asyncEventListeners = this.asyncListeners.get(event);
    if (asyncEventListeners) {
      const promises = Array.from(asyncEventListeners).map(async handler => {
        try {
          await handler(data);
        } catch (error) {
          console.error(`Error in async event handler for ${String(event)}:`, error);
        }
      });
      await Promise.all(promises);
    }
  }

  /**
   * Remove all async listeners for a specific event
   */
  removeAllAsyncListeners<K extends keyof TEventMap>(event?: K): void {
    if (event) {
      this.asyncListeners.delete(event);
    } else {
      this.asyncListeners.clear();
    }
  }

  /**
   * Remove all listeners (both sync and async)
   */
  override removeAllListeners<K extends keyof TEventMap>(event?: K): void {
    super.removeAllListeners(event);
    this.removeAllAsyncListeners(event);
  }

  /**
   * Get total listener count (sync + async)
   */
  getTotalListenerCount<K extends keyof TEventMap>(event: K): number {
    const syncCount = this.listenerCount(event);
    const asyncEventListeners = this.asyncListeners.get(event);
    const asyncCount = asyncEventListeners ? asyncEventListeners.size : 0;
    return syncCount + asyncCount;
  }
}

// Event middleware type
export type EventMiddleware<T = any> = (event: string, data: T, next: () => void) => void;

// Event bus with middleware support
export class MiddlewareEventBus<TEventMap extends Record<string, any> = Record<string, any>> extends AsyncEventBus<TEventMap> {
  private middlewares: EventMiddleware[] = [];

  /**
   * Add middleware to the event bus
   */
  use(middleware: EventMiddleware): void {
    this.middlewares.push(middleware);
  }

  /**
   * Remove middleware from the event bus
   */
  removeMiddleware(middleware: EventMiddleware): void {
    const index = this.middlewares.indexOf(middleware);
    if (index > -1) {
      this.middlewares.splice(index, 1);
    }
  }

  /**
   * Emit event through middleware chain
   */
  override emit<K extends keyof TEventMap>(event: K, data: TEventMap[K]): void {
    this.runMiddleware(String(event), data, () => {
      super.emit(event, data);
    });
  }

  /**
   * Emit async event through middleware chain
   */
  override async emitAsync<K extends keyof TEventMap>(event: K, data: TEventMap[K]): Promise<void> {
    return new Promise((resolve) => {
      this.runMiddleware(String(event), data, async () => {
        await super.emitAsync(event, data);
        resolve();
      });
    });
  }

  private runMiddleware(event: string, data: any, finalHandler: () => void): void {
    let index = 0;

    const next = () => {
      if (index >= this.middlewares.length) {
        finalHandler();
        return;
      }

      const middleware = this.middlewares[index++];
      middleware(event, data, next);
    };

    next();
  }
}

// Factory functions for different event bus types
export const createTypedEventBus = <TEventMap extends Record<string, any>>() => 
  new TypedEventBus<TEventMap>();

export const createAsyncEventBus = <TEventMap extends Record<string, any>>() => 
  new AsyncEventBus<TEventMap>();

export const createMiddlewareEventBus = <TEventMap extends Record<string, any>>() => 
  new MiddlewareEventBus<TEventMap>();
