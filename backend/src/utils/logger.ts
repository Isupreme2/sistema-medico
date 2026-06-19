/* eslint-disable no-console */

/**
 * Logger minimalista con niveles y timestamp. Suficiente para desarrollo;
 * en producción se podría sustituir por pino/winston sin tocar los call-sites.
 */
type Level = 'info' | 'warn' | 'error' | 'debug';

function log(level: Level, ...args: unknown[]): void {
  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}]`;
  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(prefix, ...args);
}

export const logger = {
  info: (...args: unknown[]) => log('info', ...args),
  warn: (...args: unknown[]) => log('warn', ...args),
  error: (...args: unknown[]) => log('error', ...args),
  debug: (...args: unknown[]) => log('debug', ...args),
};
