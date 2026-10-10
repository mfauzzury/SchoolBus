import { Link, Outlet } from 'react-router-dom'
import { BrandMark } from '@/layouts/MarketingLayout'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { ThemeSwitcher } from '@/components/ThemeSwitcher'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b">
        <div className="mx-auto flex max-w-content items-center justify-between px-4 lg:px-8 py-4">
          <Link to="/" className="flex items-center gap-2 text-lg font-medium hover:text-primary">
            <BrandMark />
            BasSekolah.my
          </Link>
          <div className="flex items-center gap-3">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>
      </header>
      <div className="flex flex-1 items-center justify-center p-4">
        <Outlet />
      </div>
    </div>
  )
}
