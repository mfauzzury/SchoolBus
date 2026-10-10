import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BackLink } from '@/components/BackLink'
import { useAdminOperator, useUpdateOperator } from '@/hooks/useAdmin'
import type { AdminOperatorDetail } from '@/api/admin'

export function AdminOperatorEdit() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const operatorId = Number(id)
  const { data: operator, isLoading } = useAdminOperator(operatorId)

  if (isLoading || !operator) {
    return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
  }

  return <EditForm operator={operator} />
}

// Separate component so the inputs start from the loaded operator, not from empty.
function EditForm({ operator }: { operator: AdminOperatorDetail }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const update = useUpdateOperator(operator.id)
  const [companyName, setCompanyName] = useState(operator.company_name)
  const [contactPerson, setContactPerson] = useState(operator.contact_person)
  const [contactPhone, setContactPhone] = useState(operator.contact_phone)

  const backTo = `/admin/operators/${operator.id}`
  const valid = companyName.trim() && contactPerson.trim() && contactPhone.trim()

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    update.mutate(
      {
        company_name: companyName.trim(),
        contact_person: contactPerson.trim(),
        contact_phone: contactPhone.trim(),
      },
      { onSuccess: () => navigate(backTo) },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to={backTo}>{operator.company_name}</BackLink>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{t('admin.operatorEdit.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="company_name">{t('admin.operators.company')}</Label>
              <Input
                id="company_name"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_person">{t('admin.operatorDetail.company.contactPerson')}</Label>
              <Input
                id="contact_person"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="contact_phone">{t('admin.operatorDetail.company.phone')}</Label>
              <Input
                id="contact_phone"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="login_email">{t('admin.operatorDetail.company.email')}</Label>
              <Input id="login_email" value={operator.email} disabled />
              <p className="text-xs text-muted-foreground">{t('admin.operatorEdit.emailHelp')}</p>
            </div>

            {update.isError && (
              <p role="alert" className="text-sm text-destructive">
                {t('admin.operatorEdit.error')}
              </p>
            )}

            <Button type="submit" className="w-fit" disabled={update.isPending || !valid}>
              {update.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
