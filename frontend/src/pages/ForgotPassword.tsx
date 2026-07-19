import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useForgotPassword } from '@/hooks/useAuth'

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

type ForgotPasswordForm = z.infer<typeof forgotPasswordSchema>

export function ForgotPassword() {
  const { t } = useTranslation()
  const forgotPassword = useForgotPassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordForm>({ resolver: zodResolver(forgotPasswordSchema) })

  const onSubmit = (values: ForgotPasswordForm) => {
    forgotPassword.mutate(values.email)
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.forgotPassword.title')}</CardTitle>
        <CardDescription>{t('auth.forgotPassword.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {forgotPassword.isSuccess ? (
          <p className="text-sm text-muted-foreground">{t('auth.forgotPassword.success')}</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">{t('auth.forgotPassword.email')}</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
            <Button type="submit" disabled={forgotPassword.isPending}>
              {forgotPassword.isPending
                ? t('auth.forgotPassword.submitting')
                : t('auth.forgotPassword.submit')}
            </Button>
          </form>
        )}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="hover:text-foreground">
            {t('auth.forgotPassword.backToLogin')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
