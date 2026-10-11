import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { BackLink } from '@/components/BackLink'
import { useAddTeamMember } from '@/hooks/useAdmin'
import { TEAM_LEVELS, type TeamLevel } from '@/lib/platform'

export function AdminTeamAdd() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const add = useAddTeamMember()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [level, setLevel] = useState<TeamLevel>('support')

  const emailTaken =
    add.isError && isAxiosError(add.error) && Boolean(add.error.response?.data?.errors?.email)

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    add.mutate(
      { name: name.trim(), email: email.trim(), level },
      { onSuccess: () => navigate('/admin/team') },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/admin/team">{t('admin.team.back')}</BackLink>

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{t('admin.team.add')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('admin.team.addHelp')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member_name">{t('admin.team.name')}</Label>
              <Input
                id="member_name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="member_email">{t('admin.team.email')}</Label>
              <Input
                id="member_email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {emailTaken && (
                <p role="alert" className="text-sm text-destructive">
                  {t('admin.team.emailTaken')}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <Label>{t('admin.team.level')}</Label>
              <RadioGroup value={level} onValueChange={(value) => setLevel(value as TeamLevel)}>
                {TEAM_LEVELS.map((option) => (
                  <label
                    key={option}
                    htmlFor={`level_${option}`}
                    className="flex cursor-pointer items-start gap-3 rounded-md border p-3"
                  >
                    <RadioGroupItem id={`level_${option}`} value={option} className="mt-0.5" />
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{t(`admin.team.levels.${option}`)}</span>
                      <span className="text-sm text-muted-foreground">
                        {t(`admin.team.levelHelp.${option}`)}
                      </span>
                    </span>
                  </label>
                ))}
              </RadioGroup>
            </div>

            {add.isError && !emailTaken && (
              <p role="alert" className="text-sm text-destructive">
                {t('admin.team.error')}
              </p>
            )}

            <Button type="submit" disabled={add.isPending || !name.trim() || !email.trim()} className="w-fit">
              {add.isPending ? t('common.saving') : t('admin.team.sendInvite')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
