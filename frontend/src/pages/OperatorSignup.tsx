import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
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
  company_name: z.string().min(1, 'Required'),
  contact_person: z.string().min(1, 'Required'),
  contact_phone: z.string().min(1, 'Required'),
  email: z.string().email(),
  password: z.string().min(8, 'At least 8 characters'),
})

type SignupForm = z.infer<typeof signupSchema>

export function OperatorSignup() {
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
        <CardTitle>Set up your workspace</CardTitle>
        <CardDescription>Start managing your fleet and collections</CardDescription>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="company_name">Company name</Label>
            <Input id="company_name" {...registerField('company_name')} />
            {errors.company_name && (
              <p className="text-sm text-destructive">{errors.company_name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_person">Your name</Label>
            <Input id="contact_person" {...registerField('contact_person')} />
            {errors.contact_person && (
              <p className="text-sm text-destructive">{errors.contact_person.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact_phone">Phone</Label>
            <Input id="contact_phone" {...registerField('contact_phone')} />
            {errors.contact_phone && (
              <p className="text-sm text-destructive">{errors.contact_phone.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...registerField('email')} />
            {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
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
              Could not create your workspace. Check your details and try again.
            </p>
          )}
          <Button type="submit" disabled={register.isPending}>
            {register.isPending ? 'Creating workspace…' : 'Start free'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
