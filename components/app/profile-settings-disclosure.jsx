'use client'
import { useEffect, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import styles from './profile-settings-disclosure.module.css'

// Mount account-only modules after the user expands them. Keep mounted after
// first opening to preserve unsaved form drafts. Direct deep links still work.
export default function ProfileSettingsDisclosure({ id, deepLinks = [], title, subtitle, children }) {
  const [open, setOpen] = useState(false)
  const [visited, setVisited] = useState(false)
  const deepLinkKey = deepLinks.join('|')
  useEffect(() => {
    const reveal = () => {
      const rawHash = window.location.hash.replace(/^#/, '')
      if (!rawHash) return
      let hash
      try { hash = decodeURIComponent(rawHash) } catch { return }
      if (hash !== id && !deepLinkKey.split('|').filter(Boolean).includes(hash)) return
      setVisited(true)
      setOpen(true)
      window.requestAnimationFrame(() => {
        document.getElementById(hash)?.scrollIntoView({ block: 'start' })
      })
    }
    reveal()
    window.addEventListener('hashchange', reveal)
    return () => window.removeEventListener('hashchange', reveal)
  }, [id, deepLinkKey])
  return <details id={id} className={styles.disclosure} open={open}
    onToggle={(event) => { setOpen(event.currentTarget.open); if (event.currentTarget.open) setVisited(true) }}>
    <summary><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronDown size={20} aria-hidden="true"/></summary>
    {visited && <div className={styles.contents}>{children}</div>}
  </details>
}
