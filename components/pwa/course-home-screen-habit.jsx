'use client'

import { useEffect, useState } from 'react'
import { Check, Copy, Download, Smartphone, Youtube } from 'lucide-react'
import styles from './course-home-screen-habit.module.css'

const COURSE_URL = 'https://holistichouse.vercel.app/'

const WORDS = {
  en: {
    eyebrow: 'A SMALL DAILY HABIT',
    title: 'Keep OPORA close',
    intro: 'Add your Anti-Stress course to your Home Screen. If you like, set up a gentle pause before YouTube.',
    add: 'Add course to Home Screen',
    installed: 'Course is open as an app',
    installHelp: 'How to add the course',
    iosInstall: 'In Safari, tap Share → Add to Home Screen → Add. The OPORA icon will open your course directly.',
    androidInstall: 'In Chrome, open the browser menu → Install app or Add to Home Screen.',
    desktopInstall: 'Open this page on your phone to add the course to your Home Screen.',
    youtube: 'Pause before YouTube',
    youtubeTitle: 'A gentle reminder, only if you choose',
    youtubeIntro: 'On iPhone, Apple Shortcuts can ask you a question when you open the YouTube app. Confirm to open your lesson; cancel to keep using YouTube.',
    question: 'How about a short OPORA lesson first? YouTube can wait.',
    iosSteps: [
      'Open Shortcuts → Automation → + → App, and choose YouTube.',
      'Select Is Opened and Run Immediately, then create a blank automation.',
      'Add Show Alert with the message below, and keep the Cancel option.',
      'After the alert, add URL with your lesson link, then Open URLs.',
      'Test it: continue opens OPORA; cancel leaves you in YouTube.',
    ],
    linkLabel: 'Your lesson link',
    copy: 'Copy lesson link',
    copied: 'Link copied',
    copyError: 'Select and copy the link below.',
    iosPrivacy: 'You create or remove the automation yourself in Shortcuts. Holistic House cannot see when you open YouTube, and this website cannot install the automation for you.',
    otherPlatform: 'A website cannot show a prompt when another app opens on this device. You can still add OPORA to your Home Screen and use optional daily reminders in your cabinet.',
  },
  ru: {
    eyebrow: 'МАЛЕНЬКАЯ ЕЖЕДНЕВНАЯ ПРИВЫЧКА',
    title: 'ОПОРА всегда под рукой',
    intro: 'Добавьте Антистресс на главный экран. А при желании настройте мягкое напоминание перед YouTube.',
    add: 'Добавить курс на главный экран',
    installed: 'Курс открыт как приложение',
    installHelp: 'Как добавить курс',
    iosInstall: 'В Safari нажмите «Поделиться» → «На экран Домой» → «Добавить». Значок ОПОРЫ откроет курс.',
    androidInstall: 'В Chrome откройте меню → «Установить приложение» или «Добавить на главный экран».',
    desktopInstall: 'Откройте эту страницу на телефоне, чтобы добавить курс на главный экран.',
    youtube: 'Пауза перед YouTube',
    youtubeTitle: 'Мягкое напоминание — только по желанию',
    youtubeIntro: 'На iPhone приложение «Команды» может задать вопрос при открытии YouTube. Подтвердите — откроется урок; отмените — оставайтесь в YouTube.',
    question: 'Давай сначала пройдём короткий урок ОПОРЫ? YouTube подождёт.',
    iosSteps: [
      'Откройте «Команды» → «Автоматизация» → «+» → «Приложение», выберите YouTube.',
      'Выберите «Открывается» и «Выполнять немедленно», затем создайте пустую автоматизацию.',
      'Добавьте действие «Показать предупреждение» (Show Alert) с текстом ниже; оставьте возможность отмены.',
      'После предупреждения добавьте «URL» со ссылкой на урок, затем «Открыть URL».',
      'Проверьте: продолжение открывает ОПОРУ, отмена оставляет вас в YouTube.',
    ],
    linkLabel: 'Ссылка на ваш урок',
    copy: 'Скопировать ссылку на урок',
    copied: 'Ссылка скопирована',
    copyError: 'Выделите и скопируйте ссылку ниже.',
    iosPrivacy: 'Автоматизацию создаёте и отключаете вы сами в «Командах». Holistic House не видит, когда вы открываете YouTube, и сайт не может настроить автоматизацию без вас.',
    otherPlatform: 'Сайт не может показать окно при запуске другого приложения на этом устройстве. Но можно добавить ОПОРУ на главный экран и включить ежедневные напоминания в кабинете.',
  },
  es: {
    eyebrow: 'UN PEQUEÑO HÁBITO DIARIO',
    title: 'OPORA siempre contigo',
    intro: 'Añade tu curso de Antiestrés a la pantalla de inicio. Si lo deseas, configura una pausa amable antes de YouTube.',
    add: 'Añadir curso a inicio',
    installed: 'El curso está abierto como app',
    installHelp: 'Cómo añadir el curso',
    iosInstall: 'En Safari, toca Compartir → Añadir a pantalla de inicio → Añadir. El icono de OPORA abrirá el curso.',
    androidInstall: 'En Chrome, abre el menú → Instalar app o Añadir a pantalla de inicio.',
    desktopInstall: 'Abre esta página en tu teléfono para añadir el curso.',
    youtube: 'Pausa antes de YouTube',
    youtubeTitle: 'Un recordatorio suave, solo si lo deseas',
    youtubeIntro: 'En iPhone, Atajos de Apple puede preguntar antes de abrir YouTube. Confirma para abrir tu lección o cancela para seguir en YouTube.',
    question: '¿Hacemos primero una lección breve de OPORA? YouTube puede esperar.',
    iosSteps: [
      'Abre Atajos → Automatización → + → App y elige YouTube.',
      'Selecciona Se abre y Ejecutar inmediatamente, y crea una automatización vacía.',
      'Añade Mostrar aviso (Show Alert) con el texto inferior, dejando la opción Cancelar.',
      'Después añade URL con el enlace de tu lección y Abrir URL.',
      'Pruébalo: continuar abre OPORA; cancelar te deja en YouTube.',
    ],
    linkLabel: 'Enlace a tu lección',
    copy: 'Copiar enlace',
    copied: 'Enlace copiado',
    copyError: 'Selecciona y copia el enlace de abajo.',
    iosPrivacy: 'Tú creas o desactivas la automatización en Atajos. Holistic House no sabe cuándo abres YouTube y esta web no puede instalarla por ti.',
    otherPlatform: 'Una web no puede mostrar un aviso al abrir otra app en este dispositivo. Aún puedes instalar OPORA y usar recordatorios diarios opcionales en tu cuenta.',
  },
}

export default function CourseHomeScreenHabit({ locale = 'en' }) {
  const words = WORDS[locale] || WORDS.en
  const courseLocale = locale === 'ru' ? 'ru' : 'en'
  const courseUrl = COURSE_URL + courseLocale + '/app/course?program=stress'
  const [platform, setPlatform] = useState('unknown')
  const [installPrompt, setInstallPrompt] = useState(null)
  const [installed, setInstalled] = useState(false)
  const [installHelp, setInstallHelp] = useState(false)
  const [youtubeHelp, setYoutubeHelp] = useState(false)
  const [copyMessage, setCopyMessage] = useState('')

  useEffect(() => {
    const ua = window.navigator.userAgent || ''
    setPlatform(/iPhone|iPad|iPod/i.test(ua) ? 'ios' : /Android/i.test(ua) ? 'android' : 'other')
    setInstalled(Boolean(window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone))
    const onPrompt = (event) => { event.preventDefault(); setInstallPrompt(event) }
    const onInstalled = () => { setInstalled(true); setInstallPrompt(null); setInstallHelp(false) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    window.addEventListener('appinstalled', onInstalled)
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!installPrompt) { setInstallHelp(value => !value); return }
    try {
      await installPrompt.prompt()
      await installPrompt.userChoice
    } catch {
      setInstallHelp(true)
    } finally {
      setInstallPrompt(null)
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(courseUrl)
      setCopyMessage(words.copied)
    } catch {
      setCopyMessage(words.copyError)
    }
  }

  return (
    <section className={styles.root} data-opora-habit-install lang={locale}>
      <div className={styles.lead}>
        <span className={styles.mark} aria-hidden="true"><Smartphone size={23} /></span>
        <div>
          <span className={styles.eyebrow}>{words.eyebrow}</span>
          <h2>{words.title}</h2>
          <p>{words.intro}</p>
        </div>
      </div>
      <div className={styles.actions}>
        {installed ? <span className={styles.installed}><Check size={17} aria-hidden="true" />{words.installed}</span> :
          <button type="button" className={styles.primary} onClick={install} aria-expanded={installHelp}>
            <Download size={17} aria-hidden="true" />{words.add}
          </button>}
        <button type="button" className={styles.secondary} onClick={() => setYoutubeHelp(value => !value)} aria-expanded={youtubeHelp}>
          <Youtube size={18} aria-hidden="true" />{words.youtube}
        </button>
      </div>
      {installHelp && !installed && <p className={styles.installHelp} role="status">
        {platform === 'ios' ? words.iosInstall : platform === 'android' ? words.androidInstall : words.desktopInstall}
      </p>}
      {youtubeHelp && <div className={styles.guide} data-opora-youtube-shortcuts-guide>
        <strong>{words.youtubeTitle}</strong>
        {platform === 'ios' ? <>
          <p>{words.youtubeIntro}</p>
          <ol>{words.iosSteps.map(step => <li key={step}>{step}</li>)}</ol>
          <blockquote className={styles.alertText}>{words.question}</blockquote>
          <label className={styles.urlLabel} htmlFor={'opora-url-' + locale}>{words.linkLabel}</label>
          <div className={styles.copyRow}>
            <input id={'opora-url-' + locale} type="text" readOnly value={courseUrl} onFocus={event => event.currentTarget.select()} />
            <button type="button" onClick={copyLink}><Copy size={16} aria-hidden="true" />{words.copy}</button>
          </div>
          {copyMessage && <p role="status" className={styles.copyStatus}>{copyMessage}</p>}
          <small>{words.iosPrivacy}</small>
        </> : <p>{words.otherPlatform}</p>}
      </div>}
    </section>
  )
}
