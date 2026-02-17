'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Bed, Baby, Sofa, Monitor, TreePine, Home, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROOM_ICONS } from '@/lib/constants'
import type { SensorConfig } from '@/lib/types'

/** Available icons for room selection */
const ICON_OPTIONS: { name: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { name: 'Bed', icon: Bed },
  { name: 'Baby', icon: Baby },
  { name: 'Sofa', icon: Sofa },
  { name: 'Monitor', icon: Monitor },
  { name: 'TreePine', icon: TreePine },
  { name: 'Home', icon: Home },
]

interface EditRoomDialogProps {
  sensor: SensorConfig
  isOpen: boolean
  onClose: () => void
  onSave: (updated: SensorConfig) => void
}

export function EditRoomDialog({
  sensor,
  isOpen,
  onClose,
  onSave,
}: EditRoomDialogProps) {
  const [displayName, setDisplayName] = useState(sensor.display_name)
  const [selectedIcon, setSelectedIcon] = useState<string>('Home')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load current icon preference from localStorage on mount
  useEffect(() => {
    try {
      const storedIcon = localStorage.getItem('room-icon-' + sensor.mac_address)
      if (storedIcon) {
        setSelectedIcon(storedIcon)
        return
      }
    } catch {
      // Ignore
    }
    // Fall back to ROOM_ICONS mapping based on room_name
    const roomKey = sensor.room_name?.toLowerCase() ?? 'default'
    const iconName = ROOM_ICONS[roomKey] ?? ROOM_ICONS['default'] ?? 'Home'
    setSelectedIcon(iconName)
  }, [sensor.mac_address, sensor.room_name])

  // Reset form when sensor changes
  useEffect(() => {
    setDisplayName(sensor.display_name)
    setError(null)
  }, [sensor])

  const handleSave = async () => {
    const trimmedName = displayName.trim()
    if (!trimmedName) {
      setError('Display name cannot be empty')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Save icon to localStorage (synchronous)
      localStorage.setItem('room-icon-' + sensor.mac_address, selectedIcon)

      // Save display_name to Supabase
      const supabase = createClient()
      const { error: dbError } = await supabase
        .from('sensor_config')
        .update({ display_name: trimmedName })
        .eq('id', sensor.id)

      if (dbError) {
        setError(`Failed to save: ${dbError.message}`)
        setSaving(false)
        return
      }

      // Call onSave with updated config
      onSave({
        ...sensor,
        display_name: trimmedName,
      })
    } catch (err) {
      setError('An unexpected error occurred')
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Edit Room</DialogTitle>
          <DialogDescription>
            Change the display name and icon for this room.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Display name input */}
          <div className="space-y-2">
            <Label htmlFor="display-name">Display Name</Label>
            <Input
              id="display-name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Room name"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
              }}
            />
          </div>

          {/* Icon selector */}
          <div className="space-y-2">
            <Label>Icon</Label>
            <div className="flex gap-2 flex-wrap">
              {ICON_OPTIONS.map(({ name, icon: Icon }) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setSelectedIcon(name)}
                  className={`p-2 rounded-md border transition-colors ${
                    selectedIcon === name
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border hover:border-primary/50 text-muted-foreground hover:text-foreground'
                  }`}
                  aria-label={`Select ${name} icon`}
                >
                  <Icon className="h-5 w-5" />
                </button>
              ))}
            </div>
          </div>

          {/* Error message */}
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
