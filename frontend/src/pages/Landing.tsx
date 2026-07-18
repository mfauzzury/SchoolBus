import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bus,
  CreditCard,
  MapPinned,
  Users,
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useMe } from '@/hooks/useAuth'
import { useTenantByCode } from '@/hooks/useRegistration'
import { cn } from '@/lib/utils'

const features = [
  {
    icon: MapPinned,
    title: 'Fleet & routes',
    description: 'Manage buses, drivers, conductors, stops, and rate cards in one place.',
  },
  {
    icon: CreditCard,
    title: 'Automated invoicing',
    description: 'Billing-period and sibling discounts calculated and applied automatically.',
  },
  {
    icon: Users,
    title: 'Parent self-service',
    description: 'Parents register, enroll their children, and see fees before they confirm.',
  },
  {
    icon: Bus,
    title: 'Live collections ledger',
    description: 'Track what’s expected, collected, and overdue — export to CSV anytime.',
  },
]

function LoggedInHero({ dashboardPath }: { dashboardPath: string }) {
  return (
    <section className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-3xl font-medium">Welcome back</h1>
      <p className="max-w-md text-muted-foreground">
        Pick up right where you left off.
      </p>
      <Link to={dashboardPath} className={buttonVariants({ size: 'lg' })}>
        Go to your dashboard
        <ArrowRight />
      </Link>
    </section>
  )
}

function ParentAccessCard() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const { data: tenant, isFetching, isError } = useTenantByCode(code)
  const resolved = code.length === 4 && !isFetching && !isError && tenant

  const onContinue = () => {
    if (resolved) navigate(`/register/${code}`)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Users className="size-5" />
        </div>
        <CardTitle className="mt-3 text-lg">I&apos;m a parent</CardTitle>
        <p className="text-sm text-muted-foreground">
          Enter your bus operator&apos;s 4-digit ID to register or sign in.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <InputOTP
          maxLength={4}
          value={code}
          onChange={setCode}
          inputMode="numeric"
          onComplete={() => {
            /* validation runs via useTenantByCode; user confirms with Continue */
          }}
        >
          <InputOTPGroup className="mx-auto gap-2">
            {[0, 1, 2, 3].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="size-12 rounded-lg border-l text-lg"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <div className="flex min-h-5 items-center justify-center gap-1.5 text-sm">
          {code.length === 4 && isFetching && (
            <span className="text-muted-foreground">Checking…</span>
          )}
          {code.length === 4 && !isFetching && isError && (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="size-4" /> No operator found with that ID
            </span>
          )}
          {resolved && (
            <span className="flex items-center gap-1 text-foreground">
              <CheckCircle2 className="size-4 text-primary" />
              <span className="font-medium">{tenant.company_name}</span>
            </span>
          )}
        </div>

        <div className="mt-auto flex flex-col gap-2 pt-2">
          <Button disabled={!resolved} onClick={onContinue}>
            Continue
            <ArrowRight />
          </Button>
          <Link
            to="/login"
            className="text-center text-sm text-muted-foreground hover:text-foreground"
          >
            Already registered? Log in
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function OperatorAccessCard() {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bus className="size-5" />
        </div>
        <CardTitle className="mt-3 text-lg">I&apos;m an operator</CardTitle>
        <p className="text-sm text-muted-foreground">
          Manage your fleet, routes, staff, and collections from one dashboard.
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-3">
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-primary" /> Free up to 30 students
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-primary" /> No setup fees
          </li>
        </ul>
        <Link to="/signup" className={buttonVariants({ className: 'w-full' })}>
          Start free
          <ArrowRight />
        </Link>
        <Link
          to="/login"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          Already have a workspace? Log in
        </Link>
      </CardContent>
    </Card>
  )
}

export function Landing() {
  const { data: me, isLoading: meLoading } = useMe()
  const dashboardPath = me?.roles.includes('parent') ? '/parent/dashboard' : '/operator/dashboard'

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-medium">BasSekolah.my</span>
          {!meLoading && !me && (
            <Link to="/login" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Log in
            </Link>
          )}
          {!meLoading && me && (
            <Link to={dashboardPath} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
              Dashboard
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {!meLoading && me ? (
          <LoggedInHero dashboardPath={dashboardPath} />
        ) : (
          <>
            <section className="flex flex-col items-center gap-5 py-20 text-center">
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                For school bus operators &amp; parents
              </span>
              <h1 className="max-w-2xl text-4xl font-medium text-balance sm:text-5xl">
                Fleet management and fee collection, without the spreadsheets
              </h1>
              <p className="max-w-xl text-balance text-muted-foreground">
                Operators run routes, staff, and billing in one workspace. Parents register
                their children and pay online in minutes.
              </p>
            </section>

            <section className="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="flex flex-col gap-2 rounded-xl border p-4">
                  <feature.icon className="size-5 text-primary" />
                  <p className="font-medium">{feature.title}</p>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </section>

            <section id="get-started" className="pb-24">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-medium">Get started</h2>
                <p className="mt-1 text-muted-foreground">Pick the option that's you.</p>
              </div>
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                <OperatorAccessCard />
                <ParentAccessCard />
              </div>
            </section>
          </>
        )}
      </main>

      <footer className={cn('border-t py-6', meLoading || me ? 'mt-0' : '')}>
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted-foreground">
          BasSekolah.my
        </div>
      </footer>
    </div>
  )
}
