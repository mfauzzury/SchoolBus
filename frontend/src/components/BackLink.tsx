import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface BackLinkProps {
  to: string
  children: ReactNode
  className?: string
}

/** The one "back" button for every detail page, so they all look and sit the same. */
export function BackLink({ to, children, className }: BackLinkProps) {
  return (
    <Link
      to={to}
      className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'self-start', className)}
    >
      <ArrowLeft /> {children}
    </Link>
  )
}
