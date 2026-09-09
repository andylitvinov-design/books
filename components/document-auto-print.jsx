'use client'
import { useEffect } from 'react'
export function DocumentAutoPrint({ enabled }) {
  useEffect(() => { if (enabled) window.print() }, [enabled])
  return null
}
