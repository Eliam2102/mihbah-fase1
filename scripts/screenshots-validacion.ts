/**
 * Captura screenshots de cada módulo de BM Corp para reporte de validación.
 *
 * Uso:
 *   1. Dev server corriendo: npm run dev
 *   2. Edita ADMIN_EMAIL/ADMIN_PASSWORD abajo con credenciales válidas
 *   3. npx tsx scripts/screenshots-validacion.ts
 *
 * Output: docs/screenshots/<modulo>.png
 */
import { chromium, type Page } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

// ─── Config — EDITA ESTO ─────────────────────────────────────────────────────
const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000'
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'operaciones@vilostudio.ai'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'CAMBIA_ESTO'
const EMPRESA_SLUG = 'bm-corp'

// Set true para usar portal externo (después de admin)
const CAPTURAR_PORTAL = false
const PORTAL_EMAIL = process.env.PORTAL_EMAIL ?? ''
const PORTAL_PASSWORD = process.env.PORTAL_PASSWORD ?? ''

const OUTPUT_DIR = join(process.cwd(), 'docs', 'screenshots')

// ─── Lista de módulos a capturar ────────────────────────────────────────────
type Modulo = {
  nombre: string
  archivo: string
  ruta: (empresaId: string) => string
  esperarSelector?: string
  scroll?: boolean
}

const MODULOS_ADMIN: Modulo[] = [
  {
    nombre: '01 Landing Comisiones',
    archivo: '01-landing-comisiones',
    ruta: (id) => `/empresa/${id}/comisiones`,
    esperarSelector: 'h1',
  },
  {
    nombre: '02 Guía del módulo',
    archivo: '02-guia',
    ruta: (id) => `/empresa/${id}/comisiones/guia`,
  },
  {
    nombre: '03 Esquemas globales',
    archivo: '03-esquemas',
    ruta: (id) => `/empresa/${id}/comisiones/esquemas`,
  },
  {
    nombre: '04 Alianzas + Matrices',
    archivo: '04-alianzas',
    ruta: (id) => `/empresa/${id}/comisiones/alianzas`,
  },
  {
    nombre: '05 Niveles membresía',
    archivo: '05-niveles',
    ruta: (id) => `/empresa/${id}/comisiones/niveles`,
  },
  {
    nombre: '06 Pautas digitales',
    archivo: '06-pautas',
    ruta: (id) => `/empresa/${id}/comisiones/pautas`,
  },
  {
    nombre: '07 Ventas con comisión',
    archivo: '07-ventas',
    ruta: (id) => `/empresa/${id}/ventas`,
  },
  {
    nombre: '08 Dispersiones',
    archivo: '08-dispersiones',
    ruta: (id) => `/empresa/${id}/comisiones/dispersiones`,
  },
  {
    nombre: '09 Precálculo',
    archivo: '09-precalculo',
    ruta: (id) => `/empresa/${id}/comisiones/precalculo`,
  },
  {
    nombre: '10 Validación cálculos',
    archivo: '10-validacion',
    ruta: (id) => `/empresa/${id}/comisiones/validacion`,
  },
  {
    nombre: '11 NPS trimestral',
    archivo: '11-nps',
    ruta: (id) => `/empresa/${id}/comisiones/nps`,
  },
  {
    nombre: '12 Portal usuarios admin',
    archivo: '12-portal-usuarios',
    ruta: (id) => `/empresa/${id}/comisiones/portal-usuarios`,
  },
  {
    nombre: '13 Monday sync',
    archivo: '13-monday-sync',
    ruta: (id) => `/empresa/${id}/monday`,
  },
]

const MODULOS_PORTAL: Modulo[] = [
  { nombre: '14 Portal login', archivo: '14-portal-login', ruta: () => '/portal/login' },
  {
    nombre: '15 Portal dashboard',
    archivo: '15-portal-dashboard',
    ruta: () => '/portal/dashboard',
  },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function loginAdmin(page: Page): Promise<void> {
  console.log('→ Login admin...')
  await page.goto(`${BASE_URL}/login`)
  await page.fill('input[type="email"]', ADMIN_EMAIL)
  await page.fill('input[type="password"]', ADMIN_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/(dashboard|empresa)/, { timeout: 15_000 })
  console.log('✓ Admin logueado')
}

async function loginPortal(page: Page): Promise<void> {
  console.log('→ Login portal...')
  await page.goto(`${BASE_URL}/portal/login`)
  await page.fill('input[type="email"]', PORTAL_EMAIL)
  await page.fill('input[type="password"]', PORTAL_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL(/\/portal\/dashboard/, { timeout: 15_000 })
  console.log('✓ Portal logueado')
}

async function obtenerEmpresaId(page: Page): Promise<string> {
  console.log('→ Detectando empresa BM Corp...')
  await page.goto(`${BASE_URL}/dashboard`)
  await page.waitForLoadState('networkidle')

  // Buscar link a /empresa/<id> que contenga BM Corp o slug
  const url = await page.evaluate((slug) => {
    const links = Array.from(
      document.querySelectorAll('a[href*="/empresa/"]'),
    ) as HTMLAnchorElement[]
    for (const a of links) {
      const txt = (a.textContent || '').toLowerCase()
      if (txt.includes('bm corp') || txt.includes(slug) || a.href.includes(slug)) {
        return a.href
      }
    }
    return links[0]?.href ?? ''
  }, EMPRESA_SLUG)

  if (!url) throw new Error('No se detectó empresa BM Corp')
  const match = url.match(/\/empresa\/([^/]+)/)
  if (!match) throw new Error('No se pudo extraer empresaId de URL')
  console.log(`✓ Empresa ID: ${match[1]}`)
  return match[1]!
}

async function capturar(page: Page, modulo: Modulo, empresaId: string): Promise<void> {
  const url = `${BASE_URL}${modulo.ruta(empresaId)}`
  console.log(`→ ${modulo.nombre}`)
  console.log(`  ${url}`)

  try {
    await page.goto(url, { timeout: 30_000 })
    await page.waitForLoadState('networkidle', { timeout: 15_000 })

    if (modulo.esperarSelector) {
      await page.waitForSelector(modulo.esperarSelector, { timeout: 10_000 }).catch(() => {})
    }

    // Esperar a que se rendericen Loading spinners
    await page.waitForTimeout(1500)

    const path = join(OUTPUT_DIR, `${modulo.archivo}.png`)
    await page.screenshot({
      path,
      fullPage: true,
    })
    console.log(`  ✓ ${modulo.archivo}.png`)
  } catch (e) {
    console.error(`  ✗ Error: ${(e as Error).message}`)
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════')
  console.log('  Capturando screenshots BM Corp')
  console.log('═══════════════════════════════════════════\n')

  await mkdir(OUTPUT_DIR, { recursive: true })
  console.log(`Output: ${OUTPUT_DIR}\n`)

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    locale: 'es-MX',
    timezoneId: 'America/Mexico_City',
  })
  const page = await context.newPage()

  try {
    await loginAdmin(page)
    const empresaId = await obtenerEmpresaId(page)

    console.log(`\n--- Módulos admin (${MODULOS_ADMIN.length}) ---\n`)
    for (const m of MODULOS_ADMIN) {
      await capturar(page, m, empresaId)
    }

    if (CAPTURAR_PORTAL && PORTAL_EMAIL && PORTAL_PASSWORD) {
      console.log('\n--- Logout admin → Login portal ---\n')
      await page.goto(`${BASE_URL}/api/auth/sign-out`).catch(() => {})
      await context.clearCookies()
      await loginPortal(page)

      console.log(`\n--- Módulos portal (${MODULOS_PORTAL.length}) ---\n`)
      for (const m of MODULOS_PORTAL) {
        await capturar(page, m, '')
      }
    }
  } finally {
    await browser.close()
  }

  console.log('\n═══════════════════════════════════════════')
  console.log(`  Listo. Screenshots en: ${OUTPUT_DIR}`)
  console.log('═══════════════════════════════════════════')
}

main().catch((e) => {
  console.error('Error fatal:', e)
  process.exit(1)
})
