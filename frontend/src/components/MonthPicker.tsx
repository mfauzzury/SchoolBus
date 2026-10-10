import { useTranslation } from 'react-i18next'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const NONE = 'none'
const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)

/**
 * Pick a month and a year from two dropdowns. Used instead of the browser's
 * own month field, which is missing or confusing in several browsers.
 * The value is "YYYY-MM", or "" when nothing is chosen.
 */
export function MonthPicker({
  value,
  onChange,
  label,
}: {
  value: string
  onChange: (value: string) => void
  // Names both dropdowns for screen readers, e.g. "Stop billing after".
  label: string
}) {
  const { t, i18n } = useTranslation()
  const thisYear = new Date().getFullYear()
  const [valueYear, valueMonth] = value ? value.split('-') : ['', '']
  const year = valueYear || String(thisYear)

  // A year already saved outside the usual range must still be selectable.
  const years = [...new Set([thisYear - 1, thisYear, thisYear + 1, thisYear + 2, thisYear + 3, Number(year)])].sort()

  const monthLabels: Record<string, string> = {
    [NONE]: t('operator.students.monthNotSet'),
    ...Object.fromEntries(
      MONTHS.map((m) => [
        String(m).padStart(2, '0'),
        new Date(2000, m - 1, 1).toLocaleDateString(i18n.language === 'ms' ? 'ms-MY' : 'en-MY', { month: 'long' }),
      ]),
    ),
  }
  const yearLabels = Object.fromEntries(years.map((y) => [String(y), String(y)]))

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,6rem)] gap-2">
      <Select
        items={monthLabels}
        value={valueMonth || NONE}
        onValueChange={(v) => onChange(!v || v === NONE ? '' : `${year}-${v}`)}
      >
        <SelectTrigger className="w-full" aria-label={`${label}: ${t('common.month')}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(monthLabels).map(([key, name]) => (
            <SelectItem key={key} value={key}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        items={yearLabels}
        value={year}
        disabled={!valueMonth}
        onValueChange={(v) => v && valueMonth && onChange(`${v}-${valueMonth}`)}
      >
        <SelectTrigger className="w-full" aria-label={`${label}: ${t('common.year')}`}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {years.map((y) => (
            <SelectItem key={y} value={String(y)}>
              {y}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
