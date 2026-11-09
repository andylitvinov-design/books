'use client'
import { useEffect } from 'react'

// Old private bookmarks contain a hash invisible to server route handlers.
export default function ProfileLegacyHashRedirect({ locale }) {
  useEffect(() => {
    const privateTab = window.location.hash === '#personal-reports' ? 'reports'
      : window.location.hash === '#hh-development-program' ? 'path' : null
    if (privateTab) window.location.replace('/' + locale + '/app/portrait?space=' + privateTab + window.location.hash)
  }, [locale])
  return null
}
