import { test, expect } from '@playwright/test'

const ADMIN_EMAIL = 'admin@universojade.com'
const ADMIN_PASSWORD = 'Admin12345!'
const WRONG_PASSWORD = 'WrongPass123!'

test.describe('Login', () => {
  test.beforeEach(async ({ page }) => {
    // Clear session before each test
    await page.context().clearCookies()
    await page.goto('/login')
  })

  test('login correcto redirige a /dashboard', async ({ page }) => {
    await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
    await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10_000 })
    await expect(page.getByText('Dashboard')).toBeVisible()
  })

  test('credenciales incorrectas muestra error', async ({ page }) => {
    await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
    await page.getByLabel('Contraseña').fill(WRONG_PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    await expect(page.getByText(/correo o contraseña incorrectos/i)).toBeVisible({ timeout: 5_000 })
    await expect(page).toHaveURL(/\/login/)
  })

  test('email inválido muestra error de validación', async ({ page }) => {
    await page.getByLabel('Correo electrónico').fill('noesunemail')
    await page.getByLabel('Contraseña').fill(ADMIN_PASSWORD)
    await page.getByRole('button', { name: 'Iniciar sesión' }).click()

    // HTML5 validation or server-side error
    const emailInput = page.getByLabel('Correo electrónico')
    const validationMessage = await emailInput.evaluate(
      (el: HTMLInputElement) => el.validationMessage,
    )
    expect(validationMessage).toBeTruthy()
  })
})

test.describe('Protección de rutas', () => {
  test('/dashboard sin sesión redirige a /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/dashboard')

    await expect(page).toHaveURL(/\/login/, { timeout: 5_000 })
  })
})

test.describe('Recuperar contraseña', () => {
  test('formulario recuperar acepta correo y muestra confirmación', async ({ page }) => {
    await page.goto('/recuperar')
    await page.getByLabel('Correo electrónico').fill(ADMIN_EMAIL)
    await page.getByRole('button', { name: 'Enviar instrucciones' }).click()

    await expect(page.getByText('Revisa tu correo')).toBeVisible({ timeout: 8_000 })
  })

  test('correo inexistente también muestra confirmación (no enumeration)', async ({ page }) => {
    await page.goto('/recuperar')
    await page.getByLabel('Correo electrónico').fill('noexiste@test.com')
    await page.getByRole('button', { name: 'Enviar instrucciones' }).click()

    await expect(page.getByText('Revisa tu correo')).toBeVisible({ timeout: 8_000 })
  })
})
