'use client'

import {useEffect,useRef,useState} from 'react'
import {flushSync} from 'react-dom'
import {appFetch,getCabinetBootstrap} from '@/lib/app/client-fetch'
import MyCoachContext from '@/components/app/my-coach-context'
import Link from 'next/link'
import {ArrowLeft,ChevronDown,ArrowRight,Heart,Home,Keyboard,Leaf,Languages,LockKeyhole,MessageCircle,Pencil,Send,ShieldCheck,Sparkles,Target,UserRound,Video,Volume2,Play,LoaderCircle,Zap,Download,Printer,FileText,Maximize2,Minimize2,Pause,PhoneOff,VolumeX,Plus} from 'lucide-react'
import {getCoachPersona,localCoachText,coachStagePrompt,resolveCoachMethodId} from '@/lib/coaching/persona-registry.mjs'
import {getCoachPresentation} from '@/lib/coaching/persona-presentations.mjs'
import {coachTimeboxState,coachMinuteRuler} from '@/lib/coaching/session-timebox.mjs'
import {createCoachActiveClock} from '@/lib/coaching/coach-active-clock.mjs'
import {coachingBrainSafety,coachingBrainBoundary,coachingBrainStageDecision,offlineCoachingBrainReply,selectCoachingBrainMethod} from '@/lib/personal-coaching/coaching-brain.mjs'
import {classifyWisdomRequest} from '@/lib/coaching/wisdom-retrieval.mjs'
import {coachTurnWindow} from '@/lib/coaching/coach-turn-window.mjs'
import {coachAudibleTurns,coachProviderHistory,markLatestCoachReplyInterrupted} from '@/lib/coaching/coach-audible-history.mjs'
import {coachEphemeralContext} from '@/lib/coaching/coach-ephemeral-context.mjs'
import {coachModelProbeRetryAllowed} from '@/lib/coaching/coach-model-recovery.mjs'
import {coachSessionVisibleStageIds} from '@/lib/coaching/coach-session-progress.mjs'
import {openingStagePosition,profileStagePosition,methodStagePosition,courseStagePosition,savedProfileStagePosition,openingCapturedAnswers,courseCapturedRows,groupedSessionPosition,boundTranscriptReview} from '@/lib/coaching/coach-session-stage-view.mjs'
import {checkpointQuestionMatches,checkpointConfirmationMatches} from '@/lib/coaching/coach-course-question-binding.mjs'
import {protocolAnswerClass} from '@/lib/coaching/coach-protocol-validation-gate.mjs'
import {COACH_PROFILE_AXES} from '@/lib/coaching/coach-profile-intake.mjs'
import {coachSessionOpeningLine,coachOpeningProgress,coachOpeningProtocolSnapshot} from '@/lib/coaching/coach-opening-protocol.mjs'
import {coachProfileProgress,coachProfileProtocolSnapshot} from '@/lib/coaching/coach-profile-intake.mjs'
import {COACH_PROFILE_REVIEW_VERSION,coachProfileReviewProgress,coachProfileReviewNextReply,
  coachProfileReviewProtocolSnapshot} from '@/lib/coaching/coach-profile-review.mjs'
import {coachOpeningTurn} from '@/lib/coaching/coach-opening-entry.mjs'
import {coachGoalTurn} from '@/lib/coaching/goal-turn.mjs'
import {understandCoachingTurn} from '@/lib/personal-coaching/coaching-turn-understanding.mjs'
import styles from './my-coach-live-dialogue.module.css'
import callStyles from './my-coach-call-dock.module.css'
import MyCoachSpeechLoop from './my-coach-speech-loop'
import MyCoachGeminiLive from './my-coach-gemini-live'
import MyCoachStagedMemoryControls from './my-coach-staged-memory-controls'
import MyCoachSessionStateCard from './my-coach-session-state-card'
import {startCoachingMp3Playback,unlockCoachingAudioContext,shouldUseCoachingWebAudio} from '@/lib/personal-coaching/streamed-mp3-playback.mjs'
import {setCoachIos27AudioSession,refreshCoachIos27PlaybackRoute} from '@/lib/personal-coaching/coach-ios-audio-route.mjs'
import {coachSpokenText} from '@/lib/coaching/coach-spoken-text.mjs'
import {readCoachTurnStream} from '@/lib/coaching/coach-stream-client.mjs'
import {coachLooksLikeProtocolText} from '@/lib/coaching/coach-stream-format.mjs'
import {coachGeminiVoiceOptions,approvedGeminiVoice,lockedCoachSessionVoice} from '@/lib/coaching/gemini-voice-catalog.mjs'
import {detectedSpeechLocale} from '@/lib/personal-coaching/my-coach-dictation.mjs'
import {coachSessionOpeningAudioPath,startDirectCoachIntroAudio} from '@/lib/personal-coaching/direct-coach-intro-audio.mjs'
import CoachingAvatar from '@/components/app/coaching-avatar'
import MyCoachMotionMedia from '@/components/my-coach-motion-media'
import MyCoachGreetingGate from './my-coach-greeting-gate'
import {markCoachGreetingConnected} from '@/lib/coaching/coach-greeting-visit.mjs'
import MyCoachCourseJourney from './my-coach-course-journey'
import {DEFAULT_COACH_COURSE_SESSION_ID,INTRODUCTORY_COACH_SESSION_ID,coachCourseFocusLabel,COACH_PROGRAM_GROUPS} from '@/lib/coaching/coach-course-journey.mjs'
import MyCoachCompactProfile,{MyCoachInlineProfile} from './my-coach-compact-profile'
import {selectCoachVisualScene} from '@/lib/coaching/coach-visual-cues.mjs'
import {coachReactionIntent,coachExplicitFarewell} from '@/lib/coaching/coach-reaction-director.mjs'
import useCoachReactionActivity from './use-coach-reaction-activity'
import {downloadCoachingSessionPdf,openCoachingSessionPdf} from '@/lib/personal-coaching/session-pdf'
import {myCoachProtocolPdfOptions,normalizeMyCoachProtocol} from '@/lib/personal-coaching/session-protocol.mjs'
import MyCoachCourseFieldReview from './my-coach-course-field-review'
import MyCoachCourseGateVoice from './my-coach-course-gate-voice'
import MyCoachResultPreview from './my-coach-result-preview'
import {coachCourseProtocolRows,coachCourseProtocolSchema,normalizeCoachCourseFieldReview,coachCourseGateHandoffRequired} from '@/lib/coaching/coach-course-protocol-schema.mjs'
import {normalizeMyCoachDraft} from '@/lib/personal-coaching/protocol-draft.mjs'
import {coachProfileArchiveEnvelope} from '@/lib/coaching/coach-profile-archive-v3.mjs'
import {coachProfileTrackForCourse,MEANING_AXES_COACH_SESSION_ID} from '@/lib/coaching/coach-profile-session-v3.mjs'
import MyCoachCourseProgress from './my-coach-course-progress'
import {coachSavedProfileV3,coachSavedProfileV3Text} from '@/lib/coaching/coach-profile-report-v3.mjs'
import {recoverPrivateOpeningScope} from '@/lib/personal-coaching/private-draft-resume.mjs'
import {createCoachDraftQueue} from '@/lib/personal-coaching/protocol-draft-queue.mjs'
import {coachProtocolCanAppend,coachProtocolRoomForExchange} from '@/lib/personal-coaching/protocol-capture.mjs'

const copy={
  en:{
    badge:'Generative AI dialogue · when available',title:'Let’s talk',
    disclosure:'I’m a fictional AI coach, not a therapist. Choose a goal, a challenge, or an optional short personal profile. You set the pace.',
    consent:'I agree to send this conversation text to GroqCloud GPT-OSS (only after the site verifies the free tier and account-level Zero Data Retention), or a verified free OpenRouter fallback. Nothing is sent until I press Send or start voice mode. Browser speech recognition may send microphone audio to its provider. Do not share passwords or document numbers.',
    field:'Your message',placeholder:'What’s on your mind?…',
    send:'Send',sending:'Thinking…',verifying:'Checking the free model before sending any personal text…',verified:'Free privacy-checked AI is ready.',user:'You',coach:'AI coach',ai:'Model response',wisdom:'Wisdom Library',offline:'Offline coaching question',crisis:'Safety pause',
    plan:'Possible next step — your choice',evidence:'Based on your words',back:'Back to coach',guided:'Use the guided session instead',
    privacy:'Guest conversation history stays in this tab. With your consent, brief earlier client statements may accompany later messages to the selected AI provider. For verified accounts, session text is automatically saved privately when you start a session. A separately confirmed step can be saved in a private session.',
    login:'Please sign in to Holistic House before using the live model.',loginLink:'Open sign in',
    error:'Unable to reach the AI coach. Your message was not sent. Please retry.',
    unavailable:'AI is unavailable right now. The question below is authored, not generated by a model.',
    disabled:'Generative AI is not enabled on the server.',config:'The AI service is not configured.',limit:'The free model limit has been reached.',
    protected:'No eligible free model with verified privacy routing is available.',cost:'Zero-cost processing could not be verified.',
    failed:'The model reply could not be validated.',retry:'AI service temporarily unavailable.',goal:'Start by telling me your goal.',
  },
  ru:{
    badge:'Генеративный AI-диалог · при доступности модели',title:'Давай поговорим',
    disclosure:'Я AI-персонаж, не психотерапевт. Вы сами выбираете: цель, проблема или короткий личный профиль — в комфортном темпе.',
    consent:'Я согласен(на) отправлять текст этого разговора в GroqCloud GPT-OSS (только после проверки бесплатного тарифа и Zero Data Retention для аккаунта) либо в проверенную бесплатную модель OpenRouter. До нажатия «Отправить» или начала голосового режима ничего не передаётся. Браузер может отправлять звук поставщику распознавания речи. Не вводите пароли и номера документов.',
    field:'Ваше сообщение',placeholder:'Что сейчас у вас на уме?…',
    send:'Отправить',sending:'Думаю…',verifying:'Проверяем бесплатную модель без передачи ваших сообщений…',verified:'Бесплатная AI-модель проверена и готова.',user:'Вы',coach:'AI-коуч',ai:'Ответ модели',wisdom:'Библиотека мудрости',offline:'Офлайн-вопрос коуча',crisis:'Пауза для безопасности',
    plan:'Возможный следующий шаг — решаете вы',evidence:'Основание — ваши слова',back:'Назад к коучу',guided:'Пройти пошаговую программу',
    privacy:'История гостевого диалога хранится только в этой вкладке. С вашего согласия короткие выдержки из ранних сообщений могут передаваться AI-модели вместе с новыми репликами. Для подтверждённых аккаунтов текст сессии автоматически сохраняется в личном кабинете после начала сессии. Шаг сохраняется только после отдельного подтверждения.',
    login:'Для общения с AI-моделью сначала войдите в Holistic House.',loginLink:'Открыть вход',
    error:'Не удалось получить ответ. Сообщение не было отправлено. Повторите попытку.',
    unavailable:'AI сейчас недоступен. Вопрос ниже подготовлен заранее, а не сгенерирован моделью.',
    disabled:'Генеративный AI не включён на сервере.',config:'AI-сервис не настроен.',limit:'Лимит бесплатной модели исчерпан.',
    protected:'Нет подходящей бесплатной модели с подтверждённой защитой данных.',cost:'Не удалось подтвердить нулевую стоимость ответа.',
    failed:'Ответ AI не прошёл проверку.',retry:'AI временно недоступен.',goal:'Начните с цели разговора.',
  },
  es:{
    badge:'Diálogo generativo de IA · sujeto a disponibilidad',title:'Hablemos',
    disclosure:'Soy un coach ficticio de IA, no terapeuta. Puedes explorar una meta, un problema o crear un perfil personal breve, a tu ritmo.',
    consent:'Consiento enviar el texto de este diálogo a GroqCloud GPT-OSS (solo tras verificar el nivel gratuito y Zero Data Retention de la cuenta) o a un modelo gratuito verificado de OpenRouter. No se envía nada hasta pulsar Enviar o iniciar el modo de voz. El navegador puede procesar mi voz. No incluyas contraseñas ni números de documentos.',
    field:'Tu mensaje',placeholder:'¿Qué tienes en mente?…',
    send:'Enviar',sending:'Pensando…',verifying:'Verificando el modelo gratuito sin enviar tus mensajes…',verified:'El modelo gratuito con privacidad verificada está listo.',user:'Tú',coach:'Coach IA',ai:'Respuesta del modelo',wisdom:'Biblioteca de sabiduría',offline:'Pregunta preparada',crisis:'Pausa de seguridad',
    plan:'Posible siguiente paso — tú decides',evidence:'Basado en tus palabras',back:'Volver al coach',guided:'Usar sesión guiada',
    privacy:'El historial de invitado permanece solo en esta pestaña. Con tu consentimiento, fragmentos anteriores de tus propias palabras pueden acompañar los nuevos mensajes enviados al proveedor de IA. En cuentas verificadas, el texto se guarda automáticamente en privado al iniciar la sesión.',
    login:'Inicia sesión en Holistic House antes de usar el modelo IA.',loginLink:'Abrir acceso',
    error:'No se obtuvo respuesta. Tu mensaje no se envió. Puedes reintentar.',
    unavailable:'La IA no está disponible. Esta pregunta es preparada, no generada por un modelo.',
    disabled:'La IA generativa no está activada.',config:'El servicio IA no está configurado.',limit:'Se agotó el límite del modelo gratuito.',
    protected:'No hay un modelo gratuito con privacidad verificada.',cost:'No se pudo verificar que el coste sea cero.',
    failed:'La respuesta IA no pasó la validación.',retry:'El servicio IA está temporalmente inaccesible.',goal:'Comienza por tu objetivo.',
  },
}
// Speech services receive only their minimum necessary data after a real
// Play gesture. Keep full disclosures in the optional Privacy details.
const avatarVisuals={
  mira:'warm',max:'clear',sofia:'calm',alex:'clear',merlin:'calm',harry:'clear',genie:'warm',caesar:'clear',
  lea:'calm',noah:'warm',iris:'warm',ray:'clear',
}
const avatarNotice={
  en:'Animated 2D coach · device voice, not a video call.',
  ru:'Анимированный 2D-коуч · голос устройства, не видеозвонок.',
  es:'Coach animado en 2D · voz del dispositivo, no videollamada.',
}

const sessionUi={
en:{choose:'Choose another coach',mode:'AI COACH · LIVE DIALOGUE',step:'Step',of:'of',topics:'What would you like to explore?',stress:'Relieve stress',energy:'Restore energy',relationships:'Improve relationships',goal:'My goal',goalPlaceholder:'Add or edit your goal…',type:'Write a message',keyboardShort:'Text',captions:'Toggle subtitles',captionsShort:'CC',replayShort:'Replay',end:'End session',replay:'Hear the coach reply',voice:'Start voice conversation',home:'Home',coaching:'My Coach',practice:'Practices',video:'Video',profile:'Profile',disclosure:'A fictional AI coach, not a therapist. For verified accounts, the session text is saved privately; guest sessions remain in this tab.',guided:'Use the guided session instead',stages:['Clarify','Explore','Awareness','New perspective','Options','Next step'],stageQuestion:'Conversation progress',safety:'Safety pause',chooseTopic:'Choose a topic to add it to your draft. Nothing is sent until you press Send.',typedGoal:'Your goal is added to your next sent message (text or voice). It is saved privately with your session if your account is verified.',goalDeferred:'Your goal was not included because the message is too long; it can be included with a shorter next message.'},
ru:{choose:'Выбрать другого коуча',mode:'AI-КОУЧ · ЖИВОЙ ДИАЛОГ',step:'Шаг',of:'из',topics:'Что хотите исследовать?',stress:'Снизить стресс',energy:'Вернуть энергию',relationships:'Улучшить отношения',goal:'Моя цель',goalPlaceholder:'Добавьте или измените цель…',type:'Написать сообщение',keyboardShort:'Текст',captions:'Переключить субтитры',captionsShort:'CC',replayShort:'Повтор',end:'Завершить сессию',replay:'Прослушать ответ коуча',voice:'Начать голосовой разговор',home:'Главная',coaching:'Мой коуч',practice:'Практики',video:'Видео',profile:'Профиль',disclosure:'Вымышленный AI-коуч, не психотерапевт. Текст сессии подтверждённого аккаунта сохраняется приватно; гостевой диалог остаётся в этой вкладке.',guided:'Перейти к пошаговой сессии',stages:['Прояснение','Исследование','Осознание','Новый взгляд','Варианты','Следующий шаг'],stageQuestion:'Прогресс разговора',safety:'Пауза для безопасности',chooseTopic:'Выберите тему — она добавится в черновик. Ничего не отправится без нажатия «Отправить».',typedGoal:'Цель добавится в ваше следующее отправленное сообщение (текстом или голосом). При подтверждённом аккаунте она сохраняется приватно вместе с сессией.',goalDeferred:'Цель не добавлена: сообщение слишком длинное. Она может войти в следующее короткое сообщение.'},
es:{choose:'Elegir otro coach',mode:'COACH IA · DIÁLOGO EN VIVO',step:'Paso',of:'de',topics:'¿Qué te gustaría explorar?',stress:'Reducir el estrés',energy:'Recuperar energía',relationships:'Mejorar relaciones',goal:'Mi objetivo',goalPlaceholder:'Añade o edita tu objetivo…',type:'Escribir mensaje',keyboardShort:'Texto',captions:'Activar o desactivar subtítulos',captionsShort:'CC',replayShort:'Repetir',end:'Terminar sesión',replay:'Escuchar la respuesta',voice:'Iniciar conversación por voz',home:'Inicio',coaching:'Mi coach',practice:'Prácticas',video:'Vídeo',profile:'Perfil',disclosure:'Coach ficticio de IA, no terapeuta. El texto de la sesión se guarda en privado en cuentas verificadas; las sesiones de invitado permanecen en esta pestaña.',guided:'Usar la sesión guiada',stages:['Aclarar','Explorar','Conciencia','Nueva perspectiva','Opciones','Siguiente paso'],stageQuestion:'Progreso de la conversación',safety:'Pausa de seguridad',chooseTopic:'Elige un tema para añadirlo al borrador. Nada se envía hasta pulsar Enviar.',typedGoal:'Tu objetivo se añadirá al próximo mensaje que envíes (por texto o voz). Se guarda en privado con tu sesión si tu cuenta está verificada.',goalDeferred:'El objetivo no se incluyó porque el mensaje es demasiado largo; podrás enviarlo en uno más corto.'}
}
const methodStepTitles={
  en:{
    topic:'Choose a topic',goal:'Clarify the goal',reality:'Explore the situation',options:'Explore possibilities',
    way_forward:'Choose a next step',review:'Reflect and review',wish:'Name a wish',outcome:'Desired outcome',
    internal_obstacle:'Inner obstacle',if_then:'If–then plan',scaling:'Where you are now',
    know_how:'What already helps',affirm_action:'Chosen action',preferred_future:'Preferred future',
    exceptions:'When it worked',strengths:'Strengths',experiment:'Small experiment',
    discover:'Discover',dream:'Imagine',design:'Create options',deliver:'Put into practice',
    complete:'Summary confirmed'
  },
  ru:{
    topic:'Выбор темы',goal:'Прояснение цели',reality:'Исследование ситуации',options:'Поиск возможностей',
    way_forward:'Выбор следующего шага',review:'Подведение итогов',wish:'Ваше желание',
    outcome:'Желаемый результат',internal_obstacle:'Внутреннее препятствие',if_then:'План «если — то»',
    scaling:'Оценка состояния',know_how:'Что уже помогает',affirm_action:'Выбранное действие',
    preferred_future:'Желаемое будущее',exceptions:'Когда уже получалось',
    strengths:'Ваши ресурсы',experiment:'Малый эксперимент',
    discover:'Исследование',dream:'Образ будущего',design:'Варианты решений',
    deliver:'Переход к действию',complete:'Итоги подтверждены'
  },
  es:{
    topic:'Elegir el tema',goal:'Aclarar el objetivo',reality:'Explorar la situación',options:'Explorar opciones',
    way_forward:'Elegir un paso',review:'Reflexión final',wish:'El deseo',outcome:'Resultado deseado',
    internal_obstacle:'Obstáculo interior',if_then:'Plan si–entonces',scaling:'Situación actual',
    know_how:'Lo que ya ayuda',affirm_action:'Acción elegida',preferred_future:'Futuro preferido',
    exceptions:'Cuando funcionó',strengths:'Fortalezas',experiment:'Pequeño experimento',
    discover:'Descubrir',dream:'Imaginar',design:'Diseñar opciones',deliver:'Poner en práctica',
    complete:'Resumen confirmado'
  }
}
const stageProgressHelp={
  en:'Stages advance when your own answers support the next method step, not because time passed or the coach spoke.',
  ru:'Этап меняется, когда ваши ответы подтверждают следующий шаг методики, а не из-за времени или слов коуча.',
  es:'Los pasos cambian cuando tus respuestas sustentan el siguiente paso del método, no por el tiempo ni por lo que diga el coach.'
}

const semanticStageTitles={
 en:{contact:'Contact & request',goal:'Goal',reality:'Reality',options:'Possibilities',integration:'Decision & integration'},
 ru:{contact:'Контакт и запрос',goal:'Цель',reality:'Реальность',options:'Возможности',integration:'Решение и интеграция'},
 es:{contact:'Contacto y solicitud',goal:'Objetivo',reality:'Realidad',options:'Posibilidades',integration:'Decisión e integración'}
}
const coachMethodNames={
 grow:'GROW',tgrow:'T-GROW',woop:'WOOP',oskar:'OSKAR',
 solution_focused:'Solution-focused',appreciative_inquiry:'Appreciative inquiry'
}
const transcriptUi={
  en:{heading:'Conversation · transcript',listening:'Listening',languageLabel:'Speech and coach voice language',autoLanguage:'Auto · device/context',hint:'Your spoken words will appear here. Or type your reply below.',consentShort:'I agree to send my text to the eligible free AI; browser recognition may process my voice.',details:'Privacy and data processing'},
  ru:{heading:'Диалог · расшифровка',listening:'Слушаю',languageLabel:'Язык расшифровки и голоса коуча',autoLanguage:'Авто · устройство/контекст',hint:'Здесь появятся ваши слова. Можно также написать ответ ниже.',consentShort:'Согласен(на) отправлять текст бесплатной AI-модели; браузер может обрабатывать мой голос.',details:'Приватность и обработка данных'},
  es:{heading:'Diálogo · transcripción',listening:'Escuchando',languageLabel:'Idioma de transcripción y voz del coach',autoLanguage:'Auto · dispositivo/contexto',hint:'Aquí aparecerán tus palabras. También puedes escribir abajo.',consentShort:'Acepto enviar mi texto a la IA gratuita; el navegador puede procesar mi voz.',details:'Privacidad y procesamiento'},
}
const geminiTextPrivacyDetails={
  ru:{free:'Вы отдельно соглашаетесь передавать текст этого диалога в Gemini Free. В бесплатном API Google может использовать содержание для улучшения моделей. При отказе текст не отправляется. Без автоматического перехода на платный тариф.',
    paid:'Текст этого разговора передаётся в Gemini Paid только после вашего согласия. По условиям платного API Google не использует отправленный контент для улучшения моделей. Расходы ограничены на сервере; автоматической смены тарифа нет.'},
  en:{free:'You separately consent to sending this dialogue text to Gemini Free. Google may use Free API content to improve its models. No content is sent until you consent; no automatic upgrade to Paid.',
    paid:'This conversation text goes to Gemini Paid only with your consent. Paid API content is not used to improve Google models. Server request caps apply; no automatic tier switch.'},
  es:{free:'Aceptas enviar este texto a Gemini gratuito. Google puede usar el contenido del nivel gratuito para mejorar sus modelos. Sin consentimiento no se envía el texto ni se cambia al plan de pago.',
    paid:'Este texto se envía a Gemini de pago solo con tu consentimiento. Google no lo usa para mejorar sus modelos. Hay límites de solicitudes y no se cambia automáticamente de plan.'},
}
const geminiVoicePrivacyDetails={
  ru:'При Play для распознавания микрофона могут использоваться браузер или Groq Whisper. Holistic House не сохраняет запись. Проверенный текст ответа коуча отправляется отдельно в выбранный Gemini TTS для озвучивания; бесплатный режим может использовать данные для улучшения моделей, платный — нет. В запросах к Interactions API отключено сохранение взаимодействий.',
  en:'On Play, microphone speech may be transcribed by the browser or Groq Whisper; Holistic House does not store the recording. Separately consented validated coach replies go to the chosen Gemini TTS for speech. Free API data may be used to improve models; Paid API data is not. Interactions API storage is disabled.',
  es:'Al pulsar Play, el navegador o Groq Whisper pueden transcribir el micrófono; Holistic House no guarda la grabación. Las respuestas validadas se envían a Gemini TTS seleccionado con consentimiento. El nivel gratuito puede usar datos para mejorar modelos y el de pago no. El almacenamiento de Interactions está desactivado.',
}
const voiceProviderDetails={
  en:'Play starts the conversation. On iPhone Safari, each short spoken answer may be sent to Groq Whisper under the verified free quota to transcribe, without storage by Holistic House. The audio provider has its own privacy policy. Browser speech recognition may process microphone audio. If a natural voice is available, coach-generated text is sent to Google Chirp or Fish Audio; Fish may use the text to train models. Holistic House does not store a microphone recording.',
  ru:'Нажатие Play начинает диалог. На iPhone Safari короткие голосовые ответы могут передаваться в Groq Whisper для расшифровки в пределах подтверждённого бесплатного лимита. Holistic House не сохраняет аудио; у провайдера своя политика конфиденциальности. Браузер может обрабатывать звук микрофона для распознавания речи. При доступности естественного голоса текст коуча передаётся Google Chirp или Fish Audio; Fish может использовать текст для обучения моделей. Holistic House не сохраняет запись микрофона.',
  es:'Play inicia el diálogo. En iPhone Safari, las respuestas breves pueden enviarse a Groq Whisper para transcribirlas dentro de la cuota gratuita verificada. Holistic House no almacena el audio; el proveedor tiene su propia política de privacidad. El navegador puede procesar el micrófono para reconocer voz. Si hay voz natural disponible, el texto del coach se envía a Google Chirp o Fish Audio; Fish puede usar ese texto para entrenar modelos. Holistic House no guarda ninguna grabación del micrófono.',
}
const voiceGateText={
 en:{title:'Before voice conversation',cancel:'Not now',agree:'Agree and talk',tapToHear:'Tap to hear the coach',playbackUnavailable:'Audio playback is unavailable in this browser. Try Safari or use text.',naturalUnavailable:'Quality coach voice is temporarily unavailable. Try again or type your message.'},
 ru:{title:'Перед голосовым разговором',cancel:'Не сейчас',agree:'Согласен и начать',tapToHear:'Нажмите, чтобы услышать коуча',playbackUnavailable:'В этом браузере не работает озвучивание. Попробуйте Safari или текстовый диалог.',naturalUnavailable:'Качественный голос коуча временно недоступен. Попробуйте ещё раз или напишите сообщение.'},
 es:{title:'Antes de hablar por voz',cancel:'Ahora no',agree:'Aceptar y hablar',tapToHear:'Toca para escuchar al coach',playbackUnavailable:'La reproducción de voz no está disponible aquí. Prueba Safari o escribe.',naturalUnavailable:'La voz natural del coach no está disponible ahora. Vuelve a intentarlo o escribe.'},
}
const keyInfoCopy={
  en:{title:'Key Information',show:'Show key information',hide:'Hide key information',finish:'Session Insight',goal:'Goal / Result',motivation:'Motivation',obstacles:'Obstacles',resources:'Resources',situation:'Current Situation',nextSteps:'Next Steps',complete:'Captured',partial:'Partly clarified',missing:'Not yet clarified'},
  ru:{title:'Ключевая информация',show:'Показать ключевую информацию',hide:'Скрыть ключевую информацию',finish:'Инсайт сессии',goal:'Цель / Результат',motivation:'Мотивация',obstacles:'Препятствия',resources:'Ресурсы',situation:'Текущая ситуация',nextSteps:'Следующие шаги',complete:'Получено',partial:'Частично',missing:'Не выяснено'},
  es:{title:'Información clave',show:'Mostrar información clave',hide:'Ocultar información clave',finish:'Insight de sesión',goal:'Objetivo / Resultado',motivation:'Motivación',obstacles:'Obstáculos',resources:'Recursos',situation:'Situación actual',nextSteps:'Próximos pasos',complete:'Recogido',partial:'Parcial',missing:'Sin aclarar'}
}
const protocolCopy={
  en:{title:'Your session protocol',subtitle:'Review and keep a private record of the conversation.',turns:'Recorded exchanges',empty:'No completed conversation turns to include yet.',download:'Download PDF',print:'Print / Open PDF',save:'Save in my private account',saving:'Saving…',saved:'Saved privately to your account',consent:'I agree to save this complete text dialogue in my private Holistic House account. Audio is not stored.',consentRequired:'Tick the box to save your protocol.',error:'Could not save this report. Download the PDF instead or try again.',pdfError:'Could not create the PDF. Your dialogue is still visible in this tab.',close:'Back to coaches',resume:'Continue conversation',privacy:'Only the conversation shown here is exported. AI suggestions are not confirmed decisions. No recording or hidden AI reasoning is included.',unsent:'There is an unfinished message or reply. Finish it before ending the session.',limit:'The dialogue is full. Finish and export the protocol before continuing.'},
  ru:{title:'Протокол вашей коучинг-сессии',subtitle:'Проверьте диалог и сохраните его для себя.',turns:'Реплики в протоколе',empty:'Пока нет завершённых реплик для протокола.',download:'Скачать PDF',print:'Распечатать / открыть PDF',save:'Сохранить в личном кабинете',saving:'Сохраняем…',saved:'Протокол сохранён в личном кабинете',consent:'Я согласен(на) сохранить весь текст этого диалога в личном кабинете Holistic House. Аудиозапись не сохраняется.',consentRequired:'Для сохранения в кабинете отметьте согласие.',error:'Не удалось сохранить отчёт. Скачайте PDF либо повторите попытку.',pdfError:'Не удалось создать PDF. Диалог остаётся в этой вкладке.',close:'Вернуться к коучам',resume:'Продолжить беседу',privacy:'В протокол попадают только отображённые здесь реплики. Предложения ИИ не считаются подтверждёнными решениями. Аудиозапись и скрытые рассуждения ИИ не включены.',unsent:'Есть незавершённая реплика. Дождитесь окончания ответа, затем завершите сессию.',limit:'Достигнут лимит реплик. Завершите сессию и сохраните протокол.'},
  es:{title:'Protocolo de tu sesión',subtitle:'Revisa y conserva una copia privada del diálogo.',turns:'Intervenciones guardadas',empty:'Aún no hay intervenciones terminadas.',download:'Descargar PDF',print:'Imprimir / abrir PDF',save:'Guardar en mi cuenta privada',saving:'Guardando…',saved:'Protocolo guardado en tu cuenta',consent:'Acepto guardar el texto completo del diálogo en mi cuenta privada de Holistic House. No se guarda audio.',consentRequired:'Acepta para guardar el protocolo.',error:'No fue posible guardar. Descarga el PDF o vuelve a intentarlo.',pdfError:'No se pudo crear el PDF. Tu diálogo sigue en esta pestaña.',close:'Volver a los coaches',resume:'Continuar hablando',privacy:'Solo se incluye el diálogo visible. Las sugerencias de IA no son decisiones confirmadas. No se incluye audio ni razonamiento oculto.',unsent:'Hay un turno sin terminar. Termínalo antes de cerrar.',limit:'Se alcanzó el límite de turnos. Termina y exporta el protocolo.'}
}
const quickTopics=[{id:'stress',icon:Leaf,art:'stones'},{id:'energy',icon:Zap,art:'sunrise'},{id:'relationships',icon:Heart,art:'lotus'}]
// Stationary without real microphone samples; bars respond only to input RMS.
const microphoneWaveGains=Object.freeze([.28,.36,.45,.57,.78,.64,.49,.74,.95,1.12,.81,.55,.39,.62,.87,1.05,.88,.68,.53,.72,.9,.59,.44,.33,.26])

const reasons={
  feature_disabled:'disabled',server_not_configured:'config',rate_limited:'limit',
  privacy_model_unavailable:'protected',cost_unverified:'cost',
  response_unverified:'failed',model_unavailable:'retry',
}
// Metadata-only read: never send a session transcript or microphone audio.
async function readGeminiEngineStatus(signal){
  try{
    const response=await fetch('/api/app/my-coach/engines',{
      credentials:'same-origin',cache:'no-store',signal,
    })
    if(response.status===401)return {kind:'login'}
    if(!response.ok)return {kind:'unavailable'}
    const data=await response.json().catch(()=>null)
    if(data?.schema!=='HH_MY_COACH_ENGINES_V1')return {kind:'unavailable'}
    return {kind:'ok',capabilities:{
      gemini_free:data.gemini_free===true,gemini_paid:data.gemini_paid===true,
      gemini_tts_free:data.gemini_tts_free===true,
      gemini_tts_paid:data.gemini_tts_paid===true,
      gemini_live_free:data.gemini_live_free===true,
    }}
  }catch{return {kind:'unavailable'}}
}

const assistantText=(result)=>result.mode==='ai'
  ? typeof result.message==='string'&&!coachLooksLikeProtocolText(result.message)?result.message:''
  : [result.reflection,result.hypothesis,result.question].filter(Boolean).join('\n\n')

const sessionRatingCopy={
  en:{title:'How was your coach?',subtitle:'Your feedback helps improve future sessions.',character:'Character',intelligence:'Intelligence',impression:'Overall impression',send:'Send rating',sending:'Saving…',saved:'Thank you — your rating was saved privately.',error:'Could not save your rating. You can retry or skip.',skip:'Skip',done:'Done',stars:'Overall rating',privacy:'Only numeric ratings are saved in your private account. No conversation text or audio is sent.'},
  ru:{title:'Оцените работу коуча',subtitle:'Ваш отзыв помогает улучшать коучинг.',character:'Характер',intelligence:'Интеллект',impression:'Общее впечатление',send:'Отправить оценку',sending:'Сохраняем…',saved:'Спасибо! Ваша оценка сохранена приватно.',error:'Не удалось сохранить оценку. Можно повторить или пропустить.',skip:'Пропустить',done:'Готово',stars:'Оценка коуча',privacy:'В вашем закрытом профиле сохраняются только числовые оценки — без текста разговора и аудио.'},
  es:{title:'Valora a tu coach',subtitle:'Tu opinión ayuda a mejorar las sesiones.',character:'Carácter',intelligence:'Inteligencia',impression:'Impresión general',send:'Enviar valoración',sending:'Guardando…',saved:'Gracias. Se guardó tu valoración de forma privada.',error:'No se pudo guardar. Puedes reintentar u omitir.',skip:'Omitir',done:'Listo',stars:'Valoración del coach',privacy:'Solo se guardan números en tu cuenta privada; no se envían conversaciones ni audio.'},
}

export default function MyCoachLiveDialogue({locale='en',personaId='mira',settings={},methodPreference,onClose,onGuided,initialGoalCourseId=null}){
  const lang=copy[locale]?locale:'en',t=copy[lang]
  const persona=getCoachPersona(personaId)
  const [draft,setDraft]=useState('')
  const [viewExpanded,setViewExpanded]=useState(false)
  // Public greeting remains a separate, free pre-session screen. No Google
  // token, microphone or coaching clock starts until the user opts in.
  const [greetingAccepted,setGreetingAccepted]=useState(false)
  const [selectedMethod,setSelectedMethod]=useState(()=>methodPreference&&resolveCoachMethodId(personaId,methodPreference)||'')
  const [methodSession,setMethodSession]=useState(null)
  const methodHandshake=useRef(null)
  const [coachProfileOpen,setCoachProfileOpen]=useState(false)
  const coachProfileOpenRef=useRef(false)
  const [speechPreview,setSpeechPreview]=useState('')
  const [streamingPreview,setStreamingPreview]=useState('')
  // Native duplex Gemini Live is the preferred coach; no mic opens on mount.
  const [coachEngine,setCoachEngine]=useState('gemini_live_free')
  const engineManuallySelectedRef=useRef(false)
  const [geminiCapabilities,setGeminiCapabilities]=useState({
    gemini_free:false,gemini_paid:false,gemini_tts_free:false,gemini_tts_paid:false,
    gemini_live_free:false,
  })
  const geminiAvailabilityInFlightRef=useRef(false)
  const [geminiConsent,setGeminiConsent]=useState(false)
  const [geminiLiveConsent,setGeminiLiveConsent]=useState(false)
  const [liveDirectorProgress,setLiveDirectorProgress]=useState(null)
  const [geminiVoiceTier,setGeminiVoiceTier]=useState('existing')
  const [geminiVoiceConsent,setGeminiVoiceConsent]=useState(false)
  // Explicit auditions are scoped by both persona and language; defaults are owner-approved.
  const [geminiVoiceByLocale,setGeminiVoiceByLocale]=useState({})
  const [streamingReady,setStreamingReady]=useState(false)
  const [cloudAvailable,setCloudAvailable]=useState(false)
  const [cloudAgreed,setCloudAgreed]=useState(false)
  const [cloudProvider,setCloudProvider]=useState(null)
  // Route language is authoritative on entry; the visitor may explicitly
  // switch languages without changing the rest of the site's navigation.
  // Never silently pick the iPhone's language over /en, /ru or /es.
  const [speechLocale,setSpeechLocale]=useState(lang)
  useEffect(()=>{setSpeechLocale(lang)},[lang])
  const conversationLang=['en','ru','es'].includes(speechLocale)?speechLocale:lang
  const [showCaptions,setShowCaptions]=useState(false)
  const [turns,setTurns]=useState([])
  const turnsRef=useRef(turns)
  // Every transcript mutation updates this ref synchronously before React renders.
  const turnRequestRef=useRef(0)
  const inFlightClientRef=useRef(null) // client message awaiting a genuine coach reply
  const [protocolOpen,setProtocolOpen]=useState(false)
  const [protocolEditing,setProtocolEditing]=useState(false)
  const [ratingOpen,setRatingOpen]=useState(false)
  const [rating,setRating]=useState({stars:0,character:3,intelligence:3,impression:3})
  const [ratingSaving,setRatingSaving]=useState(false)
  const [ratingSaved,setRatingSaved]=useState(false)
  const [ratingError,setRatingError]=useState(false)
  const [autoSaveEnabled,setAutoSaveEnabled]=useState(false)
  const [restoredDraft,setRestoredDraft]=useState(false)
  const [freshPrivateProfile,setFreshPrivateProfile]=useState(false)
  const [courseGate,setCourseGate]=useState(null),courseGateRef=useRef(null)
  const [courseGateEnabled,setCourseGateEnabled]=useState(false),[courseGateBusy,setCourseGateBusy]=useState(false),courseGateBusyRef=useRef(false)
  const [courseGateError,setCourseGateError]=useState(false),courseGateAttemptRef=useRef(null)
  const [courseGateAnswer,setCourseGateAnswer]=useState('')
  const privateTextOnly=restoredDraft||freshPrivateProfile||Boolean(courseGate)||courseGateBusy||Boolean(courseGateAttemptRef.current)
  const initialDraftRevision=useRef(0)
  const restoredOpeningScope=useRef(null),restoredProfileCheckin=useRef(null),restoredMethod=useRef(null)
  // Only the existing server-verified archive may supply a structured result.
  // Keep the opaque proof in the local private-save path, never model context.
  const restoredProfileProof=useRef(null)
  const [profileV3,setProfileV3]=useState(null),profileV3Ref=useRef(null)
  const [profileV3Enabled,setProfileV3Enabled]=useState(false)
  const [profileV3CanStart,setProfileV3CanStart]=useState(false)
  const [profileV3Busy,setProfileV3Busy]=useState(false),profileV3BusyRef=useRef(false)
  const [profileV3Fault,setProfileV3Fault]=useState(false),profileV3FaultRef=useRef(false)
  const [profileV3Error,setProfileV3Error]=useState(false)
  const [profileV3Answer,setProfileV3Answer]=useState(''),[profileV3Correction,setProfileV3Correction]=useState('')
  const resumeInFlight=useRef(false)
  const [resumeList,setResumeList]=useState(null)
  const [resumeBusy,setResumeBusy]=useState(false)
  const [resumeError,setResumeError]=useState(false)
  const [autoSaveStatus,setAutoSaveStatus]=useState('idle')
  const autoSaveRef=useRef(false),autoSaveQueueRef=useRef(null),draftMountedRef=useRef(true)
  const headerBackPendingRef=useRef(false)
  useEffect(()=>{draftMountedRef.current=true;return()=>{draftMountedRef.current=false}},[])
  const [courseFieldReview,setCourseFieldReview]=useState(null)
  const [protocolSummary,setProtocolSummary]=useState('')
  const [protocolNextStep,setProtocolNextStep]=useState('')
  const [protocolSaving,setProtocolSaving]=useState(false)
  const [protocolSaved,setProtocolSaved]=useState(false)
  const [protocolSaveLocked,setProtocolSaveLocked]=useState(false)
  const protocolSaveSnapshotRef=useRef(null)
  // Bind private writes to the verified account before any dialogue is collected.
  // Do not rebind an existing in-tab transcript after a sign-in/account change.
  const protocolOwnerRef=useRef(null)
  const [protocolOwnerReady,setProtocolOwnerReady]=useState(false)
  const [protocolError,setProtocolError]=useState('')
  const [protocolFinishedAt,setProtocolFinishedAt]=useState(null)
  const protocolIdRef=useRef(null)
  const protocolStartedRef=useRef(null)
  const [sessionClockStarted,setSessionClockStarted]=useState(false)
  // Connected-session marker contains a persona ID only, never user data.
  // Gemini sets this consent flag only after an actual Live setupComplete.
  useEffect(()=>{
    if(geminiLiveConsent&&sessionClockStarted)
      markCoachGreetingConnected(personaId)
  },[geminiLiveConsent,sessionClockStarted,personaId])
  const [introComplete,setIntroComplete]=useState(false)
  const [activeSessionSeconds,setActiveSessionSeconds]=useState(0)
  const activeClockRef=useRef(null)
  if(!activeClockRef.current)activeClockRef.current=createCoachActiveClock()
  const voicePauseRef=useRef(false),pauseActionRef=useRef(null)
  const [busy,setBusy]=useState(false)
  const [error,setError]=useState('')
  const [authRequired,setAuthRequired]=useState(false)
  const [readiness,setReadiness]=useState({status:'checking',reason:''})
  const [paused,setPaused]=useState(false)
  const [voiceState,setVoiceState]=useState({phase:'idle',beat:0})
  const [outputMuted,setOutputMuted]=useState(false)
  const outputMutedRef=useRef(false)
  outputMutedRef.current=outputMuted
  const [moreOptionsOpen,setMoreOptionsOpen]=useState(false)
  const reactionActivity=useCoachReactionActivity(voiceState.phase,personaId)
  const voicePaused=voiceState.phase==='paused'
  const [editablePlan,setEditablePlan]=useState('')
  const [selectedGoal,setSelectedGoal]=useState('')
  const [selectedCourseId,setSelectedCourseId]=useState(()=>COACH_PROGRAM_GROUPS.find(group=>group.id==='goal')?.sessions.some(item=>item.id===initialGoalCourseId)?initialGoalCourseId:DEFAULT_COACH_COURSE_SESSION_ID)
  const lastSharedGoalRef=useRef('')
  const modelProbeRef=useRef({lastAttempt:0,inFlight:false})
  const semanticHintsRef=useRef([]) // short-lived in-tab hints only; not persisted or exported
  const [replaying,setReplaying]=useState(false)
  const [ratedCoachAnswer,setRatedCoachAnswer]=useState(null)
  const [coachQualityPending,setCoachQualityPending]=useState(false)
  const [coachQualityError,setCoachQualityError]=useState(false)
  const [replayBlocked,setReplayBlocked]=useState(false)
  const [playbackNotice,setPlaybackNotice]=useState('')
  const pending=useRef(null),composerRef=useRef(null),transcriptRef=useRef(null)
  const [allowOpeningPrior,setAllowOpeningPrior]=useState(false)
  const [stagedMemory,setStagedMemory]=useState(null)
  // A private preview is latched at the exact conversational turn at which
  // consented data was loaded. Earlier numbers cannot be reassigned to axes.
  const [profileReviewStart,setProfileReviewStart]=useState(null)
  const [contextTopic,setContextTopic]=useState('')
  const [contextAssessments,setContextAssessments]=useState(false)
  const [contextPaused,setContextPaused]=useState(false)
  const [contextSession,setContextSession]=useState(null)
  const [contextSessionLoading,setContextSessionLoading]=useState(false)
  const [contextSessionError,setContextSessionError]=useState(false)
  const [contextRevision,setContextRevision]=useState(0)
  useEffect(()=>{
    if(!contextSession||contextSession.expired)return
    const timer=setTimeout(()=>{
      setContextSession(current=>current===contextSession?{...current,expired:true}:current)
      setStagedMemory(null)
      cancelPendingCoachTurn()
    },Math.max(0,contextSession.expiresAt-Date.now()))
    return ()=>clearTimeout(timer)
  },[contextSession])
  const composerDetailsRef=useRef(null),speechRef=useRef(null)
  const replayControllerRef=useRef(null),replayPlayerRef=useRef(null)
  const micWaveRef=useRef(null)
  const sessionRootRef=useRef(null)
  const replayAudioContextRef=useRef(null)
  // Preserve the partial interval on pause; the server controls actual quotas.
  function freezeActiveClock(){
    const seconds=activeClockRef.current.setRunning(window.performance.now(),false)
    setActiveSessionSeconds(seconds)
    return seconds
  }
  useEffect(()=>{
    // Preserve the current exact Play/MP3 and microphone handlers untouched.
    // The voice loop publishes loading on first Play and listening after intro.
    if(voiceState.phase==='loading'||voiceState.phase==='listening')setSessionClockStarted(true)
    if((voiceState.phase==='loading'||voiceState.phase==='listening')&&!protocolStartedRef.current)
      protocolStartedRef.current=new Date().toISOString()
    if(voiceState.phase==='listening')setIntroComplete(true)
  },[voiceState.phase])
  useEffect(()=>{replayPlayerRef.current?.setMuted?.(outputMuted)},[outputMuted])
  useEffect(()=>{
    // The iOS software keyboard resizes the visual viewport but not always
    // CSS 100dvh. Keep the composer anchored to actual visible pixels.
    const root=sessionRootRef.current,viewport=window.visualViewport
    const sync=()=>{
      const height=viewport?.height||window.innerHeight
      if(root&&Number.isFinite(height)&&height>250)
        root.style.setProperty('--hh-coach-visible-height',Math.floor(height)+'px')
    }
    sync()
    viewport?.addEventListener('resize',sync)
    viewport?.addEventListener('scroll',sync)
    window.addEventListener('resize',sync)
    return()=>{
      viewport?.removeEventListener('resize',sync)
      viewport?.removeEventListener('scroll',sync)
      window.removeEventListener('resize',sync)
    }
  },[])
  useEffect(()=>()=>pending.current?.abort(),[])
  useEffect(()=>{
    let active=true
    void getCabinetBootstrap('portrait',{refresh:true}).then(value=>{
      if(!active||turnsRef.current.length||protocolStartedRef.current)return
      const id=value?.account?.id
      if(typeof id==='string'&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)){
        protocolOwnerRef.current=id;setProtocolOwnerReady(true)
      }
    }).catch(()=>{}) // Guest/offline dialogue and local PDF still work.
    return()=>{active=false}
  },[])
  useEffect(()=>{
    if(!protocolOwnerReady||greetingAccepted)return
    const owner=protocolOwnerRef.current,controller=new AbortController()
    fetch('/api/app/my-coach/draft?view=capabilities',{credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'X-HH-Account-ID':owner}}).then(async response=>{
        if(!response.ok)return
        const result=await response.json()
        if(!controller.signal.aborted&&protocolOwnerRef.current===owner&&!protocolStartedRef.current){
          setProfileV3Enabled(result.profileV3Enabled===true)
          setCourseGateEnabled(result.courseGateEnabled===true)
        }
      }).catch(()=>{})
    return()=>controller.abort()
  },[protocolOwnerReady,greetingAccepted])
  useEffect(()=>{
    // This probe sends only a synthetic OK to the free-only ZDR gateway.
    // The client's message and history remain untouched until consent + Send.
    const controller=new AbortController()
    fetch('/api/app/my-coach/probe',{
      method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'Content-Type':'application/json'},body:'{}',
    }).then(async response=>{
      if(response.status===401){setAuthRequired(true);return null}
      const result=await response.json().catch(()=>null)
      if(!response.ok||result?.schema!=='HH_COACHING_BRAIN_PROBE_V1')throw Error('PROBE_FAILED')
      return result
    }).then(result=>{
      if(controller.signal.aborted)return
      const next={status:result?.status==='verified'?'verified':'unavailable',reason:result?.reason||''}
      if(next.status!=='verified')modelProbeRef.current.lastAttempt=Date.now()
      setReadiness(next)
      setStreamingReady(result?.status==='verified'&&result?.privacyRouting==='account_zdr_owner_confirmed')
    }).catch(()=>{
      if(!controller.signal.aborted){
        modelProbeRef.current.lastAttempt=Date.now()
        setReadiness({status:'unavailable',reason:'model_unavailable'})
        setStreamingReady(false)
      }
    })
    return ()=>controller.abort()
  },[])
  // Config probe is metadata-only; an initial network/auth error can be
  // retried from Basic → Pro rather than permanently hiding a valid Free tier.
  useEffect(()=>{
    const controller=new AbortController()
    void readGeminiEngineStatus(controller.signal).then(status=>{
      if(controller.signal.aborted)return
      if(status.kind==='ok'){
        setGeminiCapabilities(status.capabilities)
        // A late metadata response must not undo an explicit provider choice.
        if(!engineManuallySelectedRef.current)
          setCoachEngine(status.capabilities.gemini_live_free?'gemini_live_free':'groq_stream')
      }else if(status.kind==='login')setAuthRequired(true)
      else if(!engineManuallySelectedRef.current)setCoachEngine('groq_stream')
    })
    return ()=>controller.abort()
  },[])
  useEffect(()=>{if(transcriptRef.current)transcriptRef.current.scrollTop=transcriptRef.current.scrollHeight},[turns,speechPreview,streamingPreview])
  useEffect(()=>{
    if(['idle','paused','ready'].includes(voiceState.phase)){
      micWaveRef.current?.style.setProperty('--coach-mic-level','0')
      if(micWaveRef.current)micWaveRef.current.dataset.voiceDetected='false'
    }
  },[voiceState.phase])
  useEffect(()=>{
    // Availability is metadata only. No coach/client text reaches the TTS vendor
    // until the customer separately checks the natural-voice consent box.
    if(authRequired||readiness.status==='checking'){
      setCloudAvailable(false);setCloudAgreed(false);setCloudProvider(null);return
    }
    const controller=new AbortController()
    fetch('/api/app/my-coach/voice/synthesize',{
      credentials:'same-origin',cache:'no-store',signal:controller.signal,
    }).then(r=>r.ok?r.json():null).then(data=>{
      if(!controller.signal.aborted){
        setCloudProvider(['google_chirp3_hd','fish_free'].includes(data?.provider)?data.provider:null)
        setCloudAvailable(data?.available===true&&['google_chirp3_hd','fish_free'].includes(data?.provider))
      }
    }).catch(()=>{if(!controller.signal.aborted)setCloudAvailable(false)})
    return ()=>controller.abort()
  },[authRequired,readiness.status])
  const name=persona?localCoachText(persona.name,conversationLang):t.coach
  const opening=persona?localCoachText(persona.opening,conversationLang):t.goal
  const coachStyle=getCoachPresentation(personaId,conversationLang)?.style
  const introduction=coachSessionOpeningLine(personaId,conversationLang)
  const ui=sessionUi[lang]||sessionUi.en
  const voiceGate=voiceGateText[lang]||voiceGateText.en
  const liveVoiceSelected=coachEngine==='gemini_live_free'
  // Pressing Play affirmatively consents to live voice use, disclosed beside
  // the control. Availability alone never starts streaming or contacts Google.
  const liveVoiceReady=liveVoiceSelected&&geminiCapabilities.gemini_live_free===true
  const selectedGeminiEngine=coachEngine==='gemini_free'||coachEngine==='gemini_paid'
  const geminiEngineReady=selectedGeminiEngine&&geminiCapabilities[coachEngine]===true&&geminiConsent
  const geminiVoices=coachGeminiVoiceOptions(personaId)
  const voiceSelectionKey=personaId+':'+conversationLang
  const ownerApprovedGeminiVoice=approvedGeminiVoice(personaId,conversationLang)
  const lockedSessionVoice=lockedCoachSessionVoice(personaId,conversationLang)
  const selectedGeminiVoice=lockedSessionVoice||(geminiVoices.includes(geminiVoiceByLocale[voiceSelectionKey])
    ?geminiVoiceByLocale[voiceSelectionKey]
    :geminiVoices.includes(ownerApprovedGeminiVoice)?ownerApprovedGeminiVoice:geminiVoices[0])
  const geminiVoiceReady=geminiVoiceTier!=='existing'&&
    geminiCapabilities[geminiVoiceTier]===true&&geminiVoiceConsent
  // A selected Gemini voice is a vendor decision, not a preference hint:
  // until its separate consent is approved, never fall back to Fish or Chirp.
  const usingExistingVoice=geminiVoiceTier==='existing'
  const matchingFreeVoice=Boolean(lockedSessionVoice&&geminiCapabilities.gemini_tts_free)
  const chosenCloudProvider=usingExistingVoice?(lockedSessionVoice?(matchingFreeVoice?'gemini_tts_free':null):cloudProvider):
    geminiVoiceReady?geminiVoiceTier:null
  const chosenCloudAvailable=usingExistingVoice?(lockedSessionVoice?matchingFreeVoice:cloudAvailable):geminiVoiceReady
  const chosenCloudAgreed=usingExistingVoice?cloudAgreed:geminiVoiceReady
  const captions=transcriptUi[lang]||transcriptUi.en
  const latestCoachTurn=[...turns].reverse().find(turn=>turn.role==='assistant')
  const latestCoachText=latestCoachTurn?.content||introduction
  // Hero Play is the main session entry. It invokes the same imperative
  // voice runner synchronously, keeping Safari's user-activation gesture.
  function startSessionFromPortrait(){
    if(privateTextOnly||courseGateRequired){toggleComposer();return}
    if(busy||paused||coachProfileOpenRef.current||replaying||!['idle','paused'].includes(voiceState.phase)||(selectedGeminiEngine&&!geminiEngineReady))return
    if(!protocolStartedRef.current)protocolStartedRef.current=new Date().toISOString()
    if(!selectedGoal&&selectedCourseId!==INTRODUCTORY_COACH_SESSION_ID)setSelectedGoal(coachCourseFocusLabel(selectedCourseId,conversationLang))
    speechRef.current?.startSession?.(introduction,{naturalVoice:true})
  }
  // Explicit logical start shared by text, streaming and Live. Never reselect on resume.
  async function ensureCoachMethodSession(){
    if(!methodSession)return true
    const old=methodHandshake.current
    if(old?.id===methodSession.methodSessionId&&old.promise)return old.promise
    const promise=fetch('/api/app/my-coach/session',{
      method:'POST',credentials:'same-origin',cache:'no-store',
      headers:{'Content-Type':'application/json','X-HH-Account-ID':methodSession.accountId},
      body:JSON.stringify({personaId,methodId:methodSession.methodId,methodSessionId:methodSession.methodSessionId}),
    }).then(async response=>{
      const data=await response.json().catch(()=>null)
      return response.ok&&data?.started===true&&data.methodId===methodSession.methodId&&data.methodSessionId===methodSession.methodSessionId
    }).catch(()=>false)
    methodHandshake.current={id:methodSession.methodSessionId,promise}
    const ok=await promise
    if(!ok&&methodHandshake.current?.promise===promise)methodHandshake.current=null
    return ok
  }
  async function rateCoachAnswer(signal){
    if(!latestCoachTurn||coachQualityPending||ratedCoachAnswer===latestCoachText)return
    setCoachQualityPending(true);setCoachQualityError(false)
    try{
      const response=await fetch('/api/holistic-agent/quality',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({channel:'my_coach',locale:lang,signal,consent:true}),
      })
      const result=await response.json().catch(()=>null)
      if(response.status!==201||result?.saved!==true)throw Error('QUALITY_NOT_AVAILABLE')
      setRatedCoachAnswer(latestCoachText)
    }catch{setCoachQualityError(true)}
    finally{setCoachQualityPending(false)}
  }
  const currentStage=latestCoachTurn?.stage||'clarify'
  // Read the last Director-authored milestone snapshot; model prose cannot
  // advance the bar. Safety replies with no milestone keep the last step.
  const storedDirectorProgress=[...turns].reverse().find(turn=>
      turn.role==='assistant'&&turn.sessionProgress?.source==='director-client-evidence')?.sessionProgress
  const lastRecordedProgress=liveVoiceSelected?(liveDirectorProgress||storedDirectorProgress):storedDirectorProgress
  const progressValid=lastRecordedProgress?.source==='director-client-evidence'&&
    ['grow','tgrow','woop','oskar','solution_focused','appreciative_inquiry'].includes(lastRecordedProgress.methodId)&&Number.isInteger(lastRecordedProgress?.index)&&
    lastRecordedProgress.index>=0&&lastRecordedProgress.index<=5
  const meaningProgress=lastRecordedProgress?.journey
  const meaningProgressValid=progressValid&&
    meaningProgress?.source==='director-client-evidence'&&
    meaningProgress.total===5&&Number.isInteger(meaningProgress.index)&&
    meaningProgress.index>=0&&meaningProgress.index<5
  // Old server snapshots stay compatible; locally generated dialogue is
  // provisional and cannot award confirmed evidence.
  const fallbackStageIndex={
    goal:0,reality:1,resources:2,options:3,action:4,review:4,safety:0,
    clarify:0,explore:1,awareness:2,reframe:3,choice:4,planning:4,
    commitment:4,integration:4
  }
  const provisionalIndex=fallbackStageIndex[latestCoachTurn?.stage]??0
  const visibleStageIndex=meaningProgressValid?meaningProgress.index:
    progressValid?lastRecordedProgress.index:provisionalIndex
  const visibleMethodId=(progressValid?lastRecordedProgress.methodId:null)||restoredMethod.current||methodSession?.methodId||(protocolOwnerReady&&!greetingAccepted?selectedMethod:'')||
    ({GROW:'grow',TGROW:'tgrow',WOOP:'woop',OSKAR:'oskar',
      'Solution-focused':'solution_focused',
      'Appreciative inquiry':'appreciative_inquiry'})[persona?.methods?.[0]]||'grow'
  const visibleMethodName=coachMethodNames[visibleMethodId]||'GROW'
  const memoryProvider=coachEngine==='gemini_live_free'||coachEngine==='gemini_free'
    ?'gemini_free':coachEngine==='gemini_paid'?'gemini_paid':'groq'
  const lastMemoryProviderRef=useRef(memoryProvider)
  useEffect(()=>{
    // A prior opt-in to Groq is never automatically an opt-in to Gemini Free,
    // Paid or any provider with a different data-use policy.
    if(lastMemoryProviderRef.current===memoryProvider)return
    lastMemoryProviderRef.current=memoryProvider
    setAllowOpeningPrior(false)
    setStagedMemory(null)
    setContextTopic('')
    setContextAssessments(false)
    setContextPaused(true)
  },[memoryProvider])
  const memoryReady=Boolean(stagedMemory?.stageToken)&&stagedMemory?.provider===memoryProvider
  const openingPrior=memoryReady&&allowOpeningPrior?{
    name:String(stagedMemory?.prior?.preferredName||'').slice(0,60),
    topic:String(stagedMemory?.prior?.previous?.[0]?.topic||'').slice(0,140)
  }:null
  const confirmedClientTurns=turns.filter(turn=>turn.role==='user'&&turn.unanswered!==true)
  const openingHistory=confirmedClientTurns.slice(0,32)
    .map(turn=>String(turn.content||'').slice(0,160))
  const localOpeningScope=privateTextOnly?(restoredOpeningScope.current||{allowPrior:false,priorSession:null}):{allowPrior:allowOpeningPrior,priorSession:openingPrior}
  const openingProgress=coachOpeningProgress({turns:openingHistory,locale:conversationLang,
    personaId,...localOpeningScope})
  // Connecting to a voice provider does not constitute coaching consent.
  useEffect(()=>{
    const clock=activeClockRef.current
    const tick=()=>setActiveSessionSeconds(clock.sample(window.performance.now()))
    const onVisibility=()=>setActiveSessionSeconds(clock.setRunning(window.performance.now(),
      sessionClockStarted&&openingProgress.completed&&!openingProgress.declined&&document.visibilityState==='visible'&&!paused&&!voicePaused&&!voicePauseRef.current&&!coachProfileOpenRef.current))
    onVisibility()
    const timer=window.setInterval(tick,1000)
    document.addEventListener('visibilitychange',onVisibility)
    return()=>{
      clock.setRunning(window.performance.now(),false)
      window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility)
    }
  },[sessionClockStarted,paused,voicePaused,coachProfileOpen,openingProgress.completed,openingProgress.declined])
  const sessionTimebox=coachTimeboxState(sessionClockStarted&&openingProgress.completed&&!openingProgress.declined?Math.floor(activeSessionSeconds):null)
  const minuteRuler=coachMinuteRuler(sessionTimebox.elapsedSeconds)
  const openingActive=!openingProgress.completed
  // Session 0 is distinct from method coaching. Existing saved values are
  // consulted ONLY in an owner-authorized preview, never from model prose.
  const profileSelected=openingProgress.completed&&openingProgress.answers.focus?.kind==='profile'
  const profileEvidence=confirmedClientTurns.map(turn=>String(turn.content||'').slice(0,300))
  const profileHistory=profileEvidence.slice(openingProgress.consumedTurns)
  const newProfileProgress=profileSelected&&!freshPrivateProfile&&!profileV3&&!restoredProfileProof.current
    ?coachProfileProgress({locale:conversationLang,turns:profileHistory}):null
  const approvedProfileAudit=memoryReady&&stagedMemory?.allowProfile===true&&
    stagedMemory?.personal?.stage==='personal'
      ?stagedMemory.personal.profileAudit:null
  useEffect(()=>{
    if(freshPrivateProfile||!profileSelected||approvedProfileAudit?.status!=='available'||
       !stagedMemory?.stageToken)return
    // Once a new profile already started, do not retroactively reinterpret
    // those spoken numbers as updates against saved profile fields.
    if(profileReviewStart===null&&newProfileProgress?.ratings.length)return
    if(profileReviewStart?.token!==stagedMemory.stageToken||
       profileReviewStart?.provider!==memoryProvider){
      setProfileReviewStart({from:profileEvidence.length,token:stagedMemory.stageToken,provider:memoryProvider})
    }
  },[freshPrivateProfile,profileSelected,approvedProfileAudit,stagedMemory?.stageToken,memoryProvider,
    newProfileProgress?.ratings.length,profileEvidence.length,profileReviewStart])
  const reviewAvailable=profileSelected&&profileReviewStart!==null&&
    approvedProfileAudit?.status==='available'&&
    profileReviewStart.token===stagedMemory?.stageToken&&
    profileReviewStart.provider===memoryProvider
  const profileReviewProgress=reviewAvailable
    ?coachProfileReviewProgress({audit:approvedProfileAudit,
      turns:profileEvidence.slice(profileReviewStart.from),locale:conversationLang})
    :null
  const profileProgress=profileReviewProgress||
    (profileReviewStart!==null?{version:COACH_PROFILE_REVIEW_VERSION,
      completed:false,finished:false,ratings:[],total:8,step:1,
      current:'permission',axisTitle:({ru:'Проверка доступа',en:'Access review',es:'Revisión de acceso'})[lang]}:
      newProfileProgress)
  const courseGateRequired=!freshPrivateProfile&&!profileV3&&coachCourseGateHandoffRequired({enabled:courseGateEnabled,autosave:autoSaveEnabled,courseSessionId:selectedCourseId,locale:conversationLang,opening:openingProgress})
  const courseGateCanStart=Boolean(courseGateRequired&&!courseGate&&!courseGateAttemptRef.current&&voiceState.phase==='idle'&&!busy&&!paused&&!protocolOpen)
  // Never let the free dialogue ask another core question while the server gate is required.
  useEffect(()=>{
    if(courseGateRequired&&!courseGate&&!busy&&voiceState.phase!=='idle')speechRef.current?.stop?.()
  },[courseGateRequired,courseGate,busy,voiceState.phase])
  const profileV3Active=Boolean(profileV3&&!profileV3.step.closed)
  const freshProfileAwaiting=Boolean(freshPrivateProfile&&profileSelected&&!profileV3&&!profileV3Fault)
  const structuredProfileCanStart=freshPrivateProfile?Boolean(freshProfileAwaiting&&autoSaveEnabled&&profileV3Enabled&&coachProfileTrackForCourse(selectedCourseId)):restoredDraft&&profileV3CanStart
  const profileActive=Boolean(profileSelected&&profileProgress&&!profileV3&&!restoredProfileProof.current)
  const continuityChoice=openingProgress.answers.continuity?.kind||''
  const personalApproved=memoryReady&&openingProgress.checkmarks.name&&
    openingProgress.checkmarks.continuity&&openingProgress.checkmarks.focus&&
    stagedMemory?.sharePersonal===true&&stagedMemory?.personal?.stage==='personal'
  const memorySharePrior=memoryReady&&allowOpeningPrior&&stagedMemory?.sharePrior===true&&continuityChoice==='previous'
  const memoryShareGoals=Boolean(personalApproved&&stagedMemory?.allowGoals&&!contextPaused)
  const memoryShareTests=Boolean(personalApproved&&stagedMemory?.assessmentsAllowed&&!contextPaused)
  // The owner-only preview never automatically reaches an external Live AI.
  // A model context request carries only signed stage/consent pointers, not
  // client facts. The separate Live endpoint re-reads current item grants.
  const livePriorApproved=Boolean(memoryReady&&stagedMemory?.sharePrior===true&&
    allowOpeningPrior&&openingProgress.checkmarks.invitation&&!contextPaused)
  const livePersonalApproved=Boolean(personalApproved&&!contextPaused)
  const liveContextConsent={
    priorSessions:livePriorApproved,
    goals:livePersonalApproved&&stagedMemory?.allowGoals===true,
    profile:livePersonalApproved&&stagedMemory?.allowProfile===true,
    assessments:livePersonalApproved&&stagedMemory?.assessmentsAllowed===true,
    axes:livePersonalApproved&&stagedMemory?.allowProfile===true&&stagedMemory?.shareAxes===true,
  }
  const liveContextStage=(liveContextConsent.goals||liveContextConsent.profile||
    liveContextConsent.assessments)?'personal':livePriorApproved?'identity':null
  const liveSessionScope=contextSession&&!contextSession.expired&&
    contextSession.expiresAt>Date.now()?contextSession.token:null
  const liveContextAccess=liveVoiceSelected&&liveContextStage&&stagedMemory?.stageToken
    ?JSON.stringify({stage:liveContextStage,stageToken:stagedMemory.stageToken,
      shareApproved:true,consent:liveContextConsent,
      continuity:continuityChoice==='previous'?'previous':'new',
      ...(liveContextStage==='personal'?{
        topicKey:stagedMemory?.topicKey||
          (liveContextConsent.profile?'meaning_purpose':contextTopic),
        ...(liveSessionScope?{contextSessionToken:liveSessionScope}:{})
      }:{})
    }):''
  // An optional, very soft acknowledgment on the FOUR lit milestones only.
  // The feelings checkbox (step 5) has no sound or lamp by design.
  const previousOpeningLamps=useRef(null)
  useEffect(()=>{
    const current=openingProgress.lamps,old=previousOpeningLamps.current
    previousOpeningLamps.current=current
    if(!old||!sessionClockStarted||paused||voiceState.phase==='speaking'||
      !['invitation','identity','focus','confirmation'].some(key=>current[key]&&!old[key]))return
    try{
      const Audio=window.AudioContext||window.webkitAudioContext
      if(!Audio)return
      const ctx=new Audio(),osc=ctx.createOscillator(),gain=ctx.createGain()
      const now=ctx.currentTime
      osc.type='sine';osc.frequency.setValueAtTime(680,now)
      osc.frequency.exponentialRampToValueAtTime(880,now+0.075)
      gain.gain.setValueAtTime(0.0001,now)
      gain.gain.exponentialRampToValueAtTime(0.013,now+0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001,now+0.11)
      osc.connect(gain);gain.connect(ctx.destination)
      osc.onended=()=>{void ctx.close().catch(()=>{})}
      osc.start(now);osc.stop(now+0.12)
    }catch{/* Sound is optional; the visual checkpoint is authoritative. */}
  },[openingProgress.lamps.invitation,openingProgress.lamps.identity,
    openingProgress.lamps.focus,openingProgress.lamps.confirmation,sessionClockStarted,paused,voiceState.phase])
  // Render finalized submitted input immediately, even before a provider or
  // encrypted gate receipt. This display-only list never authorizes a fact.
  const pendingProtocolInput=inFlightClientRef.current?.message||
    (courseGateAttemptRef.current?.action==='course-gate-answer'?courseGateAttemptRef.current.content:'')
  const protocolDisplayTurns=pendingProtocolInput?[...turns,{role:'user',content:pendingProtocolInput,unanswered:true}]:turns
  const openingCaptured=openingCapturedAnswers(protocolDisplayTurns,history=>coachOpeningProgress({turns:history,locale:conversationLang,personaId,...localOpeningScope}))
  const openingPosition=openingStagePosition(openingProgress,lang,openingCaptured)
  const profilePosition=profileStagePosition(profileProgress,COACH_PROFILE_AXES,lang)
  const stageIds=coachSessionVisibleStageIds(visibleMethodId,{legacy:progressValid&&!meaningProgressValid})
  const stageChecklistTitles=stageIds.map((stepId,index)=>semanticStageTitles[lang]?.[stepId]||
    methodStepTitles[lang]?.[stepId]||ui.stages[index]||stepId)
  const methodPosition=methodStagePosition(stageIds,stageChecklistTitles,
    Math.max(0,Math.min(stageIds.length-1,visibleStageIndex)),progressValid,lastRecordedProgress?.completed)
  // Use acknowledged server review when present. Never allow a stale local
  // review or temporarily inconsistent turn snapshot to crash the session.
  let courseRows=[],courseReviewInvalid=false
  let effectiveCourseReview=courseGate?courseGate.step.review:courseFieldReview
  const courseSchema=coachCourseProtocolSchema(selectedCourseId,lang)
  // Do not use opening answers as core field candidates. Retain original indices.
  let openingEnd=-1,openingCount=0
  for(let i=0;i<turns.length&&openingCount<openingProgress.consumedTurns;i++){
    if(turns[i].role==='user'&&turns[i].unanswered!==true){openingCount++;openingEnd=i}
  }
  if(openingProgress.completed&&!profileSelected&&courseSchema){
    try{
      const schemas=['ru','en','es'].map(locale=>({locale,schema:coachCourseProtocolSchema(selectedCourseId,locale)}))
      const across=(row,test)=>schemas.some(({locale,schema})=>{
        const field=schema?.checkpoints.find(x=>x.id===row.id)
        return field&&test(field,locale)
      })
      const matches=(row,text)=>typeof text==='string'&&across(row,(field,locale)=>checkpointQuestionMatches(field,locale,text.trim()))
      if(!courseGate&&!courseGateRequired){
        // Existing explicit review events win. Reconstruct only exact spoken/
        // typed question + literal answer + exact echo + explicit assent.
        // No inference from the currently suggested field and no new provider.
        effectiveCourseReview=boundTranscriptReview({courseId:selectedCourseId,turns,fields:courseSchema.checkpoints,
          existing:courseFieldReview,afterIndex:openingEnd,matchQuestion:matches,
          matchEcho:(row,q,quote,echo)=>typeof echo==='string'&&across(row,(field,locale)=>
            checkpointQuestionMatches(field,locale,q)&&checkpointConfirmationMatches(field,q,quote,locale,echo)),
          answerClass:protocolAnswerClass,normalize:normalizeCoachCourseFieldReview})
      }
      courseRows=coachCourseProtocolRows(selectedCourseId,turns,effectiveCourseReview?.courseSessionId===selectedCourseId?effectiveCourseReview:null,lang)
      courseRows=courseCapturedRows(courseRows,protocolDisplayTurns,matches,{afterIndex:openingEnd,livePrompt:courseGate?.step.prompt})
    }catch{
      courseReviewInvalid=true
      courseRows=courseSchema.checkpoints.map(row=>({...row,status:'not_explored',turnIndex:null,quote:''}))
    }
  }
  const coursePosition=courseStagePosition(courseRows,{promptId:courseReviewInvalid?null:courseGate?.step.prompt?.fieldId,
    paused:courseReviewInvalid||courseGate?.step.paused,completed:courseGate?.step.completed,
    allowProvisional:!courseGate&&!courseGateRequired&&!courseReviewInvalid})
  const savedProfile=profileV3?coachSavedProfileV3(profileV3.protocol,lang):null
  const savedProfilePosition=savedProfileStagePosition(savedProfile,profileV3?.step,lang)
  const progressMode=openingActive?'opening':savedProfile?'profile-v3':profileActive?'profile':courseRows.length?'course':'method'
  const coreMode=progressMode==='opening'?(profileSelected?'profile':courseSchema?'course':'method'):progressMode
  const detailPosition=coreMode==='profile-v3'?savedProfilePosition:coreMode==='profile'?profilePosition:
    coreMode==='course'?(openingActive?courseStagePosition((courseSchema?.checkpoints||[]).map(row=>({...row,status:'not_explored',quote:'',turnIndex:null})),{allowProvisional:false}):coursePosition):methodPosition
  const stagePosition=groupedSessionPosition(openingPosition,detailPosition,{mode:coreMode,courseId:selectedCourseId,locale:lang,openingActive:openingActive&&!openingProgress.declined})
  const visibleProgressStep=stagePosition.step
  const visibleProgressTotal=stagePosition.total
  const visibleProgressName=progressMode==='opening'?({ru:'Начало сессии',en:'Session opening',es:'Inicio de sesión'}[lang]):
    progressMode==='profile-v3'?savedProfile.title:progressMode==='profile'?({ru:'Личный профиль',en:'Personal profile',es:'Perfil personal'}[lang]):
    progressMode==='course'?({ru:'Пункты протокола',en:'Session checkpoints',es:'Puntos de la sesión'}[lang]):visibleMethodName
  const stageDescription=methodPosition.rows[methodPosition.index]?.label||methodPosition.rows.at(-1)?.label||''
  const plannedCourse=progressMode==='course'&&!courseGate&&detailPosition.index>=0
  const visibleProgressDescription=stagePosition.index>=0?
    (plannedCourse?({ru:'Ориентир: ',en:'Suggested checkpoint: ',es:'Punto orientativo: '}[lang]):'')+stagePosition.rows[stagePosition.index].label+' · '+stagePosition.rows[stagePosition.index].recorded+'/'+stagePosition.rows[stagePosition.index].total:
    courseReviewInvalid&&progressMode==='course'?({ru:'Ожидаем подтверждённый протокол',en:'Waiting for the verified protocol',es:'Esperando el protocolo verificado'}[lang]):
    stagePosition.finished?({ru:'Пункты обработаны',en:'Steps reviewed',es:'Pasos revisados'}[lang]):
    openingProgress.declined?({ru:'Сессия не начата',en:'Session not started',es:'Sesión no iniciada'}[lang]):
    ({ru:'Ожидание следующего этапа',en:'Waiting for next step',es:'En espera del siguiente paso'}[lang])
  const keyInfoUi=keyInfoCopy[lang]
  const goalPrompts={
    en:{stress:'I would like to feel less stressed. Can we explore what is weighing on me?',energy:'I would like to restore my energy. Can we explore what is draining it?',relationships:'I would like to improve an important relationship. Can we explore what matters most?'},
    ru:{stress:'Я хочу снизить стресс. Давайте разберём, что сейчас на меня давит.',energy:'Я хочу восстановить энергию. Давайте посмотрим, что её забирает.',relationships:'Я хочу улучшить важные для меня отношения. Давайте разберёмся, что сейчас важнее всего.'},
    es:{stress:'Quiero reducir el estrés. Exploremos qué me está pesando.',energy:'Quiero recuperar mi energía. Exploremos qué me la está quitando.',relationships:'Quiero mejorar una relación importante. Exploremos qué es lo más importante.'}
  }[lang]||{}
  const goalLabels={stress:ui.stress,energy:ui.energy,relationships:ui.relationships}
  function chooseTopic(id){
    setSelectedGoal(goalLabels[id]||'')
    setDraft(previous=>previous.trim()?previous:(goalPrompts[id]||''))
    setError('')
  }
  function ensureReplayAudioOutput(){
    refreshCoachIos27PlaybackRoute(window.navigator)
    if(shouldUseCoachingWebAudio(window.navigator)&&
      (!replayAudioContextRef.current||replayAudioContextRef.current.state==='closed'))
      replayAudioContextRef.current=unlockCoachingAudioContext()
  }
  async function previewGeminiCoachVoice(){
    if(outputMutedRef.current||!geminiVoiceReady||busy||replaying||voiceState.phase!=='idle')return
    ensureReplayAudioOutput()
    const controller=new AbortController()
    replayControllerRef.current?.abort()
    replayPlayerRef.current?.cancel()
    replayControllerRef.current=controller
    setReplaying(true);setPlaybackNotice('')
    const done=(failed=false)=>{
      if(replayControllerRef.current!==controller)return
      replayControllerRef.current=null
      replayPlayerRef.current?.cancel();replayPlayerRef.current=null
      setReplaying(false)
      setVoiceState({phase:'idle',beat:0})
      setCoachIos27AudioSession(window.navigator,'auto')
      if(failed)setPlaybackNotice(voiceGate.naturalUnavailable)
    }
    try{
      const response=await fetch('/api/app/my-coach/voice/synthesize',{
        method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({provider:geminiVoiceTier,personaId,locale:conversationLang,
          voiceName:selectedGeminiVoice,preview:true,voiceConsent:true,cloudVoiceConsent:true,
          ...(geminiVoiceTier==='gemini_tts_free'?{trainingUseConsent:true}:{})}),
      })
      if(!response.ok||!response.body||controller.signal.aborted)throw Error('PREVIEW_UNAVAILABLE')
      replayPlayerRef.current=startCoachingMp3Playback(response,{
        audioContext:replayAudioContextRef.current,muted:outputMutedRef.current,
        onStart:()=>{if(!controller.signal.aborted)setVoiceState({phase:'speaking',beat:0})},
        onEnd:()=>done(false),onBlocked:()=>done(true),onError:()=>done(true),
      })
    }catch{if(!controller.signal.aborted)done(true)}
  }

  function replayCoachReply(overrideText){
    if(privateTextOnly||outputMutedRef.current||voicePauseRef.current||paused)return
    // Dynamic replies preserve their consented remote provider. Fixed public
    // introductions may recover using localized device speech.
    const spokenText=typeof overrideText==='string'?overrideText:latestCoachText
    if(speechRef.current?.resumeVoice?.())return
    if(replayBlocked&&replayPlayerRef.current){
      setReplayBlocked(false);setReplaying(true);setPlaybackNotice('')
      void replayPlayerRef.current.resume()
      return
    }
    if(!spokenText||replaying)return
    ensureReplayAudioOutput() // Reuse Web Audio unlocked in this Replay/Send gesture.
    setPlaybackNotice('');setReplayBlocked(false)
    const replayingIntro=typeof overrideText!=='string'&&!latestCoachTurn
    const dynamicAllowed=chosenCloudAgreed&&chosenCloudAvailable&&(!lockedSessionVoice||chosenCloudProvider?.startsWith('gemini_tts_'))&&
      ['google_chirp3_hd','fish_free','gemini_tts_free','gemini_tts_paid'].includes(chosenCloudProvider)
    if(!replayingIntro&&!dynamicAllowed){
      setPlaybackNotice(voiceGate.naturalUnavailable)
      return
    }
    const controller=new AbortController()
    replayControllerRef.current=controller
    setReplaying(true)
    const fail=()=>{
      if(controller.signal.aborted||replayControllerRef.current!==controller)return
      replayControllerRef.current=null
      replayPlayerRef.current?.cancel();replayPlayerRef.current=null
      setReplayBlocked(false);setReplaying(false)
      setVoiceState({phase:'idle',beat:0})
      setCoachIos27AudioSession(window.navigator,'auto')
      setPlaybackNotice(voiceGate.naturalUnavailable)
    }
    if(replayingIntro){
      const introUrl=coachSessionOpeningAudioPath(personaId,conversationLang)
      if(!introUrl){fail();return}
      try{
        replayPlayerRef.current=startDirectCoachIntroAudio(introUrl,{
          fallbackText:spokenText,locale:conversationLang,muted:outputMutedRef.current,
          onStart:()=>{
            if(controller.signal.aborted||replayControllerRef.current!==controller)return
            setReplayBlocked(false);setReplaying(true);setPlaybackNotice('')
            setVoiceState({phase:'speaking',beat:0})
          },
          onEnd:()=>{
            if(replayControllerRef.current!==controller)return
            replayControllerRef.current=null;replayPlayerRef.current=null
            setReplayBlocked(false);setReplaying(false)
            setVoiceState({phase:'idle',beat:0})
          },
          onBlocked:fail,onError:fail,
        })
      }catch{fail()}
      return
    }
    const spoken=chosenCloudProvider==='google_chirp3_hd'?
      coachSpokenText(spokenText).text:chosenCloudProvider?.startsWith('gemini_tts_')?
      coachSpokenText(spokenText).text.slice(0,500):spokenText.slice(0,900)
    void fetch('/api/app/my-coach/voice/synthesize',{
      method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({provider:chosenCloudProvider,personaId,
        locale:latestCoachTurn?.locale||detectedSpeechLocale(spoken,conversationLang),text:spoken,
        ...(chosenCloudProvider?.startsWith('gemini_tts_')?{voiceName:selectedGeminiVoice}:{}),
        voiceConsent:true,cloudVoiceConsent:true,
        ...(['fish_free','gemini_tts_free'].includes(chosenCloudProvider)?{trainingUseConsent:true}:{})}),
    }).then(response=>{
      if(!response.ok||!response.body)throw Error('NATURAL_TTS_UNAVAILABLE')
      if(controller.signal.aborted||replayControllerRef.current!==controller)return
      replayPlayerRef.current=startCoachingMp3Playback(response,{
        audioContext:replayAudioContextRef.current,muted:outputMutedRef.current,
        onStart:()=>{
          if(!controller.signal.aborted&&replayControllerRef.current===controller){
            setReplayBlocked(false);setReplaying(true);setPlaybackNotice('')
            setVoiceState({phase:'speaking',beat:0})
          }
        },
        onBlocked:fail,
        onEnd:()=>{
          if(replayControllerRef.current!==controller)return
          replayControllerRef.current=null;replayPlayerRef.current=null
          setReplayBlocked(false);setReplaying(false)
          setVoiceState({phase:'idle',beat:0})
        },
        onError:fail,
      })
    }).catch(fail)
  }
  useEffect(()=>{
    const stopReplay=()=>{
      replayControllerRef.current?.abort()
      replayPlayerRef.current?.cancel()
      replayControllerRef.current=null;replayPlayerRef.current=null
      setCoachIos27AudioSession(window.navigator,'auto')
      const context=replayAudioContextRef.current
      replayAudioContextRef.current=null
      if(context)try{void context.close?.().catch?.(()=>{})}catch{}
      setReplayBlocked(false);setReplaying(false)
    }
    const onHidden=()=>{
      if(!document.hidden)return
      stopReplay()
      // Gemini owns its phase; never overwrite a synchronous pause with idle.
      pauseActionRef.current?.()
      if(!speechRef.current?.hasLiveSession?.())setVoiceState({phase:'idle',beat:0})
    }
    const onOffline=()=>pauseActionRef.current?.({disconnect:true})
    const onPageHide=()=>{stopReplay();pauseActionRef.current?.({disconnect:true})}
    document.addEventListener('visibilitychange',onHidden)
    window.addEventListener('offline',onOffline)
    window.addEventListener('pagehide',onPageHide)
    return()=>{
      document.removeEventListener('visibilitychange',onHidden)
      window.removeEventListener('offline',onOffline)
      window.removeEventListener('pagehide',onPageHide)
      replayControllerRef.current?.abort()
      replayPlayerRef.current?.cancel()
      if(replayAudioContextRef.current)
        try{void replayAudioContextRef.current.close?.().catch?.(()=>{})}catch{}
      replayAudioContextRef.current=null
    }
  },[])

  function openCoachProfile(){
    coachProfileOpenRef.current=true
    // Profile is not End. Both transports preserve the current logical session.
    const kept=speechRef.current?.pauseSession?.()===true
    if(!kept&&!speechRef.current?.hasLiveSession?.())speechRef.current?.stop?.()
    cancelPendingCoachTurn()
    replayControllerRef.current?.abort()
    replayPlayerRef.current?.cancel()
    replayControllerRef.current=null
    replayPlayerRef.current=null
    setReplaying(false)
    if(!kept&&!speechRef.current?.hasLiveSession?.())setVoiceState({phase:'idle',beat:0})
    setCoachProfileOpen(true)
  }
  function toggleComposer(){
    const details=composerDetailsRef.current
    if(!details)return
    details.open=true
    if(viewExpanded){
      setViewExpanded(false)
      window.requestAnimationFrame(()=>composerRef.current?.focus())
    }else composerRef.current?.focus()
  }

  async function send(event){
    event.preventDefault()
    if(courseGateRequired||courseGateRef.current||courseGateBusyRef.current)return null
    if(voicePauseRef.current){
      if(liveVoiceSelected&&speechRef.current?.isResumeUnavailable?.()){
        if(!draft.trim())return null
        // Explicit local text continuation; never mint a second voice grant.
        speechRef.current.stop?.();voicePauseRef.current=false
        setVoiceState({phase:'idle',beat:0})
        return await sendMessage(draft.trim(),{forceLocal:true})
      }
      setError(({ru:'Нажмите Play, чтобы продолжить прежний разговор.',en:'Tap Play to resume the previous conversation.',es:'Pulsa Play para continuar la conversación anterior.'})[lang])
      return null
    }
    if(privateTextOnly)return await sendMessage(draft.trim(),{forceLocal:true})
    if(liveVoiceSelected){
      // Typed turns go over the SAME Gemini Live WebSocket, never the old
      // text-model + WAV-TTS pipeline. Do not charge another provider.
      const message=draft.trim()
      if(!message)return null
      // An unavailable or stopped transport must not lock the text composer.
      // The same first-party coach continues locally; no other provider is called.
      if(!liveVoiceReady||voiceState.phase==='idle'||
         (voicePaused&&speechRef.current?.isResumeUnavailable?.()))return await sendMessage(message,{forceLocal:true})
      const accepted=speechRef.current?.sendText?.(message)===true
      if(accepted){setDraft('');setError('');return {mode:'live'}}
      if(voicePaused){setError(({ru:'Нажмите Play, чтобы продолжить прежний разговор.',en:'Tap Play to resume the previous conversation.',es:'Pulsa Play para continuar la conversación anterior.'})[lang]);return null}
      setError(({ru:'Сначала начните живую голосовую сессию.',
        en:'Start the live voice session first.',
        es:'Primero inicia la sesión de voz en vivo.'})[lang])
      return null
    }
    // Preserve Safari's unlocked audio output through the asynchronous model
    // round trip. The old stop() destroyed it and left typed replies silent.
    const liveVoice=speechRef.current?.pauseForTypedTurn?.()===true
    if(!liveVoice)ensureReplayAudioOutput()
    const result=await sendMessage(draft.trim())
    if(result?.reply){
      const spokeInSession=liveVoice&&speechRef.current?.speakReply?.(result)
      if(!spokeInSession&&!['safety','boundary'].includes(result.mode))
        replayCoachReply(result.reply)
      if(liveVoice&&!spokeInSession)speechRef.current?.resumeAfterTypedFailure?.()
    }else if(liveVoice)speechRef.current?.resumeAfterTypedFailure?.()
    return result
  }
  async function retryCoachModelAfterOutage(){
    // A synthetic readiness recheck is allowed only on a new submitted user turn,
    // never in the background. It sends no client message or conversation history.
    if(authRequired||!coachModelProbeRetryAllowed(readiness,modelProbeRef.current.lastAttempt,Date.now())||
      modelProbeRef.current.inFlight)return false
    modelProbeRef.current.inFlight=true
    modelProbeRef.current.lastAttempt=Date.now()
    try{
      const response=await fetch('/api/app/my-coach/probe',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},body:'{}',
      })
      if(response.status===401){setAuthRequired(true);return false}
      const result=await response.json().catch(()=>null)
      const next=response.ok&&result?.schema==='HH_COACHING_BRAIN_PROBE_V1'
        ?{status:result.status==='verified'?'verified':'unavailable',reason:result.reason||''}
        :{status:'unavailable',reason:'model_unavailable'}
      setReadiness(next)
      setStreamingReady(next.status==='verified'&&result?.privacyRouting==='account_zdr_owner_confirmed')
      return next.status==='verified'
    }catch{
      setReadiness({status:'unavailable',reason:'model_unavailable'})
      setStreamingReady(false)
      return false
    }finally{
      modelProbeRef.current.inFlight=false
    }
  }
  // The first-party archive and provider consent remain separate. Save the
  // actual finalized client words even when the model never replies.
  function queuePrivateDraft(rows){
    if(courseGateRef.current||courseGateAttemptRef.current||courseGateBusyRef.current)return false
    if(profileV3BusyRef.current||profileV3FaultRef.current||(profileV3Ref.current&&!profileV3Ref.current.step.closed))return false
    const owner=protocolOwnerRef.current
    if(!autoSaveRef.current||!owner||protocolSaved||!rows.some(row=>row.role==='user'))return
    if(!protocolIdRef.current)protocolIdRef.current=crypto.randomUUID()
    if(!protocolStartedRef.current)protocolStartedRef.current=new Date().toISOString()
    const clientRows=rows.filter(row=>row.role==='user'&&row.unanswered!==true).slice(0,32)
    const opening=coachOpeningProtocolSnapshot(coachOpeningProgress({
      turns:clientRows.map(row=>String(row.content||'').slice(0,160)),locale:conversationLang,
      personaId,...localOpeningScope,
    }))
    let value
    try{
      value=normalizeMyCoachDraft({courseSessionId:selectedCourseId,...(freshPrivateProfile?{privateProfileV3Requested:true}:{}),protocol:{
        id:protocolIdRef.current,personaId,methodId:visibleMethodId,locale:restoredProfileProof.current?.value.block.locale||conversationLang,
        courseSessionId:selectedCourseId,
        startedAt:protocolStartedRef.current,completedAt:new Date().toISOString(),
        durationSeconds:Math.floor(activeClockRef.current.sample(window.performance.now())),turnLayout:'chronological',
        opening,...(restoredProfileProof.current?{[restoredProfileProof.current.key]:restoredProfileProof.current.value}:{}),
        turns:rows.map((row,index)=>({role:row.role,content:row.content,
          ...(row.role==='user'&&(row.unanswered===true||index===rows.length-1)?{unanswered:true}:{}),
          ...(row.role==='assistant'&&row.interrupted===true?{interrupted:true}:{}),
          ...(row.role==='assistant'&&['ai','offline','wisdom','safety','boundary'].includes(row.mode)?{mode:row.mode}:{}),
        }))
      }})
      // A malformed derived profile candidate cannot erase the raw conversation.
      const profile=restoredProfileCheckin.current|| (profileReviewProgress?coachProfileReviewProtocolSnapshot(profileReviewProgress):
        profileProgress&&profileReviewStart===null?coachProfileProtocolSnapshot(profileProgress):null)
      if(profile&&!restoredProfileProof.current){try{value=normalizeMyCoachDraft({...value,protocol:{...value.protocol,profileCheckin:profile}})}catch{/* retain the transcript */}}
    }catch{setAutoSaveStatus('error');return false}
    if(!autoSaveQueueRef.current)autoSaveQueueRef.current=createCoachDraftQueue(async(revision,snapshot)=>{
      const body=JSON.stringify({action:'checkpoint',consent:true,revision,value:snapshot})
      const response=await fetch('/api/app/my-coach/draft',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-HH-Account-ID':owner},
        body,keepalive:new TextEncoder().encode(body).length<60000,
      })
      const result=await response.json().catch(()=>null)
      if(!response.ok)throw Error('DRAFT_SAVE_FAILED')
      return result
    },state=>{if(draftMountedRef.current&&autoSaveRef.current)setAutoSaveStatus(state)},initialDraftRevision.current)
    autoSaveQueueRef.current.offer(value)
    return true
  }
  function retainPendingClient(){
    const pendingClient=inFlightClientRef.current
    if(!pendingClient)return true
    const rows=turnsRef.current,entry={role:'user',content:pendingClient.message,unanswered:true}
    if(!coachProtocolCanAppend(rows,[entry])){setError(protocolCopy[lang].limit);return false}
    inFlightClientRef.current=null
    const next=[...rows,entry]
    turnsRef.current=next;setTurns(next);queuePrivateDraft(next)
    return true
  }
  // The last reply must be captured even if the user leaves before React
  // commits a render. Do not rotate the archive or discard its first turns.
  function commitCompletedClientTurn(requestId,message,reply){
    if(turnRequestRef.current!==requestId||inFlightClientRef.current?.requestId!==requestId)return false
    const rows=turnsRef.current,entries=[{role:'user',content:message},reply]
    if(!coachProtocolCanAppend(rows,entries)){
      retainPendingClient();setError(protocolCopy[lang].limit);return false
    }
    const next=[...rows,...entries]
    inFlightClientRef.current=null
    turnsRef.current=next;setTurns(next);queuePrivateDraft(next)
    return true
  }
  async function discardPrivateDraft(){
    if(profileV3BusyRef.current||courseGateBusyRef.current)return
    if(autoSaveRef.current&&!window.confirm(({ru:'Остановить автосохранение и удалить незавершённую запись?',en:'Stop autosaving and discard this unfinished record?',es:'¿Detener el guardado automático y eliminar este borrador?'})[lang]))return
    autoSaveRef.current=false;setAutoSaveEnabled(false);autoSaveQueueRef.current?.stop()
    const owner=protocolOwnerRef.current,id=protocolIdRef.current
    if(!owner||!id){setAutoSaveStatus('idle');return}
    try{
      const response=await fetch('/api/app/my-coach/draft',{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-HH-Account-ID':owner},
        body:JSON.stringify({action:'discard',confirmed:true,id})})
      const result=await response.json().catch(()=>null)
      if(!response.ok||result?.deleted!==true)throw Error('DRAFT_DISCARD_FAILED')
      profileV3Ref.current=null;setProfileV3(null);setProfileV3CanStart(false)
      profileV3FaultRef.current=false;setProfileV3Fault(false);restoredProfileProof.current=null
      // Explicit discard tombstones the old ID. A later voluntary manual
      // report is a new save decision, never a retry of the erased record.
      protocolSaveSnapshotRef.current=null
      setProtocolSaveLocked(false)
      courseGateRef.current=null;courseGateAttemptRef.current=null;setCourseGate(null);setCourseGateError(false);setCourseFieldReview(null)
      setAutoSaveStatus('discarded')
    }catch{setAutoSaveStatus('discard_error')}
  }
  useEffect(()=>{
    if(!autoSaveEnabled||protocolSaved)return
    const pendingClient=inFlightClientRef.current
    const rows=pendingClient?[...turns,{role:'user',content:pendingClient.message,unanswered:true}]:turns
    queuePrivateDraft(rows)
  },[turns,autoSaveEnabled,protocolSaved])
  useEffect(()=>{
    if(!autoSaveEnabled)return
    const retry=()=>{void autoSaveQueueRef.current?.flush()}
    const hidden=()=>{if(document.visibilityState==='hidden')retry()}
    window.addEventListener('online',retry);window.addEventListener('pagehide',retry)
    document.addEventListener('visibilitychange',hidden)
    const timer=window.setInterval(retry,12000)
    return()=>{window.clearInterval(timer);window.removeEventListener('online',retry);window.removeEventListener('pagehide',retry);document.removeEventListener('visibilitychange',hidden)}
  },[autoSaveEnabled])
  function appendLiveTranscript(role,text,{interrupted=false}={}){
    if(courseGateRef.current||courseGateAttemptRef.current||courseGateBusyRef.current)return
    const value=String(text||'').trim().slice(0,1200)
    if(!value)return
    // The transport emits final utterances once; identical consecutive words
    // can be legitimate client answers. Preserve them and the original opening.
    // Use the synchronous ref so End immediately after an audio packet sees it.
    const entry={role,content:value,locale:conversationLang,
      ...(role==='assistant'?{mode:'ai',inference:{
        provider:'gemini_live_free',model:'gemini-3.1-flash-live-preview'},
        ...(interrupted?{interrupted:true}:{})}:{})}
    if(!coachProtocolCanAppend(turnsRef.current,[entry])){
      setError(protocolCopy[lang].limit)
      queueMicrotask(()=>speechRef.current?.stop?.());return
    }
    const next=[...turnsRef.current,entry]
    turnsRef.current=next
    setTurns(next)
    queuePrivateDraft(next)
    setSessionClockStarted(true)
    setIntroComplete(true)
    if(role==='user'){setSpeechPreview('')}
    else setStreamingPreview('')
    // Leave room for the last interrupted output when stopping; never silently
    // roll the report window and erase the first client statements.
    if(next.length>=159||next.reduce((sum,row)=>sum+String(row.content||'').length+String(row.suggestion||'').length,0)>=67500){
      setError(protocolCopy[lang].limit)
      queueMicrotask(()=>speechRef.current?.stop?.())
    }
    return true
  }
  function markCoachSpeechInterrupted(spokenText){
    // The response remains in the report as visible text but is not reused as
    // something the client fully heard. Preserve the production barge-in logic.
    const next=markLatestCoachReplyInterrupted(turnsRef.current,spokenText)
    if(next===turnsRef.current)return
    turnsRef.current=next;setTurns(next)
    const waiting=inFlightClientRef.current
    queuePrivateDraft(waiting?[...next,{role:'user',content:waiting.message,unanswered:true}]:next)
  }
  function cancelPendingCoachTurn(){
    setStreamingPreview('')
    turnRequestRef.current+=1
    const active=pending.current
    if(active){pending.current=null;active.abort();setBusy(false)}
  }
  function handleVoiceStateChange(next){
    const wasPaused=voicePauseRef.current
    voicePauseRef.current=next.phase==='paused'
    setVoiceState(next)
    if(!voicePauseRef.current||wasPaused)return
    freezeActiveClock()
    cancelPendingCoachTurn()
    retainPendingClient()
    replayControllerRef.current?.abort();replayPlayerRef.current?.cancel()
    setReplaying(false)
    // Existing consented owner-only checkpoint, not a finished report.
    queuePrivateDraft(turnsRef.current)
    void autoSaveQueueRef.current?.flush()
  }
  function pauseVoiceConversation(options){
    return speechRef.current?.pauseSession?.(options)===true
  }
  pauseActionRef.current=pauseVoiceConversation
  function courseGateHandoffText(locale){return ({ru:'Вступление завершено. Продолжим в режиме проверяемого протокола: сначала ответ, затем проверка и сохранение. Вы можете начать или закончить сессию.',en:'The opening is complete. Continue in verified protocol mode: answer, verify, then save. You can start or finish the session.',es:'La introducción ha terminado. Continúa con el protocolo verificado: responder, verificar y guardar. Puedes empezar o terminar la sesión.'})[locale]}
  function courseGateOpeningAfter(rows,locale){
    const history=rows.filter(row=>row.role==='user'&&row.unanswered!==true).slice(0,32).map(row=>String(row.content||'').slice(0,160))
    const opening=coachOpeningProgress({turns:history,locale,personaId,...localOpeningScope})
    return !freshPrivateProfile&&!profileV3&&coachCourseGateHandoffRequired({enabled:courseGateEnabled,autosave:autoSaveRef.current,courseSessionId:selectedCourseId,locale,opening})
  }
  async function sendMessage(raw,{voiceTurn=false,utteranceLocale=null,onApprovedPhrase=null,forceLocal=false}={}){
    if(courseGateRequired||courseGateRef.current||courseGateAttemptRef.current||courseGateBusyRef.current)return null
    if(profileV3BusyRef.current||profileV3FaultRef.current||(profileV3Ref.current&&!profileV3Ref.current.step.closed))return null
    if(privateTextOnly&&voiceTurn)return null
    if(restoredDraft)forceLocal=true
    if(freshPrivateProfile)forceLocal=true
    if(freshProfileAwaiting)return null
    let message=String(raw||'').trim()
    // Manual recognizer locale is authoritative for a spoken turn; never
    // re-infer it from potentially mis-scripted browser ASR output.
    const responseLocale=voiceTurn&&['en','ru','es'].includes(utteranceLocale)
      ?utteranceLocale:['en','ru','es'].includes(speechLocale)
        ?speechLocale:detectedSpeechLocale(message,lang)
    // Tapping the mic affirms the inline disclosure. Typed turns keep their
    // separate checkbox. Never contact a model if consent is absent.
    if(!message||paused||voicePauseRef.current||protocolOpen||(!voiceTurn&&busy))return null
    if(voiceTurn&&pending.current)cancelPendingCoachTurn()
    // Never replace a submitted client utterance just because the previous reply failed.
    if(inFlightClientRef.current&&!retainPendingClient())return null
    const requestId=++turnRequestRef.current
    const conversationTurns=coachAudibleTurns(turnsRef.current)
    if(turnsRef.current.length>=160){setError(protocolCopy[lang].limit);return null}
    if(!protocolStartedRef.current)protocolStartedRef.current=new Date().toISOString()
    setSessionClockStarted(true);setIntroComplete(true)
    // Explicit quote requests use only the already-authenticated first-party
    // Wisdom Library. They do not require a free model or contact OpenRouter.
    const wisdomRequested=Boolean(classifyWisdomRequest({
      locale:lang,message,turns:conversationTurns.map(({role,content})=>({role,content})),
    }))
    // The user sees the authored goal in the resulting transcript. No hidden
    // additional model input: only one explicit Send / consented mic turn.
    const goalTurn=coachGoalTurn({
      message,goal:selectedGoal,lastSharedGoal:lastSharedGoalRef.current,
      locale:responseLocale,turns:conversationTurns,skip:wisdomRequested,
    })
    // A preselected goal cannot rewrite a simple invitation reply like 'yes'.
    const goalEligible=openingProgress.completed&&openingProgress.answers.focus?.kind!=='profile'
    message=goalEligible?goalTurn.message:message
    if(!coachProtocolRoomForExchange(turnsRef.current,message)){setError(protocolCopy[lang].limit);return null}
    inFlightClientRef.current={requestId,message}
    queuePrivateDraft([...turnsRef.current,{role:'user',content:message,unanswered:true}])
    // A new focus requires the client to choose which saved topic to use again.
    const contextFocusChanged=['correction','topic_shift'].includes(
      understandCoachingTurn({locale:responseLocale,message}).act)
    if(contextFocusChanged){
      semanticHintsRef.current=[]
      setContextTopic('')
      setContextAssessments(false)
      setContextPaused(true)
    }
    const commitGoalTurn=()=>{
      if(!goalEligible)return
      if(goalTurn.goalIncluded)lastSharedGoalRef.current=goalTurn.goal
      if(goalTurn.clearGoal){
        lastSharedGoalRef.current=''
        setSelectedGoal(current=>current===selectedGoal?'':current)
      }
      if(goalTurn.deferredGoal)setError(ui.goalDeferred)
    }
    // Client safety and explicit stop always win over a synthetic retry.
    // The local guard sends no client text to a provider and cannot wait for it.
    const currentInput={locale:responseLocale,message,
      turns:conversationTurns.map(({role,content})=>({role,content}))}
    const localInterruption=forceLocal||readiness.status!=='verified'
      ?(coachingBrainSafety(currentInput)||coachingBrainBoundary(currentInput)):null
    // The last opening turn is answered locally before any generative provider
    // can race ahead into the next protocol question. Safety and stop still win.
    if(courseGateOpeningAfter([...turnsRef.current,{role:'user',content:message}],responseLocale)&&
       !coachingBrainSafety(currentInput)&&!coachingBrainBoundary(currentInput)){
      const answer=courseGateHandoffText(responseLocale)
      if(!commitCompletedClientTurn(requestId,message,{role:'assistant',content:answer,locale:responseLocale,mode:'offline',stage:'opening'}))return null
      setDraft('');setSpeechPreview('');setStreamingPreview('');return {reply:answer,mode:'offline',locale:responseLocale}
    }
    // The review of an existing profile remains first-party and deterministic.
    // Never send saved axis values or unapproved goals/tests to any model.
    if(privateTextOnly&&(restoredProfileCheckin.current||restoredProfileProof.current)&&profileSelected&&!localInterruption){
      const answer=({ru:'Сохранённые уточнения осей остаются в протоколе. Для новых оценок требуется отдельная проверка профиля; сейчас можно завершить и сохранить этот разговор.',en:'Your saved axis updates remain in this protocol. New ratings need a separate profile review; you can finish and save this conversation.',es:'Las actualizaciones guardadas siguen en el protocolo. Las nuevas valoraciones necesitan otra revisión; puedes terminar y guardar esta conversación.'})[responseLocale]
      if(!commitCompletedClientTurn(requestId,message,{role:'assistant',content:answer,locale:responseLocale,mode:'offline',stage:'profile_review'}))return null
      setDraft('');setSpeechPreview('');return {reply:answer,mode:'offline',locale:responseLocale}
    }
    if(profileReviewProgress&&!localInterruption){
      const upcoming=coachProfileReviewProgress({
        audit:approvedProfileAudit,
        turns:[...profileEvidence.slice(profileReviewStart.from),message],
        locale:responseLocale,
      })
      const answer=coachProfileReviewNextReply(upcoming,{
        goals:approvedProfileAudit.goals,measurements:approvedProfileAudit.measurements,
      }).slice(0,900)
      if(!commitCompletedClientTurn(requestId,message,{
        role:'assistant',content:answer,locale:responseLocale,mode:'offline',
        stage:'profile_review',
      }))return null
      setDraft('');setSpeechPreview('');setError('')
      return {reply:answer,mode:'offline',locale:responseLocale}
    }
    if(profileReviewStart!==null&&!profileReviewProgress&&!localInterruption){
      const answer=({ru:'Доступ к сохранённому профилю недоступен или отозван. Можно снова разрешить просмотр в «Памяти коуча», либо завершить беседу.',
        en:'Saved-profile access is unavailable or withdrawn. You may grant it again in Coach memory, or end the session.',
        es:'No hay acceso al perfil guardado o se revocó. Puedes autorizar de nuevo o terminar.'})[responseLocale]
      if(!commitCompletedClientTurn(requestId,message,{role:'assistant',
        content:answer,locale:responseLocale,mode:'offline',stage:'profile_review'}))return null
      setDraft('');setSpeechPreview('');return {reply:answer,mode:'offline',locale:responseLocale}
    }
    const needsVerifiedModel=!wisdomRequested&&!localInterruption&&
      (selectedGeminiEngine?!geminiEngineReady:readiness.status!=='verified')
    const modelReady=!forceLocal&&(!needsVerifiedModel||
      (!selectedGeminiEngine&&await retryCoachModelAfterOutage()))
    if(turnRequestRef.current!==requestId)return null
    if(forceLocal||localInterruption||authRequired||(!modelReady&&!wisdomRequested)){
      // Guests and temporarily unavailable AI still get private local coaching;
      // microphone recognition must not wait for model readiness.
      // Local-only authored fallback. NEVER send private text to an unverified model.
      // Same editorial persona prompts, same browser-only conversation history.
      const input=currentInput
      const interruption=localInterruption||coachingBrainSafety(input)||coachingBrainBoundary(input)
      // Use the shared evidence-led protocol, never advance on message count.
      // This stays in the browser; unverified models receive no client text.
      const semanticStage=coachingBrainStageDecision(input).stage
      const legacyStage={clarify:'goal',explore:'reality',awareness:'resources',
        reframe:'options',choice:'options',planning:'action',commitment:'action',integration:'action'}
      const stage=legacyStage[semanticStage]||'goal'
      const offlineOpening=!interruption?coachOpeningTurn({locale:responseLocale,
        message,openingHistory,openingPrior:localOpeningScope.priorSession,allowOpeningPrior:localOpeningScope.allowPrior,
        deferProfileToPrivateDirector:freshPrivateProfile},personaId):null
      const offlineReply=interruption||offlineOpening||
        offlineCoachingBrainReply(input,selectCoachingBrainMethod(input),semanticStage)
      const offlinePrompt=String(offlineReply.question||coachStagePrompt(personaId,stage,responseLocale,settings)||t.goal)
      // Offline: only an explicit client request can prompt a reflective close.
      const requestedWrap=/(?:подвед[её]м? итог|подвести итог|заверш(?:им|ить)|summari[sz]e|wrap up|close the session|resumir|cerrar la sesi[oó]n)/iu.test(message)
      const reflectiveClose={
        ru:'Мы можем завершить бережно. Что сегодня стало яснее, что осталось открытым и хотите ли вы сами выбрать следующий шаг?',
        en:'We can close gently. What became clearer, what remains open, and would you like to choose a next step of your own?',
        es:'Podemos cerrar con calma. ¿Qué te quedó más claro, qué sigue abierto y quieres elegir un próximo paso por tu cuenta?'
      }[responseLocale]
      const answer=(offlineOpening?offlineOpening.message:interruption?[offlineReply.reflection,offlinePrompt].filter(Boolean).join(' '):
        requestedWrap&&sessionTimebox.offerWrapUp?reflectiveClose:offlinePrompt).slice(0,900)
      const mode=offlineReply.mode||'offline'
      if(!commitCompletedClientTurn(requestId,message,{
          role:'assistant',content:answer,locale:responseLocale,reflection:offlineReply.reflection||'',
          question:offlinePrompt,
          mode,reason:mode==='offline'?(readiness.reason||'model_unavailable'):'',
          stage:offlineReply.stage||semanticStage,
          ...(offlineOpening?{openingProgress:offlineOpening.openingProgress}:{}),
      }))return null
      if(mode==='safety'||mode==='boundary')semanticHintsRef.current=[]
      if(mode==='safety'||(mode==='boundary'&&interruption?.boundary==='stop'))setPaused(true)
      setDraft('')
      setSpeechPreview('')
      commitGoalTurn()
      return {reply:answer,mode,locale:responseLocale}
    }
    const controller=new AbortController()
    pending.current?.abort()
    pending.current=controller
    setBusy(true);setError('');setStreamingPreview('')
    const sessionValid=!contextSession||(!contextSession.expired&&contextSession.expiresAt>Date.now())
    const requestedSavedContext=!contextFocusChanged&&!contextPaused&&memoryReady&&sessionValid&&
      (memorySharePrior||memoryShareGoals||memoryShareTests)
    const sessionToken=contextSession&&!contextSession.expired&&contextSession.expiresAt>Date.now()
      ?contextSession.token:undefined
    // A previous reply may quote a saved item whose grant has since changed.
    // Keep it in the local transcript and resolve approved items again server-side.
    const providerHistory=coachProviderHistory(conversationTurns)
    const providerWindow=coachTurnWindow(providerHistory,10)
    const useStreaming=coachEngine==='groq_stream'&&streamingReady&&!wisdomRequested
    try{
      if(methodSession&&!await ensureCoachMethodSession())throw Error('COACH_METHOD_SESSION_UNAVAILABLE')
      if(controller.signal.aborted||turnRequestRef.current!==requestId)return null
      const requestOptions={
        method:'POST',credentials:'same-origin',cache:'no-store',signal:controller.signal,
        headers:{'Content-Type':'application/json',...(methodSession?{'X-HH-Account-ID':methodSession.accountId}:{})},
        body:JSON.stringify({
          personaId,settings,locale:responseLocale,consent:true,message,voiceTurn:voiceTurn===true,
          courseSessionId:selectedCourseId,
          ...(methodSession?{methodId:methodSession.methodId,methodSessionId:methodSession.methodSessionId}:{}),
          ...(requestedSavedContext&&contextTopic&&(memoryShareGoals||memoryShareTests)?{contextTopic}:{}),
          ...(requestedSavedContext&&contextTopic==='personal_growth'&&memoryShareTests?{contextAssessments:true}:{}),
          ...(requestedSavedContext?{
            memoryStageToken:stagedMemory.stageToken,memorySharePrior,
            memoryShareGoals,memoryShareTests,
            ...(sessionToken?{contextSessionToken:sessionToken}:{}),
          }:{}),
          ...(selectedGeminiEngine?{
            engine:coachEngine,geminiConsent:true,
            ...(coachEngine==='gemini_free'?{geminiFreeDataConsent:true}:{})
          }:{}),
          elapsedSeconds:sessionClockStarted?Math.floor(activeClockRef.current.sample(window.performance.now())):0,
          openingHistory,
          ...(allowOpeningPrior&&openingPrior?{openingPrior,allowOpeningPrior:true}:{}),
          sessionContext:coachEphemeralContext(providerHistory,providerWindow,responseLocale,message),
          semanticHints:semanticHintsRef.current,
          turns:providerWindow
            .map(({role,content})=>({role,content})), // Preserve the latest client-stated active goal, not a greeting.
        }),
      }
      // The same consented payload and guard apply to both engines: only
      // the transport changes. Keep literal strict path for signed-in fallback.
      const response=useStreaming
        ?await fetch('/api/app/my-coach/stream',requestOptions)
        :await fetch('/api/app/my-coach/turn',requestOptions)
      if(response.status===401){
        if(inFlightClientRef.current?.requestId===requestId)retainPendingClient()
        setAuthRequired(true);return null
      }
      const result=useStreaming?await readCoachTurnStream(response,{
        signal:controller.signal,
        onApprovedPhrase:phrase=>{
          if(voiceTurn&&typeof onApprovedPhrase==='function'&&
             !controller.signal.aborted&&turnRequestRef.current===requestId)
            onApprovedPhrase(phrase,responseLocale)
        },
        onPreview:preview=>{
          if(!controller.signal.aborted&&turnRequestRef.current===requestId)setStreamingPreview(preview)
        },
      }):await response.json().catch(()=>null)
      if(!response.ok||!result?.mode||result.personaId!==personaId)throw Error('COACH_REPLY_UNAVAILABLE')
      if(controller.signal.aborted||turnRequestRef.current!==requestId)return null
      const answer=assistantText(result)
      if(!answer||answer.length>900)throw Error('COACH_REPLY_UNAVAILABLE')
      if(result.mode==='ai'&&result.semanticEvidence&&
        typeof result.semanticEvidence.kind==='string'&&
        typeof result.semanticEvidence.quote==='string'){
        const hint=result.semanticEvidence
        semanticHintsRef.current=[...semanticHintsRef.current.filter(h=>
          h.kind!==hint.kind||h.quote!==hint.quote),hint].slice(-3)
      }
      if(!commitCompletedClientTurn(requestId,message,{
          role:'assistant',content:answer,locale:responseLocale,reflection:result.reflection,question:result.question,
          hypothesis:result.hypothesis||'',mode:result.mode,requestedSavedContext,
          reason:result.offlineReason||'',stage:result.stage||'',
          sessionProgress:result.sessionProgress?.source==='director-client-evidence'
            ?result.sessionProgress:null,
          suggestion:result.planSuggestion||'',evidence:result.evidenceQuote||'',
          inference:result.mode==='ai'&&['groq','openrouter','gemini_free','gemini_paid'].includes(result.inference?.provider)&&
            typeof result.inference?.model==='string'&&result.inference.model.length<=128
            ?result.inference:null,
      }))return null
      setDraft('')
      setSpeechPreview('')
      commitGoalTurn()
      // An unsuccessful in-flight model must not strand the same hands-free
      // voice session in repeated failed calls or permanent offline mode.
      if(result.mode==='offline'&&result.offlineReason&&result.offlineReason!=='structured_opening'){
        modelProbeRef.current.lastAttempt=Date.now()
        setReadiness({status:'unavailable',reason:result.offlineReason})
      }
      if(result.mode==='safety'||result.mode==='boundary')semanticHintsRef.current=[]
      if(result.mode==='safety'||(result.mode==='boundary'&&result.boundary==='stop'))setPaused(true)
      if(result.mode==='ai'&&result.planSuggestion)setEditablePlan(result.planSuggestion)
      return {reply:answer,mode:result.mode,locale:responseLocale,
        approvedSpokenPrefix:result.approvedSpokenPrefix||''}
    }catch{
      if(inFlightClientRef.current?.requestId===requestId)retainPendingClient()
      if(!controller.signal.aborted&&turnRequestRef.current===requestId)setError(t.error)
      return null
    }finally{
      if(pending.current===controller){pending.current=null;setBusy(false);setStreamingPreview('')}
    }
  }
  // End is not navigation: stop the microphone, then let the client review and
  // download a complete local PDF, independently of optional account retention.
  function endWithProtocol(){
    if(profileV3BusyRef.current||profileV3FaultRef.current||courseGateBusyRef.current||courseGateAttemptRef.current)return
    freezeActiveClock()
    speechRef.current?.stop?.()
    replayControllerRef.current?.abort()
    replayPlayerRef.current?.cancel()
    cancelPendingCoachTurn()
    // End may cancel a pending model call. Keep the actual last client words,
    // explicitly UNANSWERED; never manufacture an assistant message.
    if(!retainPendingClient())return
    queuePrivateDraft(turnsRef.current)
    if(!protocolStartedRef.current)protocolStartedRef.current=new Date().toISOString()
    if(!protocolIdRef.current)protocolIdRef.current=crypto.randomUUID()
    setProtocolFinishedAt(new Date().toISOString())
    setProtocolError('')
    setPaused(true)
    setProtocolEditing(false)
    setProtocolOpen(true)
  }
  // Keep the active coach document across navigation, including the existing
  // public/private CSP reload boundary. No private data in the destination URL.
  function pauseForNavigation(event){
    if(!keepCoachTab||event.defaultPrevented)return
    speechRef.current?.pauseSession?.()
    const waiting=inFlightClientRef.current
    queuePrivateDraft(waiting?[...turnsRef.current,{role:'user',content:waiting.message,unanswered:true}]:turnsRef.current)
    void autoSaveQueueRef.current?.flush()
  }
  function interceptSessionExit(event){
    // The explicit Close/Back choice from the already-open Summary means
    // leaving without account retention; do not trap the client in a loop.
    if(protocolOpen||ratingOpen)return
    if(!protocolSaved&&(turnsRef.current.length>0||speechRef.current?.hasLiveSession?.())){event.preventDefault();endWithProtocol()}
  }
  // Header Back is navigation, never an entry point to the Insight dialog.
  // With prior private-save consent, wait for the existing checkpoint ACK.
  async function navigateBackToCoaches(event){
    if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return
    event.preventDefault()
    if(headerBackPendingRef.current||profileV3BusyRef.current||courseGateBusyRef.current)return
    headerBackPendingRef.current=true
    const href=event.currentTarget.href
    try{
      freezeActiveClock()
      speechRef.current?.stop?.()
      replayControllerRef.current?.abort()
      replayPlayerRef.current?.cancel()
      cancelPendingCoachTurn()
      if(!retainPendingClient())return
      setPaused(true)
      if(autoSaveRef.current&&!protocolSaved&&turnsRef.current.some(row=>row.role==='user')){
        const structured=profileV3Ref.current
        // Typed profile writes are already acknowledged by the existing draft CAS.
        const queued=!profileV3FaultRef.current&&!(structured&&!structured.step.closed)&&queuePrivateDraft(turnsRef.current)
        const revision=courseGateAttemptRef.current?null:courseGateRef.current?courseGateRef.current.revision:profileV3FaultRef.current?null:structured&&!structured.step.closed?structured.revision:queued?await autoSaveQueueRef.current?.flush():null
        if(!revision&&!window.confirm(({en:'Your latest private checkpoint could not be confirmed. Leave anyway? Cancel to retry.',
          ru:'Не удалось подтвердить сохранение последних данных. Всё равно выйти? Отмените, чтобы повторить.',
          es:'No se pudo confirmar el último guardado privado. ¿Salir de todos modos? Cancela para reintentar.'})[lang]))return
      }
      window.location.assign(href)
    }finally{headerBackPendingRef.current=false}
  }
  function resumeFromProtocol(){
    if(protocolSaved||protocolSaveLocked)return // Saved report is immutable; the client may start a new session.
    if(!autoSaveRef.current&&turnsRef.current.at(-1)?.unanswered===true){
      const last=turnsRef.current.at(-1)
      const recovered=turnsRef.current.slice(0,-1)
      turnsRef.current=recovered
      setTurns(recovered)
      setDraft(previous=>previous.trim()?previous:last.content)
    }
    setCourseFieldReview(courseGateRef.current?.step.review||null) // preserve acknowledged thematic answers on continuation
    setProtocolOpen(false)
    setProtocolFinishedAt(null)
    setPaused(false)
  }
  function currentProtocol(){
    if(!protocolFinishedAt||!protocolIdRef.current)throw Error('MY_COACH_PROTOCOL_NOT_FINAL')
    return normalizeMyCoachProtocol({
      id:protocolIdRef.current,personaId,methodId:visibleMethodId,locale:restoredProfileProof.current?.value.block.locale||conversationLang,
      courseSessionId:selectedCourseId,
      startedAt:protocolStartedRef.current||protocolFinishedAt,
      completedAt:protocolFinishedAt,durationSeconds:Math.floor(activeSessionSeconds),
      goal:selectedGoal,clientSummary:protocolSummary,clientNextStep:protocolNextStep,
      ...(effectiveCourseReview?.courseSessionId===selectedCourseId?{courseFieldReview:effectiveCourseReview}:{}),
      ...(turns.some((row,index)=>row.unanswered===true||row.role!==(index%2===0?'user':'assistant'))||
         turns.at(-1)?.role==='user'?{turnLayout:'chronological'}:{}),
      opening:courseGateRef.current?.protocol.opening||coachOpeningProtocolSnapshot(openingProgress),
      ...(restoredProfileProof.current?{[restoredProfileProof.current.key]:restoredProfileProof.current.value}:
        restoredProfileCheckin.current?{profileCheckin:restoredProfileCheckin.current}:profileReviewProgress
        ?{profileCheckin:coachProfileReviewProtocolSnapshot(profileReviewProgress)}:
          (profileReviewStart!==null?{}:
            profileProgress?{profileCheckin:coachProfileProtocolSnapshot(profileProgress)}:{})),
      turns:turns.map((row,index)=>({
        role:row.role,content:row.content,
        ...(row.role==='user'&&row.unanswered===true?{unanswered:true}:{}),
        ...(row.role==='assistant'?{
          ...(['ai','offline','wisdom','safety','boundary'].includes(row.mode)?{mode:row.mode}:{}),
          ...(typeof row.stage==='string'?{stage:row.stage.slice(0,64)}:{}),
          ...(typeof row.suggestion==='string'?{suggestion:row.suggestion.slice(0,300)}:{}),
          ...(row.interrupted===true?{interrupted:true}:{}),
        }:{}),
      })),
    })
  }
  function exportProtocol(print=false,documentKind='protocol'){
    try{
      const options=myCoachProtocolPdfOptions(protocolSaveSnapshotRef.current||currentProtocol(),{locale:conversationLang,documentKind})
      if(print)openCoachingSessionPdf(options)
      else downloadCoachingSessionPdf(options)
      setProtocolError('')
    }catch{setProtocolError(protocolCopy[lang].pdfError)}
  }
  async function saveProtocol(){
    if(protocolSaving||protocolSaved||profileV3BusyRef.current||profileV3FaultRef.current||courseGateBusyRef.current||courseGateAttemptRef.current)return false
    const owner=protocolOwnerRef.current
    if(!owner){setProtocolError(({ru:'Не удалось подтвердить аккаунт в начале разговора. Скачайте PDF, чтобы не потерять отчёт.',en:'The account was not verified at the start of this conversation. Download the PDF to keep your report.',es:'No se verificó la cuenta al inicio de la conversación. Descarga el PDF para conservar tu informe.'})[lang]);return}
    let protocol
    try{
      if(!protocolSaveSnapshotRef.current&&autoSaveStatus==='discarded'){
        // Explicitly erased record cannot authorize a new logical ID.
        restoredProfileProof.current=null
        protocolIdRef.current=crypto.randomUUID()
      }
      protocol=protocolSaveSnapshotRef.current||currentProtocol()
      protocolSaveSnapshotRef.current=protocol // idempotent retry even after timeout
      setProtocolSaveLocked(true)
    }catch{setProtocolError(protocolCopy[lang].error);return}
    setProtocolSaving(true);setProtocolError('')
    try{
      let draftRevision
      if(autoSaveRef.current){
        const structured=profileV3Ref.current
        if(courseGateRef.current)draftRevision=courseGateRef.current.revision
        else if(structured&&!structured.step.closed)draftRevision=structured.revision
        else{
          if(!queuePrivateDraft(turnsRef.current))throw Error('DRAFT_NOT_SYNCED')
          draftRevision=await autoSaveQueueRef.current?.flush()
        }
        if(draftRevision===null||draftRevision===undefined)throw Error('DRAFT_NOT_SYNCED')
      }
      const response=await fetch('/api/app/my-coach/protocol',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-HH-Account-ID':owner},
        body:JSON.stringify({action:'save',consent:true,protocol,...(draftRevision!==undefined?{draftRevision}:{})}),
      })
      const result=await response.json().catch(()=>null)
      if(!response.ok||result?.saved!==true||result.id!==protocol.id)throw Error(result?.error||'SAVE_FAILED')
      autoSaveQueueRef.current?.stop();autoSaveRef.current=false;setAutoSaveEnabled(false)
      profileV3Ref.current=null;setProfileV3(null);setProfileV3CanStart(false)
      courseGateRef.current=null;setCourseGate(null)
      setProtocolSaved(true)
      setProtocolEditing(false)
      return true
    }catch{setProtocolError(protocolCopy[lang].error);return false}
    finally{setProtocolSaving(false)}
  }

  async function closeProtocolToRating(){
    // Cancel is not Save. An uncertain attempted save must be retried
    // against the same snapshot; never claim it did not commit.
    if(protocolSaving||(protocolSaveLocked&&!protocolSaved))return
    setProtocolEditing(false)
    if(!protocolSaved){
      resumeFromProtocol()
      setPaused(true)
      return // retain separately consented draft; never finalize or publish
    }
    setProtocolOpen(false)
    setRatingError(false)
    setRatingOpen(true)
  }
  async function submitSessionRating(){
    if(ratingSaving||ratingSaved||rating.stars<1||!protocolIdRef.current)return
    setRatingSaving(true)
    setRatingError(false)
    try{
      const response=await fetch('/api/app/my-coach/rating',{
        method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({sessionId:protocolIdRef.current,personaId,
          stars:rating.stars,character:rating.character,
          intelligence:rating.intelligence,impression:rating.impression}),
      })
      const data=await response.json().catch(()=>null)
      if(!response.ok||data?.saved!==true||
        data.sessionId!==protocolIdRef.current)throw Error('RATING_NOT_SAVED')
      setRatingSaved(true)
    }catch{setRatingError(true)}
    finally{setRatingSaving(false)}
  }
  const ratingUi=sessionRatingCopy[lang]
  const protocolUi=protocolCopy[lang]
  // Reuse existing normalized protocol/PDF projection, not a second AI
  // extractor. The method overview is explicitly provisional, not verified.
  let insightOverview='',insightResult=null,insightRows=[],insightProfile=null
  if(protocolOpen&&protocolFinishedAt&&turns.length){
    try{
      insightResult=protocolSaveSnapshotRef.current||currentProtocol()
      insightOverview=myCoachProtocolPdfOptions(insightResult,{locale:conversationLang}).protocolOverview||''
      insightRows=coachCourseProtocolRows(insightResult.courseSessionId,insightResult.turns,insightResult.courseFieldReview,lang)
      insightProfile=coachSavedProfileV3(insightResult,lang)
    }catch{/* show unavailable, retain original dialogue */}
  }

  // Preserve the approved pre-session profile until voice or a client turn starts.
  const sessionHasStarted=sessionClockStarted||voiceState.phase!=='idle'||turns.length>0
  async function loadPrivateResume(cursor=null){
    const owner=protocolOwnerRef.current
    if(!owner||resumeBusy||protocolStartedRef.current)return
    setResumeBusy(true);setResumeError(false)
    try{
      const query=new URLSearchParams({view:'summary',personaId,...(cursor||{})})
      const response=await fetch('/api/app/my-coach/draft?'+query.toString(),{credentials:'same-origin',cache:'no-store',headers:{'X-HH-Account-ID':owner}})
      const result=await response.json().catch(()=>null)
      if(!response.ok||!Array.isArray(result?.drafts))throw Error('RESUME_LOAD')
      if(!draftMountedRef.current||protocolOwnerRef.current!==owner||protocolStartedRef.current)return
      const items=result.drafts.filter(row=>row?.personaId===personaId&&Number.isInteger(row.turnCount)&&row.turnCount>0)
      setResumeList(previous=>({owner,items:cursor&&previous?.owner===owner?[...new Map([...previous.items,...items].map(x=>[x.id,x])).values()]:items,cursor:result.nextCursor||null}))
    }catch{if(draftMountedRef.current)setResumeError(true)}
    finally{if(draftMountedRef.current)setResumeBusy(false)}
  }
  function readProfileV3Step(item,protocol){
    if(!item.profileStep)return null
    const step=item.profileStep,q=step.pending
    if(!Number.isInteger(item.revision)||item.revision<1||item.revision>9999||
       step.track!==coachProfileTrackForCourse(protocol.courseSessionId)||typeof step.closed!=='boolean'||
       (q!==null&&(!q||typeof q.id!=='string'||typeof q.turnId!=='string'||typeof q.text!=='string'||
       !['current','desired','pair','priority'].includes(q.slot))))throw Error('PROFILE_READBACK_INVALID')
    return {step,revision:item.revision,protocol}
  }
  // This is the existing private resumed dialogue, not a second coach or
  // provider. The draft CAS row owns the outstanding question and all ratings.
  async function runProfileV3(action,extra={}){
    const owner=protocolOwnerRef.current,id=protocolIdRef.current
    const start=action==='profile-start'
    if(!privateTextOnly||!profileV3Enabled||!autoSaveRef.current||!owner||!id||busy||
       paused||protocolOpen||profileV3BusyRef.current||profileV3FaultRef.current)return false
    if(start){
      if(!structuredProfileCanStart||profileV3Ref.current||!profileSelected||draft.trim()||
         profileProgress?.ratings?.length||restoredProfileProof.current)return false
      queuePrivateDraft(turnsRef.current)
    }else if(!profileV3Ref.current||profileV3Ref.current.step.closed)return false
    profileV3BusyRef.current=true;setProfileV3Busy(true);setProfileV3Error(false)
    let attempted=false
    try{
      let revision=profileV3Ref.current?.revision
      if(start){
        revision=await autoSaveQueueRef.current?.flush()
        if(!Number.isInteger(revision))throw Error('DRAFT_NOT_SYNCED')
        autoSaveQueueRef.current?.stop();autoSaveQueueRef.current=null
      }
      if(!Number.isInteger(revision)||revision<1||revision>=9999)throw Error('PROFILE_REVISION_INVALID')
      attempted=true
      const response=await fetch('/api/app/my-coach/draft',{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-HH-Account-ID':owner},
        body:JSON.stringify({action,id,revision,consent:true,...extra})})
      const result=await response.json().catch(()=>null),item=result?.draft
      if(!response.ok||item?.id!==id||item.revision!==revision+1)throw Error('PROFILE_STEP_NOT_ACKNOWLEDGED')
      const recovered=normalizeMyCoachDraft(item),p=recovered.protocol
      if(!draftMountedRef.current||protocolOwnerRef.current!==owner||p.personaId!==personaId||
         recovered.courseSessionId!==selectedCourseId)throw Error('ACCOUNT_CHANGED')
      const next=readProfileV3Step(item,p)
      if(!next)throw Error('PROFILE_READBACK_INVALID')
      restoredProfileProof.current=coachProfileArchiveEnvelope(p);restoredProfileCheckin.current=null
      initialDraftRevision.current=item.revision;profileV3Ref.current=next;turnsRef.current=p.turns
      setProfileV3(next);setProfileV3CanStart(false);setTurns(p.turns);setAutoSaveStatus('saved')
      setProfileV3Answer('');setProfileV3Correction('')
      return true
    }catch{
      // A lost response may have committed; never send another write with
      // an assumed revision or fall back to an unbound legacy profile.
      if(attempted){profileV3FaultRef.current=true;setProfileV3Fault(true)}
      if(draftMountedRef.current){setProfileV3Error(true);setAutoSaveStatus('error')}
      return false
    }finally{profileV3BusyRef.current=false;if(draftMountedRef.current)setProfileV3Busy(false)}
  }
  function readCourseGateStep(item,protocol){
    if(!item.courseGateStep)return null
    const step=item.courseGateStep,q=step.prompt
    if(!Number.isInteger(item.revision)||item.revision<1||item.revision>9999||
       typeof step.paused!=='boolean'||typeof step.completed!=='boolean'||
       (q!==null&&(!q||typeof q.id!=='string'||typeof q.fieldId!=='string'||typeof q.text!=='string'||
       !['answer','confirm'].includes(q.kind))))throw Error('COURSE_GATE_READBACK')
    const review=normalizeCoachCourseFieldReview(step.review,protocol.courseSessionId,protocol.turns)
    return {step:{...step,review},revision:item.revision,protocol}
  }
  async function runCourseGate(action,extra={}){
    const owner=protocolOwnerRef.current,id=protocolIdRef.current
    if(!courseGateEnabled||!autoSaveRef.current||!owner||!id||courseGateBusyRef.current||
       paused||protocolOpen||busy||profileV3Ref.current)return false
    const retry=action==='retry',start=action==='course-gate-start'
    if(retry&&!courseGateAttemptRef.current)return false
    if(!retry&&courseGateAttemptRef.current)return false
    if(start){
      if(!courseGateCanStart||courseGateRef.current||inFlightClientRef.current)return false
      if(!queuePrivateDraft(turnsRef.current)){setCourseGateError(true);return false}
    }else if(!retry&&(!courseGateRef.current||courseGateRef.current.step.paused))return false
    courseGateBusyRef.current=true;setCourseGateBusy(true);setCourseGateError(false)
    try{
      let payload=courseGateAttemptRef.current
      if(!payload){
        const revision=start?await autoSaveQueueRef.current?.flush():courseGateRef.current?.revision
        if(!Number.isInteger(revision)||revision<1)throw Error('COURSE_GATE_NOT_SYNCED')
        if(start){autoSaveQueueRef.current?.stop();autoSaveQueueRef.current=null;speechRef.current?.stop?.()}
        payload={action,id,revision,consent:true,requestId:crypto.randomUUID(),...extra}
        courseGateAttemptRef.current=payload
      }
      const response=await fetch('/api/app/my-coach/draft',{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-HH-Account-ID':owner},body:JSON.stringify(payload)})
      const result=await response.json().catch(()=>null),item=result?.draft
      if(!response.ok||item?.id!==id||item.revision!==payload.revision+1)throw Error('COURSE_GATE_NOT_ACKNOWLEDGED')
      const recovered=normalizeMyCoachDraft(item),p=recovered.protocol
      if(!draftMountedRef.current||protocolOwnerRef.current!==owner||p.personaId!==personaId||
         recovered.courseSessionId!==selectedCourseId)throw Error('ACCOUNT_CHANGED')
      const next=readCourseGateStep(item,p);if(!next)throw Error('COURSE_GATE_READBACK')
      initialDraftRevision.current=item.revision
      courseGateRef.current=next;courseGateAttemptRef.current=null;turnsRef.current=p.turns
      setCourseGate(next);setCourseFieldReview(next.step.review);setTurns(p.turns)
      setCourseGateAnswer(start?draft.trim():'');if(start)setDraft('');setAutoSaveStatus('saved')
      return true
    }catch{if(draftMountedRef.current){setCourseGateError(true);setAutoSaveStatus('error')}return false}
    finally{courseGateBusyRef.current=false;if(draftMountedRef.current)setCourseGateBusy(false)}
  }
  async function restorePrivateDraft(item){
    const owner=protocolOwnerRef.current
    if(!owner||resumeList?.owner!==owner||resumeBusy||resumeInFlight.current||protocolStartedRef.current||turnsRef.current.length)return
    resumeInFlight.current=true;setResumeBusy(true);setResumeError(false)
    try{
      const identity=await getCabinetBootstrap('portrait',{refresh:true})
      if(identity?.account?.id!==owner)throw Error('ACCOUNT_CHANGED')
      const response=await fetch('/api/app/my-coach/draft',{method:'POST',credentials:'same-origin',cache:'no-store',
        headers:{'Content-Type':'application/json','X-HH-Account-ID':owner},
        body:JSON.stringify({action:'resume',id:item.id,revision:item.revision,confirmed:true})})
      const result=await response.json().catch(()=>null)
      if(!response.ok||result?.draft?.id!==item.id||result.draft.protocol?.personaId!==personaId)throw Error('RESUME_CONFLICT')
      if(!draftMountedRef.current||protocolOwnerRef.current!==owner||protocolStartedRef.current)return
      const recovered=normalizeMyCoachDraft(result.draft),p=recovered.protocol
      speechRef.current?.stop?.();cancelPendingCoachTurn()
      if(!Number.isInteger(result.draft.revision)||result.draft.revision<1||result.draft.revision>9999)throw Error('RESUME_CONFLICT')
      protocolIdRef.current=p.id;protocolStartedRef.current=p.startedAt
      initialDraftRevision.current=result.draft.revision
      restoredOpeningScope.current=recoverPrivateOpeningScope(p)
      restoredMethod.current=p.methodId
      // Sparse historical-review ratings cannot be replayed against a new
      // baseline. Keep the saved updates and require a fresh review later.
      restoredProfileProof.current=coachProfileArchiveEnvelope(p)
      const thematic=readCourseGateStep(result.draft,p)
      courseGateRef.current=thematic;courseGateAttemptRef.current=null;setCourseGate(thematic);setCourseGateError(false)
      setCourseFieldReview(thematic?.step.review||null);setCourseGateEnabled(result.courseGateEnabled===true)
      const structured=readProfileV3Step(result.draft,p)
      profileV3Ref.current=structured;setProfileV3(structured)
      setProfileV3Enabled(result.profileV3Enabled===true)
      setProfileV3CanStart(Boolean(!structured&&!restoredProfileProof.current&&!p.profileCheckin?.ratings?.length&&
        coachProfileTrackForCourse(recovered.courseSessionId)&&p.opening?.completed&&p.opening.focus==='profile'))
      profileV3FaultRef.current=false;setProfileV3Fault(false)
      restoredProfileCheckin.current=p.profileCheckin?.version===COACH_PROFILE_REVIEW_VERSION?p.profileCheckin:null
      autoSaveRef.current=true;engineManuallySelectedRef.current=true;turnsRef.current=p.turns
      flushSync(()=>{
        setRestoredDraft(true);setFreshPrivateProfile(recovered.privateProfileV3Requested===true);setAutoSaveEnabled(true);setAutoSaveStatus('saved')
        setTurns(p.turns);setSelectedCourseId(recovered.courseSessionId);setSpeechLocale(p.locale)
        setSelectedGoal('')
        if(restoredProfileCheckin.current)setProfileReviewStart({from:p.turns.filter(row=>row.role==='user'&&row.unanswered!==true).length,token:null,provider:null})
        setActiveSessionSeconds(activeClockRef.current.restore(p.durationSeconds||0));setSessionClockStarted(true)
        setGreetingAccepted(true);setIntroComplete(true);setPaused(false)
        setAllowOpeningPrior(false);setStagedMemory(null);setContextTopic('');setContextPaused(true)
        setGeminiLiveConsent(false);setGeminiConsent(false);setCoachEngine('groq_stream');setDraft('')
      })
      toggleComposer()
    }catch{if(draftMountedRef.current)setResumeError(true)}
    finally{resumeInFlight.current=false;if(draftMountedRef.current)setResumeBusy(false)}
  }
  const keepCoachTab=(liveVoiceSelected||voiceState.phase!=='idle')&&sessionHasStarted&&!protocolOpen&&!ratingOpen&&!protocolSaved
  const browseTitle=keepCoachTab?({ru:'Открыть в новой вкладке, сохранив разговор',en:'Open in a new tab and keep your conversation',es:'Abrir en otra pestaña y conservar la conversación'})[lang]:undefined
  const browseProps=keepCoachTab?{target:'_blank',rel:'noopener noreferrer',title:browseTitle,onClick:pauseForNavigation}:{onClick:interceptSessionExit}
  function enterCoachingFromGreeting(id=INTRODUCTORY_COACH_SESSION_ID,{privateProfile=false}={}){
    if(resumeInFlight.current)return
    if(privateProfile&&(!profileV3Enabled||!protocolOwnerRef.current||!coachProfileTrackForCourse(id)))return
    if(id===MEANING_AXES_COACH_SESSION_ID&&!privateProfile)return
    // Commit the chosen topic before the synchronous iOS activation gesture.
    // Gemini reads the current courseSessionId from its mounted props ref;
    // opening or dismissing the topic menu never calls this function.
    const focus=id===INTRODUCTORY_COACH_SESSION_ID||privateProfile?'':coachCourseFocusLabel(id,conversationLang)
    const method=selectedMethod&&resolveCoachMethodId(personaId,selectedMethod)
    const locked=method&&protocolOwnerRef.current?{methodId:method,methodSessionId:crypto.randomUUID(),accountId:protocolOwnerRef.current}:null
    // Starting a session after the private-storage notice enables first-party archival only.
    const saveToAccount=Boolean(protocolOwnerRef.current)
    autoSaveRef.current=saveToAccount
    flushSync(()=>{
      setAutoSaveEnabled(saveToAccount)
      setFreshPrivateProfile(privateProfile)
      if(privateProfile){
        engineManuallySelectedRef.current=true
        setCoachEngine('groq_stream');setGeminiLiveConsent(false);setGeminiConsent(false);setGeminiVoiceConsent(false)
        setAllowOpeningPrior(false);setStagedMemory(null);setContextPaused(true)
      }
      setMethodSession(privateProfile?null:locked)
      setSelectedCourseId(id)
      setSelectedGoal(focus)
      setGreetingAccepted(true)
    })
    if(privateProfile){toggleComposer();return}
    if(liveVoiceSelected&&liveVoiceReady&&!busy&&!paused&&!replaying)
      speechRef.current?.startSession?.()
  }
  const motionPhase=paused||voiceState.phase==='paused'?'idle':voiceState.phase==='speaking'?'speaking':
    voiceState.phase==='listening'?'listening':
    (voiceState.phase==='thinking'||busy)?'thinking':!introComplete?'greeting':'idle'
  // The visual director observes real speech ownership and the current turn only.
  // Existing turn, microphone and playback handlers remain authoritative.
  const reactionLastTurn=turns[turns.length-1]
  const reactionReplyText=streamingPreview||
    (!inFlightClientRef.current&&reactionLastTurn?.role==='assistant'&&!reactionLastTurn.interrupted?reactionLastTurn.content:(!introComplete?introduction:''))
  const reactionStage=!inFlightClientRef.current&&reactionLastTurn?.role==='assistant'&&!reactionLastTurn.interrupted?reactionLastTurn.stage||'':''
  const reactionClientText=motionPhase==='listening'?speechPreview:
    ['thinking','speaking'].includes(motionPhase)?
      (inFlightClientRef.current?.message||[...turns].reverse().find(turn=>turn.role==='user')?.content||''):''
  const reactionReplyScene=selectCoachVisualScene({phase:motionPhase,text:reactionReplyText,stage:reactionStage})
  const reactionIntent=coachReactionIntent({
    phase:voiceState.phase==='loading'?'loading':motionPhase,micActive:reactionActivity.micActive,
    clientText:reactionClientText,coachText:reactionReplyText,coachScene:reactionReplyScene,stage:reactionStage,
    paused:paused||voicePaused,opening:!restoredDraft&&(!introComplete||(!turns.length&&!inFlightClientRef.current)),
    closing:reactionStage==='closing'||reactionStage==='farewell'||coachExplicitFarewell(reactionClientText),
    turnKey:turns.filter(turn=>turn.role==='user').length+(inFlightClientRef.current?1:0)
  })
  const visualScene=reactionIntent.scene
  const speakerLabel=outputMuted?({ru:'Включить звук коуча',en:'Unmute coach audio',es:'Activar sonido del coach'})[lang]:({ru:'Выключить звук коуча',en:'Mute coach audio',es:'Silenciar al coach'})[lang]
  const hangupLabel=({ru:'Завершить диалог',en:'End conversation',es:'Finalizar conversación'})[lang]
  const videoViewLabel=viewExpanded?
    ({ru:'Свернуть видео коуча',en:'Collapse coach video',es:'Contraer el vídeo del coach'})[lang]:
    ({ru:'Развернуть видео коуча',en:'Expand coach video',es:'Ampliar el vídeo del coach'})[lang]
  return <section ref={sessionRootRef} className={`${styles.root} ${callStyles.rootV6}`} lang={lang} data-coach-dock-v6 data-coach-dialogue-active={sessionHasStarted?'true':'false'} data-my-coach-live-dialogue={personaId} data-my-coach-immersive-session data-session-visual-v2 data-session-visual-v3 data-session-visual-v4 data-session-visual-v5 data-coach-view-expanded={viewExpanded?'true':'false'} data-coach-session-started={sessionClockStarted?'true':'false'} data-coach-prestart-profile={sessionHasStarted?'false':'true'} data-coach-showcase={introComplete?'false':'true'}
    data-coach-greeting-stage={greetingAccepted?'session':'introduction'}>
    <header className={styles.sessionTopbar}>
      <Link className={styles.sessionBrand} href={'/'+lang} {...browseProps} onClick={keepCoachTab?pauseForNavigation:navigateBackToCoaches} aria-label="Holistic House">
        <span className={styles.sessionBrandMark} aria-hidden="true">✿</span><span>Holistic House</span>
      </Link>
      <div className={styles.sessionTopbarActions}>
        <button type="button" className={styles.headerProfileControl} data-coach-profile-open
          onClick={openCoachProfile} aria-label={lang==='ru'?'Профиль коуча':lang==='es'?'Perfil del coach':'Coach profile'} title={ui.profile}>
          <UserRound size={18} aria-hidden="true"/><span>{ui.profile}</span>
        </button>
        <label className={styles.languageControl}
          title={captions.languageLabel+' · '+conversationLang.toUpperCase()} data-coach-language-control>
          <Languages size={16} aria-hidden="true"/>
          <span className={styles.languageChoice}>
            <select aria-label={captions.languageLabel} value={speechLocale}
              onChange={event=>setSpeechLocale(event.target.value)}>
              <option value="en">EN</option>
              <option value="ru">RU</option>
              <option value="es">ES</option>
            </select>
          </span>
        </label>
        <Link className={styles.chooseCoach} href={'/'+lang+'/my-coach'} onClick={navigateBackToCoaches} aria-label={{ru:'Назад',en:'Back',es:'Volver'}[lang]}>
          <ArrowLeft size={16} aria-hidden="true"/>
          <span className={styles.chooseCoachFull}>{{ru:'Назад',en:'Back',es:'Volver'}[lang]}</span>
          <span className={styles.chooseCoachShort} aria-hidden="true">{{ru:'Назад',en:'Back',es:'Volver'}[lang]}</span>
        </Link>
      </div>
    </header>
    {!greetingAccepted&&<MyCoachGreetingGate
      personaId={personaId} locale={conversationLang} name={name}
      methodId={visibleMethodId} onStart={enterCoachingFromGreeting} accountSaving={protocolOwnerReady}
      selectedMethod={selectedMethod} onMethodSelect={setSelectedMethod}
      methodSelectionEnabled={protocolOwnerReady}
      privateProfileEnabled={protocolOwnerReady&&profileV3Enabled}
      resumeControl={protocolOwnerReady&&<div data-coach-resume-choices style={{padding:12}}>
        <button type="button" disabled={resumeBusy} onClick={()=>void loadPrivateResume()}>{({ru:'Продолжить сохранённую сессию',en:'Continue a saved session',es:'Continuar una sesión guardada'})[lang]}</button>
        {resumeList&&<p>{({ru:'Приватное текстовое продолжение без нового голосового токена.',en:'Private text continuation without a new voice token.',es:'Continuación privada por texto sin un nuevo token de voz.'})[lang]}</p>}
        {resumeList?.items.map(item=><button key={item.id} type="button" disabled={resumeBusy}
          onClick={()=>void restorePrivateDraft(item)} style={{display:'block',marginTop:8}}>
          {new Date(item.updatedAt).toLocaleString(lang)} · {coachCourseFocusLabel(item.courseSessionId,conversationLang)} · {item.turnCount}
        </button>)}
        {resumeList&&resumeList.items.length===0&&<p>{({ru:'Нет черновиков этого коуча на данной странице.',en:'No drafts for this coach on this page.',es:'No hay borradores de este coach en esta página.'})[lang]}</p>}
        {resumeList?.cursor&&<button type="button" disabled={resumeBusy} onClick={()=>void loadPrivateResume(resumeList.cursor)}>{({ru:'Ранние сессии',en:'Earlier sessions',es:'Sesiones anteriores'})[lang]}</button>}
        {resumeError&&<p role="alert">{({ru:'Сессия изменилась или недоступна. Обновите список.',en:'Session changed or is unavailable. Refresh the list.',es:'La sesión cambió o no está disponible. Actualiza la lista.'})[lang]}</p>}
      </div>}
      />}
    {/* Keep Live mounted for Safari audio activation, but hide all legacy
        controls until the cinematic greeting is explicitly accepted. */}
    <div className={greetingAccepted?styles.sessionScroll:styles.sessionScrollAwaitingGreeting}
      data-coaching-session-scroll={greetingAccepted?'true':undefined}
      style={!greetingAccepted?{display:'none'}:undefined}
      inert={!greetingAccepted} aria-hidden={!greetingAccepted}>
    <section className={styles.sessionHero} aria-label={name} data-voice-phase={voiceState.phase}>
      <div className={styles.sessionPortrait} data-persona={personaId}
        data-coach-motion-video={['mira','max','sofia','alex','merlin','harry','genie'].includes(personaId)?'true':undefined}
        role="img" aria-label={name}>
        <MyCoachMotionMedia personaId={personaId} phase={motionPhase} context="session" scene={visualScene} reactionIntent={reactionIntent} />
      </div>
      <div className={styles.sessionHeroShade} aria-hidden="true"/>
      <button type="button" className={styles.heroViewToggle} data-coach-view-toggle
        aria-label={videoViewLabel} title={videoViewLabel} aria-pressed={viewExpanded}
        onClick={()=>{
          if(!viewExpanded)composerRef.current?.blur()
          setViewExpanded(value=>!value)
        }}>
        {viewExpanded?<Minimize2 size={21} aria-hidden="true"/>:<Maximize2 size={21} aria-hidden="true"/>}
      </button>
      <div className={styles.sessionHeroCopy}>
        <span className={styles.sessionHeroBadge}><Sparkles size={14} aria-hidden="true"/>{ui.mode}</span>
        <h1>{name}</h1><p>{localCoachText(persona?.role,lang)||t.coach}</p>
        <small>{localCoachText(persona?.approach,lang)||localCoachText(persona?.description,lang)}</small>
      </div>
      {coachStyle&&!showCaptions&&<span className={styles.coachStyleChip}
        data-coach-avatar-style={personaId}>{coachStyle}</span>}
      <div className={styles.sessionAvatar}>
        <CoachingAvatar locale={lang} avatarId={avatarVisuals[personaId]||'warm'} personaId={personaId} displayName={name}
          showPicker={false} size="large"
          phase={voiceState.phase==='speaking'?'speaking':paused?'paused':busy?'thinking':voiceState.phase} beat={voiceState.beat} scene={visualScene}/>
      </div>
      {((!introComplete&&['idle','loading'].includes(voiceState.phase))||voiceState.phase==='paused')&&
        <button type="button" className={styles.heroPlayControl}
          data-coach-hero-play aria-label={voiceState.phase==='paused'?({ru:'Продолжить разговор',en:'Continue conversation',es:'Continuar conversación'})[lang]:lang==='ru'?'Начать голосовую сессию':lang==='es'?'Iniciar sesión de voz':'Start coaching session'}
          title={voiceState.phase==='paused'?({ru:'Продолжить разговор',en:'Continue conversation',es:'Continuar conversación'})[lang]:lang==='ru'?'Начать сессию':lang==='es'?'Iniciar sesión':'Start session'}
          disabled={voiceState.phase==='loading'||busy||paused||replaying||(selectedGeminiEngine&&!geminiEngineReady)}
          onClick={startSessionFromPortrait}>
          {voiceState.phase==='loading'?<LoaderCircle size={40} aria-hidden="true"/>:
            <Play size={42} fill="currentColor" aria-hidden="true"/>}
        </button>}
      {showCaptions&&<div className={styles.heroSubtitle} aria-hidden="true">
        <span className={styles.promptWave}><i/><i/><i/><i/><i/></span>
        <p>{latestCoachText.length>160?latestCoachText.slice(0,157).trimEnd()+'…':latestCoachText}</p>
      </div>}
    </section>
    </div>
    <section className={`${styles.voiceWorkspace} ${callStyles.workspace}`} aria-label={ui.voice}>
      {sessionClockStarted&&sessionTimebox.offerWrapUp&&turns.length>0&&
        <div className={styles.sessionTimeboxNotice} role="status" data-coach-timebox-phase={sessionTimebox.phase}>
          <span>{sessionTimebox.targetReached?
            ({ru:'20 минут — можно подвести итог или продолжить.',en:'20 minutes — you can close gently or continue.',es:'20 minutos: puedes cerrar con calma o continuar.'}[lang]):
            ({ru:'Приближаемся к завершению мини-сессии.',en:'Approaching the close of our short session.',es:'Nos acercamos al cierre de la sesión breve.'}[lang])}</span>
          <button type="button" onClick={()=>{
            setDraft(previous=>previous.trim()?previous:({
              ru:'Давайте подведём итог: что я прояснил, что осталось открытым и какой шаг я сам готов выбрать?',
              en:'Can we reflect on what became clearer, what remains open, and any next step I might choose?',
              es:'¿Podemos resumir lo que aclaré, lo que queda abierto y qué paso quiero elegir yo?'
            }[lang]))
            toggleComposer()
          }}>{({ru:'Подвести итог',en:'Reflect & close',es:'Resumir y cerrar'}[lang])}</button>
        </div>}
      <div className={`${styles.voiceControls} ${callStyles.dock}`} data-coach-inline-voice data-coach-call-dock>
        <div className={`${styles.voiceCenter} ${callStyles.center}`} data-voice-active={voiceState.phase!=='idle'?'true':undefined}>
          {privateTextOnly?<span data-coach-private-text-resume>{({ru:'Текст',en:'Text',es:'Texto'})[lang]}</span>:liveVoiceSelected?<MyCoachGeminiLive ref={speechRef} outputMuted={outputMuted}
            locale={conversationLang} personaId={personaId} settings={settings}
            courseSessionId={selectedCourseId}
            methodSession={methodSession} prepareMethodSession={ensureCoachMethodSession}
            voiceName={selectedGeminiVoice} elapsedSeconds={activeSessionSeconds}
            openingPrior={openingPrior} allowOpeningPrior={Boolean(openingPrior)&&openingProgress.checkmarks.invitation}
            enabled={liveVoiceReady} canStart={!courseGateRequired&&!busy&&!paused&&!coachProfileOpen&&!replaying&&liveVoiceReady}
            liveContextAccess={liveContextAccess} contextRevision={contextRevision}
            localRecoveryTurns={turns}
            onUnconfirmedInput={text=>setDraft(previous=>previous.trim()?previous:text)}
            onSessionStart={()=>{setGeminiLiveConsent(true);setSessionClockStarted(true);setIntroComplete(true)}}
            onVoiceStateChange={handleVoiceStateChange}
            onMicLevel={level=>{
              reactionActivity.observe(level)
              const wave=micWaveRef.current
              if(!wave)return
              const rms=Math.min(1,Math.max(0,Number(level)||0))
              // Display-only gain: do not modify STT/VAD or reaction activity.
              wave.style.setProperty('--coach-mic-level',String(Math.min(1,rms*3)))
              wave.dataset.voiceDetected=rms>0.025?'true':'false'
            }}
            onInputInterim={setSpeechPreview}
            onInputFinal={text=>{
              const captured=appendLiveTranscript('user',text)
              // Current client corrections/topic changes outrank all old memory.
              if(['correction','topic_shift'].includes(
                understandCoachingTurn({locale:conversationLang,message:text}).act)){
                setContextTopic('')
                setContextAssessments(false)
                setContextPaused(true)
              }
              if(captured&&courseGateOpeningAfter(turnsRef.current,conversationLang)){
                const guard={locale:conversationLang,message:text,turns:turnsRef.current.filter(row=>row.role==='user')}
                if(coachingBrainSafety(guard)||coachingBrainBoundary(guard))return false
                const handoff={role:'assistant',content:courseGateHandoffText(conversationLang),mode:'offline',locale:conversationLang}
                if(!coachProtocolCanAppend(turnsRef.current,[handoff]))return false
                const next=[...turnsRef.current,handoff];turnsRef.current=next;setTurns(next);queuePrivateDraft(next)
                setStreamingPreview('');return true // transport stops before accepting this model response
              }
              return false
            }}
            onOutputInterim={setStreamingPreview}
            onOutputFinal={(text,details)=>appendLiveTranscript('assistant',text,{interrupted:details?.interrupted===true})}
            onInterrupted={()=>{setStreamingPreview('');setPlaybackNotice('')}}
            onDirectorProgress={setLiveDirectorProgress}
            onNotice={setPlaybackNotice}
          />:<MyCoachSpeechLoop ref={speechRef} outputMuted={outputMuted} locale={conversationLang} speechLocale={speechLocale} initialDraft={draft}
            introduction={introduction} onSessionStart={()=>setCloudAgreed(true)}
            cloudAvailable={chosenCloudAvailable} cloudAgreed={chosenCloudAgreed}
            cloudProvider={chosenCloudProvider} voiceName={selectedGeminiVoice}
            personaId={personaId} voicePace={settings?.pace} basicMode={coachEngine.startsWith('groq_')} enabled={true}
            canStart={!courseGateRequired&&!busy&&!paused&&!replaying&&(!selectedGeminiEngine||geminiEngineReady)&&(geminiVoiceTier==='existing'||geminiVoiceReady)} onTurn={(text,spoken)=>sendMessage(text,{voiceTurn:true,utteranceLocale:spoken?.locale,onApprovedPhrase:spoken?.onApprovedPhrase})}
            onCancelTurn={cancelPendingCoachTurn} onCoachInterrupted={markCoachSpeechInterrupted} onVoiceStateChange={handleVoiceStateChange}
            onMicLevel={level=>{
              reactionActivity.observe(level)
              const wave=micWaveRef.current
              if(!wave)return
              const rms=Math.min(1,Math.max(0,Number(level)||0))
              // Display-only gain: do not modify STT/VAD or reaction activity.
              wave.style.setProperty('--coach-mic-level',String(Math.min(1,rms*3)))
              wave.dataset.voiceDetected=rms>0.025?'true':'false'
            }}
            onTranscript={setSpeechPreview} onDraft={text=>{setDraft(text);setError('')}}/>}
        </div>
        <div className={`${styles.microphoneWave} ${callStyles.wave}`} ref={micWaveRef} data-coach-live-wave
          data-mic-phase={voiceState.phase}
          aria-label={{ru:'Индикатор громкости микрофона',en:'Live microphone volume',es:'Volumen del micrófono'}[lang]}
          role="img">
          {['left','right'].map(side=><span key={side} className={`${styles.waveBars} ${callStyles.bars}`} data-coach-wave-side={side} aria-hidden="true">
            {microphoneWaveGains.slice(side==='left'?0:12,side==='left'?13:25).map((gain,index)=><i key={index}
              style={{'--wave-gain':String(gain)}}/>)}
          </span>)}
        </div>
        <button type="button" className={`${styles.keyboardControl} ${callStyles.video}`} data-coach-dock-video
          onClick={()=>{composerRef.current?.blur();setViewExpanded(value=>!value)}} aria-label={videoViewLabel} title={videoViewLabel} aria-pressed={viewExpanded}>
          <Video size={22} aria-hidden="true"/>
        </button>
        <button type="button" className={callStyles.speaker} data-coach-dock-speaker
          disabled={privateTextOnly||protocolOpen} aria-pressed={!outputMuted} aria-label={speakerLabel} title={speakerLabel}
          onClick={()=>setOutputMuted(value=>!value)}>
          {outputMuted?<VolumeX size={24} aria-hidden="true"/>:<Volume2 size={24} aria-hidden="true"/>}
        </button>
        <button type="button" className={`${styles.endControl} ${callStyles.hangup}`} onClick={endWithProtocol} aria-label={hangupLabel} title={hangupLabel} disabled={protocolOpen} data-coach-finish-with-protocol>
          <PhoneOff size={24} aria-hidden="true"/><span>{hangupLabel}</span>
        </button>
      </div>

      <p className={styles.voicePlayNotice} data-coach-voice-consent-one-play>{freshPrivateProfile?({ru:'Приватная текстовая сессия. Ответы не передаются внешнему ИИ. После знакомства выберите исследование профиля.',en:'Private text session. Answers are not sent to an external AI. Choose personal profile during the introduction.',es:'Sesión privada de texto. Las respuestas no se envían a una IA externa. Elige el perfil personal durante la introducción.'})[lang]:restoredDraft?({ru:'Восстановлен приватный черновик. Продолжайте текстом без передачи истории внешнему ИИ; неясные сведения уточняются.',en:'Private draft restored. Continue in text without sharing history with an external AI; clarify uncertain details.',es:'Borrador privado restaurado. Continúa en texto sin compartir el historial con IA externa.'})[lang]:liveVoiceSelected?({
        ru:'Play отправляет голос и текст Google Gemini Free (возможно обучение моделей). Говорите в любой момент, чтобы перебить коуча.',
        en:'Play sends voice and transcripts to Google Gemini Free (may train models). Speak anytime to interrupt the coach.',
        es:'Play envía voz y texto a Google Gemini Free (puede entrenar modelos). Habla cuando quieras para interrumpir.',
      })[lang]:({
        en:'Play starts voice. On iPhone, short answers may be transcribed by Groq Whisper (no Holistic House audio storage). No extra step.',
        ru:'Play запускает голос. На iPhone короткие ответы могут расшифровываться через Groq Whisper без хранения аудио на Holistic House.',
        es:'Play activa la voz. En iPhone, Groq Whisper puede transcribir respuestas breves; Holistic House no almacena el audio.',
      })[lang]}{!privateTextOnly&&!liveVoiceSelected&&lockedSessionVoice&&' '+({ru:'Для сохранения тембра при Play озвучка ответов передаётся Gemini Free (данные могут использоваться для улучшения моделей). При недоступности выбранного голоса ответы остаются текстом.',en:'To preserve the coach voice, Play sends coach replies to Gemini Free TTS (data may improve models). If the approved voice is unavailable, replies stay in text.',es:'Para conservar la voz, Play envía las respuestas a Gemini Free (los datos pueden mejorar modelos). Si la voz aprobada no está disponible, las respuestas quedan en texto.'})[lang]}</p>
      {(autoSaveEnabled||autoSaveStatus==='discard_error')&&<p className={styles.voicePlayNotice} role="status" data-coach-autosave-status={autoSaveStatus}>
        {({ru:{idle:'Автосохранение включено',pending:'Сохраняем черновик…',saved:'Черновик сохранён в профиле',error:'Не всё синхронизировано. Оставьте страницу открытой для повтора.',discard_error:'Не удалось удалить черновик.'},
          en:{idle:'Private autosave enabled',pending:'Saving draft…',saved:'Draft saved in your profile',error:'Not fully synced. Keep this page open to retry.',discard_error:'Could not discard the draft.'},
          es:{idle:'Guardado privado activo',pending:'Guardando borrador…',saved:'Borrador guardado en tu perfil',error:'Sincronización incompleta. Mantén la página abierta.',discard_error:'No se pudo eliminar el borrador.'}})[lang][autoSaveStatus]}
        {' '}<button type="button" onClick={discardPrivateDraft}>{({ru:'Отключить и удалить',en:'Stop and discard',es:'Detener y eliminar'})[lang]}</button>
      </p>}
      {!sessionHasStarted&&!freshPrivateProfile&&<MyCoachCourseJourney locale={conversationLang}
        value={selectedCourseId} onSelect={id=>{
          setSelectedCourseId(id)
          setSelectedGoal(coachCourseFocusLabel(id,conversationLang))
        }}/>}
      {!sessionHasStarted&&<MyCoachInlineProfile personaId={personaId}
        locale={conversationLang} methodId={visibleMethodId}/>}
      {sessionHasStarted&&<details className={styles.sessionProgress} data-coach-progress-accordion
        aria-label={ui.stageQuestion}
        data-coach-stage-index={visibleProgressStep}
        data-coach-stage-source={progressMode==='opening'?'client-evidence-opening':progressMode==='profile'?'client-evidence-profile':progressMode==='profile-v3'?'saved-profile':progressMode==='course'?(courseGate?'saved-course-gate':'course-review-provisional'):progressValid?'director-client-evidence':'local-provisional'}
        title={stageProgressHelp[lang]}>
        <summary className={styles.sessionProgressSummary}>
          <div className={styles.sessionProgressText} aria-live="polite">
            <strong>{visibleProgressStep>0?ui.step+' '+visibleProgressStep+' '+ui.of+' '+visibleProgressTotal+' · ':''}{visibleProgressName}</strong>
            <span>{visibleProgressDescription}</span>
          </div>
          <div className={styles.sessionProgressRuler} data-coach-progress-ruler>
          <div className={styles.sessionProgressSegments} role="progressbar" aria-label={ui.stageQuestion}
            aria-valuemin={0} aria-valuemax={Math.max(1,visibleProgressTotal)} aria-valuenow={visibleProgressStep}
            aria-valuetext={visibleProgressDescription}>
            {stagePosition.rows.map(row=><span key={row.id} data-stage-id={row.id} data-group-progress
              data-stage-status={row.active?'current':row.status} data-stage-resolution={row.status}
              title={row.label+' · '+row.recorded+'/'+row.total+' · '+row.confirmed+'/'+row.total}
              style={{'--recorded':(row.recordedFraction*100)+'%','--verified':(row.verifiedFraction*100)+'%','--skipped':(row.skippedFraction*100)+'%'}}
              data-complete={row.status==='done'?'true':undefined}
              data-current={row.active?'true':undefined}/>)}

          </div>
          <div className={styles.sessionMinuteDots} data-coach-minute-ruler role="progressbar"
            aria-label={({ru:'Активные минуты сессии',en:'Active session minutes',es:'Minutos activos de la sesión'})[lang]}
            aria-valuemin={0} aria-valuemax={minuteRuler.total} aria-valuenow={minuteRuler.completed}>
            {Array.from({length:minuteRuler.total},(_,index)=><i key={index} aria-hidden="true"
              data-coach-minute={index+1} data-elapsed={index<minuteRuler.completed?'true':'false'}/>)}
          </div>
          </div>
          <ChevronDown className={styles.sessionProgressChevron} size={20} aria-hidden="true"/>
        </summary>
        <MyCoachSessionStateCard locale={lang} turns={protocolDisplayTurns}
          progress={progressValid?lastRecordedProgress:null} stageLabel={stageDescription}
          opening={openingProgress} profile={profileProgress} openingPosition={openingPosition}
          profilePosition={profilePosition} stagePosition={detailPosition} progressMode={progressMode} stageGroups={stagePosition.rows}/>
        {coreMode==='course'&&<MyCoachCourseProgress courseSessionId={selectedCourseId} turns={turns} review={courseFieldReview} locale={lang} position={detailPosition} groups={stagePosition.rows.filter(row=>row.kind==='core')} provisional={plannedCourse}/>} 
        {profileV3&&<p data-coach-profile-v3-progress style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere'}}>{coachSavedProfileV3Text(profileV3.protocol,lang)}</p>}
      </details>}
      <MyCoachStagedMemoryControls key={memoryProvider} locale={conversationLang} provider={memoryProvider}
        invitationAccepted={openingProgress.checkmarks.invitation&&!openingProgress.declined}
        identityConfirmed={openingProgress.checkmarks.name&&openingProgress.checkmarks.continuity}
        focusConfirmed={openingProgress.checkmarks.focus}
        priorAllowed={allowOpeningPrior} onPriorAllowed={value=>{
          setAllowOpeningPrior(value)
          if(!value)cancelPendingCoachTurn()
        }}
        topicKey={contextTopic} onTopicKey={value=>{
          setContextTopic(value);setContextAssessments(false)
        }}
        assessmentsAllowed={contextAssessments} onAssessmentsAllowed={setContextAssessments}
        contextSessionToken={contextSession?.token} contextRevision={contextRevision}
        onMemoryChange={setStagedMemory}>
          <button type="button" disabled={contextSessionLoading||busy||Boolean(contextSession&&contextSession.expiresAt>Date.now())} onClick={async()=>{
            setContextSessionLoading(true)
            setContextSessionError(false)
            try{
              const {account:{id:accountId}}=await getCabinetBootstrap('portrait')
              const [session,plan]=await Promise.all([
                appFetch('coaching-context/session',{},'POST',{accountId}),
                appFetch('coaching-life-plan?locale='+lang,undefined,'GET',{accountId}),
              ])
              setContextSession({...session,accountId,domains:plan.domains})
            }catch{setContextSessionError(true)}
            finally{setContextSessionLoading(false)}
          }}>
            {({en:'Review context for this conversation',ru:'Проверить контекст для этой беседы',
              es:'Revisar el contexto de esta conversación'})[lang]}
          </button>
          {contextSessionError&&<p role="status">
            {({en:'Session context is unavailable.',ru:'Контекст беседы недоступен.',
              es:'El contexto de la conversación no está disponible.'})[lang]}
          </p>}
          {contextSession?.expired&&<p role="status">
            {({en:'Session permission expired. Review again to share saved context.',ru:'Разрешение для беседы истекло. Повторите проверку, чтобы поделиться контекстом.',
              es:'El permiso de esta conversación venció. Revisa el contexto antes de compartirlo de nuevo.'})[lang]}
          </p>}
          {contextSession&&!contextSession.expired&&<MyCoachContext key={contextSession.sessionId}
            accountId={contextSession.accountId} locale={lang} domains={contextSession.domains}
            contextSessionToken={contextSession.token} onGrantChange={()=>{cancelPendingCoachTurn();setStagedMemory(null);setContextRevision(value=>value+1)}}/>}
      </MyCoachStagedMemoryControls>
      <details className={styles.voicePrivacyDetails}>
        <summary>{lang==='ru'?'Приватность голоса':lang==='es'?'Privacidad de voz':'Voice privacy'}</summary>
        <p>{liveVoiceSelected?({
          ru:'Gemini Free Live передаёт живой микрофон и расшифровки Google; данные Free могут использоваться для улучшения моделей. Аудио не записывается на сайте.',
          en:'Gemini Free Live streams microphone audio and transcripts to Google; Free inputs may improve models. Holistic House does not record the audio.',
          es:'Gemini Free Live transmite el micrófono y transcripciones a Google. Los datos Free pueden mejorar modelos. No almacenamos audio.',
        })[lang]:geminiVoiceTier==='existing'&&!lockedSessionVoice?voiceProviderDetails[lang]:geminiVoicePrivacyDetails[lang]}</p>
      </details>
      {playbackNotice&&<p className={styles.playbackNotice} role="status">{playbackNotice}</p>}
      <div className={`${styles.conversationPanel} ${callStyles.conversation}`}>
      <section className={styles.liveTranscript} aria-label={captions.heading} data-coach-live-transcript>
        <div className={styles.transcriptHeading}><MessageCircle size={15} aria-hidden="true"/>
          <strong>{captions.heading}</strong>
          {voiceState.phase==='listening'&&<span role="status">{captions.listening}</span>}
        </div>
        <div className={`${styles.transcriptFeed} ${callStyles.feed}`} ref={transcriptRef} role="log" aria-live="polite" aria-relevant="additions">
          {!turns.length&&<div className={styles.transcriptCoach}><strong>{name}</strong><p>{introduction}</p></div>}
          {turns.map((turn,index)=><div key={index}
            className={turn.role==='user'?styles.transcriptUser:styles.transcriptCoach}>
            <strong>{turn.role==='user'?t.user:name}
              {turn.role==='assistant'&&turn.inference?.model&&
                <span className={styles.responseSource} data-coach-answer-source={turn.inference.provider}>
                  {' · '}{turn.inference.provider==='groq'?'Groq':turn.inference.provider?.startsWith('gemini_')?'Gemini':'OpenRouter'} · {turn.inference.model}
                  {turn.inference.reasoningEffort?' · '+turn.inference.reasoningEffort:''}
                </span>}
              {turn.role==='assistant'&&turn.mode==='offline'&&turn.stage!=='opening'&&
                <span className={styles.responseSource}> · {t.offline}</span>}
            </strong><p>{turn.content}</p>
          </div>)}
          {streamingPreview&&<div className={styles.transcriptCoach} data-coach-stream-preview aria-live="off">
            <strong>{name} · {{ru:'Черновик ответа',en:'Draft reply',es:'Borrador de respuesta'}[lang]}</strong>
            <p>{streamingPreview}</p>
          </div>}
          {speechPreview&&<div className={styles.transcriptInterim} aria-live="off">
            <strong>{t.user} · {captions.listening}</strong><p>{speechPreview}</p>
          </div>}
          
        </div>
      </section>
      <details ref={composerDetailsRef} className={styles.textComposer} open>
        <summary>{ui.type}</summary>
        {authRequired?<div className={styles.auth} role="status"><LockKeyhole size={20} aria-hidden="true"/>
          <span>{t.login}</span><Link href={'/'+lang+'/my-coach'} onClick={interceptSessionExit}>{t.loginLink}<ArrowRight size={16}/></Link></div>:null}
        {privateTextOnly&&(profileV3Active||profileV3Fault||freshProfileAwaiting||(profileV3Enabled&&structuredProfileCanStart&&profileSelected&&!profileProgress?.ratings?.length))&&
          <section className={styles.protocolReview} data-coach-private-profile-v3>
            <strong>{({ru:'Приватное исследование профиля',en:'Private profile check-in',es:'Revisión privada del perfil'})[lang]}</strong>
            {freshProfileAwaiting&&(!profileV3Enabled||!autoSaveEnabled)&&<p role="status">{({ru:'Приватное исследование сейчас недоступно. Можно сохранить или завершить текущий разговор.',en:'Private check-in is not available right now. You can save or finish the current conversation.',es:'La revisión privada no está disponible ahora. Puedes guardar o terminar la conversación.'})[lang]}</p>}
            <p>{({ru:'Ответы сохраняются в этой сессии и не отправляются внешнему ИИ. Можно пропустить вопрос или завершить исследование.',en:'Answers stay in this session and are not sent to an external AI. You can skip a question or finish.',es:'Las respuestas quedan en esta sesión y no se envían a una IA externa. Puedes omitir una pregunta o terminar.'})[lang]}</p>
            {profileV3Fault?<><p role="alert">{({ru:'Не удалось подтвердить ревизию. Откройте сохранённую сессию заново.',en:'The saved revision could not be confirmed. Reopen the saved session.',es:'No se pudo confirmar la revisión. Vuelve a abrir la sesión guardada.'})[lang]}</p>
              <button type="button" onClick={()=>window.location.reload()}>{({ru:'Открыть заново',en:'Reopen',es:'Volver a abrir'})[lang]}</button></>:
            profileV3Active?<div>
              {profileV3.step.pending?<form onSubmit={event=>{event.preventDefault();const q=profileV3Ref.current?.step.pending
                if(q&&profileV3Answer.trim())void runProfileV3('profile-answer',{questionId:q.id,questionTurnId:q.turnId,content:profileV3Answer.trim()})}}>
                <label><span>{profileV3.step.pending.text}</span><textarea rows={2} maxLength={1200} value={profileV3Answer} disabled={profileV3Busy||!profileV3Enabled||paused}
                  onChange={event=>setProfileV3Answer(event.target.value)}/></label>
                <button type="submit" disabled={!profileV3Answer.trim()||profileV3Busy||!profileV3Enabled||paused}>{t.send}</button>
                <button type="button" disabled={profileV3Busy||!profileV3Enabled||paused} onClick={()=>{const q=profileV3Ref.current?.step.pending
                  if(q)void runProfileV3('profile-answer',{questionId:q.id,questionTurnId:q.turnId,content:({ru:'пропустить',en:'skip',es:'omitir'})[lang]})}}>{({ru:'Пропустить',en:'Skip',es:'Omitir'})[lang]}</button>
              </form>:<p>{({ru:'Оценки собраны; можно завершить или уточнить.',en:'Ratings collected; finish or correct a rating.',es:'Valoraciones recogidas; termina o corrige una valoración.'})[lang]}</p>}
              {profileV3.step.canPrioritize&&<button type="button" disabled={profileV3Busy||!profileV3Enabled||paused} onClick={()=>void runProfileV3('profile-priority')}>{({ru:'Перейти к приоритетам',en:'Choose priorities',es:'Elegir prioridades'})[lang]}</button>}
              {coachSavedProfileV3Text(profileV3.protocol,lang)&&<p style={{whiteSpace:'pre-wrap'}}>{coachSavedProfileV3Text(profileV3.protocol,lang)}</p>}
              {coachSavedProfileV3(profileV3.protocol,lang)&&<label>{({ru:'Уточнить оценку',en:'Correct a rating',es:'Corregir valoración'})[lang]}
                <select value={profileV3Correction} onChange={event=>setProfileV3Correction(event.target.value)} disabled={profileV3Busy||!profileV3Enabled||paused}>
                  <option value="">—</option>
                  {coachSavedProfileV3(profileV3.protocol,lang).rows.flatMap(row=>['current','desired'].filter(slot=>row[slot].status==='confirmed').map(slot=><option key={row.id+':'+slot} value={row.id+':'+slot}>{row.label} · {slot==='current'?({ru:'Сейчас',en:'Now',es:'Ahora'})[lang]:({ru:'Желаемое',en:'Desired',es:'Deseado'})[lang]}</option>))}
                </select>
                <button type="button" disabled={!profileV3Correction||profileV3Busy||!profileV3Enabled||paused} onClick={()=>{const [axis,slot]=profileV3Correction.split(':');void runProfileV3('profile-correct',{axis,slot})}}>{({ru:'Уточнить',en:'Correct',es:'Corregir'})[lang]}</button>
              </label>}
              <button type="button" disabled={profileV3Busy||!profileV3Enabled||paused} onClick={()=>void runProfileV3('profile-close')}>{({ru:'Завершить исследование',en:'Finish check-in',es:'Terminar revisión'})[lang]}</button>
            </div>:<button type="button" disabled={!structuredProfileCanStart||profileV3Busy||busy||paused||Boolean(draft.trim())} onClick={()=>void runProfileV3('profile-start')}>{({ru:'Начать приватное исследование',en:'Start private check-in',es:'Iniciar revisión privada'})[lang]}</button>}
            {profileV3Error&&!profileV3Fault&&<p role="alert">{({ru:'Не удалось подтвердить сохранение. Повторите попытку.',en:'Saving could not be confirmed. Please retry.',es:'No se pudo confirmar el guardado. Inténtalo de nuevo.'})[lang]}</p>}
          </section>}
        {(courseGateRequired||courseGateCanStart||courseGate||courseGateBusy||courseGateError)&&!protocolOpen&&<section className={styles.protocolReview} data-coach-course-gate>
          <strong>{({ru:'Проверка ответов протокола',en:'Verify session answers',es:'Verificar respuestas de la sesión'})[lang]}</strong>
          <p>{({ru:'Ответ будет принят только после проверки и записи. Можно включить непрерывный голосовой режим устройства или отвечать текстом. Это не Gemini Live.',en:'Answers advance only after validation and saving. Use continuous device voice or text. This is not Gemini Live.',es:'Las respuestas avanzan solo tras verificarse y guardarse. Usa voz continua del dispositivo o texto. No es Gemini Live.'})[lang]}</p>
          {courseGateError&&<p role="alert">{({ru:'Запись не подтверждена. Следующий вопрос заблокирован. Повторите тот же запрос или откройте сохранённую сессию заново.',en:'Save not acknowledged. The next question is blocked. Retry the same request or reopen the saved session.',es:'Guardado sin confirmar. La siguiente pregunta está bloqueada. Reintenta la misma solicitud o reabre la sesión guardada.'})[lang]}</p>}
          {courseGateError&&courseGateAttemptRef.current?<><button type="button" disabled={courseGateBusy||!courseGateEnabled||paused} onClick={()=>void runCourseGate('retry')}>{({ru:'Повторить',en:'Retry',es:'Reintentar'})[lang]}</button>
            <button type="button" onClick={()=>window.location.reload()}>{({ru:'Открыть сохранённую сессию',en:'Reopen saved session',es:'Reabrir sesión guardada'})[lang]}</button></>:
          courseGate?<div>
            <p role="status">{courseGate.step.acceptedCount}/{courseGate.step.total} {({ru:'пунктов обработано',en:'checkpoints reviewed',es:'puntos revisados'})[lang]}</p>
            {courseGate.step.prompt&&!courseGate.step.paused?<form onSubmit={event=>{event.preventDefault();const q=courseGateRef.current?.step.prompt
              if(q&&courseGateAnswer.trim())void runCourseGate('course-gate-answer',{promptId:q.id,content:courseGateAnswer.trim()})}}>
              <label><span>{courseGate.step.prompt.text}</span><textarea rows={2} maxLength={900} value={courseGateAnswer} disabled={courseGateBusy||!courseGateEnabled||paused} onChange={event=>setCourseGateAnswer(event.target.value)}/></label>
              <button type="submit" disabled={!courseGateAnswer.trim()||courseGateBusy||!courseGateEnabled||paused}>{t.send}</button>
              <MyCoachCourseGateVoice prompt={courseGate.step.prompt} locale={conversationLang}
                waiting={courseGateBusy}
                disabled={!courseGateEnabled||paused||courseGateError||Boolean(courseGateAnswer.trim())}
                onDraft={setCourseGateAnswer}
                onSubmit={(promptId,content)=>{if(courseGateRef.current?.step.prompt?.id===promptId&&!courseGateAttemptRef.current)
                  return runCourseGate('course-gate-answer',{promptId,content});return false}}/>
              <button type="button" disabled={courseGateBusy||!courseGateEnabled||paused} onClick={()=>{const q=courseGateRef.current?.step.prompt
                if(q)void runCourseGate('course-gate-answer',{promptId:q.id,content:({ru:'пропустить вопрос',en:'skip this question',es:'omitir la pregunta'})[lang]})}}>{({ru:'Пропустить',en:'Skip',es:'Omitir'})[lang]}</button>
              {courseGate.step.prompt.kind==='confirm'&&<button type="button" disabled={courseGateBusy||!courseGateEnabled||paused} onClick={()=>{const q=courseGateRef.current?.step.prompt
                if(q)void runCourseGate('course-gate-answer',{promptId:q.id,content:({ru:'да',en:'yes',es:'sí'})[lang]})}}>{({ru:'Подтверждаю',en:'Confirm',es:'Confirmar'})[lang]}</button>}
            </form>:<p>{courseGate.step.paused?({ru:'Проверка приостановлена. Можно завершить сессию.',en:'Review paused. You can finish the session.',es:'Revisión pausada. Puedes terminar la sesión.'})[lang]:({ru:'Проверка пунктов завершена. Можно уточнить ответ или завершить.',en:'Checkpoint review complete. Correct an answer or finish.',es:'Revisión completa. Corrige una respuesta o termina.'})[lang]}</p>}
            {!courseGate.step.paused&&coachCourseProtocolRows(selectedCourseId,turns,courseGate.step.review,conversationLang).filter(row=>['confirmed','skipped_by_client'].includes(row.status)).map(row=>
              <button key={row.id} type="button" disabled={courseGateBusy||!courseGateEnabled||paused} onClick={()=>void runCourseGate('course-gate-correct',{fieldId:row.id})}>{({ru:'Уточнить',en:'Correct',es:'Corregir'})[lang]}: {row.label}</button>)}
          </div>:<button type="button" disabled={!courseGateCanStart||courseGateBusy} onClick={()=>void runCourseGate('course-gate-start')}>{({ru:'Проверить ответы по протоколу',en:'Start verified checkpoints',es:'Iniciar puntos verificados'})[lang]}</button>}
        </section>}
        {!courseGateRequired&&!courseGate&&!courseGateBusy&&!courseGateAttemptRef.current&&!paused&&!freshProfileAwaiting&&!profileV3Active&&!profileV3Busy&&!profileV3Fault&&<form className={`${styles.composer} ${callStyles.composer}`} onSubmit={send}>
          <label htmlFor="hh-my-coach-live-input">{t.field}</label>
          <button type="button" className={callStyles.moreButton} aria-controls="hh-coach-more-options" aria-expanded={moreOptionsOpen} aria-label={({ru:'Дополнительные настройки',en:'More options',es:'Más opciones'})[lang]} onClick={()=>setMoreOptionsOpen(value=>!value)}><Plus size={23} aria-hidden="true"/></button>
          <textarea ref={composerRef} id="hh-my-coach-live-input" data-coach-composer-field value={draft} maxLength={1200} rows={2}
            placeholder={t.placeholder} disabled={busy||authRequired}
            onChange={event=>{setDraft(event.target.value);setError('')}}/>
          <button className={styles.send} type="submit"
            disabled={busy||!draft.trim()||authRequired||(selectedGeminiEngine&&!geminiEngineReady&&!liveVoiceSelected)}>
            <span>{busy?t.sending:t.send}</span><ArrowRight size={20} aria-hidden="true"/>
          </button>
        </form>}
        {error&&<p className={styles.error} role="alert">{error}</p>}
        <details className={styles.sessionMore} id="hh-coach-more-options" open={moreOptionsOpen} onToggle={event=>setMoreOptionsOpen(event.currentTarget.open)}><summary>{lang==='ru'?'Дополнительно':lang==='es'?'Más opciones':'More options'}</summary>
      {!privateTextOnly&&!selectedGeminiEngine&&!liveVoiceSelected&&
        <p className={styles.voicePlayNotice} data-coach-pro-same-tap-disclosure id="hh-coach-pro-disclosure">{({
          ru:'Нажатие Pro включает Gemini Free и голос. Текст диалога и озвучки передаётся Google и может использоваться для улучшения моделей. Возврат к Basic — одним нажатием.',
          en:'Tap Pro to enable Gemini Free text and speech. Dialogue and speech text go to Google, which may use Free data to improve models. Tap Basic to stop.',
          es:'Pulsa Pro para activar texto y voz de Gemini gratuito. Google puede usar el texto para mejorar modelos. Pulsa Basic para salir.',
        })[lang]}</p>}
          <div className={callStyles.providerRow}>
        {!privateTextOnly&&!paused&&!voicePaused&&voiceState.phase!=='idle'&&<button type="button"
          className={styles.keyboardControl} data-coach-pause-control onClick={()=>pauseVoiceConversation()}
          aria-label={({ru:'Поставить разговор на паузу',en:'Pause conversation',es:'Pausar conversación'})[lang]}>
          <Pause size={17} aria-hidden="true"/><span>{({ru:'Пауза',en:'Pause',es:'Pausa'})[lang]}</span>
        </button>}
        <button type="button" className={styles.experienceModeControl} data-coach-basic-pro-toggle aria-describedby={!privateTextOnly&&!selectedGeminiEngine&&!liveVoiceSelected?'hh-coach-pro-disclosure':undefined}
          aria-label={(selectedGeminiEngine||liveVoiceSelected)?(
            {ru:'Вернуться к Basic · Groq',en:'Switch to Basic · Groq',es:'Cambiar a Basic · Groq'}[lang]):(
            {ru:'Перейти на Pro · Gemini',en:'Switch to Pro · Gemini',es:'Cambiar a Pro · Gemini'}[lang])}
          aria-pressed={selectedGeminiEngine||liveVoiceSelected}
          disabled={privateTextOnly||replaying||paused||voicePaused||protocolOpen}
          onClick={async ()=>{
            // Leaving Pro immediately cancels its in-flight model/audio, but
            // simply opening Pro must NEVER silence a healthy Basic microphone.
            if(selectedGeminiEngine){
              engineManuallySelectedRef.current=true
              if(voiceState.phase==='speaking'&&latestCoachText)
                markCoachSpeechInterrupted(latestCoachText)
              speechRef.current?.stop?.()
              cancelPendingCoachTurn()
              setGeminiLiveConsent(false)
              setLiveDirectorProgress(null)
              setCoachEngine('groq_stream')
              setGeminiConsent(false)
              setGeminiVoiceTier('existing')
              setGeminiVoiceConsent(false)
              
              setPlaybackNotice('')
              return
            }
            if(liveVoiceSelected){
              engineManuallySelectedRef.current=true
              speechRef.current?.stop?.()
              cancelPendingCoachTurn()
              setGeminiLiveConsent(false)
              setLiveDirectorProgress(null)
              setCoachEngine('groq_stream')
              setGeminiConsent(false)
              setGeminiVoiceTier('existing')
              setGeminiVoiceConsent(false)
              
              setPlaybackNotice('')
              return
            }
            if(geminiAvailabilityInFlightRef.current)return
            geminiAvailabilityInFlightRef.current=true
            setPlaybackNotice(({ru:'Проверяю Gemini Free…',en:'Checking Gemini Free…',es:'Verificando Gemini gratuito…'})[lang])
            const checkController=new AbortController()
            const deadline=setTimeout(()=>checkController.abort(),8000)
            let status
            try{status=await readGeminiEngineStatus(checkController.signal)}
            catch{status={kind:'unavailable'}}
            finally{
              clearTimeout(deadline)
              geminiAvailabilityInFlightRef.current=false
            }
            if(status.kind==='login'){
              setAuthRequired(true)
              setPlaybackNotice(({ru:'Для Gemini Free сначала войдите в Holistic House.',en:'Sign in to Holistic House to use Gemini Free.',es:'Inicia sesión para usar Gemini gratuito.'})[lang])
              return
            }
            if(status.kind!=='ok'){
              setPlaybackNotice(({ru:'Не удалось проверить Gemini Free. Нажмите Pro ещё раз — Basic работает.',en:'Could not check Gemini Free. Tap Pro to retry; Basic still works.',es:'No se pudo verificar Gemini. Reintenta Pro; Basic sigue activo.'})[lang])
              return
            }
            setGeminiCapabilities(status.capabilities)
            if(!status.capabilities.gemini_live_free&&!status.capabilities.gemini_free){
              setPlaybackNotice(({ru:'Gemini Free не готов на сервере. Basic продолжает работать.',en:'Gemini Free is not ready on the server. Basic still works.',es:'Gemini gratuito no está listo en el servidor. Basic sigue activo.'})[lang])
              return
            }
            // Prefer true duplex audio over separate text/TTS when Pro is tapped.
            engineManuallySelectedRef.current=true
            const chooseLive=status.capabilities.gemini_live_free===true
            if(voiceState.phase==='speaking'&&latestCoachText)
              markCoachSpeechInterrupted(latestCoachText)
            const continued=!chooseLive&&speechRef.current?.pauseForTypedTurn?.()===true
            if(!continued)speechRef.current?.stop?.()
            cancelPendingCoachTurn()
            const freeTtsReady=!chooseLive&&status.capabilities.gemini_tts_free===true
            setCoachEngine(chooseLive?'gemini_live_free':'gemini_free')
            setGeminiConsent(!chooseLive)
            setGeminiVoiceTier(freeTtsReady?'gemini_tts_free':'existing')
            setGeminiVoiceConsent(freeTtsReady)
            setGeminiLiveConsent(false)
            if(continued)speechRef.current?.resumeAfterTypedFailure?.()
            setPlaybackNotice(chooseLive?({
              ru:'Gemini Live выбран. Нажмите Play, чтобы начать двусторонний разговор.',
              en:'Gemini Live selected. Tap Play to begin the two-way conversation.',
              es:'Gemini Live elegido. Pulsa Play para iniciar la conversación en vivo.',
            })[lang]:freeTtsReady?'':({
              ru:'Gemini Free включён; голос Gemini недоступен. Можно выбрать текущий голос.',
              en:'Gemini Free is on; Gemini voice is unavailable. You can choose the existing voice.',
              es:'Gemini gratuito activado; su voz no está disponible. Puedes usar la voz anterior.',
            })[lang])
          }}>
          <Zap size={17} aria-hidden="true"/>
          <span>{privateTextOnly?'Private':selectedGeminiEngine||liveVoiceSelected?'Pro':'Basic'}</span>
          <small>{privateTextOnly?'Text':selectedGeminiEngine||liveVoiceSelected?'Gemini':'Groq'}</small>
        </button>
          </div>
          <label className={styles.contextTopic}>
            {lang==='ru'?'Сохранённый контекст для беседы':lang==='es'?'Contexto guardado para esta conversación':'Saved context for this conversation'}
            <select value={contextTopic} onChange={event=>{
              setContextTopic(event.target.value);setContextAssessments(false)
            }}>
              <option value="">{lang==='ru'?'Выключен':lang==='es'?'Desactivado':'Off'}</option>
              {[
                ['body_health','Body & Health','Тело и здоровье','Cuerpo y salud'],
                ['emotional_wellbeing','Emotional wellbeing','Эмоциональное благополучие','Bienestar emocional'],
                ['relationships','Relationships','Отношения','Relaciones'],
                ['career_business','Career & business','Карьера и бизнес','Carrera y negocio'],
                ['finance','Finances','Финансы','Finanzas'],
                ['personal_growth','Personal growth','Личностный рост','Crecimiento personal'],
                ['lifestyle','Lifestyle','Образ жизни','Estilo de vida'],
                ['meaning_purpose','Meaning & purpose','Смысл и предназначение','Sentido y propósito'],
              ].map(([key,en,ru,es])=><option key={key} value={key}>{lang==='ru'?ru:lang==='es'?es:en}</option>)}
            </select>
          </label>
          {contextTopic==='personal_growth'&&<label>
            <input type="checkbox" checked={contextAssessments} onChange={event=>setContextAssessments(event.target.checked)}/>
            {lang==='ru'?'Использовать одобренные результаты тестов':lang==='es'?'Usar resultados de pruebas autorizados':'Use approved assessment scores'}
          </label>}
          {contextTopic&&<label>
            <input type="checkbox" checked={contextPaused} onChange={event=>setContextPaused(event.target.checked)}/>
            {lang==='ru'?'Приостановить использование контекста в этой беседе':lang==='es'?'Pausar el uso del contexto en esta conversación':'Pause saved context for this conversation'}
          </label>}

        <label className={styles.coachEnginePicker} data-coach-engine-choice>
          <span>{({ru:'Движок диалога',en:'Dialogue engine',es:'Motor de diálogo'})[lang]}</span>
          <select value={coachEngine} disabled={busy||privateTextOnly||courseGateRequired||voicePaused||paused} onChange={event=>{
            engineManuallySelectedRef.current=true
            speechRef.current?.stop?.()
            setCoachEngine(event.target.value)
            setGeminiConsent(event.target.value==='gemini_free')
            setGeminiLiveConsent(false)
            setLiveDirectorProgress(null)
            if(event.target.value==='gemini_free'){
              const tts=geminiCapabilities.gemini_tts_free===true
              setGeminiVoiceTier(tts?'gemini_tts_free':'existing')
              setGeminiVoiceConsent(tts)
            }else if(event.target.value==='gemini_live_free'||event.target.value.startsWith('groq_')){
              setGeminiVoiceTier('existing')
              setGeminiVoiceConsent(false)
            }
          }}>
            <option value="groq_stream">{({ru:'Groq · поток',en:'Groq · streaming',es:'Groq · flujo'})[lang]}</option>
            <option value="groq_strict">{({ru:'Groq · стабильный',en:'Groq · validated',es:'Groq · validado'})[lang]}</option>
            <option value="gemini_free" disabled={!geminiCapabilities.gemini_free}>Gemini · Free</option>
            <option value="gemini_paid" disabled={!geminiCapabilities.gemini_paid}>Gemini · Paid</option>
            <option value="gemini_live_free" disabled={!geminiCapabilities.gemini_live_free}>Gemini Live · Free · RU/EN</option>
            <option value="gemini" disabled>{({ru:'Gemini Live · после проверки',en:'Gemini Live · pending approval',es:'Gemini Live · pendiente'})[lang]}</option>
          </select>
        </label>
        {coachEngine==='gemini_paid'&&<label className={styles.coachEnginePicker} data-gemini-text-consent>
          <input type="checkbox" checked={geminiConsent} onChange={event=>setGeminiConsent(event.target.checked)}/>
          <span>{({
            ru:'Согласен(на) передавать текст Gemini Paid; Google не использует его для улучшения моделей.',
            en:'I agree to use Gemini Paid; Google does not use submitted text to improve models.',
            es:'Acepto Gemini Paid; Google no usa mis textos para mejorar modelos.',
          })[lang]}</span>
        </label>}
        {liveVoiceSelected&&<>
          <label className={styles.coachEnginePicker} data-gemini-live-free-voice>
            <span>{({ru:'Голос живого коуча',en:'Live coach voice',es:'Voz del coach en vivo'})[lang]}</span>
            <select value={selectedGeminiVoice} disabled={Boolean(lockedSessionVoice)||voiceState.phase!=='idle'}
              onChange={event=>{setGeminiVoiceByLocale(prev=>({...prev,
                [voiceSelectionKey]:event.target.value}));setGeminiLiveConsent(false)}}>
              {geminiVoices.map(v=><option value={v} key={v}>{v}</option>)}
            </select>
          </label>
          <p className={styles.voicePlayNotice} data-gemini-live-free-consent data-consent-on-play
            data-live-consented={geminiLiveConsent?'true':'false'}>
            {({
              ru:'Нажимая Play, вы разрешаете отправлять голос и расшифровки в Google Gemini Free; Google может использовать их для улучшения моделей. Микрофон отключается при завершении разговора.',
              en:'By pressing Play, you agree to stream voice and transcripts to Google Gemini Free; Google may use them to improve models. Ending the call stops the microphone.',
              es:'Al pulsar Play, aceptas enviar voz y transcripciones a Gemini Free; Google puede usarlas para mejorar modelos. Al terminar se apaga el micrófono.'
            })[lang]}
          </p>
        </>}
        {!liveVoiceSelected&&<label className={styles.coachEnginePicker} data-gemini-voice-provider>
          <span>{({ru:'Голос коуча',en:'Coach voice',es:'Voz del coach'})[lang]}</span>
          <select value={geminiVoiceTier} disabled={busy||replaying} onChange={event=>{
            setGeminiVoiceTier(event.target.value);setGeminiVoiceConsent(event.target.value==='gemini_tts_free')
          }}>
            <option value="existing">{lockedSessionVoice?({ru:'Утверждённый голос · Gemini Free',en:'Approved voice · Gemini Free',es:'Voz aprobada · Gemini Free'})[lang]:({ru:'Текущий голос',en:'Current voice',es:'Voz actual'})[lang]}</option>
            <option value="gemini_tts_free" disabled={!geminiCapabilities.gemini_tts_free}>Gemini TTS · Free</option>
            <option value="gemini_tts_paid" disabled={!geminiCapabilities.gemini_tts_paid}>Gemini TTS · Paid</option>
          </select>
        </label>}
        {!liveVoiceSelected&&geminiVoiceTier!=='existing'&&<>
          <label className={styles.coachEnginePicker} data-gemini-voice-name>
            <span>{conversationLang.toUpperCase()} · {({ru:'Выбор тембра',en:'Choose voice',es:'Elegir voz'})[lang]}</span>
            <select value={selectedGeminiVoice} disabled={Boolean(lockedSessionVoice)||busy||replaying} onChange={event=>
              setGeminiVoiceByLocale(prev=>({...prev,[voiceSelectionKey]:event.target.value}))}>
              {geminiVoices.map(name=><option value={name} key={name}>{name}</option>)}
            </select>
          </label>
          {geminiVoiceTier==='gemini_tts_paid'&&<label className={styles.coachEnginePicker} data-gemini-voice-consent>
            <input type="checkbox" checked={geminiVoiceConsent}
              onChange={event=>setGeminiVoiceConsent(event.target.checked)}/>
            <span>{({
              ru:'Согласен(на) на платную озвучку Gemini. Вызовы ограничены бюджетом.',
              en:'I agree to paid Gemini speech. Usage is rate-limited.',
              es:'Acepto la voz Gemini de pago. El uso tiene límites.',
            })[lang]}</span>
          </label>}
          <button type="button" className={styles.captionMore}
            disabled={!geminiVoiceReady||busy||replaying||voiceState.phase!=='idle'}
            onClick={previewGeminiCoachVoice}>{({
              ru:'▶ Прослушать пример',en:'▶ Preview this voice',es:'▶ Escuchar ejemplo'
            }[lang])}</button>
        </>}
        <button type="button" className={styles.captionMore} aria-pressed={showCaptions}
          onClick={()=>setShowCaptions(value=>!value)}>{ui.captions}</button>
        <details className={styles.consentDetails}><summary>{captions.details}</summary>
          <p>{liveVoiceSelected?({
          ru:'Режим прямого потокового аудио с микрофоном и перебиваниями через Gemini Free; Google может использовать переданные данные для улучшения моделей.',
          en:'Direct real-time microphone audio with interruptions via Gemini Free; Google may use submitted data to improve models.',
          es:'Audio directo del micrófono con interrupciones mediante Gemini Free; Google puede usar los datos para mejorar modelos.'
        })[lang]:selectedGeminiEngine?geminiTextPrivacyDetails[lang][coachEngine==='gemini_free'?'free':'paid']:t.consent}</p><p className={styles.privacy}><ShieldCheck size={16} aria-hidden="true"/>{t.privacy}</p>
        </details>
        {onGuided&&<button className={styles.guidedFallback} type="button" onClick={()=>{
          if(turnsRef.current.length>0&&!protocolSaved)endWithProtocol();else onGuided()
        }}>
          {ui.guided}<ArrowRight size={16} aria-hidden="true"/>
        </button>}
        </details>
      </details>
      </div>
    </section>
    <label className={styles.goalRow}><Target size={22} aria-hidden="true"/><span>{ui.goal}</span>
      <input aria-label={ui.goal} value={selectedGoal} maxLength={180} placeholder={ui.goalPlaceholder}
        onChange={event=>setSelectedGoal(event.target.value)}/><Pencil size={17} aria-hidden="true"/>
    </label>
    <small className={styles.goalPrivacy}>{ui.typedGoal}</small>
    {editablePlan&&<label className={styles.plan}>{t.plan}<textarea value={editablePlan} maxLength={300} rows={2}
      onChange={event=>setEditablePlan(event.target.value)}/></label>}
    <p className={styles.sessionDisclosure}>{ui.disclosure}</p>
    {process.env.NEXT_PUBLIC_HH_LEARNING_OBSERVATORY_ENABLED==='true'&&latestCoachTurn&&<div className={styles.hiLearningRating} role="group" aria-label={
      lang==='ru'?'Добровольная оценка вопроса коуча':lang==='es'?'Valoración voluntaria':'Voluntary coach reply rating'}>
      <span>{lang==='ru'?'Анонимная оценка · без текста':lang==='es'?'Valoración anónima · sin texto':'Anonymous rating · no text'}</span>
      {ratedCoachAnswer===latestCoachText?<small>{
        lang==='ru'?'Сохранено':lang==='es'?'Guardado':'Saved'
      }</small>:<>
        <button type="button" disabled={coachQualityPending} onClick={()=>void rateCoachAnswer('helpful')}>👍 {lang==='ru'?'Полезно':lang==='es'?'Útil':'Helpful'}</button>
        <button type="button" disabled={coachQualityPending} onClick={()=>void rateCoachAnswer('unhelpful')}>👎 {lang==='ru'?'Не помогло':lang==='es'?'No ayudó':'Not helpful'}</button>
      </>}
      {coachQualityError&&<small role="status">{
        lang==='ru'?'Не сохранено':lang==='es'?'No guardado':'Not saved'
      }</small>}
    </div>}
      {!turns.length&&<details className={styles.quickGoals}>
        <summary className={styles.quickGoalsHeading}><strong>{ui.topics}</strong><span>{ui.chooseTopic}</span></summary>
        <div className={styles.quickGoalGrid}>
          {quickTopics.map(({id,icon:Icon,art})=><button key={id} type="button"
            className={styles.quickGoalCard} data-art={art} aria-pressed={selectedGoal===goalLabels[id]}
            onClick={()=>chooseTopic(id)}>
            <span className={styles.quickGoalArt} aria-hidden="true"/>
            <span className={styles.quickGoalLabel}><Icon size={19} aria-hidden="true"/>{goalLabels[id]}</span>
          </button>)}
        </div>
      </details>}
    {protocolOpen&&<section className={styles.protocolOverlay} role="dialog" aria-modal="true" aria-label={keyInfoUi.finish} data-my-coach-protocol>
      <div className={styles.protocolCard}>
        <div className={styles.protocolHeading}><FileText size={22}/><div><h2>{({en:'Session Insight',ru:'Инсайт сессии',es:'Insight de sesión'})[lang]}</h2><p>{({en:'Session checkpoints and client statements',ru:'Контрольные точки и слова клиента',es:'Puntos de la sesión y palabras del cliente'})[lang]}</p></div></div>
        <p className={styles.protocolCount}>{protocolUi.turns}: {turns.length} · {Math.floor(activeSessionSeconds/60)} min</p>
        {insightResult&&<MyCoachResultPreview locale={lang} courseSessionId={insightResult.courseSessionId} title={coachCourseFocusLabel(selectedCourseId,lang)} rows={insightRows} profile={insightProfile} summary={insightResult.clientSummary} nextStep={insightResult.clientNextStep}/>}
        {insightOverview?<details><summary>{({en:'Session protocol',ru:'Протокол сессии',es:'Protocolo de sesión'})[lang]}</summary><section className={styles.protocolReview} data-coach-insight-overview>
          <p style={{whiteSpace:'pre-wrap',overflowWrap:'anywhere',margin:0}}>{insightOverview}</p>
        </section></details>:<p>{({en:'No structured checkpoints available yet.',ru:'Структурированные контрольные точки пока недоступны.',es:'Aún no hay puntos estructurados disponibles.'})[lang]}</p>}
        {protocolEditing&&!courseGate&&<MyCoachCourseFieldReview expanded courseSessionId={selectedCourseId} turns={turns} locale={lang} value={effectiveCourseReview} onChange={setCourseFieldReview} disabled={protocolSaved||protocolSaving||protocolSaveLocked}/>} 
        {turns.length===0?<p>{protocolUi.empty}</p>:
          <details data-coach-insight-transcript>
          <summary>{({en:'View conversation history',ru:'История разговора',es:'Ver historial de conversación'})[lang]}</summary>
          <div className={styles.protocolActions}><button type="button" disabled={protocolSaving} onClick={()=>exportProtocol(false,'transcript')}><Download size={16}/>{({en:'Download transcript PDF',ru:'Скачать стенограмму PDF',es:'Descargar transcripción PDF'})[lang]}</button></div>
          <div className={styles.protocolReview} aria-label={protocolUi.turns}>
            {turns.map((turn,index)=><article key={index} className={styles.protocolTurn}>
              <strong>{turn.role==='user'?({ru:'Вы',en:'You',es:'Tú'}[lang]):name}</strong>
              <p>{turn.content}</p>
              {turn.role==='user'&&turn.unanswered===true&&<small>{
                {ru:'Реплика без ответа ИИ',en:'Submitted, no AI reply',es:'Mensaje sin respuesta de IA'}[lang]
              }</small>}
              {turn.role==='assistant'&&turn.interrupted===true&&<small>{lang==='ru'?'Ответ коуча перебит':lang==='es'?'Respuesta interrumpida':'Coach reply interrupted'}</small>}
              {turn.role==='assistant'&&turn.suggestion&&<small>{({ru:'Предложение, не принятое автоматически',en:'Unconfirmed suggestion',es:'Sugerencia sin confirmar'}[lang])}: {turn.suggestion}</small>}
            </article>)}
          </div></details>}
        {protocolEditing&&<><label className={styles.protocolTextLabel}>{{ru:'Мой итог сессии (необязательно)',en:'My takeaway (optional)',es:'Mi conclusión (opcional)'}[lang]}
          <textarea rows={2} maxLength={1000} value={protocolSummary} disabled={protocolSaved||protocolSaving||protocolSaveLocked} onChange={e=>setProtocolSummary(e.target.value)} placeholder={{ru:'Что стало яснее?',en:'What is clearer now?',es:'¿Qué quedó más claro?'}[lang]}/>
        </label>
        <label className={styles.protocolTextLabel}>{{ru:'Мой следующий шаг (необязательно)',en:'My next step (optional)',es:'Mi siguiente paso (opcional)'}[lang]}
          <textarea rows={2} maxLength={500} value={protocolNextStep} disabled={protocolSaved||protocolSaving||protocolSaveLocked} onChange={e=>setProtocolNextStep(e.target.value)} placeholder={{ru:'Какой шаг я хочу сделать?',en:'What step would I choose?',es:'¿Qué paso elegiría?'}[lang]}/>
        </label></>}
        <small className={styles.protocolPrivacy}>{({en:'The protocol PDF contains checkpoints and client statements; the full transcript is a separate export. AI suggestions are not confirmed decisions. Audio is not stored.',ru:'PDF протокола содержит контрольные пункты и слова клиента; полная стенограмма скачивается отдельно. Предложения ИИ не являются подтверждёнными решениями. Аудио не хранится.',es:'El PDF contiene puntos de sesión y palabras del cliente; la transcripción completa se descarga por separado. Las sugerencias de IA no son decisiones confirmadas. No se guarda audio.'})[lang]}</small>
        <details><summary>{({en:'Export protocol',ru:'Экспорт протокола',es:'Exportar protocolo'})[lang]}</summary><div className={styles.protocolActions}>
          <button type="button" disabled={!turns.length||protocolSaving} onClick={()=>exportProtocol(false)}><Download size={16}/>{({en:'Download protocol PDF',ru:'Скачать протокол PDF',es:'Descargar protocolo PDF'})[lang]}</button>
          <button type="button" disabled={!turns.length||protocolSaving} onClick={()=>exportProtocol(true)}><Printer size={16}/>{protocolUi.print}</button>
        </div></details>
        <div className={styles.protocolActions} data-coach-result-actions style={{position:'sticky',bottom:0,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:6,padding:'8px 0',background:'inherit'}}>
          <button type="button" className={styles.protocolSave} disabled={!turns.length||!protocolOwnerReady||protocolSaved||protocolSaving} onClick={saveProtocol}>{protocolSaving?protocolUi.saving:protocolSaved?protocolUi.saved:protocolUi.save}</button>
          <button type="button" data-coach-edit-result disabled={protocolSaved||protocolSaving||protocolSaveLocked} onClick={()=>setProtocolEditing(value=>!value)}>{protocolEditing?({en:'Done',ru:'Готово',es:'Listo'})[lang]:({en:'Edit',ru:'Редактировать',es:'Editar'})[lang]}</button>
          <button type="button" data-coach-close-protocol disabled={protocolSaving||(protocolSaveLocked&&!protocolSaved)} onClick={closeProtocolToRating}>{protocolSaved?protocolUi.close:({en:'Cancel',ru:'Отменить',es:'Cancelar'})[lang]}</button>
        </div>
        {protocolSaved&&<p role="status" className={styles.protocolSaved}>{protocolUi.saved} · <Link href={'/'+(lang==='es'?'en':lang)+'/app/my-coaching-plan?tab=reports'}>{lang==='ru'?'Открыть архив':lang==='es'?'Abrir archivo':'Open archive'}</Link></p>}
        {!protocolOwnerReady&&<p role="status">{({ru:'Сохранение в аккаунт недоступно: аккаунт не подтверждён до начала беседы. PDF доступен.',en:'Account saving is unavailable because the account was not verified before the conversation. PDF is available.',es:'No se puede guardar en la cuenta porque no se verificó antes del diálogo. El PDF está disponible.'})[lang]}</p>}
        {protocolError&&<p role="alert" className={styles.protocolError}>{protocolError}</p>}

      </div>
    </section>}
    {ratingOpen&&<section className={styles.ratingOverlay} role="dialog" aria-modal="true"
      aria-label={ratingUi.title} data-my-coach-rating-modal>
      <div className={styles.ratingCard}>
        <div className={styles.ratingCoachHeader}>
          <img className={styles.ratingCoachPortrait}
            src={'/images/holistic-house/my-coach-motion/'+(personaId==='genie'?'genie-still.svg':personaId==='harry'?'harry-soft-still.webp':personaId==='caesar'?'caesar-emblem.svg':personaId+'-still.webp')}
            alt="" width={78} height={78}/>
          <div><h2>{ratingUi.title}</h2><strong>{name}</strong><p>{ratingUi.subtitle}</p></div>
        </div>
        <div className={styles.ratingStars} role="group" aria-label={ratingUi.stars}>
          {[1,2,3,4,5].map(value=><button key={value} type="button"
            aria-label={value+' / 5'} aria-pressed={rating.stars===value}
            data-rating-star={value} disabled={ratingSaving||ratingSaved}
            onClick={()=>setRating(v=>({...v,stars:value}))}>★</button>)}
        </div>
        {rating.stars>0&&<div className={styles.ratingExtra}>
          <label className={styles.ratingScale} data-rating-scale="character">
            <span>{ratingUi.character}<strong>{rating.character}/5</strong></span>
            <input type="range" min="1" max="5" step="1" value={rating.character}
              disabled={ratingSaving||ratingSaved}
              onChange={event=>setRating(v=>({...v,character:Number(event.target.value)}))}/>
          </label>
          <label className={styles.ratingScale} data-rating-scale="intelligence">
            <span>{ratingUi.intelligence}<strong>{rating.intelligence}/5</strong></span>
            <input type="range" min="1" max="5" step="1" value={rating.intelligence}
              disabled={ratingSaving||ratingSaved}
              onChange={event=>setRating(v=>({...v,intelligence:Number(event.target.value)}))}/>
          </label>
          <label className={styles.ratingScale} data-rating-scale="impression">
            <span>{ratingUi.impression}<strong>{rating.impression}/5</strong></span>
            <input type="range" min="1" max="5" step="1" value={rating.impression}
              disabled={ratingSaving||ratingSaved}
              onChange={event=>setRating(v=>({...v,impression:Number(event.target.value)}))}/>
          </label>
        </div>}
        <p className={styles.ratingPrivacy}>{ratingUi.privacy}</p>
        {ratingSaved&&<p role="status" className={styles.ratingSaved}>{ratingUi.saved}</p>}
        {ratingError&&<p role="alert" className={styles.ratingError}>{ratingUi.error}</p>}
        <div className={styles.ratingActions}>
          {!ratingSaved&&<button type="button" disabled={!rating.stars||ratingSaving}
            onClick={submitSessionRating}>{ratingSaving?ratingUi.sending:ratingUi.send}</button>}
          <Link data-coach-rating-skip href={'/'+lang+'/my-coach'}>
            {ratingSaved?ratingUi.done:ratingUi.skip}
          </Link>
        </div>
      </div>
    </section>}
    <nav className={styles.sessionBottomNav} aria-label={lang==='ru'?'Нижняя навигация':lang==='es'?'Navegación inferior':'Bottom navigation'}>
      <Link href={'/'+lang} {...browseProps}><Home size={21} aria-hidden="true"/><span>{ui.home}</span></Link>
      <Link href={'/'+lang+'/my-coach'} onClick={interceptSessionExit} aria-current="page"><MessageCircle size={21} aria-hidden="true"/><span>{ui.coaching}</span></Link>
      <Link href={'/'+lang+'/holistic-support/mobile'} {...browseProps}><Leaf size={21} aria-hidden="true"/><span>{ui.practice}</span></Link>
      <Link href={'/'+lang+'/holistic-support/mandala'} {...browseProps}><Video size={21} aria-hidden="true"/><span>{ui.video}</span></Link>
      <Link href={'/'+(lang==='es'?'en':lang)+'/app/portrait'} {...browseProps}><UserRound size={21} aria-hidden="true"/><span>{ui.profile}</span></Link>
    </nav>
    {coachProfileOpen&&<MyCoachCompactProfile personaId={personaId} locale={conversationLang}
      methodId={visibleMethodId}
      onBack={()=>{coachProfileOpenRef.current=false;setCoachProfileOpen(false)}}/>}
  </section>
}
