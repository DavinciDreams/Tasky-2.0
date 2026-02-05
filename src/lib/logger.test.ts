import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to re-import with different env vars, so we use dynamic imports.
// For the default import, process.env is already set by the time the module loads.

describe('logger', () => {
  let consoleSpy: { log: any; warn: any; error: any };

  beforeEach(() => {
    consoleSpy = {
      log: vi.spyOn(console, 'log').mockImplementation(() => {}),
      warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
      error: vi.spyOn(console, 'error').mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports a logger object with expected methods', async () => {
    const { logger } = await import('./logger');
    expect(typeof logger.debug).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.error).toBe('function');
  });

  it('logger.error calls console.error', async () => {
    const { logger } = await import('./logger');
    logger.error('test error');
    expect(consoleSpy.error).toHaveBeenCalled();
    const args = consoleSpy.error.mock.calls[0];
    // First arg should be the timestamp + level stamp
    expect(args[0]).toContain('[ERROR]');
    expect(args[1]).toBe('test error');
  });

  it('logger.warn calls console.warn', async () => {
    const { logger } = await import('./logger');
    logger.warn('test warning');
    expect(consoleSpy.warn).toHaveBeenCalled();
    const args = consoleSpy.warn.mock.calls[0];
    expect(args[0]).toContain('[WARN]');
  });

  it('timestamp format is ISO 8601', async () => {
    const { logger } = await import('./logger');
    logger.error('check timestamp');
    const stampArg = consoleSpy.error.mock.calls[0][0] as string;
    // Extract the timestamp from the stamp format: [2025-01-01T00:00:00.000Z] [ERROR]
    const match = stampArg.match(/\[(.+?)\]/);
    expect(match).toBeTruthy();
    // Should not throw when parsing as date
    expect(new Date(match![1]).getTime()).toBeGreaterThan(0);
  });
});
