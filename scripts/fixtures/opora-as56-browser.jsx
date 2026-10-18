// Test-only hydrated production component, no route, account or API transport.
import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import OporaExperiencePlayer from '@/components/app/opora-experience-player'

const { locale, data } = JSON.parse(document.getElementById('opora-browser-data').textContent)
function freeze(value) {
  if (value && typeof value === 'object') { Object.freeze(value); Object.values(value).forEach(freeze) }
  return value
}
freeze(data)
window.__oporaBrowser = { saves: 0, closes: 0, finishes: 0, initialData: JSON.stringify(data) }
window.__oporaBrowserData = data
createRoot(document.getElementById('opora-browser-root')).render(createElement(OporaExperiencePlayer, {
  locale, data,
  onClose() { window.__oporaBrowser.closes++ },
  onFinish() { window.__oporaBrowser.finishes++ },
  async onSession() { window.__oporaBrowser.saves++; return false },
}))
