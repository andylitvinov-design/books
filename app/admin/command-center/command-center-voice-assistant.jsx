'use client';
import {useEffect,useRef,useState} from 'react';
import CommandCenterVoiceButton from './command-center-voice-button';
import styles from './command-center-voice-assistant.module.css';

const copy={
 ru:{heading:'Голосовая задача · Voice Prompt',request:'Полный запрос',placeholder:'Говорите обычными словами или введите подробную задачу',prepare:'Подготовить задачу',preparing:'Подготавливаю…',disclosure:'Только текст отправляется на защищённый сервер. Qwen используется, если подключён; иначе — правила. Сохранение только по вашей кнопке.',qwen:'Подготовлено Qwen',rules:'Подготовлено по правилам (Qwen недоступен)',ready:'Черновик перенесён в поля ниже. Проверьте и нажмите «Сохранить задачу».',clarify:'Уточните запрос и подготовьте заново:',error:'Не удалось подготовить. Вы можете заполнить задачу вручную.',limit:'Запрос слишком длинный для сохранения целиком. Сократите его (до 1400 символов).',engine:'Диктовка браузера · распознавание может обрабатываться его поставщиком',typed:'Ввод с клавиатуры'},
 en:{heading:'Voice Prompt Assistant',request:'Full request',placeholder:'Speak naturally or type the complete task',prepare:'Prepare task',preparing:'Preparing…',disclosure:'Only text goes to our protected server. Configured Qwen is used if available; otherwise rules. Only you can save the task.',qwen:'Prepared by Qwen',rules:'Rule-based draft (Qwen unavailable)',ready:'Draft filled the fields below. Review and tap Save task.',clarify:'Clarify your request and prepare again:',error:'Preparation failed. You can still enter a task manually.',limit:'Request is too long to save completely. Please shorten it (1400 characters).',engine:'Browser dictation · the browser vendor may process speech',typed:'Keyboard input'},
 es:{heading:'Asistente de voz',request:'Solicitud completa',placeholder:'Habla de forma natural o escribe la tarea completa',prepare:'Preparar tarea',preparing:'Preparando…',disclosure:'Solo el texto llega al servidor protegido. Se usa Qwen si está configurado; si no, reglas. Guardar requiere tu confirmación.',qwen:'Preparado por Qwen',rules:'Borrador por reglas (Qwen no disponible)',ready:'Borrador copiado a los campos. Revísalo y pulsa Guardar.',clarify:'Aclara la solicitud y vuelve a prepararla:',error:'No se pudo preparar. Puedes rellenar la tarea manualmente.',limit:'La solicitud es demasiado larga. Acórtala (1400 caracteres).',engine:'Dictado del navegador · el proveedor puede procesar el audio',typed:'Entrada por teclado'}
};
export default function CommandCenterVoiceAssistant({lang='ru',onPrepared}){
 const t=copy[lang]||copy.ru;
 const [transcript,setTranscript]=useState(''),[sourceEngine,setSourceEngine]=useState('typed');
 const [preview,setPreview]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const current=useRef(''),active=useRef(null);
 useEffect(()=>()=>{active.current?.abort();},[]);
 function edit(value,engine='typed'){
  active.current?.abort();active.current=null;setBusy(false);
  if(value.length>1400){setError(t.limit);return;}
  current.current=value;setTranscript(value);setSourceEngine(engine);
  setPreview(null);setError('');
 }
 function receiveSpeech(spoken){
  const next=[current.current.trim(),spoken.trim()].filter(Boolean).join(' ');
  edit(next,'browser');
 }
 async function prepare(){
  if(busy||transcript.trim().length<6)return;
  const controller=new AbortController();active.current=controller;
  const timer=setTimeout(()=>controller.abort(),16000);
  setBusy(true);setError('');setPreview(null);
  try{
   const response=await fetch('/api/admin/command-center/voice-prompt/preview',{
    method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({requestId:crypto.randomUUID(),locale:['ru','en','es'].includes(lang)?lang:'ru',
      transcript:transcript.trim(),sourceEngine,consent:true})});
   const result=await response.json();
   if(!response.ok||!result.spec||result.taskCreated!==false||result.executionStarted!==false)throw Error('PREVIEW_UNAVAILABLE');
   if(controller.signal.aborted)return;
   setPreview({spec:result.spec,compiler:result.compiler});
   if(result.spec.missingRequired.length===0)onPrepared(result.spec);
  }catch{if(!controller.signal.aborted)setError(t.error);}
  finally{clearTimeout(timer);if(active.current===controller){active.current=null;setBusy(false);}}
 }
 return <section className={styles.assistant} aria-label={t.heading}>
  <strong className={styles.heading}>{t.heading}</strong>
  <CommandCenterVoiceButton lang={lang} onTranscript={receiveSpeech}/>
  <label htmlFor="cc-voice-transcript">{t.request}</label>
  <textarea id="cc-voice-transcript" rows={3} maxLength={1400} value={transcript}
   placeholder={t.placeholder} onChange={event=>edit(event.target.value,sourceEngine)}/>
  <small className={styles.disclosure}>{sourceEngine==='browser'?t.engine:t.typed}. {t.disclosure}</small>
  <button type="button" className={styles.prepare} disabled={busy||transcript.trim().length<6}
   onClick={prepare}>{busy?t.preparing:t.prepare}</button>
  {error&&<p className={styles.error} role="alert">{error}</p>}
  {preview&&<div className={styles.result} role="status">
   <strong>{preview.compiler==='qwen'?t.qwen:t.rules}</strong>
   {preview.spec.missingRequired.length>0?
    <p>{t.clarify} {preview.spec.missingRequired[0]}</p>:
    <p>{t.ready}</p>}
   <small>{preview.spec.title} · {preview.spec.proposedKind}</small>
  </div>}
 </section>;
}
