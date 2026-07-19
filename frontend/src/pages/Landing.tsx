import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
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
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useMe } from '@/hooks/useAuth'
import { useTenantByCode } from '@/hooks/useRegistration'
import { cn } from '@/lib/utils'

const features = [
  { key: 'fleet', icon: MapPinned },
  { key: 'invoicing', icon: CreditCard },
  { key: 'selfService', icon: Users },
  { key: 'ledger', icon: Bus },
] as const

function LoggedInHero({ dashboardPath }: { dashboardPath: string }) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col items-center gap-6 py-24 text-center">
      <h1 className="text-3xl font-medium">{t('landing.loggedIn.welcomeBack')}</h1>
      <p className="max-w-md text-muted-foreground">
        {t('landing.loggedIn.pickUpWhereYouLeftOff')}
      </p>
      <Link to={dashboardPath} className={buttonVariants({ size: 'lg' })}>
        {t('landing.loggedIn.goToDashboard')}
        <ArrowRight />
      </Link>
    </section>
  )
}

function ParentAccessCard() {
  const { t } = useTranslation()
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
        <CardTitle className="mt-3 text-lg">{t('landing.parentCard.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('landing.parentCard.description')}</p>
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
            <span className="text-muted-foreground">{t('landing.parentCard.checking')}</span>
          )}
          {code.length === 4 && !isFetching && isError && (
            <span className="flex items-center gap-1 text-destructive">
              <XCircle className="size-4" /> {t('landing.parentCard.notFound')}
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
            {t('common.continue')}
            <ArrowRight />
          </Button>
          <Link
            to="/login"
            className="text-center text-sm text-muted-foreground hover:text-foreground"
          >
            {t('landing.parentCard.alreadyRegistered')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}

function OperatorAccessCard() {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Bus className="size-5" />
        </div>
        <CardTitle className="mt-3 text-lg">{t('landing.operatorCard.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('landing.operatorCard.description')}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-3">
        <ul className="flex flex-col gap-1.5 text-sm text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-primary" /> {t('landing.operatorCard.freeUpTo30')}
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4 text-primary" /> {t('landing.operatorCard.noSetupFees')}
          </li>
        </ul>
        <Link to="/signup" className={buttonVariants({ className: 'w-full' })}>
          {t('landing.operatorCard.startFree')}
          <ArrowRight />
        </Link>
        <Link
          to="/login"
          className="text-center text-sm text-muted-foreground hover:text-foreground"
        >
          {t('landing.operatorCard.alreadyHaveWorkspace')}
        </Link>
      </CardContent>
    </Card>
  )
}

export function Landing() {
  const { t } = useTranslation()
  const { data: me, isLoading: meLoading } = useMe()
  const dashboardPath = me?.roles.includes('parent') ? '/parent/dashboard' : '/operator/dashboard'

  return (
    <div className="min-h-screen">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <span className="text-lg font-medium">BasSekolah.my</span>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            {!meLoading && !me && (
              <Link to="/login" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                {t('common.logIn')}
              </Link>
            )}
            {!meLoading && me && (
              <Link to={dashboardPath} className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                {t('nav.dashboard')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        {!meLoading && me ? (
          <LoggedInHero dashboardPath={dashboardPath} />
        ) : (
          <>
            <section className="flex flex-col items-center gap-5 py-20 text-center">
              <span className="rounded-full border px-3 py-1 text-xs text-muted-foreground">
                {t('landing.badge')}
              </span>
              <h1 className="max-w-2xl text-4xl font-medium text-balance sm:text-5xl">
                {t('landing.headline')}
              </h1>
              <p className="max-w-xl text-balance text-muted-foreground">
                {t('landing.subheadline')}
              </p>
            </section>

            <section className="grid grid-cols-1 gap-4 pb-20 sm:grid-cols-2 lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.key} className="flex flex-col gap-2 rounded-xl border p-4">
                  <feature.icon className="size-5 text-primary" />
                  <p className="font-medium">{t(`landing.features.${feature.key}.title`)}</p>
                  <p className="text-sm text-muted-foreground">
                    {t(`landing.features.${feature.key}.description`)}
                  </p>
                </div>
              ))}
            </section>

            <section id="get-started" className="pb-24">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-medium">{t('landing.getStarted.title')}</h2>
                <p className="mt-1 text-muted-foreground">{t('landing.getStarted.subtitle')}</p>
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
          {t('landing.footer')}
        </div>
      </footer>
    </div>
  )
}
