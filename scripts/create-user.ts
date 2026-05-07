import 'dotenv/config'
import postgres from 'postgres'
import { randomUUID } from 'crypto'
import { hash } from '@node-rs/argon2'

const sql = postgres(process.env.DATABASE_URL!, { max: 1 })

async function createUser() {
  console.log('Creando usuario eliamjesus213@gmail.com...')

  try {
    await sql.begin(async (trx) => {
      // Obtener el tenant
      const [tenant] = await trx`SELECT id FROM tenants WHERE slug = 'universo-jade' LIMIT 1`
      if (!tenant) throw new Error('No se encontró el tenant universo-jade')
      const tenantId = tenant.id

      // Comprobar si el usuario ya existe
      const [existingUser] =
        await trx`SELECT id FROM users WHERE email = 'eliamjesus213@gmail.com' LIMIT 1`
      if (existingUser) {
        console.log('El usuario ya existe con ID:', existingUser.id)
        return
      }

      // Crear el usuario
      const userId = randomUUID()
      const passwordHash = await hash('Eliam12345!', {
        algorithm: 2,
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
      })

      await trx`
        INSERT INTO users (id, name, email, email_verified, role, tenant_id)
        VALUES (
          ${userId}, 'Eliam', 'eliamjesus213@gmail.com',
          true, 'super_admin', ${tenantId}
        )
      `

      const accountId = randomUUID()
      await trx`
        INSERT INTO accounts (id, user_id, account_id, provider_id, password)
        VALUES (${accountId}, ${userId}, ${userId}, 'credential', ${passwordHash})
      `

      // Asignar acceso a las empresas
      const empresas = await trx`SELECT id FROM empresas WHERE tenant_id = ${tenantId}`
      for (const empresa of empresas) {
        await trx`
          INSERT INTO user_empresa_access (tenant_id, user_id, empresa_id, rol)
          VALUES (${tenantId}, ${userId}, ${empresa.id}, 'ADMIN')
        `
      }

      console.log(`✅ Usuario creado exitosamente.`)
      console.log(`Email: eliamjesus213@gmail.com`)
      console.log(`Contraseña: Eliam12345!`)
      console.log(`Rol: super_admin (Con acceso a todas las empresas)`)
    })
  } catch (err) {
    console.error('❌ Error al crear usuario:', err)
  } finally {
    await sql.end()
  }
}

createUser()
