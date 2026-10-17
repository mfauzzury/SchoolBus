import { expect, test } from '@playwright/test'
import { loginAs } from './helpers'

const logoSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><script>alert(1)</script><rect width="240" height="60" fill="#1e5ac8"/></svg>',
)

test.describe('Platform brand', () => {
  test('the owner sets a name, icon and logo; the site, tab and emails follow; reset brings back the default', async ({ page, browser }) => {
    await loginAs(page, 'admin@bassekolah.my', 'password')
    await page.waitForURL(/admin/)
    await page.goto('/admin/system?tab=brand')

    // A wide image is refused as the square icon.
    await page.getByTestId('icon-image-input').setInputFiles('e2e/fixtures/brand-logo.png')
    await expect(page.getByText('The icon must be square')).toBeVisible()

    await page.getByTestId('icon-image-input').setInputFiles('e2e/fixtures/brand-icon.png')
    await expect(page.getByText('Uploaded').first()).toBeVisible()
    await page.getByTestId('logo-image-input').setInputFiles('e2e/fixtures/brand-logo.png')
    await page.getByTestId('logo-svg-input').setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: logoSvg })
    await page.fill('#brand-name', 'BasKita')
    await page.getByRole('button', { name: 'Save' }).click()
    await expect(page).toHaveTitle('BasKita')

    // The public pages show the SVG logo, named for screen readers.
    const visitor = await browser.newPage()
    await visitor.goto('/')
    const headerLogo = visitor.locator('header img').first()
    await expect(headerLogo).toHaveAttribute('alt', 'BasKita')
    await expect(headerLogo).toHaveAttribute('src', /\.svg\?v=/)
    await expect(visitor.locator('link[rel="icon"]')).toHaveAttribute('href', /\/storage\/brand\/.+\.png\?v=/)

    // The script was stripped before the SVG was stored.
    const svg = await (await visitor.request.get((await headerLogo.getAttribute('src'))!)).text()
    expect(svg).not.toContain('<script')

    // Emails use the PNG (mail apps can't show SVG).
    await page.goto('/admin/messages')
    await page.getByRole('button', { name: 'Email templates' }).click()
    await expect(page.frameLocator('iframe').locator('img').first()).toHaveAttribute('src', /\.png\?v=/)

    // Back to the built-in brand.
    await page.goto('/admin/system?tab=brand')
    await page.getByRole('button', { name: 'Use BasSekolah mark' }).first().click()
    await expect(page.getByRole('button', { name: 'Use BasSekolah mark' })).toHaveCount(1)
    await page.getByRole('button', { name: 'Use BasSekolah mark' }).click()
    await expect(page.getByRole('button', { name: 'Use BasSekolah mark' })).toHaveCount(0)
    await page.fill('#brand-name', '')
    await page.getByRole('button', { name: 'Save' }).click()

    await visitor.reload()
    await expect(visitor.locator('header')).toContainText('BasSekolah.my')
    await expect(visitor.locator('header img')).toHaveCount(0)
  })
})
