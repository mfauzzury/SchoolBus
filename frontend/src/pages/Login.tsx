import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
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
import { safeNextPath } from '@/lib/nextPath'
import { isPlatformUser } from '@/lib/platform'
import { OperatorCodeLookup } from '@/components/OperatorCodeLookup'
import { cn } from '@/lib/utils'

type Audience = 'parent' | 'operator'

const AUDIENCE_KEY = 'login-audience'

// The ?as= link wins, then whichever tab this browser used last, then parent.
function initialAudience(asParam: string | null): Audience {
  if (asParam === 'operator' || asParam === 'parent') return asParam
  try {
    return localStorage.getItem(AUDIENCE_KEY) === 'operator' ? 'operator' : 'parent'
  } catch {
    return 'parent'
  }
}

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
  const [audience, setAudience] = useState<Audience>(() => initialAudience(searchParams.get('as')))
  const pickAudience = (next: Audience) => {
    setAudience(next)
    try {
      localStorage.setItem(AUDIENCE_KEY, next)
    } catch {
      // Remembering the tab is a convenience only.
    }
  }
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
        // Back to the page they were sent here from, when there is one; the route guards turn away a wrong role.
        const next = safeNextPath(searchParams.get('next'))
        if (next) {
          navigate(next)
        } else if (isPlatformUser(data.roles)) {
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
        <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {t('auth.login.tabsLabel')}
        </p>
        <div
          role="tablist"
          aria-label={t('auth.login.tabsLabel')}
          className="mb-3 grid h-10 grid-cols-2 gap-0.5 rounded-lg border bg-muted p-0.5"
        >
          {(['parent', 'operator'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={audience === tab}
              onClick={() => pickAudience(tab)}
              className={cn(
                'flex items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition-colors',
                audience === tab
                  ? 'bg-foreground text-background shadow-sm'
                  : 'text-muted-foreground hover:bg-background hover:text-foreground',
              )}
            >
              <span
                aria-hidden
                className={cn(
                  'flex size-4 shrink-0 items-center justify-center rounded-full border-2',
                  audience === tab ? 'border-background' : 'border-muted-foreground/60',
                )}
              >
                {audience === tab && <span className="size-1.5 rounded-full bg-background" />}
              </span>
              {t(tab === 'parent' ? 'auth.login.tabParent' : 'auth.login.tabOperator')}
            </button>
          ))}
        </div>
        <CardTitle>{t('auth.login.title')}</CardTitle>
        <CardDescription>
          {t(audience === 'parent' ? 'auth.login.descriptionParent' : 'auth.login.description')}
        </CardDescription>
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
        <div className="mt-5 flex flex-col gap-3 border-t pt-5 text-center">
          {audience === 'parent' ? (
            <>
              <div>
                <p className="text-sm font-medium">{t('auth.login.newParentTitle')}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {t('auth.login.newParentHint')}
                </p>
              </div>
              <OperatorCodeLookup actionLabel={t('auth.login.newParentAction')} />
            </>
          ) : (
            <>
              <p className="text-sm font-medium">{t('auth.login.newOperatorTitle')}</p>
              <Link to="/signup" className={cn(buttonVariants({ variant: 'outline' }), 'w-full')}>
                {t('auth.login.newOperatorAction')}
              </Link>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
