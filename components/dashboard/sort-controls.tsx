'use client'

import { ArrowUpDown, ArrowDownAZ, Thermometer, GripVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
        <Button variant="ghost" size="icon">
          <ArrowUpDown className="h-4 w-4" />
          <span className="sr-only">Sort rooms</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuRadioGroup
          value={sortMode}
          onValueChange={(value) => onSortChange(value as SortMode)}
        >
          <DropdownMenuRadioItem value="alphabetical">
            <ArrowDownAZ className="h-4 w-4 mr-2" />
            Alphabetical
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="temperature">
            <Thermometer className="h-4 w-4 mr-2" />
            By Temperature
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="custom">
            <GripVertical className="h-4 w-4 mr-2" />
            Custom Order
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
