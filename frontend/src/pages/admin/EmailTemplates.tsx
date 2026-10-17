import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  useEmailPreview,
  useEmailTemplates,
  useResetEmailTemplate,
  useSaveEmailTemplate,
} from '@/hooks/useAdmin'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'
import { cn } from '@/lib/utils'
import type { EmailBlockKey, EmailTemplate } from '@/api/admin'

type Draft = Partial<Record<EmailBlockKey, string>>

// Short single-line parts get an input; the sentences get a taller box.
const ONE_LINE: EmailBlockKey[] = ['subject', 'button']

const draftOf = (template: EmailTemplate): Draft =>
  Object.fromEntries(template.blocks.map((b) => [b.key, b.value]))

/** The emails parents receive: pick one, change its wording, and see it drawn like a real email. */
export function EmailTemplates() {
  const { t } = useTranslation()
  const { data: templates, isLoading, isError } = useEmailTemplates()
  const [selected, setSelected] = useState<string | null>(null)

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('admin.system.loadError')}
      </p>
    )
  }
  if (isLoading || !templates) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  const current = templates.find((tpl) => tpl.template === selected) ?? templates[0]

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">{t('admin.messages.templates.intro')}</p>

      <div className="grid items-start gap-4 lg:grid-cols-[16rem_1fr]">
        <nav aria-label={t('admin.messages.templates.listLabel')} className="flex flex-col gap-1">
          {templates.map((tpl) => (
            <button
              key={tpl.template}
              type="button"
              aria-current={tpl.template === current.template}
              onClick={() => setSelected(tpl.template)}
              className={cn(
                'flex flex-col gap-0.5 rounded-lg border px-3 py-2 text-left text-sm transition-colors',
                tpl.template === current.template ? 'border-foreground bg-muted' : 'hover:bg-muted/50',
              )}
            >
              <span className="flex items-center justify-between gap-2 font-medium">
                {t(`admin.messages.templates.items.${tpl.template}.name`)}
                {tpl.customised && <Badge variant="info">{t('admin.messages.templates.edited')}</Badge>}
              </span>
              <span className="text-xs text-muted-foreground">
                {t(`admin.messages.templates.items.${tpl.template}.when`)}
              </span>
            </button>
          ))}
        </nav>

        {/* Keyed so each email starts from its own saved wording. */}
        <TemplateEditor key={current.template} template={current} />
      </div>
    </div>
  )
}

function TemplateEditor({ template }: { template: EmailTemplate }) {
  const { t } = useTranslation()
  const save = useSaveEmailTemplate()
  const reset = useResetEmailTemplate()
  const [draft, setDraft] = useState<Draft>(() => draftOf(template))
  const [saved, setSaved] = useState(false)

  // After a save or reset the server's wording is the new starting point.
  useEffect(() => setDraft(draftOf(template)), [template])

  const preview = useEmailPreview(template.template, useDebouncedValue(draft, 400))
  const changed = template.blocks.some((b) => (draft[b.key] ?? '') !== b.value)

  const errors = save.error && isAxiosError(save.error) ? (save.error.response?.data?.errors ?? {}) : {}
  const errorFor = (key: EmailBlockKey): string | undefined => errors[`blocks.${key}`]?.[0]

  const onSave = () => {
    setSaved(false)
    save.mutate({ template: template.template, blocks: draft }, { onSuccess: () => setSaved(true) })
  }

  const onReset = () => {
    setSaved(false)
    reset.mutate(template.template)
  }

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <Card>
        <CardContent className="flex flex-col gap-4">
          <div>
            <h2 className="font-medium">{t(`admin.messages.templates.items.${template.template}.name`)}</h2>
            <p className="text-sm text-muted-foreground">
              {t(`admin.messages.templates.items.${template.template}.when`)}
            </p>
          </div>

          {!template.editable ? (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{t('admin.messages.templates.readOnlyTitle')}</p>
              <p className="mt-1 text-muted-foreground">{t('admin.messages.templates.readOnlyHelp')}</p>
            </div>
          ) : (
            <>
              {template.blocks.map((block) => {
                const id = `${template.template}-${block.key}`
                const Field = ONE_LINE.includes(block.key) ? Input : Textarea
                return (
                  <div key={block.key} className="flex flex-col gap-1.5">
                    <Label htmlFor={id}>{t(`admin.messages.templates.blocks.${block.key}`)}</Label>
                    <Field
                      id={id}
                      value={draft[block.key] ?? ''}
                      onChange={(e) => {
                        setSaved(false)
                        setDraft((d) => ({ ...d, [block.key]: e.target.value }))
                      }}
                      {...(Field === Textarea ? { rows: 2 } : {})}
                    />
                    <p className="text-xs text-muted-foreground">{t(`admin.messages.templates.blockHelp.${block.key}`)}</p>
                    {errorFor(block.key) && (
                      <p role="alert" className="text-sm text-destructive">
                        {errorFor(block.key)}
                      </p>
                    )}
                  </div>
                )
              })}

              <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
                <p className="mb-1 font-medium text-foreground">{t('admin.messages.templates.placeholdersTitle')}</p>
                <ul className="flex flex-col gap-0.5">
                  {template.placeholders.map((name) => (
                    <li key={name}>
                      <code className="rounded bg-background px-1 py-0.5 text-foreground">{`{${name}}`}</code>{' '}
                      {t(`admin.messages.templates.placeholders.${name}`)}
                    </li>
                  ))}
                </ul>
              </div>

              {save.isError && !Object.keys(errors).length && (
                <p role="alert" className="text-sm text-destructive">
                  {t('admin.messages.templates.saveError')}
                </p>
              )}
              {saved && !changed && (
                <p role="status" className="text-sm text-muted-foreground">
                  {t('admin.messages.templates.saved')}
                </p>
              )}

              <div className="flex flex-wrap gap-2">
                <Button onClick={onSave} disabled={!changed || save.isPending}>
                  {save.isPending ? t('common.saving') : t('common.save')}
                </Button>
                <Button
                  variant="outline"
                  onClick={onReset}
                  disabled={!template.customised || reset.isPending}
                >
                  {t('admin.messages.templates.reset')}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="flex flex-col gap-3">
          <div>
            <h3 className="font-medium">{t('admin.messages.templates.previewTitle')}</h3>
            <p className="text-xs text-muted-foreground">{t('admin.messages.templates.sampleNote')}</p>
          </div>
          {preview.isError ? (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.messages.templates.previewError')}
            </p>
          ) : !preview.data ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <>
              <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm">
                <span className="text-muted-foreground">{t('admin.messages.templates.subjectLabel')}: </span>
                <span className="font-medium">{preview.data.subject}</span>
              </p>
              {/* sandbox="" so nothing inside the preview can run or navigate. */}
              <iframe
                title={t('admin.messages.templates.previewTitle')}
                srcDoc={preview.data.html}
                sandbox=""
                className="h-[42rem] w-full rounded-md border bg-white"
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
