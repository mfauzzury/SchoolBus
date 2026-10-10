import { useTranslation } from 'react-i18next'

const sections = [
  'collect',
  'use',
  'sharing',
  'security',
  'retention',
  'rights',
  'cookies',
  'children',
  'changes',
  'contact',
] as const

export function Privacy() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-content px-4 lg:px-8">
      <section className="flex flex-col gap-2 py-20">
        <h1 className="text-3xl font-medium sm:text-4xl">{t('privacy.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('legal.lastUpdated')}</p>

        <div className="mt-8 flex max-w-2xl flex-col gap-8">
          {sections.map((key) => (
            <div key={key}>
              <h2 className="mb-2 text-lg font-medium">{t(`privacy.sections.${key}.title`)}</h2>
              <p className="text-muted-foreground">{t(`privacy.sections.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
