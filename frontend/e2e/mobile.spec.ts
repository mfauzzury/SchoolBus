import { test, expect } from '@playwright/test'

test.use({ viewport: { width: 375, height: 812 } })

async function assertNoHorizontalOverflow(page: import('@playwright/test').Page) {
  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }))
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
}

test.describe('Mobile responsiveness (375px)', () => {
  test('landing page has no horizontal overflow', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText("I'm a parent")).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('operator dashboard and nav have no horizontal overflow', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'admin@demo.test')
    await page.fill('#password', 'password')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/operator\/dashboard/)
    await assertNoHorizontalOverflow(page)

    await page.click('button[aria-label="Toggle menu"]')
    await expect(page.locator('nav:visible >> text=Finances')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })

  test('a table-heavy operator page has no horizontal overflow', async ({ page }) => {
    await page.goto('/login')
    await page.fill('#email', 'admin@demo.test')
    await page.fill('#password', 'password')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/\/operator\/dashboard/)

    await page.goto('/operator/finances')
    await expect(page.getByText('Total Expected')).toBeVisible()
    await assertNoHorizontalOverflow(page)
  })
})
