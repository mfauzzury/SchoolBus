# SchoolBus

Multi-tenant SaaS for school bus operators. See [schoolbus-saas-product-spec.md](schoolbus-saas-product-spec.md) for the full product spec.

## Local development

Requires PHP 8.3+, Composer, Node 20+, and PostgreSQL running locally.

### Backend (Laravel API — `backend/`)

```bash
cd backend
composer install
cp .env.example .env   # if not already present, then set DB_* / SANCTUM_* / FRONTEND_URL
php artisan key:generate
php artisan migrate:fresh --seed
php artisan serve       # http://localhost:8000
```

Demo login (from seeders): `admin@demo.test` / `password`

### Frontend (React SPA — `frontend/`)

```bash
cd frontend
npm install
npm run dev              # http://localhost:5173
```

### Database

```bash
/opt/homebrew/opt/postgresql@17/bin/createdb schoolbus
```

## Testing

Backend (PHPUnit, uses an in-memory SQLite DB — no setup needed):

```bash
cd backend
php artisan test
```

Frontend (Playwright end-to-end tests — starts the Vite dev server and
`php artisan serve` automatically, and resets the *dev* Postgres DB via
`migrate:fresh --seed` before running):

```bash
cd frontend
npx playwright install chromium   # first time only
npm run test:e2e
```
