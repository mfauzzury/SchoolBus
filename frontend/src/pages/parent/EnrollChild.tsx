import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useSubmitStudentApplication } from '@/hooks/useParentPortal'
import { cn } from '@/lib/utils'

const applySchema = z.object({
  full_name: z.string().min(1),
  date_of_birth: z.string().min(1),
  school_name: z.string().min(1),
  package_type: z.enum(['one_way', 'return']),
})

type ApplyForm = z.infer<typeof applySchema>

export function EnrollChild() {
  const { t } = useTranslation()
  const submit = useSubmitStudentApplication()
  const [submitted, setSubmitted] = useState(false)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ApplyForm>({
    resolver: zodResolver(applySchema),
    defaultValues: {
      full_name: '',
      date_of_birth: '',
      school_name: '',
      package_type: 'return',
    },
  })

  const packageType = watch('package_type')

  const onSubmit = (values: ApplyForm) => {
    submit.mutate(
      {
        full_name: values.full_name,
        date_of_birth: values.date_of_birth,
        school_name: values.school_name,
        package_type: values.package_type,
        billing_period: 'monthly',
      },
      { onSuccess: () => setSubmitted(true) },
    )
  }

  if (submitted) {
    return (
      <Card className="max-w-lg">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <CheckCircle2 className="size-10 text-primary" />
          <p className="text-lg font-medium">{t('parent.enroll.applicationSubmittedTitle')}</p>
          <p className="text-sm text-muted-foreground">
            {t('parent.enroll.applicationSubmittedBody')}
          </p>
          <Link to="/parent/dashboard" className={cn(buttonVariants({ size: 'sm' }), 'mt-2')}>
            {t('parent.enroll.backToDashboard')}
          </Link>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>{t('parent.enroll.title')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('parent.enroll.subtitle')}</p>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">{t('parent.enroll.childFullName')}</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date_of_birth">{t('parent.enroll.dateOfBirth')}</Label>
            <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
            {errors.date_of_birth && (
              <p className="text-sm text-destructive">{errors.date_of_birth.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school_name">{t('parent.enroll.school')}</Label>
            <Input id="school_name" {...register('school_name')} />
            {errors.school_name && (
              <p className="text-sm text-destructive">{errors.school_name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('parent.enroll.package')}</Label>
            <Select
              items={{ one_way: t('common.package.one_way'), return: t('common.package.return') }}
              value={packageType}
              onValueChange={(v) => setValue('package_type', v as ApplyForm['package_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_way">{t('common.package.one_way')}</SelectItem>
                <SelectItem value="return">{t('common.package.return')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {submit.isError && (
            <p className="text-sm text-destructive">{t('parent.enroll.enrollError')}</p>
          )}

          <Button type="submit" disabled={submit.isPending}>
            {submit.isPending ? t('parent.enroll.submitting') : t('parent.enroll.submit')}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
