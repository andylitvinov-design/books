'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowRight, ChevronDown, ChevronUp, LockKeyhole, Sparkles } from 'lucide-react'
import { buildCabinetGuideSteps } from '@/lib/app/cabinet-guide'
import styles from './cabinet-guide.module.css'

// An original decorative illustration, not an avatar of the practitioner or a chatbot.
function GuideFigure() {
  return (
    <svg className={styles.figure} viewBox="0 0 210 196" fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="hh-guide-sweater" x1="52" y1="139" x2="150" y2="196" gradientUnits="userSpaceOnUse">
          <stop stopColor="#8A9881" /><stop offset="1" stopColor="#65775F" />
        </linearGradient>
        <linearGradient id="hh-guide-hair" x1="58" y1="39" x2="146" y2="147" gradientUnits="userSpaceOnUse">
          <stop stopColor="#594C44" /><stop offset="1" stopColor="#827064" />
        </linearGradient>
      </defs>
      <circle cx="106" cy="91" r="82" fill="#F6EDE1" />
      <path d="M18 146c28 17 63 27 101 23 31-2 55-12 74-25" stroke="#D9C5AC" strokeWidth="1.5" strokeDasharray="3 6" />
      <path d="M168 26l3 8 8 3-8 3-3 8-3-8-8-3 8-3 3-8Z" fill="#CDA878" />
      <path d="M38 63l2.5 6.5L47 72l-6.5 2.5L38 81l-2.5-6.5L29 72l6.5-2.5L38 63Z" fill="#CBAF8D" />
      <path d="M49 184c1-29 13-42 31-49l19-8h16l18 8c20 8 31 21 33 49" fill="url(#hh-guide-sweater)" />
      <path d="M80 136c-12 9-16 27-18 48m82-48c12 12 13 29 15 48" stroke="#52694F" strokeWidth="3" strokeLinecap="round" opacity=".65" />
      <path d="M91 118v18c0 10 28 10 28 0v-18" fill="#E7B49C" />
      <path d="M59 102c-7-33-2-69 33-78 29-9 58 8 62 42 4 29-6 56-17 68-12 12-56 11-69-5" fill="url(#hh-guide-hair)" />
      <path d="M73 73c0-22 12-36 33-36s35 16 35 36v26c0 25-16 43-35 43-20 0-34-19-34-43V73Z" fill="#F2CBB4" />
      <path d="M72 92c-9-1-11 10-5 16 2 2 5 3 9 3m66-19c9-1 11 10 5 16-2 2-5 3-9 3" fill="#ECC0A6" />
      <path d="M70 77c0-31 23-43 42-42 24 1 38 17 37 43-8 0-14-4-20-16-13 13-28 17-57 17" fill="url(#hh-guide-hair)" />
      <path d="M87 94c4-3 10-3 14 0m17 0c4-3 10-3 14 0" stroke="#70534B" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="95" cy="97" r="2" fill="#4D4742" /><circle cx="124" cy="97" r="2" fill="#4D4742" />
      <path d="M110 100c-1 6-2 9 2 11" stroke="#C18D77" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M99 119c7 5 16 5 23-1" stroke="#B96E65" strokeWidth="2" strokeLinecap="round" />
      <path d="M85 137l21 22 22-22" stroke="#D9DFCE" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M72 153c9 5 13 14 15 31m54-31c-9 5-13 14-15 31" stroke="#B2BCA8" strokeWidth="2" strokeLinecap="round" opacity=".65" />
      <ellipse cx="109" cy="187" rx="70" ry="4" fill="#6C765F" opacity=".12" />
    </svg>
  )
}

const COPY = {
  en: {
    name: 'Your guide', greeting: 'Here with you', next: 'A helpful next step',
    intro: 'Small steps, at your own pace.', show: 'Show guidance', hide: 'Minimize guidance',
    step: 'Suggestion', note: 'Based only on your saved cabinet progress. No private answers are sent to an AI assistant.',
  },
  ru: {
    name: 'Ваш помощник', greeting: 'Я рядом', next: 'Что делать дальше',
    intro: 'Маленькими шагами, в своём темпе.', show: 'Открыть подсказки', hide: 'Свернуть подсказки',
    step: 'Подсказка', note: 'Подсказки основаны только на состоянии ваших тестов. Ответы не отправляются ИИ-помощнику.',
  },
}

export function CabinetGuide({ data, locale = 'en', page = 'portrait', recordId }) {
  const c = COPY[locale] || COPY.en
  const [expanded, setExpanded] = useState(true)
  const [selectedKey, setSelectedKey] = useState('')
  const suggestions = buildCabinetGuideSteps(data, { locale, page, recordId })
  const selected = suggestions.find((suggestion) => suggestion.key === selectedKey) || suggestions[0]

  return (
    <aside className={styles.assistant} aria-label={c.name}>
      <div className={styles.identity}>
        <div className={styles.art}><GuideFigure /></div>
        <div className={styles.identityText}>
          <span className={styles.kicker}><Sparkles size={13} aria-hidden="true" /> {c.greeting}</span>
          <h2>{c.name}</h2>
          <p>{c.intro}</p>
          <button
            className={styles.toggle}
            type="button"
            aria-expanded={expanded}
            aria-controls="hh-cabinet-guide-body"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? c.hide : c.show}
            {expanded ? <ChevronUp size={15} aria-hidden="true" /> : <ChevronDown size={15} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {expanded && selected && (
        <div className={styles.body} id="hh-cabinet-guide-body">
          <p className={styles.heading}>{c.next}</p>
          <div className={styles.steps} role="group" aria-label={c.next}>
            {suggestions.map((suggestion, index) => (
              <button
                key={suggestion.key}
                type="button"
                aria-pressed={suggestion.key === selected.key}
                className={styles.tipButton}
                onClick={() => setSelectedKey(suggestion.key)}
              >
                <span className={styles.number}>{String(index + 1).padStart(2, '0')}</span>
                <span>{suggestion.title}</span>
              </button>
            ))}
          </div>
          <div className={styles.detail} aria-live="polite" aria-atomic="true">
            <span>{c.step} {suggestions.indexOf(selected) + 1} / {suggestions.length}</span>
            <h3>{selected.title}</h3>
            <p>{selected.body}</p>
            <Link href={selected.href} prefetch={false} className={styles.action}>
              {selected.action} <ArrowRight size={17} aria-hidden="true" />
            </Link>
          </div>
          <p className={styles.privacy}><LockKeyhole size={13} aria-hidden="true" /> {c.note}</p>
        </div>
      )}
    </aside>
  )
}
