import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BackLink } from '@/components/BackLink'
import { LocationMap } from '@/components/LocationMap'
import { OpenInMaps } from '@/components/OpenInMaps'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { apiErrorMessage } from '@/lib/apiError'
import type { LatLng } from '@/lib/map'
import { useCan } from '@/hooks/useAuth'
import { useOperatorOptions } from '@/hooks/useAdmin'
import {
  useCreateTransitCenter,
  useSendTransitCenterLogin,
  useTransitCenter,
  useUpdateTransitCenter,
} from '@/hooks/useTransitCenters'
import type { TransitCenter } from '@/api/transitCenters'

function fieldError(error: unknown, field: string): string | undefined {
  if (!isAxiosError(error)) return undefined
  const messages = error.response?.data?.errors?.[field]
  return Array.isArray(messages) ? messages[0] : undefined
}

/** Login card on the edit page: send the "set your password" email, or send it again. */
function LoginCard({ center }: { center: TransitCenter }) {
  const { t } = useTranslation()
  const send = useSendTransitCenterLogin()
  const message = apiErrorMessage(send.error)

  return (
    <Card className="max-w-xl">
      <CardHeader>
        <CardTitle className="text-base">{t('operator.transitCenters.login')}</CardTitle>
        <p className="text-sm text-muted-foreground">
          {center.has_login
            ? t('operator.transitCenters.loginSentHelp', { email: center.email })
            : t('operator.transitCenters.noLoginHelp', { email: center.email })}
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {send.isSuccess && (
          <p className="text-sm text-muted-foreground">{t('operator.transitCenters.loginEmailed')}</p>
        )}
        {send.isError && (
          <p role="alert" className="text-sm text-destructive">
            {message ?? t('operator.transitCenters.loginError')}
          </p>
        )}
        <Button
          variant={center.has_login ? 'outline' : 'default'}
          className="w-fit"
          disabled={send.isPending || center.status !== 'active'}
          onClick={() => send.mutate(center.id)}
        >
          {send.isPending
            ? t('common.saving')
            : center.has_login
              ? t('operator.transitCenters.resendLogin')
              : t('operator.transitCenters.sendLogin')}
        </Button>
      </CardContent>
    </Card>
  )
}

/**
 * Add or edit one transit center, as a page. Platform team only: the center
 * is given to one operator when it is added, and that never changes.
 */
export function AdminTransitCenterForm() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const centerId = id ? Number(id) : undefined
  const { data: center, isLoading } = useTransitCenter(centerId)
  const create = useCreateTransitCenter()
  const update = useUpdateTransitCenter()
  const canEdit = useCan('operators.edit')
  const { data: operators } = useOperatorOptions()
  const [operatorId, setOperatorId] = useState('')

  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  // The pin dropped on the map, so drivers and the operator can open the center in their maps app.
  const [pin, setPin] = useState<LatLng | null>(null)
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  useEffect(() => {
    if (center) {
      setName(center.name)
      setContactPerson(center.contact_person ?? '')
      setPhone(center.phone)
      setEmail(center.email)
      setAddress(center.address ?? '')
      setPin(center.latitude !== null && center.longitude !== null ? { lat: center.latitude, lng: center.longitude } : null)
      setStatus(center.status)
    }
  }, [center])

  const saving = create.isPending || update.isPending
  const error = create.error ?? update.error

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const input = {
      name: name.trim(),
      contact_person: contactPerson.trim() || null,
      phone: phone.trim(),
      email: email.trim(),
      address: address.trim() || null,
      latitude: pin?.lat ?? null,
      longitude: pin?.lng ?? null,
    }
    if (centerId) {
      update.mutate({ id: centerId, input: { ...input, status } })
    } else {
      // New centers go to their page, where the login can be sent.
      create.mutate(
        { ...input, operator_id: Number(operatorId) },
        { onSuccess: (created) => navigate(`/admin/transit-centers/${created.id}`) },
      )
    }
  }

  if (centerId && isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/transit-centers">{t('admin.transitCenters.title')}</BackLink>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{centerId ? center?.name : t('operator.transitCenters.add')}</CardTitle>
          {!centerId && <p className="text-sm text-muted-foreground">{t('admin.transitCenters.addHelp')}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <fieldset disabled={!canEdit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label>{t('admin.transitCenters.operator')}</Label>
                {centerId ? (
                  <>
                    <p className="text-sm font-medium">{center?.operator?.company_name ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{t('admin.transitCenters.operatorFixed')}</p>
                  </>
                ) : (
                  <>
                    <Select
                      items={Object.fromEntries((operators ?? []).map((o) => [String(o.id), o.company_name]))}
                      value={operatorId}
                      onValueChange={(v) => setOperatorId(v ?? '')}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={t('admin.transitCenters.chooseOperator')} />
                      </SelectTrigger>
                      <SelectContent>
                        {(operators ?? []).map((o) => (
                          <SelectItem key={o.id} value={String(o.id)}>
                            {o.company_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">{t('admin.transitCenters.operatorHint')}</p>
                  </>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tc_name">{t('operator.transitCenters.name')}</Label>
                <Input id="tc_name" value={name} onChange={(e) => setName(e.target.value)} required />
                {fieldError(error, 'name') && <p className="text-sm text-destructive">{fieldError(error, 'name')}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tc_contact">{t('operator.transitCenters.contactPerson')}</Label>
                <Input id="tc_contact" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tc_phone">{t('operator.transitCenters.phone')}</Label>
                <Input id="tc_phone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                {fieldError(error, 'phone') && <p className="text-sm text-destructive">{fieldError(error, 'phone')}</p>}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tc_email">{t('operator.transitCenters.email')}</Label>
                <Input id="tc_email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                <p className="text-xs text-muted-foreground">{t('operator.transitCenters.emailHint')}</p>
                {fieldError(error, 'email') && (
                  <p className="text-sm text-destructive">{t('operator.transitCenters.emailTaken')}</p>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tc_address">{t('operator.transitCenters.address')}</Label>
                <Input id="tc_address" value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>{t('transit.location.title')}</Label>
                <LocationMap value={pin} onChange={canEdit ? setPin : undefined} className="h-72 rounded-md border" />
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {pin
                      ? t('transit.location.coords', { lat: pin.lat.toFixed(6), lng: pin.lng.toFixed(6) })
                      : t('transit.location.none')}
                  </span>
                  {pin && (
                    <span className="flex items-center gap-2">
                      <OpenInMaps lat={pin.lat} lng={pin.lng} />
                      {canEdit && (
                        <Button type="button" variant="outline" size="sm" onClick={() => setPin(null)}>
                          {t('transit.location.remove')}
                        </Button>
                      )}
                    </span>
                  )}
                </div>
                {canEdit && <p className="text-xs text-muted-foreground">{t('transit.location.help')}</p>}
              </div>

              {centerId && (
                <div className="flex flex-col gap-2 border-t pt-4">
                  <Label>{t('operator.transitCenters.status')}</Label>
                  <RadioGroup
                    className="flex-col items-start gap-3"
                    value={status}
                    onValueChange={(value) => setStatus(value as 'active' | 'inactive')}
                  >
                    <div>
                      <RadioGroupItem value="active">{t('common.status.active')}</RadioGroupItem>
                    </div>
                    <div>
                      <RadioGroupItem value="inactive">{t('common.status.inactive')}</RadioGroupItem>
                      <p className="ml-6 text-xs text-muted-foreground">{t('operator.transitCenters.inactiveHint')}</p>
                    </div>
                  </RadioGroup>
                </div>
              )}

            </fieldset>
            {update.isSuccess && <p className="text-sm text-muted-foreground">{t('common.saved')}</p>}

            {canEdit && (
              <Button
                type="submit"
                disabled={saving || !name.trim() || !phone.trim() || !email.trim() || (!centerId && !operatorId)}
                className="w-fit"
              >
                {saving ? t('common.saving') : centerId ? t('common.save') : t('operator.transitCenters.addButton')}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>

      {center && canEdit && <LoginCard center={center} />}
    </div>
  )
}
