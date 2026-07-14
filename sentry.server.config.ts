// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    'https://123163e7b8a560c8cfe6d0b06c58b0ca@o4511428527980544.ingest.us.sentry.io/4511428593844224',

  environment: process.env.NODE_ENV,

  // Dev: 100%; Prod: 10% (50 usuarios × 30s avg sessions = manejable).
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  // Adjunta variables locales a stack frames (solo server).
  includeLocalVariables: true,

  enableLogs: true,

  sendDefaultPii: true,
})
