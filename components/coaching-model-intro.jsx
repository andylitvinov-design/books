'use client'

import Image from 'next/image'
import Link from 'next/link'
import {ArrowRight, Compass, LockKeyhole} from 'lucide-react'
import styles from './coaching-model-intro.module.css'

// Editorial presentation only: the caller owns the session, consent, and any 18+ gate.
const words={
 en:{eyebrow:'MEET YOUR E-COACHING METHOD',forWhat:'When this is useful',how:'How this works',
  result:'What you can take away',example:'For example',minutes:'min',questions:'questions',
  pace:'One question per screen, at your pace.',
  guest:'This free reflection stays in this tab. Nothing is saved to your account or sent to a coach.',
  private:'After you start, your answers are saved in your private encrypted account record.',
  limits:'Good to know',notice:'Self-reflection, not psychotherapy, medical advice or a guaranteed outcome.',
  yes:'Yes, start this session',other:'Choose another E-coach'},
 ru:{eyebrow:'ЗНАКОМЬТЕСЬ: ВАША КОУЧИНГ-МОДЕЛЬ',forWhat:'Для каких задач подходит',how:'Как проходит сессия',
  result:'Что вы сможете получить',example:'Например',minutes:'мин',questions:'вопросов',
  pace:'Один вопрос на экран, в своём темпе.',
  guest:'Бесплатная практика остаётся в этой вкладке. Ответы не передаются коучу и не сохраняются в кабинете.',
  private:'После начала ответы сохраняются только в вашем зашифрованном личном кабинете.',
  limits:'Важно учитывать',notice:'Самоисследование, не психотерапия, медицинский совет или гарантия результата.',
  yes:'Да, пройти сессию',other:'Выбрать другого E-коуча'},
 es:{eyebrow:'CONOCE TU MÉTODO DE E-COACHING',forWhat:'Para qué situaciones sirve',how:'Cómo funciona la sesión',
  result:'Qué puedes llevarte',example:'Por ejemplo',minutes:'min',questions:'preguntas',
  pace:'Una pregunta por pantalla, a tu ritmo.',
  guest:'Esta reflexión gratuita permanece en esta pestaña; no se comparte ni se guarda en tu cuenta.',
  private:'Después de empezar, las respuestas se guardan cifradas solo en tu cuenta privada.',
  limits:'Ten en cuenta',notice:'Autorreflexión, no psicoterapia, consejo médico ni garantía de resultados.',
  yes:'Sí, empezar la sesión',other:'Elegir otro E-coach'},
}
export default function CoachingModelIntro({
  locale='en',methodKey,title,description,fit,outcome,examples=[],topics=[],caution,
  image,minutes,questionCount,privacy='guest',onStart,onOther,otherHref,busy=false,error=''
}){
 const lang=words[locale]?locale:'en',t=words[lang]
 const example=Array.isArray(examples)?examples.find(s=>typeof s==='string'&&s.trim()):null
 const labels=Array.isArray(topics)?topics.filter(s=>typeof s==='string'&&s.trim()).slice(0,3):[]
 const stats=[minutes?minutes+' '+t.minutes:null,questionCount?questionCount+' '+t.questions:null].filter(Boolean).join(' · ')
 return <section className={styles.shell} data-coaching-model-intro data-coaching-intro-method={methodKey||''} lang={lang}>
  <div className={styles.scroll}>
   <div className={styles.hero}>
    <Image src={image||'/images/holistic-house/books-library.webp'} alt="" fill
      sizes="(max-width:700px) 100vw, 800px" className={styles.photo}/>
    <div className={styles.heroText}>
     <span className={styles.eyebrow}><Compass size={14} aria-hidden="true"/>{t.eyebrow}</span>
     <h1>{title}</h1>
     {description&&<p>{description}</p>}
    </div>
   </div>
   <div className={styles.information}>
    <div className={styles.fact}>
     <h2>{t.forWhat}</h2>
     <div>
      <p>{fit||description}</p>
      {labels.length>0&&<div className={styles.topics}>{labels.map(label=><span key={label}>{label}</span>)}</div>}
      {example&&<p className={styles.example}><strong>{t.example}:</strong> {example}</p>}
     </div>
    </div>
    <div className={styles.fact}><h2>{t.how}</h2><p><strong>{stats}</strong>{stats?' · ':''}{t.pace}</p></div>
    <div className={styles.fact}><h2>{t.result}</h2><p>{outcome||description}</p></div>
    {caution&&<p className={styles.caution}><strong>{t.limits}:</strong> {caution}</p>}
    <p className={styles.privacy}><LockKeyhole size={14} aria-hidden="true"/>
     <span>{privacy==='private'?t.private:t.guest} {t.notice}</span>
    </p>
   </div>
  </div>
  <footer className={styles.actions}>
   {error&&<p className={styles.error} role="alert">{error}</p>}
   <button type="button" className={styles.primary} disabled={busy} onClick={onStart}>
    {t.yes}<ArrowRight size={17} aria-hidden="true"/>
   </button>
   {otherHref?<Link className={styles.secondary} href={otherHref}>{t.other}</Link>
    :<button type="button" className={styles.secondary} disabled={busy} onClick={onOther}>{t.other}</button>}
  </footer>
 </section>
}
