'use client'
import Link from 'next/link'

// Only the simple first-level private tabs can change without a new Next/RSC
// route request. All deep links, OAuth, test actions and cross-locale routes
// retain the normal router, which runs their server-side security checks.
const TABS = new Set([
  'portrait', 'tests', 'monitoring', 'portfolio', 'progress',
  'course', 'settings', 'history', 'labs', 'videos',
])

export function instantCabinetTarget(href, location) {
  if (typeof href !== 'string' || typeof location !== 'string') return null
  let current, target
  try { current = new URL(location); target = new URL(href, current) }
  catch { return null }
  if (target.origin !== current.origin) return null
  const from = current.pathname.match(/^\/(en|ru)\/app(?:\/|$)/)
  const to = target.pathname.match(/^\/(en|ru)\/app\/([a-z-]+)$/)
  if (!from || !to || from[1] !== to[1] || !TABS.has(to[2])) return null
  // A bare Profile route is the public test selector, not a private mounted tab.
  if (/^\/(en|ru)\/app\/portrait\/?$/.test(current.pathname) &&
      !['today', 'path', 'reports'].includes(current.searchParams.get('space'))) return null
  if (to[2] === 'portrait') {
    if (!['?space=today', '?space=path', '?space=reports'].includes(target.search)) return null
  } else if (to[2] === 'course') {
    if (target.search && target.search !== '?view=courses') return null
  } else if (target.search) return null
  return target.pathname + target.search + target.hash
}

export default function InstantCabinetLink({ href, onClick, ...props }) {
  const navigate = event => {
    onClick?.(event)
    if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
        event.ctrlKey || event.shiftKey || event.altKey ||
        (props.target && props.target !== '_self')) return
    const next = instantCabinetTarget(href, window.location.href)
    if (!next) return
    event.preventDefault()
    if (next === window.location.pathname + window.location.search + window.location.hash) return
    window.history.pushState(null, '', next)
    if (!new URL(next, window.location.href).hash)
      window.scrollTo(0, 0)
  }
  return <Link {...props} href={href} prefetch={false} onClick={navigate} />
}
