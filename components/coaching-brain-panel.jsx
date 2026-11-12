'use client'

import {useEffect,useRef,useState} from 'react'
import {MessageCircle,Send,X,Check,ShieldCheck} from 'lucide-react'
import {appFetch} from '@/lib/app/client-fetch'
import styles from './coaching-brain-panel.module.css'

const copy={
  ru:{
    open:'AI-диалог',title:'Coaching Brain',subtitle:'Диалог с AI-коучем · не человек и не психотерапия',
    close:'Закрыть диалог',phase:'Этап',phases:{contract:'Запрос',discovery:'Ситуация',exploration:'Исследование',possibilities:'Возможности',action:'Действие',review:'Итог',safety_pause:'Пауза'},empty:'Расскажите, с чем хотите разобраться. Я буду задавать по одному вопросу.',
    consent:'Я согласен(на) отправлять введённые здесь сообщения в OpenRouter и выбранной бесплатной модели для ответа. Предыдущие ответы из кабинета не передаются автоматически.',
    privacy:'Диалог не сохраняется в истории. Только ваш подтверждённый шаг можно записать в защищённую сессию.',
    label:'Ваше сообщение',placeholder:'Что сейчас важно прояснить?',send:'Отправить',sending:'Думаю…',
    you:'Вы',coach:'AI-коуч',offline:'AI сейчас недоступен · авторский вопрос',
    ai:'Ответ модели',wisdom:'Библиотека мудрости',safety:'Пауза для безопасности',method:'Метод',methodChoice:'Методика',methodAuto:'Выбрать автоматически',hypothesis:'Возможная гипотеза — проверьте',
    suggestion:'Возможный следующий шаг (предложение, не решение)',evidence:'Основание — ваши слова',
    decision:'Мой следующий шаг (проверьте и исправьте)',save:'Подтвердить и сохранить шаг',
    saving:'Сохраняем…',saved:'Подтверждённый шаг сохранён в личной сессии',
    probeCheck:'Проверить AI без личного текста',probeChecking:'Проверка…',probeVerified:'AI ответил: ZDR-маршрут, $0',
    error:'Не удалось получить ответ. Ваш текст остаётся здесь.',saveError:'Не удалось сохранить шаг. Проверьте сессию и повторите.',
    missing:'Напишите сообщение.',decisionMissing:'Для следующего шага нужно минимум три символа.',revoke:'Согласие действует только в этой вкладке. Снимите отметку, чтобы прекратить отправку.',confidential:'Не вводите пароли, ключи доступа и номера документов.',
  },
  en:{
    open:'AI dialogue',title:'Coaching Brain',subtitle:'AI coaching conversation · not a human or therapy',
    close:'Close conversation',phase:'Phase',phases:{contract:'Goal',discovery:'Situation',exploration:'Exploration',possibilities:'Options',action:'Action',review:'Review',safety_pause:'Safety pause'},empty:'Tell me what you want to explore. I will ask one question at a time.',
    consent:'I agree to send messages typed here to OpenRouter and a selected free model for an answer. Earlier saved answers are not sent automatically.',
    privacy:'This conversation is not added to your history. Only a step you confirm can be saved in the private session.',
    label:'Your message',placeholder:'What would you like to understand?',send:'Send',sending:'Thinking…',
    you:'You',coach:'AI coach',offline:'AI unavailable · authored question',
    ai:'Model reply',wisdom:'Wisdom Library',safety:'Safety pause',method:'Method',methodChoice:'Method',methodAuto:'Choose automatically',hypothesis:'Tentative hypothesis — please correct',
    suggestion:'Possible next step (suggestion, not a decision)',evidence:'Based on your words',
    decision:'My next step (review and edit)',save:'Confirm and save this step',
    saving:'Saving…',saved:'Your confirmed step was saved in your private session',
    probeCheck:'Test AI without personal text',probeChecking:'Checking…',probeVerified:'AI responded: ZDR routing, $0',
    error:'Could not get a reply. Your text is still here.',saveError:'Could not save this step. Check your session and retry.',
    missing:'Please write a message.',decisionMissing:'Please write at least three characters for your step.',revoke:'Consent applies only to this page. Uncheck to stop sending.',confidential:'Do not enter passwords, API keys or document numbers.',
  },
  es:{
    open:'Diálogo IA',title:'Coaching Brain',subtitle:'Conversación con IA · no es una persona ni terapia',
    close:'Cerrar conversación',phase:'Etapa',phases:{contract:'Objetivo',discovery:'Situación',exploration:'Exploración',possibilities:'Opciones',action:'Acción',review:'Revisión',safety_pause:'Pausa'},empty:'Cuéntame qué deseas explorar. Haré una pregunta cada vez.',
    consent:'Acepto enviar los mensajes que escriba aquí a OpenRouter y un modelo gratuito seleccionado para recibir respuesta. Las respuestas guardadas no se envían automáticamente.',
    privacy:'Esta conversación no se añade al historial. Solo se guarda el paso que confirmes expresamente.',
    label:'Tu mensaje',placeholder:'¿Qué te gustaría aclarar?',send:'Enviar',sending:'Pensando…',
    you:'Tú',coach:'Coach IA',offline:'IA no disponible · pregunta preparada',
    ai:'Respuesta del modelo',wisdom:'Biblioteca de sabiduría',safety:'Pausa de seguridad',method:'Método',methodChoice:'Método',methodAuto:'Elegir automáticamente',hypothesis:'Hipótesis provisional — corrígela',
    suggestion:'Posible paso siguiente (sugerencia, no decisión)',evidence:'Basado en tus palabras',
    decision:'Mi siguiente paso (revisar y editar)',save:'Confirmar y guardar este paso',
    saving:'Guardando…',saved:'Tu paso confirmado se guardó en tu sesión privada',
    probeCheck:'Probar IA sin datos personales',probeChecking:'Comprobando…',probeVerified:'La IA respondió: ruta ZDR, $0',
    error:'No se pudo responder. Tu texto permanece aquí.',saveError:'No se pudo guardar este paso. Comprueba la sesión.',
    missing:'Escribe un mensaje.',decisionMissing:'Escribe al menos tres caracteres para tu paso.',revoke:'El consentimiento se aplica solo a esta página. Desmárcalo para dejar de enviar.',confidential:'No escribas contraseñas, claves API ni números de documentos.',
  },
}
const offlineReasons={
  en:{feature_disabled:'The AI service is not enabled yet.',server_not_configured:'The AI connection is not configured.',privacy_model_unavailable:'No free privacy-preserving model is available. Your answer stays offline.',rate_limited:'The free AI limit was reached.',cost_unverified:'Free processing could not be verified.',response_unverified:'The AI answer did not pass validation.',model_unavailable:'The AI service is temporarily unavailable.'},
  ru:{feature_disabled:'AI-сервис пока не включён.',server_not_configured:'Подключение AI не настроено.',privacy_model_unavailable:'Нет доступной бесплатной модели с защитой данных. Используется офлайн-вопрос.',rate_limited:'Лимит бесплатной модели исчерпан.',cost_unverified:'Не подтверждена бесплатность ответа.',response_unverified:'Ответ AI не прошёл проверку.',model_unavailable:'AI-сервис временно недоступен.'},
  es:{feature_disabled:'El servicio de IA aún no está habilitado.',server_not_configured:'La conexión de IA no está configurada.',privacy_model_unavailable:'No hay un modelo gratuito con privacidad verificada. Seguimos sin IA.',rate_limited:'Se alcanzó el límite del modelo gratuito.',cost_unverified:'No se pudo verificar el coste cero.',response_unverified:'La respuesta de IA no pasó la validación.',model_unavailable:'El servicio de IA no está disponible temporalmente.'},
}
const methodLabels={
  grow:'GROW',motivational_interviewing:'Motivational Interviewing',
  woop:'WOOP',solution_focused:'Solution-focused',oskar:'OSKAR',
  values:'Values clarification',decision_options:'Decision options',
}

export default function CoachingBrainPanel({locale='en',accountId,sessionId,onConfirmDecision}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const dialog=useRef(null),composer=useRef(null),latest=useRef(null),pending=useRef(null)
  const [consent,setConsent]=useState(false),[turns,setTurns]=useState([])
  const [preferredMethod,setPreferredMethod]=useState('auto')
  const [probing,setProbing]=useState(false),[probe,setProbe]=useState(null)
  const [draft,setDraft]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('')
  const [decision,setDecision]=useState(''),[saving,setSaving]=useState(false),[saved,setSaved]=useState('')
  useEffect(()=>()=>pending.current?.abort(),[])
  useEffect(()=>{if(turns.length)latest.current?.scrollIntoView({block:'end',behavior:'auto'})},[turns])
  function open(){
    if(dialog.current?.open)return
    dialog.current?.showModal()
    composer.current?.focus()
  }
  function close(){
    pending.current?.abort()
    dialog.current?.close()
  }
  async function checkAI(){
    if(busy||probing||!accountId||!sessionId)return
    const controller=new AbortController()
    pending.current?.abort()
    pending.current=controller
    setProbing(true);setProbe(null)
    try{
      const result=await appFetch('personal-coaching/brain-probe',
        {sessionId},'POST',{accountId,signal:controller.signal})
      if(!controller.signal.aborted)setProbe(result)
    }catch{
      if(!controller.signal.aborted)setProbe({status:'unavailable',reason:'model_unavailable'})
    }finally{
      if(pending.current===controller){pending.current=null;setProbing(false)}
    }
  }
  async function send(event){
    event.preventDefault()
    if(busy||probing||!consent||!accountId||!sessionId)return
    const message=draft.trim()
    if(message.length<1){setError(t.missing);return}
    const controller=new AbortController()
    pending.current?.abort()
    pending.current=controller
    setBusy(true);setError('')
    try{
      const result=await appFetch('personal-coaching/brain',{
        sessionId,locale:lang,consent:true,message,
        ...(preferredMethod!=='auto'?{preferredMethod}:{}),
        turns:turns.slice(-10).map(row=>({role:row.role,content:row.content})),
      },'POST',{accountId,signal:controller.signal})
      if(controller.signal.aborted)return
      const replyText=[result.reflection,
        result.hypothesis?t.hypothesis+': '+result.hypothesis:'',
        result.question].filter(Boolean).join('\n\n')
      const response={role:'assistant',content:replyText,mode:result.mode,
        method:result.method,stage:result.stage,phase:result.phase,
        offlineReason:result.mode==='offline'?result.offlineReason||'model_unavailable':'',
        suggestion:result.planSuggestion||'',evidence:result.evidenceQuote||''}
      setTurns(previous=>[...previous,{role:'user',content:message},response].slice(-12))
      setDraft('')
      if(result.planSuggestion&&result.mode==='ai'){
        setDecision(result.planSuggestion);setSaved('')
      }
    }catch{
      if(!controller.signal.aborted)setError(t.error)
    }finally{
      if(pending.current===controller){pending.current=null;setBusy(false)}
    }
  }
  async function confirmDecision(){
    const text=decision.trim()
    if(saving||busy)return
    if(text.length<3){setError(t.decisionMissing);return}
    setSaving(true);setError('')
    try{
      const result=await onConfirmDecision(text)
      if(!result){setError(t.saveError);return}
      setSaved(text)
    }catch{setError(t.saveError)}
    finally{setSaving(false)}
  }
  return <>
    <button type="button" className={styles.openButton} data-coaching-brain-open
      aria-label={t.open} onClick={open}><MessageCircle size={16} aria-hidden="true"/>{t.open}</button>
    <dialog ref={dialog} className={styles.dialog} data-coaching-brain-dialog
      aria-label={t.title} onClose={()=>pending.current?.abort()}>
      <div className={styles.panel}>
        <header className={styles.header}>
          <div><strong>{t.title}</strong><small>{t.subtitle}</small></div>
          <button type="button" onClick={close} aria-label={t.close} className={styles.close}>
            <X size={22}/></button>
        </header>
        <div className={styles.messages} role="log" aria-live="polite" aria-relevant="additions text">
          {turns.length===0&&<p className={styles.intro}>{t.empty}</p>}
          {turns.map((turn,index)=><article key={index} className={turn.role==='user'?styles.user:styles.assistant}>
            <span className={styles.sender}>{turn.role==='user'?t.you:t.coach}</span>
            {turn.role==='assistant'&&<div className={styles.meta}>
              {turn.mode==='ai'?t.ai:turn.mode==='wisdom'?t.wisdom:turn.mode==='safety'?t.safety:
                turn.mode==='offline'&&turn.offlineReason?
                  t.offline+' · '+(offlineReasons[lang][turn.offlineReason]||offlineReasons[lang].model_unavailable):t.offline}
              {turn.mode==='ai'&&turn.method&&<> · {t.method}: {methodLabels[turn.method]||turn.method}</>}{turn.phase&&<> · {t.phase}: {t.phases[turn.phase]||turn.phase}</>}
            </div>}
            <p>{turn.content}</p>
            {turn.role==='assistant'&&turn.suggestion&&<div className={styles.suggested}>
              <strong>{t.suggestion}</strong><p>{turn.suggestion}</p>
              {turn.evidence&&<small>{t.evidence}: «{turn.evidence}»</small>}
            </div>}
          </article>)}
          <div ref={latest}/>
        </div>
        <div className={styles.controls}>
          <div className={styles.aiProbe} data-coaching-brain-probe>
            <button type="button" disabled={busy||probing||saving} onClick={checkAI}>
              {probing?t.probeChecking:t.probeCheck}
            </button>
            {probe&&<span role="status" data-coaching-probe-status={probe.status}>
              {probe.status==='verified'?t.probeVerified:
                offlineReasons[lang][probe.reason]||offlineReasons[lang].model_unavailable}
            </span>}
          </div>
          <label className={styles.methodChoice} htmlFor="hh-brain-method">
            <span>{t.methodChoice}</span>
            <select id="hh-brain-method" data-coaching-method-override value={preferredMethod}
              disabled={busy} onChange={event=>setPreferredMethod(event.target.value)}>
              <option value="auto">{t.methodAuto}</option>
              {Object.entries(methodLabels).map(([value,label])=><option value={value} key={value}>{label}</option>)}
            </select>
          </label>
          {(decision||turns.filter(turn=>turn.role==='user').length>=2)&&<div className={styles.decision}>
            <label htmlFor="hh-brain-decision">{t.decision}</label>
            <textarea id="hh-brain-decision" rows={2} value={decision} maxLength={300}
              disabled={busy||saving} onChange={e=>{setDecision(e.target.value);setSaved('')}}/>
            <button type="button" onClick={confirmDecision} disabled={busy||saving||saved===decision.trim()}
              className={styles.confirm}><Check size={16}/>{saving?t.saving:saved===decision.trim()?t.saved:t.save}</button>
          </div>}
          <label className={styles.consent}>
            <input type="checkbox" checked={consent} onChange={e=>{setConsent(e.target.checked);if(!e.target.checked)pending.current?.abort()}}/>
            <span>{consent?t.revoke:t.consent}</span>
          </label>
          <form onSubmit={send} className={styles.form}>
            <label htmlFor="hh-brain-composer">{t.label}</label>
            <textarea ref={composer} id="hh-brain-composer" rows={2}
              maxLength={1200} value={draft} disabled={busy}
              placeholder={t.placeholder} onChange={e=>{setDraft(e.target.value);setError('')}}/>
            <button type="submit" disabled={busy||probing||!consent||draft.trim().length<3}
              className={styles.send}><Send size={17}/>{busy?t.sending:t.send}</button>
          </form>
          {error&&<p role="alert" className={styles.error}>{error}</p>}
          <p className={styles.note}><ShieldCheck size={15} aria-hidden="true"/>{t.privacy} {t.confidential}</p>
        </div>
      </div>
    </dialog>
  </>
}
