'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Clock, Activity, Settings } from 'lucide-react'
import { DarkModeToggle } from '@/components/dashboard/dark-mode-toggle'

const NAV_LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/history', label: 'History', icon: Clock },
  { href: '/health', label: 'Health', icon: Activity },
] as const

export function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="fixed left-0 top-0 z-50 h-screen w-[264px] flex flex-col py-5 px-3 bg-[#F7F8FA] dark:bg-[#0C1018] border-r border-border">
      {/* Navigation links */}
      <div className="flex flex-col gap-0.5 flex-1 mt-1">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href)
          const Icon = link.icon

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 h-9 rounded-lg transition-colors text-sm ${
                isActive
                  ? 'bg-accent text-foreground dark:text-white font-medium'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent'
              }`}
            >
              <Icon size={18} strokeWidth={1.5} className="shrink-0" />
              <span>{link.label}</span>
            </Link>
          )
        })}
      </div>

      {/* Bottom actions */}
      <div className="flex flex-col gap-0.5">
        <button
          className="flex items-center gap-2.5 px-3 h-9 rounded-lg transition-colors text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
          title="Settings"
        >
          <Settings size={18} strokeWidth={1.5} className="shrink-0" />
          <span>Settings</span>
        </button>
        <DarkModeToggle />
      </div>
    </nav>
  )
}
