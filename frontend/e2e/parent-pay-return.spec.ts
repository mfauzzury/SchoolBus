import { test, expect, type Page } from '@playwright/test'

/**
 * The page Billplz sends a parent back to after paying. The API is mocked so
 * each outcome (paid, not paid, still waiting) can be shown on demand without
 * a real Billplz account.
 */

const ATTEMPT_ID = 7
const BILL_URL = 'https://www.billplz-sandbox.com/bills/bill_xyz'

const parentMe = {
  user: { id: 1, name: 'Pay Parent', email: 'pay.parent@test.com', tenant_id: 1 },
  tenant: null,
  parentProfile: null,
  roles: ['parent'],
}

const paidAttempt = {
  id: ATTEMPT_ID,
  status: 'paid',
  amount: '150.00',
  paid_at: '2026-10-11T08:00:00Z',
  bill_url: null,
  receipts: [
    { payment_id: 55, receipt_number: 'R-000055', amount: '150.00', student_name: 'Aiman Hakim' },
  ],
}

const pendingAttempt = {
  id: ATTEMPT_ID,
  status: 'pending',
  amount: '150.00',
  paid_at: null,
  bill_url: BILL_URL,
  receipts: [],
}

interface Mock {
  /** What GET /payments/:id (our own record) answers. */
  attempt: object
  /** What POST /payments/:id/confirm (the signed redirect) answers. */
  confirm?: object
}

async function mockApi(page: Page, { attempt, confirm }: Mock) {
  // Only the backend's /api/* — a glob would also catch the app's own src/api/*.ts modules.
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
    if (pathname === '/api/me') return reply(parentMe)
    if (pathname === `/api/parent/payments/${ATTEMPT_ID}/confirm`) return reply(confirm ?? attempt)
    if (pathname === `/api/parent/payments/${ATTEMPT_ID}`) return reply(attempt)
    return reply([])
  })
}

const returnPath = `/parent/invoices/pay/return/${ATTEMPT_ID}`
const signed = (paid: 'true' | 'false') =>
  `${returnPath}?billplz[id]=bill_xyz&billplz[paid]=${paid}&billplz[paid_at]=2026-10-11T08:00:00Z&billplz[x_signature]=abc`

test.describe('Payment result page', () => {
  test('shows success, the amount, and a receipt to download', async ({ page }) => {
    await mockApi(page, { attempt: pendingAttempt, confirm: paidAttempt })
    await page.goto(signed('true'))

    await expect(page.getByText('Payment successful')).toBeVisible()
    await expect(page.getByText(/RM 150\.00 has been received/)).toBeVisible()
    await expect(page.getByText('Aiman Hakim')).toBeVisible()
    await expect(page.getByText(/R-000055/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Download receipt' })).toHaveAttribute(
      'href',
      /\/api\/parent\/payments\/55\/receipt$/,
    )
    await expect(page.getByRole('link', { name: 'Back to invoices' })).toBeVisible()
  })

  test('shows success from our own record when there is no redirect result', async ({ page }) => {
    await mockApi(page, { attempt: paidAttempt })
    await page.goto(returnPath)

    await expect(page.getByText('Payment successful')).toBeVisible()
    await expect(page.getByRole('link', { name: 'Download receipt' })).toBeVisible()
  })

  test('says the payment did not go through and offers to try again', async ({ page }) => {
    await mockApi(page, { attempt: pendingAttempt })
    await page.goto(signed('false'))

    await expect(page.getByText('Payment not completed')).toBeVisible()
    await expect(page.getByText(/you haven't been charged/)).toBeVisible()
    await expect(page.getByRole('link', { name: 'Try again' })).toHaveAttribute('href', BILL_URL)
    await expect(page.getByRole('link', { name: 'Download receipt' })).toHaveCount(0)
  })

  test('keeps checking, then says it is still waiting after 30 seconds', async ({ page }) => {
    await page.clock.install()
    await mockApi(page, { attempt: pendingAttempt })
    await page.goto(returnPath)

    await expect(page.getByText('Confirming your payment…')).toBeVisible()

    await page.clock.fastForward(31_000)
    await expect(page.getByText('Still waiting for confirmation')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Check again' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Back to invoices' })).toBeVisible()
  })
})
