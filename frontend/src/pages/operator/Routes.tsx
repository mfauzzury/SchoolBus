import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useBuses } from '@/hooks/useBuses'
import { useStaff } from '@/hooks/useStaff'
import { useCreateRoute, useDeleteRoute, useRoutes, useUpdateRoute } from '@/hooks/useRoutes'
import { usePagination } from '@/hooks/usePagination'
import type { Route } from '@/api/routes'
import { formatMoney } from '@/lib/utils'

const UNASSIGNED = 'none'

const routeSchema = z.object({
  name: z.string().min(1),
  zone: z.string().optional(),
  school_destination: z.string().optional(),
  base_monthly_fee: z.string().optional(),
  one_way_monthly_fee: z.string().optional(),
  bus_id: z.string(),
  driver_id: z.string(),
  conductor_id: z.string(),
  stops: z.array(z.object({ name: z.string().min(1) })),
})

type RouteForm = z.infer<typeof routeSchema>

function toFormValues(route?: Route): RouteForm {
  return {
    name: route?.name ?? '',
    zone: route?.zone ?? '',
    school_destination: route?.school_destination ?? '',
    base_monthly_fee: route?.base_monthly_fee ? String(Number(route.base_monthly_fee)) : '',
    one_way_monthly_fee: route?.one_way_monthly_fee ? String(Number(route.one_way_monthly_fee)) : '',
    bus_id: route?.bus_id ? String(route.bus_id) : UNASSIGNED,
    driver_id: route?.driver_id ? String(route.driver_id) : UNASSIGNED,
    conductor_id: route?.conductor_id ? String(route.conductor_id) : UNASSIGNED,
    stops: route?.stops.length
      ? [...route.stops].sort((a, b) => a.sequence - b.sequence).map((s) => ({ name: s.name }))
      : [],
  }
}

function RouteFormDialog({
  route,
  open,
  onOpenChange,
}: {
  route?: Route
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { t } = useTranslation()
  const { data: buses } = useBuses()
  const { data: drivers } = useStaff('driver')
  const { data: conductors } = useStaff('conductor')
  const create = useCreateRoute()
  const update = useUpdateRoute()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    control,
    formState: { errors },
  } = useForm<RouteForm>({
    resolver: zodResolver(routeSchema),
    defaultValues: toFormValues(route),
  })

  useEffect(() => {
    if (open) reset(toFormValues(route))
  }, [open, route, reset])

  const { fields, append, remove } = useFieldArray({ control, name: 'stops' })

  const busId = watch('bus_id')
  const driverId = watch('driver_id')
  const conductorId = watch('conductor_id')
  const pending = create.isPending || update.isPending

  const onSubmit = (values: RouteForm) => {
    const onSuccess = () => onOpenChange(false)
    const payload = {
      name: values.name,
      zone: values.zone || null,
      school_destination: values.school_destination || null,
      base_monthly_fee: values.base_monthly_fee ? Number(values.base_monthly_fee) : null,
      one_way_monthly_fee: values.one_way_monthly_fee ? Number(values.one_way_monthly_fee) : null,
      bus_id: values.bus_id === UNASSIGNED ? null : Number(values.bus_id),
      driver_id: values.driver_id === UNASSIGNED ? null : Number(values.driver_id),
      conductor_id: values.conductor_id === UNASSIGNED ? null : Number(values.conductor_id),
      stops: values.stops.map((s, i) => ({ name: s.name, sequence: i + 1 })),
    }
    if (route) {
      update.mutate({ id: route.id, input: payload }, { onSuccess })
    } else {
      create.mutate(payload, { onSuccess })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{route ? t('operator.routes.editRoute') : t('operator.routes.addRoute')}</DialogTitle>
        </DialogHeader>
        <form className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">{t('operator.routes.routeName')}</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone">{t('operator.routes.zone')}</Label>
            <Input id="zone" {...register('zone')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school_destination">{t('operator.routes.schoolDestination')}</Label>
            <Input id="school_destination" {...register('school_destination')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="base_monthly_fee">{t('operator.routes.baseMonthlyFee')}</Label>
              <Input id="base_monthly_fee" type="number" step="0.01" {...register('base_monthly_fee')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="one_way_monthly_fee">{t('operator.routes.oneWayMonthlyFee')}</Label>
              <Input id="one_way_monthly_fee" type="number" step="0.01" {...register('one_way_monthly_fee')} />
            </div>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">{t('operator.routes.oneWayFeeHint')}</p>

          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.routes.bus')}</Label>
            <Select
              items={{ [UNASSIGNED]: t('common.unassigned'), ...Object.fromEntries((buses ?? []).map((b) => [String(b.id), b.plate_number])) }}
              value={busId}
              onValueChange={(v) => setValue('bus_id', v ?? UNASSIGNED)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('common.unassigned')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>{t('common.unassigned')}</SelectItem>
                {buses?.map((bus) => (
                  <SelectItem key={bus.id} value={String(bus.id)}>
                    {bus.plate_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.routes.driver')}</Label>
            <Select
              items={{ [UNASSIGNED]: t('common.unassigned'), ...Object.fromEntries((drivers ?? []).map((d) => [String(d.id), d.full_name])) }}
              value={driverId}
              onValueChange={(v) => setValue('driver_id', v ?? UNASSIGNED)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('common.unassigned')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>{t('common.unassigned')}</SelectItem>
                {drivers?.map((driver) => (
                  <SelectItem key={driver.id} value={String(driver.id)}>
                    {driver.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>{t('operator.routes.conductor')}</Label>
            <Select
              items={{ [UNASSIGNED]: t('common.unassigned'), ...Object.fromEntries((conductors ?? []).map((c) => [String(c.id), c.full_name])) }}
              value={conductorId}
              onValueChange={(v) => setValue('conductor_id', v ?? UNASSIGNED)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('common.unassigned')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>{t('common.unassigned')}</SelectItem>
                {conductors?.map((conductor) => (
                  <SelectItem key={conductor.id} value={String(conductor.id)}>
                    {conductor.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>{t('operator.routes.stops')}</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '' })}>
                {t('operator.routes.addStop')}
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <span className="w-5 text-sm text-muted-foreground">{index + 1}.</span>
                <Input
                  {...register(`stops.${index}.name` as const)}
                  placeholder={t('operator.routes.stopNamePlaceholder')}
                />
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                  {t('operator.routes.remove')}
                </Button>
              </div>
            ))}
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

export function Routes() {
  const { t } = useTranslation()
  const { data: routes, isLoading } = useRoutes()
  const deleteRoute = useDeleteRoute()
  const isAdmin = useIsOperatorAdmin()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | undefined>(undefined)
  const { page, setPage, pageCount, pageItems: pagedRoutes } = usePagination(routes ?? [])

  const openCreate = () => {
    setEditingRoute(undefined)
    setDialogOpen(true)
  }

  const openEdit = (route: Route) => {
    setEditingRoute(route)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{t('operator.routes.title')}</CardTitle>
          {isAdmin && <Button onClick={openCreate}>{t('operator.routes.addRoute')}</Button>}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('operator.routes.name')}</TableHead>
                  <TableHead>{t('operator.routes.bus')}</TableHead>
                  <TableHead>{t('operator.routes.driver')}</TableHead>
                  <TableHead>{t('operator.routes.conductor')}</TableHead>
                  <TableHead>{t('operator.routes.stops')}</TableHead>
                  <TableHead>{t('operator.routes.baseFee')}</TableHead>
                  <TableHead>{t('operator.routes.oneWayFee')}</TableHead>
                  {isAdmin && <TableHead className="text-right">{t('operator.routes.actions')}</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRoutes.map((route) => (
                  <TableRow key={route.id}>
                    <TableCell>{route.name}</TableCell>
                    <TableCell>{route.bus?.plate_number ?? '—'}</TableCell>
                    <TableCell>{route.driver?.full_name ?? '—'}</TableCell>
                    <TableCell>{route.conductor?.full_name ?? '—'}</TableCell>
                    <TableCell>{route.stops.length}</TableCell>
                    <TableCell>
                      {route.base_monthly_fee ? `RM ${formatMoney(route.base_monthly_fee)}` : '—'}
                    </TableCell>
                    <TableCell>
                      {route.one_way_monthly_fee ? `RM ${formatMoney(route.one_way_monthly_fee)}` : '—'}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => openEdit(route)}>
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
                                  {t('operator.routes.deleteConfirm', { name: route.name })}
                                </AlertDialogTitle>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                <AlertDialogAction onClick={() => deleteRoute.mutate(route.id)}>
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

      <RouteFormDialog route={editingRoute} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
