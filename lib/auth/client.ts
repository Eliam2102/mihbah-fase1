'use client'

import { createAuthClient } from 'better-auth/client'
import { adminClient } from 'better-auth/client/plugins'

export const authClient = createAuthClient({
  plugins: [adminClient() as never],
})

export const { signIn, signOut, signUp, useSession, getSession } = authClient
