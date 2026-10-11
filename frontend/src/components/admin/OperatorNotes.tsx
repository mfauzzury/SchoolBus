import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAddOperatorNote, useDeleteOperatorNote, useOperatorNotes } from '@/hooks/useAdmin'
import { useCan, useMe } from '@/hooks/useAuth'

/** Private notes the team keeps about one operator ("called, will pay Friday"). */
export function OperatorNotes({ operatorId }: { operatorId: number }) {
  const { t, i18n } = useTranslation()
  const { data: me } = useMe()
  const isOwner = useCan('team.manage')
  const { data: notes, isLoading } = useOperatorNotes(operatorId)
  const add = useAddOperatorNote(operatorId)
  const remove = useDeleteOperatorNote(operatorId)
  const [body, setBody] = useState('')

  const when = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    add.mutate(body.trim(), { onSuccess: () => setBody('') })
  }

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        <form onSubmit={onSubmit} className="flex flex-col gap-2">
          <Label htmlFor="operator_note">{t('admin.notes.add')}</Label>
          <Textarea
            id="operator_note"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('admin.notes.placeholder')}
            maxLength={2000}
          />
          <Button type="submit" size="sm" className="w-fit" disabled={add.isPending || !body.trim()}>
            {t('admin.notes.save')}
          </Button>
          {add.isError && (
            <p role="alert" className="text-sm text-destructive">
              {t('admin.notes.error')}
            </p>
          )}
        </form>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : notes?.length ? (
          <ul className="flex flex-col divide-y">
            {notes.map((note) => (
              <li key={note.id} className="flex flex-col gap-1 py-3 first:pt-0">
                <p className="text-sm whitespace-pre-wrap">{note.body}</p>
                <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span>
                    {note.user?.name ?? '—'} · {when(note.created_at)}
                  </span>
                  {(note.user_id === me?.user.id || isOwner) && (
                    <button
                      type="button"
                      className="hover:text-destructive hover:underline"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(note.id)}
                    >
                      {t('common.delete')}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">{t('admin.notes.empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}
