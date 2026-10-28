'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, MessageCircle, RotateCcw, Send, ShieldCheck, Sparkles } from 'lucide-react'
import { buildAssessmentResultReport } from '@/lib/assessments/result-report'
import {
  buildTestResultDiscussion, discussionTopicForTags,
  interpretTestDiscussionQuestion, testDiscussionOffers,
} from '@/lib/assessments/test-result-discussion.mjs'
import styles from './test-result-discussion.module.css'

const COPY = {
  en: {
    open:'Discuss this test', close:'Close discussion', guide:'Your results guide',
    local:'Private rule-based suggestions — not a live clinician or external AI.',
    intro:'Let’s look at your recorded answers. These are useful measures to discuss:',
    choose:'Which measure matters most to you right now?',
    unverified:'This result cannot be verified. Personal interpretation is unavailable. Review the original report.',
    question:'Ask a question or clarify your goal (optional)', placeholder:'For example, I want to rest better', send:'Send',
    fallback:'Scores alone cannot explain causes. What matters most in your everyday life?',
    next:'Based on your choice, these existing materials may help. Nothing is booked or bought automatically.',
    review:'The original interpretation recommends review by a qualified professional:',
    professional:'If symptoms concern you, consult a qualified healthcare professional. This is not a diagnosis.',
    urgent:'If you are in immediate danger, contact local emergency services or someone you trust. This guide cannot handle crises.',
    followup:'I can help you choose a theme, but one score does not establish its cause or treatment.',
    reset:'Start again', more:'Other available tests',
    privacy:'Results are used only on this page; questions stay in this browser tab, not sent to external AI, CRM or analytics.',
    disclaimer:'Questionnaires describe answers, not diagnoses, medical advice or promised outcomes.',
  },
  ru: {
    open:'Обсудить этот тест', close:'Закрыть обсуждение', guide:'Консультант по результатам',
    local:'Приватные подсказки по правилам — не врач и не внешний генеративный ИИ.',
    intro:'Давайте посмотрим ваши ответы. Для обсуждения стоит обратить внимание на эти показатели:',
    choose:'Какой показатель вам сейчас важнее?',
    unverified:'Достоверность результата не подтверждена. Персональный разбор недоступен; проверьте исходный отчёт.',
    question:'Задать вопрос или уточнить цель (необязательно)', placeholder:'Например, хочу лучше отдыхать', send:'Отправить',
    fallback:'Один балл не объясняет причин. Что сейчас важнее всего в повседневной жизни?',
    next:'С учётом вашего выбора можно посмотреть готовые материалы. Ничего не бронируется и не оплачивается автоматически.',
    review:'Исходная интерпретация рекомендует обратиться к квалифицированному специалисту:',
    professional:'Если симптомы беспокоят, обсудите их с квалифицированным медицинским специалистом. Это не диагноз.',
    urgent:'Если есть непосредственная опасность, обратитесь в местную экстренную службу или к человеку, которому доверяете. Этот помощник не предназначен для кризисных ситуаций.',
    followup:'Я помогу выбрать тему материалов, но один показатель не позволяет установить причину или назначить лечение.',
    reset:'Начать заново', more:'Другие доступные тесты',
    privacy:'Результаты используются только на этой странице. Текст вопросов остаётся во вкладке, не передаётся внешним ИИ, CRM или аналитике.',
    disclaimer:'Тесты описывают ответы, не устанавливают диагноз и не гарантируют результата.',
  },
  es: {
    open:'Comentar esta prueba', close:'Cerrar conversación', guide:'Tu guía de resultados',
    local:'Sugerencias privadas basadas en reglas; no es un profesional ni una IA externa.',
    intro:'Podemos revisar tus respuestas. Estos indicadores son un buen punto de partida:',
    choose:'¿Qué indicador quieres explorar?',
    unverified:'No se pudo verificar este resultado. Revisa el informe original antes de interpretarlo.',
    question:'Pregunta o comenta otro objetivo (opcional)', placeholder:'Por ejemplo, quiero descansar mejor', send:'Enviar',
    fallback:'Un resultado no explica sus causas. ¿Qué te importa en la vida cotidiana?',
    next:'Puedes explorar estos recursos ya publicados. No se crea ninguna reserva ni compra.',
    review:'La interpretación original recomienda una evaluación profesional:',
    professional:'Si los síntomas preocupan, consulta a un profesional sanitario. No es un diagnóstico.',
    urgent:'Si estás en peligro inmediato, contacta a emergencias o alguien de confianza. Esta guía no atiende crisis.',
    followup:'Puedo ayudarte a elegir un tema, no deducir causas ni tratamientos de una puntuación.',
    reset:'Empezar de nuevo', more:'Más pruebas disponibles',
    privacy:'Tus preguntas se quedan en esta pestaña; no se envían a IA externas, CRM ni analítica.',
    disclaimer:'Los cuestionarios describen respuestas, no diagnostican ni garantizan resultados.',
  },
}

const Bubble = ({role,children}) => <div className={role==='user'?styles.userBubble:styles.guideBubble}
  data-discussion-message={role}>{children}</div>

export function TestResultDiscussion({result,locale='en',initiallyOpen=false}) {
  const lang=['ru','es'].includes(locale)?locale:'en', t=COPY[lang]
  const report=useMemo(()=>buildAssessmentResultReport(result,lang),[result,lang])
  const model=useMemo(()=>buildTestResultDiscussion({result,report,locale:lang}),[result,report,lang])
  const [open,setOpen]=useState(Boolean(initiallyOpen))
  const [turns,setTurns]=useState([])
  const [question,setQuestion]=useState('')
  const [topic,setTopic]=useState(model.topic)
  const [phase,setPhase]=useState('choose')
  const panelRef=useRef(null), threadRef=useRef(null)
  useEffect(()=>{
    if(!initiallyOpen)return
    setOpen(true)
    const frame=window.requestAnimationFrame(()=>panelRef.current?.scrollIntoView({block:'start'}))
    return ()=>window.cancelAnimationFrame(frame)
  },[initiallyOpen])
  useEffect(()=>{
    if(open&&turns.length&&threadRef.current) threadRef.current.scrollTop=threadRef.current.scrollHeight
  },[open,turns])
  const offers=useMemo(()=>testDiscussionOffers({
    topic,locale:lang,needsProfessional:model.needsProfessional,verified:model.verified&&phase!=='safety',
  }),[topic,lang,model.needsProfessional,model.verified,phase])

  const selectMeasure=(row)=>{
    setTopic(discussionTopicForTags([row.domain],model.topic))
    setPhase('offers')
    setTurns(previous=>[...previous,
      {role:'user',text:row.label},
      {role:'guide',text:row.summary||t.fallback},
      {role:'guide',text:t.next},
    ])
  }
  const submitQuestion=(event)=>{
    event.preventDefault()
    const answer=question.trim().slice(0,240)
    if(!answer||!model.verified)return
    setQuestion('')
    const interpreted=interpretTestDiscussionQuestion(answer,model.topic)
    if(interpreted.urgent){
      setPhase('safety')
      setTurns(previous=>[...previous,{role:'user',text:answer},{role:'guide',text:t.urgent}])
      return
    }
    setTopic(interpreted.topic)
    setPhase('offers')
    setTurns(previous=>[...previous,
      {role:'user',text:answer},{role:'guide',text:t.followup},{role:'guide',text:t.next},
    ])
  }
  const reset=()=>{
    setTurns([])
    setQuestion('')
    setTopic(model.topic)
    setPhase('choose')
  }
  return <section id="hh-test-result-discussion" ref={panelRef} className={styles.root}
    data-test-result-discussion data-verified={model.verified?'true':'false'}>
    <button type="button" className={styles.toggle} aria-controls="hh-test-result-discussion-panel"
      aria-expanded={open} onClick={()=>setOpen(value=>!value)}>
      <MessageCircle size={19} aria-hidden="true"/><span>{open?t.close:t.open}</span>
      <ArrowRight size={17} aria-hidden="true"/>
    </button>
    {open&&<div id="hh-test-result-discussion-panel" role="region" aria-label={t.guide}
      className={styles.panel}>
      <header className={styles.heading}>
        <Sparkles size={18} aria-hidden="true"/>
        <div><strong>{t.guide}</strong><small>{t.local}</small></div>
      </header>
      <div className={styles.dialogue}>
        <div className={styles.portrait} aria-hidden="true">
          <Image src="/images/holistic-house/support-reference-avatar.webp" alt=""
            width={104} height={136} sizes="(max-width:430px) 72px, 104px" loading="lazy"/>
        </div>
        <div className={styles.thread} ref={threadRef} role="log" aria-live="polite"
          aria-relevant="additions" aria-label={t.guide}>
          <Bubble role="guide">{model.verified?t.intro:t.unverified}</Bubble>
          {model.verified&&<Bubble role="guide">
            <ul className={styles.measureList}>{model.highlights.map(row=>
              <li key={row.key}><strong>{row.label}</strong>{row.score&&<span>{row.score}</span>}</li>)}</ul>
            {t.choose}
          </Bubble>}
          {model.verified&&model.needsProfessional&&<Bubble role="guide">
            <strong>{t.review}</strong> {model.reviewNote||t.professional}
          </Bubble>}
          {turns.map((turn,index)=><Bubble role={turn.role} key={index}>{turn.text}</Bubble>)}
        </div>
      </div>
      {model.verified&&phase!=='safety'&&<>
        <div className={styles.choices} role="group" aria-label={t.choose}>
          {model.highlights.map(row=><button type="button" key={row.key} onClick={()=>selectMeasure(row)}>
            {row.label}<ArrowRight size={14} aria-hidden="true"/></button>)}
        </div>
        <form className={styles.question} onSubmit={submitQuestion}>
          <label htmlFor="hh-test-discussion-question">{t.question}</label>
          <div className={styles.inputRow}>
            <input id="hh-test-discussion-question" maxLength={240} autoComplete="off"
              type="text" value={question} onChange={event=>setQuestion(event.target.value)}
              placeholder={t.placeholder}/>
            <button type="submit" disabled={!question.trim()} aria-label={t.send}>
              <Send size={16} aria-hidden="true"/><span>{t.send}</span></button>
          </div>
        </form>
      </>}
      {model.verified&&!model.needsProfessional&&phase==='offers'&&<div className={styles.recommendations}
        data-test-result-offers aria-label={t.next}>
        <div className={styles.offerGrid}>{offers.filter(offer=>offer.id!=='test').slice(0,3).map(offer=>
          <Link key={offer.id} href={offer.href} prefetch={false}
            className={styles.offer} data-discussion-offer={offer.id}>
            <strong>{offer.title}<ArrowRight size={15} aria-hidden="true"/></strong>
            <small>{offer.description}</small>
          </Link>)}</div>
        <Link className={styles.otherLink} prefetch={false}
          href={offers.find(offer=>offer.id==='test')?.href||'/'+lang+'/client/tests'}>
          {t.more}<ArrowRight size={15} aria-hidden="true"/></Link>
      </div>}
      {turns.length>0&&phase!=='safety'&&<button type="button" className={styles.restart} onClick={reset}>
        <RotateCcw size={15} aria-hidden="true"/>{t.reset}</button>}
      <p className={styles.privacy}><ShieldCheck size={14} aria-hidden="true"/>{t.privacy}</p>
      <small className={styles.disclaimer}>{t.disclaimer}</small>
    </div>}
  </section>
}
