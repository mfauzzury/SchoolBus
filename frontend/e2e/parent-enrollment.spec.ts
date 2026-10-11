import { test, expect } from '@playwright/test'
import { loginAs, unique, verifyEmailViaUi } from './helpers'

/**
 * The full golden path: operator sets up a route with a rate card, a parent
 * registers and submits an application, the operator approves it onto the
 * route (which generates the first monthly invoice), the parent sees that
 * invoice, and the operator records the payment.
 */
test.describe.serial('Parent enrollment golden path', () => {
  const suffix = unique()
  const operatorEmail = `enroll-operator-${suffix}@test.com`
  const parentEmail = `enroll-parent-${suffix}@test.com`
  let operatorCode = ''

  test('operator signs up and creates a route with a rate card', async ({ page }) => {
    await page.goto('/signup')
    await verifyEmailViaUi(page, operatorEmail)
    await page.fill('#company_name', `Enroll Bus Co ${suffix}`)
    await page.click('button:has-text("Next")')
    await page.fill('#contact_person', 'Operator')
    await page.fill('#contact_phone', '0123456789')
    await page.click('button:has-text("Next")')
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]:has-text("Start free")')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    operatorCode = (await page.locator('span.tracking-\\[0\\.3em\\]').textContent())?.trim() ?? ''
    expect(operatorCode).toMatch(/^\d{5}$/)

    // Routes are in the sidebar; adding one is a step-by-step page.
    await page.click('a:has-text("Routes")')
    await page.click('a:has-text("Add route")')
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

  test('parent registers via the operator code and submits an application', async ({ page }) => {
    await page.goto(`/register/${operatorCode}`)
    await verifyEmailViaUi(page, parentEmail)
    await page.fill('#full_name', 'Enroll Parent')
    await page.fill('#ic_number', '900101-01-1111')
    await page.click('button:has-text("Next")')
    await page.fill('#phone', '0123456789')
    await page.click('button:has-text("Next")')
    await page.click('button:has-text("Next")') // emergency contact is optional
    await page.fill('#password', 'password123')
    await page.click('button[type="submit"]:has-text("Register")')
    await expect(page).toHaveURL(/\/parent\/dashboard/)

    await page.click('a:has-text("Enroll a child")')
    await page.fill('#full_name', 'Child One')
    await page.fill('#date_of_birth', '2015-01-01')
    await page.fill('#school_name', 'SK Demo')
    await page.click('button[type="submit"]:has-text("Submit application")')
    await expect(page.getByText('Application submitted')).toBeVisible()
  })

  test('operator approves the application onto a route', async ({ page }) => {
    await loginAs(page, operatorEmail, 'password123')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    await page.click('a:has-text("Applications")')
    await page.click('tr:has-text("Child One") a:has-text("Review")')

    await page.click('[data-slot="select-trigger"] >> nth=0')
    await page.click('[data-slot="select-item"]:has-text("Route A")')
    await page.click('button:has-text("Approve") >> nth=-1')
    await expect(page).toHaveURL(/\/operator\/applications$/)
    // The list defaults to the pending filter, so the approved application leaves it.
    await expect(page.getByText('No applications yet.')).toBeVisible()
  })

  test('parent sees the first monthly invoice (RM 150.00)', async ({ page }) => {
    await loginAs(page, parentEmail, 'password123')
    await expect(page).toHaveURL(/\/parent\/dashboard/)
    await expect(page.getByText('RM 150.00').first()).toBeVisible()
  })

  test('operator opens the student, then the bill, and records a payment', async ({ page }) => {
    await loginAs(page, operatorEmail, 'password123')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    await page.goto('/operator/students')
    await expect(page.locator('tr:has-text("Child One")')).toContainText('RM 150.00')

    // The student page holds their details, the parent and their bills.
    await page.click('tr:has-text("Child One") a:has-text("View")')
    await expect(page).toHaveURL(/\/operator\/students\/\d+$/)
    await expect(page.getByRole('heading', { name: 'Child One' })).toBeVisible()
    await expect(page.getByText('Parent / guardian')).toBeVisible()
    // The recurring bill card (on the Bills tab) says in plain words what happens next.
    await page.click('button[role="tab"]:has-text("Bills")')
    await expect(page.getByText('Next bill', { exact: true })).toBeVisible()
    await expect(page.getByText('RM 150.00').first()).toBeVisible()

    // Stop billing after this month (billing started this month, so this is the earliest valid stop):
    // the card says billing has ended. Then clear it again.
    const now = new Date()
    const thisMonth = now.toLocaleString('en', { month: 'long' })
    await page.click('[aria-label="Stop billing after: Month"]')
    await page.click(`[data-slot="select-item"]:has-text("${thisMonth}")`)
    await page.click('button[type="submit"]:has-text("Save changes")')
    await expect(page.getByText(`Billing ended after ${thisMonth} ${now.getFullYear()}`)).toBeVisible()
    await page.click('[aria-label="Stop billing after: Month"]')
    await page.click('[data-slot="select-item"]:has-text("Not set")')
    await page.click('button[type="submit"]:has-text("Save changes")')
    await expect(page.getByText('Next bill', { exact: true })).toBeVisible()
    await expect(page.getByText('Billing ended after')).toHaveCount(0)

    await expect(page.locator('tr:has-text("RM 150.00")').first()).toBeVisible()

    // The bill is its own page; paying it happens there, not in a dialog.
    await page.click('tr:has-text("RM 150.00") a:has-text("Open")')
    await expect(page).toHaveURL(/\/operator\/finances\/bills\/\d+$/)
    await expect(page.locator('[data-slot="dialog-content"]')).toHaveCount(0)
    await page.click('button[type="submit"]:has-text("Record payment")')
    // The payment now has its own receipt, and clicking it really downloads a PDF.
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByText('Download receipt').click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^receipt-R-\d{6}\.pdf$/)

    // Coming back from a bill lands on the student's Bills tab.
    await page.click('a:has-text("Back to Child One")')
    await expect(page.locator('tr:has-text("RM 150.00")').first()).toContainText('Paid')

    await page.click('button[role="tab"]:has-text("Transactions")')
    await expect(page.locator('tr:has-text("Cash")')).toContainText('RM 150.00')
  })

  test('the payment shows under Transactions and nothing is left outstanding', async ({ page }) => {
    await loginAs(page, operatorEmail, 'password123')
    await expect(page).toHaveURL(/\/operator\/dashboard/)
    await page.goto('/operator/finances')

    await page.click('button[role="tab"]:has-text("Transactions")')
    await expect(page.locator('tr:has-text("Child One")')).toContainText('RM 150.00')
    await expect(page.getByText('Total received')).toBeVisible()

    await page.click('button[role="tab"]:has-text("Outstanding")')
    await expect(page.getByText('Nobody owes anything. All bills are paid.')).toBeVisible()
  })

  test('operator raises a bill by hand, discounts it, then cancels it', async ({ page }) => {
    await loginAs(page, operatorEmail, 'password123')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    await page.goto('/operator/students')
    await page.click('tr:has-text("Child One") a:has-text("View")')

    // This month is already billed, so bill the same month next year.
    await page.click('button[role="tab"]:has-text("Bills")')
    await page.click('button:has-text("Create bill")')
    const form = page.locator('form:has-text("Bills are created automatically")')
    await form.locator('[data-slot="select-trigger"] >> nth=1').click()
    await page.click(`[data-slot="select-item"]:has-text("${new Date().getFullYear() + 1}")`)
    await form.locator('button[type="submit"]:has-text("Create bill")').click()

    // Lands on the new bill's page.
    await expect(page).toHaveURL(/\/operator\/finances\/bills\/\d+$/)
    await expect(page.getByText('RM 150.00').first()).toBeVisible()

    // A one-off discount is its own line on the bill and lowers the total.
    await page.fill('#adjustment_amount', '20')
    await page.fill('#adjustment_reason', 'Goodwill discount')
    await page.click('button[type="submit"]:has-text("Add adjustment")')
    await expect(page.getByText('Goodwill discount').first()).toBeVisible()
    await expect(page.getByText('RM 130.00').first()).toBeVisible()

    // Cancelling keeps the bill on record, marked cancelled.
    await page.click('button:has-text("Cancel bill") >> nth=0')
    await page.fill('#cancel_reason', 'Raised by mistake')
    await page.click('button:has-text("Confirm cancellation")')
    await expect(page.getByText('Cancelled: Raised by mistake')).toBeVisible()

    // Back on the student page: the cancelled bill is listed but not counted.
    await page.click('a:has-text("Back to Child One")')
    await expect(page.locator('tr:has-text("Cancelled")')).toHaveCount(1)
  })
})
