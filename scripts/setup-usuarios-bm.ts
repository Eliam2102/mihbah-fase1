/**
 * Setup usuarios ERP de BM CORP.
 * - Jorge Juárez → super_admin (ya existe como lider_alianza, se actualiza)
 * - Carla Barrera → super_admin (se crea)
 * - Joana Piña    → admin / tesorería (se crea)
 *
 * Uso: tsx scripts/setup-usuarios-bm.ts
 */
import 'dotenv/config'
import postgres from 'postgres'
import { randomUUID } from 'crypto'
import { hash } from '@node-rs/argon2'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

const TENANT_SLUG = 'universo-jade'

const USUARIOS: {
  name: string
  email: string
  password: string
  role: string
}[] = [
  {
    name: 'Jorge Juárez',
    email: 'jorgejuarezgomez26@gmail.com',
    password: 'JorgeJuarez2026!',
    role: 'super_admin',
  },
  {
    name: 'Carla Barrera',
    email: 'carla@universojade.com',
    password: 'CarlaBarrera2026!',
    role: 'super_admin',
  },
  {
    name: 'Joana Piña',
    email: 'joanapina@universojade.com',
    password: 'JoanaPina2026!',
    role: 'admin',
  },
]

async function hashPwd(pwd: string) {
  return hash(pwd, { algorithm: 2, memoryCost: 19456, timeCost: 2, parallelism: 1 })
}

async function main() {
  const [tenant] = await sql`SELECT id FROM tenants WHERE slug = ${TENANT_SLUG} LIMIT 1`
  if (!tenant) throw new Error(`Tenant ${TENANT_SLUG} no encontrado`)
  const tenantId = tenant.id

  const empresas = await sql`SELECT id FROM empresas WHERE tenant_id = ${tenantId}`

  for (const u of USUARIOS) {
    console.log(`\nProcesando: ${u.name} <${u.email}> [${u.role}]`)

    // ¿Ya existe?
    const [existing] = await sql`SELECT id, role FROM users WHERE email = ${u.email} LIMIT 1`

    if (existing) {
      // Actualizar rol si cambió
      if (existing.role !== u.role) {
        await sql`UPDATE users SET role = ${u.role} WHERE id = ${existing.id}`
        console.log(`  Rol actualizado: ${existing.role} → ${u.role}`)
      } else {
        console.log(`  Ya existe con rol correcto (${u.role})`)
      }

      // Asegurar acceso a todas las empresas
      for (const empresa of empresas) {
        await sql`
          INSERT INTO user_empresa_access (tenant_id, user_id, empresa_id, rol)
          VALUES (${tenantId}, ${existing.id}, ${empresa.id}, 'ADMIN')
          ON CONFLICT (user_id, empresa_id) DO UPDATE SET rol = 'ADMIN'
        `
      }
      console.log(`  Acceso a ${empresas.length} empresa(s) garantizado`)
      continue
    }

    // Crear usuario nuevo
    const userId = randomUUID()
    const passwordHash = await hashPwd(u.password)

    await sql`
      INSERT INTO users (id, name, email, email_verified, role, tenant_id)
      VALUES (${userId}, ${u.name}, ${u.email}, true, ${u.role}, ${tenantId})
    `

    const accountId = randomUUID()
    await sql`
      INSERT INTO accounts (id, user_id, account_id, provider_id, password)
      VALUES (${accountId}, ${userId}, ${userId}, 'credential', ${passwordHash})
    `

    for (const empresa of empresas) {
      await sql`
        INSERT INTO user_empresa_access (tenant_id, user_id, empresa_id, rol)
        VALUES (${tenantId}, ${userId}, ${empresa.id}, 'ADMIN')
        ON CONFLICT (user_id, empresa_id) DO NOTHING
      `
    }

    console.log(`  Creado. Email: ${u.email} | Pass: ${u.password}`)
  }

  console.log('\nDone.')
  await sql.end()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
