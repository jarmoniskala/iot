'use client'

import type { SensorConfig } from '@/lib/types'

interface EditRoomDialogProps {
  sensor: SensorConfig
  isOpen: boolean
  onClose: () => void
  onSave: (updated: SensorConfig) => void
}

/**
 * Placeholder for EditRoomDialog.
 * Full implementation in Task 2.
 */
export function EditRoomDialog({ isOpen, onClose }: EditRoomDialogProps) {
  if (!isOpen) return null
  return null
}
