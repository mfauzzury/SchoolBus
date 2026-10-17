import { test, expect } from '@playwright/test'
import { loginAs, unique, verifyEmailViaUi } from './helpers'

async function registerParentViaUi(page: import('@playwright/test').Page, email: string) {
  await page.goto('/register/10000')
  await verifyEmailViaUi(page, email) // step 1: prove the email with a code
  await page.fill('#full_name', 'E2E Parent')
  await page.fill('#ic_number', '900101-01-9999')
  await page.click('button:has-text("Next")')
  await page.fill('#phone', '0123456789')
  await page.click('button:has-text("Next")')
  await page.click('button:has-text("Next")') // emergency contact is optional
  await page.fill('#password', 'password123')
  await page.click('button[type="submit"]:has-text("Register")')
  await expect(page).toHaveURL(/\/parent\/dashboard/)
}

test.describe('Landing page', () => {
  test('shows the parent code entry and a path for operators when logged out', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText("I'm a parent")).toBeVisible()
    await expect(page.getByRole('link', { name: 'For Operators' }).first()).toBeVisible()
  })

  test('resolves a valid operator code and rejects an invalid one', async ({ page }) => {
    await page.goto('/')
    const otpInput = page.locator('input[data-input-otp]')

    await otpInput.click({ force: true })
    await page.keyboard.type('99999')
    await expect(page.getByText('No operator found with that ID')).toBeVisible()

    for (let i = 0; i < 5; i++) await page.keyboard.press('Backspace')
    await page.keyboard.type('10000')
    await expect(page.getByText('Shahrul Transport')).toBeVisible()

    await page.click('button:has-text("Continue")')
    await expect(page).toHaveURL(/\/register\/10000/)
  })

  test('unknown routes redirect back to the landing page', async ({ page }) => {
    await page.goto('/some/bogus/path')
    await expect(page).toHaveURL('/')
  })
})

test.describe('Authentication', () => {
  test('operator login redirects to the operator dashboard', async ({ page }) => {
    await loginAs(page, 'admin@demo.test', 'password')
    await expect(page).toHaveURL(/\/operator\/dashboard/)
    await expect(page.getByText('Your Operator ID')).toBeVisible()
  })

  test('invalid credentials show an error and do not navigate', async ({ page }) => {
    await loginAs(page, 'admin@demo.test', 'wrong-password')
    await expect(page.getByText('Invalid credentials.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('a parent login redirects to the parent dashboard, not the operator one', async ({ page }) => {
    await registerParentViaUi(page, `parent-login-${unique()}@test.com`)
  })

  test('a link to a parent page asks for login, then goes straight to that page', async ({ page, context }) => {
    const email = `parent-next-${unique()}@test.com`
    await registerParentViaUi(page, email)
    // Let in-flight requests finish first: each API reply re-sends the session cookie.
    await page.waitForLoadState('networkidle')
    await context.clearCookies() // as if they opened the email link in a logged-out browser

    await page.goto('/parent/invoices')
    await expect(page).toHaveURL(/\/login\?next=%2Fparent%2Finvoices/)

    await page.fill('#email', email)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/parent\/invoices$/)
  })

  test('a login link cannot send someone to another website', async ({ page }) => {
    const email = `parent-evil-${unique()}@test.com`
    await registerParentViaUi(page, email)
    await page.waitForLoadState('networkidle')
    await page.context().clearCookies()

    await page.goto('/login?next=//evil.example')
    await page.fill('#email', email)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/localhost:5173\/parent\/dashboard/)
  })

  test('a forgotten password is reset with an emailed code', async ({ page }) => {
    const email = `parent-forgot-${unique()}@test.com`
    await registerParentViaUi(page, email)
    await page.context().clearCookies()

    await page.goto('/forgot-password')
    await verifyEmailViaUi(page, email)
    await page.fill('#password', 'newpassword456')
    await page.click('button[type="submit"]:has-text("Change password")')
    await expect(page.getByText('Password changed')).toBeVisible()

    await loginAs(page, email, 'newpassword456')
    await expect(page).toHaveURL(/\/parent\/dashboard/)
  })

  test('an authenticated parent cannot directly load an operator page', async ({ page }) => {
    await registerParentViaUi(page, `parent-guard-${unique()}@test.com`)

    await page.goto('/operator/finances')
    await expect(page).toHaveURL(/\/parent\/dashboard/)
  })

  test('an authenticated operator cannot directly load a parent page', async ({ page }) => {
    await loginAs(page, 'admin@demo.test', 'password')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    await page.goto('/parent/enroll')
    await expect(page).toHaveURL(/\/operator\/dashboard/)
  })
})
