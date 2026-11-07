/**
 * Crash reporting (spec §13: crashes only). Off unless EXPO_PUBLIC_SENTRY_DSN is set at build time.
 * No breadcrumbs, no PII, no performance tracing, no session replay, and events are scrubbed of
 * anything that could contain quote text (messages, extra context).
 */
import * as Sentry from '@sentry/react-native';

import { setReporter } from './report';

export function initCrashReporting(dsn: string | undefined = process.env.EXPO_PUBLIC_SENTRY_DSN) {
  if (!dsn) return false;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    enableAutoSessionTracking: false,
    tracesSampleRate: 0,
    maxBreadcrumbs: 0,
    attachScreenshot: false,
    attachViewHierarchy: false,
    beforeBreadcrumb: () => null,
    beforeSend: (event) => {
      delete event.extra;
      delete event.user;
      return event;
    },
  });
  setReporter({
    error: (err) => {
      Sentry.captureException(err);
    },
    warn: (message) => {
      // Warnings stay local: they can carry quote text in context.
      console.warn('[lettercrack]', message);
    },
  });
  return true;
}
