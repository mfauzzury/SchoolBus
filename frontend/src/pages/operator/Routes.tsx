import { useEffect, useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useBuses } from '@/hooks/useBuses'
import { useStaff } from '@/hooks/useStaff'
import { useCreateRoute, useDeleteRoute, useRoutes, useUpdateRoute } from '@/hooks/useRoutes'
import type { Route } from '@/api/routes'

const UNASSIGNED = 'none'

const routeSchema = z.object({
  name: z.string().min(1, 'Required'),
  zone: z.string().optional(),
  school_destination: z.string().optional(),
  base_monthly_fee: z.string().optional(),
  bus_id: z.string(),
  driver_id: z.string(),
  conductor_id: z.string(),
  stops: z.array(z.object({ name: z.string().min(1, 'Required') })),
})

type RouteForm = z.infer<typeof routeSchema>

function toFormValues(route?: Route): RouteForm {
  return {
    name: route?.name ?? '',
    zone: route?.zone ?? '',
    school_destination: route?.school_destination ?? '',
    base_monthly_fee: route?.base_monthly_fee ? String(Number(route.base_monthly_fee)) : '',
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
          <DialogTitle>{route ? 'Edit route' : 'Add route'}</DialogTitle>
        </DialogHeader>
        <form className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Route name</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="zone">Zone</Label>
            <Input id="zone" {...register('zone')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school_destination">School destination</Label>
            <Input id="school_destination" {...register('school_destination')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="base_monthly_fee">Base monthly fee (RM)</Label>
            <Input id="base_monthly_fee" type="number" step="0.01" {...register('base_monthly_fee')} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Bus</Label>
            <Select
              items={{ [UNASSIGNED]: 'Unassigned', ...Object.fromEntries((buses ?? []).map((b) => [String(b.id), b.plate_number])) }}
              value={busId}
              onValueChange={(v) => setValue('bus_id', v ?? UNASSIGNED)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {buses?.map((bus) => (
                  <SelectItem key={bus.id} value={String(bus.id)}>
                    {bus.plate_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Driver</Label>
            <Select
              items={{ [UNASSIGNED]: 'Unassigned', ...Object.fromEntries((drivers ?? []).map((d) => [String(d.id), d.full_name])) }}
              value={driverId}
              onValueChange={(v) => setValue('driver_id', v ?? UNASSIGNED)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                {drivers?.map((driver) => (
                  <SelectItem key={driver.id} value={String(driver.id)}>
                    {driver.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Conductor</Label>
            <Select
              items={{ [UNASSIGNED]: 'Unassigned', ...Object.fromEntries((conductors ?? []).map((c) => [String(c.id), c.full_name])) }}
              value={conductorId}
              onValueChange={(v) => setValue('conductor_id', v ?? UNASSIGNED)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
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
              <Label>Stops</Label>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ name: '' })}>
                Add stop
              </Button>
            </div>
            {fields.map((field, index) => (
              <div key={field.id} className="flex items-center gap-2">
                <span className="w-5 text-sm text-muted-foreground">{index + 1}.</span>
                <Input {...register(`stops.${index}.name` as const)} placeholder="Stop name" />
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function Routes() {
  const { data: routes, isLoading } = useRoutes()
  const deleteRoute = useDeleteRoute()
  const isAdmin = useIsOperatorAdmin()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingRoute, setEditingRoute] = useState<Route | undefined>(undefined)

  const openCreate = () => {
    setEditingRoute(undefined)
    setDialogOpen(true)
  }

  const openEdit = (route: Route) => {
    setEditingRoute(route)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Routes</h1>
        {isAdmin && <Button onClick={openCreate}>Add route</Button>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Bus</TableHead>
              <TableHead>Driver</TableHead>
              <TableHead>Conductor</TableHead>
              <TableHead>Stops</TableHead>
              <TableHead>Base fee</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {routes?.map((route) => (
              <TableRow key={route.id}>
                <TableCell>{route.name}</TableCell>
                <TableCell>{route.bus?.plate_number ?? '—'}</TableCell>
                <TableCell>{route.driver?.full_name ?? '—'}</TableCell>
                <TableCell>{route.conductor?.full_name ?? '—'}</TableCell>
                <TableCell>{route.stops.length}</TableCell>
                <TableCell>
                  {route.base_monthly_fee ? `RM ${Number(route.base_monthly_fee).toFixed(2)}` : '—'}
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(route)}>
                        Edit
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger
                          render={
                            <Button variant="destructive" size="sm">
                              Delete
                            </Button>
                          }
                        />
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete {route.name}?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteRoute.mutate(route.id)}>
                              Delete
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

      <RouteFormDialog route={editingRoute} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
