import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useRoutes } from '@/hooks/useRoutes'
import { useOperatorStudents } from '@/hooks/useOperatorStudents'
import type { OperatorStudent } from '@/api/operatorStudents'

const ALL = 'all'

const enrollmentVariant: Record<OperatorStudent['enrollment_status'], 'default' | 'secondary' | 'destructive'> = {
  active: 'default',
  suspended: 'secondary',
  withdrawn: 'destructive',
}

const invoiceVariant: Record<string, 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'default',
  overdue: 'destructive',
}

export function Students() {
  const { data: routes } = useRoutes()
  const [routeId, setRouteId] = useState(ALL)
  const [status, setStatus] = useState(ALL)

  const { data: students, isLoading } = useOperatorStudents({
    route_id: routeId !== ALL ? Number(routeId) : undefined,
    status: status !== ALL ? status : undefined,
  })

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-xl font-medium">Students</h1>

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label>Route</Label>
          <Select
            items={{ [ALL]: 'All routes', ...Object.fromEntries((routes ?? []).map((r) => [String(r.id), r.name])) }}
            value={routeId}
            onValueChange={(v) => setRouteId(v ?? ALL)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All routes</SelectItem>
              {routes?.map((route) => (
                <SelectItem key={route.id} value={String(route.id)}>
                  {route.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select
            items={{ [ALL]: 'All statuses', active: 'Active', suspended: 'Suspended', withdrawn: 'Withdrawn' }}
            value={status}
            onValueChange={(v) => setStatus(v ?? ALL)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="withdrawn">Withdrawn</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : students?.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Parent</TableHead>
              <TableHead>Route</TableHead>
              <TableHead>Package</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Latest invoice</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => {
              const latestInvoice = student.invoices[0]
              return (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{student.full_name}</span>
                      <span className="text-xs text-muted-foreground">{student.school_name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{student.parent_profile?.full_name ?? '—'}</span>
                      <span className="text-xs text-muted-foreground">
                        {student.parent_profile?.phone}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>{student.route?.name ?? '—'}</TableCell>
                  <TableCell className="capitalize">{student.package_type.replace('_', ' ')}</TableCell>
                  <TableCell className="capitalize">{student.billing_period.replace('_', ' ')}</TableCell>
                  <TableCell>
                    <Badge variant={enrollmentVariant[student.enrollment_status]}>
                      {student.enrollment_status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {latestInvoice ? (
                      <Badge variant={invoiceVariant[latestInvoice.status]}>
                        {latestInvoice.status} — RM {Number(latestInvoice.final_amount).toFixed(2)}
                      </Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">—</span>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="text-sm text-muted-foreground">No students enrolled yet.</p>
      )}
    </div>
  )
}
