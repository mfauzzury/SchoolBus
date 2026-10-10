import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useActivity } from '@/hooks/useAdmin'

/** What the platform team has done to this one operator. */
export function OperatorActivity({ operatorId }: { operatorId: number }) {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useActivity({ tenant_id: operatorId, page })

  const when = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  return (
    <Card>
      <CardContent className="flex flex-col gap-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
        ) : data?.data.length ? (
          <>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('admin.activity.when')}</TableHead>
                  <TableHead>{t('admin.activity.person')}</TableHead>
                  <TableHead>{t('admin.activity.what')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="whitespace-nowrap">{when(entry.created_at)}</TableCell>
                    <TableCell>{entry.user?.name ?? '—'}</TableCell>
                    <TableCell>
                      {t(`admin.activity.actions.${entry.action}`, { defaultValue: entry.action })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Pagination page={data.current_page} pageCount={data.last_page} onPageChange={setPage} />
          </>
        ) : (
          <p className="text-sm text-muted-foreground">{t('admin.activity.empty')}</p>
        )}
      </CardContent>
    </Card>
  )
}
