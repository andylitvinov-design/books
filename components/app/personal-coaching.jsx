'use client'


import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import CoachingReportPreview from '@/components/coaching-report-preview'
import { ArrowRight, Check, ChevronLeft, Copy, Download, LockKeyhole, Sparkles, Trash2, X } from 'lucide-react'
import { appFetch } from '@/lib/app/client-fetch'
import { PERSONAL_COACH_QUESTIONS, personalCoachNextIndex } from '@/lib/personal-coaching/questions'
import { coachingReportDate, downloadCoachingSessionPdf } from '@/lib/personal-coaching/session-pdf'
import PersonalCoachingPicker from './personal-coaching-picker'
import CoachingContextReview from '@/components/coaching-context-review'
import { buildClientCoachingContext, developmentGoalsContextItems } from '@/lib/personal-coaching/client-context.mjs'
import { reconcileCoachingDraft, reconcileCoachingPlan, coachingPlansEqual, reconcileFollowupDraft } from '@/lib/personal-coaching/reconnect.mjs'
import CoachingQuestionVoice from './coaching-question-voice'
import {useCoachingVisualViewport} from './use-coaching-visual-viewport'
import CoachingAvatar from './coaching-avatar'
import {coachingVisualAvatarId,normalizeAvatarSpeechEvent} from '@/lib/personal-coaching/coaching-avatar-state.mjs'
import CoachingLiveVoice from './coaching-live-voice'
import CoachingChatThread from '@/components/coaching-chat-thread'
import { appendSpokenAnswer } from '@/lib/personal-coaching/speech-text'
import { authoredFollowupFor, coachingControlForAnswer, draftCoachingActionPlan } from '@/lib/personal-coaching/offline-intelligence'
import { coachingQuickChoicesAllowed, coachingConversationTurn } from '@/lib/personal-coaching/gentle-dialogue'
import { isCoachingSafetyConcern } from '@/lib/personal-coaching/model-matcher'
import CoachingActionPlan from '@/components/coaching-action-plan'
import CoachingBrainPanel from '@/components/coaching-brain-panel'
import { coachingSessionTitle } from '@/lib/coaching/session-presentation'
import { CoachingSessionIntroduction, CoachingSessionTopic } from '@/components/coaching-session-onboarding'
import { coachingEntryCopy } from '@/components/coaching-session-onboarding'
import { coachingRequestTopicLabel } from '@/lib/coaching/session-onboarding'
import { coachingArt } from '@/lib/coaching/public-session-art'
import { cardArtworkUrl } from '@/lib/public-card-artwork'
import { coachingAdaptivePrompt, buildCoachingRecap, coachingRecapClipboardText } from '@/lib/personal-coaching/guided-session'
import { growPhaseForStep, growClarityOutcome } from '@/lib/personal-coaching/grow-20.mjs'
import styles from './personal-coaching.module.css'


const growCopy={
  en:{phases:{G:'Goal',R:'Reality',O:'Options',W:'Way forward',Review:'Review'},
    target:'Target 20 min · flexible',clarity:'Clarity of my next step',before:'At the start',
    after:'At the end',missing:'Not measured',change:'Change in my rating',
    noCompare:'A comparison needs both ratings.',reflection:'Your own 0–10 reflection, not a clinical score or proof of lasting change.',
    confirmed:'Client-confirmed actions',fallback:'Fallback'},
  ru:{phases:{G:'Цель',R:'Реальность',O:'Варианты',W:'Действие',Review:'Итог'},
    target:'Ориентир 20 минут · без таймера',clarity:'Ясность следующего шага',before:'В начале',
    after:'В конце',missing:'Не измерено',change:'Изменение моей оценки',
    noCompare:'Для сравнения нужны обе оценки.',reflection:'Ваша субъективная оценка 0–10, не клинический показатель и не доказательство устойчивых изменений.',
    confirmed:'Подтверждено действий',fallback:'Запасной вариант'},
  es:{phases:{G:'Objetivo',R:'Realidad',O:'Opciones',W:'Siguiente paso',Review:'Revisión'},
    target:'Objetivo 20 min · sin límite rígido',clarity:'Claridad de mi próximo paso',before:'Al inicio',
    after:'Al final',missing:'Sin medir',change:'Cambio de mi valoración',
    noCompare:'Para comparar hacen falta ambas valoraciones.',reflection:'Autoevaluación de 0–10, no puntuación clínica ni prueba de cambios duraderos.',
    confirmed:'Acciones confirmadas',fallback:'Alternativa'},
}
const copy={
  en:{
    eyebrow:'HOLISTIC HOUSE · SELF-GUIDED COACHING',title:'Personal Coaching Session',
    intro:'A quiet space to think through one question and choose your next step.',
    selfGuided:'The guided questions are self-reflection. Optional AI dialogue requires your consent.',
    time:'Choose a coaching approach · 10–30 minutes',private:'Your answers stay private in your account.',
    start:'Start my session',resume:'Continue my session',new:'Start another session',
    loading:'Opening your private session…',loadError:'Your session could not be loaded. Try again.',
    saveError:'Could not confirm the save. Retry or reload to check your saved session.',
    conflict:'Your session changed in another tab. Reload to get the newest saved answers.',
    retry:'Reload session',close:'Exit session',unsaved:'You have an unsaved answer. Leave without saving it?',
    question:'QUESTION',of:'OF',back:'Back',next:'Save & continue',finish:'Save & finish',skip:'Skip this question',
    hint:'Your answer, in your own words (you can also dictate it)',placeholder:'Take your time. A few sentences are enough…',required:'Write at least a few words before continuing.',
    earlierChoice:'Previous quick answer',replaceChoice:'You can replace this with your own words.',scaleHelp:'For a 0–10 rating, write the number and, if helpful, explain it.',
    stopMic:'Stop dictation and review the recognized text before saving.',
    saving:'Saving…',saved:'Saved in your private cabinet',change:'You can change your answer before finishing.',
    summary:'Your personal session',finished:'Your answers, in one place',plan:'The step I chose',
    noAnswer:'Skipped',history:'Earlier private sessions',historyItem:'Previous session',
    share:'Nothing is sent to a coach or messenger automatically.',
    reportNotice:'After tapping Save, your answer is kept in your private account. At the end you can download a PDF with your questions, answers and reflections.',
    pdf:'Download PDF report',pdfError:'Could not create the PDF. Your private answers remain saved.',date:'Session date',
    restart:'This starts a new session and saves the completed one to your private history.',
    home:'My Courses',delete:'Delete my coaching notes',deleteConfirm:'Delete all personal coaching notes and session history? Saved reports remain in your archive and can be deleted separately. This cannot be undone.',
    completeNote:'This is a self-reflection tool, not a diagnosis, guaranteed result, or booked consultation.',
    completed:'Session completed',emptyError:'Could not start the session. Please retry.',
  },
  ru:{
    eyebrow:'HOLISTIC HOUSE · САМОСТОЯТЕЛЬНАЯ КОУЧ-СЕССИЯ',title:'Личная коуч-сессия',
    intro:'Пространство для разговора с собой: один вопрос за раз, один следующий шаг.',
    selfGuided:'Основные вопросы — для самостоятельной работы. Дополнительный AI-диалог запускается только с вашего согласия.',
    time:'Выберите подход · примерно 10–30 минут',private:'Ваши ответы сохраняются только в личном кабинете.',
    start:'Начать сессию',resume:'Продолжить сессию',new:'Начать новую сессию',
    loading:'Открываем вашу личную сессию…',loadError:'Не удалось загрузить сессию. Попробуйте ещё раз.',
    saveError:'Не удалось подтвердить сохранение. Повторите попытку или обновите сессию.',
    conflict:'Сессия изменилась в другой вкладке. Обновите сохранённые ответы.',
    retry:'Обновить сессию',close:'Закрыть сессию',unsaved:'Этот ответ не сохранён. Выйти без сохранения?',
    question:'ВОПРОС',of:'ИЗ',back:'Назад',next:'Сохранить и далее',finish:'Сохранить и завершить',skip:'Пропустить вопрос',
    hint:'Ваш ответ своими словами (можно продиктовать)',placeholder:'Не спешите. Достаточно нескольких предложений…',required:'Напишите хотя бы несколько слов, прежде чем продолжить.',
    earlierChoice:'Ранее выбранный вариант',replaceChoice:'Вы можете заменить его собственным ответом.',scaleHelp:'Если это шкала 0–10, напишите число и при желании поясните его.',
    stopMic:'Остановите микрофон и проверьте распознанный текст перед сохранением.',
    saving:'Сохраняем…',saved:'Сохранено в личном кабинете',change:'До завершения ответ можно изменить.',
    summary:'Моя коуч-сессия',finished:'Ваши ответы в одном месте',plan:'Мой выбранный шаг',
    noAnswer:'Пропущено',history:'Предыдущие личные сессии',historyItem:'Прошлая сессия',
    share:'Ответы не отправляются коучу или в мессенджеры автоматически.',
    reportNotice:'После нажатия «Сохранить» ваш ответ останется в личном кабинете. В конце сможете скачать PDF с вашими мыслями, вопросами и ответами.',
    pdf:'Скачать PDF-отчёт',pdfError:'Не удалось создать PDF. Ответы сохранены в кабинете.',date:'Дата сессии',
    restart:'Новая сессия сохранит завершённую в вашей личной истории.',
    home:'Мои курсы',delete:'Удалить мои записи',deleteConfirm:'Удалить все ответы и историю коуч-сессий? Сохранённые отчёты останутся в архиве и удаляются отдельно. Это действие нельзя отменить.',
    completeNote:'Это практика размышления, а не диагноз, обещание результата или запись на консультацию.',
    completed:'Сессия завершена',emptyError:'Не удалось начать сессию. Попробуйте ещё раз.',
  },
  es:{
    eyebrow:'HOLISTIC HOUSE · COACHING AUTOGUIADO',title:'Sesión personal de coaching',
    intro:'Un espacio para aclarar una pregunta y elegir tu siguiente paso.',
    selfGuided:'Las preguntas son autoguiadas. El diálogo opcional con IA requiere tu consentimiento.',
    time:'Elige un enfoque · 10–30 minutos',private:'Tus respuestas permanecen privadas.',
    start:'Empezar sesión',resume:'Continuar sesión',new:'Empezar otra sesión',
    loading:'Abriendo tu sesión…',loadError:'No se pudo cargar. Inténtalo de nuevo.',
    saveError:'No se pudo confirmar el guardado. Inténtalo de nuevo o actualiza la sesión.',conflict:'Otra pestaña ha modificado la sesión. Actualiza tus datos.',
    retry:'Actualizar sesión',close:'Salir',unsaved:'Tu respuesta no está guardada. ¿Salir?',
    question:'PREGUNTA',of:'DE',back:'Atrás',next:'Guardar y seguir',finish:'Guardar y terminar',skip:'Saltar pregunta',
    hint:'Tu respuesta, con tus propias palabras (también puedes dictarla)',placeholder:'Sin prisa. Unas frases son suficientes…',required:'Escribe algunas palabras.',
    earlierChoice:'Respuesta rápida anterior',replaceChoice:'Puedes sustituirla por tus propias palabras.',scaleHelp:'Para una escala de 0 a 10, escribe el número y, si quieres, explícalo.',
    stopMic:'Detén el micrófono y revisa el texto antes de guardar.',
    saving:'Guardando…',saved:'Guardado en tu cuenta privada',change:'Puedes editar antes de terminar.',
    summary:'Mi sesión personal',finished:'Tus respuestas',plan:'El paso elegido',noAnswer:'Omitido',
    history:'Sesiones anteriores',historyItem:'Sesión anterior',share:'No enviamos tus respuestas a otras personas.',
    reportNotice:'Al pulsar Guardar, tu respuesta queda en tu cuenta privada. Al final podrás descargar un PDF con tus reflexiones, preguntas y respuestas.',
    pdf:'Descargar informe PDF',pdfError:'No se pudo crear el PDF. Tus respuestas siguen guardadas.',date:'Fecha de la sesión',
    restart:'La sesión completada se guardará en tu historial.',home:'Mis cursos',delete:'Borrar mis notas',
    deleteConfirm:'¿Eliminar todas tus respuestas e historial? Los informes guardados permanecerán en el archivo y pueden eliminarse por separado. No se puede deshacer.',
    completeNote:'Esto es autorreflexión, no un diagnóstico ni una consulta reservada.',
    completed:'Sesión completada',emptyError:'No se pudo empezar. Inténtalo de nuevo.',
  },
}
const extraCopy={
  en:{choice:'Choose an answer',orWrite:'Or write your own answer (optional)',
    woop:'For a complete WOOP exercise, write your own specific if–then plan here.',
    chosen:'Selected approach',yourQuestion:'Your original question',loadingCatalog:'Your coaching questions are being loaded…'},
  ru:{choice:'Выберите ответ',orWrite:'Или впишите свой ответ (необязательно)',
    woop:'Для полноценной WOOP сформулируйте свой конкретный план «если — то» словами.',
    chosen:'Выбранная модель',yourQuestion:'Ваш исходный вопрос',loadingCatalog:'Загружаем вопросы выбранной модели…'},
  es:{choice:'Elige una respuesta',orWrite:'O escribe tu respuesta (opcional)',
    woop:'Para completar WOOP, escribe tu propio plan específico «si — entonces».',
    chosen:'Modelo elegido',yourQuestion:'Tu pregunta original',loadingCatalog:'Cargando las preguntas de tu modelo…'},
}
const followupCopy={
 en:{title:'A helpful follow-up',why:'An optional original coaching prompt. It is not generated by AI.',answer:'Your reflection',placeholder:'Write what feels useful…',save:'Save reflection & continue',skip:'Continue without this question',short:'Write at least 3 characters.'},
 ru:{title:'Уточняющий вопрос',why:'Дополнительный авторский вопрос, а не генерация ИИ. Его можно пропустить.',answer:'Ваше уточнение',placeholder:'Напишите то, что вам подходит…',save:'Сохранить и продолжить',skip:'Продолжить без уточнения',short:'Напишите не меньше 3 символов.'},
 es:{title:'Una pregunta de aclaración',why:'Pregunta original opcional, sin generación de IA. Puedes omitirla.',answer:'Tu reflexión',placeholder:'Escribe lo que te resulte útil…',save:'Guardar y continuar',skip:'Continuar sin esta pregunta',short:'Escribe al menos 3 caracteres.'},
}
const intelligenceCopy={
  en:{adaptive:'Tailored to your earlier answer',standard:'Use the original model question',
    tailored:'Use the tailored question',recap:'Your reflection, in your own words',
    recapNote:'Only your saved answers appear here, not inferred results, diagnoses or AI advice.',
    copy:'Copy my reflection',copied:'Copied. You choose whether to share it.',
    copyError:'Copy is unavailable. You can select the text below manually.',
    manual:'Select and copy my private reflection'},
  ru:{adaptive:'С учётом вашего предыдущего ответа',standard:'Вернуть вопрос из модели',
    tailored:'Вернуть уточнённый вопрос',recap:'Ваши выводы — вашими словами',
    recapNote:'Только ваши сохранённые ответы, без выдуманных выводов, диагнозов или советов ИИ.',
    copy:'Скопировать мои выводы',copied:'Скопировано. Только вы решаете, делиться ли ими.',
    copyError:'Автоматическое копирование недоступно. Текст ниже можно выделить и скопировать.',
    manual:'Выделите и скопируйте мои личные выводы'},
  es:{adaptive:'Según tu respuesta anterior',standard:'Usar la pregunta original del modelo',
    tailored:'Usar la pregunta adaptada',recap:'Tu reflexión, con tus propias palabras',
    recapNote:'Solo se muestran tus respuestas guardadas, sin diagnósticos ni consejos de IA.',
    copy:'Copiar mi reflexión',copied:'Copiado. Tú decides si lo compartes.',
    copyError:'No se pudo copiar automáticamente. Selecciona el texto abajo.',
    manual:'Selecciona y copia mi reflexión privada'},
}
const entryCopyContinue=locale=>({en:'Continue coaching session',ru:'Продолжить коучинг-сессию',es:'Continuar sesión de coaching'})[locale]||'Continue coaching session'
const entryCopyBegin=locale=>({en:'Continue to questions',ru:'Перейти к вопросам',es:'Continuar con preguntas'})[locale]||'Continue to questions'
const controlCopy={
  en:{
    safetyTitle:'Let’s pause here',
    safetyBody:'This may need support beyond self guided coaching. If anyone is in immediate danger, contact local emergency services now or reach someone you trust. This coaching flow is paused.',
    pausedTitle:'Your session is paused',
    pausedBody:'Take the time you need. Your saved answer remains in your private session. You can continue when you feel ready.',
    stoppedTitle:'We’ll stop here',
    stoppedBody:'Your request to stop is respected. Your saved answers remain in your private session.',
    resume:'Continue session',home:'Return to My Courses',
  },
  ru:{
    safetyTitle:'Давайте остановимся здесь',
    safetyBody:'В этой ситуации может понадобиться поддержка за пределами самостоятельного коучинга. Если кому-либо угрожает непосредственная опасность, обратитесь в местную экстренную службу или к человеку, которому доверяете. Коучинговая сессия приостановлена.',
    pausedTitle:'Сессия приостановлена',
    pausedBody:'Возьмите столько времени, сколько нужно. Ваш сохранённый ответ остаётся в личной сессии. Вы сможете продолжить, когда будете готовы.',
    stoppedTitle:'На этом остановимся',
    stoppedBody:'Ваше желание завершить разговор принято. Сохранённые ответы останутся в личной сессии.',
    resume:'Продолжить сессию',home:'Вернуться в Мои курсы',
  },
  es:{
    safetyTitle:'Hagamos una pausa aquí',
    safetyBody:'Esto puede requerir apoyo más allá del coaching autónomo. Si alguien está en peligro inmediato, contacta con los servicios locales de emergencia o con una persona de confianza. Esta sesión queda pausada.',
    pausedTitle:'Tu sesión está en pausa',
    pausedBody:'Tómate el tiempo que necesites. Tu respuesta guardada permanece en tu sesión privada. Puedes continuar cuando estés preparado/a.',
    stoppedTitle:'Terminamos aquí',
    stoppedBody:'Respetamos tu decisión de parar. Tus respuestas guardadas permanecen en tu sesión privada.',
    resume:'Continuar sesión',home:'Volver a Mis cursos',
  },
}
const translated=(value,lang)=>value?.[lang]||value?.en||''
const questionsFor=(course,catalog)=>{
  const key=course?.current?.schemeKey
  if(!key)return PERSONAL_COACH_QUESTIONS
  return catalog?.schemes?.find(item=>item.schemeKey===key)?.questions||[]
}
const firstUnanswered=(items,answers={})=>{
  if(items===PERSONAL_COACH_QUESTIONS)return personalCoachNextIndex(answers)
  const found=items.findIndex(item=>!Object.prototype.hasOwnProperty.call(answers||{},item.id))
  return found===-1?Math.max(0,items.length-1):found
}
const prettyAnswer=(value,item,lang,missing)=>{
  if(typeof value!=='string')return missing
  if(!value.startsWith('choice:'))return value
  const id=value.slice(7)
  if(item?.type==='scale_0_10')return id+'/10'
  return translated(item?.choices?.find(c=>c.id===id)?.label,lang)||missing
}
export default function PersonalCoaching({locale='en',accountId}){
  const lang=['en','ru','es'].includes(locale)?locale:'en',t=copy[lang],root='/'+lang+'/app'
  const [state,setState]=useState(null),[catalog,setCatalog]=useState(null)
  const [loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[newSelection,setNewSelection]=useState(false)
  const [entry,setEntry]=useState(null)
  const [error,setError]=useState(''),[notice,setNotice]=useState('')
  const [index,setIndex]=useState(0),[draft,setDraft]=useState('')
  const [dictating,setDictating]=useState(false),[speechConsent,setSpeechConsent]=useState(false)
  const [visualCoachId,setVisualCoachId]=useState(null)
  const [coachSpeech,setCoachSpeech]=useState({phase:'idle',beat:0})
  const [pendingFollowup,setPendingFollowup]=useState(null),[reflectionDraft,setReflectionDraft]=useState('')
  const [sessionControl,setSessionControl]=useState(null)
  const [conflictingAnswer,setConflictingAnswer]=useState(undefined)
  const [conflictingPlan,setConflictingPlan]=useState(undefined)
  const [useStandardPrompt,setUseStandardPrompt]=useState(false),[clipboardState,setClipboardState]=useState('')
  const titleRef=useRef(null),busyRef=useRef(false),viewportRef=useRef(null)
  useCoachingVisualViewport(viewportRef)
  const pendingTurn=useRef(null)
  const course=state?.course,session=course?.current,langCopy=extraCopy[lang]
  useEffect(()=>{setConflictingPlan(undefined)},[session?.id])
  const scheme=session?.schemeKey?catalog?.schemes?.find(item=>item.schemeKey===session.schemeKey):null
  const avatarId=visualCoachId||coachingVisualAvatarId(scheme?.modelKey||session?.schemeKey)
  const avatarPhase=dictating?'listening':coachSpeech.phase
  const updateAvatarSpeech=event=>setCoachSpeech(normalizeAvatarSpeechEvent(event))
  const activeQuestions=questionsFor(course,catalog)
  const question=activeQuestions[index]||activeQuestions[0]
  const isOverload=session?.schemeKey==='grow_overload_20_v1'
  const growPhase=isOverload?growPhaseForStep(question?.stepKey):null
  const clarityOutcome=isOverload&&session?.status==='completed'?growClarityOutcome(session.answers):null
  const requiresWrittenPlan=Boolean(scheme?.requiredCustomPlan && (isOverload?question?.stepKey==='will':index===activeQuestions.length-1))
  const planHint=isOverload?(lang==='ru'?'Опишите свой конкретный первый шаг.':lang==='es'?'Describe tu primer paso concreto.':'Describe your own concrete first step.'):langCopy.woop
  const quickChoices=coachingQuickChoicesAllowed(question,index,{allowReview:isOverload})
  const previousQuestion=activeQuestions[index-1]
  const conversationTurn=coachingConversationTurn({
    question,previousQuestion,previousAnswer:session?.answers?.[previousQuestion?.id],
    previousReflection:session?.reflections?.[previousQuestion?.id]?.text,
    index,total:activeQuestions.length,locale:lang,
  })
  const followupTurn=pendingFollowup?coachingConversationTurn({
    question,previousQuestion:question,previousAnswer:session?.answers?.[question?.id],
    index,total:activeQuestions.length,locale:lang,followup:true,
  }):null
  const persisted=session?.answers?.[question?.id]
  const dirty=Boolean(session?.status==='active' && question && draft!==(typeof persisted==='string'?persisted:''))
  const finished=session?.status==='completed'
  const safetyHold=session?.status==='safety_hold'
  const adaptive=coachingAdaptivePrompt({question,questions:activeQuestions,index,
    answers:session?.answers||{},locale:lang,requiredCustomPlan:Boolean(scheme?.requiredCustomPlan&&!isOverload)})
  const standardPrompt=translated(question?.prompt||question?.question,lang)
  const visiblePrompt=adaptive&&!useStandardPrompt?adaptive.prompt:standardPrompt
  const recapRows=finished?buildCoachingRecap(session,activeQuestions,lang):[]
  const iCopy=intelligenceCopy[lang]
  const entryCopy=coachingEntryCopy(lang)
  const entryModel=entry?.choice?.model||catalog?.models?.find(item=>item.modelKey===entry?.choice?.modelKey)
  const lastApprovedPlan=[session,...(course?.history||[])]
    .find(item=>item?.actionPlan?.approvedAt&&typeof item.actionPlan.actionText==='string')?.actionPlan||null
  function turnFor(action,revision,fields={}){
    if((action==='start'?fields.schemeKey:session?.schemeKey)!=='grow_overload_20_v1'||!['start','answer','reflection','skip_followup','complete','finish_without_plan','pause','resume','plan'].includes(action))return null
    const key=JSON.stringify([action,revision,fields])
    if(pendingTurn.current?.key!==key)pendingTurn.current={key,id:crypto.randomUUID()}
    return pendingTurn.current.id
  }
  function visit(indexToOpen,values,items=activeQuestions){
    const next=Math.max(0,Math.min(items.length-1,indexToOpen))
    setIndex(next)
    const saved=values?.[items[next]?.id]
    setDraft(typeof saved==='string'?saved:'')
    setDictating(false)
    setPendingFollowup(null);setReflectionDraft('');setSessionControl(null)
    setConflictingAnswer(undefined)
    setUseStandardPrompt(false)
    setClipboardState('')
    setNotice('')
    setError('')
  }
  function openServerFollowup(current,items){
    if(current?.dialogueProtocol!==1||current.status!=='active'||!current.pendingFollowup)return false
    const next=items.findIndex(item=>item.id===current.pendingFollowup.questionId)
    const item=next<0?null:authoredFollowupFor(items[next],current.answers?.[items[next].id],current.reflections)
    if(!item||item.key!==current.pendingFollowup.key){setError(t.loadError);return true}
    visit(next,current.answers,items)
    setPendingFollowup(item)
    return true
  }
  async function reload(){
    if(!accountId||busyRef.current)return
    setLoading(true);setError('')
    try{
      const [value,loadedCatalog]=await Promise.all([
        appFetch('personal-coaching',undefined,'GET',{accountId}),
        appFetch('personal-coaching-catalog',undefined,'GET',{accountId}),
      ])
      const list=questionsFor(value.course,loadedCatalog)
      const restored=reconcileCoachingDraft({prior:session,current:value.course?.current,questions:list,questionId:question?.id,draft,dirty,unresolvedAnswer:conflictingAnswer,fallbackIndex:firstUnanswered(list,value.course?.current?.answers)})
      const reflectionRecovery=reconcileFollowupDraft(session,value.course?.current,pendingFollowup,reflectionDraft)
      if(reflectionRecovery==='confirm_discard'&&!window.confirm(t.unsaved))return
      if(dirty&&!restored.retained&&value.course?.current?.status!=='safety_hold'&&!window.confirm(t.unsaved))return
      if(dirty&&restored.retained&&value.course?.current?.pendingFollowup&&
        value.course.current.pendingFollowup.questionId!==question?.id&&!window.confirm(t.unsaved))return
      setState(value);setCatalog(loadedCatalog)
      visit(restored.index,value.course?.current?.answers,list)
      openServerFollowup(value.course?.current,list)
      if(reflectionRecovery==='retain'){
        setReflectionDraft(reflectionDraft)
        setNotice(lang==='ru'?'Сессия обновлена; черновик уточнения сохранён на экране.':lang==='es'?'Sesión actualizada; tu borrador sigue en pantalla.':'Session refreshed; your follow-up draft remains on screen.')
      }
      if(restored.retained){
        setDraft(restored.draft)
        setConflictingAnswer(restored.changedAnswer)
        setNotice(lang==='ru'?'Загружена актуальная сессия. Ваш черновик сохранён на экране; проверьте его перед отправкой.':lang==='es'?'Sesión actualizada. Tu borrador sigue en pantalla; revísalo antes de enviarlo.':'Session refreshed. Your draft remains on screen; review it before sending.')
      }
    }catch{setError(t.loadError)}
    finally{setLoading(false)}
  }
  useEffect(()=>{
    let live=true
    setLoading(true)
    Promise.all([
      appFetch('personal-coaching',undefined,'GET',{accountId}),
      appFetch('personal-coaching-catalog',undefined,'GET',{accountId}),
    ]).then(([value,loadedCatalog])=>{
      if(!live)return
      setState(value);setCatalog(loadedCatalog)
      const list=questionsFor(value.course,loadedCatalog)
      const next=firstUnanswered(list,value.course?.current?.answers)
      setIndex(next)
      const answer=value.course?.current?.answers?.[list[next]?.id]
      setDraft(typeof answer==='string'?answer:'')
      setError('')
      openServerFollowup(value.course?.current,list)
    }).catch(()=>{if(live)setError(t.loadError)})
      .finally(()=>{if(live)setLoading(false)})
    return()=>{live=false}
  },[accountId,t.loadError])
  useEffect(()=>{
    setVisualCoachId(null)
    setCoachSpeech({phase:'idle',beat:0})
  },[session?.id])
  useEffect(()=>{
    if(loading||(!entry&&!session)||finished&&!entry)return
    titleRef.current?.focus({preventScroll:true})
  },[index,loading,session?.id,finished,pendingFollowup,entry?.step])
  useEffect(()=>{
    // Main answer AND optional dictated follow-up must survive accidental reloads.
    if(!dirty&&!((pendingFollowup&&reflectionDraft.trim().length>0)))return
    const warn=event=>{event.preventDefault();event.returnValue=''}
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[dirty,pendingFollowup,reflectionDraft])
  async function command(action,fields={}){
    if(busyRef.current||!accountId)return null
    busyRef.current=true;setBusy(true);setError('');setNotice('')
    try{
      const revision=state?.revision||0
      const turnId=turnFor(action,revision,fields)
      const value=await appFetch('personal-coaching',{action,revision,...fields,...(turnId?{turnId}:{})},'POST',{accountId})
      if(turnId)pendingTurn.current=null
      setState(value)
      setNotice(t.saved)
      return value
    }catch(e){
      setError(e?.code==='PERSONAL_COACH_REVISION_CONFLICT'?t.conflict:t.saveError)
      return null
    }finally{busyRef.current=false;setBusy(false)}
  }
  async function refreshPlan(){
    if(busyRef.current||!accountId)return
    busyRef.current=true;setBusy(true);setError('')
    try{
      const value=await appFetch('personal-coaching',undefined,'GET',{accountId})
      const result=reconcileCoachingPlan(session,value.course?.current,conflictingPlan)
      if(result.kind==='safety_hold'){setState(value);return}
      if(result.kind!=='ready'){
        setError(lang==='ru'?'Сессия изменилась. Скопируйте черновик перед выходом.':lang==='es'?'La sesión cambió. Copia tu borrador antes de salir.':'The session changed. Copy your draft before leaving.')
        return
      }
      setState(value);setConflictingPlan(result.conflict)
      setNotice(lang==='ru'?'Сессия обновлена; черновик плана сохранён на экране.':lang==='es'?'Sesión actualizada; tu borrador permanece en pantalla.':'Session refreshed; your plan draft remains on screen.')
    }catch{setError(t.loadError)}finally{busyRef.current=false;setBusy(false)}
  }
  async function prepare(choice,clientQuestion,adultConfirmed){
    // Read only saved, owner-authored Life Plan targets. Failure to read this
    // optional source must not block a new coaching session.
    let lifePlanChanges=[]
    if(accountId){
      try{
        const savedPlan=await appFetch('development-goals',undefined,'GET',{accountId})
        lifePlanChanges=developmentGoalsContextItems(savedPlan,lang)
      }catch{}
    }
    // The picker only prepares a choice. No private record is created until
    // the visitor has seen the session briefing and selected a request topic.
    const previousSessions=[...(course?.history||[]),...(course?.current?.status==='completed'?[course.current]:[])]
    const clientContext=previousSessions.length||lifePlanChanges.length
      ?buildClientCoachingContext(previousSessions,{lifePlanChanges}):null
    setEntry({choice,clientQuestion,adultConfirmed:adultConfirmed===true,
      topicAdultConfirmed:adultConfirmed===true,clientTopic:'',checkin:'',step:'intro',
      clientContext,contextReviewed:!clientContext})
    setError('')
  }
  async function begin(){
    if(!entry?.clientTopic||(entry.clientTopic==='sexuality'&&!entry.topicAdultConfirmed))return
    const {choice,clientQuestion,clientTopic}=entry
    const adultConfirmed=entry.adultConfirmed||entry.topicAdultConfirmed
    if(entry.clientContext&&!entry.contextReviewed)return
    const result=await command('start',{schemeKey:choice.schemeKey,clientQuestion,clientTopic,
      ...(entry.clientContext&&entry.contextReviewed?{clientContext:entry.clientContext}:{}),
      ...((choice.modelKey==='tantric_intimacy_v1'||choice.scheme?.tags?.includes('sexuality')||clientTopic==='sexuality')?{adultConfirmed}:{})})
    if(result){
      const list=questionsFor(result.course,catalog)
      visit(firstUnanswered(list,result.course?.current?.answers),result.course?.current?.answers,list)
      setEntry(null)
      setNewSelection(false)
    }
  }
  function offerSessionControl(answer){
    const control=coachingControlForAnswer(answer,lang)
    if(!control)return false
    setSessionControl(control)
    setPendingFollowup(null);setReflectionDraft('')
    return true
  }
  function offerFollowup(current,answer){
    if(offerSessionControl(answer))return true
    if(current?.dialogueProtocol===1)return openServerFollowup(current,activeQuestions)
    if(index>=activeQuestions.length-1)return false
    const item=authoredFollowupFor(question,answer,current?.reflections)
    if(!item)return false
    if(item.controlStatus){
      setSessionControl(item)
      setPendingFollowup(null);setReflectionDraft('')
      return true
    }
    setSessionControl(null)
    setPendingFollowup(item);setReflectionDraft('')
    return true
  }
  async function saveFollowup(skip=false){
    if(!pendingFollowup||busyRef.current)return
    if(dictating){setError(t.stopMic);return}
    if(!skip&&reflectionDraft.trim().length<3){setError(followupCopy[lang].short);return}
    if(!skip){
      const saved=await command('reflection',{
        questionId:pendingFollowup.questionId,followupKey:pendingFollowup.key,note:reflectionDraft.trim(),
      })
      if(!saved)return
      if(saved.course?.current?.status==='safety_hold')return
      if(saved.course?.current?.dialogueProtocol===1){
        if(!openServerFollowup(saved.course.current,activeQuestions))visit(firstUnanswered(activeQuestions,saved.course.current.answers),saved.course.current.answers)
      }else visit(index+1,saved.course?.current?.answers)
    }else{
      if(session?.dialogueProtocol===1){
        const saved=await command('skip_followup',{questionId:pendingFollowup.questionId,followupKey:pendingFollowup.key})
        if(!saved)return
        if(!openServerFollowup(saved.course?.current,activeQuestions))visit(firstUnanswered(activeQuestions,saved.course?.current?.answers),saved.course?.current?.answers)
      }else visit(index+1,session?.answers)
    }
  }
  async function next(skip=false){
    if(busyRef.current||!session)return
    if(dictating){setError(t.stopMic);return}
    const answer=skip?null:draft.trim()
    if(conflictingAnswer!==undefined&&answer!==conflictingAnswer&&!window.confirm(lang==='ru'?'Заменить ответ, сохранённый в другой вкладке, вашим черновиком?':lang==='es'?'¿Reemplazar la respuesta guardada en otra pestaña con tu borrador?':'Replace the answer saved in another tab with your draft?'))return
    if((question.required&&!answer)||(question.required&&!question.type&&answer.length<3)){
      setError(t.required);return
    }
    if(requiresWrittenPlan && !isCoachingSafetyConcern(answer) &&
      (answer?.startsWith('choice:')||!answer||answer.length<10)){
      setError(planHint);return
    }
    if(!skip&&typeof persisted==='string'&&persisted===answer && Object.prototype.hasOwnProperty.call(session.answers,question.id)){
      if(offerSessionControl(answer))return
      if(index===activeQuestions.length-1)await command('complete')
      else if(!offerFollowup(session,answer))visit(index+1,session.answers)
      return
    }
    const saved=await command('answer',{questionId:question.id,answer,
      ...(isOverload&&Object.prototype.hasOwnProperty.call(session.answers,question.id)?{edit:true}:{})})
    if(!saved)return
    if(saved.course?.current?.status==='safety_hold'||saved.course?.current?.status==='completed')return
    if(!skip&&offerSessionControl(answer))return
    if(saved.course?.current?.dialogueProtocol===1&&openServerFollowup(saved.course.current,activeQuestions))return
    if(index===activeQuestions.length-1){
      // Completion is reported only after the final answer and status both persisted.
      const completed=await commandAfterSave(saved,'complete')
      if(!completed)setError(t.saveError)
    }else if(!skip&&!offerFollowup(saved.course?.current,answer))visit(index+1,saved.course?.current?.answers)
    else if(skip)visit(index+1,saved.course?.current?.answers)
  }
  async function commandAfterSave(saved,action){
    if(busyRef.current)return null
    busyRef.current=true;setBusy(true);setError('')
    try{
      const turnId=turnFor(action,saved.revision)
      const value=await appFetch('personal-coaching',{action,revision:saved.revision,...(turnId?{turnId}:{})},'POST',{accountId})
      if(turnId)pendingTurn.current=null
      setState(value);setNotice(t.saved)
      return value
    }catch(e){setError(e?.code==='PERSONAL_COACH_REVISION_CONFLICT'?t.conflict:t.saveError);return null}
    finally{busyRef.current=false;setBusy(false)}
  }
  function backward(){
    if(pendingFollowup){
      if(dictating){setError(t.stopMic);return}
      if(reflectionDraft.trim()&&!window.confirm(t.unsaved))return
      setPendingFollowup(null);setReflectionDraft('');setError('')
      return
    }
    if(index===0)return
    if(dictating){setError(t.stopMic);return}
    if(dirty&&!window.confirm(t.unsaved))return
    visit(index-1,session?.answers)
  }
  function exit(event){
    if(dictating){event.preventDefault();setError(t.stopMic);return}
    if((dirty||(pendingFollowup&&reflectionDraft.trim()))&&!window.confirm(t.unsaved))event.preventDefault()
  }
  async function copyRecap(){
    if(!finished||!navigator.clipboard?.writeText){setClipboardState('error');return}
    try{
      await navigator.clipboard.writeText(coachingRecapClipboardText(session,activeQuestions,lang))
      setClipboardState('copied')
    }catch{setClipboardState('error')}
  }
  function downloadReport(target){
    if(target?.status!=='completed')return
    const targetQuestions=questionsFor({current:target},catalog)
    const targetScheme=target.schemeKey?catalog?.schemes?.find(item=>item.schemeKey===target.schemeKey):null
    const plan=target.actionPlan
    const planText=plan?.approvedAt?[
      plan.goal,plan.obstacle,plan.actionText,plan.when,
      ...(Array.isArray(plan.nextActions)?plan.nextActions.slice(0,2).map((row,i)=>row?.text?(i+2)+'. '+row.text+(row.when?' — '+row.when:''):''):[]),
      plan.fallback?growCopy[lang].fallback+': '+plan.fallback:'',
      Number.isInteger(plan.confidence)?String(plan.confidence)+'/10':'',
    ].filter(Boolean).join('\n'):'' // Only the client's approved plan, no auto-inferred goals.
    try{
      downloadCoachingSessionPdf({
        locale:lang,
        title:targetScheme?coachingSessionTitle(targetScheme.schemeKey,lang,translated(targetScheme.name,lang)):t.title,
        slug:target.schemeKey||'personal-coaching',
        sessionDate:target.completedAt||target.startedAt,
        topic:target.clientTopic?coachingRequestTopicLabel(target.clientTopic,lang):'',
        clientQuestion:target.clientQuestion||'',
        entries:targetQuestions.map(item=>({
          question:translated(item.prompt||item.question,lang),
          answer:prettyAnswer(target.answers?.[item.id],item,lang,t.noAnswer),
          reflection:target.reflections?.[item.id]?.text||'',
        })),
        actionPlan:planText,
      })
      setError('')
    }catch{setError(t.pdfError)}
  }
  async function erase(){
    if(!window.confirm(t.deleteConfirm))return
    const result=await command('delete',{confirmed:true})
    if(result){setNotice('');setNewSelection(false);visit(0,{},PERSONAL_COACH_QUESTIONS)}
  }
  return <main ref={viewportRef} className={styles.root} data-personal-coaching data-coaching-version="1" lang={lang}>
    <div className={styles.scenery} aria-hidden="true"/>
    <div className={styles.layout}>
      <header className={styles.header}>
        <Link href={root+'/course?view=courses'} className={styles.close} onClick={exit} aria-label={t.close} title={t.close}><X size={21}/></Link>
        <span className={styles.brand}>HOLISTIC HOUSE</span>
        {!loading&&!entry&&!newSelection&&session?.status==='active'&&accountId&&
          <CoachingBrainPanel key={session.id} locale={lang} accountId={accountId}
            sessionId={session.id} onConfirmDecision={async actionText=>
              Boolean(await command('brain-decision',{sessionId:session.id,actionText}))}/>}
        <span className={styles.private}><LockKeyhole size={14}/>{lang==='ru'?'Личное':'Private'}</span>
      </header>
      <section className={styles.sheet}>
        {loading ? <div className={styles.center} role="status">{t.loading}</div>
        : !catalog ? <div className={styles.center} role="alert">
          <p>{t.loadError}</p>
          <button type="button" className={styles.primary} onClick={reload}>{t.retry}</button>
        </div>
        : safetyHold ? <div className={styles.summary} data-coaching-safety-hold role="alert">
          <h1>{lang==='ru'?'Сейчас важна ваша безопасность':lang==='es'?'Tu seguridad es lo primero':'Your safety comes first'}</h1>
          <p>{lang==='ru'?'Эта сессия приостановлена. Если вам угрожает непосредственная опасность, обратитесь в местную экстренную службу. Свяжитесь с человеком, которому доверяете, или с квалифицированной кризисной службой в вашем регионе.':lang==='es'?'Esta sesión está en pausa. Si estás en peligro inmediato, llama a los servicios de emergencia locales. Contacta con una persona de confianza o un servicio de crisis de tu zona.':'This session is paused. If you are in immediate danger, contact your local emergency services. Reach out to someone you trust or a qualified crisis service in your area.'}</p>
          <Link href={root+'/course?view=courses'} className={styles.secondary}>{t.close}</Link>
          <button type="button" className={styles.delete} disabled={busy} onClick={erase}><Trash2 size={15}/>{t.delete}</button>
          {error&&<p className={styles.error} role="alert">{error}</p>}
        </div>
        : session?.status==='paused' ? <div className={styles.summary} data-coaching-paused>
          <h1>{lang==='ru'?'Сессия на паузе':lang==='es'?'Sesión en pausa':'Session paused'}</h1>
          <p>{lang==='ru'?'Сохранённые ответы останутся доступны, когда вы вернётесь.':lang==='es'?'Tus respuestas guardadas estarán disponibles cuando vuelvas.':'Your saved answers will be here when you return.'}</p>
          <button type="button" className={styles.primary} disabled={busy} onClick={async()=>{const saved=await command('resume');if(saved)openServerFollowup(saved.course?.current,activeQuestions)}}>
            {lang==='ru'?'Продолжить сессию':lang==='es'?'Continuar sesión':'Resume session'}
          </button>
          <Link href={root+'/course?view=courses'} className={styles.secondary}>{t.close}</Link>
          {error&&<p className={styles.error} role="alert">{error} <button type="button" disabled={busy} onClick={reload}>{lang==='ru'?'Обновить сессию':lang==='es'?'Actualizar sesión':'Refresh session'}</button></p>}
        </div>
        : entry ? <div className={styles.session} data-private-coaching-onboarding>
          <div className={styles.questionArea}>
            {entry.step==='intro'?<CoachingSessionIntroduction locale={lang} headingRef={titleRef}
              name={coachingSessionTitle(entry.choice.schemeKey,lang,translated(entry.choice.scheme?.name,lang)||translated(entryModel?.name,lang))}
              modelName={translated(entryModel?.name,lang)} minutes={entry.choice.scheme?.minutes||20}
              questionCount={entry.choice.scheme?.questions?.length} style={entry.choice.scheme?.style}
              approach={translated(entryModel?.focus,lang)} outcome={translated(entry.choice.scheme?.result,lang)}
              imageSrc={cardArtworkUrl(coachingArt[entry.choice.modelKey]||coachingArt.grow_v1)}
               checkin={entry.checkin} onCheckinChange={checkin=>setEntry(previous=>({...previous,checkin}))}/>
            :<><CoachingSessionTopic locale={lang} checkin={entry.checkin} value={entry.clientTopic} headingRef={titleRef}
              onChange={clientTopic=>setEntry(previous=>({...previous,clientTopic,topicAdultConfirmed:previous.adultConfirmed}))}
              ageConfirmed={entry.topicAdultConfirmed}
              onAgeConfirm={value=>setEntry(previous=>({...previous,topicAdultConfirmed:value}))}/>
              {entry.clientContext&&<CoachingContextReview locale={lang} context={entry.clientContext}
                onConfirm={clientContext=>setEntry(previous=>({...previous,clientContext,contextReviewed:true}))}
                onSkip={()=>setEntry(previous=>({...previous,clientContext:null,contextReviewed:true}))}/>}
            </>}
            {error&&<p className={styles.error} role="alert">{error}</p>}
          </div>
          <footer className={styles.footer}><div className={styles.footerActions}>
            <button type="button" className={styles.back} disabled={busy}
              onClick={()=>{if(entry.step==='intro')setEntry(null);else setEntry(previous=>({...previous,step:'intro'}))}}>
              <ChevronLeft size={18}/>{t.back}</button>
            <button type="button" className={styles.primary} disabled={busy||(entry.step==='topic'&&(!entry.clientTopic||(entry.clientTopic==='sexuality'&&!entry.topicAdultConfirmed)||(entry.clientContext&&!entry.contextReviewed)))}
              onClick={()=>entry.step==='intro'?setEntry(previous=>({...previous,step:'topic'})):begin()}>
              {entry.step==='intro'?entryCopyContinue(lang):entryCopyBegin(lang)}<ArrowRight size={18}/></button>
          </div></footer>
        </div>
        : (!course||newSelection) ? <PersonalCoachingPicker locale={lang} catalog={catalog}
          previousPlan={lastApprovedPlan} onChoose={prepare} busy={busy} error={error} isNew={Boolean(course)} />
        : finished ? <div className={styles.summary} data-coaching-summary>
          <span className={styles.completed}><Check size={16}/>{t.completed}</span>
          <h1>{t.summary}</h1>
          <p>{t.finished}</p>
          <p className={styles.subtle}>{t.date}: {coachingReportDate(session.completedAt||session.startedAt,lang)}</p>
          {scheme&&<p className={styles.schemeLabel}>{langCopy.chosen}: {coachingSessionTitle(scheme.schemeKey,lang,translated(scheme.name,lang))}</p>}
          {session.clientTopic&&<p className={styles.contextQuestion}><strong>{entryCopy.topicTitle}:</strong> {coachingRequestTopicLabel(session.clientTopic,lang)}</p>}
          {session.clientQuestion&&<p className={styles.contextQuestion}><strong>{langCopy.yourQuestion}:</strong> {session.clientQuestion}</p>}
          {clarityOutcome&&<section className={styles.smartRecap} data-coaching-grow-outcome>
            <h2>{growCopy[lang].clarity}</h2>
            <div className={styles.smartRecapGrid}>
              <div className={styles.smartRecapCard}><span>{growCopy[lang].before}</span>
                <strong>{clarityOutcome.before===null?growCopy[lang].missing:clarityOutcome.before+'/10'}</strong></div>
              <div className={styles.smartRecapCard}><span>{growCopy[lang].after}</span>
                <strong>{clarityOutcome.after===null?growCopy[lang].missing:clarityOutcome.after+'/10'}</strong></div>
            </div>
            <p>{clarityOutcome.delta===null?growCopy[lang].noCompare:
              growCopy[lang].change+': '+(clarityOutcome.delta>0?'+':'')+clarityOutcome.delta}</p>
            <p>{growCopy[lang].reflection}</p>
          </section>}
          <div className={styles.answers}>
            {activeQuestions.map(item=><div className={styles.answer} key={item.id}>
              <strong>{translated(item.prompt||item.question,lang)}</strong>
              <p>{prettyAnswer(session.answers[item.id],item,lang,t.noAnswer)}</p>
              {session.reflections?.[item.id]?.text&&
                <p><em>{followupCopy[lang].answer}:</em> {session.reflections[item.id].text}</p>}
            </div>)}
          </div>
          <CoachingActionPlan key={session.id} locale={lang} privateSave lowConfidenceGuidance={isOverload} growPilot={isOverload}
            initial={session.actionPlan||{...draftCoachingActionPlan(activeQuestions,session.answers,session.clientQuestion||'',lang),
              ...(session.brainDecision?.confirmedAt?{actionText:session.brainDecision.actionText}:{})}}
            disabled={busy} onSave={async fields=>{
              if(conflictingPlan!==undefined&&!coachingPlansEqual(fields,conflictingPlan)&&!window.confirm(lang==='ru'?'Заменить план, сохранённый в другой вкладке, вашим черновиком?':lang==='es'?'¿Reemplazar el plan guardado en otra pestaña con tu borrador?':'Replace the plan saved in another tab with your draft?'))return false
              const saved=await command('plan',fields)
              if(saved)setConflictingPlan(undefined)
              return Boolean(saved)
            }}/>
          {isOverload&&session.actionPlan?.approvedAt&&<p className={styles.subtle} data-coaching-grow-actions>
            {growCopy[lang].confirmed}: {1+(Array.isArray(session.actionPlan.nextActions)?session.actionPlan.nextActions.length:0)}/3
          </p>}
          {notice&&<p role="status">{notice}</p>}
          {error&&<p role="alert">{error} <button type="button" disabled={busy} onClick={refreshPlan}>{lang==='ru'?'Обновить сессию':lang==='es'?'Actualizar sesión':'Refresh session'}</button></p>}
          {conflictingPlan!==undefined&&<div className={styles.answer} data-coaching-conflicting-plan>
            <strong>{lang==='ru'?'План из другой вкладки:':lang==='es'?'Plan de otra pestaña:':'Plan from another tab:'}</strong>
            {conflictingPlan?<>{[
              ['goal',lang==='ru'?'Цель':lang==='es'?'Objetivo':'Goal'],
              ['obstacle',lang==='ru'?'Препятствие':lang==='es'?'Obstáculo':'Obstacle'],
              ['actionText',lang==='ru'?'Действие':lang==='es'?'Acción':'Action'],
              ['when',lang==='ru'?'Когда':lang==='es'?'Cuándo':'When'],
              ['confidence',lang==='ru'?'Уверенность':lang==='es'?'Confianza':'Confidence'],
            ].map(([key,label])=><p key={key}><strong>{label}: </strong>{conflictingPlan[key]??'—'}</p>)}
              {conflictingPlan.feasibilityReview&&<p>{conflictingPlan.feasibilityReview==='keep'
                ?(lang==='ru'?'План оставлен без изменения':lang==='es'?'Plan mantenido':'Plan kept')
                :(lang==='ru'?'Рассмотрен меньший шаг':lang==='es'?'Paso más pequeño considerado':'Smaller step considered')}</p>}
            </>:<p>{lang==='ru'?'Нет сохранённого плана':lang==='es'?'No hay plan guardado':'No saved plan'}</p>}
          </div>}
          {recapRows.length>0&&<section className={styles.smartRecap} data-coaching-evidence-recap aria-label={iCopy.recap}>
            <h2>{iCopy.recap}</h2>
            <p>{iCopy.recapNote}</p>
            <div className={styles.smartRecapGrid}>
              {recapRows.map(row=><div className={styles.smartRecapCard} key={row.key}
                data-coaching-recap-key={row.key}>
                <span>{row.label}</span><strong>{row.value}</strong>
              </div>)}
            </div>
            <button type="button" className={styles.recapCopy} onClick={copyRecap}>
              <Copy size={16}/>{iCopy.copy}
            </button>
            {clipboardState&&<small role="status" className={styles.subtle}>
              {clipboardState==='copied'?iCopy.copied:iCopy.copyError}
            </small>}
            {clipboardState==='error'&&<label className={styles.recapFallback}>
              {iCopy.manual}
              <textarea readOnly rows={7} value={coachingRecapClipboardText(session,activeQuestions,lang)}
                onFocus={event=>event.target.select()} />
            </label>}
          </section>}
          <CoachingReportPreview accountId={accountId} sessionId={session.id} revision={state.revision} locale={lang}/>
          <button type="button" className={styles.primary} data-coaching-download-pdf disabled={busy} onClick={()=>downloadReport(session)}><Download size={18}/>{t.pdf}</button>
          <p className={styles.privacyNote}>{t.share}</p>
          {course.history?.length>0&&<details className={styles.history}>
            <summary>{t.history} ({course.history.length})</summary>
            {course.history.map(old=><article key={old.id}>
              <strong>{t.historyItem} · {coachingReportDate(old.completedAt||old.startedAt,lang)}</strong>
              {questionsFor({current:old},catalog).map(item=><p key={item.id}>
                <b>{translated(item.prompt||item.question,lang)}</b> {prettyAnswer(old.answers[item.id],item,lang,t.noAnswer)}
              </p>)}
              {old.status==='completed'&&<button type="button" className={styles.back} onClick={()=>downloadReport(old)}><Download size={16}/>{t.pdf}</button>}
            </article>)}
          </details>}
          <p className={styles.subtle}>{t.restart}</p>
          {error&&<p className={styles.error} role="alert">{error}</p>}
          <button type="button" className={styles.primary} disabled={busy}
            onClick={()=>{setEntry(null);setNewSelection(true);setError('')}}>{t.new}<ArrowRight size={18}/></button>
          <Link href={root+'/course?view=courses'} className={styles.secondary}>{t.home}</Link>
          <button type="button" className={styles.delete} disabled={busy} onClick={erase}><Trash2 size={15}/>{t.delete}</button>
          <small className={styles.disclaimer}>{t.completeNote}</small>
        </div>
        : sessionControl ? <div className={styles.session} data-coaching-control={sessionControl.controlStatus} data-coaching-one-viewport>
          <div className={styles.questionArea}>
            <span className={styles.eyebrow}>HOLISTIC HOUSE · COACHING</span>
            <h1 ref={titleRef} tabIndex={-1}>
              {sessionControl.controlStatus==='safety_hold'?controlCopy[lang].safetyTitle:
               sessionControl.controlStatus==='paused'?controlCopy[lang].pausedTitle:controlCopy[lang].stoppedTitle}
            </h1>
            <p className={styles.messageTip}>
              {sessionControl.controlStatus==='safety_hold'?controlCopy[lang].safetyBody:
               sessionControl.controlStatus==='paused'?controlCopy[lang].pausedBody:controlCopy[lang].stoppedBody}
            </p>
          </div>
          <footer className={styles.footer} data-coaching-messenger-footer>
            {sessionControl.controlStatus==='paused'&&<button type="button" className={styles.primary}
              onClick={()=>visit(index+1,session?.answers)}>{controlCopy[lang].resume}<ArrowRight size={18}/></button>}
            <Link href={root+'/course?view=courses'} className={styles.secondary} onClick={()=>setSessionControl(null)}>
              {controlCopy[lang].home}
            </Link>
          </footer>
        </div>
        : pendingFollowup ? <div className={styles.session} data-coaching-authored-followup data-coaching-one-viewport data-coaching-avatar-ready="true">
          <div className={styles.progressHeader}>
            <span className={styles.eyebrow}>{followupCopy[lang].title}</span>
            <strong>{t.question} {index+1} {t.of} {activeQuestions.length}</strong>
          </div>
          <div className={styles.progressTrack}><span style={{width:((index+1)/activeQuestions.length*100)+'%'}}/></div>
          <div className={styles.questionArea}>
            <span className={styles.stage}>{translated(question.stageTitle,lang)||pendingFollowup.stage.toUpperCase()}</span>
            <CoachingAvatar locale={lang} avatarId={avatarId} onAvatarChange={setVisualCoachId}
              phase={avatarPhase} beat={coachSpeech.beat}/>
            <CoachingChatThread turn={followupTurn} locale={lang} compact>
              <h1 ref={titleRef} tabIndex={-1}>{translated(pendingFollowup.prompt,lang)}</h1>
            </CoachingChatThread>
            <p className={styles.messageTip}>{followupCopy[lang].why}</p>
          </div>
          <footer className={styles.footer} data-coaching-messenger-footer>
            {notice&&<p className={styles.footerMessage} role="status">{notice}</p>}
            {error&&<p className={styles.footerMessage} role="alert">{error} <button type="button" disabled={busy||dictating} onClick={reload}>{lang==='ru'?'Обновить сессию':lang==='es'?'Actualizar sesión':'Refresh session'}</button></p>}
            <div className={styles.chatComposer} data-coaching-composer>
              <label className={styles.answerLabel} htmlFor="hh-coaching-followup">{followupCopy[lang].answer}</label>
              <textarea id="hh-coaching-followup" className={styles.textarea}
                aria-describedby="hh-coaching-followup-report-note" value={reflectionDraft}
                maxLength={500} rows={2} disabled={busy}
                placeholder={followupCopy[lang].placeholder}
                onChange={e=>{setReflectionDraft(e.target.value);setError('')}}/>
              <div className={styles.composerTools}>
                <CoachingQuestionVoice key={'followup-'+question.id+'-'+lang} compact
                  text={[followupTurn?.speech,translated(pendingFollowup.prompt,lang)].filter(Boolean).join(' ')}
                  locale={lang} mode="answer" disabled={busy}
                  speechConsent={speechConsent} onConsent={()=>setSpeechConsent(true)}
                  onListeningChange={setDictating} onSpeechChange={updateAvatarSpeech}
                  onTranscript={words=>{setReflectionDraft(v=>appendSpokenAnswer(v,words));setError('')}}/>
                <small className={styles.draftCount}>{reflectionDraft.length}/500</small>
              </div>
              <details className={styles.reportDetails}><summary>{lang==='ru'?'Сохранение и PDF':lang==='es'?'Guardado y PDF':'Saving & PDF'}</summary>
                <div className={styles.reportPop}><small id="hh-coaching-followup-report-note" data-coaching-save-report-notice>{t.reportNotice}</small></div>
              </details>
            </div>
            <div className={styles.footerActions}>
              <button className={styles.back} type="button" disabled={busy} onClick={backward}>
                <ChevronLeft size={18}/>{t.back}
              </button>
              <button className={styles.primary} type="button" disabled={busy||dictating}
                onClick={()=>saveFollowup(false)}>{busy?t.saving:followupCopy[lang].save}<ArrowRight size={18}/></button>
            </div>
            <button className={styles.skip} type="button" disabled={busy||dictating}
              onClick={()=>saveFollowup(true)}>{followupCopy[lang].skip}</button>
            {session?.dialogueProtocol===1&&<button className={styles.skip} type="button" disabled={busy||dictating}
              onClick={()=>{if(!reflectionDraft.trim()||window.confirm(t.unsaved))command('pause')}}>
              {lang==='ru'?'Поставить на паузу':lang==='es'?'Pausar sesión':'Pause session'}
            </button>}
            {session?.dialogueProtocol===1&&<button className={styles.skip} type="button" disabled={busy||dictating}
              onClick={()=>{if(!reflectionDraft.trim()||window.confirm(t.unsaved))command('finish_without_plan')}}>
              {lang==='ru'?'Завершить без плана':lang==='es'?'Terminar sin un plan':'Finish without a plan'}
            </button>}
          </footer>
        </div>
        : !question ? <div className={styles.center} role="alert">
            {langCopy.loadingCatalog} <button type="button" onClick={reload}>{t.retry}</button>
          </div>
        : <div className={styles.session} data-coaching-one-question data-coaching-one-viewport data-coaching-avatar-ready="true" data-coaching-question={question.id}>
          <div className={styles.progressHeader}>
            <span className={styles.eyebrow}>{t.title}</span>
            <strong>{t.question} {index+1} {t.of} {activeQuestions.length}</strong>
            {process.env.NEXT_PUBLIC_HH_COACHING_LIVE_VOICE_UI==='true'&&
              <CoachingLiveVoice key={session?.id} locale={lang} sessionId={session?.id} accountId={accountId}
                disabled={busy||dictating}/>}
          </div>
          <div className={styles.progressTrack} role="progressbar" aria-label={t.question} aria-valuemin={0} aria-valuemax={activeQuestions.length} aria-valuenow={index+1}>
            <span style={{width:((index+1)/activeQuestions.length*100)+'%'}}/>
          </div>
          <div className={styles.questionArea}>
            <span className={styles.stage}>{translated(question.stageTitle,lang)||(question.stage||'').toUpperCase()}</span>
            <CoachingAvatar locale={lang} avatarId={avatarId} onAvatarChange={setVisualCoachId}
              phase={avatarPhase} beat={coachSpeech.beat}/>
            {growPhase&&<span className={styles.schemeLabel} data-coaching-grow-phase>
              {growPhase.phase} · {growCopy[lang].phases[growPhase.phase]} · {growPhase.window} min / {growCopy[lang].target}
            </span>}
            {session.clientQuestion&&<p className={styles.contextQuestion}>
              <strong>{langCopy.yourQuestion}:</strong> {session.clientQuestion}</p>}
            {scheme&&<span className={styles.schemeLabel}>{langCopy.chosen}: {coachingSessionTitle(scheme.schemeKey,lang,translated(scheme.name,lang))}</span>}
            <div data-coaching-gentle-guide>
              <CoachingChatThread turn={conversationTurn} locale={lang} compact>
                <h1 ref={titleRef} tabIndex={-1}>{visiblePrompt}</h1>
              </CoachingChatThread>
            </div>
            {adaptive&&<details className={styles.adaptivePanel} data-coaching-adaptive-prompt>
              <summary><Sparkles size={14} aria-hidden="true"/>{iCopy.adaptive}</summary>
              <div className={styles.adaptiveMore}>
                <p>{adaptive.why}</p>
                <button type="button" disabled={busy||dictating}
                  onClick={()=>setUseStandardPrompt(value=>!value)}>
                  {useStandardPrompt?iCopy.tailored:iCopy.standard}
                </button>
              </div>
            </details>}
            {quickChoices&&question.type&&!requiresWrittenPlan&&<>
              <span className={styles.answerLabel}>{langCopy.choice}</span>
              <div className={question.type==='scale_0_10'?styles.optionScale:styles.optionList}>
                {(question.type==='scale_0_10'
                  ? Array.from({length:11},(_,value)=>({id:String(value),label:{en:String(value),ru:String(value),es:String(value)}}))
                  : question.choices||[]).map(option=><button key={option.id} type="button" disabled={busy||dictating}
                  className={styles.optionChip} aria-pressed={draft==='choice:'+option.id}
                  onClick={()=>{setDraft('choice:'+option.id);setError('');setNotice('')}}>
                  {translated(option.label,lang)}</button>)}
              </div>
            </>}
            {requiresWrittenPlan&&<p className={styles.requiredPlan}>{planHint}</p>}
            {quickChoices&&!question.type&&<div className={styles.suggestions} role="group" aria-label={langCopy.choice}>
              {(question.examples?.[lang]||[]).map(option=><button type="button" key={option} disabled={busy||dictating}
                className={draft.trim()===option?styles.chosen:undefined} aria-pressed={draft.trim()===option}
                onClick={()=>{setDraft(option);setError('');setNotice('')}}>{option}</button>)}
            </div>}
            {!quickChoices&&draft.startsWith('choice:')&&<p className={styles.legacyChoice}>
              <strong>{t.earlierChoice}:</strong> {prettyAnswer(draft,question,lang,t.noAnswer)}. {t.replaceChoice}
            </p>}
            {!quickChoices&&question.type==='scale_0_10'&&!isOverload&&<p className={styles.scaleHelp}>{t.scaleHelp}</p>}
            {dictating&&<div className={styles.micNotice} role="status">{t.stopMic}</div>}


            
            <p className={styles.subtle}>{t.change}</p>
                      </div>
          <footer className={styles.footer} data-coaching-messenger-footer>
            {notice&&<p className={styles.footerMessage} role="status"><Check size={15}/>{notice}</p>}
            {conflictingAnswer!==undefined&&<div className={styles.footerMessage} data-coaching-conflicting-answer>
              <strong>{lang==='ru'?'Ответ из другой вкладки:':lang==='es'?'Respuesta de otra pestaña:':'Answer from another tab:'}</strong>{' '}
              {conflictingAnswer===null?(lang==='ru'?'Пропущено':lang==='es'?'Omitida':'Skipped'):prettyAnswer(conflictingAnswer,question,lang,t.noAnswer)}
            </div>}
            {error&&<p className={styles.footerMessage} role="alert">{error} <button type="button" disabled={busy||dictating} onClick={reload}>{lang==='ru'?'Обновить сессию':lang==='es'?'Actualizar sesión':'Refresh session'}</button></p>}
            <div className={styles.chatComposer} data-coaching-composer>
              <label className={styles.answerLabel} htmlFor="hh-personal-coach-answer">
                {isOverload&&question.type==='scale_0_10'?growCopy[lang].clarity:
                  quickChoices&&question.type?langCopy.orWrite:t.hint}</label>
              {isOverload&&question.type==='scale_0_10'
                ? <select id="hh-personal-coach-answer" className={styles.textarea}
                    aria-describedby="hh-personal-coach-answer-report-note" disabled={busy}
                    value={/^(?:10|[0-9])$/.test(draft)?draft:''}
                    onChange={event=>{setDraft(event.target.value);setError('');setNotice('')}}>
                    <option value="">{growCopy[lang].missing}</option>
                    {Array.from({length:11},(_,n)=><option key={n} value={n}>{n}/10</option>)}
                  </select>
                : <textarea id="hh-personal-coach-answer" className={styles.textarea}
                    aria-describedby="hh-personal-coach-answer-report-note"
                    data-coaching-open-reflection={!quickChoices?'true':undefined}
                    value={draft.startsWith('choice:')?'':draft}
                    maxLength={800} rows={2} placeholder={t.placeholder} disabled={busy}
                    onChange={event=>{setDraft(event.target.value);setError('');setNotice('')}}/>}
              <div className={styles.composerTools}>
                <CoachingQuestionVoice key={question.id+'-'+lang+'-'+(useStandardPrompt?'standard':'tailored')} compact
                  text={[conversationTurn?.speech,visiblePrompt].filter(Boolean).join(' ')} locale={lang}
                  mode="answer" disabled={busy} speechConsent={speechConsent}
                  onConsent={()=>setSpeechConsent(true)} onListeningChange={setDictating} onSpeechChange={updateAvatarSpeech}
                  onTranscript={words=>{
                    setDraft(previous=>appendSpokenAnswer(previous.startsWith('choice:')?'':previous,words))
                    setError('');setNotice('')
                  }}/>
                <small className={styles.draftCount}>{draft.startsWith('choice:')?0:draft.length}/800</small>
              </div>
              <details className={styles.reportDetails}><summary>{lang==='ru'?'Сохранение и PDF':lang==='es'?'Guardado y PDF':'Saving & PDF'}</summary>
                <div className={styles.reportPop}><small id="hh-personal-coach-answer-report-note" data-coaching-save-report-notice>{t.reportNotice}</small></div>
              </details>
            </div>
            <div className={styles.footerActions}>
              <button type="button" className={styles.back} onClick={backward} disabled={busy||index===0}><ChevronLeft size={18}/>{t.back}</button>
              <button type="button" className={styles.primary} disabled={busy} onClick={()=>next(false)}>
                {busy?t.saving:index===activeQuestions.length-1?t.finish:(lang==='ru'?'Отправить и далее':lang==='es'?'Enviar y seguir':'Send & continue')}<ArrowRight size={18}/>
              </button>
            </div>
            {!question.required&&<button type="button" className={styles.skip} disabled={busy} onClick={()=>next(true)}>{t.skip}</button>}
            {isOverload&&<button type="button" className={styles.skip} disabled={busy||dictating}
              onClick={()=>{if((!dirty&&!(pendingFollowup&&reflectionDraft.trim()))||window.confirm(t.unsaved))command('pause')}}>
              {lang==='ru'?'Поставить на паузу':lang==='es'?'Pausar sesión':'Pause session'}
            </button>}
            {session?.schemeKey==='grow_overload_20_v1'&&<button type="button" className={styles.skip} disabled={busy||dictating}
              onClick={()=>{if(!dirty||window.confirm(t.unsaved))command('finish_without_plan')}}>
              {lang==='ru'?'Завершить без плана':lang==='es'?'Terminar sin un plan':'Finish without a plan'}
            </button>}
          </footer>
        </div>}
      </section>
      {!loading&&!entry&&(!course||newSelection||finished)&&<CoachingReportPreview accountId={accountId} archiveOnly locale={lang}/>}
    </div>
  </main>
}
