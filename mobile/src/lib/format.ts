export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-MY', { hour: 'numeric', minute: '2-digit' })
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatAgo(iso: string, now: number): string {
  const seconds = Math.max(0, Math.round((now - new Date(iso).getTime()) / 1000))
  return seconds < 60 ? `${seconds}s ago` : `${Math.floor(seconds / 60)} min ago`
}

export function formatMoney(value: number | string): string {
  return `RM ${Number(value).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function firstName(fullName: string): string {
  return fullName.split(' ')[0]
}
