import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useParams } from 'react-router-dom'
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
import { useRegisterParent, useTenantByCode } from '@/hooks/useRegistration'

const registerSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  ic_number: z.string().min(1, 'Required'),
  phone: z.string().min(1, 'Required'),
  email: z.string().email(),
  address: z.string().optional(),
  password: z.string().min(8, 'At least 8 characters'),
})

type RegisterForm = z.infer<typeof registerSchema>

export function Register() {
  const { code } = useParams<{ code: string }>()
  const navigate = useNavigate()
  const { data: tenant, isLoading, isError } = useTenantByCode(code!)
  const register = useRegisterParent(code!)
  const {
    register: registerField,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterForm>({ resolver: zodResolver(registerSchema) })

  const onSubmit = (values: RegisterForm) => {
    register.mutate(values, {
      onSuccess: () => navigate('/parent/dashboard'),
    })
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>
  }

  if (isError || !tenant) {
    return <p className="text-sm text-destructive">Registration link not found.</p>
  }

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>Register with {tenant.company_name}</CardTitle>
        <CardDescription>Create your parent account to enroll your children</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...registerField('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ic_number">IC number</Label>
            <Input id="ic_number" {...registerField('ic_number')} />
            {errors.ic_number && (
              <p className="text-sm text-destructive">{errors.ic_number.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...registerField('phone')} />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...registerField('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="address">Address (optional)</Label>
            <Input id="address" {...registerField('address')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...registerField('password')} />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>
          {register.isError && (
            <p className="text-sm text-destructive">
              Registration failed. Check your details and try again.
            </p>
          )}
          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? 'Creating account…' : 'Register'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
