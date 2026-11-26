'use client'

import {useEffect, useRef, useState} from 'react'
import {onPwaInstallPrompt, requestPwaInstallation} from '@/lib/pwa/install-prompt'
import styles from './install.module.css'

const COPY = {
  en: {
    install: 'Install for free', open: 'Open Holistic House', working: 'Opening installer…',
    ready: 'Add the app to your Home Screen for free.',
    share: 'Tap Share', add: 'Add to Home Screen', confirm: 'Add',
    safari: 'If the option is missing, open this page in Safari. In ChatGPT, tap the compass.',
    chrome: 'In the browser menu ⋮, choose Install app or Add to Home screen.',
    device: 'For installation, look for Install app or Add to Home Screen in your browser menu.',
    accepted: 'Request accepted. When the icon appears on your Home Screen, tap it to open the app.',
    installed: 'Holistic House is installed.',
    android: 'Download Android APK', ios: 'Get it on the App Store',
  },
  ru: {
    install: 'Установить бесплатно', open: 'Открыть Holistic House', working: 'Открываем установку…',
    ready: 'Добавьте приложение на главный экран бесплатно.',
    share: 'Нажмите «Поделиться»', add: 'На экран «Домой»', confirm: 'Добавить',
    safari: 'Если пункта нет, откройте страницу в Safari. В ChatGPT для этого нажмите значок компаса.',
    chrome: 'В меню браузера ⋮ выберите «Установить приложение» или «Добавить на главный экран».',
    device: 'Для установки найдите в меню браузера «Установить приложение» или «На экран Домой».',
    accepted: 'Запрос принят. Когда на главном экране появится значок Holistic House, нажмите на него.',
    installed: 'Holistic House установлено.',
    android: 'Скачать APK для Android', ios: 'Загрузить в App Store',
  },
  es: {
    install: 'Instalar gratis', open: 'Abrir Holistic House', working: 'Abriendo el instalador…',
    ready: 'Añade la aplicación gratis a tu pantalla de inicio.',
    share: 'Toca Compartir', add: 'Añadir a la pantalla de inicio', confirm: 'Añadir',
    safari: 'Si no ves la opción, abre esta página en Safari. En ChatGPT, toca la brújula.',
    chrome: 'En el menú del navegador ⋮, elige Instalar aplicación o Añadir a la pantalla de inicio.',
    device: 'Para instalarla, busca Instalar aplicación o Añadir a la pantalla de inicio en el menú del navegador.',
    accepted: 'Solicitud aceptada. Cuando veas el icono en tu pantalla de inicio, tócalo para abrir la aplicación.',
    installed: 'Holistic House está instalada.',
    android: 'Descargar APK para Android', ios: 'Descargar en el App Store',
  },
}

function phonePlatform() {
  if (/iPad|iPhone|iPod/i.test(navigator.userAgent) || /iPad|iPhone|iPod/i.test(navigator.platform) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return /Android/i.test(navigator.userAgent) ? 'android' : 'other'
}

function ShareSteps({copy}) {
  return (
    <div className={styles.steps} data-hh-ios-quicksteps>
      <p>
        <svg className={styles.shareIcon} aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 15V2m-4 4 4-4 4 4M7 9H4v12h16V9h-3" />
        </svg>
        {copy.share} → <strong>{copy.add}</strong> → {copy.confirm}.
      </p>
      <p className={styles.hint}>{copy.safari}</p>
    </div>
  )
}

export default function InstallAction({locale, androidReleased, iosReleased}) {
  const copy = COPY[locale]
  const [platform, setPlatform] = useState(null)
  const [offered, setOffered] = useState(false)
  const [installed, setInstalled] = useState(false)
  const [phase, setPhase] = useState('idle')
  const requesting = useRef(false)

  useEffect(() => {
    setPlatform(phonePlatform())
    const display = window.matchMedia('(display-mode: standalone)')
    const completed = () => setInstalled(true)
    const checkDisplay = () => {
      if (display.matches || navigator.standalone === true || window.Capacitor?.isNativePlatform?.()) completed()
    }
    checkDisplay()
    display.addEventListener('change', checkDisplay)
    window.addEventListener('appinstalled', completed)
    const unsubscribe = onPwaInstallPrompt(event => {
      setOffered(Boolean(event))
      if (event) setPhase('idle')
    })
    return () => {
      display.removeEventListener('change', checkDisplay)
      window.removeEventListener('appinstalled', completed)
      unsubscribe()
    }
  }, [])

  async function install() {
    if (requesting.current) return
    requesting.current = true
    setPhase('prompting')
    try {
      const {accepted} = await requestPwaInstallation()
      setPhase(accepted ? 'accepted' : 'idle')
    } finally {
      requesting.current = false
    }
  }

  const nativePlatform = platform === 'ios' && iosReleased ? 'ios' :
    platform === 'android' && androidReleased ? 'android' : null
  const native = !installed && nativePlatform
  const prompt = !installed && !native && phase !== 'accepted' && (offered || phase === 'prompting')
  const iosSteps = !installed && !native && !prompt && phase !== 'accepted' && platform === 'ios'
  let message = copy.device
  if (installed) message = copy.installed
  else if (phase === 'accepted') message = copy.accepted
  else if (native || prompt) message = copy.ready
  else if (platform === 'android') message = copy.chrome

  return (
    <div className={styles.flow} data-hh-install-platform={platform || 'loading'}>
      <div aria-live="polite">
        {iosSteps ? <ShareSteps copy={copy} /> : <p className={styles.description}>{message}</p>}
      </div>
      {native ? (
        <a className={styles.action} href={native === 'android' ? '/api/native-download/android' : '/api/native-download/ios'} data-hh-install-action>
          {copy[native]}
        </a>
      ) : prompt ? (
        <button type="button" className={styles.action} disabled={phase === 'prompting'} onClick={install} data-hh-install-action>
          {phase === 'prompting' ? copy.working : copy.install}
        </button>
      ) : (
        <a className={styles.action} href={'/' + locale} data-hh-install-action>{copy.open}</a>
      )}
    </div>
  )
}
