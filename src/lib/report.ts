/**
 * Error reporting seam. Defaults to the console; Sentry (crashes only, no quote text)
 * is plugged in with setReporter() once @sentry/react-native is added.
 */
export type Reporter = {
  error(err: unknown, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
};

export const consoleReporter: Reporter = {
  error: (err, context) => console.error('[lettercrack]', err, context ?? ''),
  warn: (message, context) => console.warn('[lettercrack]', message, context ?? ''),
};

let current: Reporter = consoleReporter;

export function setReporter(r: Reporter) {
  current = r;
}

export function reporter(): Reporter {
  return current;
}
