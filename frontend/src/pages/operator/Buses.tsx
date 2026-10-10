import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Bus as BusIcon } from 'lucide-react'
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
import { useBuses, useCreateBus, useDeleteBus, useUpdateBus, useUploadBusAvatar } from '@/hooks/useBuses'
import { usePagination } from '@/hooks/usePagination'
import type { Bus } from '@/api/buses'

const busSchema = z.object({
  plate_number: z.string().min(1),
  capacity: z.string().refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1),
  status: z.enum(['active', 'maintenance', 'retired']),
})

type BusForm = z.infer<typeof busSchema>

function toFormValues(bus?: Bus): BusForm {
  return bus
    ? { plate_number: bus.plate_number, capacity: String(bus.capacity), status: bus.status }
    : { plate_number: '', capacity: '1', status: 'active' }
}

function BusFormDialog({
  bus,
  open,
  onOpenChange,
}: {
  bus?: Bus
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const create = useCreateBus()
  const update = useUpdateBus()
  const uploadAvatar = useUploadBusAvatar()
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<BusForm>({
    resolver: zodResolver(busSchema),
    defaultValues: toFormValues(bus),
  })

  useEffect(() => {
    if (open) reset(toFormValues(bus))
  }, [open, bus, reset])

  const status = watch('status')
  const pending = create.isPending || update.isPending

  const onSubmit = (values: BusForm) => {
    const onSuccess = () => {
      onOpenChange(false)
      reset()
    }
    const payload = { ...values, capacity: Number(values.capacity) }
    if (bus) {
      update.mutate({ id: bus.id, input: payload }, { onSuccess })
    } else {
      create.mutate(payload, { onSuccess })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{bus ? t('operator.buses.editBus') : t('operator.buses.addBus')}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          {bus && (
            <AvatarUpload
              shape="square"
              imageUrl={bus.avatar_url}
              fallback={<BusIcon className="size-6" />}
              isUploading={uploadAvatar.isPending}
              onUpload={(file) => uploadAvatar.mutate({ id: bus.id, file })}
            />
          )}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plate_number">{t('operator.buses.plateNumber')}</Label>
            <Input id="plate_number" {...register('plate_number')} />
            {errors.plate_number && (
              <p className="text-sm text-destructive">{errors.plate_number.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacity">{t('operator.buses.capacity')}</Label>
            <Input id="capacity" type="number" {...register('capacity')} />
            {errors.capacity && (
              <p className="text-sm text-destructive">{errors.capacity.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.buses.status')}</Label>
            <Select
              items={{
                active: t('common.status.active'),
                maintenance: t('common.status.maintenance'),
                retired: t('common.status.retired'),
              }}
              value={status}
              onValueChange={(v) => setValue('status', v as BusForm['status'])}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('operator.buses.selectStatus')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{t('common.status.active')}</SelectItem>
                <SelectItem value="maintenance">{t('common.status.maintenance')}</SelectItem>
                <SelectItem value="retired">{t('common.status.retired')}</SelectItem>
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

const statusVariant: Record<Bus['status'], 'success' | 'outline' | 'destructive'> = {
  active: 'success',
  maintenance: 'outline',
  retired: 'destructive',
}

export function Buses() {
  const { t } = useTranslation()
  const { data: buses, isLoading } = useBuses()
  const deleteBus = useDeleteBus()
  const isAdmin = useIsOperatorAdmin()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBus, setEditingBus] = useState<Bus | undefined>(undefined)
  const { page, setPage, pageCount, pageItems: pagedBuses } = usePagination(buses ?? [])

  const openCreate = () => {
    setEditingBus(undefined)
    setDialogOpen(true)
  }

  const openEdit = (bus: Bus) => {
    setEditingBus(bus)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('operator.buses.title')}</CardTitle>
          {isAdmin && <Button onClick={openCreate}>{t('operator.buses.addBus')}</Button>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12" />
                  <TableHead>{t('operator.buses.plateNumber')}</TableHead>
                  <TableHead>{t('operator.buses.capacity')}</TableHead>
                  <TableHead>{t('operator.buses.status')}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t('operator.buses.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedBuses.map((bus) => (
                  <TableRow key={bus.id}>
                    <TableCell>
                      {bus.avatar_url ? (
                        <img src={bus.avatar_url} alt="" className="size-8 rounded-md border object-cover" />
                      ) : (
                        <div className="flex size-8 items-center justify-center rounded-md border bg-muted/50 text-muted-foreground">
                          <BusIcon className="size-4" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{bus.plate_number}</TableCell>
                    <TableCell>{bus.capacity}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[bus.status]}>{t(`common.status.${bus.status}`)}</Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(bus)}>
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
                                  {t('operator.buses.deleteConfirm', { plate: bus.plate_number })}
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteBus.mutate(bus.id)}>
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

      <BusFormDialog bus={editingBus} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
