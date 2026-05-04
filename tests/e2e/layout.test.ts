import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'admin@universojade.com'
const ADMIN_PASSWORD = 'Admin12345!'

async function login(page: import('@playwright/test').Page) {
  await page.context().clearCookies()
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
  await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
}

test.describe('Layout app — sidebar y selector de empresa', () => {
  test('sidebar muestra módulos base con TODAS empresas', async ({ page }) => {
    await login(page)
    // Default empresaActiva = 'TODAS'
    const sidebar = page.locator('aside')
    await expect(sidebar.getByRole('link', { name: 'Dashboard' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Flujo' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Proyectos' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Cuentas' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Reportes' })).toBeVisible()
    // No "Cargas Excel" or "Sincronización Monday" in TODAS view
    await expect(sidebar.getByRole('link', { name: 'Cargas Excel' })).toHaveCount(0)
    await expect(sidebar.getByRole('link', { name: 'Sincronización Monday' })).toHaveCount(0)
  })

  test('cambiar a MIHBAH muestra módulo Cargas Excel', async ({ page }) => {
    await login(page)
    // Open sidebar empresa selector
    const sidebar = page.locator('aside')
    await sidebar.locator('#empresa-selector-trigger').click()
    await page.getByRole('option', { name: /MIHBAH/i }).click()

    await expect(sidebar.getByRole('link', { name: 'Cargas Excel' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Sincronización Monday' })).toHaveCount(0)
  })

  test('cambiar a BM CORP muestra Sincronización Monday', async ({ page }) => {
    await login(page)
    const sidebar = page.locator('aside')
    await sidebar.locator('#empresa-selector-trigger').click()
    await page.getByRole('option', { name: /BM CORP/i }).click()

    await expect(sidebar.getByRole('link', { name: 'Sincronización Monday' })).toBeVisible()
    await expect(sidebar.getByRole('link', { name: 'Cargas Excel' })).toHaveCount(0)
  })

  test('theme switcher alterna entre claro y oscuro', async ({ page }) => {
    await login(page)
    const html = page.locator('html')
    // Default: light (no .dark class)
    await expect(html).not.toHaveClass(/dark/)

    await page.locator('#topbar-theme-switcher').click()
    // After click: dark mode (depending on cycle: light → system → dark or light → dark)
    // Check class transitions through expected sequence
    const initial = await html.getAttribute('class')
    await page.locator('#topbar-theme-switcher').click()
    await page.waitForTimeout(300)
    const second = await html.getAttribute('class')
    expect(initial).not.toEqual(second)
  })

  test('logout regresa a /login', async ({ page }) => {
    await login(page)
    await page.locator('#sidebar-logout-btn').click()
    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })

  test('navegación a módulo Proyectos abre página', async ({ page }) => {
    await login(page)
    await page.locator('aside').getByRole('link', { name: 'Proyectos' }).click()
    await expect(page).toHaveURL(/\/proyectos/)
    await expect(page.getByRole('heading', { name: 'Proyectos' })).toBeVisible()
  })
})
