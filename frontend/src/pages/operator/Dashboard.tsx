import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMe } from '@/hooks/useAuth'
import { useTenant } from '@/hooks/useTenant'

export function OperatorDashboard() {
  const { data } = useMe()
  const { tenant } = useTenant()
  const [copied, setCopied] = useState(false)

  const copyCode = async () => {
    if (!tenant) return
    await navigator.clipboard.writeText(tenant.operator_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-medium">
        Welcome, {data?.user.name} — {tenant?.company_name}
      </h1>

      <Card className="max-w-md">
        <CardHeader>
          <CardTitle className="text-base">Your Operator ID</CardTitle>
          <p className="text-sm text-muted-foreground">
            Share this 4-digit ID with parents so they can register and enroll their children.
          </p>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <span className="rounded-lg border bg-muted/50 px-4 py-2 text-2xl font-medium tracking-[0.3em]">
            {tenant?.operator_code}
          </span>
          <Button variant="outline" size="sm" onClick={copyCode}>
            {copied ? <Check /> : <Copy />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
