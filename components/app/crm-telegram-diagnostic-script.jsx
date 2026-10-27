'use client'
import {useEffect,useState} from 'react'
import {TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS,telegramDiagnosticV2Script} from '../../lib/crm/telegram-diagnostic-v2.mjs'
import styles from './crm-telegram-diagnostic-script.module.css'

const COPY={
  en:{
    title:'Your Telegram dialogue · 6 original messages',
    lead:'Exactly the texts in the existing Telegram V2 handler. This is the owner-approved source, not a generic SalesBot example.',
    source:'Read-only source of truth. Editing a CRM draft below does not change these Telegram messages.',
    language:'Message language',topic:'Topic for the final form link',
    preview:'Full original message',keys:'Buttons in the Telegram chat',
    photo:'Portrait included in the conversation',withPhoto:'Photo received',withoutPhoto:'Photo skipped',
    personal:'No scenario was saved, activated or sent by this preview.',
    six:['Greeting and consent','Select a topic','Optional portrait','Goal and difficulty','Drawing: ME · GOAL · OBSTACLE','Coaching form and acknowledgment'],
  },
  ru:{
    title:'Ваш диалог Telegram · 6 оригинальных сообщений',
    lead:'Дословные тексты ранее утверждённого вами сценария из Telegram V2, а не мой новый шаблон SalesBot.',
    source:'Точный текст из кода бота. Редактирование черновика CRM ниже НЕ меняет эти сообщения в Telegram.',
    language:'Язык сообщения',topic:'Тема для ссылки на итоговую форму',
    preview:'Полный исходный текст',keys:'Кнопки под сообщением Telegram',
    photo:'Вариант шага с фотографией',withPhoto:'Фото получено',withoutPhoto:'Фото пропущено',
    personal:'Просмотр ничего не сохраняет и не отправляет клиентам.',
    six:['Приветствие и согласие','Выбор темы','Фото (необязательно)','Цель, сложность, подробности','Рисунок «Я — Цель — Препятствие»','Коучинг-форма и подтверждение'],
  },
  es:{
    title:'Tu diálogo de Telegram · 6 mensajes originales',
    lead:'Textos exactos del guion previamente aprobado en Telegram V2, no una plantilla nueva de SalesBot.',
    source:'Fuente original de solo lectura. Editar un borrador CRM no cambia estos mensajes en Telegram.',
    language:'Idioma del mensaje',topic:'Tema para el enlace del formulario final',
    preview:'Texto original completo',keys:'Botones debajo del mensaje de Telegram',
    photo:'Variante según foto',withPhoto:'Foto recibida',withoutPhoto:'Foto omitida',
    personal:'Esta vista no guarda ni envía nada al cliente.',
    six:['Saludo y consentimiento','Elegir tema','Retrato opcional','Meta, dificultad y detalles','Dibujo: YO · META · OBSTÁCULO','Formulario y confirmación'],
  },
}
const LANGUAGES=[{id:'en',label:'English'},{id:'ru',label:'Русский'},{id:'es',label:'Español'}]
const TOPICS=['business','wellbeing','relationships','other']

export default function CrmTelegramDiagnosticScript({locale='en'}){
  const initial=COPY[locale]?locale:'en'
  const [language,setLanguage]=useState(initial)
  const [topic,setTopic]=useState('other')
  const [stepId,setStepId]=useState('intro')
  const [hasPhoto,setHasPhoto]=useState(true)
  useEffect(()=>{
    setLanguage(initial)
    setTopic('other')
    setStepId('intro')
    setHasPhoto(true)
  },[initial])
  const lang=COPY[language]?language:'en'
  const t=COPY[lang]
  const steps=telegramDiagnosticV2Script(lang,topic)
  const buttons=TELEGRAM_DIAGNOSTIC_V2_BUTTON_LABELS[lang]
  const selected=steps.find(item=>item.id===stepId)||steps[0]
  const selectedIndex=steps.findIndex(item=>item.id===selected.id)
  const message=selected.id==='question'&&!hasPhoto
    ?selected.withoutPhotoText:selected.text
  return <section className={styles.root} aria-labelledby="hh-telegram-v2-script-title"
    data-telegram-canonical-v2="true" data-source="telegram-diagnostic-v2">
    <header className={styles.header}>
      <h3 id="hh-telegram-v2-script-title">{t.title}</h3>
      <p>{t.lead}</p>
      <p className={styles.source}>{t.source}</p>
    </header>
    <div className={styles.controls}>
      <label>{t.language}
        <select value={lang} onChange={event=>{
          setLanguage(event.target.value);setStepId('intro');setHasPhoto(true)
        }}>
          {LANGUAGES.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
        </select>
      </label>
      <label>{t.topic}
        <select value={topic} onChange={event=>setTopic(event.target.value)}>
          {TOPICS.map(key=><option key={key} value={key}>{buttons[key]}</option>)}
        </select>
      </label>
    </div>
    <ol className={styles.steps} aria-label={t.title}>
      {steps.map((item,index)=><li key={item.id}>
        <button type="button" aria-pressed={selected.id===item.id}
          className={selected.id===item.id?styles.active:styles.step}
          onClick={()=>setStepId(item.id)}>
          <span className={styles.number}>{index+1}</span>
          <span className={styles.stepText}>
            <strong>{t.six[index]}</strong>
            <small>{item.text.slice(0,90)}{item.text.length>90?'…':''}</small>
          </span>
        </button>
      </li>)}
    </ol>
    <div className={styles.detail} aria-live="polite">
      <h4>{t.preview} · {selectedIndex+1}/6</h4>
      {selected.id==='question'&&<fieldset className={styles.photoChoices}>
        <legend>{t.photo}</legend>
        <label><input type="radio" name="hh-v2-photo-preview" checked={hasPhoto}
          onChange={()=>setHasPhoto(true)}/>{t.withPhoto}</label>
        <label><input type="radio" name="hh-v2-photo-preview" checked={!hasPhoto}
          onChange={()=>setHasPhoto(false)}/>{t.withoutPhoto}</label>
      </fieldset>}
      <p className={styles.fullText} lang={lang}>{message}</p>
      {selected.buttons.length>0&&<div className={styles.botKeys}>
        <strong>{t.keys}</strong>
        <div>{selected.buttons.map(key=><span key={key}>{key}</span>)}</div>
      </div>}
      <p className={styles.disclaimer}>{t.personal}</p>
    </div>
  </section>
}
