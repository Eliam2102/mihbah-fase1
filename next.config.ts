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

export default nextConfig
