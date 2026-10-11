import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  useIntegrationSettings,
  useRemoveIntegration,
  useSaveBrevo,
  useTestBrevo,
} from '@/hooks/useAdmin'
import { useMe } from '@/hooks/useAuth'
import type { BrevoSettings } from '@/api/admin'

export function BrevoSettingsCard() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useIntegrationSettings()

  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {t('admin.system.loadError')}
      </p>
    )
  }

  if (isLoading || !data) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return <BrevoForm settings={data.brevo} />
}

function BrevoForm({ settings }: { settings: BrevoSettings }) {
  const { t } = useTranslation()
  const { data: me } = useMe()
  const save = useSaveBrevo()
  const test = useTestBrevo()
  const remove = useRemoveIntegration()

  const [login, setLogin] = useState(settings.smtp_login ?? '')
  const [smtpKey, setSmtpKey] = useState('')
  const [fromEmail, setFromEmail] = useState(settings.from_email ?? '')
  const [fromName, setFromName] = useState(settings.from_name ?? '')
  const [enabled, setEnabled] = useState(settings.enabled)
  const [testTo, setTestTo] = useState(me?.user.email ?? '')
  const [saved, setSaved] = useState(false)

  const canSave =
    login.trim() !== '' &&
    fromEmail.trim() !== '' &&
    (settings.has_smtp_key || smtpKey.trim() !== '')

  const fieldError = (field: string): string | undefined =>
    save.isError && isAxiosError(save.error)
      ? save.error.response?.data?.errors?.[field]?.[0]
      : undefined

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSaved(false)
    save.mutate(
      {
        smtp_login: login.trim(),
        smtp_key: smtpKey.trim() || undefined,
        from_email: fromEmail.trim(),
        from_name: fromName.trim(),
        enabled,
      },
      {
        onSuccess: () => {
          // The typed secret is stored now; don't keep it sitting in the field.
          setSmtpKey('')
          setSaved(true)
        },
      },
    )
  }

  const statusBadge = !settings.configured ? (
    <Badge variant="outline">{t('admin.settings.notSetUp')}</Badge>
  ) : settings.enabled ? (
    <Badge variant="success">{t('admin.settings.inUse')}</Badge>
  ) : (
    <Badge variant="outline">{t('admin.settings.switchedOff')}</Badge>
  )

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>{t('admin.settings.brevo.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('admin.settings.brevo.description')}</p>
        </div>
        {statusBadge}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brevo_login">{t('admin.settings.brevo.login')}</Label>
              <Input
                id="brevo_login"
                value={login}
                autoComplete="off"
                onChange={(e) => setLogin(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('admin.settings.brevo.loginHelp')}</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brevo_key">{t('admin.settings.brevo.key')}</Label>
              <Input
                id="brevo_key"
                type="password"
                autoComplete="new-password"
                value={smtpKey}
                onChange={(e) => setSmtpKey(e.target.value)}
                placeholder={settings.has_smtp_key ? '••••••••••••' : t('admin.settings.keyPlaceholder')}
              />
              <p className="text-xs text-muted-foreground">
                {settings.has_smtp_key ? t('admin.settings.keyStored') : t('admin.settings.brevo.keyHelp')}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brevo_from_email">{t('admin.settings.brevo.fromEmail')}</Label>
              <Input
                id="brevo_from_email"
                type="email"
                value={fromEmail}
                onChange={(e) => setFromEmail(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('admin.settings.brevo.fromEmailHelp')}</p>
              {fieldError('from_email') && (
                <p className="text-sm text-destructive">{fieldError('from_email')}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="brevo_from_name">{t('admin.settings.brevo.fromName')}</Label>
              <Input
                id="brevo_from_name"
                value={fromName}
                maxLength={100}
                onChange={(e) => setFromName(e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="brevo_enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="brevo_enabled">{t('admin.settings.brevo.enable')}</Label>
              <p className="text-xs text-muted-foreground">{t('admin.settings.brevo.enableHelp')}</p>
            </div>
          </div>

          {save.isError && !fieldError('from_email') && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.settings.saveError')}
            </p>
          )}
          {saved && !save.isError && (
            <p role="status" className="text-sm text-green-700 dark:text-green-400">
              {t('common.saved')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={save.isPending || !canSave}>
              {save.isPending ? t('common.saving') : t('common.save')}
            </Button>
            {settings.configured && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button type="button" variant="outline">
                      {t('admin.settings.remove')}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>{t('admin.settings.brevo.removeConfirm')}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <p className="text-sm text-muted-foreground">{t('admin.settings.brevo.removeHelp')}</p>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutate('brevo')}>
                      {t('admin.settings.remove')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>

        {settings.configured && (
          <div className="flex flex-col gap-2 border-t pt-4">
            <Label htmlFor="brevo_test_to">{t('admin.settings.brevo.testTitle')}</Label>
            <p className="text-xs text-muted-foreground">{t('admin.settings.brevo.testHelp')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="brevo_test_to"
                type="email"
                className="max-w-xs"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={test.isPending || testTo.trim() === ''}
                onClick={() => test.mutate(testTo.trim())}
              >
                {test.isPending ? t('admin.settings.sending') : t('admin.settings.brevo.sendTest')}
              </Button>
            </div>
            {test.data && (
              <p
                role="status"
                className={
                  test.data.ok
                    ? 'text-sm text-green-700 dark:text-green-400'
                    : 'text-sm text-destructive'
                }
              >
                {test.data.ok
                  ? t('admin.settings.brevo.test.ok', { email: testTo.trim() })
                  : t(`admin.settings.brevo.test.${test.data.reason}`)}
              </p>
            )}
            {test.isError && (
              <p role="alert" className="text-sm text-destructive">
                {t('admin.settings.brevo.test.error')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
