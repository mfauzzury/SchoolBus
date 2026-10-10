import { test, expect, type Page } from '@playwright/test'

/**
 * A parent opens a child from the dashboard and keeps their details up to
 * date. The API is mocked, so this checks the screens and exactly what is
 * sent, without needing a seeded database.
 */

const me = {
  user: { id: 1, name: 'Mariam', email: 'mariam@test.com', tenant_id: 1 },
  tenant: {
    id: 1,
    company_name: 'Bas Sekolah Maju',
    operator_code: '10001',
    contact_person: 'Op',
    contact_phone: '0123456789',
    email: 'op@test.com',
    subscription_plan: 'free',
    bank_details: null,
    logo_path: null,
    logo_url: null,
  },
  parentProfile: null,
  roles: ['parent'],
}

function student(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    full_name: 'Aiman Hakim',
    date_of_birth: '2017-03-14',
    gender: null,
    avatar_url: null,
    school_name: 'SK Bukit Jaya',
    teacher_name: null,
    class_name: null,
    school_phone: null,
    route_id: null,
    pickup_stop_id: null,
    package_type: 'return',
    enrollment_status: 'active',
    route: null,
    pickup_stop: null,
    invoices: [],
    ...overrides,
  }
}

async function mockApi(page: Page, sent: { body?: Record<string, unknown> }) {
  let current = student()

  await page.route((url) => url.pathname.startsWith('/api/'), async (route) => {
    const request = route.request()
    const { pathname } = new URL(request.url())
    const headers = {
      'access-control-allow-origin': request.headers()['origin'] ?? 'http://localhost:5173',
      'access-control-allow-credentials': 'true',
      'access-control-allow-headers': '*',
      'access-control-allow-methods': '*',
    }
    const reply = (body: unknown) =>
      route.fulfill({ status: 200, headers, contentType: 'application/json', body: JSON.stringify(body) })

    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers })
    if (pathname === '/api/me') return reply(me)
    if (pathname === '/api/parent/students' && request.method() === 'GET') return reply([current])
    if (pathname === '/api/parent/students/1' && request.method() === 'PUT') {
      sent.body = request.postDataJSON()
      current = student(sent.body)
      return reply(current)
    }
    return reply([])
  })
}

test.describe('Child profile (parent)', () => {
  test('open a child from the dashboard, edit the details, save, and go back', async ({ page }) => {
    const sent: { body?: Record<string, unknown> } = {}
    await mockApi(page, sent)

    await page.goto('/parent/dashboard')
    await page.getByRole('link', { name: 'Aiman Hakim' }).click()
    await expect(page).toHaveURL(/\/parent\/children\/1$/)

    await expect(page.locator('#full_name')).toHaveValue('Aiman Hakim')
    await expect(page.locator('#date_of_birth')).toHaveValue('2017-03-14')
    await expect(page.getByText(/years old/)).toBeVisible()
    // Nothing to save until something changes.
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled()

    await page.fill('#full_name', 'Aiman Hakim Bin Ali')
    await page.getByText('Boy').click()
    await page.fill('#teacher_name', 'Cikgu Aminah')
    await page.fill('#class_name', '3 Bestari')
    await page.fill('#school_phone', '03-1234 5678')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Saved.')).toBeVisible()
    expect(sent.body).toMatchObject({
      full_name: 'Aiman Hakim Bin Ali',
      date_of_birth: '2017-03-14',
      gender: 'male',
      teacher_name: 'Cikgu Aminah',
      class_name: '3 Bestari',
      school_phone: '03-1234 5678',
    })

    await page.getByRole('link', { name: 'Back to dashboard' }).click()
    await expect(page).toHaveURL(/\/parent\/dashboard$/)
    await expect(page.getByRole('link', { name: 'Aiman Hakim Bin Ali' })).toBeVisible()
  })

  test('clearing the optional school details sends nulls', async ({ page }) => {
    const sent: { body?: Record<string, unknown> } = {}
    await mockApi(page, sent)

    await page.goto('/parent/children/1')
    await page.fill('#teacher_name', 'Cikgu Aminah')
    await page.fill('#teacher_name', '')
    await page.fill('#full_name', 'Aiman')
    await page.getByRole('button', { name: 'Save' }).click()

    await expect(page.getByText('Saved.')).toBeVisible()
    expect(sent.body).toMatchObject({ full_name: 'Aiman', teacher_name: null, class_name: null, school_phone: null })
  })

  test('a child that is not theirs shows a friendly message and a way back', async ({ page }) => {
    await mockApi(page, {})
    await page.goto('/parent/children/999')

    await expect(page.getByText("We couldn't find this child.")).toBeVisible()
    await page.getByRole('link', { name: 'Back to dashboard' }).click()
    await expect(page).toHaveURL(/\/parent\/dashboard$/)
  })

  test.describe('on a phone', () => {
    test.use({ viewport: { width: 375, height: 812 } })

    test('the page fits the screen with no sideways scrolling', async ({ page }) => {
      await mockApi(page, {})
      await page.goto('/parent/children/1')
      await expect(page.locator('#full_name')).toBeVisible()

      const overflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        clientWidth: document.documentElement.clientWidth,
      }))
      expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1)
    })
  })
})
