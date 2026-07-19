import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useParams, useSearchParams } from 'react-router-dom'
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
import { useResetPassword } from '@/hooks/useAuth'

const resetPasswordSchema = z
  .object({
    password: z.string().min(8),
    password_confirmation: z.string().min(1),
  })
  .refine((data) => data.password === data.password_confirmation, {
    path: ['password_confirmation'],
    message: 'MISMATCH',
  })

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>

export function ResetPassword() {
  const { t } = useTranslation()
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email') ?? ''
  const resetPassword = useResetPassword()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordForm>({ resolver: zodResolver(resetPasswordSchema) })

  const onSubmit = (values: ResetPasswordForm) => {
    resetPassword.mutate({
      token: token!,
      email,
      password: values.password,
      password_confirmation: values.password_confirmation,
    })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.resetPassword.title')}</CardTitle>
        <CardDescription>{t('auth.resetPassword.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {resetPassword.isSuccess ? (
          <p className="text-sm text-muted-foreground">{t('auth.resetPassword.success')}</p>
        ) : (
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">{t('auth.resetPassword.password')}</Label>
              <Input id="password" type="password" {...register('password')} />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password_confirmation">
                {t('auth.resetPassword.passwordConfirmation')}
              </Label>
              <Input
                id="password_confirmation"
                type="password"
                {...register('password_confirmation')}
              />
              {errors.password_confirmation && (
                <p className="text-sm text-destructive">
                  {t('auth.resetPassword.passwordMismatch')}
                </p>
              )}
            </div>
            {resetPassword.isError && (
              <p className="text-sm text-destructive">{t('auth.resetPassword.failed')}</p>
            )}
            <Button type="submit" disabled={resetPassword.isPending}>
              {resetPassword.isPending
                ? t('auth.resetPassword.submitting')
                : t('auth.resetPassword.submit')}
            </Button>
          </form>
        )}
        <div className="mt-4 text-center text-sm text-muted-foreground">
          <Link to="/login" className="hover:text-foreground">
            {t('auth.resetPassword.backToLogin')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
