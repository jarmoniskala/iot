'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { DarkModeToggle } from '@/components/dashboard/dark-mode-toggle'
import { cn } from '@/lib/utils'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard' },
  { href: '/history', label: 'History' },
  { href: '/health', label: 'Health' },
] as const

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-12 items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-sm font-semibold tracking-tight">
            Home IoT Monitor
          </Link>
          <div className="flex items-center gap-1">
            {NAV_LINKS.map((link) => {
              const isActive =
                link.href === '/'
                  ? pathname === '/'
                  : pathname.startsWith(link.href)

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'px-3 py-1.5 text-sm rounded-md transition-colors',
                    isActive
                      ? 'font-medium text-foreground bg-muted'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  )}
                >
                  {link.label}
                </Link>
              )
            })}
          </div>
        </div>
        <DarkModeToggle />
      </div>
    </nav>
  )
}
