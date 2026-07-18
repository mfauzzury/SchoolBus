import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
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
import { useParentRoutes, useQuote, useEnrollStudent } from '@/hooks/useParentPortal'

const enrollSchema = z.object({
  full_name: z.string().min(1, 'Required'),
  date_of_birth: z.string().min(1, 'Required'),
  school_name: z.string().min(1, 'Required'),
  route_id: z.string().min(1, 'Select a route'),
  pickup_stop_id: z.string(),
  package_type: z.enum(['one_way', 'return']),
  billing_period: z.enum(['monthly', 'quarterly', 'half_year', 'yearly']),
})

type EnrollForm = z.infer<typeof enrollSchema>

const NO_STOP = 'none'

const billingLabels: Record<EnrollForm['billing_period'], string> = {
  monthly: 'Monthly',
  quarterly: 'Quarterly',
  half_year: 'Half-Year',
  yearly: 'Yearly',
}

export function EnrollChild() {
  const navigate = useNavigate()
  const { data: routes } = useParentRoutes()
  const quote = useQuote()
  const enroll = useEnrollStudent()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EnrollForm>({
    resolver: zodResolver(enrollSchema),
    defaultValues: {
      full_name: '',
      date_of_birth: '',
      school_name: '',
      route_id: '',
      pickup_stop_id: NO_STOP,
      package_type: 'return',
      billing_period: 'monthly',
    },
  })

  const routeId = watch('route_id')
  const pickupStopId = watch('pickup_stop_id')
  const packageType = watch('package_type')
  const billingPeriod = watch('billing_period')

  const selectedRoute = routes?.find((r) => String(r.id) === routeId)

  useEffect(() => {
    if (!routeId) return
    quote.mutate({ route_id: Number(routeId), billing_period: billingPeriod })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeId, billingPeriod])

  const onSubmit = (values: EnrollForm) => {
    enroll.mutate(
      {
        full_name: values.full_name,
        date_of_birth: values.date_of_birth,
        school_name: values.school_name,
        route_id: Number(values.route_id),
        pickup_stop_id: values.pickup_stop_id === NO_STOP ? null : Number(values.pickup_stop_id),
        package_type: values.package_type,
        billing_period: values.billing_period,
      },
      { onSuccess: () => navigate('/parent/dashboard') },
    )
  }

  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Enroll a child</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="full_name">Child's full name</Label>
            <Input id="full_name" {...register('full_name')} />
            {errors.full_name && (
              <p className="text-sm text-destructive">{errors.full_name.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="date_of_birth">Date of birth</Label>
            <Input id="date_of_birth" type="date" {...register('date_of_birth')} />
            {errors.date_of_birth && (
              <p className="text-sm text-destructive">{errors.date_of_birth.message}</p>
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="school_name">School</Label>
            <Input id="school_name" {...register('school_name')} />
            {errors.school_name && (
              <p className="text-sm text-destructive">{errors.school_name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Route</Label>
            <Select
              items={Object.fromEntries(
                (routes ?? []).map((r) => [String(r.id), `${r.name}${r.zone ? ` (${r.zone})` : ''}`]),
              )}
              value={routeId}
              onValueChange={(v) => setValue('route_id', v ?? '')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a route" />
              </SelectTrigger>
              <SelectContent>
                {routes?.map((route) => (
                  <SelectItem key={route.id} value={String(route.id)}>
                    {route.name} {route.zone ? `(${route.zone})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.route_id && (
              <p className="text-sm text-destructive">{errors.route_id.message}</p>
            )}
          </div>

          {selectedRoute && selectedRoute.stops.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <Label>Pickup stop</Label>
              <Select
                items={{
                  [NO_STOP]: 'Unspecified',
                  ...Object.fromEntries(selectedRoute.stops.map((s) => [String(s.id), s.name])),
                }}
                value={pickupStopId}
                onValueChange={(v) => setValue('pickup_stop_id', v ?? NO_STOP)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a stop" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_STOP}>Unspecified</SelectItem>
                  {[...selectedRoute.stops]
                    .sort((a, b) => a.sequence - b.sequence)
                    .map((stop) => (
                      <SelectItem key={stop.id} value={String(stop.id)}>
                        {stop.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label>Package</Label>
            <Select
              value={packageType}
              onValueChange={(v) => setValue('package_type', v as EnrollForm['package_type'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="one_way">One-Way</SelectItem>
                <SelectItem value="return">Return</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Billing period</Label>
            <Select
              value={billingPeriod}
              onValueChange={(v) => setValue('billing_period', v as EnrollForm['billing_period'])}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(billingLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {quote.data && (
            <div className="rounded-lg border p-3 text-sm">
              <p className="font-medium">Estimated fee</p>
              <p className="text-muted-foreground">
                RM {quote.data.amount_before_discount.toFixed(2)} for {quote.data.months} month(s)
              </p>
              {quote.data.discount_amount > 0 && (
                <p className="text-muted-foreground">
                  Discount: RM {quote.data.discount_amount.toFixed(2)} (
                  {quote.data.billing_discount_rate}% billing
                  {quote.data.sibling_discount_rate > 0 &&
                    ` + ${quote.data.sibling_discount_rate}% sibling`}
                  )
                </p>
              )}
              <p className="text-base font-medium">
                Total: RM {quote.data.final_amount.toFixed(2)}
              </p>
            </div>
          )}

          {enroll.isError && (
            <p className="text-sm text-destructive">
              Could not enroll this child. Check the form and try again.
            </p>
          )}

          <Button type="submit" disabled={enroll.isPending}>
            {enroll.isPending ? 'Enrolling…' : 'Confirm enrollment'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
