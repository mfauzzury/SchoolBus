import { useRef, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface AvatarUploadProps {
  imageUrl: string | null
  fallback: ReactNode
  onUpload: (file: File) => void
  isUploading?: boolean
  shape?: 'circle' | 'square'
}

export function AvatarUpload({ imageUrl, fallback, onUpload, isUploading, shape = 'circle' }: AvatarUploadProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const onFileSelected = (file?: File) => {
    if (file) onUpload(file)
  }

  return (
    <div className="flex items-center gap-4">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className={cn(
            'size-16 border object-cover',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          )}
        />
      ) : (
        <div
          className={cn(
            'flex size-16 items-center justify-center border bg-muted/50 text-muted-foreground',
            shape === 'circle' ? 'rounded-full' : 'rounded-lg',
          )}
        >
          {fallback}
        </div>
      )}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onFileSelected(e.target.files?.[0])}
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? t('common.uploading') : imageUrl ? t('common.changePhoto') : t('common.uploadPhoto')}
      </Button>
    </div>
  )
}
