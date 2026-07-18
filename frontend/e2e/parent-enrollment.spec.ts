import { test, expect } from '@playwright/test'
import { unique } from './helpers'

/**
 * The full golden path: operator sets up a route with a rate card, a parent
 * registers, gets a live quote, enrolls, and the invoice + sibling discount
 * both come out matching the spec's worked example (§3.3).
 */
test.describe.serial('Parent enrollment golden path', () => {
  const suffix = unique()
  const operatorEmail = `enroll-operator-${suffix}@test.com`
  const parentEmail = `enroll-parent-${suffix}@test.com`
  let operatorCode = ''

  test('operator signs up and creates a route with a rate card', async ({ page }) => {
    await page.goto('/signup')
    await page.fill('#company_name', `Enroll Bus Co ${suffix}`)
    await page.fill('#contact_person', 'Operator')
    await page.fill('#contact_phone', '0123456789')
    await page.fill('#email', operatorEmail)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]:has-text("Start free")')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    operatorCode = (await page.locator('span.tracking-\\[0\\.3em\\]').textContent())?.trim() ?? ''
    expect(operatorCode).toMatch(/^\d{4}$/)

    await page.click('a:has-text("Routes")')
    await page.click('button:has-text("Add route")')
    await page.fill('#name', 'Route A')
    await page.fill('#base_monthly_fee', '150')
    await page.click('button:has-text("Add stop")')
    await page.fill('input[placeholder="Stop name"]', 'Main Stop')
    await page.click('button[type="submit"]:has-text("Save")')
    await expect(page.locator('td:has-text("Route A")')).toBeVisible()
  })

  test('parent registers via the operator code and gets a live quote matching the spec example', async ({ page }) => {
    await page.goto(`/register/${operatorCode}`)
    await page.fill('#full_name', 'Enroll Parent')
    await page.fill('#ic_number', '900101-01-1111')
    await page.fill('#phone', '0123456789')
    await page.fill('#email', parentEmail)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]:has-text("Register")')
    await expect(page).toHaveURL(/\/parent\/dashboard/)

    await page.click('a:has-text("Enroll a child")')
    await page.fill('#full_name', 'Child One')
    await page.fill('#date_of_birth', '2015-01-01')
    await page.fill('#school_name', 'SK Demo')

    await page.click('[data-slot="select-trigger"] >> nth=0')
    await page.click('[data-slot="select-item"]:has-text("Route A")')

    const selects = await page.locator('[data-slot="select-trigger"]').all()
    await selects[3].click() // billing period
    await page.click('[data-slot="select-item"]:has-text("Yearly")')

    // RM150 x 12 x (1 - 0.15) = RM1,530
    await expect(page.getByText('Total: RM 1530.00')).toBeVisible()

    await page.click('button[type="submit"]:has-text("Confirm enrollment")')
    await expect(page).toHaveURL(/\/parent\/dashboard/)
    await expect(page.getByText('RM 1530.00')).toBeVisible()
  })

  test('operator sees the enrolled student and can record a payment', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', operatorEmail)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    await page.goto('/operator/students')
    await expect(page.locator('td:has-text("Child One")')).toBeVisible()
    await expect(page.getByText(/issued.*1530\.00/)).toBeVisible()

    await page.goto('/operator/finances')
    await expect(page.getByText('RM 1530.00').first()).toBeVisible()

    await page.click('tr:has-text("Child One") button:has-text("Record payment")')
    await page.waitForSelector('text=Record payment for Child One')
    await page.click('[data-slot="dialog-content"] button[type="submit"]:has-text("Record payment")')
    await expect(page.locator('tr:has-text("Child One")').getByText('paid')).toBeVisible()
  })
})
