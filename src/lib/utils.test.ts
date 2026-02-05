import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn()', () => {
  it('joins multiple class strings', () => {
    expect(cn('a', 'b', 'c')).toBe('a b c');
  });

  it('filters out undefined values', () => {
    expect(cn('a', undefined, 'b')).toBe('a b');
  });

  it('filters out empty strings', () => {
    expect(cn('a', '', 'b')).toBe('a b');
  });

  it('returns empty string when given no args', () => {
    expect(cn()).toBe('');
  });

  it('returns empty string when all args are falsy', () => {
    expect(cn(undefined, undefined, '')).toBe('');
  });

  it('handles single class', () => {
    expect(cn('only')).toBe('only');
  });
});
