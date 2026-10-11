import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Pagination } from '@/components/ui/pagination'
import { useInbox } from '@/hooks/useAdmin'
import { pillTabClass, pillTabListClass } from '@/lib/tabs'

type Tab = 'open' | 'handled'

export function AdminInbox() {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState<Tab>('open')
  const [page, setPage] = useState(1)
  const { data, isLoading } = useInbox({ status: tab, page })

  const when = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', {
      dateStyle: 'medium',
      timeStyle: 'short',
    })

  const choose = (next: Tab) => {
    setTab(next)
    setPage(1)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">{t('admin.inbox.title')}</h1>

      <nav role="group" aria-label={t('admin.inbox.title')} className={pillTabListClass}>
        <button type="button" onClick={() => choose('open')} className={pillTabClass(tab === 'open')}>
          {t('admin.inbox.open')}
        </button>
        <button type="button" onClick={() => choose('handled')} className={pillTabClass(tab === 'handled')}>
          {t('admin.inbox.handled')}
        </button>
      </nav>

      <Card>
        <CardContent className="flex flex-col gap-4">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">{t('common.loading')}</p>
          ) : data?.data.length ? (
            <>
              <ul className="flex flex-col divide-y">
                {data.data.map((message) => (
                  <li key={message.id}>
                    <Link
                      to={`/admin/inbox/${message.id}`}
                      className="flex flex-col gap-1 py-3 hover:bg-muted/50 sm:px-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {message.name}
                          {message.handled_at && (
                            <Badge variant="success">{t('admin.inbox.handledBadge')}</Badge>
                          )}
                        </span>
                        <span className="text-xs text-muted-foreground">{when(message.created_at)}</span>
                      </div>
                      <p className="line-clamp-2 text-sm text-muted-foreground">{message.message}</p>
                    </Link>
                  </li>
                ))}
              </ul>
              <Pagination page={data.current_page} pageCount={data.last_page} onPageChange={setPage} />
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              {tab === 'open' ? t('admin.inbox.emptyOpen') : t('admin.inbox.emptyHandled')}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
