import { createElement, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ServiceCart } from '@/components/commerce/service-cart'

function Fixture() {
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const navigate = () => setPath(window.location.pathname)
    window.addEventListener('popstate', navigate)
    return () => window.removeEventListener('popstate', navigate)
  }, [])
  const locale = /^\/__hh-test__\/service-cart\/(en|ru|es)$/.exec(path)?.[1]
  return locale
    ? createElement(ServiceCart, { locale })
    : createElement('main', { 'data-service-cart-fixture-destination': true }, 'Synthetic route destination')
}

window.__serviceCartFixtureDocumentToken = crypto.randomUUID()
createRoot(document.getElementById('service-cart-fixture-root')).render(createElement(Fixture))
