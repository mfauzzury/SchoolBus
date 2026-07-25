import { useTranslation } from 'react-i18next'

const sections = [
  'acceptance',
  'service',
  'accounts',
  'fees',
  'responsibilities',
  'data',
  'termination',
  'liability',
  'changes',
  'contact',
] as const

export function Terms() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-5xl px-6">
      <section className="flex flex-col gap-2 py-20">
        <h1 className="text-3xl font-medium sm:text-4xl">{t('terms.title')}</h1>
        <p className="text-sm text-muted-foreground">{t('legal.lastUpdated')}</p>

        <div className="mt-8 flex max-w-2xl flex-col gap-8">
          {sections.map((key) => (
            <div key={key}>
              <h2 className="mb-2 text-lg font-medium">{t(`terms.sections.${key}.title`)}</h2>
              <p className="text-muted-foreground">{t(`terms.sections.${key}.body`)}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
