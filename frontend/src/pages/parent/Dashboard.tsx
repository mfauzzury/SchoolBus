import { Link } from 'react-router-dom'
import { buttonVariants } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMe } from '@/hooks/useAuth'
import { useMyInvoices, useMyStudents } from '@/hooks/useParentPortal'
import type { Invoice } from '@/api/parentPortal'

const invoiceStatusVariant: Record<Invoice['status'], 'default' | 'secondary' | 'destructive'> = {
  draft: 'secondary',
  issued: 'default',
  paid: 'default',
  overdue: 'destructive',
}

export function ParentDashboard() {
  const { data } = useMe()
  const { data: students, isLoading: studentsLoading } = useMyStudents()
  const { data: invoices, isLoading: invoicesLoading } = useMyInvoices()

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">Welcome, {data?.user.name}</h1>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>My children</CardTitle>
          <Link to="/parent/enroll" className={buttonVariants({ size: 'sm' })}>
            Enroll a child
          </Link>
        </CardHeader>
        <CardContent>
          {studentsLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : students?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>School</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {students.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>{student.full_name}</TableCell>
                    <TableCell>{student.school_name}</TableCell>
                    <TableCell>{student.route?.name ?? '—'}</TableCell>
                    <TableCell className="capitalize">
                      {student.package_type.replace('_', ' ')}
                    </TableCell>
                    <TableCell className="capitalize">
                      {student.billing_period.replace('_', ' ')}
                    </TableCell>
                    <TableCell>
                      <Badge>{student.enrollment_status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">
              No children enrolled yet. Click "Enroll a child" to get started.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
        </CardHeader>
        <CardContent>
          {invoicesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : invoices?.length ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Child</TableHead>
                  <TableHead>Billing period</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Due date</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => {
                  const student = students?.find((s) => s.id === invoice.student_id)
                  return (
                    <TableRow key={invoice.id}>
                      <TableCell>{student?.full_name ?? '—'}</TableCell>
                      <TableCell className="capitalize">
                        {invoice.billing_period.replace('_', ' ')}
                      </TableCell>
                      <TableCell>RM {Number(invoice.final_amount).toFixed(2)}</TableCell>
                      <TableCell>{invoice.due_date.slice(0, 10)}</TableCell>
                      <TableCell>
                        <Badge variant={invoiceStatusVariant[invoice.status]}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
