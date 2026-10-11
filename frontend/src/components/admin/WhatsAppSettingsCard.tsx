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
  useSaveWhatsApp,
  useTestWhatsApp,
} from '@/hooks/useAdmin'
import type { WhatsAppSettings } from '@/api/admin'

export function WhatsAppSettingsCard() {
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

  return <WhatsAppForm settings={data.whatsapp} />
}

function WhatsAppForm({ settings }: { settings: WhatsAppSettings }) {
  const { t } = useTranslation()
  const save = useSaveWhatsApp()
  const test = useTestWhatsApp()
  const remove = useRemoveIntegration()

  const [token, setToken] = useState('')
  const [phoneId, setPhoneId] = useState(settings.phone_number_id ?? '')
  const [accountId, setAccountId] = useState(settings.business_account_id ?? '')
  const [enabled, setEnabled] = useState(settings.enabled)
  const [testTo, setTestTo] = useState('')
  const [saved, setSaved] = useState(false)

  const canSave = phoneId.trim() !== '' && (settings.has_access_token || token.trim() !== '')

  const fieldError = (field: string): string | undefined =>
    save.isError && isAxiosError(save.error)
      ? save.error.response?.data?.errors?.[field]?.[0]
      : undefined

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSaved(false)
    save.mutate(
      {
        access_token: token.trim() || undefined,
        phone_number_id: phoneId.trim(),
        business_account_id: accountId.trim(),
        enabled,
      },
      {
        onSuccess: () => {
          setToken('')
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

  const result = test.data

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>{t('admin.settings.whatsapp.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('admin.settings.whatsapp.description')}</p>
        </div>
        {statusBadge}
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <form onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label htmlFor="wa_token">{t('admin.settings.whatsapp.token')}</Label>
              <Input
                id="wa_token"
                type="password"
                autoComplete="new-password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={
                  settings.has_access_token ? '••••••••••••' : t('admin.settings.keyPlaceholder')
                }
              />
              <p className="text-xs text-muted-foreground">
                {settings.has_access_token
                  ? t('admin.settings.keyStored')
                  : t('admin.settings.whatsapp.tokenHelp')}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wa_phone_id">{t('admin.settings.whatsapp.phoneId')}</Label>
              <Input
                id="wa_phone_id"
                inputMode="numeric"
                className="font-mono"
                value={phoneId}
                onChange={(e) => setPhoneId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('admin.settings.whatsapp.phoneIdHelp')}</p>
              {fieldError('phone_number_id') && (
                <p className="text-sm text-destructive">{t('admin.settings.whatsapp.digitsOnly')}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="wa_account_id">{t('admin.settings.whatsapp.accountId')}</Label>
              <Input
                id="wa_account_id"
                inputMode="numeric"
                className="font-mono"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{t('admin.settings.optional')}</p>
              {fieldError('business_account_id') && (
                <p className="text-sm text-destructive">{t('admin.settings.whatsapp.digitsOnly')}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox
              id="wa_enabled"
              checked={enabled}
              onCheckedChange={(checked) => setEnabled(checked === true)}
            />
            <div className="flex flex-col gap-0.5">
              <Label htmlFor="wa_enabled">{t('admin.settings.whatsapp.enable')}</Label>
              <p className="text-xs text-muted-foreground">{t('admin.settings.whatsapp.enableHelp')}</p>
            </div>
          </div>

          {save.isError && !fieldError('phone_number_id') && !fieldError('business_account_id') && (
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
                    <AlertDialogTitle>{t('admin.settings.whatsapp.removeConfirm')}</AlertDialogTitle>
                  </AlertDialogHeader>
                  <p className="text-sm text-muted-foreground">
                    {t('admin.settings.whatsapp.removeHelp')}
                  </p>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove.mutate('whatsapp')}>
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
            <Label htmlFor="wa_test_to">{t('admin.settings.whatsapp.testTitle')}</Label>
            <p className="text-xs text-muted-foreground">{t('admin.settings.whatsapp.testHelp')}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Input
                id="wa_test_to"
                inputMode="tel"
                className="max-w-xs"
                placeholder="012-345 6789"
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                disabled={test.isPending}
                onClick={() => test.mutate(testTo.trim())}
              >
                {test.isPending
                  ? t('admin.settings.sending')
                  : testTo.trim()
                    ? t('admin.settings.whatsapp.checkAndSend')
                    : t('admin.settings.whatsapp.check')}
              </Button>
            </div>

            {result && (
              <div
                role="status"
                className={
                  result.ok
                    ? 'flex flex-col gap-0.5 text-sm text-green-700 dark:text-green-400'
                    : 'flex flex-col gap-0.5 text-sm text-destructive'
                }
              >
                <p>
                  {result.ok
                    ? t('admin.settings.whatsapp.test.ok', {
                        name: result.verified_name ?? '—',
                        number: result.display_phone_number ?? '—',
                      })
                    : t(`admin.settings.whatsapp.test.${result.reason}`)}
                </p>
                {result.sent && <p>{t('admin.settings.whatsapp.test.sent')}</p>}
                {result.detail && <p className="text-xs">{result.detail}</p>}
              </div>
            )}
            {test.isError && (
              <p role="alert" className="text-sm text-destructive">
                {t('admin.settings.whatsapp.test.error')}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
