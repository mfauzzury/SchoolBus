import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button, buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  useReactivateOperator,
  useSendOperatorPasswordReset,
  useStartImpersonation,
  useSuspendOperator,
} from '@/hooks/useAdmin'
import { useCan } from '@/hooks/useAuth'
import type { AdminOperatorDetail } from '@/api/admin'

/** The buttons on top of an operator's page. Each one only shows for levels that may use it. */
export function OperatorActions({ operator }: { operator: AdminOperatorDetail }) {
  const { t } = useTranslation()
  const canEdit = useCan('operators.edit')
  const canImpersonate = useCan('operators.impersonate')
  const canSuspend = useCan('operators.suspend')

  const suspend = useSuspendOperator(operator.id)
  const reactivate = useReactivateOperator(operator.id)
  const passwordReset = useSendOperatorPasswordReset(operator.id)
  const impersonate = useStartImpersonation()
  const [reason, setReason] = useState('')

  const suspended = operator.status === 'suspended'

  const logInAs = () =>
    impersonate.mutate(operator.id, {
      // A different login now owns the session, so start the app fresh as them.
      onSuccess: () => window.location.assign('/operator/dashboard'),
    })

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {canEdit && (
          <Link
            to={`/admin/operators/${operator.id}/edit`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
          >
            {t('common.edit')}
          </Link>
        )}

        {canImpersonate && (
          <Button variant="outline" size="sm" disabled={impersonate.isPending} onClick={logInAs}>
            {t('admin.operatorActions.logInAs')}
          </Button>
        )}

        {canEdit && (
          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button type="button" variant="outline" size="sm">
                  {t('admin.operatorActions.sendReset')}
                </Button>
              }
            />
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('admin.operatorActions.resetTitle')}</AlertDialogTitle>
              </AlertDialogHeader>
              <p className="text-sm text-muted-foreground">
                {t('admin.operatorActions.resetHelp', { email: operator.email })}
              </p>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                <AlertDialogAction onClick={() => passwordReset.mutate()}>
                  {t('admin.operatorActions.sendReset')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {canSuspend &&
          (suspended ? (
            <Button
              size="sm"
              disabled={reactivate.isPending}
              onClick={() => reactivate.mutate()}
            >
              {t('admin.operatorActions.reactivate')}
            </Button>
          ) : (
            <AlertDialog onOpenChange={(open) => open && setReason('')}>
              <AlertDialogTrigger
                render={
                  <Button type="button" variant="destructive" size="sm">
                    {t('admin.operatorActions.suspend')}
                  </Button>
                }
              />
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {t('admin.operatorActions.suspendTitle', { name: operator.company_name })}
                  </AlertDialogTitle>
                </AlertDialogHeader>
                <p className="text-sm text-muted-foreground">
                  {t('admin.operatorActions.suspendHelp')}
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="suspend_reason">{t('admin.operatorActions.reason')}</Label>
                  <Textarea
                    id="suspend_reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder={t('admin.operatorActions.reasonPlaceholder')}
                    maxLength={1000}
                  />
                </div>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                  <AlertDialogAction onClick={() => suspend.mutate(reason.trim())}>
                    {t('admin.operatorActions.suspend')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          ))}
      </div>

      {passwordReset.isSuccess && (
        <p role="status" className="text-sm text-green-700 dark:text-green-400">
          {t('admin.operatorActions.resetSent', { email: passwordReset.data.email })}
        </p>
      )}
      {(suspend.isError || reactivate.isError || passwordReset.isError || impersonate.isError) && (
        <p role="alert" className="text-sm text-destructive">
          {impersonate.isError
            ? t('admin.operatorActions.noOwnerLogin')
            : t('admin.operatorActions.error')}
        </p>
      )}
    </div>
  )
}
