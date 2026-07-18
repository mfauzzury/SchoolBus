import { execSync } from 'node:child_process'

/**
 * Resets the dev Postgres DB to a clean seeded state before the e2e run.
 * Tests still use unique emails/company names per spec so they don't
 * collide with each other or with the seeded demo tenant across runs.
 */
export default function globalSetup() {
  execSync('php artisan migrate:fresh --seed', {
    cwd: '../backend',
    stdio: 'inherit',
  })
}
