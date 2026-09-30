const enabled = __DEV__;

export const logger = {
  debug: (...args: unknown[]) => {
    if (enabled) console.debug(...args);
  },
  info: (...args: unknown[]) => {
    if (enabled) console.info(...args);
  },
  warn: (...args: unknown[]) => {
    if (enabled) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    if (enabled) console.error(...args);
  },
};
