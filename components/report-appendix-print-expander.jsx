'use client'

import { useEffect, useRef } from 'react'

/**
 * Native <details> keep the library appendix closed on screen.
 * Temporarily expand only initially closed remedy descriptions when printing;
 * a closed <details> otherwise omits source text from Chromium/WebKit print.
 * The separate generated PDF remains unchanged.
 */
export function ReportAppendixPrintExpander() {
  const marker = useRef(null)

  useEffect(() => {
    const temporarilyOpened = new Set()

    function expandForPrint() {
      const report = marker.current?.closest('.canonical-document')
      if (!report) return

      for (const appendix of report.querySelectorAll('details.canonical-remedy-profile-disclosure')) {
        if (!appendix.open) {
          temporarilyOpened.add(appendix)
          appendix.open = true
        }
      }
    }

    function restoreAfterPrint() {
      for (const appendix of temporarilyOpened) {
        if (appendix.isConnected) appendix.open = false
      }
      temporarilyOpened.clear()
    }

    window.addEventListener('beforeprint', expandForPrint)
    window.addEventListener('afterprint', restoreAfterPrint)
    return () => {
      window.removeEventListener('beforeprint', expandForPrint)
      window.removeEventListener('afterprint', restoreAfterPrint)
      restoreAfterPrint()
    }
  }, [])

  return <span ref={marker} hidden aria-hidden="true" />
}
