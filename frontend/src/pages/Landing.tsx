import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, XCircle } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '@/components/ui/accordion'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import { useMe } from '@/hooks/useAuth'
import { useTenantByCode } from '@/hooks/useRegistration'
import { cn } from '@/lib/utils'
import heroPupils from '@/assets/landing/hero-pupils.webp'
import journeyVan from '@/assets/landing/journey-van.webp'
import getStartedPupils from '@/assets/landing/get-started-pupils.webp'

const capabilities = ['bilingual', 'transparency', 'discounts', 'receipts'] as const

const journey = ['find', 'apply', 'approved', 'pay'] as const

// Wikimedia Commons photos used on this page. The CC BY-SA licences require credit.
const photoCredits = [
  {
    author: 'Uwe Aranas',
    license: 'CC BY-SA 3.0',
    href: 'https://commons.wikimedia.org/wiki/File:Kanibongan_Sabah_SK-Kanibongan-03.jpg',
  },
  {
    author: 'Aero777',
    license: 'CC BY-SA 2.5 MY',
    href: 'https://commons.wikimedia.org/wiki/File:2014_CAM_(King_Long,_Farid)_Placer-X_2.5L_CDTi_School_Bus_in_Petaling_Jaya,_Malaysia_(01).jpg',
  },
  {
    author: 'Marufish',
    license: 'CC BY-SA 2.0',
    href: 'https://commons.wikimedia.org/wiki/File:2014%E5%B9%B4%E4%BA%9A%E7%BD%97%E5%A3%AB%E6%89%93%E5%9F%B9%E5%8D%8E%E5%B0%8F%E5%AD%A6UPSR%E6%88%90%E7%BB%A9%E6%94%BE%E6%A6%9C_(16014988394).jpg',
  },
] as const

const faqs = ['findOperator', 'billing', 'payment', 'changeDetails', 'receipts', 'security'] as const

function LoggedInHero({ dashboardPath }: { dashboardPath: string }) {
  const { t } = useTranslation()
  return (
    <section className="flex flex-col items-center gap-6 px-6 py-24 text-center">
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
  const resolved = code.length === 5 && !isFetching && !isError && tenant

  const onContinue = () => {
    if (resolved) navigate(`/register/${code}`)
  }

  return (
    <Card className="flex flex-col">
      <CardHeader className="gap-1.5">
        <span className="text-[0.68rem] font-bold tracking-wider text-primary uppercase">
          {t('landing.parentCard.kicker')}
        </span>
        <CardTitle className="text-xl">{t('landing.parentCard.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('landing.parentCard.description')}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        <InputOTP
          maxLength={5}
          value={code}
          onChange={setCode}
          inputMode="numeric"
          onComplete={() => {
            /* validation runs via useTenantByCode; user confirms with Continue */
          }}
        >
          <InputOTPGroup className="mx-auto gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="size-11 rounded-lg border-l font-mono text-lg"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <div className="flex min-h-5 items-center justify-center gap-1.5 text-sm">
          {code.length === 5 && isFetching && (
            <span className="text-muted-foreground">{t('landing.parentCard.checking')}</span>
          )}
          {code.length === 5 && !isFetching && isError && (
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

export function Landing() {
  const { t } = useTranslation()
  const { data: me, isLoading: meLoading } = useMe()
  const dashboardPath = me?.roles.includes('parent') ? '/parent/dashboard' : '/operator/dashboard'

  if (!meLoading && me) {
    return <LoggedInHero dashboardPath={dashboardPath} />
  }

  return (
    <div className="mx-auto max-w-content px-4 lg:px-8">
      <section className="flex flex-col gap-12 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col gap-5">
            <span className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
              <span className="size-1.5 rounded-full bg-primary" />
              {t('landing.eyebrow')}
            </span>
            <h1 className="max-w-xl text-4xl leading-tight font-medium text-balance sm:text-5xl">
              {t('landing.headline')}
            </h1>
            <p className="max-w-xl text-balance text-muted-foreground">{t('landing.subheadline')}</p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a href="#get-started" className={buttonVariants({ size: 'lg' })}>
                {t('landing.getStarted.title')}
                <ArrowRight />
              </a>
              <a href="#journey" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                {t('landing.seeHowItWorks')}
              </a>
            </div>
          </div>

          <img
            src={heroPupils}
            alt={t('landing.images.hero')}
            fetchPriority="high"
            className="aspect-[3/2] w-full rounded-2xl object-cover shadow-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {capabilities.map((key, i) => (
            <div key={key} className="flex flex-col gap-1 rounded-lg border p-3">
              <span className="font-mono text-[0.68rem] text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="text-sm text-muted-foreground">
                {t(`landing.capabilities.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section
        id="journey"
        className="grid items-center gap-12 border-t py-20 lg:grid-cols-2 lg:gap-14"
      >
        <div>
          <div className="mb-10 max-w-md">
            <span className="mb-2 block font-mono text-xs font-bold text-primary uppercase">
              {t('landing.journeyTag')}
            </span>
            <h2 className="text-2xl font-medium">{t('landing.journeyTitle')}</h2>
            <p className="mt-1 text-muted-foreground">{t('landing.journeySubtitle')}</p>
          </div>

          <div className="flex max-w-xl flex-col">
            {journey.map((key, i) => (
              <div key={key} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-primary bg-background font-mono text-xs font-bold">
                    {String(i + 1).padStart(2, '0')}
                  </div>
                  {i < journey.length - 1 && <div className="w-0.5 flex-1 bg-border" />}
                </div>
                <div className={cn('pb-10', i === journey.length - 1 && 'pb-0')}>
                  <h3 className="mb-1.5 font-medium">{t(`landing.journey.${key}.title`)}</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {t(`landing.journey.${key}.body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <img
          src={journeyVan}
          alt={t('landing.images.van')}
          loading="lazy"
          className="aspect-video w-full rounded-2xl object-cover shadow-sm"
        />
      </section>

      <section id="get-started" className="border-t pb-24 pt-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-medium">{t('landing.getStarted.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('landing.getStarted.subtitle')}</p>
        </div>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <img
            src={getStartedPupils}
            alt={t('landing.images.pupils')}
            loading="lazy"
            className="hidden aspect-[3/2] w-full rounded-2xl object-cover shadow-sm lg:block"
          />
          <div className="mx-auto w-full max-w-md">
            <ParentAccessCard />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t('landing.operatorNudge')}{' '}
              <Link to="/operators" className="font-medium text-foreground hover:text-primary">
                {t('marketingNav.operators')}
                <ArrowRight className="inline size-3.5 align-[-2px]" />
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t pb-24 pt-20">
        <div className="mb-10 max-w-md">
          <span className="mb-2 block font-mono text-xs font-bold text-primary uppercase">
            {t('landing.faqTag')}
          </span>
          <h2 className="text-2xl font-medium">{t('landing.faqTitle')}</h2>
          <p className="mt-1 text-muted-foreground">{t('landing.faqSubtitle')}</p>
        </div>

        <Accordion className="max-w-2xl">
          {faqs.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{t(`landing.faq.${key}.question`)}</AccordionTrigger>
              <AccordionPanel>{t(`landing.faq.${key}.answer`)}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <p className="border-t py-6 text-xs text-muted-foreground">
        {t('landing.photoCredits')}{' '}
        {photoCredits.map((c, i) => (
          <span key={c.href}>
            {i > 0 && ', '}
            <a href={c.href} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
              {c.author}
            </a>{' '}
            ({c.license})
          </span>
        ))}
        .
      </p>
    </div>
  )
}
