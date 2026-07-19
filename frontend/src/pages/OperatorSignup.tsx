import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
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
import { useRegisterOperator } from '@/hooks/useOperatorRegistration'

const signupSchema = z.object({
  company_name: z.string().min(1),
  contact_person: z.string().min(1),
  contact_phone: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
})

type SignupForm = z.infer<typeof signupSchema>

export function OperatorSignup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const register = useRegisterOperator()
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupForm>({ resolver: zodResolver(signupSchema) })

  const onSubmit = (values: SignupForm) => {
    register.mutate(values, {
      onSuccess: () => navigate('/operator/dashboard'),
    })
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>{t('auth.operatorSignup.title')}</CardTitle>
        <CardDescription>{t('auth.operatorSignup.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company_name">{t('auth.operatorSignup.companyName')}</Label>
            <Input id="company_name" {...registerField('company_name')} />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_person">{t('auth.operatorSignup.contactPerson')}</Label>
            <Input id="contact_person" {...registerField('contact_person')} />
            {errors.contact_person && (
              <p className="text-sm text-destructive">{errors.contact_person.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_phone">{t('auth.operatorSignup.contactPhone')}</Label>
            <Input id="contact_phone" {...registerField('contact_phone')} />
            {errors.contact_phone && (
              <p className="text-sm text-destructive">{errors.contact_phone.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">{t('auth.operatorSignup.email')}</Label>
            <Input id="email" type="email" {...registerField('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">{t('auth.operatorSignup.password')}</Label>
            <Input id="password" type="password" {...registerField('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          {register.isError && (
            <p className="text-sm text-destructive">{t('auth.operatorSignup.failed')}</p>
          )}
          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? t('auth.operatorSignup.submitting') : t('auth.operatorSignup.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
