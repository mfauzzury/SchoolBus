import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ArrowRight,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Accordion,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { cn } from '@/lib/utils'
import { BillplzLogo } from '@/components/BillplzLogo'
import opHeroBus from '@/assets/landing/op-hero-bus.webp'
import opJourneyDepot from '@/assets/landing/op-journey-depot.webp'
import opGetStartedBus from '@/assets/landing/op-get-started-bus.webp'
import tourDashboard from '@/assets/landing/tour-dashboard.webp'
import tourRoutes from '@/assets/landing/tour-routes.webp'
import tourFinances from '@/assets/landing/tour-finances.webp'

const capabilities = ['fleet', 'applications', 'discounts', 'free'] as const

const journey = ['setup', 'apply', 'approve', 'bill'] as const

const faqs = ['free', 'setup', 'billing', 'dataIsolation', 'parentsRegister', 'hiddenFees'] as const

const whySwitchPairs = ['payments', 'applications', 'discounts', 'visibility'] as const

const screenshots = [
  { key: 'dashboard', src: tourDashboard },
  { key: 'fleet', src: tourRoutes },
  { key: 'billing', src: tourFinances },
] as const

// Wikimedia Commons photos used on this page. CC BY / BY-SA licences require credit.
const photoCredits = [
  {
    author: 'Auswandern Malaysia',
    license: 'CC BY 2.0',
    href: 'https://commons.wikimedia.org/wiki/File:Schoolbus_in_Bangsar,_Kuala_Lumpur,_Malaysia.jpg',
  },
  {
    author: '慕尼黑啤酒',
    license: 'CC BY-SA 3.0',
    href: 'https://commons.wikimedia.org/wiki/File:Malaysia_School_Bus.jpg',
  },
] as const

const freeFeatures = ['perTransaction', 'platformFee', 'deducted'] as const
const proFeatures = [
  'perTransaction',
  'platformFee',
  'reminders',
  'driverApp',
  'liveTracking',
  'boardingAlerts',
] as const

function PricingCard({ tier }: { tier: 'free' | 'pro' }) {
  const { t } = useTranslation()
  const comingSoon = tier === 'pro'
  const features = tier === 'free' ? freeFeatures : proFeatures

  return (
    <Card className="relative flex flex-col">
      {comingSoon && (
        <Badge variant="outline" className="absolute top-4 right-4">
          {t('operatorsPage.pricing.comingSoon')}
        </Badge>
      )}
      <CardHeader className="gap-1.5">
        <span className="text-[0.68rem] font-bold tracking-wider text-primary uppercase">
          {t(`operatorsPage.pricing.${tier}.planName`)}
        </span>
        <div className="flex items-baseline gap-1">
          <span className="text-4xl font-medium">{tier === 'free' ? 'RM0' : 'RM1,200'}</span>
          <span className="text-muted-foreground">
            {t(
              tier === 'free'
                ? 'operatorsPage.pricing.priceSuffix'
                : 'operatorsPage.pricing.priceSuffixYear',
            )}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">{t(`operatorsPage.pricing.${tier}.tagline`)}</p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ul className="flex flex-1 flex-col gap-2.5 text-sm">
          {features.map((key) => (
            <li key={key} className="flex items-start gap-2">
              <CheckCircle2
                className={cn(
                  'mt-0.5 size-4 shrink-0',
                  comingSoon ? 'text-muted-foreground' : 'text-primary',
                )}
              />
              <span className={comingSoon ? 'text-muted-foreground' : undefined}>
                {t(`operatorsPage.pricing.${tier}.features.${key}`)}
              </span>
            </li>
          ))}
        </ul>
        {comingSoon ? (
          <Button disabled className="w-full">
            {t('operatorsPage.pricing.comingSoon')}
          </Button>
        ) : (
          <a href="#get-started" className={cn(buttonVariants({ className: 'w-full' }))}>
            {t('operatorsPage.operatorCard.startFree')}
            <ArrowRight />
          </a>
        )}
      </CardContent>
    </Card>
  )
}

function OperatorAccessCard() {
  const { t } = useTranslation()
  return (
    <Card className="flex flex-col bg-primary text-primary-foreground ring-primary/20">
      <CardHeader className="gap-1.5">
        <span className="text-[0.68rem] font-bold tracking-wider uppercase">
          {t('operatorsPage.operatorCard.kicker')}
        </span>
        <CardTitle className="text-xl text-primary-foreground">
          {t('operatorsPage.operatorCard.title')}
        </CardTitle>
        <p className="text-sm text-primary-foreground/75">
          {t('operatorsPage.operatorCard.description')}
        </p>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col justify-end gap-3">
        <ul className="flex flex-col gap-1.5 text-sm text-primary-foreground/85">
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> {t('operatorsPage.operatorCard.freeUpTo30')}
          </li>
          <li className="flex items-center gap-1.5">
            <CheckCircle2 className="size-4" /> {t('operatorsPage.operatorCard.noSetupFees')}
          </li>
        </ul>
        <Link
          to="/signup"
          className={cn(
            buttonVariants({ className: 'w-full' }),
            'bg-primary-foreground text-primary hover:bg-primary-foreground/85',
          )}
        >
          {t('operatorsPage.operatorCard.startFree')}
          <ArrowRight />
        </Link>
        <Link
          to="/login"
          className="text-center text-sm text-primary-foreground/75 hover:text-primary-foreground"
        >
          {t('operatorsPage.operatorCard.alreadyHaveWorkspace')}
        </Link>
      </CardContent>
    </Card>
  )
}

export function Operators() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-content px-4 lg:px-8">
      <section className="flex flex-col gap-12 py-20">
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
          <div className="flex flex-col gap-5">
            <span className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
              <span className="size-1.5 rounded-full bg-primary" />
              {t('operatorsPage.eyebrow')}
            </span>
            <h1 className="max-w-xl text-4xl leading-tight font-medium text-balance sm:text-5xl">
              {t('operatorsPage.headline')}
            </h1>
            <p className="max-w-xl text-balance text-muted-foreground">
              {t('operatorsPage.subheadline')}
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <a href="#get-started" className={buttonVariants({ size: 'lg' })}>
                {t('operatorsPage.operatorCard.startFree')}
                <ArrowRight />
              </a>
              <a href="#journey" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                {t('operatorsPage.seeHowItWorks')}
              </a>
              <a href="#pricing" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
                {t('operatorsPage.pricing.tag')}
              </a>
            </div>
          </div>

          <img
            src={opHeroBus}
            alt={t('operatorsPage.images.hero')}
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
                {t(`operatorsPage.capabilities.${key}`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section id="why-switch" className="border-t py-20">
        <div className="mb-10 max-w-md">
          <span className="mb-2 block font-mono text-xs font-bold text-primary uppercase">
            {t('operatorsPage.whySwitch.tag')}
          </span>
          <h2 className="text-2xl font-medium">{t('operatorsPage.whySwitch.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('operatorsPage.whySwitch.subtitle')}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <span className="text-[0.68rem] font-bold tracking-wider text-muted-foreground uppercase">
              {t('operatorsPage.whySwitch.oldWay')}
            </span>
            <ul className="flex flex-col gap-3 text-sm text-muted-foreground">
              {whySwitchPairs.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{t(`operatorsPage.whySwitch.${key}.old`)}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col gap-3 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <span className="text-[0.68rem] font-bold tracking-wider text-primary uppercase">
              {t('operatorsPage.whySwitch.newWay')}
            </span>
            <ul className="flex flex-col gap-3 text-sm">
              {whySwitchPairs.map((key) => (
                <li key={key} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-primary" />
                  <span>{t(`operatorsPage.whySwitch.${key}.new`)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section
        id="journey"
        className="grid items-center gap-12 border-t py-20 lg:grid-cols-2 lg:gap-14"
      >
        <div>
          <div className="mb-10 max-w-md">
            <span className="mb-2 block font-mono text-xs font-bold text-primary uppercase">
              {t('operatorsPage.journeyTag')}
            </span>
            <h2 className="text-2xl font-medium">{t('operatorsPage.journeyTitle')}</h2>
            <p className="mt-1 text-muted-foreground">{t('operatorsPage.journeySubtitle')}</p>
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
                  <span className="mb-1 block text-[0.66rem] font-bold tracking-wider text-primary uppercase">
                    {t(`operatorsPage.journey.${key}.who`)}
                  </span>
                  <h3 className="mb-1.5 font-medium">{t(`operatorsPage.journey.${key}.title`)}</h3>
                  <p className="max-w-sm text-sm text-muted-foreground">
                    {t(`operatorsPage.journey.${key}.body`)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <img
          src={opJourneyDepot}
          alt={t('operatorsPage.images.depot')}
          loading="lazy"
          className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm"
        />
      </section>

      <section id="screenshots" className="border-t py-20">
        <div className="mb-10 max-w-md">
          <span className="mb-2 block font-mono text-xs font-bold text-primary uppercase">
            {t('operatorsPage.screenshots.tag')}
          </span>
          <h2 className="text-2xl font-medium">{t('operatorsPage.screenshots.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('operatorsPage.screenshots.subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {screenshots.map(({ key, src }) => (
            <div key={key} className="flex flex-col gap-3">
              <img
                src={src}
                alt={t(`operatorsPage.screenshots.${key}.title`)}
                width={1100}
                height={700}
                loading="lazy"
                className="w-full rounded-lg border shadow-sm"
              />
              <div>
                <h3 className="text-sm font-medium">{t(`operatorsPage.screenshots.${key}.title`)}</h3>
                <p className="text-xs text-muted-foreground">
                  {t(`operatorsPage.screenshots.${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="border-t py-20">
        <div className="mb-10 max-w-md">
          <span className="mb-2 block font-mono text-xs font-bold text-primary uppercase">
            {t('operatorsPage.pricing.tag')}
          </span>
          <h2 className="text-2xl font-medium">{t('operatorsPage.pricing.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('operatorsPage.pricing.subtitle')}</p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <PricingCard tier="free" />
          <PricingCard tier="pro" />
        </div>

        <div className="mx-auto mt-6 flex max-w-md items-center gap-3 rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
          <BillplzLogo className="h-4 w-auto shrink-0 text-foreground" />
          <span>{t('operatorsPage.pricing.gatewayNote')}</span>
        </div>
      </section>

      <section id="get-started" className="border-t pb-24 pt-20">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-medium">{t('operatorsPage.getStarted.title')}</h2>
          <p className="mt-1 text-muted-foreground">{t('operatorsPage.getStarted.subtitle')}</p>
        </div>
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
          <img
            src={opGetStartedBus}
            alt={t('operatorsPage.images.bus')}
            loading="lazy"
            className="hidden aspect-[3/2] w-full rounded-2xl object-cover shadow-sm lg:block"
          />
          <div className="mx-auto w-full max-w-md">
            <OperatorAccessCard />
            <p className="mt-4 text-center text-sm text-muted-foreground">
              {t('operatorsPage.parentNudge')}{' '}
              <Link to="/" className="font-medium text-foreground hover:text-primary">
                {t('marketingNav.parents')}
                <ArrowRight className="inline size-3.5 align-[-2px]" />
              </Link>
            </p>
          </div>
        </div>
      </section>

      <section id="faq" className="border-t pb-24 pt-20">
        <div className="mb-10 max-w-md">
          <span className="mb-2 block font-mono text-xs font-bold text-primary uppercase">
            {t('operatorsPage.faqTag')}
          </span>
          <h2 className="text-2xl font-medium">{t('operatorsPage.faqTitle')}</h2>
          <p className="mt-1 text-muted-foreground">{t('operatorsPage.faqSubtitle')}</p>
        </div>

        <Accordion className="max-w-2xl">
          {faqs.map((key) => (
            <AccordionItem key={key} value={key}>
              <AccordionTrigger>{t(`operatorsPage.faq.${key}.question`)}</AccordionTrigger>
              <AccordionPanel>{t(`operatorsPage.faq.${key}.answer`)}</AccordionPanel>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      <p className="border-t py-6 text-xs text-muted-foreground">
        {t('operatorsPage.photoCredits')}{' '}
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
