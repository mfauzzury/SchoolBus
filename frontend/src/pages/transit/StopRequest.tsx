import { useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { BackLink } from '@/components/BackLink'
import { useCreateTransitStopRequest, useTransitChildren } from '@/hooks/useTransitPortal'
import { dateInput } from '@/lib/transit'

/** Ask the operator to stop bringing a child via the center after a last day. */
export function TransitStopRequest() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { studentId } = useParams<{ studentId: string }>()
  const { data: children, isLoading } = useTransitChildren()
  const send = useCreateTransitStopRequest()
  const [endsOn, setEndsOn] = useState(dateInput(7))
  const [note, setNote] = useState('')

  const child = children?.find((c) => c.student.id === Number(studentId))
  const apiMessage = isAxiosError(send.error) ? send.error.response?.data?.message : undefined

  if (isLoading) return <p className="text-sm text-muted-foreground">{t('common.loading')}</p>

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!child) return
    send.mutate(
      { student_id: child.student.id, ends_on: endsOn, note: note.trim() || null },
      { onSuccess: () => navigate('/transit/requests') },
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <BackLink to="/transit/children">{t('transit.children.title')}</BackLink>
      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>{t('transit.stop.title', { name: child?.student.full_name ?? '' })}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('transit.stop.help')}</p>
        </CardHeader>
        <CardContent>
          {!child ? (
            <p className="text-sm text-muted-foreground">{t('transit.stop.notFound')}</p>
          ) : (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ends_on">{t('transit.stop.lastDay')}</Label>
                <Input
                  id="ends_on"
                  type="date"
                  className="max-w-48"
                  min={dateInput(0)}
                  value={endsOn}
                  onChange={(e) => setEndsOn(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="stop_note">{t('transit.request.note')}</Label>
                <Textarea id="stop_note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              {send.isError && (
                <p role="alert" className="text-sm text-destructive">
                  {apiMessage ?? t('transit.request.error')}
                </p>
              )}
              <Button type="submit" disabled={send.isPending || !endsOn} className="w-fit">
                {send.isPending ? t('common.saving') : t('transit.stop.send')}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
