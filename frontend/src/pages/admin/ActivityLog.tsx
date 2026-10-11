import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Pagination } from '@/components/ui/pagination'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActivity, useActivityActions, useTeam } from '@/hooks/useAdmin'
import type { ActivityEntry } from '@/api/admin'

const ALL = 'all'

export function AdminActivityLog() {
  const { t, i18n } = useTranslation()
  const { data: team } = useTeam()
  const { data: actions } = useActivityActions()
  const [page, setPage] = useState(1)
  const [userId, setUserId] = useState(ALL)
  const [action, setAction] = useState(ALL)

  const { data: activity, isLoading } = useActivity({
    page,
    user_id: userId !== ALL ? Number(userId) : undefined,
    action: action !== ALL ? action : undefined,
  })

  // Unknown codes (added by a newer backend) still show, just untranslated.
  const actionLabel = (code: string) => t(`admin.activity.actions.${code}`, { defaultValue: code })

  const detail = (entry: ActivityEntry) => {
    const props = entry.properties ?? {}
    const parts: string[] = []
    if (props.member) parts.push(String(props.member))
    if (props.level) parts.push(t(`admin.team.levels.${props.level}`))
    if (props.collection_id) parts.push(String(props.collection_id))
    return parts.join(' · ')
  }

  const when = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const people: Record<string, string> = {
    [ALL]: t('admin.activity.everyone'),
    ...Object.fromEntries((team ?? []).map((member) => [String(member.id), member.name])),
  }
  const actionItems: Record<string, string> = {
    [ALL]: t('admin.activity.allActions'),
    ...Object.fromEntries((actions ?? []).map((code) => [code, actionLabel(code)])),
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('admin.activity.title')}</h1>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.activity.person')}</Label>
              <Select
                items={people}
                value={userId}
                onValueChange={(value) => {
                  setUserId(value ?? ALL)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(people).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('admin.activity.what')}</Label>
              <Select
                items={actionItems}
                value={action}
                onValueChange={(value) => {
                  setAction(value ?? ALL)
                  setPage(1)
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(actionItems).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : activity?.data.length ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('admin.activity.when')}</TableHead>
                    <TableHead>{t('admin.activity.person')}</TableHead>
                    <TableHead>{t('admin.activity.what')}</TableHead>
                    <TableHead>{t('admin.activity.operator')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activity.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="whitespace-nowrap">{when(entry.created_at)}</TableCell>
                      <TableCell>{entry.user?.name ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{actionLabel(entry.action)}</span>
                          {detail(entry) && (
                            <span className="text-xs text-muted-foreground">{detail(entry)}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {entry.bus_operator ? (
                          <Link
                            to={`/admin/operators/${entry.bus_operator.id}`}
                            className="hover:text-primary hover:underline"
                          >
                            {entry.bus_operator.company_name}
                          </Link>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Pagination page={activity.current_page} pageCount={activity.last_page} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t('admin.activity.empty')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
