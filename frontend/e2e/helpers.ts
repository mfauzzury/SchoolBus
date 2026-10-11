import { existsSync, readFileSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
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

const mailLog = () => resolve(process.cwd(), '../backend/storage/logs/laravel.log')

/** How much of the mail log exists right now; pass it to readEmailedCode to skip older mail. */
export function mailLogSize(): number {
  return existsSync(mailLog()) ? statSync(mailLog()).size : 0
}

/**
 * The six-digit code emailed to this address after the log was `since` bytes
 * long. In the dev setup mail goes to the Laravel log (MAIL_MAILER=log), so the
 * test reads it from there. Only mail newer than `since` counts: the same
 * address may have been sent an earlier code (sign-up, then forgot-password),
 * and some mail is written just after the request has been answered.
 */
export async function readEmailedCode(email: string, since = 0): Promise<string> {
  for (let attempt = 0; attempt < 40; attempt++) {
    if (existsSync(mailLog())) {
      const log = readFileSync(mailLog()).subarray(since).toString('utf8')
      const at = log.toLowerCase().lastIndexOf(`to: ${email.toLowerCase()}`)
      if (at !== -1) {
        // The code sits on a line of its own in the plain-text copy of the message.
        const match = log.slice(at).match(/^[ \t]*(\d{6})[ \t]*$/m)
        if (match) return match[1]
      }
    }
    await new Promise((done) => setTimeout(done, 250))
  }

  throw new Error(`No new email code found in the log for ${email}`)
}

/** The "prove your email" first step of sign-up and forgot-password. */
export async function verifyEmailViaUi(page: Page, email: string) {
  await page.fill('#email', email)
  const before = mailLogSize()
  await page.click('button:has-text("Send code")')
  await page.fill('#email_code', await readEmailedCode(email, before))
  await page.click('button:has-text("Verify")')
}
