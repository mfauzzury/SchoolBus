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
  const message = isAxiosError(send.error) ? send.error.response?.data?.message : undefined

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

/** Add or edit one transit center, as a page. */
export function TransitCenterFormPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const centerId = id ? Number(id) : undefined
  const { data: center, isLoading } = useTransitCenter(centerId)
  const create = useCreateTransitCenter()
  const update = useUpdateTransitCenter()

  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [status, setStatus] = useState<'active' | 'inactive'>('active')

  useEffect(() => {
    if (center) {
      setName(center.name)
      setContactPerson(center.contact_person ?? '')
      setPhone(center.phone)
      setEmail(center.email)
      setAddress(center.address ?? '')
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
    }
    if (centerId) {
      update.mutate({ id: centerId, input: { ...input, status } })
    } else {
      // New centers go to their page, where the login can be sent.
      create.mutate(input, { onSuccess: (created) => navigate(`/operator/transit-centers/${created.id}`) })
    }
  }

  if (centerId && isLoading) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/operator/transit-centers">{t('operator.transitCenters.back')}</BackLink>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{centerId ? center?.name : t('operator.transitCenters.add')}</CardTitle>
          {!centerId && <p className="text-sm text-muted-foreground">{t('operator.transitCenters.addHelp')}</p>}
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
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

            {update.isSuccess && <p className="text-sm text-muted-foreground">{t('common.saved')}</p>}

            <Button type="submit" disabled={saving || !name.trim() || !phone.trim() || !email.trim()} className="w-fit">
              {saving ? t('common.saving') : centerId ? t('common.save') : t('operator.transitCenters.addButton')}
            </Button>
          </form>
        </CardContent>
      </Card>

      {center && <LoginCard center={center} />}
    </div>
  )
}
