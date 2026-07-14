/**
 * Crear 8 cuentas portal para líderes BM CORP reales.
 *
 * Usa el patrón del action `crearUsuarioPortalAction`:
 *   - Inserción directa en `users` + `accounts` (evita botar sesión admin).
 *   - Hash argon2id con mismos params que Better Auth.
 *   - Crea `usuariosPortal` con liderId primario (service multi-alianza
 *     resuelve por email matching el resto de alianzas).
 *
 * Output: imprime credenciales en stdout. NO se guardan en archivo —
 * cópialas a docs/cuentas-portal-bm-corp.md manualmente o repega desde aquí.
 */

import 'dotenv/config'
import { db } from '@/lib/db'
import { users, accounts, usuariosPortal, lideresAlianza, tenants } from '@/lib/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'
import { hash } from '@node-rs/argon2'
import { randomUUID, randomBytes } from 'node:crypto'

// ─── Líderes a crear ──────────────────────────────────────────────────────────

interface LiderACrear {
  nombre: string
  email: string
  alianzas: string[] // labels descriptivas para output
}

const LIDERES: LiderACrear[] = [
  { nombre: 'Alberto Lopez', email: 'flamingoscapital@gmail.com', alianzas: ['FLAMINGO'] },
  {
    nombre: 'Diana Jimenez',
    email: 'dianajimendi@gmail.com',
    alianzas: ['Hackers Inmobiliarios', 'Conexión'],
  },
  { nombre: 'Irving Gomez', email: 'irvinggestrada@yahoo.com.mx', alianzas: ['BM Centro'] },
  {
    nombre: 'Jorge Juarez',
    email: 'jorgejuarezgomez26@gmail.com',
    alianzas: ['ADARA ARGUELLO', 'IXHA', 'Kuchmots', 'SOMOS LA DIFERENCIA'],
  },
  {
    nombre: 'Kass Brambila',
    email: 'kassiebc@gmail.com',
    alianzas: ['LGI', 'KB Asesores'],
  },
  { nombre: 'Mayra Alvarez', email: 'coachmayraalvarez@gmail.com', alianzas: ['YUCCALI'] },
  {
    nombre: 'Pablo Canto',
    email: 'pablocantomaldonado@gmail.com',
    alianzas: ['Estrellas Inmobiliarias'],
  },
  {
    nombre: 'Roberto Castro',
    email: 'robertoexitoso@gmail.com',
    alianzas: ['BM CDMX', 'Reinventemos'],
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generarPassword(): string {
  // 14 chars: 8 base64-safe + 4 dígitos + 2 símbolos. Fácil dictado por WhatsApp.
  const base = randomBytes(6).toString('base64').replace(/[+/=]/g, '').slice(0, 8)
  const num = String(Math.floor(1000 + Math.random() * 9000))
  return `${base}${num}!?`
}

async function hashPassword(plain: string): Promise<string> {
  return hash(plain, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 })
}

async function main() {
  // ── Resolver tenant ────────────────────────────────────────────────────────
  const [tenant] = await db.select({ id: tenants.id }).from(tenants).limit(1)
  if (!tenant) {
    console.error('Sin tenant. Aborto.')
    process.exit(1)
  }
  const tenantId = tenant.id

  console.log('═══════════════════════════════════════════════════════════════')
  console.log('  Cuentas portal BM CORP — creación bulk')
  console.log('═══════════════════════════════════════════════════════════════\n')

  const credenciales: { nombre: string; email: string; password: string; alianzas: string[] }[] = []

  for (const lider of LIDERES) {
    const emailLower = lider.email.toLowerCase()

    // ── Verificar si ya existe ───────────────────────────────────────────────
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, emailLower))
      .limit(1)
    if (existing.length > 0) {
      console.log(`⏭  ${lider.nombre} (${emailLower}) — ya existe, skip`)
      continue
    }

    // ── Buscar primer liderId (cualquiera de sus alianzas) ──────────────────
    // Match por email primary O email_alterno (caso Jorge cuyo primary es de Maff)
    const [liderRow] = await db
      .select({ id: lideresAlianza.id })
      .from(lideresAlianza)
      .where(
        and(
          eq(lideresAlianza.tenantId, tenantId),
          sql`(LOWER(${lideresAlianza.email}) = ${emailLower} OR LOWER(${lideresAlianza.emailAlterno}) = ${emailLower})`,
          isNull(lideresAlianza.deletedAt),
          eq(lideresAlianza.activo, true),
        ),
      )
      .limit(1)

    if (!liderRow) {
      console.log(`⚠  ${lider.nombre} — no se encontró liderAlianza con email ${emailLower}. Skip.`)
      continue
    }

    // ── Generar password + hash ─────────────────────────────────────────────
    const password = generarPassword()
    const passwordHash = await hashPassword(password)

    const userId = randomUUID()
    const accountId = randomUUID()

    // ── Insertar todo en una transacción ────────────────────────────────────
    await db.transaction(async (tx) => {
      await tx.insert(users).values({
        id: userId,
        email: emailLower,
        name: lider.nombre,
        emailVerified: true,
        role: 'lider_alianza',
        tenantId,
      })

      await tx.insert(accounts).values({
        id: accountId,
        userId,
        accountId: emailLower,
        providerId: 'credential',
        password: passwordHash,
      })

      await tx.insert(usuariosPortal).values({
        tenantId,
        userId,
        rolPortal: 'LIDER_ALIANZA',
        liderId: liderRow.id,
        asesorId: null,
        activo: true,
      })
    })

    credenciales.push({
      nombre: lider.nombre,
      email: emailLower,
      password,
      alianzas: lider.alianzas,
    })
    console.log(`✓  ${lider.nombre} (${emailLower})`)
  }

  // ── Output final ────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════')
  console.log('  CREDENCIALES — copiar a docs/cuentas-portal-bm-corp.md')
  console.log('═══════════════════════════════════════════════════════════════\n')
  for (const c of credenciales) {
    console.log(`Nombre:     ${c.nombre}`)
    console.log(`Email:      ${c.email}`)
    console.log(`Password:   ${c.password}`)
    console.log(`Alianzas:   ${c.alianzas.join(', ')}`)
    console.log('───────────────────────────────────────────────────────────────')
  }
  console.log(`\nTotal creadas: ${credenciales.length}/${LIDERES.length}`)
  process.exit(0)
}

main().catch((err) => {
  console.error('Error fatal:', err)
  process.exit(1)
})
