// Advanced functional programming utilities
import { TaskEventMap } from './types';

// Functional pipeline with type inference
export const pipe =
  <T, R>(...fns: Array<(arg: any) => any>): ((value: T) => R) =>
  (value: T): R =>
    fns.reduce((acc, fn) => fn(acc), value) as unknown as R;

// Compose with proper type inference
export const compose =
  <T>(...fns: Array<(arg: T) => T>) =>
  (value: T): T =>
    fns.reduceRight((acc, fn) => fn(acc), value);

// Maybe monad for null safety
export class Maybe<T> {
  constructor(private value: T | null | undefined) {}

  static of<T>(value: T | null | undefined): Maybe<T> {
    return new Maybe(value);
  }

  static none<T>(): Maybe<T> {
    return new Maybe<T>(null);
  }

  map<U>(fn: (value: T) => U): Maybe<U> {
    return this.value != null ? Maybe.of(fn(this.value)) : Maybe.none<U>();
  }

  flatMap<U>(fn: (value: T) => Maybe<U>): Maybe<U> {
    return this.value != null ? fn(this.value) : Maybe.none<U>();
  }

  getOrElse(defaultValue: T): T {
    return this.value ?? defaultValue;
  }

  isSome(): boolean {
    return this.value != null;
  }

  isNone(): boolean {
    return this.value == null;
  }
}

// Result type for error handling
export abstract class Result<T, E> {
  abstract map<U>(fn: (value: T) => U): Result<U, E>;
  abstract flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E>;
  abstract mapError<F>(fn: (error: E) => F): Result<T, F>;
  abstract isSuccess(): boolean;
  abstract isFailure(): boolean;
  abstract getOrElse(defaultValue: T): T;
  abstract getValue(): T;
  abstract getError(): E;
}

export class Success<T, E> extends Result<T, E> {
  constructor(private value: T) {
    super();
  }

  map<U>(fn: (value: T) => U): Result<U, E> {
    return new Success(fn(this.value));
  }

  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    return fn(this.value);
  }

  mapError<F>(_fn: (error: E) => F): Result<T, F> {
    return new Success(this.value);
  }

  isSuccess(): boolean {
    return true;
  }

  isFailure(): boolean {
    return false;
  }

  getOrElse(_defaultValue: T): T {
    return this.value;
  }

  getValue(): T {
    return this.value;
  }

  getError(): E {
    throw new Error('Cannot get error from Success');
  }
}

export class Failure<T, E> extends Result<T, E> {
  constructor(private error: E) {
    super();
  }

  map<U>(_fn: (value: T) => U): Result<U, E> {
    return new Failure(this.error);
  }

  flatMap<U>(_fn: (value: T) => Result<U, E>): Result<U, E> {
    return new Failure(this.error);
  }

  mapError<F>(fn: (error: E) => F): Result<T, F> {
    return new Failure(fn(this.error));
  }

  isSuccess(): boolean {
    return false;
  }

  isFailure(): boolean {
    return true;
  }

  getOrElse(defaultValue: T): T {
    return defaultValue;
  }

  getValue(): T {
    throw new Error('Cannot get value from Failure');
  }

  getError(): E {
    return this.error;
  }
}

// IO Monad for side effects
export class IO<T> {
  constructor(private effect: () => T) {}

  static of<T>(value: T): IO<T> {
    return new IO(() => value);
  }

  map<U>(fn: (value: T) => U): IO<U> {
    return new IO(() => fn(this.effect()));
  }

  flatMap<U>(fn: (value: T) => IO<U>): IO<U> {
    return new IO(() => fn(this.effect()).effect());
  }

  run(): T {
    return this.effect();
  }
}

// Task Monad for async operations
export class Task<T> {
  constructor(private computation: () => Promise<T>) {}

  static of<T>(value: T): Task<T> {
    return new Task(() => Promise.resolve(value));
  }

  static fromPromise<T>(promise: Promise<T>): Task<T> {
    return new Task(() => promise);
  }

  map<U>(fn: (value: T) => U): Task<U> {
    return new Task(async () => {
      const value = await this.computation();
      return fn(value);
    });
  }

  flatMap<U>(fn: (value: T) => Task<U>): Task<U> {
    return new Task(async () => {
      const value = await this.computation();
      return fn(value).run();
    });
  }

  async run(): Promise<T> {
    return this.computation();
  }
}

// Event Stream for reactive programming
export class EventStream<T> {
  private listeners: Array<(event: T) => void> = [];

  emit(event: T): void {
    this.listeners.forEach(listener => listener(event));
  }

  subscribe(listener: (event: T) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  map<U>(fn: (event: T) => U): EventStream<U> {
    const stream = new EventStream<U>();
    this.subscribe(event => stream.emit(fn(event)));
    return stream;
  }

  filter(predicate: (event: T) => boolean): EventStream<T> {
    const stream = new EventStream<T>();
    this.subscribe(event => {
      if (predicate(event)) {
        stream.emit(event);
      }
    });
    return stream;
  }

  merge(other: EventStream<T>): EventStream<T> {
    const stream = new EventStream<T>();
    this.subscribe(event => stream.emit(event));
    other.subscribe(event => stream.emit(event));
    return stream;
  }

  debounce(delay: number): EventStream<T> {
    const stream = new EventStream<T>();
    let timeout: NodeJS.Timeout | null = null;

    this.subscribe(event => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => stream.emit(event), delay);
    });

    return stream;
  }
}

// Type-safe event bus
export class TypedEventBus {
  private streams = new Map<string, EventStream<any>>();

  emit<K extends keyof TaskEventMap>(type: K, event: TaskEventMap[K]): void {
    const stream = this.getStream(type);
    stream.emit(event);
  }

  subscribe<K extends keyof TaskEventMap>(
    type: K,
    listener: (event: TaskEventMap[K]) => void
  ): () => void {
    const stream = this.getStream(type);
    return stream.subscribe(listener);
  }

  private getStream<K extends keyof TaskEventMap>(type: K): EventStream<TaskEventMap[K]> {
    const key = type as string;
    if (!this.streams.has(key)) {
      this.streams.set(key, new EventStream<TaskEventMap[K]>());
    }
    return this.streams.get(key)!;
  }
}

// Utility functions
export const curry = <T extends (...args: any[]) => any>(fn: T) => {
  return function curried(...args: any[]): any {
    if (args.length >= fn.length) {
      return fn(...args);
    }
    return (...nextArgs: any[]) => curried(...args, ...nextArgs);
  };
};

export const memoize = <T extends (...args: any[]) => any>(fn: T): T => {
  const cache = new Map<string, ReturnType<T>>();

  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }

    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
};

export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => fn(...args), delay);
  };
};

export const throttle = <T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
};

// Convenience exports for compatibility
export const Some = <T>(value: T): Maybe<T> => Maybe.of(value);
export const None = <T>(): Maybe<T> => Maybe.none<T>();
