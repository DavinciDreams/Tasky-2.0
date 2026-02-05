import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  TypedEventBus,
  AsyncEventBus,
  MiddlewareEventBus,
  createEventBus,
  createAsyncEventBus,
  createMiddlewareEventBus,
  createEventData,
} from './events';

// Test event map
type TestEvents = {
  'item:added': { id: string; name: string };
  'item:removed': { id: string };
  'count': number;
};

describe('TypedEventBus', () => {
  let bus: TypedEventBus<TestEvents>;

  beforeEach(() => {
    bus = new TypedEventBus<TestEvents>();
  });

  it('should emit and receive events', () => {
    const handler = vi.fn();
    bus.on('item:added', handler);
    bus.emit('item:added', { id: '1', name: 'Test' });
    expect(handler).toHaveBeenCalledWith({ id: '1', name: 'Test' });
  });

  it('should support multiple handlers for the same event', () => {
    const handler1 = vi.fn();
    const handler2 = vi.fn();
    bus.on('count', handler1);
    bus.on('count', handler2);
    bus.emit('count', 42);
    expect(handler1).toHaveBeenCalledWith(42);
    expect(handler2).toHaveBeenCalledWith(42);
  });

  it('should unsubscribe a handler with off()', () => {
    const handler = vi.fn();
    bus.on('count', handler);
    bus.off('count', handler);
    bus.emit('count', 5);
    expect(handler).not.toHaveBeenCalled();
  });

  it('once() should fire only once', () => {
    const handler = vi.fn();
    bus.once('count', handler);
    bus.emit('count', 1);
    bus.emit('count', 2);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(1);
  });

  it('removeAllListeners(event) removes listeners for one event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('count', h1);
    bus.on('item:removed', h2);
    bus.removeAllListeners('count');
    bus.emit('count', 0);
    bus.emit('item:removed', { id: '1' });
    expect(h1).not.toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });

  it('removeAllListeners() with no arg removes everything', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on('count', h1);
    bus.on('item:removed', h2);
    bus.removeAllListeners();
    bus.emit('count', 0);
    bus.emit('item:removed', { id: '1' });
    expect(h1).not.toHaveBeenCalled();
    expect(h2).not.toHaveBeenCalled();
  });

  it('listenerCount returns correct count', () => {
    expect(bus.listenerCount('count')).toBe(0);
    const h = vi.fn();
    bus.on('count', h);
    expect(bus.listenerCount('count')).toBe(1);
    bus.on('count', vi.fn());
    expect(bus.listenerCount('count')).toBe(2);
    bus.off('count', h);
    expect(bus.listenerCount('count')).toBe(1);
  });

  it('hasListeners returns true/false correctly', () => {
    expect(bus.hasListeners('count')).toBe(false);
    bus.on('count', vi.fn());
    expect(bus.hasListeners('count')).toBe(true);
  });

  it('getEventNames returns events with listeners', () => {
    bus.on('count', vi.fn());
    bus.on('item:added', vi.fn());
    const names = bus.getEventNames();
    expect(names).toContain('count');
    expect(names).toContain('item:added');
    expect(names).not.toContain('item:removed');
  });

  it('handler errors are caught and do not prevent other handlers', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const h1 = vi.fn(() => { throw new Error('oops'); });
    const h2 = vi.fn();
    bus.on('count', h1);
    bus.on('count', h2);
    bus.emit('count', 1);
    expect(h2).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
  });
});

describe('AsyncEventBus', () => {
  let bus: AsyncEventBus<TestEvents>;

  beforeEach(() => {
    bus = new AsyncEventBus<TestEvents>();
  });

  it('onAsync/emitAsync runs async handlers', async () => {
    const results: number[] = [];
    bus.onAsync('count', async (n) => {
      await new Promise(r => setTimeout(r, 10));
      results.push(n);
    });
    await bus.emitAsync('count', 7);
    expect(results).toEqual([7]);
  });

  it('emitAsync runs all async handlers in parallel', async () => {
    const order: string[] = [];
    bus.onAsync('count', async () => {
      await new Promise(r => setTimeout(r, 20));
      order.push('slow');
    });
    bus.onAsync('count', async () => {
      await new Promise(r => setTimeout(r, 5));
      order.push('fast');
    });
    await bus.emitAsync('count', 1);
    // Both should complete; fast finishes first
    expect(order).toEqual(['fast', 'slow']);
  });

  it('emitAsync also calls sync handlers', async () => {
    const syncHandler = vi.fn();
    bus.on('count', syncHandler);
    await bus.emitAsync('count', 10);
    expect(syncHandler).toHaveBeenCalledWith(10);
  });

  it('offAsync removes an async handler', async () => {
    const handler = vi.fn();
    bus.onAsync('count', handler);
    bus.offAsync('count', handler);
    await bus.emitAsync('count', 1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('removeAllListeners clears both sync and async', async () => {
    const syncH = vi.fn();
    const asyncH = vi.fn();
    bus.on('count', syncH);
    bus.onAsync('count', asyncH);
    bus.removeAllListeners('count');
    await bus.emitAsync('count', 0);
    expect(syncH).not.toHaveBeenCalled();
    expect(asyncH).not.toHaveBeenCalled();
  });

  it('getTotalListenerCount sums sync and async', () => {
    bus.on('count', vi.fn());
    bus.onAsync('count', vi.fn());
    bus.onAsync('count', vi.fn());
    expect(bus.getTotalListenerCount('count')).toBe(3);
  });
});

describe('MiddlewareEventBus', () => {
  let bus: MiddlewareEventBus<TestEvents>;

  beforeEach(() => {
    bus = new MiddlewareEventBus<TestEvents>();
  });

  it('middleware chain runs before handlers', () => {
    const order: string[] = [];
    bus.use((_event, _data, next) => {
      order.push('middleware');
      next();
    });
    bus.on('count', () => order.push('handler'));
    bus.emit('count', 1);
    expect(order).toEqual(['middleware', 'handler']);
  });

  it('middleware can block event propagation by not calling next', () => {
    const handler = vi.fn();
    bus.use((_event, _data, _next) => {
      // Intentionally not calling next()
    });
    bus.on('count', handler);
    bus.emit('count', 1);
    expect(handler).not.toHaveBeenCalled();
  });

  it('middleware can modify event data', () => {
    const handler = vi.fn();
    bus.use((_event, data, next) => {
      // Mutate data in-place before passing on
      if (typeof data === 'object' && data !== null) {
        (data as any).name = 'Modified';
      }
      next();
    });
    bus.on('item:added', handler);
    const payload = { id: '1', name: 'Original' };
    bus.emit('item:added', payload);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ name: 'Modified' }));
  });

  it('removeMiddleware removes a middleware', () => {
    const handler = vi.fn();
    const blocker = (_event: string, _data: any, _next: () => void) => {
      // block
    };
    bus.use(blocker);
    bus.on('count', handler);
    bus.emit('count', 1);
    expect(handler).not.toHaveBeenCalled();

    bus.removeMiddleware(blocker);
    bus.emit('count', 2);
    expect(handler).toHaveBeenCalledWith(2);
  });

  it('emitAsync goes through middleware chain', async () => {
    const order: string[] = [];
    bus.use((_event, _data, next) => {
      order.push('mw');
      next();
    });
    bus.onAsync('count', async () => {
      order.push('async');
    });
    await bus.emitAsync('count', 1);
    // Middleware runs twice: once for the outer emitAsync override,
    // and once internally when super.emitAsync calls this.emit (which is also overridden)
    expect(order).toEqual(['mw', 'mw', 'async']);
  });
});

describe('Factory functions', () => {
  it('createEventBus returns a TypedEventBus', () => {
    const bus = createEventBus<TestEvents>();
    expect(bus).toBeInstanceOf(TypedEventBus);
  });

  it('createAsyncEventBus returns an AsyncEventBus', () => {
    const bus = createAsyncEventBus<TestEvents>();
    expect(bus).toBeInstanceOf(AsyncEventBus);
  });

  it('createMiddlewareEventBus returns a MiddlewareEventBus', () => {
    const bus = createMiddlewareEventBus<TestEvents>();
    expect(bus).toBeInstanceOf(MiddlewareEventBus);
  });
});

describe('createEventData helper', () => {
  it('wraps data with type and timestamp', () => {
    const result = createEventData('test', { value: 42 });
    expect(result.type).toBe('test');
    expect(result.data).toEqual({ value: 42 });
    expect(result.timestamp).toBeInstanceOf(Date);
  });
});
