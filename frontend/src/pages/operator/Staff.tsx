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
import { useCreateStaff, useDeleteStaff, useStaff, useUpdateStaff } from '@/hooks/useStaff'
import type { Staff as StaffMember } from '@/api/staff'

const staffSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  ic_number: z.string().min(1, 'Required'),
  phone: z.string().min(1, 'Required'),
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
  const create = useCreateStaff()
  const update = useUpdateStaff()
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
          <DialogTitle>{staff ? 'Edit staff member' : 'Add staff member'}</DialogTitle>
        </DialogHeader>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Full name</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ic_number">IC / license number</Label>
            <Input id="ic_number" {...register('ic_number')} />
            {errors.ic_number && (
              <p className="text-sm text-destructive">{errors.ic_number.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" {...register('phone')} />
            {errors.phone && (
              <p className="text-sm text-destructive">{errors.phone.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Role</Label>
            <Select value={role} onValueChange={(v) => setValue('role', v as StaffForm['role'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="driver">Driver</SelectItem>
                <SelectItem value="conductor">Conductor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {role === 'driver' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="license_expiry_date">License expiry date</Label>
              <Input
                id="license_expiry_date"
                type="date"
                {...register('license_expiry_date')}
              />
            </div>
          )}
          <div className="flex flex-col gap-1.5">
            <Label>Status</Label>
            <Select
              value={status}
              onValueChange={(v) => setValue('status', v as StaffForm['status'])}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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

export function Staff() {
  const { data: staff, isLoading } = useStaff()
  const deleteStaff = useDeleteStaff()
  const isAdmin = useIsOperatorAdmin()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStaff, setEditingStaff] = useState<StaffMember | undefined>(undefined)

  const openCreate = () => {
    setEditingStaff(undefined)
    setDialogOpen(true)
  }

  const openEdit = (member: StaffMember) => {
    setEditingStaff(member)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium">Staff</h1>
        {isAdmin && <Button onClick={openCreate}>Add staff</Button>}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {staff?.map((member) => (
              <TableRow key={member.id}>
                <TableCell>{member.full_name}</TableCell>
                <TableCell className="capitalize">{member.role}</TableCell>
                <TableCell>{member.phone}</TableCell>
                <TableCell>
                  <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                    {member.status}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEdit(member)}>
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
                            <AlertDialogTitle>Delete {member.full_name}?</AlertDialogTitle>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteStaff.mutate(member.id)}>
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

      <StaffFormDialog staff={editingStaff} open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  )
}
