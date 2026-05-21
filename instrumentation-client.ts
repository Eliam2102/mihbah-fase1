// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn:
    process.env.NEXT_PUBLIC_SENTRY_DSN ??
    'https://123163e7b8a560c8cfe6d0b06c58b0ca@o4511428527980544.ingest.us.sentry.io/4511428593844224',

  environment: process.env.NODE_ENV,

  integrations: [Sentry.replayIntegration()],

  // Dev: 100% para ver todo; Prod: 10% (suficiente con 50 usuarios sin saturar plan free).
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1,
  enableLogs: true,

  // Session Replay: 10% sesiones normales, 100% si hay error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  sendDefaultPii: true,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
