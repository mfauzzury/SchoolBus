import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button, buttonVariants } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'
import { useMe } from '@/hooks/useAuth'
import { BrandLogo } from '@/components/BrandLogo'
import { cn } from '@/lib/utils'

export function MarketingLayout() {
  const { t } = useTranslation()
  const { data: me, isLoading: meLoading } = useMe()
  const [mobileOpen, setMobileOpen] = useState(false)
  const dashboardPath = me?.roles.includes('parent') ? '/parent/dashboard' : '/operator/dashboard'

  const navItems = [
    { to: '/', label: t('marketingNav.parents') },
    { to: '/operators', label: t('marketingNav.operators') },
    { to: '/about', label: t('marketingNav.about') },
    { to: '/contact', label: t('marketingNav.contact') },
  ]

  const authLink = !meLoading && (
    <Link
      to={me ? dashboardPath : '/login'}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
    >
      {me ? t('nav.dashboard') : t('common.logIn')}
    </Link>
  )

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/85 backdrop-blur-sm">
        <div className="mx-auto flex max-w-content items-center justify-between gap-4 px-4 lg:px-8 py-4">
          <Link to="/" className="flex shrink-0 items-center gap-2 text-lg font-medium">
            <BrandLogo accentDomain />
          </Link>

          <nav className="hidden items-center gap-6 lg:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  cn(
                    'text-sm text-muted-foreground hover:text-foreground',
                    isActive && 'font-medium text-foreground',
                  )
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <ThemeSwitcher />
            <LanguageSwitcher />
            {authLink}
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X /> : <Menu />}
          </Button>
        </div>

        {mobileOpen && (
          <div className="border-t px-6 py-3 lg:hidden">
            <nav className="flex flex-col gap-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted',
                      isActive && 'font-medium text-foreground',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
            <div className="mt-3 flex items-center gap-3 border-t pt-3">
              <ThemeSwitcher />
              <LanguageSwitcher />
              {authLink}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t py-8">
        <div className="mx-auto flex max-w-content flex-col items-center gap-4 px-4 lg:px-8 text-center text-sm text-muted-foreground sm:flex-row sm:justify-between sm:text-left">
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <span className="flex items-center gap-2 font-medium text-foreground">
              <BrandLogo />
            </span>
            <span>{t('landing.footer')}</span>
          </div>
          <nav className="flex flex-wrap items-center justify-center gap-4">
            {navItems.map((item) => (
              <Link key={item.to} to={item.to} className="hover:text-foreground">
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mx-auto mt-6 flex max-w-content flex-col items-center gap-3 border-t px-4 lg:px-8 pt-6 text-xs text-muted-foreground sm:flex-row sm:justify-between">
          <span>{t('footer.copyright', { year: new Date().getFullYear() })}</span>
          <nav className="flex items-center gap-4">
            <Link to="/terms" className="hover:text-foreground">
              {t('footer.terms')}
            </Link>
            <Link to="/privacy" className="hover:text-foreground">
              {t('footer.privacy')}
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
