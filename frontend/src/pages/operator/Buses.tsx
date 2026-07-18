import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
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
import { useBuses, useCreateBus, useDeleteBus, useUpdateBus } from '@/hooks/useBuses'
import type { Bus } from '@/api/buses'

const busSchema = z.object({
  plate_number: z.string().min(1, 'Required'),
  capacity: z
    .string()
    .refine((v) => Number.isInteger(Number(v)) && Number(v) >= 1, 'Must be at least 1'),
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
  const create = useCreateBus()
  const update = useUpdateBus()
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
          <DialogTitle>{bus ? 'Edit bus' : 'Add bus'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="plate_number">Plate number</Label>
            <Input id="plate_number" {...register('plate_number')} />
            {errors.plate_number && (
              <p className="text-sm text-destructive">{errors.plate_number.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="capacity">Capacity</Label>
            <Input id="capacity" type="number" {...register('capacity')} />
            {errors.capacity && (
              <p className="text-sm text-destructive">{errors.capacity.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setValue('status', v as BusForm['status'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="retired">Retired</SelectItem>
              </SelectContent>
            </Select>
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

const statusVariant: Record<Bus['status'], 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  maintenance: 'secondary',
  retired: 'destructive',
}

export function Buses() {
  const { data: buses, isLoading } = useBuses()
  const deleteBus = useDeleteBus()
  const isAdmin = useIsOperatorAdmin()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingBus, setEditingBus] = useState<Bus | undefined>(undefined)

  const openCreate = () => {
    setEditingBus(undefined)
    setDialogOpen(true)
  }

  const openEdit = (bus: Bus) => {
    setEditingBus(bus)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Buses</h1>
        {isAdmin && <Button onClick={openCreate}>Add bus</Button>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plate number</TableHead>
              <TableHead>Capacity</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {buses?.map((bus) => (
              <TableRow key={bus.id}>
                <TableCell>{bus.plate_number}</TableCell>
                <TableCell>{bus.capacity}</TableCell>
                <TableCell>
                  <Badge variant={statusVariant[bus.status]}>{bus.status}</Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(bus)}>
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
                            <AlertDialogTitle>Delete {bus.plate_number}?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteBus.mutate(bus.id)}>
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

      <BusFormDialog bus={editingBus} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
