// src/sentry.ts
import * as Sentry from "@sentry/react";

export const initSentry = () => {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  
  if (!dsn || dsn === 'YOUR_SENTRY_DSN_HERE') {
    return;
  }

  Sentry.init({
    dsn: dsn,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    // Tracing
    tracesSampleRate: 1.0, 
    // Session Replay
    replaysSessionSampleRate: 0.1, 
    replaysOnErrorSampleRate: 1.0,
    environment: import.meta.env.MODE,
  });
};

export const captureError = (error: any, context?: any) => {
  Sentry.captureException(error, {
    extra: context
  });
};
