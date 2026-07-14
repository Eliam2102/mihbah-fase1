/**
 * Cifrado de campos sensibles (CLABE, número de cuenta).
 *
 * Algoritmo: AES-256-GCM (autenticado, evita tampering).
 * Master key: env `FIELD_ENCRYPTION_KEY` (hex, 64 chars = 32 bytes).
 * Formato cifrado en DB: `enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>`
 *
 * Generar key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Si la key no existe en env, las funciones retornan/aceptan el texto plano
 * con warning — permite migración progresiva. En prod la key DEBE estar.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'

const ALGO = 'aes-256-gcm'
const PREFIX = 'enc:v1:'

function getKey(): Buffer | null {
  const hex = process.env.FIELD_ENCRYPTION_KEY
  if (!hex) return null
  if (hex.length !== 64) {
    throw new Error(
      "FIELD_ENCRYPTION_KEY debe ser 64 chars hex (32 bytes). Generar con: node -e \"console.log(require('crypto').randomBytes(32).toString('hex'))\"",
    )
  }
  return Buffer.from(hex, 'hex')
}

/**
 * Cifra texto plano. Si la key no está configurada, retorna el texto sin cifrar
 * con warning (modo migración).
 */
export function encryptField(plain: string | null | undefined): string | null {
  if (plain == null || plain === '') return null
  // Si ya está cifrado, no re-cifrar
  if (plain.startsWith(PREFIX)) return plain

  const key = getKey()
  if (!key) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FIELD_ENCRYPTION_KEY requerida en producción')
    }
    console.warn(
      '[field-encryption] FIELD_ENCRYPTION_KEY no configurada, guardando en plano (dev only)',
    )
    return plain
  }

  const iv = randomBytes(12) // GCM standard nonce
  const cipher = createCipheriv(ALGO, key, iv)
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('hex')}:${tag.toString('hex')}:${enc.toString('hex')}`
}

/**
 * Descifra valor. Si no tiene prefijo `enc:v1:` lo devuelve tal cual (texto plano legado).
 */
export function decryptField(encrypted: string | null | undefined): string | null {
  if (encrypted == null || encrypted === '') return null
  if (!encrypted.startsWith(PREFIX)) return encrypted // legado plano

  const key = getKey()
  if (!key) {
    throw new Error('FIELD_ENCRYPTION_KEY no configurada y se intentó descifrar un valor cifrado')
  }

  const parts = encrypted.slice(PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('Formato cifrado inválido')
  }
  const [ivHex, tagHex, ctHex] = parts
  const iv = Buffer.from(ivHex!, 'hex')
  const tag = Buffer.from(tagHex!, 'hex')
  const ct = Buffer.from(ctHex!, 'hex')

  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)
  const dec = Buffer.concat([decipher.update(ct), decipher.final()])
  return dec.toString('utf8')
}

/**
 * Detecta si un valor está cifrado (tiene el prefijo).
 */
export function isEncrypted(v: string | null | undefined): boolean {
  return typeof v === 'string' && v.startsWith(PREFIX)
}
