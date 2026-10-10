import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const values = ['transparency', 'simplicity', 'fairBilling'] as const

export function About() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-content px-4 lg:px-8">
      <section className="flex flex-col gap-5 py-20">
        <span className="flex items-center gap-2 text-xs font-bold tracking-wider text-primary uppercase">
          <span className="size-1.5 rounded-full bg-primary" />
          {t('about.eyebrow')}
        </span>
        <h1 className="max-w-xl text-4xl leading-tight font-medium text-balance sm:text-5xl">
          {t('about.headline')}
        </h1>

        <div className="mt-4 flex max-w-2xl flex-col gap-4 text-muted-foreground">
          <p>{t('about.paragraph1')}</p>
          <p>{t('about.paragraph2')}</p>
          <p>{t('about.paragraph3')}</p>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {values.map((key, i) => (
            <div key={key} className="flex flex-col gap-1 rounded-lg border p-4">
              <span className="font-mono text-[0.68rem] text-primary">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span className="font-medium">{t(`about.values.${key}.title`)}</span>
              <span className="text-sm text-muted-foreground">
                {t(`about.values.${key}.description`)}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap items-center gap-3 border-t py-12">
        <Link to="/operators" className={buttonVariants({ size: 'lg' })}>
          {t('about.ctaOperators')}
          <ArrowRight />
        </Link>
        <Link to="/" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
          {t('about.ctaParents')}
        </Link>
      </section>
    </div>
  )
}
