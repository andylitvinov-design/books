'use client'

import { useEffect, useRef, useState } from 'react'
import { ArrowRight, LockKeyhole, Mic, X } from 'lucide-react'
import { coachSessionHref } from '@/lib/coaching/persona-registry.mjs'
import styles from './my-coach-express-start.module.css'

const COPY = {
  en: {
    talk: 'Talk now with Mira', checking: 'Checking your account…',
    title: 'Meet Mira', introduction: 'One quick step before your personal coaching session.',
    subtitle: 'Sign in or create your free Holistic House account. Then you can continue with Mira.',
    google: 'Continue with Google', telegram: 'Continue with Telegram',
    busy: 'Opening secure sign-in…', close: 'Close', note: 'Private sign-in. No subscription or marketing messages.',
    identity: 'Already have a Google account here? Use Google first to keep your existing Cabinet. You can link Telegram later in Settings.',
    statusError: 'We could not check your sign-in. Please try again.',
    loginError: 'Secure sign-in is unavailable right now. Please try again.',
  },
  ru: {
    talk: 'Поговорить с Мирой', checking: 'Проверяем вход…',
    title: 'Знакомьтесь, Мира', introduction: 'Один быстрый шаг до личной коучинг-сессии.',
    subtitle: 'Войдите или бесплатно зарегистрируйтесь в Holistic House — и продолжите с Мирой.',
    google: 'Продолжить через Google', telegram: 'Продолжить через Telegram',
    busy: 'Открываем безопасный вход…', close: 'Закрыть', note: 'Приватный вход, без подписок и рассылок.',
    identity: 'Уже есть кабинет через Google? Войдите через Google, а Telegram привяжите позже в настройках, чтобы сохранить данные.',
    statusError: 'Не удалось проверить вход. Попробуйте ещё раз.',
    loginError: 'Защищённый вход временно недоступен. Попробуйте снова.',
  },
  es: {
    talk: 'Hablar ahora con Mira', checking: 'Verificando tu cuenta…',
    title: 'Conoce a Mira', introduction: 'Un paso rápido antes de tu sesión personal.',
    subtitle: 'Inicia sesión o crea tu cuenta gratuita de Holistic House para continuar con Mira.',
    google: 'Continuar con Google', telegram: 'Continuar con Telegram',
    busy: 'Abriendo acceso seguro…', close: 'Cerrar', note: 'Acceso privado, sin suscripciones ni anuncios.',
    identity: '¿Ya tienes una cuenta con Google? Entra primero con Google y vincula Telegram después en Ajustes para conservar tus datos.',
    statusError: 'No pudimos comprobar tu sesión. Inténtalo de nuevo.',
    loginError: 'El acceso seguro no está disponible. Inténtalo otra vez.',
  },
}

export default function MyCoachExpressStart({ locale = 'en' }) {
  const lang = Object.hasOwn(COPY, locale) ? locale : 'en'
  const t = COPY[lang]
  const [isOpen, setIsOpen] = useState(false)
  const [busy, setBusy] = useState('')
  const [telegramAvailable, setTelegramAvailable] = useState(false)
  const [error, setError] = useState('')
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (isOpen && !dialog.open) dialog.showModal()
    if (!isOpen && dialog.open) dialog.close()
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return
    const controller = new AbortController()
    setTelegramAvailable(false)
    fetch('/api/app/auth/providers', {
      method: 'GET', credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
    }).then(async response => response.ok ? response.json() : null)
      .then(value => { if (!controller.signal.aborted) setTelegramAvailable(value?.telegram === true) })
      .catch(() => { if (!controller.signal.aborted) setTelegramAvailable(false) })
    return () => controller.abort()
  }, [isOpen])

  async function startMira() {
    if (busy) return
    setBusy('check')
    setError('')
    try {
      // The session check is server-verified; an auth cookie merely being present
      // never proves that the current account can enter private coaching.
      const response = await fetch('/api/app/auth/status', {
        method: 'GET', credentials: 'same-origin', cache: 'no-store',
      })
      if (response.ok) {
        window.location.assign(coachSessionHref(lang, 'mira'))
        return
      }
      if (response.status === 401) {
        setIsOpen(true)
        return
      }
      throw new Error('SESSION_CHECK_FAILED')
    } catch {
      setError(t.statusError)
    } finally {
      setBusy('')
    }
  }

  async function signIn(provider) {
    if (busy || (provider === 'telegram' && !telegramAvailable)) return
    setBusy(provider)
    setError('')
    try {
      // Reuse the website's one Supabase PKCE Google/Telegram auth.
      // Fixed allowlisted continuation, never a client-supplied redirect URL.
      const response = await fetch('/api/app/auth/start', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale: lang, continueTo: 'my-coach-mira', provider }),
      })
      const data = await response.json().catch(() => null)
      if (!response.ok || typeof data?.redirectUrl !== 'string') throw new Error('OAUTH_START_FAILED')
      const destination = new URL(data.redirectUrl)
      if (destination.protocol !== 'https:') throw new Error('INVALID_OAUTH_URL')
      window.location.assign(destination.href)
    } catch {
      setError(t.loginError)
      setBusy('')
    }
  }

  return <>
    <div className={styles.actionWrap} data-my-coach-mira-quick-start>
      <button type="button" className={styles.talkButton} onClick={startMira}
        disabled={!!busy} data-my-coach-mira-talk>
        <span className={styles.portrait} aria-hidden="true" />
        <Mic size={19} aria-hidden="true" />
        <span>{busy === 'check' ? t.checking : t.talk}</span>
        <ArrowRight size={20} aria-hidden="true" />
      </button>
      {error && !isOpen && <p role="alert" className={styles.inlineError}>{error}</p>}
    </div>

    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="my-coach-mira-login-title"
      aria-describedby="my-coach-mira-login-subtitle" onClose={() => setIsOpen(false)}
      onCancel={() => setIsOpen(false)} data-my-coach-mira-login>
      <div className={styles.dialogInner}>
        <button type="button" className={styles.close} onClick={() => setIsOpen(false)}
          aria-label={t.close} disabled={!!busy && busy !== 'check'}>
          <X size={22} aria-hidden="true" />
        </button>
        <span className={styles.dialogPortrait} aria-hidden="true" />
        <h2 id="my-coach-mira-login-title">{t.title}</h2>
        <strong className={styles.introduction}>{t.introduction}</strong>
        <p id="my-coach-mira-login-subtitle" className={styles.subtitle}>{t.subtitle}</p>
        <div className={styles.methods}>
          <button type="button" onClick={() => signIn('google')} disabled={!!busy}
            className={styles.google} data-my-coach-auth-google>
            {busy === 'google' ? t.busy : t.google}<ArrowRight size={18} aria-hidden="true" />
          </button>
          {telegramAvailable && <button type="button" onClick={() => signIn('telegram')}
            disabled={!!busy} className={styles.telegram} data-my-coach-auth-telegram>
            {busy === 'telegram' ? t.busy : t.telegram}<ArrowRight size={18} aria-hidden="true" />
          </button>}
        </div>
        <p className={styles.identity}>{t.identity}</p>
        <p className={styles.note}><LockKeyhole size={15} aria-hidden="true" />{t.note}</p>
        {error && <p role="alert" className={styles.dialogError}>{error}</p>}
      </div>
    </dialog>
  </>
}
