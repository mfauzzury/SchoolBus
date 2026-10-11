import type { ReactNode } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

/** The frame every chart on the report sits in: a title, the chart, and an optional footnote. */
export function ChartCard({
  title,
  note,
  className,
  children,
}: {
  title: string
  note?: string
  className?: string
  children: ReactNode
}) {
  return (
    <Card size="sm" className={cn('h-full', className)}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-3">
        {children}
        {note && <p className="mt-auto pt-1 text-xs text-muted-foreground">{note}</p>}
      </CardContent>
    </Card>
  )
}
