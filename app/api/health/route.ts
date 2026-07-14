/**
 * Health check endpoint para Easypanel / load balancer.
 *
 * GET /api/health
 *   200 { ok: true, db: 'ok', uptime: <seconds> }
 *   503 { ok: false, db: 'error', error: <message> }
 *
 * No auth — debe responder antes de Better Auth init.
 */

import { sql } from 'drizzle-orm'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET(): Promise<Response> {
  const started = process.hrtime.bigint()
  try {
    // Ping DB con timeout corto para no colgar la probe.
    await Promise.race([
      db.execute(sql`SELECT 1`),
      new Promise((_, reject) => setTimeout(() => reject(new Error('db timeout 2s')), 2000)),
    ])
    const latencyMs = Number((process.hrtime.bigint() - started) / BigInt(1_000_000))
    return Response.json(
      {
        ok: true,
        db: 'ok',
        latencyMs,
        uptime: Math.round(process.uptime()),
        env: process.env.NODE_ENV,
      },
      { status: 200, headers: { 'cache-control': 'no-store' } },
    )
  } catch (err) {
    return Response.json(
      {
        ok: false,
        db: 'error',
        error: (err as Error).message,
        uptime: Math.round(process.uptime()),
      },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    )
  }
}
