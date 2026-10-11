import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useLogin } from '@/hooks/useAuth'
import { isPlatformUser } from '@/lib/platform'

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  remember: z.boolean(),
})

type LoginForm = z.infer<typeof loginSchema>

export function Login() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionExpired = searchParams.get('expired') === '1'
  const login = useLogin()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '', remember: false },
  })

  const remember = watch('remember')

  const onSubmit = (values: LoginForm) => {
    login.mutate(values, {
      onSuccess: (data) => {
        if (isPlatformUser(data.roles)) {
          navigate('/admin/dashboard')
        } else if (data.roles.includes('parent')) {
          navigate('/parent/dashboard')
        } else {
          navigate('/operator/dashboard')
        }
      },
    })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.login.title')}</CardTitle>
        <CardDescription>{t('auth.login.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {sessionExpired && (
          <p className="mb-4 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {t('auth.login.sessionExpired')}
          </p>
        )}
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t('auth.login.email')}</Label>
            <Input id="email" type="email" {...register('email')} />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">{t('auth.login.password')}</Label>
              <Link to="/forgot-password" className="text-sm text-muted-foreground hover:text-foreground">
                {t('auth.login.forgotPassword')}
              </Link>
            </div>
            <Input id="password" type="password" {...register('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <Checkbox
              checked={remember}
              onCheckedChange={(checked) => setValue('remember', checked === true)}
            />
            {t('auth.login.rememberMe')}
          </label>
          {login.isError && (
            <p className="text-sm text-destructive">{t('auth.login.invalidCredentials')}</p>
          )}
          <Button type="submit" disabled={login.isPending}>
            {login.isPending ? t('auth.login.submitting') : t('auth.login.submit')}
          </Button>
        </form>
        <div className="mt-4 flex flex-col gap-1.5 text-center text-sm text-muted-foreground">
          <Link to="/" className="hover:text-foreground">
            {t('auth.login.registerParentPrompt')}
          </Link>
          <Link to="/signup" className="hover:text-foreground">
            {t('auth.login.registerOperatorPrompt')}
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
