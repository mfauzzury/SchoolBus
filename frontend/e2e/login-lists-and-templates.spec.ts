import { expect, test, type Page } from '@playwright/test'
import { loginAs, unique } from './helpers'

test.describe('Login page tabs', () => {
  test('opens on the parent tab and finds an operator by ID without leaving the page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('tab', { name: 'Parent' })).toHaveAttribute('aria-selected', 'true')
    await expect(page.getByText('New parent?')).toBeVisible()

    await page.locator('input[data-input-otp]').click({ force: true })
    await page.keyboard.type('10000')
    await expect(page.getByText('Shahrul Transport')).toBeVisible()

    await page.click('button:has-text("Register")')
    await expect(page).toHaveURL(/\/register\/10000/)
  })

  test('the operator tab offers account creation, and ?as=operator opens it', async ({ page }) => {
    await page.goto('/login')
    await page.getByRole('tab', { name: 'Operator' }).click()
    await expect(page.getByRole('link', { name: 'Create an account' })).toHaveAttribute('href', '/signup')

    await page.goto('/login?as=operator')
    await expect(page.getByRole('tab', { name: 'Operator' })).toHaveAttribute('aria-selected', 'true')
  })

  test('an empty form shows plain-language errors, not raw validation text', async ({ page }) => {
    await page.goto('/login')
    await page.click('button[type="submit"]')
    await expect(page.getByText('This field is required')).toBeVisible()
    await expect(page.getByText('Too small')).toHaveCount(0)
  })
})

async function addRoute(page: Page, name: string, session: 'Morning' | 'Afternoon', fare: string) {
  await page.click('a:has-text("Add route")')
  await page.getByText(`${session} session`).click()
  await page.fill('#name', name)
  await page.click('button:has-text("Next")') // details -> stops
  await page.click('button:has-text("Next")') // stops -> fares
  await page.fill('#base_monthly_fee', fare)
  await page.click('button:has-text("Next")') // fares -> bus & crew
  await page.click('button:has-text("Next")') // bus & crew -> review
  await page.click('button:has-text("Save")')
  await expect(page.locator('tbody tr', { hasText: name })).toBeVisible()
}

test.describe('Routes list', () => {
  test('a route needs a session, can be duplicated in one click, and the list can be filtered and sorted', async ({ page }) => {
    const alpha = `Alpha ${unique()}`
    const beta = `Beta ${unique()}`

    await loginAs(page, 'admin@demo.test', 'password')
    await page.waitForURL(/operator\/dashboard/)
    await page.click('a:has-text("Routes")')

    // The first step asks for the session before anything else.
    await page.click('a:has-text("Add route")')
    await page.fill('#name', 'No session yet')
    await page.click('button:has-text("Next")')
    await expect(page.getByText('Please choose morning or afternoon.')).toBeVisible()
    await page.goto('/operator/routes')

    await addRoute(page, alpha, 'Morning', '150')
    await addRoute(page, beta, 'Afternoon', '90')

    // Duplicate saves a copy at once and stays on the list.
    await page.locator('tbody tr', { hasText: alpha }).first().getByRole('button', { name: 'Duplicate' }).click()
    await expect(page.locator('tbody tr', { hasText: `${alpha} (copy)` })).toBeVisible()
    await expect(page).toHaveURL(/\/operator\/routes$/)

    // Search and the session filter narrow the list.
    await page.fill('#list-search', alpha)
    await expect(page.locator('tbody tr')).toHaveCount(2)
    await page.getByRole('button', { name: 'Clear' }).click()

    await page.getByRole('combobox').first().click()
    await page.getByRole('option', { name: 'Afternoon session' }).click()
    await expect(page.locator('tbody tr', { hasText: beta })).toBeVisible()
    await expect(page.locator('tbody tr', { hasText: alpha })).toHaveCount(0)
    await page.getByRole('button', { name: 'Clear' }).click()

    // Clicking a heading sorts; clicking again reverses it.
    await page.getByRole('button', { name: /^Name/ }).click()
    const first = async () => (await page.locator('tbody tr').first().innerText()).split('\n')[0]
    const ascending = await first()
    await page.getByRole('button', { name: /^Name/ }).click()
    expect(await first()).not.toBe(ascending)
  })
})

test.describe('Platform email templates', () => {
  test('the owner can preview, reword, save and reset a parent email', async ({ page }) => {
    await loginAs(page, 'admin@bassekolah.my', 'password')
    await page.waitForURL(/admin/)
    await page.goto('/admin/messages')
    await page.getByRole('button', { name: 'Email templates' }).click()

    const preview = page.frameLocator('iframe').locator('body')
    await expect(preview).toContainText('Bas Sekolah Maju')

    // The preview follows the edit before anything is saved.
    await page.getByLabel('Opening sentence').fill('Bil bulan ini daripada {operator}:')
    await expect(preview).toContainText('Bil bulan ini daripada Bas Sekolah Maju:')

    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Edited', { exact: true })).toBeVisible()

    // A misspelt placeholder is refused with a message.
    await page.getByLabel('Closing sentence').fill('Hi {oprator}')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page.getByText('Unknown placeholder: {oprator}')).toBeVisible()

    await page.getByLabel('Closing sentence').fill('')
    await page.getByRole('button', { name: 'Back to original wording' }).click()
    await expect(page.getByText('Edited', { exact: true })).toHaveCount(0)
    await expect(page.getByLabel('Opening sentence')).toHaveValue('{operator} telah mengeluarkan bil baharu:')

    // Code emails can be seen but not changed.
    await page.getByRole('button', { name: /Sign-up code/ }).click()
    await expect(page.getByText("This email can't be edited")).toBeVisible()
  })
})
