'use client'

import { ArrowUpDown, ArrowDownAZ, Thermometer, GripVertical } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { SortMode } from '@/lib/types'

interface SortControlsProps {
  sortMode: SortMode
  onSortChange: (mode: SortMode) => void
}

export function SortControls({ sortMode, onSortChange }: SortControlsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="w-8 h-8 flex items-center justify-center rounded-md transition-colors text-foreground/80 hover:bg-accent">
          <ArrowUpDown className="h-4 w-4" strokeWidth={1.5} />
          <span className="sr-only">Sort rooms</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={sortMode}
          onValueChange={(value) => onSortChange(value as SortMode)}
        >
          <DropdownMenuRadioItem value="alphabetical">
            <ArrowDownAZ className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
            Alphabetical
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="temperature">
            <Thermometer className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
            By Temperature
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="custom">
            <GripVertical className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
            Custom Order
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
