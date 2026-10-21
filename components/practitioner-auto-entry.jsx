'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { appFetch } from '@/lib/app/client-fetch'

const copy = {
  en: {
    opening: 'Opening your practitioner cabinet…',
    signIn: 'Continue with Google',
    retry: 'Try again',
    retryText: 'Google sign-in was not completed.',
    denied: 'This Google account does not have practitioner access.',
    failed: 'The cabinet could not be opened. Please try again.',
    personal: 'My personal cabinet',
    home: 'Back to site',
  },
  ru: {
    opening: 'Открываем кабинет практика…',
    signIn: 'Войти через Google',
    retry: 'Попробовать снова',
    retryText: 'Вход через Google не завершён.',
    denied: 'У этого Google-аккаунта нет доступа к кабинету практика.',
    failed: 'Не удалось открыть кабинет. Попробуйте ещё раз.',
    personal: 'Мой личный кабинет',
    home: 'На сайт',
  },
}

const ADMIN_DESTINATIONS = Object.freeze({
  cabinet: '/admin',
  growth: '/admin/growth-studio',
  seo: '/admin/seo',
  acquisition: '/admin/acquisition',
})

export function PractitionerAutoEntry({ locale = 'en', authFailed = false, destination = 'cabinet' }) {
  const [state, setState] = useState(authFailed ? 'retry' : 'opening')
  const started = useRef(false)
  const text = copy[locale] || copy.en
  const safeDestination = Object.hasOwn(ADMIN_DESTINATIONS, destination) ? destination : 'cabinet'

  async function open() {
    setState('opening')
    try {
      // Server checks the verified Google account and owner-only practitioner role.
      const response = await appFetch('practitioner/open', { destination: safeDestination })
      // Never follow arbitrary redirects even when the private bridge issued a session.
      if (response.redirectUrl !== ADMIN_DESTINATIONS[safeDestination]) throw new Error('Unexpected destination')
      window.location.replace(ADMIN_DESTINATIONS[safeDestination])
    } catch (error) {
      if (error?.status === 401) {
        try {
          // Resume this private entry after Google OAuth without exposing a PIN.
          const result = await appFetch('auth/start', { locale, continueTo: safeDestination === 'cabinet' ? 'practitioner' : `practitioner-${safeDestination}` })
          window.location.assign(result.redirectUrl)
          return
        } catch {
          setState('failed')
          return
        }
      }
      setState(error?.status === 403 || error?.status === 404 ? 'denied' : 'failed')
    }
  }

  useEffect(() => {
    // Do not auto-retry cancelled/failed OAuth callbacks in a redirect loop.
    if (authFailed || started.current) return
    started.current = true
    void open()
  }, [authFailed])

  return (
    <main className="prescription-admin-shell" style={{ minHeight: '100svh', display: 'grid', placeItems: 'center', padding: '1.5rem' }}>
      <section aria-live="polite" style={{ maxWidth: '26rem', textAlign: 'center' }}>
        <p>{state === 'opening' ? text.opening : state === 'retry' ? text.retryText : state === 'denied' ? text.denied : text.failed}</p>
        {state !== 'opening' && (
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', marginTop: '1.25rem' }}>
            {state !== 'denied' && <button type="button" onClick={() => void open()}>{state === 'retry' ? text.signIn : text.retry}</button>}
            <Link href={state === 'denied' ? `/${locale}/app/portrait` : '/'}>{state === 'denied' ? text.personal : text.home}</Link>
          </div>
        )}
      </section>
    </main>
  )
}
