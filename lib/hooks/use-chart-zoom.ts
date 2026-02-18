'use client'

import { useState, useCallback, useRef } from 'react'

export interface ChartDomain {
  left: number
  right: number
}

interface DragState {
  active: boolean
  startX: number
  startDomain: ChartDomain
}

/**
 * Custom hook for scroll-to-zoom and drag-to-pan interaction on charts.
 * Domain values are unix timestamps (milliseconds).
 */
export function useChartZoom(initialLeft: number, initialRight: number) {
  const [domain, setDomain] = useState<ChartDomain>({
    left: initialLeft,
    right: initialRight,
  })

  const dragRef = useRef<DragState>({
    active: false,
    startX: 0,
    startDomain: { left: initialLeft, right: initialRight },
  })

  const boundsRef = useRef({ left: initialLeft, right: initialRight })

  // Update bounds when initial values change
  if (boundsRef.current.left !== initialLeft || boundsRef.current.right !== initialRight) {
    boundsRef.current = { left: initialLeft, right: initialRight }
  }

  const clamp = useCallback(
    (d: ChartDomain): ChartDomain => {
      const bounds = boundsRef.current
      const range = d.right - d.left
      let left = d.left
      let right = d.right

      // Enforce minimum range (1 minute)
      if (range < 60_000) {
        return { left: d.left, right: d.left + 60_000 }
      }

      // Clamp to initial bounds
      if (left < bounds.left) {
        left = bounds.left
        right = bounds.left + range
      }
      if (right > bounds.right) {
        right = bounds.right
        left = bounds.right - range
      }

      // Final clamp
      left = Math.max(left, bounds.left)
      right = Math.min(right, bounds.right)

      return { left, right }
    },
    []
  )

  const handleWheel = useCallback(
    (e: React.WheelEvent, chartWidth: number) => {
      e.preventDefault()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const ratio = mouseX / chartWidth

      setDomain((prev) => {
        const range = prev.right - prev.left
        const factor = e.deltaY > 0 ? 1.2 : 0.8 // zoom out / zoom in
        const newRange = range * factor
        const focal = prev.left + range * ratio

        const newLeft = focal - newRange * ratio
        const newRight = focal + newRange * (1 - ratio)

        return clamp({ left: newLeft, right: newRight })
      })
    },
    [clamp]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      dragRef.current = {
        active: true,
        startX: e.clientX,
        startDomain: { ...domain },
      }
    },
    [domain]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent, chartWidth: number) => {
      if (!dragRef.current.active) return
      const dx = e.clientX - dragRef.current.startX
      const { startDomain } = dragRef.current
      const range = startDomain.right - startDomain.left
      const shift = -(dx / chartWidth) * range

      setDomain(
        clamp({
          left: startDomain.left + shift,
          right: startDomain.right + shift,
        })
      )
    },
    [clamp]
  )

  const handleMouseUp = useCallback(() => {
    dragRef.current.active = false
  }, [])

  const resetZoom = useCallback(() => {
    setDomain({ left: boundsRef.current.left, right: boundsRef.current.right })
  }, [])

  const isZoomed =
    domain.left !== boundsRef.current.left ||
    domain.right !== boundsRef.current.right

  return {
    domain,
    setDomain,
    handleWheel,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    resetZoom,
    isZoomed,
  }
}
