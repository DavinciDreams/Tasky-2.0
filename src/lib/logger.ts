type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const envLevel = (process.env.TASKY_LOG_LEVEL || process.env.NODE_ENV || 'info').toLowerCase();
const levelOrder: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

function normalizeLevel(value: string): LogLevel {
  if (value.startsWith('dev')) return 'debug';
  if (value.startsWith('prod')) return 'info';
  if (value in levelOrder) return value as LogLevel;
  return 'info';
}

const currentLevel: LogLevel = normalizeLevel(envLevel);

function shouldLog(level: LogLevel): boolean {
  return levelOrder[level] >= levelOrder[currentLevel];
}

function stamp(level: LogLevel, args: any[]): any[] {
  const ts = new Date().toISOString();
  return [`[${ts}] [${level.toUpperCase()}]`, ...args];
}

export const logger = {
  level: currentLevel,
  debug: (...args: any[]) => {
    if (!shouldLog('debug')) return;
    // eslint-disable-next-line no-console
    console.log(...stamp('debug', args));
  },
  info: (...args: any[]) => {
    if (!shouldLog('info')) return;
    // eslint-disable-next-line no-console
    console.log(...stamp('info', args));
  },
  warn: (...args: any[]) => {
    if (!shouldLog('warn')) return;
    // eslint-disable-next-line no-console
    console.warn(...stamp('warn', args));
  },
  error: (...args: any[]) => {
    if (!shouldLog('error')) return;
    // eslint-disable-next-line no-console
    console.error(...stamp('error', args));
  },
};

export default logger;


