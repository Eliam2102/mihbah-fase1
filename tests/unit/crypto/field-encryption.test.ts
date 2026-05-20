/**
 * Tests cifrado AES-256-GCM para campos sensibles.
 */
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const originalEnv = process.env.FIELD_ENCRYPTION_KEY

beforeAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = 'a'.repeat(64) // 64 hex chars = 32 bytes
})

afterAll(() => {
  process.env.FIELD_ENCRYPTION_KEY = originalEnv
})

describe('field-encryption', () => {
  it('cifra y descifra correctamente', async () => {
    const { encryptField, decryptField } = await import('@/lib/crypto/field-encryption')
    const plain = '012345678901234567' // CLABE típica 18 dígitos
    const enc = encryptField(plain)!
    expect(enc).not.toBe(plain)
    expect(enc.startsWith('enc:v1:')).toBe(true)
    expect(decryptField(enc)).toBe(plain)
  })

  it('cada llamada produce ciphertext diferente (IV aleatorio)', async () => {
    const { encryptField } = await import('@/lib/crypto/field-encryption')
    const a = encryptField('test123')
    const b = encryptField('test123')
    expect(a).not.toBe(b) // distinto por IV aleatorio
  })

  it('null/empty → null', async () => {
    const { encryptField, decryptField } = await import('@/lib/crypto/field-encryption')
    expect(encryptField(null)).toBeNull()
    expect(encryptField('')).toBeNull()
    expect(decryptField(null)).toBeNull()
  })

  it('descifrar texto plano legado (sin prefijo) → retorna tal cual', async () => {
    const { decryptField } = await import('@/lib/crypto/field-encryption')
    expect(decryptField('012345678901234567')).toBe('012345678901234567')
  })

  it('no re-cifra valor ya cifrado', async () => {
    const { encryptField } = await import('@/lib/crypto/field-encryption')
    const enc = encryptField('test')!
    const reencriptado = encryptField(enc)
    expect(reencriptado).toBe(enc) // mismo valor
  })

  it('tampering del ciphertext lanza error en decrypt', async () => {
    const { encryptField, decryptField } = await import('@/lib/crypto/field-encryption')
    const enc = encryptField('secret')!
    // Modificar el ciphertext (último char)
    const tampered = enc.slice(0, -1) + (enc.slice(-1) === '0' ? '1' : '0')
    expect(() => decryptField(tampered)).toThrow()
  })
})
