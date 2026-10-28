'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle, RotateCcw, ShieldCheck, Sparkles, X } from 'lucide-react'
import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import { buildTestResultDiscussion, classifyTestDiscussionReply, discussionOffers } from '@/lib/assessments/test-result-discussion.mjs'
import styles from './test-result-discussion.module.css'

const COPY = {
  en: {
    button: 'Discuss this test', title: 'Your test · personal guide',
    close: 'Close discussion', choose: 'Choose a scale to explore', reply: 'Ask about this test',
    placeholder: 'A short question or a preference…', send: 'Send', reset: 'Start again',
    next: 'Here are the available next steps. They are options, not a treatment plan.',
    another: 'Discuss another scale', more: 'Choose a different step', unknown: 'I can explain one of the recorded scales or suggest a video, course, test or consultation. Please choose an option.',
    safe: 'If you might hurt yourself or are in immediate danger, contact local emergency services now. This automated conversation cannot provide crisis support.',
    privacy: 'Your discussion stays in this browser tab. No chat content, test scores or profile details are sent to external AI, CRM or advertising.',
    back: 'Return to the full report', source: 'Recorded score (scale range)',
    care: 'Professional review may be appropriate. Read the source-linked advice in the report instead of using a commercial recommendation.',
    local: 'Automated, source-based guide',
  },
  ru: {
    button: 'Обсудить этот тест', title: 'Ваш тест · персональный консультант',
    close: 'Закрыть диалог', choose: 'Выберите показатель для обсуждения', reply: 'Задать вопрос по тесту',
    placeholder: 'Короткий вопрос или пожелание…', send: 'Отправить', reset: 'Начать заново',
    next: 'Вот возможные следующие шаги. Это выбор для вас, а не план лечения.',
    another: 'Обсудить другой показатель', more: 'Выбрать другой шаг', unknown: 'Могу обсудить одну из записанных шкал или предложить видео, курс, следующий тест либо консультацию. Выберите подходящий вариант.',
    safe: 'Если вы можете причинить себе вред или находитесь в непосредственной опасности, обратитесь в местную экстренную службу. Автоматический диалог не заменяет кризисную помощь.',
    privacy: 'Диалог остаётся в этой вкладке браузера. Текст чата, баллы и профиль не передаются внешнему ИИ, CRM или рекламным системам.',
    back: 'Вернуться к полному отчёту', source: 'Ваш балл (диапазон шкалы)',
    care: 'Может быть уместно профессиональное обсуждение. Ознакомьтесь с рекомендацией исходного отчёта вместо коммерческого предложения.',
    local: 'Автоматический консультант по исходным шкалам',
  },
  es: {
    button: 'Comentar esta prueba', title: 'Tu prueba · guía personal',
    close: 'Cerrar conversación', choose: 'Elige la escala que quieres explorar', reply: 'Pregunta sobre la prueba',
    placeholder: 'Una pregunta o preferencia breve…', send: 'Enviar', reset: 'Empezar de nuevo',
    next: 'Estos son posibles pasos, no un plan de tratamiento.',
    another: 'Comentar otra escala', more: 'Elegir otro paso', unknown: 'Puedo comentar una escala o mostrar vídeos, cursos, pruebas o consultas. Elige una opción.',
    safe: 'Si estás en peligro inmediato o piensas hacerte daño, contacta con los servicios de emergencia locales. Este diálogo automático no ofrece ayuda de crisis.',
    privacy: 'La conversación permanece en esta pestaña. El texto, las puntuaciones y el perfil no se envían a IA externa, CRM ni publicidad.',
    back: 'Volver al informe', source: 'Puntuación (rango)', care: 'Considera la recomendación de consulta profesional del informe en lugar de una oferta comercial.',
    local: 'Guía automatizada basada en el informe',
  },
}

const emptyMessages = model => [{ role: 'guide', text: model.intro },
  ...(model.verified ? [{ role: 'guide', text: model.question }] : [])]

export function TestResultDiscussion({ result, locale = 'en', autoOpen = false }) {
  const t = COPY[locale] || COPY.en
  const model = useMemo(() => buildTestResultDiscussion(
    result, buildAssessmentResultReport(result, locale), locale
  ), [result, locale])
  const [opened, setOpened] = useState(Boolean(autoOpen))
  const [stage, setStage] = useState('focus')
  const [selectedKey, setSelectedKey] = useState(null)
  const [preference, setPreference] = useState('video')
  const [messages, setMessages] = useState(() => emptyMessages(model))
  const [draft, setDraft] = useState('')
  const threadRef = useRef(null)
  const selected = model.scales.find(item => item.key === selectedKey) || model.scales[0] || null
  const offers = useMemo(() => discussionOffers({
    locale, topic: selected?.topic, preference, needsCare: model.needsCare,
  }), [locale, selected?.topic, preference, model.needsCare])

  useEffect(() => { if (autoOpen) setOpened(true) }, [autoOpen])
  useEffect(() => {
    if (opened && threadRef.current) threadRef.current.scrollTop = threadRef.current.scrollHeight
  }, [opened, messages, stage])

  const add = (...items) => setMessages(current => current.concat(items.map(([role, text]) => ({ role, text }))))
  const restart = () => {
    setStage('focus')
    setSelectedKey(null)
    setPreference('video')
    setDraft('')
    setMessages(emptyMessages(model))
  }
  const selectScale = (item, response = item.label) => {
    if (!item || !model.verified) return
    setSelectedKey(item.key)
    add(['user', response], ['guide', t.source + ': ' + item.label + ' — ' + item.score + '.'],
      ['guide', model.words.observe + ' ' + (item.summary || model.intro)],
      ...(model.needsCare
        ? [['guide', model.care]]
        : [['guide', model.words.followup]]))
    setStage(model.needsCare ? 'care' : 'next')
  }
  const choose = (kind, response = null) => {
    if (!['video', 'course', 'tests', 'session'].includes(kind) || model.needsCare) return
    setPreference(kind)
    add(['user', response || model.words[kind]], ['guide', t.next])
    setStage('offers')
  }
  const submit = event => {
    event.preventDefault()
    const text = draft.trim().slice(0, 240)
    if (!text) return
    setDraft('')
    const intent = classifyTestDiscussionReply(text)
    if (intent === 'urgent') {
      add(['user', text], ['guide', t.safe])
      setStage('safety')
      return
    }
    if ((stage === 'next' || stage === 'offers') && intent && !model.needsCare) {
      choose(intent, text)
      return
    }
    if (stage === 'focus') {
      const question = text.toLocaleLowerCase()
      const matching = model.scales.find(scale => question.includes(scale.label.toLocaleLowerCase()) ||
        scale.label.toLocaleLowerCase().includes(question) || question === scale.key.toLowerCase())
      if (matching) { selectScale(matching, text); return }
    }
    add(['user', text], ['guide', t.unknown])
  }

  return <section className={styles.root} id="test-result-discussion" data-test-result-discussion
    data-report-verified={model.verified ? 'true' : 'false'}
    aria-label={t.title}>
    <div className={styles.launch}>
      <span className={styles.launchIcon}><MessageCircle size={22} aria-hidden="true" /></span>
      <div className={styles.launchCopy}>
        <strong>{t.title}</strong>
        <small>{t.local}</small>
      </div>
      <button type="button" className={styles.open} onClick={() => setOpened(!opened)}
        aria-expanded={opened} aria-controls="test-result-discussion-panel">
        <Sparkles size={16} aria-hidden="true" />{opened ? t.close : t.button}
      </button>
    </div>
    {opened && <div id="test-result-discussion-panel" className={styles.panel}
      data-discussion-stage={stage}>
      <div className={styles.conversation}>
        <div className={styles.portrait}>
          <Image src="/images/holistic-house/support-reference-avatar.webp" alt="" width={104} height={145}
            sizes="(max-width: 380px) 65px, 90px" />
          <span className={styles.online} aria-hidden="true" />
        </div>
        <div className={styles.thread} role="log" aria-live="polite" aria-relevant="additions"
          aria-label={t.title} ref={threadRef} data-discussion-thread>
          {messages.map((msg, index) => <p key={index} className={msg.role === 'user' ? styles.mine : styles.guide}
            data-discussion-message={msg.role}>{msg.text}</p>)}
        </div>
      </div>

      {model.verified && stage === 'focus' && <div className={styles.choices} data-discussion-scale-choices>
        <p className={styles.label}>{t.choose}</p>
        {model.scales.map(scale => <button key={scale.key} type="button" onClick={() => selectScale(scale)}
          data-discussion-scale={scale.key}>
          <span>{scale.label}</span><small>{scale.score}</small><ArrowRight size={16} aria-hidden="true" />
        </button>)}
      </div>}
      {model.verified && stage === 'next' && <div className={styles.choices} data-discussion-intent-choices>
        <p className={styles.label}>{model.words.followup}</p>
        {['video', 'course', 'tests', 'session'].map(kind => <button key={kind} type="button"
          data-discussion-preference={kind} onClick={() => choose(kind)}>
          <span>{model.words[kind]}</span><ArrowRight size={16} aria-hidden="true" />
        </button>)}
        <button type="button" className={styles.subtle} onClick={restart}>{t.another}</button>
      </div>}
      {stage === 'offers' && !model.needsCare && <div className={styles.offers} data-discussion-offers>
        {offers.map(offer => <Link href={offer.href} key={offer.id} className={styles.offer}
          data-discussion-offer={offer.id} prefetch={false}>
          <span><strong>{offer.title}</strong><small>{offer.note}</small></span>
          <ArrowRight size={19} aria-hidden="true" />
        </Link>)}
        <button type="button" className={styles.subtle} onClick={restart}>{t.another}</button>
      </div>}
      {stage === 'care' && <div className={styles.care} role="note">
        <ShieldCheck size={18} aria-hidden="true" /><p>{t.care}</p>
        <button type="button" onClick={restart}>{t.another}</button>
      </div>}
      {stage === 'safety' && <div className={styles.care} role="alert"><p>{t.safe}</p></div>}
      {model.verified && stage !== 'safety' && stage !== 'care' && <form onSubmit={submit} className={styles.form}
        data-discussion-compose>
        <label htmlFor="test-discussion-message">{t.reply}</label>
        <div><input id="test-discussion-message" type="text" maxLength={240}
          placeholder={t.placeholder} value={draft} onChange={event => setDraft(event.target.value)} />
          <button type="submit" disabled={!draft.trim()} aria-label={t.send}>
            <ArrowRight size={18} aria-hidden="true" /></button></div>
      </form>}
      <footer className={styles.footer}>
        <ShieldCheck size={16} aria-hidden="true" /><p>{t.privacy} {model.words.format}</p>
        <div>
          <button type="button" onClick={restart}><RotateCcw size={14} aria-hidden="true" />{t.reset}</button>
          <Link href={'#hh-assessment-scales'}>{t.back}</Link>
          <button type="button" onClick={() => setOpened(false)} aria-label={t.close}><X size={16}/></button>
        </div>
      </footer>
    </div>}
  </section>
}
