'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import {
  ArrowRight, ArrowUp, ShieldCheck, BookOpen, ChevronDown, Clapperboard,
  ClipboardList, FileText, Headphones, Leaf, Mic, MicOff, PenLine,
  Plus, Sparkles, TestTube2,
} from 'lucide-react'
import { cabinetActionHref, matchCabinetIntent } from '@/lib/app/cabinet-today.mjs'
import styles from './cabinet-today.module.css'

const ICONS = {
  course: BookOpen, article: PenLine, video: Clapperboard, audio: Headphones,
  tests: ClipboardList, reports: FileText, lessons: BookOpen, ideas: Sparkles,
  service: Plus, labs: TestTube2, review: Leaf,
}
const WORDS = {
  en: {
    eyebrow: 'MY SPACE · START HERE',
    title: 'What shall we do today?',
    hint: 'Describe your idea, or choose an action to begin.',
    placeholder: 'I want to create a course, take a test…',
    prompt: 'Your wish or task',
    go: 'Find the right tool',
    options: 'Or choose an action',
    more: 'More options',
    privacy: 'Your text stays in this browser; nothing is sent or saved.',
    voicePrivacy: 'Speech recognition, when enabled, may use your browser’s speech provider.',
    micStart: 'Dictate a wish',
    micStop: 'Stop dictation',
    micError: 'Microphone not available. You can type your wish instead.',
    noMatch: 'Choose an action below or add “course”, “article”, “video” or “test” to your request.',
    course: 'Create course', article: 'Write article', video: 'Add video', audio: 'Record audio',
    tests: 'Take tests', reports: 'My reports', lessons: 'Continue learning', ideas: 'Explore ideas',
    service: 'Add service', labs: 'Lab results', review: 'Request free review',
  },
  ru: {
    eyebrow: 'МОЙ КАБИНЕТ · НАЧНЁМ',
    title: 'Что мы сделаем сегодня?',
    hint: 'Опишите своё желание или сразу выберите действие.',
    placeholder: 'Хочу создать курс, записать видео, пройти тест…',
    prompt: 'Ваше пожелание или задача',
    go: 'Открыть нужный инструмент',
    options: 'Или выберите действие',
    more: 'Другие возможности',
    privacy: 'Текст остаётся в браузере — ничего не отправляем и не сохраняем.',
    voicePrivacy: 'При диктовке браузер может использовать службу распознавания речи.',
    micStart: 'Продиктовать пожелание',
    micStop: 'Остановить диктовку',
    micError: 'Микрофон недоступен. Можете написать пожелание.',
    noMatch: 'Выберите действие ниже или уточните запрос: «курс», «статья», «видео», «тест».',
    course: 'Создать курс', article: 'Написать статью', video: 'Добавить видео', audio: 'Записать аудио',
    tests: 'Пройти тесты', reports: 'Мои отчёты', lessons: 'Продолжить курс', ideas: 'Идеи и книги',
    service: 'Добавить услугу', labs: 'Мои анализы', review: 'Бесплатный разбор',
  },
}

export default function CabinetToday({ locale = 'en', practitioner = false, owner = false }) {
  const ru = locale === 'ru'
  const t = WORDS[ru ? 'ru' : 'en']
  const router = useRouter()
  const [wish, setWish] = useState('')
  const [notice, setNotice] = useState('')
  const [speechAvailable, setSpeechAvailable] = useState(false)
  const [listening, setListening] = useState(false)
  const speechRef = useRef(null)
  const canCreate = Boolean(practitioner)
  const isOwner = Boolean(practitioner && owner)
  const main = canCreate
    ? (isOwner ? ['course', 'article', 'video', 'audio', 'tests', 'reports']
      : ['course', 'article', 'video', 'tests', 'reports', 'lessons'])
    : ['tests', 'lessons', 'reports', 'ideas']
  const extras = canCreate
    ? ['lessons', 'ideas', 'labs', 'service', 'review'].filter(id => !main.includes(id))
    : ['labs', 'review']

  useEffect(() => {
    setSpeechAvailable(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition))
    return () => {
      const active = speechRef.current
      if (active) {
        active.onresult = null
        active.onerror = null
        active.onend = null
        active.abort?.()
      }
      speechRef.current = null
    }
  }, [])

  function onSubmit(event) {
    event.preventDefault()
    const action = matchCabinetIntent(wish, { practitioner: canCreate, owner: isOwner })
    const href = action ? cabinetActionHref(action, locale) : null
    if (href) {
      setNotice('')
      router.push(href)
    } else {
      setNotice(t.noMatch)
    }
  }

  function onMic() {
    if (listening) {
      speechRef.current?.stop?.()
      return
    }
    const Speech = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Speech) {
      setNotice(t.micError)
      return
    }
    try {
      const instance = new Speech()
      speechRef.current = instance
      instance.lang = ru ? 'ru-RU' : 'en-US'
      instance.interimResults = false
      instance.continuous = false
      instance.onresult = event => {
        const phrase = Array.from(event.results || [])
          .map(result => result[0]?.transcript || '').join(' ').trim()
        if (phrase) setWish(previous => (previous ? previous + ' ' : '') + phrase)
        setNotice('')
      }
      instance.onerror = () => { setNotice(t.micError); setListening(false) }
      instance.onend = () => { setListening(false); speechRef.current = null }
      instance.start()
      setListening(true)
      setNotice('')
    } catch {
      setListening(false)
      speechRef.current = null
      setNotice(t.micError)
    }
  }

  const renderAction = id => {
    const Icon = ICONS[id]
    const href = cabinetActionHref(id, locale)
    if (!Icon || !href) return null
    return <Link key={id} prefetch={false} href={href} className={styles.action}
      data-cabinet-action={id} aria-label={t[id]}>
      <span className={styles.actionIcon}><Icon size={19} strokeWidth={1.9} aria-hidden="true" /></span>
      <span>{t[id]}</span>
      <ArrowRight className={styles.actionArrow} size={13} aria-hidden="true" />
    </Link>
  }

  return <section className={styles.shell} data-cabinet-today aria-labelledby="hh-cabinet-today-title">
    <div className={styles.intro}>
      <span className={styles.mark}><Sparkles size={22} aria-hidden="true" /></span>
      <div className={styles.introText}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h1 id="hh-cabinet-today-title">{t.title}</h1>
        <p className={styles.hint}>{t.hint}</p>
      </div>
    </div>
    <form onSubmit={onSubmit} className={styles.form} data-cabinet-wish-form>
      <label htmlFor="hh-cabinet-wish" className={styles.srOnly}>{t.prompt}</label>
      <div className={styles.field}>
        <input id="hh-cabinet-wish" type="text" value={wish} maxLength={240} autoComplete="off"
          placeholder={t.placeholder} onChange={event => { setWish(event.target.value); setNotice('') }} />
        {speechAvailable && <button className={styles.mic} type="button" onClick={onMic}
          aria-label={listening ? t.micStop : t.micStart} aria-pressed={listening}>
          {listening ? <MicOff size={18} aria-hidden="true" /> : <Mic size={18} aria-hidden="true" />}
        </button>}
        <button className={styles.submit} type="submit" disabled={!wish.trim()} aria-label={t.go}>
          <ArrowUp size={19} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
      {notice && <p role="status" className={styles.notice}>{notice}</p>}
    </form>
    <div className={styles.quick}>
      <p className={styles.quickTitle}>{t.options}</p>
      <div className={styles.grid}>{main.map(renderAction)}</div>
    </div>
    <details className={styles.more} data-cabinet-more-actions>
      <summary><span>{t.more}</span><ChevronDown size={16} aria-hidden="true" /></summary>
      <div className={styles.grid}>{extras.map(renderAction)}</div>
    </details>
    <p className={styles.privacy}><ShieldCheck size={13} aria-hidden="true" />{t.privacy} {speechAvailable ? t.voicePrivacy : ''}</p>
  </section>
}
