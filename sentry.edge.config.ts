// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn:
    process.env.SENTRY_DSN ??
    'https://123163e7b8a560c8cfe6d0b06c58b0ca@o4511428527980544.ingest.us.sentry.io/4511428593844224',

  environment: process.env.NODE_ENV,

  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,

  enableLogs: true,

  sendDefaultPii: true,
})
