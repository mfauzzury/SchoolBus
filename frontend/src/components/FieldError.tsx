import { useTranslation } from 'react-i18next'

/** Form validation message; schemas supply i18n keys so errors follow the UI language. */
export function FieldError({ message }: { message?: string }) {
  const { t } = useTranslation()

  if (!message) return null

  return <p className="text-sm text-destructive">{t(message)}</p>
}
