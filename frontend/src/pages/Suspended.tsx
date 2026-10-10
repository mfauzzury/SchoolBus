import { useTranslation } from 'react-i18next'
import { PauseCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useLogout } from '@/hooks/useAuth'

/**
 * Shown instead of the app when the platform team has put the operator on hold.
 * Plain wording: the operator is told to contact us; a parent is just told the
 * service isn't available (it is not their problem to fix).
 */
export function Suspended({ isParent, companyName }: { isParent: boolean; companyName?: string }) {
  const { t } = useTranslation()
  const logout = useLogout()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <PauseCircle className="size-12 text-muted-foreground" aria-hidden />
      <h1 className="text-xl font-medium">
        {isParent ? t('suspended.parentTitle') : t('suspended.operatorTitle')}
      </h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {isParent
          ? t('suspended.parentBody', { company: companyName })
          : t('suspended.operatorBody')}
      </p>
      <div className="flex items-center gap-3">
        <LanguageSwitcher />
        <Button variant="outline" onClick={() => logout.mutate()}>
          {t('common.logOut')}
        </Button>
      </div>
    </div>
  )
}
