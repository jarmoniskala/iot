'use client'

import { useTheme } from 'next-themes'
import { Moon, Sun } from 'lucide-react'

export function DarkModeToggle() {
  const { theme, setTheme } = useTheme()

  return (
    <button
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      className="flex items-center gap-2.5 px-3 h-9 rounded-lg transition-colors text-sm text-muted-foreground hover:text-foreground hover:bg-accent"
      title="Toggle theme"
    >
      <div className="relative w-[18px] h-[18px] shrink-0">
        <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 absolute inset-0" strokeWidth={1.5} />
        <Moon className="h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 absolute inset-0" strokeWidth={1.5} />
      </div>
      <span>Theme</span>
    </button>
  )
}
