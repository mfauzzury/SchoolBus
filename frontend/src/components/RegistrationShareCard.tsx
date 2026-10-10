import { useRef, useState } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { Check, Copy, Download, Link2, MessageCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface Props {
  operatorCode: string
  companyName: string
}

type Copied = 'code' | 'link' | null

export function RegistrationShareCard({ operatorCode, companyName }: Props) {
  const { t } = useTranslation()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState<Copied>(null)

  const link = `${window.location.origin}/register/${operatorCode}`

  const copy = async (value: string, which: Exclude<Copied, null>) => {
    await navigator.clipboard.writeText(value)
    setCopied(which)
    setTimeout(() => setCopied(null), 1500)
  }

  const downloadQr = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.href = canvas.toDataURL('image/png')
    a.download = `registration-qr-${operatorCode}.png`
    a.click()
  }

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(
    t('operator.dashboard.share.message', { company: companyName, link }),
  )}`

  return (
    <Card>
      <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] lg:gap-0 lg:divide-x">
        {/* 1 · Operator ID */}
        <section className="flex flex-col gap-3 lg:pr-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium">{t('operator.dashboard.operatorId')}</h2>
            <p className="text-sm text-muted-foreground">
              {t('operator.dashboard.operatorIdDescription')}
            </p>
          </div>
          <div className="mt-auto flex items-center gap-3">
            <span className="rounded-lg border bg-muted/50 px-4 py-2 text-2xl font-medium tracking-[0.3em]">
              {operatorCode}
            </span>
            <Button variant="outline" size="sm" onClick={() => copy(operatorCode, 'code')}>
              {copied === 'code' ? <Check /> : <Copy />}
              {copied === 'code' ? t('operator.dashboard.copied') : t('operator.dashboard.copy')}
            </Button>
          </div>
        </section>

        {/* 2 · Registration link */}
        <section className="flex min-w-0 flex-col gap-3 lg:px-6">
          <h2 className="text-base font-medium">{t('operator.dashboard.share.linkLabel')}</h2>
          <div className="flex items-center gap-2 rounded-lg border bg-muted/50 px-3 py-2 text-sm">
            <Link2 className="size-4 shrink-0 text-muted-foreground" />
            <span className="truncate" data-testid="registration-link">
              {link}
            </span>
          </div>
          <div className="mt-auto flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => copy(link, 'link')}>
              {copied === 'link' ? <Check /> : <Copy />}
              {copied === 'link'
                ? t('operator.dashboard.copied')
                : t('operator.dashboard.share.copyLink')}
            </Button>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <MessageCircle />
              {t('operator.dashboard.share.whatsapp')}
            </a>
          </div>
        </section>

        {/* 3 · QR code */}
        <section className="flex flex-col items-center gap-2 lg:pl-6">
          <div className="rounded-lg border bg-white p-2">
            <QRCodeCanvas
              ref={canvasRef}
              value={link}
              size={512}
              level="M"
              marginSize={0}
              style={{ width: 120, height: 120 }}
              aria-label={t('operator.dashboard.share.qrAlt')}
            />
          </div>
          <Button variant="outline" size="sm" onClick={downloadQr}>
            <Download />
            {t('operator.dashboard.share.downloadQr')}
          </Button>
        </section>
      </CardContent>
    </Card>
  )
}
