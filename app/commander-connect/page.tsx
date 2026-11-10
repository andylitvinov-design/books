import Script from 'next/script'
import { headers } from 'next/headers'

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const metadata = {
  title: 'Вход в Agent Commander · Holistic House',
  robots: { index: false, follow: false, noarchive: true },
}

export default async function CommanderConnectPage() {
  const requestHeaders = await headers()
  const nonce = requestHeaders.get('x-nonce') || undefined

  return (
    <>
      <link rel="stylesheet" href="/commander-connect.css" />
      <main>
        <div className="mark">HOLISTIC HOUSE · AGENT COMMANDER</div>
        <h1>Безопасный вход владельца</h1>
        <p>Используется тот же Google-вход и тот же личный кабинет Holistic House. Доступ к рабочим чатам открывается только для подтверждённого владельца.</p>
        <p id="status" role="status" aria-live="polite">Проверяю защищённую сессию…</p>
        <button id="continue" type="button" hidden>Продолжить через Google</button>
      </main>
      <Script
        src="/commander-connect.js?v=20261109-owner-csp-nonce-v2"
        nonce={nonce}
        strategy="afterInteractive"
      />
    </>
  )
}
