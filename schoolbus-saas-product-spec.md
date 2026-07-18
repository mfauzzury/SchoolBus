# SchoolBus SaaS — Product Specification

> A multi-tenant platform where school bus operators manage their fleet, staff, students, and fee collection in one place — and parents self-serve registration and payments.

---

## 1. Tenant Model

Each **Bus Operator** is a tenant. They sign up, get their own workspace, and manage everything under their account. This is the paying customer.

---

## 2. Core Entities & Relationships

### 2.1 Bus Operator (Tenant)

The top-level account that owns everything below.

- Company name
- Contact person & phone
- Email
- Bank / payment details
- Company logo
- Subscription plan (SaaS billing)

### 2.2 Fleet (Buses)

- Plate number
- Capacity (seats)
- Status: Active / Maintenance / Retired
- Assigned route

### 2.3 Routes

Routes tie everything together — they connect buses, staff, students, and pricing.

- Route name
- Zone / area
- List of stops (ordered, with names)
- School destination
- Assigned bus
- Assigned driver
- Assigned conductor

### 2.4 Staff (Drivers & Conductors)

Stored as a single entity with a role field rather than two separate modules.

- Full name
- IC / license number
- Phone number
- Role: Driver / Conductor
- License expiry date (drivers)
- Assigned route
- Status: Active / Inactive

### 2.5 Parents

Parents self-register and manage their own accounts.

- Full name
- IC number
- Phone number
- Email
- Address
- Number of registered children (derived)

### 2.6 Students

Each student is linked to a parent and enrolled on a route with a selected package.

- Full name
- Date of birth
- School name
- Parent (FK)
- Assigned route (FK)
- Pickup stop
- Package type (one-way / return)
- Billing period (monthly / quarterly / half-year / yearly)
- Enrollment status: Active / Suspended / Withdrawn

---

## 3. Fee & Package Configuration

### 3.1 Packages

Defines what service the student receives.

| Package    | Description              |
| ---------- | ------------------------ |
| One-Way    | Morning only OR afternoon only |
| Return     | Both ways (morning + afternoon) |

### 3.2 Billing Periods & Discounts

Defines how long the parent is paying for, each with a configurable discount rate.

| Billing Period | Duration   | Default Discount |
| -------------- | ---------- | ---------------- |
| Monthly        | 1 month    | 0%               |
| Quarterly      | 3 months   | 5%               |
| Half-Year      | 6 months   | 10%              |
| Yearly         | 12 months  | 15%              |

Discount rates are fully configurable by the operator.

### 3.3 Rate Card

The operator sets a **base monthly fee per route** (or per zone). The system calculates the final amount:

```
Final Amount = Base Monthly Fee × Number of Months × (1 - Discount Rate)
```

**Example:**
Route A, Return package, base fee = RM 150/month, parent chooses Yearly billing:

```
RM 150 × 12 × (1 - 0.15) = RM 1,530 (saves RM 270)
```

### 3.4 Sibling Discount (Optional)

A flat percentage off for the 2nd, 3rd, and subsequent children from the same parent.

| Child    | Discount |
| -------- | -------- |
| 1st      | 0%       |
| 2nd      | 10%      |
| 3rd+     | 15%      |

---

## 4. Payment & Simple Accounting

### 4.1 Invoices

Auto-generated based on student enrollment and billing period.

**Invoice Status Flow:**

```
Draft → Issued → Paid
                → Overdue
```

Invoice contains: student name, route, package, billing period, amount before discount, discount applied, final amount, due date.

### 4.2 Payment Recording

Payment is recorded when the operator (or parent via online payment) marks an invoice as paid.

- Payment method: Cash / Bank Transfer / FPX / Online
- Reference number
- Payment date
- Amount paid
- Receipt auto-generated

### 4.3 Operator Dashboard (Simple Accounting)

The operator sees a transaction ledger with summary cards:

| Metric                        | Description                        |
| ----------------------------- | ---------------------------------- |
| Total Expected (This Month)   | Sum of all issued invoices         |
| Total Collected               | Sum of all paid invoices           |
| Total Outstanding             | Expected minus collected           |
| Overdue Count                 | Invoices past due date             |

**Filters:** by route, by month, by payment status, by date range.

**Export:** CSV download for handoff to an external accountant.

---

## 5. User Roles & Access

| Role             | Access                                                        |
| ---------------- | ------------------------------------------------------------- |
| Operator Admin   | Full access — config, fleet, staff, students, finances        |
| Operator Staff   | View routes, students, attendance (future)                    |
| Parent           | Register children, choose route/package/period, view & pay invoices |

---

## 6. Key User Flows

### 6.1 Operator Onboarding

1. Operator signs up (company name, email, password)
2. Complete profile (contact, bank details, logo)
3. Create routes and stops
4. Add buses and assign to routes
5. Add drivers/conductors and assign to routes
6. Configure rate card (base fees per route)
7. Configure discount rates (billing periods + sibling)
8. Share registration link with parents

### 6.2 Parent Registration & Enrollment

1. Parent opens registration link
2. Creates account (name, phone, email, IC)
3. Adds child(ren) — name, school, DOB
4. For each child: selects route → pickup stop → package → billing period
5. System calculates fee (with discounts applied)
6. Parent confirms enrollment
7. Invoice is generated

### 6.3 Payment Flow

1. Invoice auto-generated on enrollment or at start of billing cycle
2. Parent views invoice in their dashboard
3. Parent pays (bank transfer / FPX / cash to operator)
4. Operator records payment OR system confirms online payment
5. Receipt generated
6. Transaction appears in operator's ledger

---

## 7. Tech Stack

### 7.1 Architecture: API-First

The backend is a standalone API. The frontend is a standalone SPA. This separation ensures any future client (mobile app, third-party integration) can consume the same API without backend changes.

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  React SPA      │     │  Mobile App     │     │  3rd Party      │
│  (Vite)         │     │  (Future)       │     │  (Future)       │
└────────┬────────┘     └────────┬────────┘     └────────┬────────┘
         │                       │                       │
         └───────────┬───────────┴───────────┬───────────┘
                     │                       │
              ┌──────▼───────────────────────▼──────┐
              │       Laravel API (Sanctum)          │
              │       JSON endpoints only            │
              └──────────────┬──────────────────────┘
                             │
              ┌──────────────▼──────────────────────┐
              │       PostgreSQL (single DB,         │
              │       tenant_id scoping)             │
              └─────────────────────────────────────┘
```

### 7.2 Backend — Laravel (PHP)

| Component            | Tool / Package                  | Purpose                                      |
| -------------------- | ------------------------------- | -------------------------------------------- |
| Framework            | Laravel 11+                     | API routing, queues, mail, file storage       |
| Authentication       | Laravel Sanctum                 | SPA cookie auth (web) + bearer tokens (mobile)|
| Authorization        | Spatie Laravel-Permission       | Role & permission management (3 roles)        |
| Multi-Tenancy        | Single DB + `tenant_id` column  | Global scopes auto-filter all tenant queries  |
| Queue Jobs           | Laravel Queues (database driver)| Invoice generation, email notifications       |
| File Storage         | Laravel Filesystem (S3 driver)  | Receipts, invoices, logos                     |
| PDF Generation       | DomPDF or Laravel Snappy        | Invoice & receipt PDF export                  |
| CSV Export           | Laravel Excel (Maatwebsite)     | Transaction ledger export                     |

### 7.3 Frontend — React SPA

| Component            | Tool / Library                  | Purpose                                      |
| -------------------- | ------------------------------- | -------------------------------------------- |
| Build Tool           | Vite                            | Fast dev server and production builds         |
| UI Components        | shadcn/ui + Tailwind CSS        | Consistent, customizable component library    |
| Routing              | React Router                    | Client-side navigation                        |
| API Client           | Axios                           | HTTP requests to Laravel API                  |
| State Management     | TanStack Query (React Query)    | Server state caching, loading/error states    |
| Forms                | React Hook Form + Zod           | Form handling with schema validation          |

### 7.4 Database — PostgreSQL

Single database with `tenant_id` on all operator-owned tables. Benefits:

- Simple to manage and deploy
- Cross-tenant queries available for SaaS-level analytics
- JSON columns for flexible config (rate cards, discount rules)
- Can migrate to database-per-tenant later if needed

### 7.5 Infrastructure

| Component            | Tool                            | Notes                                        |
| -------------------- | ------------------------------- | -------------------------------------------- |
| Hosting              | VPS (Coolify)                   | Existing setup, familiar tooling             |
| Object Storage       | Cloudflare R2 or MinIO          | S3-compatible, for files and PDFs            |
| Email                | SMTP (existing provider)        | Invoice notifications, registration emails   |
| Domain & CDN         | Cloudflare                      | DNS, SSL, caching for frontend assets        |

### 7.6 Project Structure (Monorepo)

```
schoolbus/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Models/             # Operator, Bus, Route, Staff, Parent, Student, Invoice, Payment
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   └── Api/
│   │   │   │       ├── Operator/   # Fleet, routes, staff, config, dashboard
│   │   │   │       └── Parent/     # Registration, enrollment, invoices
│   │   │   ├── Middleware/
│   │   │   │   └── EnsureTenant.php
│   │   │   └── Resources/         # API response transformers
│   │   ├── Services/
│   │   │   ├── FeeCalculator.php
│   │   │   └── InvoiceGenerator.php
│   │   └── Enums/
│   │       ├── PackageType.php         # OneWay, Return
│   │       ├── BillingPeriod.php       # Monthly, Quarterly, HalfYear, Yearly
│   │       └── InvoiceStatus.php       # Draft, Issued, Paid, Overdue
│   ├── database/
│   │   └── migrations/
│   ├── routes/
│   │   └── api.php
│   └── tests/
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── pages/
│   │   │   ├── operator/       # Dashboard, fleet, routes, staff, finances
│   │   │   └── parent/         # Register, enroll, invoices, payments
│   │   ├── components/         # Shared UI (tables, modals, forms)
│   │   ├── hooks/              # Custom hooks (useAuth, useTenant)
│   │   ├── api/                # Axios client and endpoint definitions
│   │   └── layouts/
│   └── ...
│
└── mobile/                     # (Future) React Native
    └── ...
```

### 7.7 Mobile Roadmap

When ready for mobile, the Laravel API is already built. Two options:

| Option         | Language   | Code Sharing with Web | Best For                         |
| -------------- | ---------- | --------------------- | -------------------------------- |
| React Native   | JavaScript | High (shared logic)   | Teams already using React        |
| Flutter         | Dart       | None                  | Best native feel, single codebase|

**Recommended:** React Native — reuses React knowledge and can share API client, validation schemas, and business logic with the web frontend.

---

## 8. MVP Scope (v1)

### In Scope

1. Operator onboarding & workspace setup
2. Route, bus, and staff management (CRUD)
3. Parent self-registration + student enrollment
4. Package and billing period selection
5. Rate card & discount configuration
6. Invoice generation & payment recording
7. Operator transaction dashboard with filters
8. CSV export of transactions
9. Responsive web app (mobile-friendly)

### Out of Scope (v2+)

- GPS / live bus tracking
- Student attendance tracking
- Push notifications / SMS alerts
- In-app chat (parent ↔ operator)
- Native mobile app (iOS / Android)
- Online payment gateway integration (FPX, Stripe)
- Automated invoice reminders
- Multi-school support per operator
- Reporting & analytics dashboard

---

## 9. SaaS Revenue Model

Charge the bus operator, not the parent.

| Model              | Description                              | Pros                              |
| ------------------ | ---------------------------------------- | --------------------------------- |
| Per-Student/Month  | RM 2–5 per active student per month      | Scales with operator's business   |
| Flat Monthly Fee   | Tiered by fleet size or student count    | Predictable for operator          |
| Freemium           | Free up to 30 students, paid after       | Low barrier to entry              |

**Recommended for launch:** Per-student pricing with a free tier (up to 30 students) to drive adoption.

---

## 10. Glossary

| Term            | Definition                                                    |
| --------------- | ------------------------------------------------------------- |
| Tenant          | A bus operator account — the top-level entity in the system   |
| Route           | A defined path with ordered stops, linking a bus + staff to students |
| Package         | The service type a student is enrolled in (one-way or return) |
| Billing Period  | The duration a parent pays for (monthly, quarterly, half-year, yearly) |
| Rate Card       | The operator's configured base fees per route                 |
| Invoice         | A generated bill for a student's enrollment in a billing period |
| Ledger          | The operator's list of all payment transactions               |
