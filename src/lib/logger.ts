const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  isDev,
  debug: (...args: any[]) => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  info: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.log(...args);
  },
  warn: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.warn(...args);
  },
  error: (...args: any[]) => {
    // eslint-disable-next-line no-console
    console.error(...args);
  },
};

export default logger;


