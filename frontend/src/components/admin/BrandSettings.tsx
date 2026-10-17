import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { isAxiosError } from 'axios'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { BrandLogo, BrandMark } from '@/components/BrandLogo'
import { useBrand, useRemoveBrandFile, useSaveBrandName, useUploadBrandFile } from '@/hooks/useBrand'
import { DEFAULT_BRAND, type BrandPart } from '@/api/brand'

/** The first validation message from a failed upload or save, if the server sent one. */
function serverError(error: unknown): string | undefined {
  if (!isAxiosError(error)) return undefined
  const errors = error.response?.data?.errors as Record<string, string[]> | undefined
  return errors ? Object.values(errors)[0]?.[0] : undefined
}

/** The Owner's Brand tab: the name, a square icon and a wide logo, each with an optional SVG. */
export function BrandSettings() {
  const { t } = useTranslation()
  const brand = useBrand()

  return (
    <div className="flex flex-col gap-6">
      <p className="text-sm text-muted-foreground">{t('admin.system.brand.intro')}</p>
      <BrandPreview />
      <NameCard key={brand.name} />
      <div className="grid gap-6 lg:grid-cols-2">
        <ImageCard part="icon" />
        <ImageCard part="logo" />
      </div>
    </div>
  )
}

/** The header on a light and a dark background, so a logo that vanishes on one is caught here. */
function BrandPreview() {
  const { t } = useTranslation()
  const brand = useBrand()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.system.brand.previewTitle')}</CardTitle>
        <p className="text-sm text-muted-foreground">{t('admin.system.brand.previewHelp')}</p>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {[
          { key: 'light', label: t('admin.system.brand.onLight'), className: 'bg-white text-neutral-900' },
          { key: 'dark', label: t('admin.system.brand.onDark'), className: 'bg-neutral-950 text-white' },
        ].map((bg) => (
          <div key={bg.key} className="flex flex-col gap-1.5">
            <span className="text-xs text-muted-foreground">{bg.label}</span>
            <div className={`flex h-16 items-center gap-2 rounded-lg border px-4 text-lg font-medium ${bg.className}`}>
              <BrandLogo brand={brand} />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function NameCard() {
  const { t } = useTranslation()
  const brand = useBrand()
  const save = useSaveBrandName()
  const [name, setName] = useState(brand.name)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('admin.system.brand.nameTitle')}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="brand-name">{t('admin.system.brand.name')}</Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="brand-name"
              value={name}
              maxLength={60}
              onChange={(e) => setName(e.target.value)}
              placeholder={DEFAULT_BRAND.name}
              className="max-w-sm"
            />
            <Button onClick={() => save.mutate(name)} disabled={save.isPending || name.trim() === brand.name}>
              {save.isPending ? t('common.saving') : t('common.save')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('admin.system.brand.nameHelp', { name: DEFAULT_BRAND.name })}</p>
        </div>
        {save.isError && (
          <p role="alert" className="text-sm text-destructive">
            {serverError(save.error) ?? t('admin.system.brand.saveError')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}

function ImageCard({ part }: { part: BrandPart }) {
  const { t } = useTranslation()
  const brand = useBrand()
  const upload = useUploadBrandFile()
  const remove = useRemoveBrandFile()
  const imageInput = useRef<HTMLInputElement>(null)
  const svgInput = useRef<HTMLInputElement>(null)

  const image = part === 'icon' ? brand.icon_url : brand.logo_url
  const svg = part === 'icon' ? brand.icon_svg_url : brand.logo_svg_url
  const busy = upload.isPending || remove.isPending
  const error = serverError(upload.error) ?? serverError(remove.error)

  const send = (file?: File) => {
    if (file) upload.mutate({ part, file })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t(`admin.system.brand.${part}.title`)}</CardTitle>
        <p className="text-sm text-muted-foreground">{t(`admin.system.brand.${part}.help`)}</p>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex min-h-20 items-center justify-center rounded-lg border bg-muted/30 p-3">
          {image ? (
            <img
              src={svg ?? image}
              alt=""
              className={part === 'icon' ? 'size-16 object-contain' : 'h-12 w-auto max-w-full object-contain'}
            />
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BrandMark />
              {t('admin.system.brand.usingDefault')}
            </div>
          )}
        </div>

        <ul className="flex flex-col gap-2 text-sm">
          <li className="flex items-center justify-between gap-2">
            <span>{t('admin.system.brand.imageFile')}</span>
            {image ? <Badge variant="success">{t('admin.system.brand.uploaded')}</Badge> : <Badge variant="outline">{t('admin.system.brand.notSet')}</Badge>}
          </li>
          <li className="flex items-center justify-between gap-2">
            <span>{t('admin.system.brand.svgFile')}</span>
            {svg ? <Badge variant="success">{t('admin.system.brand.uploaded')}</Badge> : <Badge variant="outline">{t('admin.system.brand.optional')}</Badge>}
          </li>
        </ul>

        <input
          ref={imageInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          data-testid={`${part}-image-input`}
          onChange={(e) => {
            send(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <input
          ref={svgInput}
          type="file"
          accept=".svg,image/svg+xml"
          className="hidden"
          data-testid={`${part}-svg-input`}
          onChange={(e) => {
            send(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => imageInput.current?.click()} disabled={busy}>
            {upload.isPending ? t('common.uploading') : image ? t('admin.system.brand.replaceImage') : t('admin.system.brand.uploadImage')}
          </Button>
          <Button size="sm" variant="outline" onClick={() => svgInput.current?.click()} disabled={busy || !image}>
            {svg ? t('admin.system.brand.replaceSvg') : t('admin.system.brand.addSvg')}
          </Button>
          {svg && (
            <Button size="sm" variant="ghost" onClick={() => remove.mutate({ part, svgOnly: true })} disabled={busy}>
              {t('admin.system.brand.removeSvg')}
            </Button>
          )}
          {image && (
            <Button size="sm" variant="ghost" onClick={() => remove.mutate({ part })} disabled={busy}>
              {t('admin.system.brand.useDefault')}
            </Button>
          )}
        </div>
        {!image && <p className="text-xs text-muted-foreground">{t('admin.system.brand.svgNeedsImage')}</p>}

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        {(upload.isError || remove.isError) && !error && (
          <p role="alert" className="text-sm text-destructive">
            {t('admin.system.brand.saveError')}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
