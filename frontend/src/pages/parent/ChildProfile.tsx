import { useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { AvatarUpload } from '@/components/AvatarUpload'
import {
  useMyStudents,
  useUpdateMyStudent,
  useUploadMyStudentAvatar,
} from '@/hooks/useParentPortal'
import type { Student } from '@/api/parentPortal'
import { BackLink } from '@/components/BackLink'

const childSchema = z.object({
  full_name: z.string().min(1),
  date_of_birth: z.string().min(1),
  gender: z.enum(['male', 'female']).optional(),
  teacher_name: z.string().optional(),
  class_name: z.string().optional(),
  school_phone: z.string().optional(),
})

type ChildForm = z.infer<typeof childSchema>

function toFormValues(student: Student): ChildForm {
  return {
    full_name: student.full_name,
    // The API may send a full timestamp; the date input only takes YYYY-MM-DD.
    date_of_birth: student.date_of_birth.slice(0, 10),
    gender: student.gender ?? undefined,
    teacher_name: student.teacher_name ?? '',
    class_name: student.class_name ?? '',
    school_phone: student.school_phone ?? '',
  }
}

function ageFrom(dateOfBirth: string): number | null {
  const born = new Date(dateOfBirth)
  if (Number.isNaN(born.getTime())) return null
  const today = new Date()
  let age = today.getFullYear() - born.getFullYear()
  const hadBirthday =
    today.getMonth() > born.getMonth() ||
    (today.getMonth() === born.getMonth() && today.getDate() >= born.getDate())
  if (!hadBirthday) age -= 1
  return age >= 0 ? age : null
}

/** One child, on its own page: the parent keeps their name, age, sex and photo up to date. */
export function ChildProfile() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const { data: students, isLoading } = useMyStudents()
  const student = students?.find((s) => String(s.id) === id)

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (!student) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">{t('parent.child.notFound')}</p>
        <BackLink to="/parent/dashboard">{t('parent.child.back')}</BackLink>
      </div>
    )
  }

  return <ChildProfileForm student={student} />
}

function ChildProfileForm({ student }: { student: Student }) {
  const { t } = useTranslation()
  const update = useUpdateMyStudent(student.id)
  const uploadAvatar = useUploadMyStudentAvatar(student.id)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors, isDirty },
  } = useForm<ChildForm>({
    resolver: zodResolver(childSchema),
    defaultValues: toFormValues(student),
  })

  // Pick up the saved values once the list refetches after a save.
  useEffect(() => {
    reset(toFormValues(student))
  }, [student, reset])

  const gender = watch('gender')
  const age = ageFrom(watch('date_of_birth'))
  const today = new Date().toISOString().slice(0, 10)

  const onSubmit = (values: ChildForm) => {
    update.mutate({
      full_name: values.full_name,
      date_of_birth: values.date_of_birth,
      gender: values.gender ?? null,
      teacher_name: values.teacher_name?.trim() || null,
      class_name: values.class_name?.trim() || null,
      school_phone: values.school_phone?.trim() || null,
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-4">
      <BackLink to="/parent/dashboard">{t('parent.child.back')}</BackLink>

      <Card>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="truncate text-lg font-medium">{student.full_name}</p>
            <p className="truncate text-sm text-muted-foreground">
              {[student.school_name, student.route?.name].filter(Boolean).join(' · ')}
            </p>
          </div>
          <AvatarUpload
            imageUrl={student.avatar_url}
            fallback={student.full_name.charAt(0).toUpperCase()}
            isUploading={uploadAvatar.isPending}
            onUpload={(file) => uploadAvatar.mutate(file)}
          />
        </CardContent>
      </Card>
      {uploadAvatar.isError && (
        <p className="text-sm text-destructive">{t('parent.child.photoError')}</p>
      )}

      <Card>
        <CardContent>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="full_name">{t('parent.child.fullName')}</Label>
              <Input id="full_name" {...register('full_name')} />
              {errors.full_name && (
                <p className="text-sm text-destructive">{t('parent.child.nameRequired')}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="date_of_birth">{t('parent.child.dateOfBirth')}</Label>
              <Input id="date_of_birth" type="date" max={today} {...register('date_of_birth')} />
              {age !== null && (
                <p className="text-sm text-muted-foreground">{t('parent.child.age', { count: age })}</p>
              )}
              {errors.date_of_birth && (
                <p className="text-sm text-destructive">{t('parent.child.dateRequired')}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>{t('parent.child.gender')}</Label>
              <RadioGroup
                value={gender ?? ''}
                onValueChange={(v) =>
                  setValue('gender', v as 'male' | 'female', { shouldDirty: true })
                }
              >
                <RadioGroupItem value="male">{t('parent.child.male')}</RadioGroupItem>
                <RadioGroupItem value="female">{t('parent.child.female')}</RadioGroupItem>
              </RadioGroup>
            </div>

            <div className="flex flex-col gap-4 border-t pt-4">
              <p className="text-sm font-medium">{t('parent.child.schoolDetails')}</p>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="teacher_name">{t('parent.child.teacherName')}</Label>
                <Input id="teacher_name" {...register('teacher_name')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="class_name">{t('parent.child.className')}</Label>
                <Input id="class_name" {...register('class_name')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="school_phone">{t('parent.child.schoolPhone')}</Label>
                <Input id="school_phone" type="tel" inputMode="tel" {...register('school_phone')} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={update.isPending || !isDirty}>
                {update.isPending ? t('common.saving') : t('common.save')}
              </Button>
              {update.isError && (
                <p className="text-sm text-destructive">{t('parent.child.saveError')}</p>
              )}
              {update.isSuccess && !isDirty && (
                <p className="text-sm text-muted-foreground">{t('common.saved')}</p>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <p className="text-sm text-muted-foreground">{t('parent.child.operatorNote')}</p>
    </div>
  )
}
