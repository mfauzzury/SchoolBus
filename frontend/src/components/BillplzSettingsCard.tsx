import { useState } from 'react'
import { useTranslation } from 'react-i18next'
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
  useDisableBillplz,
  useTestBillplzConnection,
  useUpdateBillplzSettings,
} from '@/hooks/useAdmin'
import type { BillplzSettings } from '@/api/admin'

/**
 * Platform-admin-only form for one operator's Billplz credentials. The stored
 * keys are never sent to the browser, so the key inputs start empty and a blank
 * submit keeps what's saved.
 */
export function BillplzSettingsCard({
  operatorId,
  settings,
}: {
  operatorId: number
  settings: BillplzSettings
}) {
  const { t } = useTranslation()
  const update = useUpdateBillplzSettings(operatorId)
  const disable = useDisableBillplz(operatorId)
  const test = useTestBillplzConnection(operatorId)

  const [secretKey, setSecretKey] = useState('')
  const [xSignatureKey, setXSignatureKey] = useState('')
  const [collectionId, setCollectionId] = useState(settings.collection_id ?? '')
  const [sandbox, setSandbox] = useState(settings.sandbox)
  const [saved, setSaved] = useState(false)

  const needsSecret = !settings.has_secret_key
  const needsXSignature = !settings.has_x_signature_key
  const canSave =
    collectionId.trim() !== '' &&
    (!needsSecret || secretKey.trim() !== '') &&
    (!needsXSignature || xSignatureKey.trim() !== '')

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    setSaved(false)
    update.mutate(
      {
        secret_key: secretKey.trim() || undefined,
        x_signature_key: xSignatureKey.trim() || undefined,
        collection_id: collectionId.trim(),
        sandbox,
      },
      {
        onSuccess: () => {
          setSecretKey('')
          setXSignatureKey('')
          setSaved(true)
        },
      },
    )
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle>{t('admin.operatorDetail.billplz.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('admin.operatorDetail.billplz.description')}
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          {settings.enabled && (
            <Badge variant="outline">
              {settings.sandbox
                ? t('admin.operatorDetail.billplz.modeSandbox')
                : t('admin.operatorDetail.billplz.modeLive')}
            </Badge>
          )}
          <Badge variant={settings.enabled ? 'success' : 'outline'}>
            {settings.enabled
              ? t('admin.operatorDetail.billplz.statusEnabled')
              : t('admin.operatorDetail.billplz.statusDisabled')}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="flex flex-col gap-4" autoComplete="off">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="billplz_secret_key">{t('admin.operatorDetail.billplz.secretKey')}</Label>
              <Input
                id="billplz_secret_key"
                type="password"
                autoComplete="off"
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                placeholder={
                  settings.has_secret_key
                    ? '••••••••••••'
                    : t('admin.operatorDetail.billplz.keyPlaceholder')
                }
              />
              {settings.has_secret_key && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.operatorDetail.billplz.keyStored')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="billplz_x_signature_key">
                {t('admin.operatorDetail.billplz.xSignatureKey')}
              </Label>
              <Input
                id="billplz_x_signature_key"
                type="password"
                autoComplete="off"
                value={xSignatureKey}
                onChange={(e) => setXSignatureKey(e.target.value)}
                placeholder={
                  settings.has_x_signature_key
                    ? '••••••••••••'
                    : t('admin.operatorDetail.billplz.keyPlaceholder')
                }
              />
              {settings.has_x_signature_key && (
                <p className="text-xs text-muted-foreground">
                  {t('admin.operatorDetail.billplz.keyStored')}
                </p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="billplz_collection_id">
                {t('admin.operatorDetail.billplz.collectionId')}
              </Label>
              <Input
                id="billplz_collection_id"
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-2 sm:pt-6">
              <Checkbox
                id="billplz_sandbox"
                checked={sandbox}
                onCheckedChange={(checked) => setSandbox(checked === true)}
              />
              <Label htmlFor="billplz_sandbox">{t('admin.operatorDetail.billplz.sandbox')}</Label>
            </div>
          </div>

          <p className="text-xs text-muted-foreground">{t('admin.operatorDetail.billplz.hint')}</p>

          {test.data && (
            <div
              role="status"
              className={
                test.data.ok
                  ? 'rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-400'
                  : 'rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400'
              }
            >
              <p className="font-medium">
                {test.data.ok
                  ? t('admin.operatorDetail.billplz.test.ok', { title: test.data.collection_title ?? '—' })
                  : t(`admin.operatorDetail.billplz.test.${test.data.reason}`)}
              </p>
              {test.data.ok && (
                <p className="mt-1 text-xs">{t('admin.operatorDetail.billplz.test.xSignatureNote')}</p>
              )}
              {test.data.warnings.map((warning) => (
                <p key={warning} className="mt-1 text-xs">
                  {t(`admin.operatorDetail.billplz.test.${warning}`)}
                </p>
              ))}
            </div>
          )}
          {test.isError && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.operatorDetail.billplz.test.error')}
            </p>
          )}

          {update.isError && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.operatorDetail.billplz.saveError')}
            </p>
          )}
          {saved && !update.isError && (
            <p role="status" className="text-sm text-muted-foreground">
              {t('admin.operatorDetail.billplz.saved')}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={!canSave || update.isPending}>
              {update.isPending
                ? t('admin.operatorDetail.billplz.saving')
                : t('admin.operatorDetail.billplz.save')}
            </Button>

            {settings.enabled && (
              <Button
                type="button"
                variant="outline"
                disabled={test.isPending}
                onClick={() => test.mutate()}
              >
                {test.isPending
                  ? t('admin.operatorDetail.billplz.test.testing')
                  : t('admin.operatorDetail.billplz.test.button')}
              </Button>
            )}

            {settings.enabled && (
              <AlertDialog>
                <AlertDialogTrigger
                  render={
                    <Button type="button" variant="destructive">
                      {t('admin.operatorDetail.billplz.disable')}
                    </Button>
                  }
                />
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {t('admin.operatorDetail.billplz.disableConfirm')}
                    </AlertDialogTitle>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                    <AlertDialogAction onClick={() => disable.mutate()}>
                      {t('admin.operatorDetail.billplz.disable')}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
