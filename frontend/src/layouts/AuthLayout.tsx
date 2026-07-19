import { Link, Outlet } from 'react-router-dom'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'

export function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      <header className="border-b">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link to="/" className="text-lg font-medium hover:text-primary">
            BasSekolah.my
          </Link>
          <div className="flex items-center gap-3">
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
