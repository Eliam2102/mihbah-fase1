import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { admin } from 'better-auth/plugins'
import { createAccessControl } from 'better-auth/plugins/access'
import { betterAuth } from 'better-auth'
import { nextCookies } from 'better-auth/next-js'

const ac = createAccessControl({
  user: ['create', 'read', 'update', 'delete', 'list', 'set-role', 'ban', 'impersonate'],
  session: ['list', 'revoke', 'delete'],
  // Recursos del portal externo (Épica 14)
  portal: ['acceder'],
  comisiones: ['ver', 'crear', 'editar', 'aprobar', 'pagar'],
  comprobantes: ['ver', 'subir'],
})

const userRole = ac.newRole({})
const adminRole = ac.newRole({
  user: ['create', 'read', 'update', 'list', 'set-role', 'ban'],
  session: ['list', 'revoke'],
  comisiones: ['ver', 'crear', 'editar', 'aprobar', 'pagar'],
  comprobantes: ['ver', 'subir'],
})
const superAdminRole = ac.newRole({
  user: ['create', 'read', 'update', 'delete', 'list', 'set-role', 'ban', 'impersonate'],
  session: ['list', 'revoke', 'delete'],
  comisiones: ['ver', 'crear', 'editar', 'aprobar', 'pagar'],
  comprobantes: ['ver', 'subir'],
})
// SaaS owner — cross-tenant, full control
const superAdminDevRole = ac.newRole({
  user: ['create', 'read', 'update', 'delete', 'list', 'set-role', 'ban', 'impersonate'],
  session: ['list', 'revoke', 'delete'],
  comisiones: ['ver', 'crear', 'editar', 'aprobar', 'pagar'],
  comprobantes: ['ver', 'subir'],
})
// Roles del portal externo (líderes y asesores)
const liderAlianzaRole = ac.newRole({
  portal: ['acceder'],
  comisiones: ['ver'],
  comprobantes: ['ver'],
})
const asesorRole = ac.newRole({
  portal: ['acceder'],
  comisiones: ['ver'],
  comprobantes: ['ver'],
})
import { db } from '@/lib/db'
import { accounts, sessions, users, verifications } from '@/lib/db/schema'

export const auth = betterAuth({
  appName: 'MIHBAH',
  baseURL: process.env.BETTER_AUTH_URL ?? 'http://localhost:3000',
  secret: process.env.BETTER_AUTH_SECRET,

  database: drizzleAdapter(db, {
    provider: 'pg',
    usePlural: true,
    schema: {
      users,
      sessions,
      accounts,
      verifications,
    },
  }),

  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
    password: {
      hash: async (password) => {
        const { hash } = await import('@node-rs/argon2')
        return hash(password, {
          algorithm: 2, // Argon2id
          memoryCost: 19456,
          timeCost: 2,
          parallelism: 1,
        })
      },
      verify: async ({ hash: h, password }) => {
        const { verify } = await import('@node-rs/argon2')
        return verify(h, password)
      },
    },
    sendResetPassword: async ({ user, url, token }) => {
      // TODO: Send email in Fase 2
      console.log(`[RESET PASSWORD] user=${user.email} token=${token} url=${url}`)
    },
    resetPasswordTokenExpiresIn: 60 * 60, // 1 hour
  },

  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },

  advanced: {
    cookiePrefix: 'mihbah',
    defaultCookieAttributes: {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    },
  },

  user: {
    additionalFields: {
      tenantId: {
        type: 'string',
        required: false,
        input: false,
      },
    },
  },

  // Library type strictness incompatible with exactOptionalPropertyTypes — cast safe at runtime

  plugins: [
    admin({
      ac,
      roles: {
        user: userRole,
        admin: adminRole,
        super_admin: superAdminRole,
        super_admin_dev: superAdminDevRole,
        lider_alianza: liderAlianzaRole,
        asesor: asesorRole,
      },
      defaultRole: 'user',
      adminRoles: ['admin', 'super_admin', 'super_admin_dev'],
    } as never),
    nextCookies(),
  ] as never,
})

export type Auth = typeof auth
