/** Platform-team roles: Owner (kept as `saas_admin`), Finance and Support. */
const PLATFORM_ROLES = ['saas_admin', 'saas_finance', 'saas_support']

export function isPlatformUser(roles: string[]): boolean {
  return roles.some((role) => PLATFORM_ROLES.includes(role))
}

export type TeamLevel = 'owner' | 'finance' | 'support'

export const TEAM_LEVELS: TeamLevel[] = ['owner', 'finance', 'support']
