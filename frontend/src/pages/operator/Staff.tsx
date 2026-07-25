import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { AvatarUpload } from '@/components/AvatarUpload'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Pagination } from '@/components/ui/pagination'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useCreateStaff, useDeleteStaff, useStaff, useUpdateStaff, useUploadStaffAvatar } from '@/hooks/useStaff'
import { usePagination } from '@/hooks/usePagination'
import type { Staff as StaffMember } from '@/api/staff'

const staffSchema = z.object({
  full_name: z.string().min(1),
  ic_number: z.string().min(1),
  phone: z.string().min(1),
  role: z.enum(['driver', 'conductor']),
  license_expiry_date: z.string().optional().nullable(),
  status: z.enum(['active', 'inactive']),
})

type StaffForm = z.infer<typeof staffSchema>

function toFormValues(staff?: StaffMember): StaffForm {
  return staff
    ? { ...staff, license_expiry_date: staff.license_expiry_date ?? '' }
    : {
        full_name: '',
        ic_number: '',
        phone: '',
        role: 'driver',
        license_expiry_date: '',
        status: 'active',
      }
}

function StaffFormDialog({
  staff,
  open,
  onOpenChange,
}: {
  staff?: StaffMember
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const create = useCreateStaff()
  const update = useUpdateStaff()
  const uploadAvatar = useUploadStaffAvatar()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<StaffForm>({
    resolver: zodResolver(staffSchema),
    defaultValues: toFormValues(staff),
  })

  useEffect(() => {
    if (open) reset(toFormValues(staff))
  }, [open, staff, reset])

  const role = watch('role')
  const status = watch('status')
  const pending = create.isPending || update.isPending

  const onSubmit = (values: StaffForm) => {
    const onSuccess = () => {
      onOpenChange(false)
      reset()
    }
    const payload = { ...values, license_expiry_date: values.license_expiry_date || null }
    if (staff) {
      update.mutate({ id: staff.id, input: payload }, { onSuccess })
    } else {
      create.mutate(payload, { onSuccess })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {staff ? t('operator.staff.editStaffMember') : t('operator.staff.addStaffMember')}
          </DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          {staff && (
            <AvatarUpload
              imageUrl={staff.avatar_url}
              fallback={staff.full_name.charAt(0).toUpperCase()}
              isUploading={uploadAvatar.isPending}
              onUpload={(file) => uploadAvatar.mutate({ id: staff.id, file })}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">{t('operator.staff.fullName')}</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ic_number">{t('operator.staff.icNumber')}</Label>
            <Input id="ic_number" {...register('ic_number')} />
            {errors.ic_number && (
              <p className="text-sm text-destructive">{errors.ic_number.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">{t('operator.staff.phone')}</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.staff.role')}</Label>
            <Select
              items={{ driver: t('operator.staff.driver'), conductor: t('operator.staff.conductor') }}
              value={role}
              onValueChange={(v) => setValue('role', v as StaffForm['role'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('operator.staff.selectRole')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">{t('operator.staff.driver')}</SelectItem>
                <SelectItem value="conductor">{t('operator.staff.conductor')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === 'driver' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license_expiry_date">{t('operator.staff.licenseExpiryDate')}</Label>
              <Input
                id="license_expiry_date"
                type="date"
                {...register('license_expiry_date')}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.staff.status')}</Label>
            <Select
              items={{ active: t('common.active'), inactive: t('common.inactive') }}
              value={status}
              onValueChange={(v) => setValue('status', v as StaffForm['status'])}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('operator.staff.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('common.active')}</SelectItem>
                <SelectItem value="inactive">{t('common.inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? t('common.saving') : t('common.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Staff() {
  const { t } = useTranslation()
  const { data: staff, isLoading } = useStaff()
  const deleteStaff = useDeleteStaff()
  const isAdmin = useIsOperatorAdmin()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | undefined>(undefined)
  const { page, setPage, pageCount, pageItems: pagedStaff } = usePagination(staff ?? [])

  const openCreate = () => {
    setEditingStaff(undefined)
    setDialogOpen(true)
  }

  const openEdit = (member: StaffMember) => {
    setEditingStaff(member)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('operator.staff.title')}</CardTitle>
          {isAdmin && <Button onClick={openCreate}>{t('operator.staff.addStaff')}</Button>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>{t('operator.staff.name')}</TableHead>
                  <TableHead>{t('operator.staff.role')}</TableHead>
                  <TableHead>{t('operator.staff.phone')}</TableHead>
                  <TableHead>{t('operator.staff.status')}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t('operator.staff.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedStaff.map((member) => (
                  <TableRow key={member.id}>
                    <TableCell>
                      {member.avatar_url ? (
                        <img src={member.avatar_url} alt="" className="size-8 rounded-full border object-cover" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-full border bg-muted/50 text-xs text-muted-foreground">
                          {member.full_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{member.full_name}</TableCell>
                    <TableCell>{t(`operator.staff.${member.role}`)}</TableCell>
                    <TableCell>{member.phone}</TableCell>
                    <TableCell>
                      <Badge variant={member.status === 'active' ? 'success' : 'outline'}>
                        {t(`common.status.${member.status}`)}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
                            {t('common.edit')}
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger
                              render={
                                <Button variant="destructive" size="sm">
                                  {t('common.delete')}
                                </Button>
                              }
                            />
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t('operator.staff.deleteConfirm', { name: member.full_name })}
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteStaff.mutate(member.id)}>
                                  {t('common.delete')}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <Pagination page={page} pageCount={pageCount} onPageChange={setPage} />
        </CardContent>
      </Card>

      <StaffFormDialog staff={editingStaff} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
