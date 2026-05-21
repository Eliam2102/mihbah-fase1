import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Output standalone para Easypanel (imagen Docker más liviana, ~80MB vs ~1GB).
  output: 'standalone',

  // Headers globales — cache estáticos largos, no-cache dinámicos.
  async headers() {
    return [
      // Assets estáticos Next.js (chunks, _next/static) — inmutables 1 año.
      {
        source: '/_next/static/:path*',
        headers: [{ key: 'Cache-Control', value: 'public, max-age=31536000, immutable' }],
      },
      // Imágenes/fonts en /public — cache 1 día con revalidate.
      {
        source: '/:path*\\.(png|jpg|jpeg|svg|webp|avif|woff2|woff|ttf|ico)',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=86400, stale-while-revalidate=604800' },
        ],
      },
      // API health — no cache (probe debe ser fresh siempre).
      {
        source: '/api/health',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      // Endpoints auth y portal — no cache (sensibles a sesión).
      {
        source: '/api/auth/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store' }],
      },
      {
        source: '/portal/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, private' }],
      },
    ]
  },

  // Comprimir respuestas (gzip/brotli) — Easypanel/Nginx puede recomprimir; OK.
  compress: true,

  // Anti-fingerprinting headers + security defaults.
  poweredByHeader: false,

  experimental: {
    // Subir límite payload server actions (sube comprobantes hasta 20MB).
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
}

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: 'universo-jade',

  project: 'sig-jade',

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: '/monitoring',

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  },
})
