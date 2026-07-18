import type { Page } from '@playwright/test'

/** Unique-ish suffix so repeated runs against the same dev DB don't collide. */
export function unique(): string {
  return `${Date.now()}${Math.floor(Math.random() * 1000)}`
}

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login')
  await page.fill('#email', email)
  await page.fill('#password', password)
  await page.click('button[type="submit"]')
}
