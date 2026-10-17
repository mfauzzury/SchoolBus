/** Where to send someone after they log in: the page they were trying to reach, if it is one of ours. */
export function safeNextPath(value: string | null): string | null {
  // Only a path inside this app. "//host" and "/\\host" would leave the site.
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.includes('\\')) return null
  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login/')) return null
  return value
}

/** The login page, remembering the page the person wanted. */
export function loginPathFor(next: string, extra = ''): string {
  return `/login?${extra}next=${encodeURIComponent(next)}`
}
