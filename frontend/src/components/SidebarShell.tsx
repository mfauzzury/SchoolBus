import { useState, type ReactNode } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X, type LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { cn } from '@/lib/utils'

export interface SidebarItem {
  to: string
  label: string
  icon: LucideIcon
  /** A small count (e.g. unread messages) or short text (e.g. "64%") shown beside the label. */
  badge?: number | string
  /** Match this exact address only, not the pages beneath it. */
  end?: boolean
}

export interface SidebarGroup {
  title: string
  items: SidebarItem[]
}

interface SidebarShellProps {
  /** Top of the sidebar: where it links to, and what it shows (name, logo). */
  brand: { to: string; content: ReactNode }
  groups: SidebarGroup[]
  userName?: string
  logoutLabel: string
  onLogout: () => void
  /** Notices above the page content (impersonation bar, announcements). */
  banners?: ReactNode
  children: ReactNode
}

/**
 * The left-hand menu used by the platform admin and the operator portal: a fixed
 * sidebar on desktop, a drawer on phones, with the page itself to its right.
 */
export function SidebarShell({
  brand,
  groups,
  userName,
  logoutLabel,
  onLogout,
  banners,
  children,
}: SidebarShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false)

  // A group with nothing in it (a feature switched off, a level without access) is dropped.
  const visible = groups.filter((group) => group.items.length > 0)

  const nav = (onNavigate?: () => void) => (
    <nav className="flex flex-col gap-4">
      {visible.map((group) => (
        <div key={group.title} className="flex flex-col gap-0.5">
          <span className="px-2 text-[11px] uppercase tracking-wider text-muted-foreground/70">
            {group.title}
          </span>
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'flex items-center justify-between rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground',
                  isActive && 'bg-muted font-medium text-foreground',
                )
              }
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <item.icon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium text-primary-foreground">
                  {item.badge}
                </span>
              ) : null}
            </NavLink>
          ))}
        </div>
      ))}
    </nav>
  )

  const account = (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <ThemeSwitcher />
        <LanguageSwitcher />
      </div>
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-sm text-muted-foreground">{userName}</span>
        <Button variant="outline" size="sm" onClick={onLogout}>
          {logoutLabel}
        </Button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen">
      <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col justify-between overflow-y-auto border-r p-4 lg:flex">
        <div className="flex flex-col gap-6">
          <Link to={brand.to} className="flex min-w-0 items-center gap-2 px-2 font-medium hover:text-primary">
            {brand.content}
          </Link>
          {nav()}
        </div>
        {account}
      </aside>

      <div className="lg:pl-60">
        {banners}

        <header className="border-b lg:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <Link to={brand.to} className="flex min-w-0 items-center gap-2 font-medium hover:text-primary">
              {brand.content}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X /> : <Menu />}
            </Button>
          </div>

          {mobileOpen && (
            <div className="flex flex-col gap-4 border-t px-4 py-3">
              {nav(() => setMobileOpen(false))}
              <div className="border-t pt-3">{account}</div>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-content p-4 sm:py-6 lg:px-8">{children}</main>
      </div>
    </div>
  )
}
