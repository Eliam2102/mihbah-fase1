import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

// Singleton global para sobrevivir hot-reload de Next.js dev.
// Sin esto, cada reload crea un nuevo pool y los viejos quedan idle
// hasta agotar max_connections de Postgres.
const globalForDb = globalThis as unknown as {
  pgClient?: ReturnType<typeof postgres>
}

const client =
  globalForDb.pgClient ??
  postgres(process.env.DATABASE_URL!, {
    // Prod: 20 conns por instancia (con 2-3 instancias Easypanel → 40-60 total).
    // Dev: 10 (suficiente para hot-reload sin saturar Postgres local).
    max: process.env.NODE_ENV === 'production' ? 20 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // Recicla cada conexión cada 30min (1800s). Evita sockets stale por
    // OS-level TCP timeouts cuando dev mac va a dormir / wifi cambia.
    max_lifetime: 60 * 30,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgClient = client
}

export const db = drizzle(client, { schema })
