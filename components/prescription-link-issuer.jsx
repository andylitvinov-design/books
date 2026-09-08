'use client'

import { useState } from 'react'

export function PrescriptionLinkIssuer({ recordId, hasAccess }) {
  const [status, setStatus] = useState('idle')

  const issueAndCopy = async () => {
    setStatus('working')
    try {
      const response = await fetch(`/api/admin/prescriptions/${recordId}/access`, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error('unavailable')
      const { selector, secret } = await response.json()
      const url = new URL(`/en/prescriptions/${selector}`, window.location.origin)
      url.hash = secret
      await navigator.clipboard.writeText(url.toString())
      setStatus('copied')
    } catch {
      setStatus('error')
    }
  }

  return <div className="prescription-admin-link">
    <button type="button" onClick={issueAndCopy} disabled={status === 'working'}>
      {hasAccess ? 'Rotate private link' : 'Issue private link'}
    </button>
    {status === 'copied' && <span>New link copied. It cannot be recovered; rotate again to reissue.</span>}
    {status === 'error' && <span>Link could not be issued.</span>}
  </div>
}
