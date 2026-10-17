import { useState } from 'react'
import { useFieldArray, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowDown, ArrowUp, Banknote, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { BackLink } from '@/components/BackLink'
import { FieldError } from '@/components/FieldError'
import { Stepper } from '@/components/Stepper'
import { useIsOperatorAdmin } from '@/hooks/useAuth'
import { useBuses } from '@/hooks/useBuses'
import { useStaff } from '@/hooks/useStaff'
import { useCreateRoute, useRoutes, useUpdateRoute } from '@/hooks/useRoutes'
import { cn, formatMoney } from '@/lib/utils'
import type { Route } from '@/api/routes'

const UNASSIGNED = 'none'

const routeSchema = z.object({
  session: z.string().min(1, 'operator.routes.errors.sessionRequired'),
  name: z.string().min(1, 'operator.routes.errors.nameRequired'),
  zone: z.string().optional(),
  school_destination: z.string().optional(),
  base_monthly_fee: z.string().optional(),
  one_way_monthly_fee: z.string().optional(),
  bus_id: z.string(),
  driver_id: z.string(),
  conductor_id: z.string(),
  stops: z.array(z.object({ name: z.string().min(1, 'operator.routes.errors.stopRequired') })),
})

type RouteFormValues = z.infer<typeof routeSchema>

const STEPS = ['details', 'stops', 'fares', 'crew', 'review'] as const
type StepKey = (typeof STEPS)[number]

/** What has to be valid before the operator may leave a step. */
const STEP_FIELDS: Partial<Record<StepKey, ('session' | 'name' | 'stops')[]>> = {
  details: ['session', 'name'],
  stops: ['stops'],
}

function toFormValues(route?: Route): RouteFormValues {
  return {
    session: route?.session ?? '',
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

/** Add or edit one route as a guided, step-by-step page. */
export function RouteFormPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const isAdmin = useIsOperatorAdmin()
  const { data: routes, isLoading } = useRoutes()
  const route = id ? routes?.find((r) => String(r.id) === id) : undefined

  // Only the owner changes routes and fares; staff can look at the list.
  if (!isAdmin) return <Navigate to="/operator/routes" replace />

  if (id && isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  if (id && !route) {
    return (
      <div className="flex flex-col items-start gap-3">
        <p className="text-sm text-muted-foreground">{t('operator.routes.notFound')}</p>
        <BackLink to="/operator/routes">{t('operator.routes.back')}</BackLink>
      </div>
    )
  }

  // Keyed so switching between routes starts from that route's values.
  return <RouteWizard key={route?.id ?? 'new'} route={route} />
}

function RouteWizard({ route }: { route?: Route }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: buses } = useBuses()
  const { data: drivers } = useStaff('driver')
  const { data: conductors } = useStaff('conductor')
  const create = useCreateRoute()
  const update = useUpdateRoute()
  const editing = Boolean(route)

  const [step, setStep] = useState(0)
  // The furthest step reached so far; a new route can only jump back, not ahead.
  const [reached, setReached] = useState(0)

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    trigger,
    control,
    formState: { errors },
  } = useForm<RouteFormValues>({
    resolver: zodResolver(routeSchema),
    defaultValues: toFormValues(route),
  })

  const { fields, append, remove, move } = useFieldArray({ control, name: 'stops' })

  const values = watch()
  const returnFare = Number(values.base_monthly_fee) || 0
  const oneWayFare = Number(values.one_way_monthly_fee) || 0
  const pending = create.isPending || update.isPending
  const failed = create.isError || update.isError

  const stepKey = STEPS[step]
  const isLast = step === STEPS.length - 1

  const stepLabels: Record<StepKey, string> = {
    details: t('operator.routes.steps.details'),
    stops: t('operator.routes.steps.stops'),
    fares: t('operator.routes.steps.fares'),
    crew: t('operator.routes.steps.crew'),
    review: t('operator.routes.steps.review'),
  }

  const goTo = (index: number) => {
    setStep(index)
    setReached((r) => Math.max(r, index))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const next = async () => {
    const fieldsToCheck = STEP_FIELDS[stepKey]
    if (fieldsToCheck && !(await trigger(fieldsToCheck))) return
    goTo(step + 1)
  }

  const save = handleSubmit((form) => {
    const payload = {
      name: form.name,
      session: form.session as 'morning' | 'afternoon',
      zone: form.zone || null,
      school_destination: form.school_destination || null,
      base_monthly_fee: form.base_monthly_fee ? Number(form.base_monthly_fee) : null,
      one_way_monthly_fee: form.one_way_monthly_fee ? Number(form.one_way_monthly_fee) : null,
      bus_id: form.bus_id === UNASSIGNED ? null : Number(form.bus_id),
      driver_id: form.driver_id === UNASSIGNED ? null : Number(form.driver_id),
      conductor_id: form.conductor_id === UNASSIGNED ? null : Number(form.conductor_id),
      stops: form.stops.map((s, i) => ({ name: s.name, sequence: i + 1 })),
    }
    const onSuccess = () => navigate('/operator/routes')

    if (route) {
      update.mutate({ id: route.id, input: payload }, { onSuccess })
    } else {
      create.mutate(payload, { onSuccess })
    }
  })

  // Enter moves on instead of saving half-way; it only saves on the last step.
  const onFormSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    if (isLast) void save()
    else void next()
  }

  const nameOf = (list: { id: number; label: string }[] | undefined, id: string) =>
    id === UNASSIGNED ? t('common.unassigned') : (list?.find((o) => String(o.id) === id)?.label ?? '—')

  const busOptions = buses?.map((b) => ({ id: b.id, label: b.plate_number }))
  const driverOptions = drivers?.map((d) => ({ id: d.id, label: d.full_name }))
  const conductorOptions = conductors?.map((c) => ({ id: c.id, label: c.full_name }))

  const picker = (
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { id: number; label: string }[] | undefined,
  ) => (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Select
        items={{
          [UNASSIGNED]: t('common.unassigned'),
          ...Object.fromEntries((options ?? []).map((o) => [String(o.id), o.label])),
        }}
        value={value}
        onValueChange={(v) => onChange(v ?? UNASSIGNED)}
      >
        <SelectTrigger className="w-full">
          <SelectValue placeholder={t('common.unassigned')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>{t('common.unassigned')}</SelectItem>
          {options?.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )

  const stepCard = (title: string, hint: string, body: React.ReactNode, extra?: React.ReactNode) => (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">{hint}</p>
        </div>
        {extra}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{body}</CardContent>
    </Card>
  )

  const reviewRow = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value || '—'}</span>
    </div>
  )

  const reviewSection = (title: string, toStep: number, body: React.ReactNode) => (
    <div className="flex flex-col gap-2 rounded-lg border p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        <Button type="button" variant="ghost" size="sm" onClick={() => goTo(toStep)}>
          {t('common.edit')}
        </Button>
      </div>
      {body}
    </div>
  )

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/operator/routes">{t('operator.routes.back')}</BackLink>

      <h1 className="text-xl font-medium">
        {route ? t('operator.routes.editRoute') : t('operator.routes.addRoute')}
      </h1>

      <Stepper
        steps={STEPS.map((key) => ({ key, label: stepLabels[key] }))}
        current={step}
        canJumpTo={(index) => editing || index <= reached}
        onStepClick={goTo}
      />

      <form
        onSubmit={onFormSubmit}
        onKeyDown={(event) => {
          // No submit button until the last step, so the browser won't submit on Enter by itself.
          const target = event.target as HTMLElement
          if (event.key === 'Enter' && target.tagName === 'INPUT' && !isLast) {
            event.preventDefault()
            void next()
          }
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        {stepKey === 'details' &&
          stepCard(
            t('operator.routes.sectionDetails'),
            t('operator.routes.hints.details'),
            <>
              <div className="flex flex-col gap-1.5">
                <Label>{t('operator.routes.session')}</Label>
                <RadioGroup
                  value={values.session}
                  onValueChange={(v) => setValue('session', String(v), { shouldValidate: true })}
                  className="flex-wrap gap-x-6 gap-y-2"
                >
                  <RadioGroupItem value="morning">{t('operator.routes.sessionMorning')}</RadioGroupItem>
                  <RadioGroupItem value="afternoon">{t('operator.routes.sessionAfternoon')}</RadioGroupItem>
                </RadioGroup>
                <FieldError message={errors.session?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="name">{t('operator.routes.routeName')}</Label>
                <Input id="name" autoFocus {...register('name')} />
                <FieldError message={errors.name?.message} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="zone">{t('operator.routes.zone')}</Label>
                <Input id="zone" {...register('zone')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="school_destination">{t('operator.routes.schoolDestination')}</Label>
                <Input id="school_destination" {...register('school_destination')} />
              </div>
            </>,
          )}

        {stepKey === 'stops' &&
          stepCard(
            t('operator.routes.sectionStops'),
            t('operator.routes.hints.stops'),
            <>
              {fields.length === 0 && (
                <p className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
                  {t('operator.routes.noStops')}
                </p>
              )}
              {fields.map((field, index) => (
                <div key={field.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="w-6 shrink-0 text-right text-sm text-muted-foreground">{index + 1}.</span>
                    <Input
                      {...register(`stops.${index}.name` as const)}
                      placeholder={t('operator.routes.stopNamePlaceholder')}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === 0}
                      aria-label={t('operator.routes.moveUp')}
                      onClick={() => move(index, index - 1)}
                    >
                      <ArrowUp />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={index === fields.length - 1}
                      aria-label={t('operator.routes.moveDown')}
                      onClick={() => move(index, index + 1)}
                    >
                      <ArrowDown />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t('operator.routes.remove')}
                      onClick={() => remove(index)}
                    >
                      <Trash2 />
                    </Button>
                  </div>
                  <div className="pl-8">
                    <FieldError message={errors.stops?.[index]?.name?.message} />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="self-start"
                onClick={() => append({ name: '' })}
              >
                {t('operator.routes.addStop')}
              </Button>
            </>,
          )}

        {stepKey === 'fares' && (
          <Card className="mx-auto w-full max-w-2xl border border-primary/40 bg-primary/5 ring-primary/30">
            <CardHeader className="flex flex-row items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary">
                <Banknote className="size-5" aria-hidden />
              </span>
              <div className="flex flex-col gap-1">
                <CardTitle className="text-lg">{t('operator.routes.sectionFares')}</CardTitle>
                <p className="text-sm text-muted-foreground">{t('operator.routes.faresHelp')}</p>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { id: 'base_monthly_fee', label: t('operator.routes.baseMonthlyFee') },
                  { id: 'one_way_monthly_fee', label: t('operator.routes.oneWayMonthlyFee') },
                ].map((fare) => (
                  <div key={fare.id} className="flex flex-col gap-1.5">
                    <Label htmlFor={fare.id}>{fare.label}</Label>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-sm font-medium text-muted-foreground">
                        RM
                      </span>
                      <Input
                        id={fare.id}
                        type="number"
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                        className="h-11 bg-background pl-11 text-lg font-medium"
                        {...register(fare.id as 'base_monthly_fee' | 'one_way_monthly_fee')}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">{t('operator.routes.oneWayFeeHint')}</p>

              {returnFare > 0 && (
                <p className="rounded-md bg-background/80 p-3 text-sm ring-1 ring-primary/20">
                  {oneWayFare > 0
                    ? t('operator.routes.faresSummaryBoth', {
                        returnFare: formatMoney(returnFare),
                        oneWayFare: formatMoney(oneWayFare),
                      })
                    : t('operator.routes.faresSummarySame', { returnFare: formatMoney(returnFare) })}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {stepKey === 'crew' &&
          stepCard(
            t('operator.routes.sectionAssign'),
            t('operator.routes.hints.crew'),
            <>
              {picker(t('operator.routes.bus'), values.bus_id, (v) => setValue('bus_id', v), busOptions)}
              {picker(t('operator.routes.driver'), values.driver_id, (v) => setValue('driver_id', v), driverOptions)}
              {picker(
                t('operator.routes.conductor'),
                values.conductor_id,
                (v) => setValue('conductor_id', v),
                conductorOptions,
              )}
            </>,
          )}

        {stepKey === 'review' &&
          stepCard(
            t('operator.routes.steps.review'),
            t('operator.routes.hints.review'),
            <>
              {returnFare === 0 && (
                <div
                  role="alert"
                  className="flex items-start gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
                  <div>
                    <p className="font-medium">{t('operator.routes.noFareTitle')}</p>
                    <p className="mt-0.5">{t('operator.routes.noFareWarning')}</p>
                  </div>
                </div>
              )}

              {reviewSection(
                t('operator.routes.sectionDetails'),
                0,
                <>
                  {reviewRow(
                    t('operator.routes.session'),
                    values.session ? t(values.session === 'morning' ? 'operator.routes.sessionMorning' : 'operator.routes.sessionAfternoon') : null,
                  )}
                  {reviewRow(t('operator.routes.routeName'), values.name)}
                  {reviewRow(t('operator.routes.zone'), values.zone)}
                  {reviewRow(t('operator.routes.schoolDestination'), values.school_destination)}
                </>,
              )}
              {reviewSection(
                t('operator.routes.sectionStops'),
                1,
                fields.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t('operator.routes.noStopsReview')}</p>
                ) : (
                  <ol className="flex flex-col gap-1 text-sm">
                    {values.stops.map((stop, index) => (
                      <li key={index}>
                        <span className="text-muted-foreground">{index + 1}.</span> {stop.name}
                      </li>
                    ))}
                  </ol>
                ),
              )}
              {reviewSection(
                t('operator.routes.sectionFares'),
                2,
                <>
                  {reviewRow(t('operator.routes.baseFee'), returnFare > 0 ? `RM ${formatMoney(returnFare)}` : null)}
                  {reviewRow(
                    t('operator.routes.oneWayFee'),
                    oneWayFare > 0
                      ? `RM ${formatMoney(oneWayFare)}`
                      : returnFare > 0
                        ? t('operator.routes.sameAsReturn')
                        : null,
                  )}
                </>,
              )}
              {reviewSection(
                t('operator.routes.sectionAssign'),
                3,
                <>
                  {reviewRow(t('operator.routes.bus'), nameOf(busOptions, values.bus_id))}
                  {reviewRow(t('operator.routes.driver'), nameOf(driverOptions, values.driver_id))}
                  {reviewRow(t('operator.routes.conductor'), nameOf(conductorOptions, values.conductor_id))}
                </>,
              )}
            </>,
          )}

        <div className="mx-auto flex w-full max-w-2xl flex-wrap items-center gap-3">
          {step > 0 && (
            <Button type="button" variant="outline" onClick={() => goTo(step - 1)}>
              <ChevronLeft aria-hidden />
              {t('stepper.previous')}
            </Button>
          )}
          {!isLast && (
            <Button type="button" onClick={() => void next()}>
              {t('stepper.next')}
              <ChevronRight aria-hidden />
            </Button>
          )}
          {/* Saving lives on the last step only, whether the route is new or being edited. */}
          {isLast && (
            <Button type="submit" disabled={pending}>
              {pending ? t('common.saving') : t('common.save')}
            </Button>
          )}
          <Link to="/operator/routes" className={cn(buttonVariants({ variant: 'ghost' }), 'ml-auto')}>
            {t('common.cancel')}
          </Link>
        </div>

        {failed && (
          <p role="alert" className="mx-auto w-full max-w-2xl text-sm text-destructive">
            {t('operator.routes.saveError')}
          </p>
        )}
      </form>
    </div>
  )
}
