import { test, expect } from '@playwright/test'
import { unique, verifyEmailViaUi } from './helpers'

test.describe.serial('Operator workflow', () => {
  const suffix = unique()
  const email = `operator-${suffix}@test.com`
  const companyName = `E2E Bus Co ${suffix}`

  test('sign up creates a workspace and shows an operator ID', async ({ page }) => {
    await page.goto('/signup')
    await verifyEmailViaUi(page, email)
    await page.fill('#company_name', companyName)
    await page.click('button:has-text("Next")')
    await page.fill('#contact_person', 'E2E Operator')
    await page.fill('#contact_phone', '0123456789')
    await page.click('button:has-text("Next")')
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]:has-text("Start free")')

    await expect(page).toHaveURL(/\/operator\/dashboard/)
    await expect(page.getByText('Your Operator ID')).toBeVisible()
    await expect(page.getByTestId('registration-link')).toHaveText(/\/register\/\d{5}$/)
  })

  test('can create a bus, staff member, and route with stops', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    // Fleet pages (buses, staff, routes) are in the sidebar under "Fleet management"

    // Bus
    await page.click('a:has-text("Buses")')
    await page.click('button:has-text("Add bus")')
    await page.fill('#plate_number', 'WXX1234')
    await page.fill('#capacity', '40')
    await page.click('button[type="submit"]:has-text("Save")')
    await expect(page.locator('td:has-text("WXX1234")')).toBeVisible()

    // Staff
    await page.click('a:has-text("Staff")')
    await page.click('button:has-text("Add staff")')
    await page.fill('#full_name', 'Ali Driver')
    await page.fill('#ic_number', '900101-01-1234')
    await page.fill('#phone', '0123456789')
    await page.click('button[type="submit"]:has-text("Save")')
    await expect(page.locator('td:has-text("Ali Driver")')).toBeVisible()

    // Route
    await page.click('a:has-text("Routes")')
    await page.click('a:has-text("Add route")')
    await page.getByText('Morning session').click()
    await page.fill('#name', 'Route A')
    await page.click('button:has-text("Next")') // details -> stops
    await page.click('button:has-text("Add stop")')
    await page.fill('input[placeholder="Stop name"]', 'Main Stop')
    await page.click('button:has-text("Next")') // stops -> fares
    await page.fill('#base_monthly_fee', '150')
    await page.click('button:has-text("Next")') // fares -> bus & crew
    await page.click('button:has-text("Next")') // bus & crew -> review
    await page.click('button[type="submit"]:has-text("Save")')
    await expect(page.locator('td:has-text("Route A")')).toBeVisible()
  })

  test('edited bus and deleted staff member persist correctly', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', email)
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    await page.goto('/operator/buses')
    await page.click('tr:has-text("WXX1234") button:has-text("Edit")')
    await page.fill('#capacity', '45')
    await page.click('button[type="submit"]:has-text("Save")')
    await expect(page.locator('td:has-text("45")')).toBeVisible()

    await page.goto('/operator/staff')
    await page.click('tr:has-text("Ali Driver") button:has-text("Delete")')
    await page.click('button:has-text("Delete"):visible >> nth=-1')
    await expect(page.locator('td:has-text("Ali Driver")')).toHaveCount(0)
  })
})
