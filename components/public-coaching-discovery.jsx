'use client'


import { useEffect, useId, useMemo, useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, Check, ChevronDown, ClipboardCopy, Compass, Download, LockKeyhole, Sparkles, UserRound } from 'lucide-react'
import { recommendCoachingForQuestion } from '@/lib/personal-coaching/model-matcher'
import { authoredFollowupFor, draftCoachingActionPlan } from '@/lib/personal-coaching/offline-intelligence'
import { coachingQuickChoicesAllowed, coachingConversationTurn } from '@/lib/personal-coaching/gentle-dialogue'
import CoachingActionPlan from '@/components/coaching-action-plan'
import CoachingChatThread from '@/components/coaching-chat-thread'
import CoachingQuestionVoice from '@/components/app/coaching-question-voice'
import { appendSpokenAnswer } from '@/lib/personal-coaching/speech-text'
import { CoachingSessionIntroduction, CoachingSessionTopic } from '@/components/coaching-session-onboarding'
import { coachingRequestTopicLabel, isCoachingRequestTopic } from '@/lib/coaching/session-onboarding'
import { cardArtworkUrl } from '@/lib/public-card-artwork'
import { coachingArt, coachingSchemeArt, humanCoachingArt, traditionCoachingArt, coachingWorksheetArt } from '@/lib/coaching/public-session-art'
import { coachingSessionTitle, coachingSessionSummary } from '@/lib/coaching/session-presentation'
import { coachingReportDate, downloadCoachingSessionPdf } from '@/lib/personal-coaching/session-pdf'
import { COACHING_TOPIC_GROUPS, COACHING_OUTCOMES, COACHING_SESSION_MODES, coachingSchemeMatchesSessionMode, coachingTopicGroup, coachingSchemeInGroup, coachingSignalInGroup, coachingTopicSchemeCount, coachingSchemeRequiresAdultConsent, coachingOutcomeFit } from '@/lib/coaching/coaching-topic-groups'
import { stageIdeasCoachingQuestion, takeIdeasCoachingQuestion } from '@/lib/ideas-coaching-handoff'
import styles from './public-coaching-discovery.module.css'


const copy={
  en:{
    adultTitle:"Adults (18+) · Your conscious choice",
    adultNotice:"A private-in-your-browser reflection about desire, sexuality, boundaries and consent. No explicit descriptions or physical exercises. Every question may be skipped.",
    adultSafety:"For violence, fear, pressure, abuse or persistent pain, seek qualified human support instead.",
    adultConfirm:"I confirm that I am 18+ and choose to begin",
    skipSensitive:"Skip this question",
    continueSession:'Continue coaching session',beginQuestions:'Continue to the questions',yourTopic:'Your topic',
    outcomeTitle:'Optional · Desired result',outcomeNote:'Choose one goal; we show the closest methods first, without hiding other options.',outcomeFitLabel:'Fits your goal',outcomeRankingNote:'Showing suitable approaches first. This is a practical suggestion, not a psychological assessment.',
    sessionModeTitle:'2 · Choose a session format',imageryTitle:'Guided imagery and reflection',imageryNote:'An optional text-guided visualization followed by original Egyptian or Greek symbolic coaching. No recorded audio or video meditation is included.',imageryPracticeTitle:'1-minute visualization · optional',imageryPractice:'Breathe normally. Imagine a place or image that represents your question. Notice one detail and what it might mean to you. You may skip this and choose a programme below.',showAllModes:'See all sessions',morePreferences:'More options · personal coaching & filters',preferenceNotice:'Optional session filters; these do not compare a coach’s qualifications or experience.',
    coachFitTitle:'Is this the right coach for me?',coachFitIntro:'Before sending a request, check the points that really matter:',coachFitChecks:['Relevant experience with your particular goal and a clear explanation of training.','An approach and communication style where you feel heard, safe and comfortable.','Spoken language, online format, price, length and how to confirm a session.'],coachOnly:'Andrey is the one personal coach listed here. No credential, review score or availability has been independently verified on this page.',
    groupHeading:"1 · Choose your topic",groupNote:"Start with what matters to you. You can refine the details later.",groupRefine:"Specific question",groupCount:"Sessions available",groupDesc:"Different methods, one question at a time.",healthNote:"Wellbeing coaching is about everyday habits, not diagnosis or treatment.",groupAll:"All topics",
    eyebrow:'HOLISTIC HOUSE · COACHING LOUNGE',title:'Coaching Lounge',
    lead:'Describe what you need or filter by topic, time and format. Explore free guided methods, ancient planning courses and personal coaching together.',leadCompact:'Choose a topic and explore a free coaching session or work personally with Andrey.',
    question:'What would you like to explore?',placeholder:'A goal, decision, relationship or challenge (optional)',
    privateQuestion:'Your question is matched only in this browser. It is not sent to AI, analytics or a coach.',
    format:'How would you like support?',allFormats:'Compare both',self:'Try it free',human:'With Andrey',filters:'Find a session',
    topic:'Topic',allTopics:'All topics',duration:'Time I have',anyTime:'Any length',
    style:'Session depth',allStyles:'Any depth',quick:'Practical',reflective:'Reflective',anyShort:'Any',upTo:'Up to',
    models:'Choose a session',all:'All coaching sessions',recommended:'Suggested for your question',
    noExact:'No specific match found. You can choose any model below.',
    empty:'No models match these filters. Try a different topic or duration.',
    unavailable:'Coaching models are temporarily unavailable. You can still request a personal session.',
    free:'Free',minutes:'min',start:'Start free',result:'What you will work toward',
    recommendedLabel:'Suggested',different:'Other options',about:'About this approach',
    method:'Method',details:'Details',lessDetails:'Less details',fullDetails:'More about this session',expect:'Expected outcome',limits:'Good to know',examples:'Example questions',freeMeta:'Self-guided',
    humanTitle:'Personal coaching with Andrey',humanText:'Live, individual coaching or therapeutic conversation, online. Choose the duration and send a request.',
    half:'30-minute session',hour:'60-minute session',request:'Request session',
    notBooking:'A request is not a confirmed booking or payment. The coach must accept and arrange the session.',
    safe:'Self-coaching is educational reflection, not psychotherapy, medical care or an AI conversation.',
    alert:'If you face an immediate safety concern, seek qualified human or emergency support instead of self-coaching.',
    back:'All sessions',stage:'QUESTION',of:'OF',yourQuestion:'Your question',choices:'Choose an answer',
    ownAnswer:'Or write your answer (optional)',openAnswer:'Your answer, in your own words',answerPlaceholder:'Take your time. A few sentences are enough…',
    next:'Next question',finish:'Finish session',previous:'Previous',required:'Choose or write an answer.',
    plan:'For WOOP, write your own specific if–then plan (at least 10 characters).',
    completed:'Session complete',summary:'Your reflection',nextStep:'Your last step',copy:'Copy my summary',
    copied:'Copied',copyFallback:'Select and copy your notes below.',
    restart:'Choose another model',memory:'This free session stays in this tab only. Nothing is saved to an account or sent to a coach.',
    reportNotice:'Your answers stay in this tab only, not in an account. At the end download a PDF with your thoughts and answers before leaving.',
    pdf:'Download PDF report',pdfError:'The PDF could not be created. Your answers are still visible in this tab.',date:'Session date',
    discard:'Leave this session? Your unsaved answers will be lost.',noAnswer:'Skipped',
    otherWays:'More ways to work with your question',
    otherWaysNote:'Author-created programmes and a longer questionnaire. These are separate experiences; guest answers do not transfer automatically.',
    egyptianMethod:'Egyptian planning',greekMethod:'Greek planning',egyptian:'Discover your values and resources',egyptianNote:'Explore desire, values and personal resources · 11 guided screens · private account',
    greek:'Turn an intention into action',greekNote:'From intention and courage to a meaningful next step · 10 screens · private account',
    worksheet:'Coaching preparation questionnaire',worksheetNote:'Write your question and prepare for a meeting on one editable page. Optional private Google-account save.',
    openProgramme:'Explore programme',chooseTradition:'Choose this session',openWorksheet:'Open questionnaire',
    clarify:'A helpful follow-up',clarifyWhy:'Optional authored reflection, not an AI response.',clarifyAnswer:'Your reflection',clarifySave:'Save reflection & continue',clarifySkip:'Skip this reflection',clarifyShort:'Write at least 3 characters.',stopMic:'Stop dictation and review the recognized text before moving on.',
  },
  ru:{
    adultTitle:"Только для взрослых (18+) · ваш выбор",
    adultNotice:"Практика размышления о желаниях, сексуальности, согласии и границах. Без интимных подробностей и телесных упражнений. Любой вопрос можно пропустить.",
    adultSafety:"При насилии, давлении, страхе или стойкой боли обратитесь к квалифицированному специалисту.",
    adultConfirm:"Подтверждаю, что мне 18+ и я добровольно начинаю",
    skipSensitive:"Пропустить этот вопрос",
    continueSession:'Продолжить коучинг-сессию',beginQuestions:'Перейти к вопросам',yourTopic:'Тема запроса',
    outcomeTitle:'Необязательно · Желаемый результат',outcomeNote:'Выберите одну цель: подходящие методики будут выше, остальные останутся доступны.',outcomeFitLabel:'Подходит к цели',outcomeRankingNote:'Подходящие методы показаны первыми. Это рекомендация по запросу, не психологическая оценка.',
    sessionModeTitle:'2 · Выберите формат сессии',imageryTitle:'Образная практика и рефлексия',imageryNote:'Необязательная текстовая визуализация и авторские египетская и греческая программы. Готовых аудио- и видеомедитаций здесь пока нет.',imageryPracticeTitle:'Визуализация на минуту · по желанию',imageryPractice:'Дышите как обычно. Представьте место или образ, который отражает вашу ситуацию. Заметьте одну деталь и подумайте, что она для вас значит. Можно пропустить и сразу выбрать программу.',showAllModes:'Все сессии',morePreferences:'Дополнительно · личная работа и фильтры',preferenceNotice:'Это настройки сессии, не рейтинг и не оценка квалификации коуча.',
    coachFitTitle:'Подходит ли вам этот специалист?',coachFitIntro:'Перед заявкой полезно уточнить:',coachFitChecks:['Опыт работы с похожими запросами и подтверждаемое образование или подготовку.','Как специалист работает, комфортны ли вам его стиль и общение.','Язык беседы, формат онлайн, стоимость, длительность и порядок подтверждения записи.'],coachOnly:'В данном разделе представлен один специалист — Андрей. Квалификация, отзывы и доступность не проходили независимую проверку на этой странице.',
    groupHeading:"1 · Выберите тему",groupNote:"Начните с самого важного. Детали можно уточнить позже.",groupRefine:"Уточните запрос",groupCount:"Доступно сессий",groupDesc:"Разные методики — один вопрос на экране.",healthNote:"Коучинг здоровья касается привычек и ресурсов, а не диагностики и лечения.",groupAll:"Все темы",
    eyebrow:'HOLISTIC HOUSE · ГОСТИНАЯ КОУЧИНГА',title:'Гостиная коучинга',
    lead:'Опишите, с чем хотите поработать, или выберите тему, время и формат. Здесь собраны бесплатные модели, авторские курсы и личные сессии.',leadCompact:'Выберите тему и начните бесплатную сессию или личную работу с Андреем.',
    question:'Какой вопрос хотите разобрать?',placeholder:'Цель, решение, отношения или сложность (необязательно)',
    privateQuestion:'Подбор по вопросу выполняется в браузере. Текст не отправляется в ИИ, аналитику или коучу.',
    format:'Как вам удобнее работать?',allFormats:'Оба варианта',self:'Самостоятельно',human:'С Андреем',filters:'Подобрать сессию',
    topic:'Тема',allTopics:'Все темы',duration:'Сколько времени',anyTime:'Любая',
    style:'Глубина работы',allStyles:'Любая',quick:'Практичная',reflective:'Рефлексия',anyShort:'Любое',upTo:'До',
    models:'Выберите сессию',all:'Все коуч-сессии',recommended:'Рекомендуем по вашему вопросу',
    noExact:'Точного совпадения нет. Выберите подходящую модель самостоятельно.',
    empty:'Нет моделей с такими фильтрами. Измените тему или длительность.',
    unavailable:'Каталог моделей временно недоступен. Можно запросить личную сессию.',
    free:'Бесплатно',minutes:'мин',start:'Начать бесплатно',result:'Результат практики',
    recommendedLabel:'Подходит по запросу',different:'Другие модели',about:'Об этом подходе',
    method:'Методика',details:'Детали',lessDetails:'Свернуть',fullDetails:'Ещё больше подробностей',expect:'Результат',limits:'Важно учитывать',examples:'Примеры вопросов',freeMeta:'Самостоятельно',
    humanTitle:'Личный коучинг с Андреем',humanText:'Индивидуальная коучинговая или терапевтическая беседа онлайн. Выберите длительность и отправьте запрос.',
    half:'Сессия 30 минут',hour:'Сессия 60 минут',request:'Заказать',
    notBooking:'Запрос не является подтверждённой записью или оплатой. Специалист согласует условия и время.',
    safe:'Самостоятельный коучинг — практика размышления, не психотерапия, медпомощь или чат с ИИ.',
    alert:'При непосредственной угрозе безопасности обратитесь за квалифицированной или экстренной помощью.',
    back:'Все сессии',stage:'ВОПРОС',of:'ИЗ',yourQuestion:'Ваш вопрос',choices:'Выберите ответ',
    ownAnswer:'Или напишите свой ответ (необязательно)',openAnswer:'Ваш ответ своими словами',answerPlaceholder:'Не торопитесь. Достаточно нескольких предложений…',
    next:'Следующий вопрос',finish:'Завершить',previous:'Назад',required:'Выберите или напишите ответ.',
    plan:'Для WOOP напишите конкретный план «если — то» не короче 10 символов.',
    completed:'Сессия завершена',summary:'Ваши ответы',nextStep:'Ваш последний шаг',copy:'Скопировать результат',
    copied:'Скопировано',copyFallback:'Выделите и скопируйте текст ниже.',
    restart:'Выбрать другую модель',memory:'Бесплатная сессия хранится только в открытой вкладке. В личный кабинет или коучу ничего не отправляется.',
    reportNotice:'Ваш ответ остаётся только в этой вкладке, не в личном кабинете. В конце скачайте PDF с вашими мыслями и ответами до закрытия вкладки.',
    pdf:'Скачать PDF-отчёт',pdfError:'Не удалось создать PDF. Ответы пока доступны в этой вкладке.',date:'Дата сессии',
    discard:'Выйти из сессии? Несохранённые ответы будут потеряны.',noAnswer:'Пропущено',
    otherWays:'Другие способы разобраться в своём вопросе',
    otherWaysNote:'Авторские программы и отдельная подробная анкета. Гостевые ответы не переносятся в кабинет автоматически.',
    egyptianMethod:'Египетское планирование',greekMethod:'Греческое планирование',egyptian:'Открыть свои ценности и ресурсы',egyptianNote:'От желания к ценностям, действиям и ресурсам · 11 экранов · личный кабинет',
    greek:'От намерения к действию',greekNote:'От намерения и смелости к осмысленному шагу · 10 экранов · личный кабинет',
    worksheet:'Анкета для подготовки к коучингу',worksheetNote:'Подробная анкета на одной странице, чтобы сформулировать вопрос и подготовиться к разговору. Можно сохранить приватно после входа.',
    openProgramme:'Подробнее о программе',chooseTradition:'Выбрать сессию',openWorksheet:'Открыть анкету',
    clarify:'Уточняющий вопрос',clarifyWhy:'Необязательный авторский вопрос, не генерация ИИ.',clarifyAnswer:'Ваше уточнение',clarifySave:'Сохранить и продолжить',clarifySkip:'Пропустить уточнение',clarifyShort:'Напишите не меньше 3 символов.',stopMic:'Остановите диктовку и проверьте текст перед переходом.',
  },
  es:{
    adultTitle:"Solo adultos (18+) · una decisión consciente",
    adultNotice:"Reflexión privada sobre deseo, sexualidad, límites y consentimiento. Sin detalles explícitos ni ejercicios físicos. Puedes omitir cualquier pregunta.",
    adultSafety:"En casos de violencia, presión, miedo, abuso o dolor persistente, busca ayuda profesional.",
    adultConfirm:"Confirmo que tengo 18 años o más y elijo comenzar",
    skipSensitive:"Omitir esta pregunta",
    continueSession:'Continuar la sesión de coaching',beginQuestions:'Ir a las preguntas',yourTopic:'Tu tema',
    outcomeTitle:'Opcional · Resultado deseado',outcomeNote:'Elige un objetivo: los métodos afines aparecerán primero; los demás siguen disponibles.',outcomeFitLabel:'Afín a tu objetivo',outcomeRankingNote:'Priorizamos opciones según tu objetivo. No es una evaluación psicológica.',
    sessionModeTitle:'2 · Elige un formato',imageryTitle:'Imágenes y reflexión guiada',imageryNote:'Visualización opcional por escrito y programas simbólicos egipcio y griego. Aún no incluyen audios ni vídeos de meditación.',imageryPracticeTitle:'Visualización de un minuto · opcional',imageryPractice:'Respira con normalidad. Imagina un lugar o una imagen que represente tu pregunta. Observa un detalle y qué significa para ti. Puedes omitirlo y elegir un programa.',showAllModes:'Ver todas las sesiones',morePreferences:'Más opciones · coaching personal y filtros',preferenceNotice:'Solo filtran sesiones, no verifican cualificaciones de profesionales.',
    coachFitTitle:'¿Es el profesional adecuado para mí?',coachFitIntro:'Antes de solicitar, conviene consultar:',coachFitChecks:['Experiencia relevante y formación que puedas comprobar.','Método de trabajo y un estilo de comunicación en el que te sientas escuchado.','Idioma de conversación, modalidad online, precio, duración y confirmación.'],coachOnly:'Andrey es el único profesional personal presentado aquí. Esta página no verifica de forma independiente credenciales, reseñas o disponibilidad.',
    groupHeading:"1 · Elige el tema",groupNote:"Empieza por lo importante. Los detalles pueden esperar.",groupRefine:"Pregunta específica",groupCount:"Sesiones disponibles",groupDesc:"Varios métodos, una pregunta por pantalla.",healthNote:"El bienestar trata hábitos y recursos, no diagnóstico ni tratamiento.",groupAll:"Todos",
    eyebrow:'HOLISTIC HOUSE · SALÓN DE COACHING',title:'Sala de coaching',
    lead:'Describe tu pregunta o filtra por tema, duración y formato. Compara sesiones gratuitas, cursos simbólicos y coaching personal en un mismo lugar.',leadCompact:'Elige un tema y comienza una sesión gratis o trabaja personalmente con Andrey.',
    question:'¿Qué te gustaría explorar?',placeholder:'Una meta, decisión, relación o reto (opcional)',
    privateQuestion:'Tu pregunta se analiza solo en este navegador. No se envía a IA, analíticas ni al coach.',
    format:'¿Cómo quieres trabajar?',allFormats:'Ambas opciones',self:'Por mi cuenta',human:'Con Andrey',filters:'Encontrar sesión',
    topic:'Tema',allTopics:'Todos los temas',duration:'Tiempo disponible',anyTime:'Sin límite',
    style:'Profundidad',allStyles:'Cualquiera',quick:'Práctica',reflective:'Reflexiva',anyShort:'Cualquiera',upTo:'Hasta',
    models:'Elige una sesión',all:'Todas las sesiones de coaching',recommended:'Sugeridos para tu pregunta',
    noExact:'No hay una coincidencia específica. Puedes elegir cualquier modelo.',
    empty:'No hay modelos con esos filtros. Cambia el tema o la duración.',
    unavailable:'El catálogo no está disponible temporalmente. Puedes solicitar una sesión personal.',
    free:'Gratis',minutes:'min',start:'Empezar gratis',result:'Resultado de la práctica',
    recommendedLabel:'Sugerido',different:'Otras opciones',about:'Sobre este enfoque',
    method:'Método',details:'Detalles',lessDetails:'Ocultar',fullDetails:'Más detalles de esta sesión',expect:'Resultado',limits:'A tener en cuenta',examples:'Preguntas de ejemplo',freeMeta:'Autoguiado',
    humanTitle:'Coaching personal con Andrey',humanText:'Conversación individual de coaching o terapia en línea. Elige una duración y envía una solicitud.',
    half:'Sesión de 30 minutos',hour:'Sesión de 60 minutos',request:'Solicitar sesión',
    notBooking:'Una solicitud no confirma una reserva ni un pago. El profesional debe confirmar.',
    safe:'El autocoaching es reflexión educativa, no psicoterapia, atención médica ni chat con IA.',
    alert:'Ante un peligro inmediato, solicita ayuda profesional o de emergencia.',
    back:'Todas las sesiones',stage:'PREGUNTA',of:'DE',yourQuestion:'Tu pregunta',choices:'Elige una respuesta',
    ownAnswer:'O escribe tu respuesta (opcional)',openAnswer:'Tu respuesta, con tus propias palabras',answerPlaceholder:'Sin prisa. Unas frases son suficientes…',
    next:'Siguiente pregunta',finish:'Terminar',previous:'Atrás',required:'Elige o escribe una respuesta.',
    plan:'Para WOOP escribe un plan específico «si–entonces» de al menos 10 caracteres.',
    completed:'Sesión terminada',summary:'Tu reflexión',nextStep:'Tu último paso',copy:'Copiar resumen',
    copied:'Copiado',copyFallback:'Selecciona y copia tu texto abajo.',
    restart:'Elegir otro modelo',memory:'Esta sesión gratis solo vive en esta pestaña. No se guarda ni se envía al coach.',
    reportNotice:'Tus respuestas quedan solo en esta pestaña, no en una cuenta. Al final descarga un PDF con tus reflexiones y respuestas antes de salir.',
    pdf:'Descargar informe PDF',pdfError:'No se pudo crear el PDF. Tus respuestas siguen en esta pestaña.',date:'Fecha de la sesión',
    discard:'¿Salir? Se perderán tus respuestas.',noAnswer:'Omitido',
    otherWays:'Otras formas de explorar tu pregunta',
    otherWaysNote:'Programas de autor y cuestionario detallado. Las respuestas de invitado no se transfieren a tu cuenta automáticamente.',
    egyptianMethod:'Planificación egipcia',greekMethod:'Planificación griega',egyptian:'Descubrir valores y recursos',egyptianNote:'Deseos, valores, recursos y acción · 11 pantallas · cuenta privada',
    greek:'Pasar de intención a acción',greekNote:'Voluntad, sentido y un siguiente paso · 10 pantallas · cuenta privada',
    worksheet:'Cuestionario de preparación para coaching',worksheetNote:'Prepara tu consulta en una página. Guardado privado opcional después de iniciar sesión.',
    openProgramme:'Conocer programa',chooseTradition:'Elegir sesión',openWorksheet:'Abrir cuestionario',
    clarify:'Una pregunta de aclaración',clarifyWhy:'Reflexión original opcional, no una respuesta de IA.',clarifyAnswer:'Tu reflexión',clarifySave:'Guardar y continuar',clarifySkip:'Omitir esta reflexión',clarifyShort:'Escribe al menos 3 caracteres.',stopMic:'Detén el dictado y revisa el texto antes de continuar.',
  },
}
// Editorial topical hints for existing authored course routes. They are not
// published catalog schemes or a claim of historical/clinical validation.
const traditionFit={
  egyptian:{tags:['goal','decision','growth','transition','business','confidence'],minutes:25},
  greek:{tags:['goal','decision','growth','transition','career','confidence'],minutes:20},
}
function traditionExplicitMatch(question,id){
  const text=String(question||'').toLowerCase()
  return id==='egyptian'?/egypt|egip|егип|секхем|sekhem/.test(text)
    :/greek|grieg|гречес|грец|логос|logos/.test(text)
}


const tr=(value,locale)=>value?.[locale]||value?.en||''
// Do not present an 18+ session as a generic top suggestion before an adult topic choice.
const outcomeScore=(scheme,goal,group)=>group!=='sexuality'&&coachingSchemeRequiresAdultConsent(scheme)?0:coachingOutcomeFit(scheme,goal)
const answerText=(value,item,locale,t)=>{
  if(typeof value!=='string'||!value)return t.noAnswer
  if(!value.startsWith('choice:'))return value
  const id=value.slice(7)
  if(item.type==='scale_0_10')return id+'/10'
  return tr((item.choices||[]).find(c=>c.id===id)?.label,locale)||t.noAnswer
}


// The same compact card contract is used for free models, private author
// programmes, the preparation questionnaire and paid session requests.
function CoachingLoungeCard({
  locale,id,title,meta,price,image,description,detail,outcome,caution,examples,
  primaryLabel,primaryHref,onPrimary,landingHref,onLanding,suggested=false,suggestionLabel,
  schemeKey,traditionKey,method,
}){
  const t=copy[locale],panelId=useId()
  const isFree=price==='€0'
  const [expanded,setExpanded]=useState(false)
  return <article id={traditionKey ? 'coaching-tradition-'+traditionKey : undefined} className={styles.loungeCard} data-coaching-item={id}
    data-coaching-scheme={schemeKey} data-coaching-tradition={traditionKey}
    data-coaching-compact-card data-coaching-free={isFree?'true':undefined}>
    {isFree&&<span className={styles.loungeFreeRibbon}>{t.free}</span>}
    <div className={styles.loungeRow}>
      <Link className={styles.loungePhoto} href={landingHref} prefetch={false} onClick={onLanding}
        aria-label={t.fullDetails+': '+title}>
        <Image src={cardArtworkUrl(image)} alt="" fill loading="lazy" unoptimized
          sizes="(max-width:360px) 105px, (max-width:600px) 34vw, 180px"/>
      </Link>
      <div className={styles.loungeContent}>
        <div className={styles.loungeMeta}>
          <span>{meta}</span>{!isFree&&<strong>{price}</strong>}
        </div>
        <h3>{title}</h3>
        {description&&<p className={styles.loungeSummary}>{description}</p>}
        {suggested&&<span className={styles.loungeSuggested}><Sparkles size={12}/>{suggestionLabel||t.recommendedLabel}</span>}
        <div className={styles.loungeActions}>
          <button type="button" className={styles.loungeDetails} aria-controls={panelId}
            aria-expanded={expanded} onClick={()=>setExpanded(prev=>!prev)}>
            {expanded?t.lessDetails:t.details}
            <ChevronDown size={15} aria-hidden="true" className={expanded?styles.chevronOpen:styles.chevron}/>
          </button>
          {onPrimary
            ? <button type="button" className={styles.loungePrimary} onClick={onPrimary}>
                {primaryLabel}<ArrowRight size={15} aria-hidden="true"/>
              </button>
            : <Link className={styles.loungePrimary} href={primaryHref} prefetch={false}>
                {primaryLabel}<ArrowRight size={15} aria-hidden="true"/>
              </Link>}
        </div>
      </div>
    </div>
    <div className={styles.loungePanel} id={panelId} hidden={!expanded}
      aria-label={t.details+': '+title} data-coaching-details-panel>
      {method&&<p><strong>{t.method}:</strong> {method}</p>}
      {detail&&<p>{detail}</p>}
      {outcome&&<p><strong>{t.expect}:</strong> {outcome}</p>}
      {caution&&<p><strong>{t.limits}:</strong> {caution}</p>}
      {Array.isArray(examples)&&examples.length>0&&<div>
        <strong>{t.examples}:</strong>
        <ul>{examples.slice(0,3).map((text,i)=><li key={i}>{text}</li>)}</ul>
      </div>}
      <Link href={landingHref} className={styles.loungeLanding} prefetch={false} onClick={onLanding}>
        {t.fullDetails}<ArrowRight size={15} aria-hidden="true"/>
      </Link>
    </div>
  </article>
}

export default function PublicCoachingDiscovery({locale='en',catalog=null}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const privateCoachingLocale=lang==='es'?'en':lang
  const traditionHref=id=>'/'+privateCoachingLocale+'/app/coaching/'+id+(lang==='es'?'?lang=es':'')
  const [format,setFormat]=useState('all')
  const [outcome,setOutcome]=useState('')
  const [sessionMode,setSessionMode]=useState('all')
  const [question,setQuestion]=useState('')
  useEffect(()=>{
    const handedOff=takeIdeasCoachingQuestion()
    if(handedOff)setQuestion(handedOff)
  },[])
  const [topic,setTopic]=useState('all')
  const [topicGroup,setTopicGroup]=useState('all')
  const [duration,setDuration]=useState(0)
  const [style,setStyle]=useState('all')
  const [session,setSession]=useState(null)
  const [entryStep,setEntryStep]=useState('intro')
  const [checkin,setCheckin]=useState('')
  const [sessionTopic,setSessionTopic]=useState('')
  const [adultAcknowledged,setAdultAcknowledged]=useState(false)
  const [index,setIndex]=useState(0)
  const [answers,setAnswers]=useState({})
  const [draft,setDraft]=useState('')
  const [dictating,setDictating]=useState(false)
  const [speechConsent,setSpeechConsent]=useState(false)
  const [finished,setFinished]=useState(false)
  const [finishedAt,setFinishedAt]=useState(null)
  const [pdfError,setPdfError]=useState('')
  const [pendingFollowup,setPendingFollowup]=useState(null)
  const [reflectionDraft,setReflectionDraft]=useState('')
  const [reflections,setReflections]=useState({})
  const [approvedPlan,setApprovedPlan]=useState(null)
  const [error,setError]=useState('')
  const [copyError,setCopyError]=useState(false)
  const [copied,setCopied]=useState(false)
  const titleRef=useRef(null)
  const sessionScrollRef=useRef(null)
  const rootRef=useRef(null)
  useEffect(()=>{
    if(!session)return
    // The public session is an immersive viewport, not a card inside the site.
    // Keep the original scroll state when returning to the model lounge.
    const previousOverflow=document.body.style.overflow
    document.body.style.overflow='hidden'
    const viewport=window.visualViewport
    const sizeToVisibleViewport=()=>{
      if(!rootRef.current)return
      rootRef.current.style.setProperty('--coach-visible-height',`${Math.max(1,Math.round(viewport?.height||window.innerHeight))}px`)
      rootRef.current.style.setProperty('--coach-visible-top',`${Math.round(viewport?.offsetTop||0)}px`)
    }
    sizeToVisibleViewport()
    window.addEventListener('resize',sizeToVisibleViewport)
    viewport?.addEventListener('resize',sizeToVisibleViewport)
    viewport?.addEventListener('scroll',sizeToVisibleViewport)
    return ()=>{
      document.body.style.overflow=previousOverflow
      window.removeEventListener('resize',sizeToVisibleViewport)
      viewport?.removeEventListener('resize',sizeToVisibleViewport)
      viewport?.removeEventListener('scroll',sizeToVisibleViewport)
      rootRef.current?.style.removeProperty('--coach-visible-height')
      rootRef.current?.style.removeProperty('--coach-visible-top')
    }
  },[session])
  // On phones, the next question must not appear below the old viewport.
  // Focus the freshly rendered heading after each guest step; never autofocus
  // an input or open the keyboard without the visitor's action.
  useEffect(()=>{
    if(session&&!finished){
      if(sessionScrollRef.current)sessionScrollRef.current.scrollTop=0
      titleRef.current?.focus({preventScroll:true})
    }
  },[session,index,finished,pendingFollowup,entryStep])
  const models=useMemo(()=>new Map((catalog?.models||[]).map(m=>[m.modelKey,m])),[catalog])
  const schemes=useMemo(()=>(catalog?.schemes||[]).filter(s=>models.has(s.modelKey)&&Array.isArray(s.questions)&&s.questions.length>0),[catalog,models])
  // A dedicated public scheme landing may link back to an explicit Start action.
  // Only a whitelisted, published scheme key is read from the URL; never a
  // visitor's raw question or response. No session is stored by this handoff.
  const openedLinkedScheme=useRef(false)
  useEffect(()=>{
    if(openedLinkedScheme.current||!schemes.length)return
    const schemeKey=new URLSearchParams(window.location.search).get('start')
    if(!schemeKey)return
    openedLinkedScheme.current=true
    const selected=schemes.find(item=>item.schemeKey===schemeKey)
    if(selected){
      setAdultAcknowledged(false)
      setSession(selected);setEntryStep('intro');setCheckin('');setSessionTopic('');setIndex(0);setAnswers({});setDraft('')
      setFinished(false);setFinishedAt(null);setPdfError('');setError('');setCopied(false)
    }
  },[schemes])
  const recommendation=useMemo(()=>recommendCoachingForQuestion(question,catalog||{models:[],schemes:[],signals:[]},{minutes:duration||30,style}),[question,catalog,duration,style])
  const suggestionKeys=useMemo(()=>new Set(question.trim().length>=8&&recommendation.recognized?recommendation.suggestions.filter(s=>s.matchedTags.length>0).map(s=>s.schemeKey):[]),[question,recommendation])
  const shown=useMemo(()=>schemes.filter(s=>coachingSchemeMatchesSessionMode(s,sessionMode)&&coachingSchemeInGroup(s,topicGroup)&&(topic==='all'||s.tags?.includes(topic))&&(duration===0||s.minutes<=duration)&&(style==='all'||s.style===style))
    .sort((a,b)=>Number(suggestionKeys.has(b.schemeKey))-Number(suggestionKeys.has(a.schemeKey))||outcomeScore(b,outcome,topicGroup)-outcomeScore(a,outcome,topicGroup)||a.minutes-b.minutes||a.schemeKey.localeCompare(b.schemeKey)),[schemes,sessionMode,topicGroup,topic,duration,style,outcome,suggestionKeys])
  const shownTraditions=useMemo(()=>{
    if(sessionMode==='express'||sessionMode==='extended')return []
    if(sessionMode==='imagery')return Object.keys(traditionFit)
    return Object.entries(traditionFit).filter(([,fit])=>
      (topicGroup==='all'||coachingTopicGroup(topicGroup).tags.some(tag=>fit.tags.includes(tag)))&&
      (topic==='all'||fit.tags.includes(topic))&&(duration===0||fit.minutes<=duration)
      &&(style==='all'||style==='reflective')).map(([id])=>id)
  },[sessionMode,topicGroup,topic,duration,style])
  const suggestedTraditions=useMemo(()=>new Set(question.trim().length>=8
    ?Object.entries(traditionFit).filter(([id,fit])=>
      traditionExplicitMatch(question,id)||fit.tags.some(tag=>(recommendation.tags||[]).includes(tag)))
      .map(([id])=>id):[]),[question,recommendation])
  const current=session?.questions?.[index]
  const quickChoices=coachingQuickChoicesAllowed(current,index)
  const previousQuestion=session?.questions?.[index-1]
  const conversationTurn=coachingConversationTurn({
    question:current,previousQuestion,previousAnswer:answers?.[previousQuestion?.id],
    previousReflection:reflections?.[previousQuestion?.id]?.text,
    index,total:session?.questions?.length||1,locale:lang,
  })
  const followupTurn=pendingFollowup?coachingConversationTurn({
    question:current,previousQuestion:current,previousAnswer:answers?.[current?.id],
    index,total:session?.questions?.length||1,locale:lang,followup:true,
  }):null
  const needsCustomPlan=Boolean(session?.requiredCustomPlan&&index===session.questions.length-1)
  const requiresAdult=Boolean(session&&(coachingSchemeRequiresAdultConsent(session)||sessionTopic==='sexuality'))
  const progressPosition=entryStep==='intro'?1:entryStep==='topic'?2:index+3
  const options=current?.type==='scale_0_10'
    ?Array.from({length:11},(_,n)=>({id:String(n),label:{en:String(n),ru:String(n),es:String(n)}}))
    :(current?.choices||[])


  function selectSessionMode(mode){
    setSessionMode(mode)
    // Avoid invisible advanced preferences silently excluding an explicit mode.
    setDuration(0);setStyle('all');setOutcome('')
    setFormat(mode==='imagery'?'self':'all')
  }
  function selectTopicGroup(groupId){
    setTopicGroup(coachingTopicGroup(groupId).id)
    setTopic('all')
  }
  function start(scheme){
    if(recommendation.blocked)return
    setDictating(false)
    setAdultAcknowledged(false)
    setSession(scheme);setEntryStep('intro');setCheckin('');setSessionTopic(isCoachingRequestTopic(topicGroup)?topicGroup:'');setIndex(0);setAnswers({});setDraft('');setFinished(false);setFinishedAt(null);setPdfError('');setCopied(false);setCopyError(false);setError('')
    setPendingFollowup(null);setReflectionDraft('');setReflections({});setApprovedPlan(null)
  }
  function backToModels(){
    if(dictating){setError(t.stopMic);return}
    if(!finished&&(Object.keys(answers).length>0||draft.trim())&&!window.confirm(t.discard))return
    setSession(null);setEntryStep('intro');setCheckin('');setSessionTopic('');setAdultAcknowledged(false);setIndex(0);setAnswers({});setDraft('');setFinished(false);setFinishedAt(null);setPdfError('');setError('')
    setPendingFollowup(null);setReflectionDraft('');setReflections({});setApprovedPlan(null)
  }
  function moveBack(){
    if(dictating){setError(t.stopMic);return}
    if(entryStep==='intro'){backToModels();return}
    if(entryStep==='topic'){setEntryStep('intro');setError('');return}
    if(pendingFollowup){
      if(reflectionDraft.trim()&&!window.confirm(t.discard))return
      setPendingFollowup(null);setReflectionDraft('');setError('')
      return
    }
    if(index===0){setEntryStep('topic');setError('');return}
    // A guest can move between steps without discarding an unsubmitted draft.
    // This remains in React memory only; no server call or persistent storage.
    const updated={...answers,[current.id]:draft}
    const prev=index-1
    setAnswers(updated)
    setIndex(prev);setDraft(updated[session.questions[prev].id]||'');setError('')
  }
  function advance(skip=false){
    if(dictating){setError(t.stopMic);return}
    const value=skip?'':draft.trim()
    if(current.required&&!skip&&!value){setError(t.required);return}
    if(!skip&&session.requiredCustomPlan&&index===session.questions.length-1&&(value.startsWith('choice:')||value.length<10)){
      setError(t.plan);return
    }
    const nextAnswers={...answers,[current.id]:value}
    const nextReflections={...reflections}
    // Changing an answer must never retain a clarification about the old one.
    if(answers[current.id]!==value&&nextReflections[current.id]){
      delete nextReflections[current.id]
      setReflections(nextReflections)
    }
    setAnswers(nextAnswers);setError('')
    if(index===session.questions.length-1){setFinishedAt(new Date().toISOString());setFinished(true);return}
    const followup=authoredFollowupFor(current,value,nextReflections)
    if(followup){setPendingFollowup(followup);setReflectionDraft('');return}
    const next=index+1;setIndex(next);setDraft(nextAnswers[session.questions[next].id]||'')
  }
  function finishFollowup(skip=false){
    if(dictating){setError(t.stopMic);return}
    if(!pendingFollowup)return
    const text=reflectionDraft.trim()
    if(!skip&&text.length<3){setError(t.clarifyShort);return}
    if(!skip)setReflections(previous=>({...previous,[pendingFollowup.questionId]:{
      key:pendingFollowup.key,stage:pendingFollowup.stage,text,
    }}))
    setPendingFollowup(null);setReflectionDraft('');setError('')
    const next=index+1;setIndex(next);setDraft(answers[session.questions[next].id]||'')
  }
  function summaryText(){
    if(!session)return ''
    return [t.summary+' · '+coachingSessionTitle(session.schemeKey,lang,tr(session.name,lang)),sessionTopic?t.yourTopic+': '+coachingRequestTopicLabel(sessionTopic,lang):'',question.trim()?t.yourQuestion+': '+question.trim():'',
      ...session.questions.flatMap(item=>[
        tr(item.prompt,lang)+': '+answerText(answers[item.id],item,lang,t),
        reflections[item.id]?.text?t.clarifyAnswer+': '+reflections[item.id].text:'',
      ]),
      ...(approvedPlan?[t.completed+' · '+approvedPlan.actionText,
        approvedPlan.goal,approvedPlan.obstacle,approvedPlan.when,
        approvedPlan.confidence===null?'':'Confidence /10: '+approvedPlan.confidence]:[])
      ].filter(Boolean).join('\n\n')
  }
  function downloadReport(){
    if(!session||!finished)return
    try{
      downloadCoachingSessionPdf({
        locale:lang,title:coachingSessionTitle(session.schemeKey,lang,tr(session.name,lang)),
        slug:session.schemeKey||'guest-coaching',sessionDate:finishedAt,
        topic:sessionTopic?coachingRequestTopicLabel(sessionTopic,lang):'',
        clientQuestion:question.trim(),
        entries:session.questions.map(item=>({
          question:tr(item.prompt,lang),
          answer:answerText(answers[item.id],item,lang,t),
          reflection:reflections[item.id]?.text||'',
        })),
        actionPlan:approvedPlan?.actionText?[
          approvedPlan.goal,approvedPlan.obstacle,approvedPlan.actionText,approvedPlan.when,
          Number.isInteger(approvedPlan.confidence)?String(approvedPlan.confidence)+'/10':'',
        ].filter(Boolean).join('\n'):'',
      })
      setPdfError('')
    }catch{setPdfError(t.pdfError)}
  }
  async function copySummary(){
    try{await navigator.clipboard.writeText(summaryText());setCopied(true);setCopyError(false)}
    catch{setCopyError(true)}
  }
  return <main ref={rootRef} className={styles.root} data-public-coaching data-public-coaching-active={session?'true':undefined} lang={lang}>
    <div className={styles.wrap}>
      {!session?<>
        <header className={styles.hero}>
          <p className={styles.eyebrow}><Sparkles size={16}/>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p><span className={styles.leadFull}>{t.lead}</span><span className={styles.leadShort}>{t.leadCompact}</span></p>
        </header>
        <section className={styles.controls} aria-label={t.filters}>
          <fieldset className={styles.topicGroups} data-coaching-topic-first>
            <legend><strong>{t.groupHeading}</strong><span>{t.groupNote}</span></legend>
            <div className={styles.topicGroupGrid}>
              {COACHING_TOPIC_GROUPS.map(group=><button type="button" key={group.id}
                data-coaching-topic-group={group.id} aria-pressed={topicGroup===group.id}
                className={topicGroup===group.id?styles.topicGroupSelected:undefined}
                onClick={()=>selectTopicGroup(group.id)}>
                <span aria-hidden="true" className={styles.topicGroupIcon}>{group.icon}</span>
                <span className={styles.topicGroupName}>{tr(group.label,lang)}</span>
                {sessionMode!=='imagery'&&<span className={styles.topicGroupCount} aria-label={t.groupCount}>
                  {coachingTopicSchemeCount(schemes.filter(s=>coachingSchemeMatchesSessionMode(s,sessionMode)),group.id)}</span>}
              </button>)}
            </div>
          </fieldset>
          <fieldset className={styles.sessionModes} data-coaching-session-mode-first>
            <legend><strong>{t.sessionModeTitle}</strong></legend>
            <div className={styles.sessionModeGrid} role="group" aria-label={t.sessionModeTitle}>
              {COACHING_SESSION_MODES.map(item=><button type="button" key={item.id}
                data-coaching-session-mode={item.id} aria-pressed={sessionMode===item.id}
                className={sessionMode===item.id?styles.sessionModeSelected:undefined}
                onClick={()=>selectSessionMode(item.id)}>
                <span className={styles.sessionModeIcon} aria-hidden="true">{item.icon}</span>
                <span className={styles.sessionModeText}><strong>{tr(item.label,lang)}</strong><small>{tr(item.hint,lang)}</small></span>
              </button>)}
            </div>
          </fieldset>
          <details className={styles.advanced} data-coaching-advanced-preferences>
            <summary>{t.morePreferences}</summary>
            <fieldset className={styles.outcomes} data-coaching-outcome-first>
            <legend><strong>{t.outcomeTitle}</strong><span>{t.outcomeNote}</span></legend>
            <div className={styles.outcomeGrid} role="group" aria-label={t.outcomeTitle}>
              {COACHING_OUTCOMES.map(item=><button type="button" key={item.id}
                data-coaching-outcome={item.id} aria-pressed={outcome===item.id}
                className={outcome===item.id?styles.outcomeSelected:undefined}
                onClick={()=>setOutcome(value=>value===item.id?'':item.id)}>
                <span aria-hidden="true">{item.icon}</span>{tr(item.label,lang)}
              </button>)}
            </div>
          </fieldset>
            <fieldset className={styles.format}>
            <legend>{t.format}</legend>
            <button type="button" className={format==='all'?styles.active:''} aria-pressed={format==='all'} onClick={()=>setFormat('all')}><Sparkles size={18}/>{t.allFormats}</button>
            <button type="button" className={format==='self'?styles.active:''} aria-pressed={format==='self'} onClick={()=>setFormat('self')}><Compass size={18}/>{t.self}</button>
            <button type="button" className={format==='human'?styles.active:''} aria-pressed={format==='human'} onClick={()=>{setFormat('human');setDuration(0);setStyle('all');setTopic('all')}}><UserRound size={18}/>{t.human}</button>
          </fieldset>
            {format!=='human'&&<>
              <p className={styles.advancedHint}>{t.preferenceNotice}</p>
              <div className={styles.filters} data-coaching-inline-filters>
              {topicGroup!=='all'&&<div className={styles.filterRow} data-coaching-filter="topic">
                <span className={styles.filterName}>{t.groupRefine}</span>
                <div className={[styles.pillOptions,styles.pillScroller].join(' ')} role="group" aria-label={t.groupRefine}>
                  <button type="button" aria-pressed={topic==='all'} className={topic==='all'?styles.selectedPill:undefined}
                    onClick={()=>setTopic('all')}>{t.anyShort}</button>
                  {(catalog?.signals||[]).filter(signal=>coachingSignalInGroup(signal,topicGroup)&&schemes.some(s=>coachingSchemeInGroup(s,topicGroup)&&s.tags?.includes(signal.tag))&&tr(signal.label,lang).trim().toLowerCase()!==tr(coachingTopicGroup(topicGroup).label,lang).trim().toLowerCase()).map(signal=>
                    <button type="button" key={signal.tag} aria-pressed={topic===signal.tag}
                      className={topic===signal.tag?styles.selectedPill:undefined}
                      onClick={()=>setTopic(signal.tag)}>{tr(signal.label,lang)}</button>)}
                </div>
              </div>}
              <div className={styles.filterRow} data-coaching-filter="duration">
                <span className={styles.filterName}>{t.duration} <small>· {t.minutes}</small></span>
                <div className={styles.pillOptions} role="group" aria-label={t.duration}>
                  {[0,10,20,30,60].map(m=><button type="button" key={m} aria-pressed={duration===m}
                    aria-label={m===0?t.anyTime:t.upTo+' '+m+' '+t.minutes}
                    className={duration===m?styles.selectedPill:undefined}
                    onClick={()=>setDuration(m)}>{m===0?t.anyShort:'≤'+m}</button>)}
                </div>
              </div>
              <div className={styles.filterRow} data-coaching-filter="approach">
                <span className={styles.filterName}>{t.style}</span>
                <div className={styles.pillOptions} role="group" aria-label={t.style}>
                  {[['all',t.anyShort],['quick',t.quick],['reflective',t.reflective]].map(([value,label])=>
                    <button type="button" key={value} aria-pressed={style===value}
                      className={style===value?styles.selectedPill:undefined}
                      onClick={()=>setStyle(value)}>{label}</button>)}
                </div>
              </div>
              </div>
              <label className={styles.questionLabel} htmlFor="public-coaching-question">{t.question}</label>
            <textarea id="public-coaching-question" className={styles.questionInput} rows={1} maxLength={600}
              value={question} placeholder={t.placeholder} autoComplete="off"
              onChange={e=>setQuestion(e.target.value)}/>
            <p className={styles.privacy}><LockKeyhole size={14}/>{t.privateQuestion}</p>
            </>}
          </details>
        </section>
        {format!=='human'&&sessionMode!=='imagery'&&<section aria-labelledby="coaching-models-title" className={styles.catalog}>
          <div className={styles.sectionHeader}>
            <p className={styles.eyebrow}>{t.groupDesc}</p>
            <h2 id="coaching-models-title">{topicGroup==='all'
              ? (question.trim().length>=8&&recommendation.recognized?t.recommended:t.models)
              : tr(coachingTopicGroup(topicGroup).label,lang)}</h2>
            <p className={styles.groupResults} aria-live="polite">{shown.length} · {t.groupCount}</p>
            {topicGroup==='wellbeing'&&<p className={styles.groupResults}>{t.healthNote}</p>}
            {question.trim().length>=8&&!recommendation.recognized&&!recommendation.blocked&&<p>{t.noExact}</p>}
            {outcome&&<p className={styles.outcomeHelp} role="status">{t.outcomeRankingNote}</p>}
          </div>
          {recommendation.blocked?<p className={styles.alert} role="alert">{t.alert}</p>:
            !catalog?<p className={styles.alert} role="status">{t.unavailable}</p>:
            shown.length===0?<div className={styles.alert} role="status"><p>{t.empty}</p><button type="button" onClick={()=>selectSessionMode('all')}>{t.showAllModes}</button></div>:
            <div className={styles.cards} data-public-coaching-models>
              {shown.map(s=>{
                const model=models.get(s.modelKey)
                return <CoachingLoungeCard key={s.schemeKey} locale={lang} id={s.schemeKey}
                  title={coachingSessionTitle(s.schemeKey,lang,tr(s.name,lang)||tr(model.name,lang))}
                  meta={(s.style==='quick'?t.quick:t.reflective)+' · '+s.minutes+' '+t.minutes}
                  price="€0" image={coachingSchemeArt[s.schemeKey]||coachingArt[s.modelKey]||coachingArt.grow_v1}
                  description={coachingSessionSummary(s.schemeKey,lang,tr(model.selectionComment,lang)||tr(model.focus,lang))}
                  method={tr(model.name,lang)}
                  detail={tr(model.focus,lang)}
                  outcome={tr(s.result,lang)}
                  caution={tr(model.caution,lang)}
                  examples={model.exampleQuestions?.[lang]||model.exampleQuestions?.en||[]}
                  suggested={suggestionKeys.has(s.schemeKey)||outcomeScore(s,outcome,topicGroup)>0}
                   suggestionLabel={suggestionKeys.has(s.schemeKey)?t.recommendedLabel:t.outcomeFitLabel}
                  schemeKey={s.schemeKey} primaryLabel={t.start}
                  onPrimary={()=>start(s)}
                  onLanding={()=>stageIdeasCoachingQuestion(question)}
                  landingHref={'/'+lang+'/coaching/session/'+s.schemeKey}/>
              })}
            </div>}
          <p className={styles.disclaimer}>{t.safe}</p>
        </section>}
        {format!=='human'&&!recommendation.blocked&&(sessionMode==='imagery'||sessionMode==='all'&&(topicGroup==='all'||topicGroup==='growth'||topicGroup==='business'))&&<section className={styles.morePaths} aria-labelledby="coaching-more-paths">
          <h2 id="coaching-more-paths">{sessionMode==='imagery'?t.imageryTitle:t.otherWays}</h2>
          <p>{sessionMode==='imagery'?t.imageryNote:t.otherWaysNote}</p>
          {sessionMode==='imagery'&&<aside className={styles.imageryPractice} data-coaching-imagery-practice><strong>{t.imageryPracticeTitle}</strong><p>{t.imageryPractice}</p></aside>}
          <div className={styles.morePathGrid}>
            {shownTraditions.includes('egyptian')&&<CoachingLoungeCard
              key="egyptian" locale={lang} id="egyptian" traditionKey="egyptian"
              title={t.egyptian} meta={t.egyptianMethod} price="€0"
              image={traditionCoachingArt} description={t.egyptianNote}
              detail={t.egyptianNote} caution={t.safe}
              suggested={suggestedTraditions.has('egyptian')}
              primaryHref={traditionHref('egyptian')} primaryLabel={t.chooseTradition}
              landingHref={'/'+lang+'/academy/coaching/egyptian'}/>}
            {shownTraditions.includes('greek')&&<CoachingLoungeCard
              key="greek" locale={lang} id="greek" traditionKey="greek"
              title={t.greek} meta={t.greekMethod} price="€0"
              image={traditionCoachingArt} description={t.greekNote}
              detail={t.greekNote} caution={t.safe}
              suggested={suggestedTraditions.has('greek')}
              primaryHref={traditionHref('greek')} primaryLabel={t.chooseTradition}
              landingHref={'/'+lang+'/academy/coaching/greek'}/>}
            {sessionMode!=='imagery'&&(topicGroup==='all'||topicGroup==='growth')&&<CoachingLoungeCard key="worksheet" locale={lang} id="worksheet"
              title={t.worksheet} meta={t.freeMeta} price="€0"
              image={coachingWorksheetArt} description={t.worksheetNote}
              detail={t.worksheetNote}
              primaryHref={'/'+lang+'/coaching/intake'} primaryLabel={t.openWorksheet}
              landingHref={'/'+lang+'/coaching/intake'}/>}
          </div>
        </section>}
        {format!=='self'&&<section className={styles.catalog} aria-labelledby="human-coaching-title">
          <h2 id="human-coaching-title">{t.humanTitle}</h2><p>{t.humanText}</p>
          <div className={styles.coachFit} data-coaching-practitioner-checklist>
            <strong>{t.coachFitTitle}</strong><p>{t.coachFitIntro}</p>
            <ul>{t.coachFitChecks.map((text,i)=><li key={i}>{text}</li>)}</ul>
            <p className={styles.coachOnly}>{t.coachOnly}</p>
          </div>
          <div className={styles.cards} data-coaching-paid-sessions>
            {[{name:t.half,minutes:30,price:'€50',style:'quick'},{name:t.hour,minutes:60,price:'€100',style:'reflective'}]
              .map(option=><CoachingLoungeCard key={option.minutes} locale={lang}
                id={'personal-'+option.minutes} title={option.name}
                meta={option.minutes+' '+t.minutes} price={option.price}
                image={humanCoachingArt} description={t.humanText}
                detail={t.humanText} caution={t.notBooking}
                primaryHref={'/'+lang+'/services#consultation'} primaryLabel={t.request}
                landingHref={'/'+lang+'/coaching/session/personal-'+option.minutes}/>)}
          </div>
          <p className={styles.disclaimer}>{t.notBooking}</p>
          <p className={styles.filterNote}><Link href={'/'+lang+'/coaching/intake'} prefetch={false}>{t.openWorksheet}<ArrowRight size={15}/></Link> · {t.worksheetNote}</p>
        </section>}
        
      </>:<section className={styles.session} data-public-coaching-session data-intimacy-session={requiresAdult?'true':undefined}>
        <header className={styles.sessionHeader}>
          <button type="button" className={styles.back} disabled={dictating} onClick={backToModels}><ArrowLeft size={18}/>{t.back}</button>
          <div className={styles.sessionHeaderInfo}>
            <p className={styles.eyebrow}>{coachingSessionTitle(session.schemeKey,lang,tr(session.name,lang))} · {t.free}</p>
            {!finished&&<div className={styles.progress}>
              <span>{entryStep==='questions'?t.stage+' '+(index+1)+' '+t.of+' '+session.questions.length:progressPosition+' / '+(session.questions.length+2)}</span>
              <div role="progressbar" aria-valuemin={0} aria-valuemax={session.questions.length+2}
                aria-valuenow={progressPosition} aria-label={t.stage}>
                <span style={{width:(progressPosition/(session.questions.length+2)*100)+'%'}}/>
              </div>
            </div>}
          </div>
        </header>
        <div className={styles.sessionScroll} ref={sessionScrollRef} tabIndex={-1}>
          {entryStep==='intro'?<CoachingSessionIntroduction locale={lang}
            name={coachingSessionTitle(session.schemeKey,lang,tr(session.name,lang))} modelName={tr(models.get(session.modelKey)?.name,lang)}
            minutes={session.minutes} questionCount={session.questions.length} style={session.style}
            approach={tr(models.get(session.modelKey)?.focus,lang)} outcome={tr(session.result,lang)}
            imageSrc={cardArtworkUrl(coachingSchemeArt[session.schemeKey]||coachingArt[session.modelKey]||coachingArt.grow_v1)} headingRef={titleRef}
             checkin={checkin} onCheckinChange={setCheckin}/>
          :entryStep==='topic'?<CoachingSessionTopic locale={lang} checkin={checkin} value={sessionTopic}
            onChange={value=>{setSessionTopic(value);setAdultAcknowledged(false)}} headingRef={titleRef}/>
          :requiresAdult&&!adultAcknowledged?
            <div className={styles.adultGate} data-coaching-age-confirm>
              <Image src={cardArtworkUrl(coachingArt.tantric_intimacy_v1)} alt="" aria-hidden="true"
                width={800} height={240} sizes="(max-width:600px) 100vw, 760px" unoptimized/>
              <h1>{t.adultTitle}</h1><p>{t.adultNotice}</p>
              <p className={styles.alert}>{t.adultSafety}</p>
              <button type="button" className={styles.primary} onClick={()=>setAdultAcknowledged(true)}>
                {t.adultConfirm}<ArrowRight size={17}/></button>
            </div>
          :finished?<div className={styles.finish} data-public-coaching-complete>
            <span className={styles.completed}><Check size={16}/>{t.completed}</span>
            <h1>{t.summary}</h1>
            <p className={styles.hint}>{t.date}: {coachingReportDate(finishedAt,lang)}</p>
            <div className={styles.summary}>
              {sessionTopic&&<p><strong>{t.yourTopic}:</strong> {coachingRequestTopicLabel(sessionTopic,lang)}</p>}
              {question.trim()&&<p><strong>{t.yourQuestion}:</strong> {question}</p>}
              {session.questions.map(item=><div key={item.id}><strong>{tr(item.prompt,lang)}</strong><p>{answerText(answers[item.id],item,lang,t)}</p>
                {reflections[item.id]?.text&&<p><em>{t.clarifyAnswer}:</em> {reflections[item.id].text}</p>}
              </div>)}
            </div>
            <CoachingActionPlan key={session.schemeKey||session.modelKey} locale={lang}
              initial={draftCoachingActionPlan(session.questions,answers,question,lang)}
              onSave={value=>{setApprovedPlan(value);return true}}/>
            <button type="button" className={styles.primary} data-coaching-download-pdf onClick={downloadReport}><Download size={17}/>{t.pdf}</button>
            {pdfError&&<p className={styles.alert} role="alert">{pdfError}</p>}
            <button type="button" className={styles.primary} onClick={copySummary}><ClipboardCopy size={17}/>{copied?t.copied:t.copy}</button>
            {copyError&&<><p className={styles.alert} role="alert">{t.copyFallback}</p>
              <textarea className={styles.copyFallback} readOnly value={summaryText()} rows={7}/></>}
            <button type="button" className={styles.secondary} onClick={backToModels}>{t.restart}</button>
            <p className={styles.disclaimer}><LockKeyhole size={14}/>{t.memory}</p>
          </div>:pendingFollowup?<div className={styles.questionScreen} data-public-coaching-followup>
            <p className={styles.stage}>{t.clarify}</p>
            <CoachingChatThread turn={followupTurn} locale={lang}>
              <h1 ref={titleRef} tabIndex={-1}>{tr(pendingFollowup.prompt,lang)}</h1>
            </CoachingChatThread>
            <p className={styles.hint}>{t.clarifyWhy}</p>
            {error&&<p className={styles.alert} role="alert">{error}</p>}
          </div>:<div className={styles.questionScreen} data-public-coaching-slide={current.id}>
            <p className={styles.stage}>{tr(current.stageTitle,lang)}</p>
            <div data-public-coaching-gentle-guide>
              <CoachingChatThread turn={conversationTurn} locale={lang}
                 draftPreview={quickChoices&&draft.startsWith('choice:')?answerText(draft,current,lang,t):''}>
                <h1 ref={titleRef} tabIndex={-1}>{tr(current.prompt,lang)}</h1>
              </CoachingChatThread>
            </div>
            {question.trim()&&<p className={styles.context}><strong>{t.yourQuestion}:</strong> {question}</p>}
             {needsCustomPlan&&<p className={styles.hint}>{t.plan}</p>}
             {quickChoices&&options.length>0&&!needsCustomPlan&&<div className={styles.quickReplies} data-coaching-quick-replies>
               <span className={styles.quickReplyCaption}>{t.choices}</span>
               <div className={styles.choices} data-scale={current.type==='scale_0_10'?'true':undefined}>
                 {options.map(option=><button type="button" key={option.id}
                   aria-pressed={draft==='choice:'+option.id} disabled={dictating}
                   onClick={()=>{setDraft('choice:'+option.id);setError('')}}>{tr(option.label,lang)}</button>)}
               </div>
             </div>}
             {!quickChoices&&draft.startsWith('choice:')&&<p className={styles.legacyChoice}>{answerText(draft,current,lang,t)}</p>}
             {error&&<p className={styles.alert} role="alert">{error}</p>}
          </div>}
        </div>
        {!finished&&(entryStep!=='questions'||!requiresAdult||adultAcknowledged)&&<footer className={styles.sessionFooter} data-coaching-messenger-footer={entryStep==='questions'?'true':undefined}>
          {entryStep==='questions'&&<div className={styles.messengerReply} data-coaching-composer>
            <div className={styles.replyHeading}>
              <label htmlFor="public-coaching-message">{pendingFollowup?t.clarifyAnswer:t.openAnswer}</label>
              <span>{lang==='ru'?'Ваше сообщение':lang==='es'?'Tu mensaje':'Your message'}</span>
            </div>
            <textarea id="public-coaching-message" className={styles.messageInput}
              aria-describedby={pendingFollowup?'public-coaching-followup-report-note':'public-coaching-report-note'}
              data-public-coaching-open-reflection={!pendingFollowup&&!quickChoices?'true':undefined} rows={2} maxLength={pendingFollowup?500:800}
              placeholder={t.answerPlaceholder}
              value={pendingFollowup?reflectionDraft:(draft.startsWith('choice:')?'':draft)}
              disabled={dictating}
              onChange={e=>{
                if(pendingFollowup)setReflectionDraft(e.target.value)
                else setDraft(e.target.value)
                setError('')
              }}/>
            <div className={styles.replyTools}>
              <CoachingQuestionVoice key={(pendingFollowup?'guest-followup-':'guest-question-')+current.id+'-'+lang}
                compact text={pendingFollowup?[followupTurn?.speech,tr(pendingFollowup.prompt,lang)].filter(Boolean).join(' '):[conversationTurn?.speech,tr(current.prompt,lang)].filter(Boolean).join(' ')}
                locale={lang} mode="answer" speechConsent={speechConsent} onConsent={()=>setSpeechConsent(true)}
                onListeningChange={setDictating}
                onTranscript={words=>{
                  if(pendingFollowup)setReflectionDraft(old=>appendSpokenAnswer(old,words,500))
                  else setDraft(old=>appendSpokenAnswer(old.startsWith('choice:')?'':old,words))
                  setError('')
                }}/>
              <details className={styles.reportDetails}>
                <summary>{lang==='ru'?'О сохранении и PDF':lang==='es'?'Privacidad y PDF':'Privacy & PDF'}</summary>
                {pendingFollowup
                  ?<p id="public-coaching-followup-report-note" data-coaching-save-report-notice>{t.reportNotice}</p>
                  :<p id="public-coaching-report-note" data-coaching-save-report-notice>{t.reportNotice}</p>}
              </details>
            </div>
            {dictating&&<p className={styles.dictationStatus} role="status">{t.stopMic}</p>}
          </div>}
          <div className={styles.sessionActions}>
            <button type="button" className={styles.secondary} disabled={dictating} onClick={moveBack}>{t.previous}</button>
            {entryStep==='intro'
              ?<button type="button" className={styles.primary} onClick={()=>setEntryStep('topic')}>{t.continueSession}<ArrowRight size={17}/></button>
              :entryStep==='topic'
              ?<button type="button" className={styles.primary} disabled={!sessionTopic} onClick={()=>setEntryStep('questions')}>{t.beginQuestions}<ArrowRight size={17}/></button>
              :pendingFollowup
              ?<button type="button" className={styles.primary} disabled={dictating} onClick={()=>finishFollowup(false)}>{t.clarifySave}<ArrowRight size={17}/></button>
              :<button type="button" className={styles.primary} disabled={dictating} onClick={()=>advance(false)}>{index===session.questions.length-1?t.finish:(lang==='ru'?'Отправить ответ':lang==='es'?'Enviar respuesta':'Send reply')}<ArrowRight size={17}/></button>}
          </div>
          {entryStep==='questions'&&pendingFollowup&&<button type="button" className={styles.followupSkip} disabled={dictating} onClick={()=>finishFollowup(true)}>{t.clarifySkip}</button>}
           {entryStep==='questions'&&requiresAdult&&!pendingFollowup&&<button type="button" className={styles.sensitiveSkip} disabled={dictating} onClick={()=>advance(true)}>{t.skipSensitive}</button>}
          <p className={styles.disclaimer}><LockKeyhole size={14}/>{t.memory}</p>
        </footer>}
      </section>}
    </div>
  </main>
}
