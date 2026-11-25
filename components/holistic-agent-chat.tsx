"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {Mic, Paperclip, Plus, Send, ImageIcon, X} from "lucide-react";
import {MessengerAiLanding} from "@/components/app/messenger-ai-landing";
import {MessengerVoiceNote} from "@/components/app/messenger-voice-note";
import {stopAliPersonaAudio} from "@/components/app/ali-persona-audio";
import {useAliPersona} from "@/components/app/use-ali-persona";
import {ALI_GEMINI_FREE_ENDPOINT,aliGeminiRequest,aliGeminiResult} from "@/lib/holistic-support/ali-gemini-consultant.mjs";
import {MessengerSupportQuiz, type SupportQuizSelection} from "@/components/app/messenger-support-quiz";
import {MessengerSixProjects,messengerProject} from "@/components/app/messenger-six-projects";
import { peekHomeAliHandoff, acknowledgeHomeAliHandoff } from "@/lib/home-ali-handoff.mjs";
import type {HomeAliHandoff} from "@/lib/home-ali-handoff.mjs";
import {sessionGoalChoices,sessionCopy,sessionGoalForText,sessionOfferIds,sessionOfferDescription,
  sessionSecretaryMessage,sessionHasOutcome} from "@/lib/holistic-support/session-goal-intake.mjs";
import type {MessengerProjectId,MessengerProjectOption,MessengerTestFocus} from "@/components/app/messenger-six-projects";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { AXIS_REFS } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import { repairDialogueTopic } from "@/lib/holistic-support/dialogue-topic-repair.mjs";
import { buildWaveGoalMenu, readWaveGoalMenu, WAVE_GOAL_STAGE_IDS, waveDialoguePreferences } from "@/lib/holistic-support/wave-goal-dialogue.mjs";
import { ruleConversationReply } from "@/lib/holistic-support/rule-conversation.mjs";
import { friendConversationReply } from "@/lib/holistic-support/friend-mind.mjs";
import {buildWaveEntryMenu,readWaveEntryMenu,waveDialogueEntryTurn,waveJourneyPathFromHistory} from "@/lib/holistic-support/wave-dialogue-entry.mjs";
import {threeJourneyTurn,threeJourneyLabel} from "@/lib/holistic-support/three-journeys.mjs";
import {wavePsychologistNativeTurn,wavePsychologistNativeSummary,
  wavePsychologistQuestion} from "@/lib/assist/wave-psychologist-native.mjs";
import { reviewPracticeBoundary } from "@/lib/holistic-support/practice-boundary.mjs";
import { detectConversationLocale } from "@/lib/holistic-support/conversation-locale.mjs";
import {animateMessengerComposerPlaceholder} from "@/lib/holistic-support/messenger-composer-placeholder.mjs";
import { planJudgmentTurn } from "@/lib/holistic-support/judgment-mind.mjs";
import { newNativeSessionTurn, advanceNativeClientSession } from "@/lib/holistic-support/native-dialogue-client-session.mjs";
import {shouldRetryNativeAgentMode,nativeAgentFallbackPayload,aliGentleContinuity,aliNeedsVerifiedAction} from "@/lib/holistic-support/agent-mode-recovery.mjs";
import { testOfferFromText } from "@/lib/assessments/conversational-test-protocol.mjs";
import type { JudgmentPending, JudgmentChoiceId } from "@/lib/holistic-support/judgment-mind.mjs";
import { publicVideoGoalForMessage } from "@/lib/video-discovery/ranker.mjs";
import MessengerSignIn from "@/components/app/messenger-sign-in";
import { HolisticAgentMemoryPanel } from "@/components/holistic-agent-memory-panel";
import {usePrivateChatHistory,SecureDialogueHistory} from "@/components/holistic-agent-history";
import {interpretSupportUtterance} from "@/lib/holistic-support/guide-dialogue.mjs";
import {classifyVideoChatQuestion,answerVideoChatQuestion} from "@/lib/mandala/video-chat-dialogue-knowledge.mjs";
import {understandVideoChatReply} from "@/lib/mandala/video-chat-understanding.mjs";
import {
  MESSENGER_VIDEO_HANDOFF_KEY,initialMessengerVideoDraft,messengerVideoCopy,
  messengerVideoQuestion,messengerVideoChoices,advanceMessengerVideo,
  changeMessengerVideoPhraseStyle,encodeMessengerVideoHandoff,
} from "@/lib/mandala/video-chat-messenger-flow.mjs";
import {stageVoiceStudioHandoff} from "@/lib/mandala/voice-studio-handoff.mjs";
import {transcribeDeviceAudioFile} from "@/lib/mandala/device-audio-stt.mjs";
import type {TimedSpeechTranscript} from "@/lib/mandala/audio-visual-storyboard.mjs";
import styles from "./holistic-agent-chat.module.css";
import {useVoiceCompanion,VoiceCompanionControls} from "./voice-companion-controls";
import dynamic from "next/dynamic";
import EmotionalAvatar from "@/components/app/emotional-avatar";

const MessengerTestJourney = dynamic(() => import("@/components/app/messenger-test-journey"), { ssr: false });
const MessengerAudioVideo = dynamic(() => import("@/components/app/messenger-audio-video")
  .then(module => module.MessengerAudioVideo), { ssr: false });

type Mode = "rules" | "device" | "owned";
type JourneyPath = "therapy" | "consultation" | "goal";
type PublicVideoGoal = "all" | "stress" | "energy" | "relationships" | "work" | "meaning" | "practices";
type GuidedTrack = "video" | "meditation" | "hint" | null;
type PreviewFocus = "" | "stress" | "relationships" | "self_worth" | "meaning";
type Outline = {status:"draft_ready";title:string;lessons:Array<{number:number;title:string;steps:string[];videoReady:false}>;published:false;mediaReady:false};
type Message = { role: "user" | "assistant"; text: string; variant?:"alternative"; localOnly?:boolean; provisional?:boolean };
type MessengerVideoDraft = {
  goal:string;categoryId:string|null;topicId:string|null;scenarioId:string|null;
  mytubeCategoryId:string|null;mytubeSubcategoryId:string|null;mytubeTopicId:string|null;
  ideaId:string|null;phraseId:string|null;phraseText:string|null;
  tone:"gentle"|"confident"|"grounded"|"inspiring";speaker:"self"|"support";
  length:"short"|"extended";mood:"slow"|"dynamic"|null;
  aspect:"portrait"|"landscape"|"square"|null;duration:10|15|20|30|60|null;
  music:"love"|"meditation"|"harmony"|"none"|null;phrases:boolean|null;
};
type AgentDecision = { status: string; message?: string; question?: {key:string;text:string}|null;
  suggestions?: {id:string;kind:string;title:string;href:string}[] };
type JudgmentView = {status:string;state:string;choices:{id:JudgmentChoiceId;label:string}[];
  token?:string|null;pending?:JudgmentPending|null};
type AgentReply = { judgment?:JudgmentView|null;status:string;reply:string;modelUsed:boolean;source:string;
  suggestions:{id:string;kind:string;title:string;href:string}[];decision:AgentDecision;
  browserModelAllowed:boolean; usedSavedTestEvidence?:boolean; usedSavedVideoHistory?:boolean;
  nativeSession?:{id:string;revision:number};
  journey?:{path:JourneyPath|null;stage:number|null;action:string|null} };

function recommendationPortrait(item:AgentReply["suggestions"][number]):string {
  const title=item.title.toLowerCase();
  if(/kundalini|кундалини/.test(title))return "/images/holistic-house/reiki-practitioner-sunrise.webp";
  if(/yggdrasil|иггдрасил|игдрасил/.test(title))return "/images/holistic-house/ideas-pine-sharp.avif";
  if(/tantra|тантра/.test(title))return "/images/holistic-house/tantra-reiki-yin-yang-cover.svg";
  const art:Record<string,string>={
    video:"/images/holistic-house/ready-save-sunrise-portrait.jpg",
    audio:"/images/holistic-house/course-hero-mindful.svg",
    test:"/images/holistic-house/assessment-lotus.svg",
    course:"/images/holistic-house/course-start-heron.webp",
    service:"/images/holistic-house/support-mock-portrait.webp",
  };
  return art[item.kind]||"/images/holistic-house/reiki-approved-sunrise-v3.webp";
}
const copy = {
  ru:{ title:"Разговор с Ali",disclosure:"Я Ali — ИИ-помощник Holistic House, не человек и не психотерапевт.",
    intro:"Опишите запрос свободно. По вашему согласию можно учесть проверенные результаты выбранной темы без передачи баллов нейросети.",
    placeholder:"Что сейчас для вас важно?",send:"Отправить",cancel:"Остановить",mode:"Способ ответа",
    rules:"Без нейросети",device:"AI на устройстве (может потребоваться загрузка модели)",owned:"AI на нашем сервере (с согласия)",
    consent:"Разрешаю передать моё сообщение и последние реплики этого диалога на собственный защищённый AI-сервер Holistic House.",
    loading:"Формирую ответ…",error:"Можем продолжить разговор здесь, без спешки.",signIn:"Личный режим требует защищённого входа. Нажмите кнопку ниже.",modeError:"Ali продолжает разговор через встроенный интеллект.",
    unavailable:"Локальная модель в этом браузере или для русского языка недоступна; показан проверенный ответ.",
    source:"Источник ответа",suggestions:"Проверенные варианты",start:"Начните с вопроса. Можно сменить режим в любой момент.",
    option:"Выбрать",reset:"Новый разговор",used:"На устройстве",backend:"Собственный сервер",simple:"Алгоритм",
    axis:"Тема профиля (необязательно)",axisNone:"Без дополнительной оси",format:"Предпочитаемый формат",
    allFormats:"Любой подходящий",useTests:"Разрешаю учесть мои сохранённые тесты по выбранной оси только для этого запроса",
    evidenceUsed:"Учтено наличие проверенного результата; баллы не передавались нейросети.",
    useHistory:"Учесть отмеченные мной просмотренные видео (только в этом запросе)",
    historyUsed:"Учтены ранее отмеченные просмотренные видео; личная история не раскрыта нейросети.",
    kinds:{video:"Видео",audio:"Аудио",test:"Тест",course:"Курс",service:"Сессия"},
    hide:"Не предлагать снова",tried:"Я попробовал",localFeedback:"Мои отметки действуют только в этом диалоге и не сохраняются в кабинете.",
    programTitle:"Программа из 8 практик — предварительный план",
    programInfo:"Это образовательный план. Видео и аудио для этих 8 занятий ещё не созданы. Для индивидуальной психотерапии нужна проверка специалиста.",
    programFocus:"Выберите тему",programFocusItems:{stress:"Стресс и восстановление",relationships:"Отношения и границы",self_worth:"Самоподдержка и самооценка",meaning:"Смыслы и направление"},
    programTime:"Предпочитаемая длительность практики (не готового видео)",programSafety:"Я выбираю мягкий образовательный формат и могу остановить его в любой момент. Мне не требуется экстренная помощь.",
    programImagery:"Добавить добровольные ресурсные образы",programStart:"Подготовить план",
    programError:"Не удалось сформировать план. Проверьте вход в кабинет или выберите другую тему.",
    programReady:"План готов для ознакомления, не опубликован. Медиафайлы не создавались.",programEmpty:"Выберите тему и подтвердите готовность.",
    programStep:"Шаг",programNoMedia:"Сценарный план — не готовое видео."},
  en:{ title:"Chat with Ali",disclosure:"I'm Ali, Holistic House's AI guide, not a human or a therapist.",
    intro:"Describe your question. With your permission, verified results for your selected topic can inform suggestions without sharing scores with a model.",
    placeholder:"What's on your mind?",send:"Send",cancel:"Stop",mode:"Response mode",
    rules:"Without a language model",device:"On-device AI (may download a model)",owned:"Our AI server (with consent)",
    consent:"I agree to send this message and recent conversation turns to Holistic House's secured, self-hosted AI server.",
    loading:"Preparing a reply…",error:"We can continue our conversation here.",signIn:"This private mode requires sign-in. Use the Google button below.",modeError:"Ali can continue with its built-in assistant.",
    unavailable:"The on-device language model isn't available for this browser or language; the verified fallback is shown.",
    source:"Reply source",suggestions:"Verified options",start:"Start with a question. You can switch modes any time.",
    option:"Open",reset:"New conversation",used:"On device",backend:"Self-hosted server",simple:"Rules",
    axis:"Profile topic (optional)",axisNone:"No extra axis",format:"Preferred format",
    allFormats:"Any suitable option",useTests:"Allow saved test evidence for this axis and this request only",
    evidenceUsed:"Verified test evidence informed the match; raw scores were not sent to a language model.",
    useHistory:"Use videos I previously marked watched (this request only)",
    historyUsed:"Your previously marked videos informed ordering; no private history was sent to a model.",
    kinds:{video:"Video",audio:"Audio",test:"Test",course:"Course",service:"Session"},
    hide:"Don't suggest again",tried:"I tried it",localFeedback:"These choices apply only to this conversation; they are not saved to your account.",
    programTitle:"Eight-practice program — preview outline",
    programInfo:"Educational outline only. None of the eight video/audio lessons has been produced. Individual psychotherapy requires practitioner review.",
    programFocus:"Choose a topic",programFocusItems:{stress:"Stress and recovery",relationships:"Relationships and boundaries",self_worth:"Self-support and confidence",meaning:"Meaning and direction"},
    programTime:"Preferred practice length (not a finished video)",programSafety:"I choose a gentle educational outline, can stop anytime, and do not need immediate emergency help.",
    programImagery:"Allow optional resource imagery",programStart:"Create outline",
    programError:"Could not prepare the outline. Check your account or choose another topic.",
    programReady:"Draft outline, not published. No media was generated.",programEmpty:"Choose a topic and confirm readiness.",
    programStep:"Step",programNoMedia:"Written outline, not a finished video."},
  es:{ title:"Habla con Ali",disclosure:"Soy Ali, el asistente de IA de Holistic House, no una persona ni terapeuta.",
    intro:"Describe tu pregunta. Con tu permiso se pueden considerar resultados del eje elegido sin enviar puntuaciones al modelo.",
    placeholder:"¿Qué te preocupa ahora?",send:"Enviar",cancel:"Detener",mode:"Tipo de respuesta",
    rules:"Sin modelo de IA",device:"IA en el dispositivo (puede descargar un modelo)",owned:"Nuestro servidor de IA (con permiso)",
    consent:"Acepto enviar este mensaje y los últimos turnos de la conversación al servidor privado de IA de Holistic House.",
    loading:"Preparando una respuesta…",error:"Podemos seguir hablando aquí, sin prisa.",signIn:"Este modo privado requiere acceso. Usa el botón de Google abajo.",modeError:"Ali puede seguir con su asistente integrado.",
    unavailable:"El modelo local no está disponible para este navegador o idioma; se muestra la respuesta segura.",
    source:"Origen",suggestions:"Opciones verificadas",start:"Escribe una pregunta. Puedes cambiar el modo cuando quieras.",
    option:"Abrir",reset:"Nueva conversación",used:"En el dispositivo",backend:"Servidor propio",simple:"Reglas",
    axis:"Tema del perfil (opcional)",axisNone:"Sin dimensión adicional",format:"Formato preferido",
    allFormats:"Cualquier opción adecuada",useTests:"Permito usar pruebas guardadas del eje elegido solo para esta consulta",
    evidenceUsed:"Se consideró la existencia de una prueba verificada; no se enviaron puntuaciones al modelo.",
    useHistory:"Usar vídeos que ya marqué como vistos (solo en esta consulta)",
    historyUsed:"Se tuvieron en cuenta vídeos marcados previamente; no se compartió historial con el modelo.",
    kinds:{video:"Vídeo",audio:"Audio",test:"Prueba",course:"Curso",service:"Sesión"},
    hide:"No volver a sugerir",tried:"Lo probé",localFeedback:"Estas marcas solo se aplican a esta conversación y no se guardan en tu cuenta.",
    programTitle:"Programa de ocho prácticas — borrador",
    programInfo:"Es un esquema educativo. No se han creado ocho vídeos o audios. La psicoterapia individual requiere revisión profesional.",
    programFocus:"Elige un tema",programFocusItems:{stress:"Estrés y recuperación",relationships:"Relaciones y límites",self_worth:"Autoapoyo y confianza",meaning:"Sentido y dirección"},
    programTime:"Duración deseada de la práctica (no del vídeo)",programSafety:"Elijo un esquema educativo suave, puedo detenerlo cuando quiera y no necesito ayuda de emergencia inmediata.",
    programImagery:"Permitir imágenes de recursos opcionales",programStart:"Preparar esquema",
    programError:"No se pudo crear el esquema. Comprueba tu cuenta o elige otro tema.",
    programReady:"Esquema no publicado. No se ha generado ningún vídeo.",programEmpty:"Elige un tema y confirma tu disposición.",
    programStep:"Paso",programNoMedia:"Esquema escrito; no es un vídeo listo."},
} as const;

const messengerStarter = {
 ru:{
  welcome:"Привет! 🙂 Здесь можно просто поговорить или вместе разобраться с вопросом. С чего тебе хочется начать?",
  hello:"Привет! 🙂 Как проходит твой день?",

  video:"Создать контент",videoSub:"Видео · аудио · медитации · послания",
  contentIntent:"Хочу создать контент",
  contentQuestion:"Что хотите создать?",
  contentSourceQuestion:"С чего начнём?",
  contentKinds:{video:"Видеоролик",audio:"Аудио",meditation:"Медитацию",message:"Послание"},
  contentSources:{text:"Написать текст",voice:"Записать / загрузить аудио"},
  contentIdeaQuestion:"Напишите идею ролика (до 160 символов). Затем подберём подходящие кадры.",
  contentIdeaAccepted:"Идея сохранена. ",
  contentVoiceHint:"Запишите голос или выберите аудиофайл ниже. По вашему отдельному разрешению речь будет расшифрована и видеоряд автоматически подобран по смыслу.",
  contentTextHint:"Подготовим видео по тексту из разрешённых кадров. Это не самостоятельная генерация новых видеосцен.",
  contentMeditationHint:"Подготовим медитационный видеоролик.",
  contentMessageHint:"Подготовим видеопослание. Надписи можно настроить в студии.",
  contentAudioHint:"Запись станет звуковой дорожкой видеоролика; отдельный аудиофайл здесь не генерируется.",

  meditation:"Подобрать медитацию",meditationSub:"Практику для сейчас",
  hint:"Получить ИИ-подсказку",hintSub:"Пройти тест",
  master:"Получить личную блиц-диагностику",masterSub:"От мастера",
  actions:"Выберите, с чего начать",testsLink:"Открыть бесплатные тесты",
  videoIntent:"Хочу создать видео",meditationIntent:"Хочу подобрать медитацию",
  hintIntent:"Хочу получить ИИ-подсказку через тест",
  videoQuestion:"С удовольствием! Для начала расскажите, о чём будет видео и что вы хотите почувствовать или изменить после просмотра.",
  meditationQuestion:"Конечно! Как вы себя чувствуете сейчас, сколько минут у вас есть и к какому состоянию хотите прийти?",
  hintQuestion:"Что вы хотите лучше понять сейчас: стресс, отношения, ресурсы или другую тему? Можно начать с бесплатного теста и затем обсудить результат здесь. Тест не является диагнозом.",
  chooseTheme:"Тема готового видео",themes:{stress:"Спокойствие",relationships:"Любовь",energy:"Энергия",meaning:"Смыслы"},
  readyVideos:"Смотреть готовые видео бесплатно",requestVideo:"Создать персональное видео",
  videoAuth:"Войдите через Google, чтобы продолжить создание видео. Готовые ролики доступны без входа.",checkingSignIn:"Проверяем вход…",retrySignIn:"Не удалось проверить вход. Повторить",
  safety:"Если вам или кому-то рядом угрожает непосредственная опасность, обратитесь в экстренную службу. Я могу помочь найти доступные материалы, когда это безопасно.",
 },
 en:{
  welcome:"Hi! 🙂 We can simply chat or think something through together. Where would you like to begin?",
  hello:"Hi! 🙂 How's your day going?",

  video:"Create content",videoSub:"Video · audio · meditations · messages",
  contentIntent:"I want to create content",
  contentQuestion:"What would you like to create?",
  contentSourceQuestion:"How shall we begin?",
  contentKinds:{video:"Video",audio:"Audio",meditation:"Meditation",message:"Message"},
  contentSources:{text:"Write text",voice:"Record / upload audio"},
  contentIdeaQuestion:"Describe your idea (up to 160 characters). Then we'll find matching footage.",
  contentIdeaAccepted:"Idea saved. ",
  contentVoiceHint:"Record your voice or choose an audio file below. With your one-time permission, the Studio will match approved footage to the transcript automatically.",
  contentTextHint:"We'll assemble a video with approved existing footage, not generate entirely new scenes.",
  contentMeditationHint:"We'll prepare a meditation video.",
  contentMessageHint:"We'll prepare a video message. You can set captions in Studio.",
  contentAudioHint:"The recording becomes the video's audio track; no separate audio-only file is generated here.",

  meditation:"Choose a meditation",meditationSub:"A practice for now",
  hint:"Get an AI suggestion",hintSub:"Take a test",
  master:"Get a personal express review",masterSub:"With a practitioner",
  actions:"Choose where to start",testsLink:"Explore free tests",
  videoIntent:"I want to create a video",meditationIntent:"I want to find a meditation",
  hintIntent:"I want a suggestion based on a test",
  videoQuestion:"Of course! What would you like the video to be about, and how would you like to feel after watching it?",
  meditationQuestion:"Of course! How do you feel right now, how many minutes do you have and how would you like to feel after the meditation?",
  hintQuestion:"What would you like to understand better: stress, relationships, personal resources or something else? You can start with a free test, then discuss the result here. A test is not a diagnosis.",
  chooseTheme:"Topic for ready-made videos",themes:{stress:"Calm",relationships:"Love",energy:"Energy",meaning:"Meaning"},
  readyVideos:"Watch ready-made videos for free",requestVideo:"Create my personal video",
  videoAuth:"Sign in with Google to continue creating your video. Ready-made videos remain free to watch.",checkingSignIn:"Checking your sign-in…",retrySignIn:"Could not verify sign-in. Retry",
  safety:"If you or someone nearby is in immediate danger, contact local emergency services. I can help find public resources when it's safe.",
 },
 es:{
  welcome:"¡Hola! Puedo ayudarte con un vídeo de apoyo, una práctica para ahora, un test o una revisión exprés personal. Elige una opción o escribe tu pregunta.",
  hello:"¡Hola! ¿Qué es lo más importante para ti ahora?",

  video:"Crear contenido",videoSub:"Vídeo · audio · meditaciones · mensajes",
  contentIntent:"Quiero crear contenido",
  contentQuestion:"¿Qué quieres crear?",
  contentSourceQuestion:"¿Cómo empezamos?",
  contentKinds:{video:"Vídeo",audio:"Audio",meditation:"Meditación",message:"Mensaje"},
  contentSources:{text:"Escribir texto",voice:"Grabar / subir audio"},
  contentIdeaQuestion:"Describe tu idea (máximo 160 caracteres). Después elegiremos las escenas.",
  contentIdeaAccepted:"Idea guardada. ",
  contentVoiceHint:"Graba tu voz o elige un archivo de audio abajo. Con tu permiso único, el estudio elegirá escenas automáticamente según la transcripción.",
  contentTextHint:"Montaremos el vídeo con escenas existentes autorizadas; no se generan escenas nuevas.",
  contentMeditationHint:"Prepararemos un vídeo de meditación.",
  contentMessageHint:"Prepararemos un mensaje en vídeo. Puedes editar los subtítulos en el Estudio.",
  contentAudioHint:"La grabación será la pista de audio del vídeo; aquí no se crea un archivo solo de audio.",

  meditation:"Elegir meditación",meditationSub:"Una práctica para ahora",
  hint:"Obtener una sugerencia de IA",hintSub:"Hacer un test",
  master:"Solicitar revisión exprés personal",masterSub:"Con un profesional",
  actions:"Elige cómo empezar",testsLink:"Explorar tests gratuitos",
  videoIntent:"Quiero crear un vídeo",meditationIntent:"Quiero elegir una meditación",
  hintIntent:"Quiero una sugerencia mediante un test",
  videoQuestion:"¡Claro! ¿De qué te gustaría que tratara el vídeo y cómo quieres sentirte después de verlo?",
  meditationQuestion:"¡Claro! ¿Cómo te sientes ahora, cuántos minutos tienes y cómo te gustaría sentirte después?",
  hintQuestion:"¿Qué te gustaría comprender mejor: el estrés, las relaciones, tus recursos u otro tema? Puedes empezar con un test gratuito y luego comentar el resultado aquí. Un test no es un diagnóstico.",
  chooseTheme:"Tema de un vídeo disponible",themes:{stress:"Calma",relationships:"Amor",energy:"Energía",meaning:"Sentido"},
  readyVideos:"Ver vídeos disponibles gratis",requestVideo:"Crear mi vídeo personal",
  videoAuth:"Entra con Google para continuar creando tu vídeo. Los vídeos existentes siguen disponibles sin entrar.",checkingSignIn:"Comprobando el acceso…",retrySignIn:"No se pudo comprobar el acceso. Reintentar",
  safety:"Si tú u otra persona estáis en peligro inmediato, contacta los servicios de emergencia locales. Puedo ayudarte a buscar recursos públicos cuando sea seguro.",
 },
} as const;
function isContentCreationIntent(raw:string):boolean {
 return /^(?:создать контент|хочу (?:создать|сделать) контент|create content|i (?:want to |would like to )?(?:create|make) content|crear contenido|quiero (?:crear|hacer) contenido)[.!?]?$/iu.test(raw.trim());
}
function isVideoCreationIntent(raw:string):boolean {
 return /^(?:i (?:want to |would like to )?(?:create|make) (?:a |my )?video|create (?:a |my )?video|хочу (?:создать|сделать) (?:сво[её] |личное )?видео|создать (?:сво[её] |личное )?видео|quiero (?:crear|hacer) (?:un |mi )?v[ií]deo|crear (?:un |mi )?v[ií]deo)[.!?]?$/iu.test(raw.trim());
}
function isCasualGreeting(raw:string):boolean {
 const text=raw.toLocaleLowerCase().normalize("NFKC").replace(/[!?,.¿¡]+/g," ").replace(/\s+/g," ").trim();
 // Only exact simple greetings. Do not intercept risk, privacy or other requests.
 return /^(?:привет|приветик|здравствуй|здравствуйте|доброе утро|добрый день|добрый вечер|ау|ауу|алло|привет ау|ау привет|ты тут|hi|hello|hey|hi there|hello there|hola|buenas|buenos dias)$/.test(text);
}

// Video choices are local, but urgent/human-review text must still use the
// existing authenticated safety preflight, not the category-choice reducer.
function requiresProtectedReply(text:string,locale:PublicLocale):boolean {
  if(reviewPracticeBoundary(text,locale))return true;
  // Match the server preflight before any offline-only response is chosen.
  if(/(?:боль в груди|не могу дышать|трудно дышать|меня бьют|физическое насилие|chest pain|can(?:not|t) breathe|trouble breathing|domestic violence|dolor en el pecho|no puedo respirar|violencia domestica)/iu.test(text))return true;
  if(/(?:не хочу (?:больше )?жить(?:[.!?]|$)|i do not want to live(?:[.!?]|$)|i dont want to live(?:[.!?]|$)|ya no quiero vivir(?:[.!?]|$)|мне стало хуже|после упражнения хуже|хочу остановиться|мне страшно продолжать|i feel worse|please stop|after the exercise i feel worse|me siento peor|no quiero continuar)/iu.test(text))
    return true;
  for(let i=0;i<text.length;i+=180)
    if(interpretSupportUtterance(text.slice(i,i+240),locale).kind==="safety")return true;
  return false;
}
type NativePromptSession = { prompt: (text:string,options?:{signal?:AbortSignal})=>Promise<string>;
  destroy?:()=>void };
type NativeLanguageModel = { availability:(options:unknown)=>Promise<string>;
  create:(options?:unknown)=>Promise<NativePromptSession> };
export type HolisticAgentPageHelp = {greeting:string;section?:string;actions:Array<{id:string;label:string;prompt:string;reply:string;href?:string;track?:"video"|"meditation"|"hint"}>};
export type HolisticAgentQuickPrompt = {revision:number;text:string;format?:"video"|"audio"|"course"|"service"|"test"};
export function HolisticAgentChat({locale:routeLocale,compact=false,quickPrompt,authenticated=false,authStatus="guest",onAuthRetry,pageHelp,messengerView=false,onConversationLocaleChange}:{
 locale:PublicLocale;compact?:boolean;quickPrompt?:HolisticAgentQuickPrompt|null;authenticated?:boolean;
 authStatus?:"guest"|"checking"|"authenticated"|"unavailable";onAuthRetry?:()=>void;pageHelp?:HolisticAgentPageHelp|null;messengerView?:boolean;
 onConversationLocaleChange?:(value:PublicLocale)=>void
}) {
  const [locale,setLocale]=useState<PublicLocale>(routeLocale);
  useEffect(()=>setLocale(routeLocale),[routeLocale]);
  const t=copy[locale];
  const starter=messengerStarter[locale];
  const {persona}=useAliPersona();
  const voiceEnabled=process.env.NEXT_PUBLIC_HH_VOICE_COMPANION_WEB==="true";
  // Only the existing device speech controller handles the AI chat's spoken replies.
  const voice=useVoiceCompanion(locale,voiceEnabled);
  useEffect(()=>{
    if(!messengerView||!voiceEnabled)return;
    if(voice.speechLocale!==locale)voice.setSpeechLocale(locale);
    const available=voice.voices.filter(item=>item.lang.toLowerCase().startsWith(locale));
    if(available.length&&!voice.conversing){
      const ordered=[...available].sort((a,b)=>a.name.localeCompare(b.name));
      const selected=ordered[persona.voice.slot%ordered.length]?.voiceURI;
      if(selected&&selected!==voice.voiceId)voice.setVoiceId(selected);
    }
    if(Math.abs(voice.rate-persona.voice.rate)>0.015)voice.setRate(persona.voice.rate);
  },[messengerView,voiceEnabled,locale,persona.id,voice.voices,voice.voiceId,voice.rate,voice.setVoiceId,voice.setRate,voice.speechLocale,voice.setSpeechLocale,voice.conversing]);
  const [mode,setMode]=useState<Mode>("rules");
  const [journeyPath,setJourneyPath]=useState<JourneyPath|null>(null);
  const [journeyAction,setJourneyAction]=useState<string|null>(null);
  const journeyPrefsRef=useRef({noAdvice:false,noQuestions:false});
  // Pro intentionally selects the already budget-gated Gemini FREE API, never Paid.
  // Unified chat: default protected engine; no user-facing provider tier.
  const [proSelected,setProSelected]=useState(false);
  const [proConsent,setProConsent]=useState(false);
  const [proDataConsent,setProDataConsent]=useState(false);
  const [geminiAvailable,setGeminiAvailable]=useState<boolean|null>(null);
  const [proBusy,setProBusy]=useState(false);
  const proAbort=useRef<AbortController|null>(null);
  const proTurns=useRef<Array<{role:"user"|"assistant";content:string}>>([]);
  const [friendTone,setFriendTone]=useState<"friendly"|"confiding"|"tender">("friendly");
  // Website Secretary Psychologist is a user-invoked, optional local interview,
  // not a backend role grant. Until a verified send route exists, no private
  // answers are sent to the agent API or written to chat-history storage.
  const [psychInterview,setPsychInterview]=useState<"off"|"pending"|"active">("off");
  const [psychStage,setPsychStage]=useState("situation");
  const [psychSlots,setPsychSlots]=useState<Record<string,string>>({});
  const [psychSummaryVisible,setPsychSummaryVisible]=useState(false);
  // A reviewed summary remains in this tab. Copying it is a separate
  // deliberate client gesture and never appends private facts to a URL.
  const [psychFinalSummary,setPsychFinalSummary]=useState<string|null>(null);
  const [psychCopyStatus,setPsychCopyStatus]=useState<"idle"|"copied"|"failed">("idle");
  const [agree,setAgree]=useState(false);
  const [axisRef,setAxisRef]=useState("");
  const [format,setFormat]=useState<""|"video"|"audio"|"test"|"course"|"service">("");
  const [useSavedTests,setUseSavedTests]=useState(false);
  const [useSavedHistory,setUseSavedHistory]=useState(false);
  const [useAgentMemory,setUseAgentMemory]=useState(false);
  const [historyUsed,setHistoryUsed]=useState(false);
  useEffect(()=>{
    if(!authenticated || process.env.NEXT_PUBLIC_HH_AGENT_MEMORY_ENABLED!=="true"){
      setUseAgentMemory(false);
      return;
    }
    let active=true;
    void fetch("/api/app/agent-memory",{credentials:"same-origin",cache:"no-store"})
      .then(async response=>response.ok?response.json():null)
      .then(data=>{
        if(active)setUseAgentMemory(data?.consent===true &&
          data?.useInDialogue===true && Array.isArray(data?.items) &&
          data.items.length>0);
      }).catch(()=>{if(active)setUseAgentMemory(false);});
    return ()=>{active=false;};
  },[authenticated]);
  const [evidenceUsed,setEvidenceUsed]=useState(false);
  const [dismissedIds,setDismissedIds]=useState<string[]>([]);
  const [completedIds,setCompletedIds]=useState<string[]>([]);
  const [draft,setDraft]=useState("");
  const [voiceNoteRevision,setVoiceNoteRevision]=useState(0);
  const [dictationRevision,setDictationRevision]=useState(0);
  const [voiceFile,setVoiceFile]=useState<File|null>(null);
  const [voiceConsent,setVoiceConsent]=useState(false);
  const [voiceBusy,setVoiceBusy]=useState(false);
  const [voiceError,setVoiceError]=useState("");
  const [voiceTranscript,setVoiceTranscript]=useState<TimedSpeechTranscript|null>(null);
  const [voiceHandoffReady,setVoiceHandoffReady]=useState(false);
  const voiceAbortRef=useRef<AbortController|null>(null);
  useEffect(()=>()=>voiceAbortRef.current?.abort(),[]);
  const [entryOpen,setEntryOpen]=useState(true);
  const [recorderOpen,setRecorderOpen]=useState(false);
  const [voicePermissionOpen,setVoicePermissionOpen]=useState(false);
  const voiceRequiresRecorded=voice.prefersRecorded||!voice.recognitionSupported;
  const [guideLink,setGuideLink]=useState<"tests"|null>(null);
  const [testChatOpen,setTestChatOpen]=useState(false);
  const [projectFlow,setProjectFlow]=useState<MessengerProjectId|null>(null);
  const [supportQuizOpen,setSupportQuizOpen]=useState(false);
  const [supportSelection,setSupportSelection]=useState<SupportQuizSelection|null>(null);
  const [sessionStep,setSessionStep]=useState<"goal"|"outcome"|null>(null);
  const [sessionGoal,setSessionGoal]=useState<string|null>(null);
  const [sessionOffers,setSessionOffers]=useState<MessengerProjectOption[]>([]);
  const [testFocus,setTestFocus]=useState<MessengerTestFocus|null>(null);
  const [testChatTurn,setTestChatTurn]=useState<{seq:number;text:string}|null>(null);
  const [testSuggestedKey,setTestSuggestedKey]=useState("");
  const [testRevision,setTestRevision]=useState(0);
  const [guidedTrack,setGuidedTrack]=useState<GuidedTrack>(null);
  const [contentStep,setContentStep]=useState<"kind"|"source"|"brief"|null>(null);
  const [contentBrief,setContentBrief]=useState("");
  const [contentVoice,setContentVoice]=useState(false);
  const [videoGoal,setVideoGoal]=useState<PublicVideoGoal>("all");
  const [showVideoSignIn,setShowVideoSignIn]=useState(false);
  const [needsPrivateSignIn,setNeedsPrivateSignIn]=useState(false);
  const [messages,setMessages]=useState<Message[]>([]);
  const [ratedLearningReply,setRatedLearningReply]=useState<string|null>(null);
  const [qualityPending,setQualityPending]=useState(false);
  const [qualityFailure,setQualityFailure]=useState(false);
  // A spoken answer and its displayed message are the SAME canonical AI turn.
  const lastSpeechTurn=useRef<Message|null>(null);
  useEffect(()=>{
    const latest=messages[messages.length-1]||null;
    if(latest===lastSpeechTurn.current)return;
    lastSpeechTurn.current=latest;
    if(!voiceEnabled)return;
    if(latest?.role==="user"){voice.stop();return;}
    if(latest?.role==="assistant"){
      voice.stop();
      if(voice.autoRead||voice.conversing)voice.speak(latest.text);
    }
  },[messages,voiceEnabled,voice.autoRead,voice.conversing,voice.speak,voice.stop]);
  const lastAnswerRef=useRef<{message:string;history:Array<{role:"user"|"assistant";text:string}>;decision:AgentDecision;locale:PublicLocale}|null>(null);
  const alternativeAbortRef=useRef<AbortController|null>(null);
  const [alternativeBusy,setAlternativeBusy]=useState(false);
  const [alternativeError,setAlternativeError]=useState("");
  const [pageHelpLink,setPageHelpLink]=useState<{href:string;label:string}|null>(null);
  const [choices,setChoices]=useState<AgentReply["suggestions"]>([]);
  // Ephemeral only: signed on the authenticated server, local for guests.
  const [judgmentView,setJudgmentView]=useState<JudgmentView|null>(null);
  const judgmentClickLock=useRef(false);
  const [videoDraft,setVideoDraft]=useState<MessengerVideoDraft>(
    ()=>initialMessengerVideoDraft() as MessengerVideoDraft);
  const [videoStep,setVideoStep]=useState<string|null>(null);
  // One in-memory undo; never store client messages or private drafts.
  const videoUndo=useRef<{draft:MessengerVideoDraft;step:string}|null>(null);
  const [videoPendingCategory,setVideoPendingCategory]=useState<string|null>(null);
  const videoCopy=messengerVideoCopy(locale);
  const videoChoices=compact&&videoStep?messengerVideoChoices(videoDraft,videoStep,locale):[];
  const [status,setStatus]=useState("");
  const [source,setSource]=useState("");
  const [busy,setBusy]=useState(false);
  const controller=useRef<AbortController|null>(null);
  const nativeSession=useRef<{id:string;revision:number}|null>(null);
  useEffect(()=>{nativeSession.current=null;},[authenticated]);
  // Capability check transmits no client text and makes no model call.
  useEffect(()=>{
    if(!messengerView||!proSelected||!authenticated)return;
    const controller=new AbortController();
    setGeminiAvailable(null);
    void fetch("/api/app/my-coach/engines",{credentials:"same-origin",cache:"no-store",signal:controller.signal})
      .then(async response=>response.ok?response.json():null)
      .then(value=>{if(!controller.signal.aborted)setGeminiAvailable(
        value?.schema==="HH_MY_COACH_ENGINES_V1"&&value?.gemini_free===true);})
      .catch(()=>{if(!controller.signal.aborted)setGeminiAvailable(false);});
    return ()=>controller.abort();
  },[messengerView,proSelected,authenticated]);
  const proReady=proSelected&&proConsent&&proDataConsent&&authenticated&&geminiAvailable===true;
  const composerRef=useRef<HTMLTextAreaElement|null>(null);
  const homeHandoffConsumed=useRef(false);
  const homeHandoffDispatching=useRef(false);
  const homeHandoffPending=useRef<{payload:HomeAliHandoff;message:string;startIndex:number}|null>(null);
  const [homeHandoffPhase,setHomeHandoffPhase]=useState<"idle"|"queued"|"sending"|"retry">("idle");
  const [homeHandoffSettled,setHomeHandoffSettled]=useState(false);
  // While auth/answer loads, the full Home question is already a chat bubble.
  // This preview is local-only; the established handler sends it just once.
  const [homeHandoffPreview,setHomeHandoffPreview]=useState<string|null>(null);
  const threadRef=useRef<HTMLDivElement|null>(null);
  const followTail=useRef(true);
  const programmaticScrollTop=useRef<number|null>(null);
  const composerFocused=useRef(false);
  const [newBelow,setNewBelow]=useState(false);
  // An explicit tap is the ONLY consent to anonymous quality statistics.
  // Conversation text and response text never leave via this feedback call.
  async function rateLearningReply(signal:"helpful"|"unhelpful"){
    const latest=messages[messages.length-1];
    if(latest?.role!=="assistant"||qualityPending||ratedLearningReply===latest.text)return;
    setQualityPending(true);setQualityFailure(false);
    try{
      const channel=window.location.pathname.split("/").includes("services")?"services":"messenger";
      const response=await fetch("/api/holistic-agent/quality",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({channel,locale,signal,consent:true}),
      });
      const result=await response.json().catch(()=>null);
      if(response.status!==201||result?.saved!==true)throw Error("LEARNING_FEEDBACK_UNAVAILABLE");
      setRatedLearningReply(latest.text);
    }catch{setQualityFailure(true);}
    finally{setQualityPending(false);}
  }
  const privateTranscript=usePrivateChatHistory({authenticated,onRestore:entries=>{
    // Explicit restore cancels both pending AI and device speech, and must not
    // auto-read historical replies when the Voice Companion is on.
    controller.current?.abort();voiceAbortRef.current?.abort();voice.stopDialogue();
    nativeSession.current=null;
    const previous:Message[]=entries.flatMap(item=>[
      {role:"user" as const,text:item.user},
      {role:"assistant" as const,text:item.assistant},
    ]).slice(-30);
    setPsychInterview("off");setPsychStage("situation");setPsychSlots({});
    setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");
    lastSpeechTurn.current=previous[previous.length-1]||null;
    setJourneyPath(waveJourneyPathFromHistory(previous) as JourneyPath|null);setJourneyAction(null);journeyPrefsRef.current=waveDialoguePreferences(previous);
    setMessages(previous);setDraft("");setChoices([]);setJudgmentView(null);
    setSessionStep(null);setSessionGoal(null);setSessionOffers([]);
    const restoredLocale=detectConversationLocale(entries.at(-1)?.user,locale) as PublicLocale;
    if(messengerView&&restoredLocale!==locale){setLocale(restoredLocale);onConversationLocaleChange?.(restoredLocale);}
    judgmentClickLock.current=false;setVideoStep(null);setGuidedTrack(null);
    setContentStep(null);setContentVoice(false);setEntryOpen(false);
    setStatus("");setSource("");followTail.current=true;setNewBelow(false);
  }});
  useEffect(()=>{
    if(pageHelp){setEntryOpen(true);setPageHelpLink(null);}
  },[pageHelp]);
  useEffect(()=>{
    if(!quickPrompt)return;
    setDraft(quickPrompt.text.slice(0,2000));
    if(quickPrompt.format)setFormat(quickPrompt.format);
    if(compact&&quickPrompt.format==="test"){
      setTestChatOpen(true);setGuidedTrack("hint");setGuideLink("tests");setEntryOpen(false);
    }
    // The user explicitly selected a rail action: prepare, never auto-send it.
    if(!compact)composerRef.current?.focus({preventScroll:true});
  },[quickPrompt,compact]);
  useEffect(()=>{
    // Display the original Home text immediately; never delete it while the
    // account check, navigation or first Ali reply is unfinished.
    if(!compact||!messengerView||homeHandoffConsumed.current||
      homeHandoffPhase==="sending"||homeHandoffPhase==="retry")return;
    if(!/^\/(?:en|ru|es)\/app\/messages\/?$/.test(window.location.pathname))return;
    const transferred=peekHomeAliHandoff(window.sessionStorage,routeLocale);
    if(!transferred)return;
    const prefix=transferred.mode==="business"
      ?(routeLocale==="ru"?"Для бизнеса: ":routeLocale==="es"?"Para mi negocio: ":"For business: "):"";
    const message=(prefix+transferred.text).slice(0,2000);
    if(homeHandoffPhase==="idle"){
      setHomeHandoffPreview(message);
      setDraft(message);setEntryOpen(false);followTail.current=true;setNewBelow(false);
      setHomeHandoffPhase("queued");return;
    }
    if(authStatus==="checking"||busy||homeHandoffDispatching.current)return;
    homeHandoffDispatching.current=true;
    homeHandoffPending.current={payload:transferred,message,startIndex:messages.length};
    setHomeHandoffSettled(false);setHomeHandoffPhase("sending");
    // The one existing Ali handler enforces public safety/private consent.
    void sendTurn(message).catch(()=>{}).finally(()=>{
      homeHandoffDispatching.current=false;setHomeHandoffSettled(true);
    });
  },[compact,messengerView,authStatus,routeLocale,homeHandoffPhase,busy,messages.length]);

  useEffect(()=>{
    const pending=homeHandoffPending.current;
    if(!pending||homeHandoffPhase!=="sending")return;
    const newTurns=messages.slice(pending.startIndex);
    const userIndex=newTurns.findIndex(turn=>turn.role==="user");
    // A provisional local reply continues the conversation; it does NOT
    // prove that the Home service handoff was accepted by the server.
    const answered=userIndex>=0&&newTurns.slice(userIndex+1).some(turn=>turn.role==="assistant"&&turn.provisional!==true);
    if(answered){
      acknowledgeHomeAliHandoff(window.sessionStorage,pending.payload);
      setHomeHandoffPreview(null);
      homeHandoffConsumed.current=true;homeHandoffPending.current=null;
      setHomeHandoffSettled(false);setHomeHandoffPhase("idle");
    }else if(homeHandoffSettled){
      // Failed network call or rejected turn: keep choice and offer explicit retry.
      setDraft(pending.message);setHomeHandoffPhase("retry");
    }
  },[messages,homeHandoffPhase,homeHandoffSettled]);

  function retryHomeAliTurn() {
    const pending=homeHandoffPending.current;
    if(!pending||homeHandoffPhase!=="retry")return;
    // Remove only an unpaired user bubble from the failed request.
    setMessages(previous=>{
      const tail=previous.slice(pending.startIndex);
      return (tail.length===1&&tail[0].role==="user" ||
        tail.length===2&&tail[0].role==="user"&&tail[1].role==="assistant"&&tail[1].provisional===true)
        ?previous.slice(0,pending.startIndex):previous;
    });
    homeHandoffPending.current=null;
    setHomeHandoffSettled(false);setStatus("");setHomeHandoffPhase("queued");
  }

  useEffect(()=>{
    if(!compact)return;
    // Only a public instrument key may travel in the URL; answers/results never do.
    const candidate=new URLSearchParams(window.location.search).get("chatTest");
    if(candidate && /^[a-z0-9-]{1,64}$/.test(candidate)){
      setTestSuggestedKey(candidate);setTestChatOpen(true);setEntryOpen(false);
    }
  },[compact]);
  // Focused iPhone composer: preserve the most recent AI reply or first
  // welcome question in the visible transcript, without moving the page.
  const revealFocusedContext=useCallback(()=>{
    if(!compact||!messengerView||!composerFocused.current)return;
    const thread=threadRef.current;
    if(!thread)return;
    const aiReplies=thread.querySelectorAll('[data-hh-ai-assistant-message]');
    const turns=thread.querySelectorAll('[data-hh-chat-turn]');
    const anchor=aiReplies.item(aiReplies.length-1)||
      (messages.length===0?thread.querySelector('[data-hh-ai-inline-composer]'):null)||
      thread.querySelector('[data-hh-ai-landing-question]')||
      thread.querySelector('[data-hh-ai-welcome]')||
      turns.item(turns.length-1);
    if(!anchor)return;
    const viewport=thread.getBoundingClientRect();
    const bubble=anchor.getBoundingClientRect();
    const breathingRoom=12;
    // Preserve the reader's position if the end of the last AI turn is visible.
    // Align a hidden turn just above the fixed composer after keyboard resize.
    if(bubble.bottom<=viewport.bottom-breathingRoom&&bubble.bottom>=viewport.top+44)return;
    const maxScroll=Math.max(0,thread.scrollHeight-thread.clientHeight);
    const target=Math.max(0,Math.min(maxScroll,
      thread.scrollTop+bubble.bottom-viewport.bottom+breathingRoom));
    if(Math.abs(thread.scrollTop-target)<1)return;
    programmaticScrollTop.current=target;
    thread.scrollTop=target;
    setNewBelow(false);
  },[compact,messengerView,messages.length]);
  useEffect(()=>{
    const thread=threadRef.current;
    if(!thread)return;
    const revealLatest=()=>{
      if(messengerView&&messages.length===0){
        // Hero first on load, welcome question while the keyboard is open.
        if(composerFocused.current)revealFocusedContext();
        else thread.scrollTop=0;
        setNewBelow(false);
        return;
      }
      if(followTail.current){
        // Keep the latest complete AI reply visible, not just the preceding user turn.
        // Scroll only the transcript: never move the pinned composer or Safari viewport.
        const target=Math.max(0,thread.scrollHeight-thread.clientHeight);
        programmaticScrollTop.current=target;
        thread.scrollTop=target;
        setNewBelow(false);
      }else if(messages.length)setNewBelow(true);
    };
    revealLatest();
    // New option groups/auth controls can mount after the message count settles.
    const frame=window.requestAnimationFrame(revealLatest);
    return ()=>window.cancelAnimationFrame(frame);
  },[messages.length,status,choices.length,judgmentView,videoStep,videoDraft,contentStep,contentVoice,
    videoPendingCategory,showVideoSignIn,needsPrivateSignIn,entryOpen,guideLink,testRevision,testChatOpen,testChatTurn,projectFlow,sessionStep,sessionOffers.length,messengerView,revealFocusedContext]);
  useEffect(()=>{
    if(!compact||!messengerView)return;
    const thread=threadRef.current;
    if(!thread)return;
    let frame=0;
    const revealVisibleReply=()=>{
      window.cancelAnimationFrame(frame);
      frame=window.requestAnimationFrame(()=>{
        // The keyboard resizes before the first text message too. A reader
        // manually browsing old turns may still scroll without being pulled.
        if(composerFocused.current){
          if(followTail.current)revealFocusedContext();
          return;
        }
        if(!messages.length||!followTail.current)return;
        const target=Math.max(0,thread.scrollHeight-thread.clientHeight);
        programmaticScrollTop.current=target;
        thread.scrollTop=target;
        setNewBelow(false);
      });
    };
    // The keyboard changes iPhone's visual viewport after the textarea is focused;
    // observing the transcript also catches the subsequent flex layout resize.
    const observer=new ResizeObserver(revealVisibleReply);
    observer.observe(thread);
    const viewport=window.visualViewport;
    viewport?.addEventListener("resize",revealVisibleReply);
    viewport?.addEventListener("scroll",revealVisibleReply);
    window.addEventListener("resize",revealVisibleReply);
    return ()=>{
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      viewport?.removeEventListener("resize",revealVisibleReply);
      viewport?.removeEventListener("scroll",revealVisibleReply);
      window.removeEventListener("resize",revealVisibleReply);
    };
  },[compact,messengerView,messages.length,revealFocusedContext]);
  useEffect(()=>{
    if(!compact)return;
    const input=composerRef.current;
    if(!input)return;
    input.style.height='44px';
    input.style.height=Math.max(44,Math.min(100,input.scrollHeight))+'px';
  },[draft,compact]);
  const [previewFocus,setPreviewFocus]=useState<PreviewFocus>("");
  const [previewMinutes,setPreviewMinutes]=useState<8|12|20>(12);
  const [previewReady,setPreviewReady]=useState(false);
  const [previewImagery,setPreviewImagery]=useState(false);
  const [outline,setOutline]=useState<Outline|null>(null);
  const [outlineBusy,setOutlineBusy]=useState(false);
  const [outlineError,setOutlineError]=useState("");
  async function createOutline(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!previewFocus||!previewReady||outlineBusy)return;
    setOutlineBusy(true);setOutlineError("");setOutline(null);
    try{
      const response=await fetch("/api/holistic-agent/program",{
        method:"POST",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale,focus:previewFocus,minutes:previewMinutes,
          resourceImagery:previewImagery,safetyAcknowledged:previewReady}),
      });
      if(!response.ok)throw Error("PROGRAM_UNAVAILABLE");
      const data=await response.json() as Outline;
      if(data.status!=="draft_ready" || data.mediaReady!==false ||
        data.published!==false || data.lessons?.length!==8)throw Error("NOT_A_REVIEWED_DRAFT");
      setOutline(data);
    }catch{setOutlineError(t.programError);}
    finally{setOutlineBusy(false);}
  }

  function guestAnswer(text:string,prior:Message[],language:PublicLocale=locale):string {
    // A clear service request needs neither sign-in nor a forced goal quiz.
    // The only links here are vetted, published existing Sessions options.
    const intent=sessionSecretaryMessage(text,language);
    const verified=intent.serviceId?messengerProject(language,"sessions").options.find(option=>
      option.id===intent.serviceId&&option.kind==="link"&&
      option.href?.startsWith("/")&&!option.href.startsWith("//")):null;
    if(intent.kind==="service"&&verified){
      setSessionOffers([verified]);setPageHelpLink(null);setGuidedTrack(null);
      return intent.reply;
    }
    const reviewed=ruleConversationReply({message:text,locale:language,history:prior});
    const goal=publicVideoGoalForMessage(text);
    if(goal)setVideoGoal(goal as PublicVideoGoal);
    if(!reviewed||!reviewed.id){
      setGuidedTrack(null);
      if(verified&&(intent.kind==="price"||intent.kind==="availability"||
        intent.kind==="information"))
        setPageHelpLink({href:"/"+language+verified.href,label:verified.label});
      // An unknown *safe* question is not an emergency. Risk questions were
      // screened by requiresProtectedReply before this offline guest route.
      return intent.reply||aliGentleContinuity({message:text,locale:language,history:prior});
    }
    if(reviewed.id.startsWith("video")){
      setGuidedTrack("video");setVideoStep("category");videoUndo.current=null;
      setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);
      setVideoPendingCategory(null);
      return messengerVideoQuestion("category",language);
    }
    else if(reviewed.id.startsWith("meditation"))setGuidedTrack("meditation");
    return typeof reviewed.reply==="string"&&reviewed.reply.trim()?reviewed.reply:
      aliGentleContinuity({message:text,locale:language,history:prior});
  }
  function answerVideo(value:string,label=value,language:PublicLocale=locale) {
    if(!compact||!videoStep||busy)return;
    const questionKind=classifyVideoChatQuestion(value);
    if(questionKind){
      const response=answerVideoChatQuestion(questionKind,{
        locale:language,stage:videoStep,options:videoChoices.map(option=>option.label),
      });
      followTail.current=true;setNewBelow(false);setDraft("");
      setMessages(prev=>[...prev,{role:"user" as const,text:label},
        {role:"assistant" as const,text:response}].slice(-30));
      return;
    }
    const act=understandVideoChatReply(value,videoStep as "category"|"subcategory"|"mytube-topic"|"topic"|"scenario"|"idea"|"phrase"|"mood"|"aspect"|"duration"|"music"|"phrases"|"review");
    if(act.kind==="undo"){
      const previous=videoUndo.current;
      videoUndo.current=null;
      if(previous){setVideoDraft(previous.draft);setVideoStep(previous.step);}
      setDraft("");setStatus("");setSource("");setChoices([]);
      followTail.current=true;setNewBelow(false);
      const nextStep=previous?.step||videoStep;
      setMessages(prev=>[...prev,{role:"user" as const,text:label},
        {role:"assistant" as const,text:(previous?"":messengerVideoCopy(language).unknown+"\\n")+
          messengerVideoQuestion(nextStep,language)}].slice(-30));
      return;
    }
    const result=advanceMessengerVideo(videoDraft,videoStep,value,language);
    if(result.valid){
      if(act.kind==="reset")videoUndo.current=null;
      else videoUndo.current={draft:videoDraft,step:videoStep};
    }
    setVideoPendingCategory(null);
    setVideoDraft(result.draft as MessengerVideoDraft);
    setVideoStep(result.step);
    setJudgmentView(null);
    setDraft("");setStatus("");setSource("");setChoices([]);
    followTail.current=true;setNewBelow(false);
    setMessages(prev=>[...prev,
      {role:"user" as const,text:label},
      {role:"assistant" as const,text:(result.valid?"":messengerVideoCopy(language).unknown+"\\n")+
        messengerVideoQuestion(result.step,language)},
    ].slice(-30));
  }
  function updateVideoPhraseStyle(key:"tone"|"speaker"|"length",value:string,label:string) {
    if(!compact||videoStep!=="phrase"||busy)return;
    const next=changeMessengerVideoPhraseStyle(videoDraft,key,value);
    if(!next)return;
    videoUndo.current={draft:videoDraft,step:videoStep};
    setVideoDraft(next as MessengerVideoDraft);setStatus("");setChoices([]);
    followTail.current=true;setNewBelow(false);
    setMessages(prev=>[...prev,{role:"user" as const,text:label},
      {role:"assistant" as const,text:messengerVideoQuestion("phrase",locale)}].slice(-30));
  }
  function openVideoEdit(step:string,label:string) {
    if(videoStep)videoUndo.current={draft:videoDraft,step:videoStep};
    setVideoPendingCategory(null);
    setVideoStep(step);setShowVideoSignIn(false);followTail.current=true;setNewBelow(false);
    setMessages(prev=>[...prev,{role:"user" as const,text:label},
      {role:"assistant" as const,text:messengerVideoQuestion(step,locale)}].slice(-30));
  }
  function stageVideoHandoff():boolean {
    const payload=encodeMessengerVideoHandoff(videoDraft,locale,contentBrief);
    if(!payload){setStatus(videoCopy.unknown);return false;}
    try{window.sessionStorage.setItem(MESSENGER_VIDEO_HANDOFF_KEY,payload);return true;}
    catch{setStatus(t.error);return false;}
  }

  // The client intentionally starts this dialogue by tapping a labelled
  // option. No emotion keyword, service order or free text grants consent.
  function offerPsychologistInterview(){
    if(busy)return;
    lastAnswerRef.current=null;alternativeAbortRef.current?.abort();
    voice.stopDialogue();setMode("rules");setSupportSelection(null);
    setSupportQuizOpen(false);setEntryOpen(false);setProjectFlow(null);
    setSessionStep(null);setSessionGoal(null);setSessionOffers([]);
    setTestChatOpen(false);setVideoStep(null);setContentStep(null);
    setPsychStage("situation");setPsychSlots({});setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");
    setPsychInterview("pending");setDraft("");setChoices([]);setJudgmentView(null);
    setStatus("");setSource("");followTail.current=true;setNewBelow(false);
    const introduction=locale==="ru"
      ?"Я Ali. Можем бережно прояснить ситуацию в нескольких необязательных вопросах. Это не психотерапия и не диагноз. Ответы останутся в этом окне и не будут переданы мастеру автоматически. Начнём?"
      :locale==="es"
        ?"Soy Ali. Podemos aclarar tu situación con preguntas opcionales. No es terapia ni diagnóstico. Tus respuestas quedan en esta conversación y no se enviarán automáticamente al profesional. ¿Empezamos?"
        :"I'm Ali. We can gently explore your situation with a few optional questions. This is not therapy or a diagnosis. Your answers stay in this window and won't be sent to a practitioner automatically. Shall we begin?";
    setMessages(prev=>[...prev,{role:"assistant" as const,text:introduction,localOnly:true}].slice(-30));
  }
  function consentPsychologistInterview(){
    if(psychInterview!=="pending"||busy)return;
    setPsychInterview("active");setPsychStage("situation");setPsychSlots({});
    setDraft("");setSource("");setStatus("");
    setMessages(prev=>[...prev,{role:"user" as const,text:locale==="ru"?"Да, начнём":
      locale==="es"?"Sí, empecemos":"Yes, let's begin",localOnly:true},
      {role:"assistant" as const,text:wavePsychologistQuestion("situation",locale,[])||
        (locale==="ru"?"Что для вас сейчас важно?":"What matters most to you now?"),localOnly:true}].slice(-30));
  }
  function leavePsychologistInterview(){
    setPsychInterview("off");setPsychStage("situation");setPsychSlots({});
    setDraft("");setSource("");setStatus("");setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");
    setMessages(prev=>[...prev,{role:"assistant" as const,text:locale==="ru"
      ?"Конечно. Останавливаю эту необязательную беседу, ничего специалисту не отправлено."
      :locale==="es"?"Claro. Terminamos aquí; no se envió nada al profesional."
        :"Of course. We'll stop here; nothing was sent to a practitioner.",localOnly:true}].slice(-30));
  }
  function finishPsychologistInterview(){
    if(psychInterview!=="active")return;
    const brief=wavePsychologistNativeSummary({locale,slots:psychSlots});
    setPsychInterview("off");setPsychStage("situation");setPsychSlots({});
    setPsychSummaryVisible(Boolean(brief));setPsychFinalSummary(brief||null);
    setPsychCopyStatus("idle");setDraft("");setSource("");
    const status=locale==="ru"?"Это ваше предварительное резюме, не диагноз. Оно не было отправлено мастеру."
      :locale==="es"?"Este resumen no es un diagnóstico y no se ha enviado al profesional."
        :"This preliminary summary is not a diagnosis and has not been sent to a practitioner.";
    setMessages(prev=>[...prev,{role:"assistant" as const,
      text:(brief|| (locale==="ru"?"Пока нет сведений для резюме.":"There is not enough information for a summary."))+
        "\n\n"+status,localOnly:true}].slice(-30));
  }
  // A client chooses one of four goals before seeing conversation modes.
  // This is a UI preference, not clinical screening or an authorization token.
  function openSupportQuiz(){
    if(busy)return;
    followTail.current=true;setNewBelow(false);
    setPsychInterview("off");setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");setPsychSlots({});
    setSupportSelection(null);setSupportQuizOpen(true);setEntryOpen(false);
    setProjectFlow(null);setSessionStep(null);setSessionGoal(null);setSessionOffers([]);
    setGuidedTrack(null);setTestChatOpen(false);setGuideLink(null);
    setContentStep(null);setContentVoice(false);setVideoStep(null);
    setPageHelpLink(null);setStatus("");setChoices([]);setDraft("");
  }
  function supportSummary(choice:SupportQuizSelection,language:PublicLocale){
    const prefix=language==="ru"?"Тема поддержки: ":language==="es"?"Tema de apoyo: ":"Support topic: ";
    const need=language==="ru"?"Потребность: ":language==="es"?"Necesidad: ":"Need: ";
    const modePrompt=choice.mode==="coach"
      ?(language==="ru"?"Хочу начать коучинг, чтобы разобраться со своей целью.":
        language==="es"?"Quiero coaching para trabajar en mi objetivo.":"Let\'s do coaching. I want to work on my goal.")
      :choice.mode==="talk"
        ?(language==="ru"?"Хочу спокойно поговорить без советов и продаж.":
          language==="es"?"Quiero hablar con calma, sin consejos ni ventas.":"I want a calm conversation without advice or sales pressure.")
        :(language==="ru"?"Хочу подобрать подходящую поддержку.":
          language==="es"?"Quiero encontrar apoyo práctico.":"I want help choosing suitable support.");
    return prefix+choice.categoryLabel+". "+need+choice.needLabel+". "+modePrompt;
  }
  function completeSupportQuiz(choice:SupportQuizSelection){
    if(busy)return;
    setPsychInterview("off");setPsychSlots({});setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");
    const prompt=choice.mode==="coach"
      ?buildWaveGoalMenu(({stress:"energy",relationships:"relationships",money:"money",business:"business"} as const)[choice.category],locale).reply
      :choice.mode==="talk"
        ?(locale==="ru"?"Можем просто поболтать — о радостях, переживаниях или о чём угодно. Что у тебя на душе?":
          locale==="es"?"Podemos charlar sin prisas, de lo bueno o lo difícil. ¿Qué tienes en mente?":
            "We can just chat, about good days or difficult ones. What’s on your mind?")
        :(locale==="ru"?"Вы выбрали тему. Что именно хотели бы получить в первую очередь: информацию, варианты поддержки или помощь с заявкой?":
          locale==="es"?"Ya elegiste un tema. ¿Prefieres información, opciones de apoyo o ayuda para enviar una consulta?":
            "You've chosen a topic. Would you like information, support options, or help with an enquiry first?");
    setSupportQuizOpen(false);setSupportSelection(choice);
    if(choice.mode==="talk"){setMode("rules");setFriendTone("friendly");
      // Friend never silently reuses prior test, history or memory opt-ins.
      setAxisRef("");setUseSavedTests(false);setUseSavedHistory(false);setUseAgentMemory(false);
    }
    setEntryOpen(false);setFormat("");setProjectFlow(null);
    followTail.current=true;setNewBelow(false);
    setMessages([{role:"user",text:supportSummary(choice,locale)},
      {role:"assistant",text:prompt}]);
    setDraft("");setStatus("");setChoices([]);setSource("");
  }
  // One clear question per project; choices describe the next step.
  function startProject(id:MessengerProjectId) {
    if(busy)return;
    setPsychInterview("off");setPsychSlots({});setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");
    if(id==="ai-video"){startContent();return;}
    const entry=messengerProject(locale,id);
    followTail.current=true;setNewBelow(false);setEntryOpen(false);
    setProjectFlow(id);setSessionStep(id==="sessions"?"goal":null);
    setSessionGoal(null);setSessionOffers([]);setTestFocus(null);setTestChatOpen(false);
    setGuideLink(null);setPageHelpLink(null);setGuidedTrack(null);
    setContentStep(null);setContentBrief("");setContentVoice(false);
    setVideoStep(null);setVideoPendingCategory(null);setShowVideoSignIn(false);
    setNeedsPrivateSignIn(false);setJudgmentView(null);setDraft("");
    setStatus("");setSource("");setChoices([]);
    setMessages(prev=>[...prev,{role:"user" as const,text:entry.title},
      {role:"assistant" as const,text:entry.question}].slice(-30));
  }
  function selectSessionGoal(option:{id:string;label:string}) {
    if(busy||projectFlow!=="sessions"||sessionStep!=="goal")return;
    followTail.current=true;setNewBelow(false);setDraft("");
    setSessionGoal(option.id);setSessionStep("outcome");setSessionOffers([]);
    setMessages(prev=>[...prev,{role:"user" as const,text:option.label},
      {role:"assistant" as const,text:sessionCopy(locale).detail}].slice(-30));
    composerRef.current?.focus({preventScroll:true});
  }
  function finishSessionIntake(text:string,goal:string,language:PublicLocale) {
    const options=messengerProject(language,"sessions").options;
    const selected=sessionOfferIds(goal)
      .map(id=>options.find(option=>option.id===id))
      .filter((option):option is MessengerProjectOption=>
        Boolean(option&&option.kind==="link"&&option.href?.startsWith("/")&&!option.href.startsWith("//")));
    followTail.current=true;setNewBelow(false);
    setSessionStep(null);setSessionGoal(null);setProjectFlow(null);setSessionOffers(selected);
    setStatus("");setSource("");setChoices([]);setDraft("");setPageHelpLink(null);
    const results=sessionCopy(language).results;
    const summary=results[goal as keyof typeof results]||results.personal;
    setMessages(prev=>[...prev,{role:"user" as const,text},
      {role:"assistant" as const,text:summary}].slice(-30));
  }
  function selectProjectOption(option:MessengerProjectOption) {
    if(busy||!projectFlow||projectFlow==="sessions")return;
    const entry=messengerProject(locale,projectFlow);
    if(!entry.options.some(value=>value.id===option.id))return;
    followTail.current=true;setNewBelow(false);setProjectFlow(null);
    setPageHelpLink(null);setJudgmentView(null);setDraft("");
    setStatus("");setSource("");setChoices([]);
    if(option.kind==="test"&&option.focus){
      setTestFocus(option.focus);setGuideLink("tests");setTestChatOpen(true);
      setFormat("test");
      setMessages(prev=>[...prev,{role:"user" as const,text:option.label}].slice(-30));
      return;
    }
    const message=option.kind==="ask"&&option.prompt?option.prompt:
      locale==="ru"?"Откройте выбранный раздел по ссылке ниже или напишите свой запрос.":
      locale==="es"?"Abre la sección elegida abajo o escribe tu consulta.":
        "Open the selected section below, or write your question.";
    if(option.kind==="link"&&option.href?.startsWith("/")&&!option.href.startsWith("//"))
      setPageHelpLink({href:"/"+locale+option.href,label:option.label});
    setMessages(prev=>[...prev,{role:"user" as const,text:option.label},
      {role:"assistant" as const,text:message}].slice(-30));
    if(option.kind==="ask")composerRef.current?.focus({preventScroll:true});
  }
  function startContent(language:PublicLocale=locale,initialText?:string) {
    if(busy)return;
    setPsychInterview("off");setPsychSlots({});setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");
    followTail.current=true;setNewBelow(false);setEntryOpen(false);
    setProjectFlow(null);setSessionStep(null);setSessionGoal(null);setSessionOffers([]);setTestFocus(null);
    setContentStep("kind");setContentBrief("");setContentVoice(false);
    videoUndo.current=null;
    setGuidedTrack(null);setVideoStep(null);setVideoPendingCategory(null);
    setGuideLink(null);setTestChatOpen(false);setPageHelpLink(null);
    setShowVideoSignIn(false);setNeedsPrivateSignIn(false);
    setDraft("");setStatus("");setSource("");setChoices([]);
    setMessages(prev=>[...prev,{role:"user" as const,text:initialText||messengerStarter[language].contentIntent},
      {role:"assistant" as const,text:messengerStarter[language].contentQuestion}].slice(-30));
  }
  function chooseContentKind(kind:"video"|"audio"|"meditation"|"message",language:PublicLocale=locale) {
    if(busy||contentStep!=="kind")return;
    followTail.current=true;setNewBelow(false);setDraft("");
    setContentBrief("");setContentVoice(false);setPageHelpLink(null);
    if(kind==="audio"){
      setContentStep(null);setContentVoice(true);
      setMessages(prev=>[...prev,{role:"user" as const,text:messengerStarter[language].contentKinds.audio},
        {role:"assistant" as const,text:messengerStarter[language].contentAudioHint+" "+messengerStarter[language].contentVoiceHint}].slice(-30));
      return;
    }
    setContentStep("source");
    const context=kind==="meditation"?messengerStarter[language].contentMeditationHint:
      kind==="message"?messengerStarter[language].contentMessageHint:messengerStarter[language].contentTextHint;
    setMessages(prev=>[...prev,{role:"user" as const,text:messengerStarter[language].contentKinds[kind]},
      {role:"assistant" as const,text:context+" "+messengerStarter[language].contentSourceQuestion}].slice(-30));
  }
  function chooseContentSource(source:"text"|"voice",language:PublicLocale=locale) {
    if(busy||contentStep!=="source")return;
    followTail.current=true;setNewBelow(false);setDraft("");
    if(source==="voice"){
      setContentStep(null);setContentVoice(true);
      setMessages(prev=>[...prev,{role:"user" as const,text:messengerStarter[language].contentSources.voice},
        {role:"assistant" as const,text:messengerStarter[language].contentVoiceHint}].slice(-30));
      return;
    }
    setContentStep("brief");setContentVoice(false);
    setMessages(prev=>[...prev,{role:"user" as const,text:messengerStarter[language].contentSources.text},
      {role:"assistant" as const,text:messengerStarter[language].contentIdeaQuestion}].slice(-30));
    composerRef.current?.focus({preventScroll:true});
  }
  function selectPageHelpAction(action:HolisticAgentPageHelp["actions"][number]){
    if(busy)return;
    setContentStep(null);setContentVoice(false);setContentBrief("");
    if(action.track){setPageHelpLink(null);startGuided(action.track);return;}
    followTail.current=true;setNewBelow(false);
    setEntryOpen(false);setVideoStep(null);setGuidedTrack(null);
    setJudgmentView(null);
    setStatus("");setSource("");setChoices([]);
    setNeedsPrivateSignIn(false);setShowVideoSignIn(false);
    setPageHelpLink(action.href?{href:action.href,label:action.label}:null);
    setMessages(prev=>[...prev,{role:"user" as const,text:action.prompt},
      {role:"assistant" as const,text:action.reply}].slice(-30));
  }
  function startGuided(kind:"video"|"meditation"|"hint") {
    if(busy)return;
    setPsychInterview("off");setPsychSlots({});setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");
    setProjectFlow(null);setSessionStep(null);setSessionGoal(null);setSessionOffers([]);setTestFocus(null);
    setContentStep(null);setContentBrief("");setContentVoice(false);
    followTail.current=true;setNewBelow(false);
    setFormat(kind==="video"?"video":kind==="meditation"?"audio":"test");
    videoUndo.current=null;
    setVideoStep(kind==="video"?"category":null);
    if(kind==="video"){setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);setVideoPendingCategory(null);}
    setGuidedTrack(kind);setVideoGoal("all");setShowVideoSignIn(false);setNeedsPrivateSignIn(false);setPageHelpLink(null);
    setGuideLink(kind==="hint"?"tests":null);
    setTestChatOpen(kind==="hint");
    setEntryOpen(false);setStatus("");setSource("");setChoices([]);
    setJudgmentView(null);
    setDraft("");
    const intent=kind==="video"?starter.videoIntent:
      kind==="meditation"?starter.meditationIntent:starter.hintIntent;
    const question=kind==="video"?messengerVideoQuestion("category",locale):
      kind==="meditation"?starter.meditationQuestion:starter.hintQuestion;
    setMessages(prev=>[...prev,
      {role:"user" as const,text:intent},
      {role:"assistant" as const,text:question},
    ].slice(-30));
  }
  function selectVoiceMessage(file:File|null){
    voiceAbortRef.current?.abort();voiceAbortRef.current=null;
    setVoiceBusy(false);setVoiceFile(file);setVoiceConsent(false);
    setVoiceError("");setVoiceTranscript(null);setVoiceHandoffReady(false);
  }
  async function transcribeChatAudio(){
    const file=voiceFile;
    if(!file||voiceBusy||!voiceConsent||busy)return;
    if(file.size>4*1024*1024){
      setVoiceError(locale==="ru"?"Файл больше 4 МБ. Сожмите его в M4A/MP3.":
        locale==="es"?"El audio supera 4 MB. Comprímelo a M4A/MP3.":"Audio exceeds 4 MB. Compress it to M4A/MP3.");
      return;
    }
    voiceAbortRef.current?.abort();
    const abort=new AbortController();voiceAbortRef.current=abort;
    setVoiceBusy(true);setVoiceError("");
    try{
      // A verified installed browser language pack keeps the uploaded file on
      // the device; unavailable browsers use the already consented free bridge.
      let transcript:TimedSpeechTranscript;
      try{
        transcript=await transcribeDeviceAudioFile(file,locale,abort.signal);
      }catch{
        if(abort.signal.aborted)return;
        const body=new FormData();
        body.append("file",file,file.name);
        body.append("locale",locale);body.append("consent","yes");
        const response=await fetch("/api/holistic-support/audio-storyboard",{
          method:"POST",body,cache:"no-store",credentials:"same-origin",signal:abort.signal
        });
        const data=await response.json() as {transcript?:TimedSpeechTranscript;error?:string};
        if(!response.ok||!data.transcript)throw Error(data.error||"VOICE_STT_UNAVAILABLE");
        transcript=data.transcript;
      }
      if(voiceAbortRef.current!==abort)return;
      const stored=await stageVoiceStudioHandoff(file,transcript);
      if(voiceAbortRef.current!==abort)return;
      setVoiceTranscript(transcript);setVoiceHandoffReady(stored);
      setVideoStep(null);setGuidedTrack("video");
      setMessages(old=>[...old,
        {role:"user" as const,text:(locale==="ru"?"Голосовое сообщение: ":"Voice message: ")+file.name},
        {role:"assistant" as const,text:locale==="ru"?
          "Расшифровка с таймкодами готова. Откройте студию, чтобы сопоставить смысловые фрагменты с видеосценами.":
          locale==="es"?"Transcripción con tiempos lista. Abre el estudio para elegir escenas según cada momento.":
            "Timed transcript ready. Open Studio to match approved footage to each spoken moment."}
      ].slice(-30));
      if(!stored)setVoiceError(locale==="ru"?
        "Браузер не сохранил временную передачу. Откройте студию и загрузите запись повторно.":
        locale==="es"?"No se pudo transferir el archivo. Cárgalo de nuevo en el estudio.":
          "Local voice handoff unavailable. Reattach the recording in Studio.");
    }catch(error){
      if(abort.signal.aborted)return;
      const code=error instanceof Error?error.message:"";
      setVoiceError(code==="AUDIO_STT_FREE_PROVIDER_NOT_CONFIGURED"?
        (locale==="ru"?"Распознавание файла недоступно в этом браузере, а бесплатный серверный сервис не настроен. Воспользуйтесь голосовым вводом или напишите сообщение.":
          locale==="es"?"El reconocimiento gratuito no está configurado. No se envió el audio.":
            "Automatic file transcription is unavailable here. Try the live microphone or type your message; no paid service was used.") :
        (locale==="ru"?"Не удалось распознать голос с таймкодами. Проверьте файл и подключение.":
          locale==="es"?"No se pudo transcribir con tiempos. Comprueba el archivo y la conexión.":
            "Timed transcription failed. Check the file and connection."));
    }finally{
      if(voiceAbortRef.current===abort){
        voiceAbortRef.current=null;setVoiceBusy(false);
      }
    }
  }
  async function sendTurn(rawText:string,judgmentChoice:JudgmentChoiceId|null=null) {
    const text=rawText.trim().slice(0,2000);
    // A conversational boundary immediately de-escalates the selected tone.
    if(supportSelection?.mode==="talk" && /без флирта|не флиртуй|без романтики|no flirt|don\u0027t flirt|sin coqueteo|no coquetees|мне (?:1[0-7]|[1-9]) лет|i(?:\u0027m| am) (?:1[0-7]|[1-9]) years old/iu.test(text))
      setFriendTone("friendly");
    const turnLocale=messengerView&&judgmentChoice===null
      ?detectConversationLocale(text,locale) as PublicLocale:locale;
    if(turnLocale!==locale){setLocale(turnLocale);onConversationLocaleChange?.(turnLocale);}
    const turnStarter=messengerStarter[turnLocale],turnCopy=copy[turnLocale];
    const boundaryReply=reviewPracticeBoundary(text,turnLocale)?.reply||turnStarter.safety;
    if(!text||busy||(mode==="owned"&&!agree&&!(compact&&(testChatOpen||testOfferFromText(text))))||
      (judgmentChoice!==null&&judgmentClickLock.current))return;
    // Session-only constraints survive the 12-turn provider-safe history window.
    // They restrict replies; they are never consent to use private data.
    if(judgmentChoice===null){
      const prefs=journeyPrefsRef.current;
      if(/без советов|просто выслушай|без предложений|не предлагай|no advice|just listen|no offers|sin consejos|solo esc[uú]chame|sin ofertas/iu.test(text))prefs.noAdvice=true;
      else if(/дай совет|можешь посоветовать|можно совет|give me advice|what do you recommend|dame un consejo|puedes aconsejarme/iu.test(text))prefs.noAdvice=false;
      if(/без вопросов|не задавай вопросов|no questions|don't ask questions|sin preguntas|no me preguntes/iu.test(text))prefs.noQuestions=true;
      else if(/можешь задать вопрос|давай вопросы|спроси меня|you can ask|ask me a question|puedes preguntar|hazme una pregunta/iu.test(text))prefs.noQuestions=false;
    }
    alternativeAbortRef.current?.abort();alternativeAbortRef.current=null;
    lastAnswerRef.current=null;setAlternativeError("");
    if(judgmentChoice===null)setJourneyAction(null);
    // After a tap and separate explicit Yes, this entire interview runs only
    // in the browser's temporary memory. It never calls /api/holistic-agent/turn,
    // external AI, profile memory, or privateTranscript.savePair().
    if(psychInterview==="pending"&&judgmentChoice===null){
      if(/^(?:да|давайте|согласен(?:а)?|yes|yes please|sure|sí|si|claro)[.!\s]*$/iu.test(text)){
        consentPsychologistInterview();return;
      }
      if(/^(?:нет|не сейчас|не хочу|stop|no|no thanks|not now|ahora no|no quiero|parar)[.!\s]*$/iu.test(text)){
        leavePsychologistInterview();return;
      }
      setDraft("");setMessages(prev=>[...prev,{role:"assistant" as const,
        text:turnLocale==="ru"?"Пожалуйста, выберите «Начать» или «Не сейчас».":
          turnLocale==="es"?"Elige «Empezar» o «Ahora no», por favor.":
          'Please choose “Begin” or “Not now”.',localOnly:true}].slice(-30));return;
    }
    if(psychInterview==="active"&&judgmentChoice===null){
      setDraft("");setChoices([]);setSource("");setStatus("");
      followTail.current=true;setNewBelow(false);
      if(/^(?:\/stop|стоп|остановить|не хочу продолжать|stop|cancel|parar|detener)[.!\s]*$/iu.test(text)){
        leavePsychologistInterview();return;
      }
      if(/^(?:\/finish|завершить|готово|finish|done|terminar|finalizar)[.!\s]*$/iu.test(text)){
        finishPsychologistInterview();return;
      }
      if(requiresProtectedReply(text,turnLocale)){
        setMessages(prev=>[...prev,{role:"user" as const,text,localOnly:true},
          {role:"assistant" as const,text:boundaryReply,localOnly:true}].slice(-30));
        return;
      }
      const plan=wavePsychologistNativeTurn({message:text,locale:turnLocale,
        stage:psychStage,slots:psychSlots,
        turns:messages.filter(row=>row.localOnly).slice(-28)});
      if(!plan){
        setMessages(prev=>[...prev,{role:"assistant" as const,text:boundaryReply,localOnly:true}].slice(-30));
        return;
      }
      setPsychStage(plan.stage);setPsychSlots(plan.slots);
      setMessages(prev=>[...prev,{role:"user" as const,text,localOnly:true},
        {role:"assistant" as const,text:plan.reply,localOnly:true}].slice(-30));
      return;
    }
    if(judgmentChoice!==null){
      if(authenticated&&!judgmentView?.token)return;
      judgmentClickLock.current=true;
    }
    if(compact&&judgmentChoice===null&&testChatOpen&&
      !isContentCreationIntent(text)&&!isVideoCreationIntent(text)){
      // Keep conversational test input inside the consented guest-run flow.
      // No test response is forwarded to the agent model, history API or third-party transcription.
      setDraft("");setStatus("");setChoices([]);followTail.current=true;setNewBelow(false);
      if(requiresProtectedReply(text,turnLocale)){
        setTestChatOpen(false);setTestChatTurn(null);setTestSuggestedKey("");
        // Never record a sensitive test utterance in general agent history.
        setMessages(prev=>[...prev,{role:"assistant" as const,text:boundaryReply}].slice(-30));
      }else{
        setTestChatTurn(prev=>({seq:(prev?.seq||0)+1,text}));
        // Confirmed answers render from the owned test-run record below;
        // never duplicate answers in the AI assistant history array.
      }
      return;
    }
    if(compact&&judgmentChoice===null&&!videoStep&&!contentStep&&!requiresProtectedReply(text,turnLocale)){
      const testOffer=testOfferFromText(text);
      if(testOffer){
        setTestSuggestedKey(testOffer.topic==="personality"?"mini-ipip-20":
          testOffer.topic==="state"?"hh-current-state":"");
        setTestChatTurn(null);setTestChatOpen(true);setGuideLink("tests");
        setEntryOpen(false);setDraft("");setStatus("");setChoices([]);
        setJudgmentView(null);setGuidedTrack("hint");followTail.current=true;setNewBelow(false);
        const explanation=turnLocale==="ru"
          ?"Могу предложить бесплатный проверенный опросник. Сначала выберите методику и подтвердите согласие. Вопросы и баллы не изменяются ИИ."
          :turnLocale==="es"
          ?"Puedo ofrecer un cuestionario gratuito. Elige primero la prueba y acepta las condiciones. La IA no cambia las preguntas ni las puntuaciones."
          :"I can suggest an eligible free questionnaire. Choose the instrument and confirm consent first. AI never changes questions or scores.";
        setMessages(prev=>[...prev,{role:"user" as const,text},
          {role:"assistant" as const,text:explanation}].slice(-30));
        return;
      }
    }
    if(compact&&isCasualGreeting(text)&&supportSelection?.mode!=="talk"&&
      !(projectFlow==="sessions"&&sessionStep)){
      setProjectFlow(null);setSessionStep(null);setSessionGoal(null);setSessionOffers([]);setPageHelpLink(null);
      setJudgmentView(null);judgmentClickLock.current=false;
      setContentStep(null);setContentVoice(false);setContentBrief("");
      followTail.current=true;setNewBelow(false);setStatus("");setSource("");setChoices([]);setDraft("");
      setMessages(prev=>[...prev,{role:"user" as const,text},
        {role:"assistant" as const,text:(journeyPath?threeJourneyTurn({path:journeyPath,message:text,locale:turnLocale,history:messages.slice(-6)})?.reply:buildWaveEntryMenu(turnLocale).reply)||
          (/[а-яё]/iu.test(text)?messengerStarter.ru.hello:
            /^(?:hola|buenas)/i.test(text)?messengerStarter.es.hello:turnStarter.hello)}].slice(-30));
      return;
    }
    if(compact&&isContentCreationIntent(text)){setTestChatOpen(false);setTestChatTurn(null);setTestSuggestedKey("");startContent(turnLocale,text);return;}
    if(compact&&contentStep==="kind"){
      const selected=(["video","audio","meditation","message"] as const).find(kind=>
        turnStarter.contentKinds[kind].toLocaleLowerCase()===text.toLocaleLowerCase());
      if(selected){chooseContentKind(selected,turnLocale);return;}
    }
    if(compact&&contentStep==="source"){
      const selected=(["text","voice"] as const).find(source=>
        turnStarter.contentSources[source].toLocaleLowerCase()===text.toLocaleLowerCase());
      if(selected){chooseContentSource(selected,turnLocale);return;}
    }
    if(compact&&contentStep==="brief"){
      if(!requiresProtectedReply(text,turnLocale)){
        setContentBrief(text);setContentStep(null);setContentVoice(false);
        setVideoStep("category");setGuidedTrack("video");setFormat("video");
        setVideoPendingCategory(null);setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);
        setDraft("");followTail.current=true;setNewBelow(false);
        setMessages(prev=>[...prev,{role:"user" as const,text},
          {role:"assistant" as const,text:turnStarter.contentIdeaAccepted+
            messengerVideoQuestion("category",turnLocale)}].slice(-30));
        return;
      }
      setContentBrief("");setContentStep(null);
    }
    if(compact&&isVideoCreationIntent(text)){
      followTail.current=true;setNewBelow(false);setDraft("");setStatus("");setChoices([]);
      setEntryOpen(false);setContentStep(null);setContentVoice(false);setContentBrief("");setGuidedTrack("video");setFormat("video");setTestChatOpen(false);setTestChatTurn(null);setTestSuggestedKey("");
      setVideoPendingCategory(null);setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);
      setVideoStep("category");setShowVideoSignIn(false);setNeedsPrivateSignIn(false);
      setMessages(prev=>[...prev,{role:"user" as const,text},
        {role:"assistant" as const,text:messengerVideoQuestion("category",turnLocale)}].slice(-30));
      return;
    }
    if(compact&&videoStep&&judgmentChoice===null){
      // Direct editor instructions remain editable; a user's newly stated
      // personal difficulty can explicitly switch to supportive dialogue.
      const supportState=planJudgmentTurn({message:text,locale:turnLocale,
        safety:{status:"clear"},history:messages.slice(-6)}).state;
      const supportSwitch=supportState==="awaiting_choice"||supportState==="emotion_acknowledged";
      if(!requiresProtectedReply(text,turnLocale)&&!supportSwitch){
        judgmentClickLock.current=false;answerVideo(text,text,turnLocale);return;
      }
      setJudgmentView(null);
      setVideoStep(null);setGuidedTrack(null);setVideoPendingCategory(null);
    }
    // Secretary-first Sessions: direct service interest bypasses the optional
    // goal interview; price/availability questions and refusal never consume
    // an answer or silently open a practitioner request.
    if(compact&&judgmentChoice===null&&projectFlow==="sessions"&&sessionStep&&
      !isContentCreationIntent(text)&&!isVideoCreationIntent(text)&&!requiresProtectedReply(text,turnLocale)){
      const intent=sessionSecretaryMessage(text,turnLocale);
      followTail.current=true;setNewBelow(false);setDraft("");setChoices([]);
      if(intent.kind==="stop"||intent.kind==="no_booking"||intent.kind==="topic"){
        setProjectFlow(null);setSessionStep(null);setSessionGoal(null);
        setSessionOffers([]);setPageHelpLink(null);setStatus("");
        setMessages(prev=>[...prev,{role:"user" as const,text},
          {role:"assistant" as const,text:intent.reply}].slice(-30));
        return;
      }
      if(intent.kind==="service"){
        // Only the four existing published site paths can be shown. The
        // destination page owns the actual order, price and consent.
        const chosen=messengerProject(turnLocale,"sessions").options.find(option=>
          option.id===intent.serviceId&&option.kind==="link"&&
          option.href?.startsWith("/")&&!option.href.startsWith("//"));
        if(chosen){
          setProjectFlow(null);setSessionStep(null);setSessionGoal(null);
          setSessionOffers([chosen]);setPageHelpLink(null);setStatus("");
          setMessages(prev=>[...prev,{role:"user" as const,text},
            {role:"assistant" as const,text:intent.reply}].slice(-30));
          return;
        }
      }
      if(intent.kind!=="continue"&&intent.kind!=="service"){
        // A factual question may name a service without authorizing a
        // booking. Expose its existing public page, keep the unfinished step.
        if((intent.kind==="price"||intent.kind==="availability"||intent.kind==="information")&&intent.serviceId){
          const page=messengerProject(turnLocale,"sessions").options.find(option=>
            option.id===intent.serviceId&&option.kind==="link"&&
            option.href?.startsWith("/")&&!option.href.startsWith("//"));
          if(page)setPageHelpLink({href:"/"+turnLocale+page.href,label:page.label});
        }
        setMessages(prev=>[...prev,{role:"user" as const,text},
          {role:"assistant" as const,text:intent.reply}].slice(-30));
        return;
      }
      const goal=sessionGoal||sessionGoalForText(text);
      // Ask a second question only when a desired result is still absent,
      // not because the first reply happens to be fewer than 36 characters.
      if(sessionStep==="goal"&&(!goal||!sessionHasOutcome(text))){
        setSessionGoal(goal);setSessionStep("outcome");
        setMessages(prev=>[...prev,{role:"user" as const,text},
          {role:"assistant" as const,text:sessionCopy(turnLocale).detail}].slice(-30));
      }else{
        finishSessionIntake(text,goal||"personal",turnLocale);
      }
      return;
    }
    // After the shortlist appears, a correction is still part of the same
    // Sessions conversation. Do not send a new text to generic chat and lose
    // the previously chosen topic merely because a list was displayed.
    if(compact&&judgmentChoice===null&&!projectFlow&&sessionOffers.length>0&&
      !isContentCreationIntent(text)&&!isVideoCreationIntent(text)&&!requiresProtectedReply(text,turnLocale)){
      const intent=sessionSecretaryMessage(text,turnLocale);
      if(intent.kind==="service"){
        const corrected=messengerProject(turnLocale,"sessions").options.find(option=>
          option.id===intent.serviceId&&option.kind==="link"&&
          option.href?.startsWith("/")&&!option.href.startsWith("//"));
        if(corrected){
          setSessionOffers([corrected]);setPageHelpLink(null);
          setDraft("");setChoices([]);setStatus("");
          followTail.current=true;setNewBelow(false);
          setMessages(prev=>[...prev,{role:"user" as const,text},
            {role:"assistant" as const,text:intent.reply}].slice(-30));
          return;
        }
      }
      if(["stop","no_booking","topic","price","availability","information","confused","ambiguous"].includes(intent.kind)){
        if(["stop","no_booking","topic"].includes(intent.kind)){
          setSessionOffers([]);setPageHelpLink(null);
        }else if((intent.kind==="price"||intent.kind==="availability"||intent.kind==="information")&&intent.serviceId){
          const page=messengerProject(turnLocale,"sessions").options.find(option=>
            option.id===intent.serviceId&&option.kind==="link"&&
            option.href?.startsWith("/")&&!option.href.startsWith("//"));
          if(page)setPageHelpLink({href:"/"+turnLocale+page.href,label:page.label});
        }
        setDraft("");setChoices([]);setStatus("");
        followTail.current=true;setNewBelow(false);
        setMessages(prev=>[...prev,{role:"user" as const,text},
          {role:"assistant" as const,text:intent.reply}].slice(-30));
        return;
      }
    }
    setEntryOpen(false);setContentStep(null);setProjectFlow(null);setPageHelpLink(null);
    setSessionStep(null);setSessionGoal(null);setSessionOffers([]);
    // Keep every user turn intact for server safety preflight (UI max 2,000).
    // Bound unusually long assistant replies without altering user risk cues.
    // Keep the user's explicit quiz choices present after older chat turns roll out.
    // A fresh topic or stop request must not inherit the old goal.
    const leaveSupport=/^(?:стоп|сменим тему|сменить тему|новая тема|другая тема|stop|cancel|switch topics|new topic|change topic|cambiar de tema|otro tema)[.!?\\s]*$/iu.test(text);
    if(leaveSupport){setSupportSelection(null);setFriendTone("friendly");setJourneyPath(null);setJourneyAction(null);journeyPrefsRef.current={noAdvice:false,noQuestions:false};}
    // Preserve five-stage first-contact context without exposing additional
    // history to optional owned/browser inference modes.
    const historyLimit=mode==="rules"?12:6;
    // The soft psychologist's turns are never reusable general-chat context:
    // neither the normal server route nor a model-backed follow-up can read
    // their local-only transcripts, even after Exit or Summary.
    const shareableTurns=messages.filter(row=>row.localOnly!==true);
    const previousTurns=(!leaveSupport&&supportSelection)
      ?[{role:"user" as const,text:supportSummary(supportSelection,turnLocale)},...shareableTurns.slice(-(historyLimit-1))]
      :shareableTurns.slice(-historyLimit);
    const prior=previousTurns.map(row=>({
      role:row.role,text:row.role==="user"?row.text:row.text.slice(0,4000),
    })),abort=new AbortController();
    // First-party goal/support navigation is deterministic for guests and signed-in users.
    // Explicit private interview, media, booking, protected replies and signed choices retain precedence.
    const goalNavigation=judgmentChoice===null&&!requiresProtectedReply(text,turnLocale)
      ?waveDialogueEntryTurn({message:text,locale:turnLocale,history:prior,
        path:!leaveSupport?(journeyPath||(supportSelection?.mode==="talk"?"therapy":null)):null,
        preferenceNoAdvice:journeyPrefsRef.current.noAdvice,
        preferenceNoQuestions:journeyPrefsRef.current.noQuestions}):null;
    if(goalNavigation){
      setJourneyPath(goalNavigation.path as JourneyPath|null);setJourneyAction(goalNavigation.action||null);setSupportSelection(null);
      setGuidedTrack(null);setGuideLink(null);
      nativeSession.current=null;setDraft("");setChoices([]);setJudgmentView(null);judgmentClickLock.current=false;
      setStatus("");setSource("");setEvidenceUsed(false);setHistoryUsed(false);setNeedsPrivateSignIn(false);
      setShowVideoSignIn(false);setEntryOpen(false);followTail.current=true;setNewBelow(false);
      setMessages(prev=>[...prev,{role:"user" as const,text},{role:"assistant" as const,text:goalNavigation.reply}].slice(-30));
      if(authenticated)void privateTranscript.savePair(text,goalNavigation.reply);
      return;
    }
    // Guest discovery uses public editorial rules, not private account APIs.
    if(compact&&!authenticated&&mode==="rules"){
      followTail.current=true;setNewBelow(false);setStatus("");setSource("");setChoices([]);
      setNeedsPrivateSignIn(false);setShowVideoSignIn(false);setEntryOpen(false);setDraft("");
      // Guest Friend uses the same offline engine as the authenticated route.
      // The existing sensitive-content boundary and signed choices still win.
      const selectedJourney=!leaveSupport&&journeyPath&&judgmentChoice===null&&
        !requiresProtectedReply(text,turnLocale)
        ?threeJourneyTurn({path:journeyPath,message:text,locale:turnLocale,history:prior,
          preferenceNoAdvice:journeyPrefsRef.current.noAdvice,
          preferenceNoQuestions:journeyPrefsRef.current.noQuestions}):null;
      const friendReply=selectedJourney?null:supportSelection?.mode==="talk"&&judgmentChoice===null &&
        !requiresProtectedReply(text,turnLocale)
        ?friendConversationReply({message:text,locale:turnLocale,history:prior,tone:friendTone}):null;
      const topicRepair=!selectedJourney&&!friendReply&&judgmentChoice===null&&!requiresProtectedReply(text,turnLocale)
        ?repairDialogueTopic({message:text,locale:turnLocale,history:prior}):null;
      const candidate=selectedJourney||friendReply||topicRepair?null:planJudgmentTurn({message:text,locale:turnLocale,
        safety:{status:"clear"},history:prior,pending:judgmentView?.pending,choiceId:judgmentChoice});
      const handled=candidate!==null&&candidate.status!=="abstain";
      const answer=requiresProtectedReply(text,turnLocale)?boundaryReply:
        selectedJourney?.reply||friendReply?.reply||topicRepair?.reply||(handled?candidate!.reply:guestAnswer(text,prior,turnLocale));
      setJourneyAction(selectedJourney?.action||null);
      setJudgmentView(requiresProtectedReply(text,turnLocale)?null:
        handled?candidate as JudgmentView:null);
      judgmentClickLock.current=false;
      setMessages(prev=>[...prev,{role:"user" as const,text},
        {role:"assistant" as const,text:answer}].slice(-30));
      return;
    }
    followTail.current=true;setNewBelow(false);setNeedsPrivateSignIn(false);setShowVideoSignIn(false);
    controller.current=abort;setBusy(true);setStatus("");setChoices([]);setDraft("");
    setMessages(prev=>[...prev,{role:"user" as const,text}]);
    try {
      const stateTurn=authenticated&&mode==="rules"&&supportSelection?.mode!=="talk"&&turnLocale!=="es"&&typeof crypto.randomUUID==="function"
        ?newNativeSessionTurn(nativeSession.current,crypto.randomUUID()):null;
      if(!stateTurn)nativeSession.current=null;
      const payload={locale:turnLocale,message:text,mode,history:prior,
          journeyPath:!leaveSupport?journeyPath:null,
          journeyNoAdvice:journeyPath?journeyPrefsRef.current.noAdvice:false,
          journeyNoQuestions:journeyPath?journeyPrefsRef.current.noQuestions:false,
          // Only explicit coaching choice in this first-party quiz sets the goal preference.
          // Safety, price and stop questions still override it server-side.
          selectedGoal:!leaveSupport&&supportSelection?.mode==="coach"
            ?({stress:"energy",relationships:"relationships",money:"money",business:"goals"} as const)[supportSelection.category]
            :null,
          companionMode:!leaveSupport&&supportSelection?.mode==="talk"&&mode==="rules"?"friend":null,
          companionTone:!leaveSupport&&supportSelection?.mode==="talk"&&mode==="rules"?friendTone:null,
          ownedInferenceConsent:mode==="owned"&&agree,
          chosenAxes:axisRef?[axisRef]:[],
          preferredFormat:format||null,
          usePrivateProfile:useSavedTests&&Boolean(axisRef),
          usePrivateHistory:useSavedHistory,
          useAgentMemory:authenticated&&useAgentMemory,
          judgmentContext:judgmentView?.token||null,
          judgmentChoice,
          ...(stateTurn?{nativeSession:stateTurn}:{}),
          feedback:{dismissedIds,completedIds}};
      const sendAgentTurn=async (body:typeof payload)=>{
        // Cover BOTH response headers and a stalled JSON body. Manual Stop
        // remains separate from a timeout, which needs a gentle local reply.
        const network=new AbortController();
        const cancel=()=>network.abort();
        abort.signal.addEventListener("abort",cancel,{once:true});
        if(abort.signal.aborted)network.abort();
        const timeout=window.setTimeout(()=>network.abort(),12000);
        try{
          const response=await fetch("/api/holistic-agent/turn",{
            method:"POST",credentials:"same-origin",signal:network.signal,
            headers:{"Content-Type":"application/json"},body:JSON.stringify(body),
          });
          const result=await response.json().catch(()=>null) as
            (AgentReply&{error?:string})|null;
          return {ok:response.ok,status:response.status,result};
        }finally{
          window.clearTimeout(timeout);
          abort.signal.removeEventListener("abort",cancel);
        }
      };
      let remote=await sendAgentTurn(payload);
      let nativeDowngrade=false;
      // Optional inference is gated in production. Retry only on the explicit
      // disabled-mode code, with first-party, same-origin native conversation.
      if(remote.status===503&&mode!=="rules"&&
          shouldRetryNativeAgentMode({mode,status:remote.status,errorCode:remote.result?.error})){
        const fallback=nativeAgentFallbackPayload(payload);
        if(fallback){
          remote=await sendAgentTurn(fallback as typeof payload);
          nativeDowngrade=remote.ok;
        }
      }
      if(!remote.ok){
        if(stateTurn&&(remote.status===404||remote.status===409))nativeSession.current=null;
        throw Error(remote.status===401?"SIGN_IN_REQUIRED":remote.status===503?"SERVER_UNAVAILABLE":"CHAT_UNAVAILABLE");
      }
      const data=remote.result;
      if(abort.signal.aborted)return;
      if(typeof data?.reply!=="string"||!data.reply.trim())throw Error("EMPTY_AGENT_REPLY");
      if(stateTurn){
        // A safety/Judgment turn may intentionally omit the session. Do not
        // reuse state that did not observe that turn on a subsequent request.
        nativeSession.current=null;
        nativeSession.current=advanceNativeClientSession(stateTurn,data.nativeSession);
      }
      let reply=data.reply,used=data.source||"none";
      if(mode==="device"&&!nativeDowngrade&&data.browserModelAllowed&&!abort.signal.aborted){
        try {
          const native=(window as Window & {LanguageModel?:NativeLanguageModel}).LanguageModel;
          const languages=[turnLocale];
          const caps={expectedInputs:[{type:"text",languages}],
            expectedOutputs:[{type:"text",languages}]};
          if(!native||await native.availability(caps)==="unavailable")
            throw Error("DEVICE_UNAVAILABLE");
          const envelope=prepareNaturalDialogue({locale:turnLocale,message:text,history:prior,decision:data.decision,
            channel:"browser",consent:{browserInference:true}});
          if(!envelope.modelAllowed||!envelope.modelRequest)throw Error("DEVICE_DISABLED");
          const session=await native.create(caps);
          try{
            const generated=await finishNaturalDialogue(envelope,async request=>{
              const prompt=request.messages.map(x=>x.role+": "+x.content).join("\n\n");
              return session.prompt(prompt,{signal:abort.signal});
            });
            if(generated.modelUsed){reply=generated.text;used="browser";}
          } finally {session.destroy?.();}
        } catch {
          // The verified server response remains valid without local AI.
          // Do not place a technical failure alert into the conversation.
          setMode("rules");setAgree(false);
        }
      }
      if(abort.signal.aborted)return;
      setChoices(Array.isArray(data.suggestions)?data.suggestions:[]);
      setJourneyAction(data.journey?.action||null);
      if(data.journey)setJourneyPath(data.journey.path);
      setJudgmentView(data.judgment&&Array.isArray(data.judgment.choices)?
        data.judgment:null);
      setEvidenceUsed(data.usedSavedTestEvidence===true);
      setHistoryUsed(data.usedSavedVideoHistory===true);
      if(data.browserModelAllowed&&data.decision&&!requiresProtectedReply(text,turnLocale)){
        lastAnswerRef.current={message:text,history:prior,decision:data.decision,locale:turnLocale};
      }
      setMessages(prev=>[...prev,{role:"assistant" as const,text:reply}].slice(-30));
      if(authenticated)void privateTranscript.savePair(text,reply);
      // Social replies are already AI-labelled: omit the mechanical
      // "source: algorithm" footer only for this small-talk subset.
      const socialRule=used==="rules"?ruleConversationReply({message:text,locale:turnLocale,history:prior}):null;
      const friendlyTurn=data.source==="friend-mind"||Boolean(socialRule&&typeof socialRule.id==="string"&&["conversation_greeting","conversation_small_talk","conversation_chat_invitation"].includes(socialRule.id));
      // The server attributes actual model output, not a selected mode or key presence.
      setSource(used==="gemini-free-public"&&data.modelUsed===true?"Gemini · Free API":
        friendlyTurn?"":used==="browser"?turnCopy.used:used==="owned"?turnCopy.backend:turnCopy.simple);
      if(nativeDowngrade){
        // A successful native reply is the reply, not a large error alert.
        setMode("rules");setAgree(false);setStatus("");
      }
    } catch (error) {
      if(!abort.signal.aborted){
        // Every failed turn gets a local, gentle reply. Never retry an auth,
        // rate-limit or security rejection, or imply a protected action ran.
        const reason=error instanceof Error?error.message:"";
        nativeSession.current=null;lastAnswerRef.current=null;
        const needsSignIn=reason==="SIGN_IN_REQUIRED";
        const protectedQuestion=judgmentChoice!==null||aliNeedsVerifiedAction(text);
        const unsafe=requiresProtectedReply(text,turnLocale);
        const selectedJourney=!unsafe&&!protectedQuestion&&journeyPath
          ?threeJourneyTurn({path:journeyPath,message:text,locale:turnLocale,history:prior,
            preferenceNoAdvice:journeyPrefsRef.current.noAdvice,
            preferenceNoQuestions:journeyPrefsRef.current.noQuestions}):null;
        const companion=!selectedJourney&&!unsafe&&!protectedQuestion&&supportSelection?.mode==="talk"
          ?friendConversationReply({message:text,locale:turnLocale,history:prior,tone:friendTone}):null;
        const topicRepair=!selectedJourney&&!companion&&!unsafe&&!protectedQuestion
          ?repairDialogueTopic({message:text,locale:turnLocale,history:prior}):null;
        const judgment=!selectedJourney&&!unsafe&&!protectedQuestion&&!companion&&!topicRepair
          ?planJudgmentTurn({message:text,locale:turnLocale,
            safety:{status:"clear"},history:prior,pending:null}):null;
        const known=!selectedJourney&&!unsafe&&!protectedQuestion&&!companion&&
          (!judgment||judgment.status==="abstain")
          ?ruleConversationReply({message:text,locale:turnLocale,history:prior}):null;
        const answer=unsafe?boundaryReply:
          judgmentChoice!==null?aliGentleContinuity({message:text,locale:turnLocale,
            history:prior,actionPending:true}):
          selectedJourney?.reply||companion?.reply||topicRepair?.reply||(judgment&&judgment.status!=="abstain"?judgment.reply:null)||
          (known?.id&&!known.id.startsWith("video")&&typeof known.reply==="string"&&known.reply.trim()?known.reply:null)||
          aliGentleContinuity({message:text,locale:turnLocale,history:prior,requiresSignIn:needsSignIn});
        setChoices([]);setJudgmentView(null);setEvidenceUsed(false);setHistoryUsed(false);
        setSource("");setStatus("");
        if(mode!=="rules"){setMode("rules");setAgree(false);}
        // Preserve the user-visible exchange but do not store it as a verified
        // server result. A Home handoff must still require a real server reply.
        setMessages(prev=>[...prev,{role:"assistant" as const,text:answer,provisional:true}].slice(-30));
        setNeedsPrivateSignIn(needsSignIn&&Boolean(useSavedTests||useSavedHistory||useAgentMemory||
          mode==="owned"));
      }
    } finally {
      setBusy(false);controller.current=null;judgmentClickLock.current=false;
    }
  }
  async function requestAlternativeAnswer(style:"different"|"simple"|"deep"="different") {
    const context=lastAnswerRef.current;
    if(!context||alternativeBusy||busy)return;
    if(requiresProtectedReply(context.message,context.locale)){
      setAlternativeError(context.locale==="ru"?"Для этого сообщения альтернативная обработка отключена из соображений безопасности.":
        context.locale==="es"?"La respuesta alternativa está desactivada por seguridad.":"Alternative processing is disabled for this message for safety.");
      return;
    }
    const native=(window as Window & {LanguageModel?:NativeLanguageModel}).LanguageModel;
    if(!native){
      setAlternativeError(context.locale==="ru"?"Бесплатная локальная модель не поддерживается этим браузером. Исходный ответ сохранён.":
        context.locale==="es"?"Este navegador no admite un modelo local gratuito. La respuesta original sigue disponible.":
        "This browser does not support a free on-device model. Your original answer is unchanged.");
      return;
    }
    const abort=new AbortController();
    alternativeAbortRef.current=abort;setAlternativeBusy(true);setAlternativeError("");
    try{
      const languages=[context.locale];
      const caps={expectedInputs:[{type:"text",languages}],expectedOutputs:[{type:"text",languages}]};
      if(await native.availability(caps)==="unavailable")throw Error("DEVICE_MODEL_UNAVAILABLE");
      const instruction=style==="simple"
        ?"Give a simpler, shorter alternative in plain everyday language. Preserve uncertainty and safety boundaries."
        :style==="deep"
        ?"Give a more detailed alternative with clearer reasoning and practical nuance. Do not invent facts or claim professional certainty."
        :"Offer a genuinely different helpful approach to the original question. Do not repeat the previous answer.";
      const envelope=prepareNaturalDialogue({
        locale:context.locale,
        message:instruction+"\nOriginal user question: "+context.message,
        history:context.history,
        decision:context.decision,
        channel:"browser",
        consent:{browserInference:true},
      });
      if(!envelope.modelAllowed||!envelope.modelRequest)throw Error("DEVICE_MODEL_NOT_ALLOWED");
      const session=await native.create(caps);
      let generated;
      try{
        generated=await finishNaturalDialogue(envelope,async request=>{
          const prompt=request.messages.map(item=>item.role+": "+item.content).join("\n\n");
          return session.prompt(prompt,{signal:abort.signal});
        });
      }finally{session.destroy?.();}
      if(abort.signal.aborted)return;
      if(!generated.modelUsed||!generated.text?.trim())throw Error("DEVICE_MODEL_NO_REPLY");
      setMessages(prev=>[...prev,{role:"assistant" as const,text:generated.text,variant:"alternative" as const}].slice(-30));
      setSource(context.locale==="ru"?"Бесплатная модель на устройстве":context.locale==="es"?"Modelo gratuito en el dispositivo":"Free on-device model");
    }catch(error){
      if(!abort.signal.aborted){
        const code=error instanceof Error?error.message:"";
        setAlternativeError(code==="DEVICE_MODEL_UNAVAILABLE"
          ?(context.locale==="ru"?"Локальная модель сейчас недоступна на этом устройстве.":"The on-device model is currently unavailable.")
          :(context.locale==="ru"?"Не удалось получить альтернативный ответ. Исходный ответ сохранён.":context.locale==="es"?"No se pudo generar otra respuesta. La respuesta original sigue disponible.":"Could not generate an alternative. Your original answer is unchanged."));
      }
    }finally{
      if(alternativeAbortRef.current===abort){alternativeAbortRef.current=null;setAlternativeBusy(false);}
    }
  }
  async function sendProTurn(raw:string){
    const text=raw.trim();
    if(!text||busy||proBusy)return;
    // As in the main Messenger, the user's latest words determine the reply language.
    const turnLocale=detectConversationLocale(text,locale) as PublicLocale;
    if(turnLocale!==locale){setLocale(turnLocale);onConversationLocaleChange?.(turnLocale);}
    if(!proReady){
      setStatus(locale==="ru"?"Для Gemini нужны вход и два согласия.":locale==="es"?
        "Para Gemini se requiere acceso y dos consentimientos.":"Sign in and approve both Gemini consents first.");
      return;
    }
    // Immediate safety guard: protected topics stay with the established safe Ali route.
    if(requiresProtectedReply(text,turnLocale)){void sendTurn(text);return;}
    let payload;
    try{payload=aliGeminiRequest({message:text,locale:turnLocale,personaId:persona.id,
      turns:proTurns.current.slice(-10),consent:proConsent,freeDataConsent:proDataConsent});}
    catch{
      setStatus(locale==="ru"?"Для Gemini используйте сообщение до 1200 знаков.":locale==="es"?
        "Escribe hasta 1200 caracteres para Gemini.":"Gemini accepts up to 1200 characters per message.");
      return;
    }
    const abort=new AbortController();
    proAbort.current=abort;setProBusy(true);setSource("");setStatus("");
    setChoices([]);setJudgmentView(null);setDraft("");followTail.current=true;setNewBelow(false);
    setMessages(prev=>[...prev,{role:"user" as const,text}].slice(-30));
    try{
      const response=await fetch(ALI_GEMINI_FREE_ENDPOINT,{
        method:"POST",credentials:"same-origin",cache:"no-store",signal:abort.signal,
        headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),
      });
      const result=await response.json().catch(()=>null);
      if(!response.ok)throw Error("ALI_GEMINI_ROUTE_UNAVAILABLE");
      const answer=aliGeminiResult(result);
      if(abort.signal.aborted)return;
      setMessages(prev=>[...prev,{role:"assistant" as const,text:answer.text}].slice(-30));
      if(answer.kind==="gemini"){
        proTurns.current=[...proTurns.current,{role:"user" as const,content:text},
          {role:"assistant" as const,content:answer.text.slice(0,900)}].slice(-10);
        setSource("Gemini · Free API");
      }else{setSource("");}
    }catch{
      if(!abort.signal.aborted){
        // The provider did not answer: no fake Gemini reply and no silent Free fallback.
        setMessages(prev=>prev.at(-1)?.role==="user"&&prev.at(-1)?.text===text?
          prev.slice(0,-1):prev);
        setDraft(text);
        voice.stopDialogue();
        setStatus(locale==="ru"?"Gemini сейчас недоступен. Текст сохранён — повторите позже или выберите Free.":
          locale==="es"?"Gemini no está disponible. Conservamos tu texto; inténtalo luego o elige Free.":
          "Gemini is unavailable. Your text is kept; retry later or choose Free.");
      }
    }finally{
      if(proAbort.current===abort){proAbort.current=null;setProBusy(false);}
    }
  }
  function startJourney(path:JourneyPath){
    if(busy||proBusy||psychInterview!=="off")return;
    // The selected label follows the same first-party policy as typed navigation.
    const label=threeJourneyLabel(path,locale);
    const navigation=waveDialogueEntryTurn({message:label,locale,history:messages,path:journeyPath,
      preferenceNoAdvice:journeyPrefsRef.current.noAdvice,
      preferenceNoQuestions:journeyPrefsRef.current.noQuestions});
    if(!navigation)return;
    voice.stopDialogue();setMode("rules");setProSelected(false);nativeSession.current=null;
    setJourneyPath(path);setJourneyAction(navigation.action||null);setSupportSelection(null);
    setEntryOpen(false);setDraft("");setPageHelpLink(null);setChoices([]);setJudgmentView(null);
    setVideoStep(null);setContentStep(null);setGuidedTrack(null);setGuideLink(null);
    followTail.current=true;setNewBelow(false);
    setMessages(prev=>[...prev,{role:"user" as const,text:label},
      {role:"assistant" as const,text:navigation.reply}].slice(-30));
    if(authenticated)void privateTranscript.savePair(label,navigation.reply);
    window.requestAnimationFrame(()=>composerRef.current?.focus({preventScroll:true}));
  }
  function sendSelectedTurn(raw:string){
    if(messengerView&&proSelected){
      const navigation=!proBusy&&!videoStep&&!contentStep&&!testChatOpen&&psychInterview==="off"
        ?waveDialogueEntryTurn({message:raw,locale,history:messages,path:journeyPath,
          preferenceNoAdvice:journeyPrefsRef.current.noAdvice,
          preferenceNoQuestions:journeyPrefsRef.current.noQuestions}):null;
      if(journeyPath||navigation){setProSelected(false);setMode("rules");}
      else{void sendProTurn(raw);return;}
    }
    void sendTurn(raw);
  }
  function renderWaveGoalMenu(text:string,index:number){
    const entry=readWaveEntryMenu(text);
    if(entry)return <div className={`${styles.assistant} ${styles.dialogueMenu}`} data-hh-wave-entry-menu>
      <strong>{entry.question}</strong>
      <div className={styles.dialogueChoices} role="group" aria-label={entry.question}>
        {entry.choices.map((choice:{id:string;label:string})=><button key={choice.id} type="button"
          className={styles.dialogueChoice} data-hh-wave-journey={choice.id}
          disabled={busy||proBusy||index!==messages.length-1} onClick={()=>void sendTurn(choice.label)}>{choice.label}</button>)}
      </div>
    </div>;
    const menu=readWaveGoalMenu(text);if(!menu)return null;
    return <div className={styles.assistant} data-hh-wave-goal-menu style={{minWidth:0,display:"grid",gap:10}}>
      <span>{menu.intro}</span><strong>{menu.question}</strong>
      <div role="group" aria-label={menu.question} style={{display:"grid",gap:7}}>
        {menu.stages.map((label:string,i:number)=><button key={i} type="button" data-hh-wave-goal-step={i+1} data-hh-wave-goal-stage-id={WAVE_GOAL_STAGE_IDS[i]}
          className={styles.dialogueChoice} disabled={busy||proBusy||index!==messages.length-1} onClick={()=>void sendTurn(label)}
          style={{display:"flex",alignItems:"center",gap:9,textAlign:"start",minHeight:44,padding:"9px 10px",border:"1px solid #D5E5DB",borderRadius:12,background:"#F1F6F0",color:"#164D40",font:"inherit",fontWeight:600,whiteSpace:"normal",overflowWrap:"anywhere"}}>
          <span aria-hidden="true" style={{flexShrink:0,background:"#E1EDE3",borderRadius:8,padding:"5px 7px"}}>{String(i+1).padStart(2,"0")}</span><span>{label}</span>
        </button>)}
      </div><span data-hh-wave-goal-closing>{menu.closing}</span>
    </div>;
  }
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(event.currentTarget.querySelector("[data-hh-dictation-active]"))return;
    // The initial CTA starts a conversation even without a written question.
    // This is a local welcome, never a blank Free/Gemini provider request.
    // Entered text still uses the existing consent-gated delivery path.
    if(showLandingComposer&&!draft.trim()){
      followTail.current=true;setNewBelow(false);setEntryOpen(false);
      setStatus("");setSource("");
      setMessages(prev=>prev.length?prev:[
        {role:"assistant" as const,text:messengerStarter[locale].welcome,localOnly:true},
      ]);
      window.requestAnimationFrame(()=>composerRef.current?.focus({preventScroll:true}));
      return;
    }
    sendSelectedTurn(draft);
  }
  function resetConversation(){setDictationRevision(value=>value+1);setVoiceNoteRevision(value=>value+1);setJourneyPath(null);setJourneyAction(null);journeyPrefsRef.current={noAdvice:false,noQuestions:false};setPsychInterview("off");setPsychStage("situation");setPsychSlots({});setPsychSummaryVisible(false);setPsychFinalSummary(null);setPsychCopyStatus("idle");nativeSession.current=null;voice.stopDialogue();lastSpeechTurn.current=null;alternativeAbortRef.current?.abort();alternativeAbortRef.current=null;lastAnswerRef.current=null;setAlternativeBusy(false);controller.current?.abort();selectVoiceMessage(null);followTail.current=true;setNewBelow(false);setMessages([]);setPageHelpLink(null);setChoices([]);setJudgmentView(null);judgmentClickLock.current=false;setStatus("");setSource("");setEvidenceUsed(false);setHistoryUsed(false);setDismissedIds([]);setCompletedIds([]);setEntryOpen(true);setSupportQuizOpen(false);setSupportSelection(null);setFriendTone("friendly");setProjectFlow(null);setSessionStep(null);setSessionGoal(null);setSessionOffers([]);setTestFocus(null);setContentStep(null);setContentVoice(false);setContentBrief("");setFormat("");setGuideLink(null);setTestChatOpen(false);setTestChatTurn(null);setTestSuggestedKey("");setTestRevision(0);setGuidedTrack(null);setVideoGoal("all");setShowVideoSignIn(false);setNeedsPrivateSignIn(false);setVideoStep(null);videoUndo.current=null;setVideoPendingCategory(null);setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);setRecorderOpen(false);setVoicePermissionOpen(false);proAbort.current?.abort();proAbort.current=null;proTurns.current=[];
    setProBusy(false);setProSelected(false);setProConsent(false);setProDataConsent(false);setGeminiAvailable(null);}

  useEffect(()=>{
    const startNewConversation=()=>resetConversation();
    const openConversationHistory=()=>{
      const history=document.querySelector<HTMLDetailsElement>("[data-hh-secure-chat-history]");
      if(history){history.open=true;history.scrollIntoView({behavior:"smooth",block:"start"});return;}
      setStatus(locale==="ru"?"История пока недоступна для этого аккаунта.":
        locale==="es"?"El historial todavía no está disponible para esta cuenta.":
          "Conversation history is not available for this account yet.");
    };
    window.addEventListener("hh:messenger-new-chat",startNewConversation);
    window.addEventListener("hh:messenger-open-history",openConversationHistory);
    return()=>{
      window.removeEventListener("hh:messenger-new-chat",startNewConversation);
      window.removeEventListener("hh:messenger-open-history",openConversationHistory);
    };
  },[locale,authenticated]);

  function beginMessengerVoice(){
    if(!voiceEnabled){setStatus(locale==="ru"?"Голосовой разговор сейчас отключён.":locale==="es"?
      "El chat de voz está desactivado.":"Voice conversation is disabled.");return;}
    if(proSelected&&!proReady){
      setStatus(locale==="ru"?"Для голосового Pro сначала войдите в аккаунт и разрешите Gemini.":locale==="es"?
        "Para hablar con Gemini, inicia sesión y da tu consentimiento.":
        "Sign in and approve the Gemini Pro consents before voice.");
      return;
    }
    if(!voice.supported||(voiceRequiresRecorded&&!voice.recordedSupported)){
      setStatus(locale==="ru"?"Микрофон недоступен. Проверьте разрешение Safari или введите текст.":locale==="es"?
        "Micrófono no disponible. Comprueba Safari o escribe.":
        "Microphone unavailable. Check Safari permissions or type instead.");
      return;
    }
    const launched=voice.startDialogue(text=>{
      if(busy||proBusy||(proSelected&&!proReady)||(mode==="owned"&&!agree)){
        setDraft(text);voice.stopDialogue();return;
      }
      if(requiresProtectedReply(text,locale))voice.stopDialogue();
      setDraft(text);sendSelectedTurn(text);
    },{allowRecorded:voiceRequiresRecorded,consentOnStart:true,
      recordedPurpose:authenticated?'ali_chat':'public'});
    if(launched){setVoicePermissionOpen(false);setStatus("");}
  }

  const voiceAttachment=compact?<label className={styles.mode} data-hh-voice-message-upload
    style={{display:"inline-flex",alignItems:"center",cursor:"pointer",fontSize:13}}>
    {messengerView?<><Paperclip size={19} aria-hidden="true"/>
      <span>{locale==="ru"?"Прикрепить аудио":locale==="es"?"Adjuntar audio":"Attach audio"}</span></>:
      locale==="ru"?"🎙 Аудио":locale==="es"?"🎙 Audio":"🎙 Voice"}
    <input type="file"
      accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,audio/ogg,.mp3,.m4a,.wav,.webm,.ogg,.aac"
      aria-label={locale==="ru"?"Прикрепить аудиосообщение":locale==="es"?"Adjuntar audio":"Attach voice message"}
      disabled={voiceBusy||busy}
      style={{position:"absolute",width:1,height:1,opacity:0}}
      onChange={event=>{
        selectVoiceMessage(event.currentTarget.files?.[0]||null);
        event.currentTarget.value="";
      }}/>
  </label>:null;
  const resetControl=<button type="button" onClick={resetConversation}>{t.reset}</button>;
  const voiceControls=voiceEnabled?<VoiceCompanionControls voice={voice} locale={locale}
    privacyOnly={Boolean(pageHelp)||messengerView}
    greeting={pageHelp?.greeting??starter.welcome}
    latestReply={[...messages].reverse().find(item=>item.role==="assistant")?.text}
    onTranscript={text=>setDraft(prev=>((prev?prev+" ":"")+text).slice(0,2000))}
    onConversationTurn={text=>{
      if(busy||mode==="owned"&&!agree){setDraft(text);voice.stopDialogue();return;}
      if(requiresProtectedReply(text,locale))voice.stopDialogue();
      setDraft(text);sendSelectedTurn(text);
    }}/>:null;

  const settings = (
    <details className={compact?styles.compactSettings:styles.expandedSettings} open={!compact}>
      <summary>{compact?(locale==="ru"?"Настройки":locale==="es"?"Ajustes":"Settings"):(locale==="ru"?"Режим ответа и конфиденциальность":locale==="es"?"Modo y privacidad":"Response mode and privacy")}</summary>
    <label className={styles.mode}>{t.mode}
      <select value={mode} onChange={event=>{voice.stopDialogue();setMode(event.target.value as Mode);setStatus("");}}>
        <option value="rules">{t.rules}</option>
        <option value="device">{t.device}</option>
        <option value="owned">{t.owned}</option>
      </select>
    </label>
    <div className={styles.preferences}>
      <label className={styles.mode}>{t.axis}
        <select value={axisRef} onChange={e=>{
          setAxisRef(e.target.value);if(!e.target.value)setUseSavedTests(false);
        }}>
          <option value="">{t.axisNone}</option>
          {Object.entries(AXIS_REFS).map(([id,axis])=>
            <option key={id} value={id}>{axis.label[locale]||axis.label.en}</option>)}
        </select>
      </label>
      <label className={styles.mode}>{t.format}
        <select value={format} onChange={e=>setFormat(e.target.value as typeof format)}>
          <option value="">{t.allFormats}</option>
          {(["video","audio","test","course","service"] as const).map(kind=>
            <option key={kind} value={kind}>{t.kinds[kind]}</option>)}
        </select>
      </label>
    </div>
    <label className={styles.consent}>
      <input type="checkbox" disabled={!axisRef} checked={useSavedTests}
        onChange={e=>setUseSavedTests(e.target.checked)}/>
      {t.useTests}
    </label>
    <label className={styles.consent}>
      <input type="checkbox" checked={useSavedHistory}
        onChange={e=>setUseSavedHistory(e.target.checked)}/>
      {t.useHistory}
    </label>
    {mode==="owned"&&<label className={styles.consent}>
      <input type="checkbox" checked={agree} onChange={event=>setAgree(event.target.checked)}/>
      {t.consent}
    </label>}
    {voiceControls}
    </details>
  );
  const availableSuggestions=choices.filter(x=>!dismissedIds.includes(x.id)&&!completedIds.includes(x.id));
  const renderRecommendation=(x:AgentReply["suggestions"][number])=><article className={styles.offer} key={x.id} data-hh-recommendation-card>
    <img src={recommendationPortrait(x)} alt="" className={styles.offerPortrait}
      width={70} height={70} loading="lazy" decoding="async"/>
    <div className={styles.offerBody}>
      <div className={styles.offerTitle}><strong>{x.title}</strong>
        <small>{t.kinds[x.kind as keyof typeof t.kinds]||x.kind}</small></div>
      <div className={styles.offerFoot}>
        <a href={x.href} rel="noreferrer" className={styles.offerOpen}>{t.option} ↗</a>
        <details className={styles.offerFeedback}>
          <summary>{locale==="ru"?"Отметить":locale==="es"?"Marcar":"Feedback"}</summary>
          <div className={styles.feedbackActions}>
            <button type="button" onClick={()=>setDismissedIds(ids=>[...new Set([...ids,x.id])].slice(-20))}>{t.hide}</button>
            <button type="button" onClick={()=>setCompletedIds(ids=>[...new Set([...ids,x.id])].slice(-20))}>{t.tried}</button>
          </div>
        </details>
      </div>
    </div>
  </article>;
  const showLandingComposer=compact&&messengerView&&!pageHelp&&!messages.length&&!homeHandoffPreview&&!supportQuizOpen;
  const composerPlaceholder=messengerView?(locale==="ru"?"Расскажи, чего ты хочешь или что сейчас мешает…":locale==="es"?"Cuéntame qué deseas o qué te preocupa…":"Tell me what you want or what is holding you back…"):t.placeholder;
  const animateComposer=messengerView&&!pageHelp&&!busy&&!proBusy&&!draft&&
    !recorderOpen&&!voicePermissionOpen&&!voice.conversing&&!voice.speaking&&
    !supportQuizOpen&&homeHandoffPhase==="idle";
  useEffect(()=>{
    const input=composerRef.current;
    if(!input)return;
    if(!animateComposer){input.placeholder=composerPlaceholder;return;}
    return animateMessengerComposerPlaceholder(input,locale,composerPlaceholder);
  },[animateComposer,locale,composerPlaceholder,showLandingComposer]);
  const composer=(
    <form onSubmit={submit} className={styles.form} data-hh-ai-chat-composer={messengerView||undefined}
      data-landing-composer={showLandingComposer||undefined}
      data-gemini-pending={messengerView&&proSelected&&!proReady||undefined}
      data-voice-onboarding={messengerView&&(voicePermissionOpen||voice.conversing||Boolean(voice.notice))||undefined}>
      <textarea ref={composerRef} value={draft} onChange={e=>setDraft(e.target.value)}
        placeholder={composerPlaceholder}
        onFocus={()=>{
          if(!compact||!messengerView)return;
          composerFocused.current=true;
          followTail.current=true;
          window.requestAnimationFrame(revealFocusedContext);
        }}
        onBlur={()=>{composerFocused.current=false;}}
        maxLength={contentStep==="brief"?160:2000} rows={compact?1:3} disabled={busy||proBusy} aria-label={t.placeholder}/>
      <div className={styles.actions}>
        {messengerView?<details className={styles.composerMore} data-hh-ai-more>
          <summary aria-label={locale==="ru"?"Дополнительные действия":locale==="es"?"Más acciones":"More actions"}><Plus size={19} aria-hidden="true"/></summary>
          <div className={styles.composerMenu}>
            {voiceAttachment}
            {messengerView&&!pageHelp&&<MessengerVoiceNote locale={locale} accountAuthenticated={authenticated}
              resetRevision={voiceNoteRevision}
              disabled={busy||proBusy||homeHandoffPhase==="queued"||homeHandoffPhase==="sending"||
                (proSelected&&!proReady)||(mode==="owned"&&!agree)}
              onBegin={()=>{setDictationRevision(value=>value+1);if(voice.conversing)voice.stopDialogue();}}
              onSendTranscript={(text,_file,_seconds)=>{
                if(busy||proBusy||homeHandoffPhase==="queued"||homeHandoffPhase==="sending"||
                    (proSelected&&!proReady)||(mode==="owned"&&!agree)||!text.trim())return false;
                sendSelectedTurn(text);
                return true;
              }}/>}
            {messengerView&&!pageHelp&&<button type="button"
              data-hh-live-conversation-mic
              onClick={()=>{
                if(voice.conversing){
                  if(voice.speaking)voice.interruptReply();
                  else voice.stopDialogue();
                }else if(voice.playbackConsent&&voice.sttConsent)beginMessengerVoice();
                else setVoicePermissionOpen(true);
              }}
              disabled={!voiceEnabled}
              aria-pressed={voice.conversing}
              aria-expanded={voicePermissionOpen}
              aria-controls="hh-ai-voice-onboarding"
              aria-label={voice.conversing?(voice.speaking?
                (locale==="ru"?"Перебить и говорить":locale==="es"?"Interrumpir y hablar":"Interrupt and speak"):
                (locale==="ru"?"Завершить голосовой разговор":locale==="es"?"Terminar conversación":"End voice conversation")):
                (locale==="ru"?"Начать голосовой разговор":locale==="es"?"Iniciar voz":"Start voice conversation")}>
              <Mic size={19} aria-hidden="true"/><span>{locale==="ru"?"Живой разговор":locale==="es"?"Conversación en vivo":"Live voice conversation"}</span>
            </button>}
            {voiceEnabled&&<details className={styles.voiceSettings} data-hh-voice-settings>
              <summary>{locale==="ru"?"Настройки голоса":locale==="es"?"Ajustes de voz":"Voice settings"}</summary>
              {voiceControls}
            </details>}
            <details className={styles.alchemistTools} data-hh-alchemist-tools>
              <summary>{locale==="ru"?"Другие возможности Ali":locale==="es"?"Más posibilidades de Ali":"More ways Ali can help"}</summary>
              <MessengerSixProjects locale={locale} onSelect={startProject}/>
            </details>
            {psychInterview==="off"&&<button type="button" data-hh-ali-psychologist-offer
              onClick={offerPsychologistInterview} disabled={busy||proBusy}>
              {locale==="ru"?"Мягко разобраться в проблеме":locale==="es"?"Explorar mi situación":"Explore my situation gently"}
            </button>}
            {resetControl}
          </div>
        </details>:voiceAttachment}
        {messengerView&&<button type="button"
          className={styles.photoShortcut} data-hh-ai-photo-shortcut
          onClick={()=>{
            const more=document.querySelector<HTMLDetailsElement>("[data-hh-ai-more]");
            if(more)more.open=!more.open;
          }}
          aria-label={locale==="ru"?"Вложения и материалы":locale==="es"?"Adjuntos y materiales":"Attachments and media"}
          title={locale==="ru"?"Открыть вложения":locale==="es"?"Abrir adjuntos":"Open attachments"}>
          <ImageIcon size={21} aria-hidden="true"/>
        </button>}
        
        {!messengerView&&resetControl}
        <button type="submit" disabled={busy||proBusy||homeHandoffPhase==="queued"||
          homeHandoffPhase==="sending"||(!draft.trim()&&!showLandingComposer)||
          ((!showLandingComposer||Boolean(draft.trim()))&&(
            (proSelected&&!proReady)||
            (!proSelected&&mode==="owned"&&!agree&&!(compact&&(testChatOpen||testOfferFromText(draft))))))}
          aria-label={showLandingComposer?(proSelected?
            (locale==="ru"?"Начать с Gemini":locale==="es"?"Hablar con Gemini":"Start Gemini chat"):
            (locale==="ru"?"Начать чат":locale==="es"?"Empezar chat":"Start chat")):
            (messengerView?(busy||proBusy?t.loading:t.send):undefined)}>{messengerView?<><Send size={20} aria-hidden="true"/>
          {showLandingComposer&&<span>{proSelected?
            (locale==="ru"?"Начать с Gemini":locale==="es"?"Hablar con Gemini":"Start Gemini chat"):
            (locale==="ru"?"Начать чат":locale==="es"?"Empezar chat":"Start chat")}</span>}</>:busy?t.loading:t.send}</button>
        {messengerView&&!pageHelp&&<MessengerVoiceNote locale={locale} variant="dictation"
          micMarker="data-hh-conversation-mic" micClassName={styles.recorderToggle}
          accountAuthenticated={authenticated} resetRevision={dictationRevision}
          disabled={busy||proBusy||homeHandoffPhase==="queued"||homeHandoffPhase==="sending"}
          onBegin={()=>{voice.stopDialogue();stopAliPersonaAudio();setVoicePermissionOpen(false);
            setVoiceNoteRevision(value=>value+1);setStatus("");}}
          onSendTranscript={text=>{
            setDraft(previous=>((previous?previous+" ":"")+text).slice(0,contentStep==="brief"?160:2000));
            return true;
          }}/>}
        {busy&&<button type="button" onClick={()=>{voice.stopDialogue();controller.current?.abort();}}
          aria-label={messengerView?t.cancel:undefined}>{messengerView?<X size={19} aria-hidden="true"/>:t.cancel}</button>}
        {proBusy&&<button type="button" onClick={()=>{proAbort.current?.abort();setProBusy(false);}}
          aria-label={messengerView?t.cancel:undefined}><X size={19} aria-hidden="true"/></button>}
      </div>
      {messengerView&&voicePermissionOpen&&!voice.conversing&&<section
        id="hh-ai-voice-onboarding" className={styles.voiceOnboarding}
        data-hh-ai-voice-consent role="group" aria-label={locale==="ru"?"Голосовой разговор":locale==="es"?"Conversación por voz":"Voice conversation"}>
        <strong>{locale==="ru"?"Говорите с Ali":locale==="es"?"Habla con Ali":"Talk with Ali"}</strong>
        <p className={styles.voiceDisclosure} data-hh-ai-voice-disclosure>{
          voiceRequiresRecorded?
            (locale==="ru"?"Нажимая «Начать говорить», вы разрешаете передавать короткие реплики Groq Whisper Free для распознавания. Аудио не сохраняется.":
             locale==="es"?"Al empezar, autorizas enviar frases cortas a Groq Whisper Free para transcribirlas. No guardamos audio.":
             "Start talking allows short audio clips to be sent to Groq Whisper Free for transcription. Audio is not stored.") :
            (locale==="ru"?"Нажимая «Начать говорить», вы разрешаете озвучивание на устройстве и распознавание речи браузером (возможна передача поставщику браузера).":
             locale==="es"?"Al empezar, permites la voz del dispositivo y el reconocimiento del navegador, que puede enviar audio a su proveedor.":
             "Start talking enables device playback and browser speech recognition, which may send audio to your browser provider.")
        }</p>
        {voiceRequiresRecorded&&!voice.recordedSupported&&<small role="status">{
          locale==="ru"?"На этом устройстве недоступна запись. Используйте микрофон клавиатуры или введите текст.":
          locale==="es"?"Grabación no disponible. Usa el micrófono del teclado o escribe.":
          "Recording is unavailable here. Use your keyboard microphone or type."
        }</small>}
        {voice.notice&&<small role="status">{voice.notice}</small>}
        <div className={styles.voiceConsentActions}>
          <button type="button" onClick={()=>setVoicePermissionOpen(false)}>
            {locale==="ru"?"Не сейчас":locale==="es"?"Ahora no":"Not now"}</button>
          <button type="button" data-hh-ai-start-voice
            disabled={!voice.supported||
              (voiceRequiresRecorded&&!voice.recordedSupported)||
              (proSelected&&!proReady)}
            onClick={beginMessengerVoice}>
            <Mic size={17} aria-hidden="true"/>
            {locale==="ru"?"Начать говорить":locale==="es"?"Empezar a hablar":"Start talking"}
          </button>
        </div>
      </section>}
      {messengerView&&(voice.conversing||voice.notice)&&<div className={styles.voiceConversationStatus}
        data-hh-ai-voice-status role="status" aria-live="polite">
        <span>{voice.notice||(
          voice.speaking?(locale==="ru"?"Ali отвечает…":locale==="es"?"Ali responde…":"Ali is speaking…"):
          voice.recording?(locale==="ru"?"Слушаю…":locale==="es"?"Escuchando…":"Listening…"):
          locale==="ru"?"Голосовой разговор включён":locale==="es"?"Conversación activa":"Voice conversation active")}</span>
        {voice.conversing&&<button type="button" data-hh-ai-stop-voice
          onClick={()=>voice.stopDialogue()}>
          {locale==="ru"?"Завершить":locale==="es"?"Terminar":"End"}
        </button>}
      </div>}
      {messengerView&&proSelected&&!proReady&&<div className={styles.geminiConsent} data-hh-ai-gemini-consent role="group"
        aria-label="Gemini consultant">
        <strong>{locale==="ru"?"Pro · консультант Gemini (бесплатный API)":locale==="es"?
          "Pro · consultor Gemini (API gratuito)":"Pro · Gemini consultant (Free API)"}</strong>
        {!authenticated?<p>{locale==="ru"?"Для Gemini нужен вход в аккаунт.":locale==="es"?
          "Inicia sesión para usar Gemini.":"Sign in to use Gemini."}{" "}
          <a href={"/"+locale+"/app/portrait"}>{locale==="ru"?"Войти":locale==="es"?"Entrar":"Sign in"}</a>
        </p>:geminiAvailable===false?<p>{locale==="ru"?"Gemini не настроен или недоступен. Выберите Free.":locale==="es"?
          "Gemini no está disponible. Elige Free.":"Gemini is not available. Select Free."}</p>:
        <><label><input type="checkbox" checked={proConsent} onChange={e=>setProConsent(e.target.checked)}/>
          {locale==="ru"?"Согласен(на) отправлять мои сообщения Gemini.":locale==="es"?
            "Acepto enviar mis mensajes a Gemini.":"I agree to send my messages to Gemini."}</label>
          <label><input type="checkbox" checked={proDataConsent} onChange={e=>setProDataConsent(e.target.checked)}/>
          {locale==="ru"?"Понимаю, что Google может использовать данные Free API для улучшения моделей.":locale==="es"?
            "Entiendo que Google puede usar datos de la API gratuita para mejorar modelos.":
            "I understand Free API content may be used by Google to improve models."}</label>
          {geminiAvailable===null&&<small>{locale==="ru"?"Проверяем доступность Gemini…":locale==="es"?
            "Comprobando Gemini…":"Checking Gemini availability…"}</small>}</>}
      </div>}
    </form>
  );
  return <section className={styles.root} data-hh-agent-preview lang={locale} data-compact={compact||undefined}
    data-video-auth-status={compact?(authenticated?"authenticated":authStatus):undefined}
    data-page-help={pageHelp?"true":undefined} data-has-messages={Boolean(messages.length>0||homeHandoffPreview)||undefined}
    data-chat-skin={messengerView?"messenger":undefined}
    data-hh-immersive-dialogue={compact&&messengerView&&!pageHelp&&!supportQuizOpen&&Boolean(messages.length||homeHandoffPreview)||undefined}
    data-hh-ai-provider={messengerView?(proSelected?"pro":"free"):undefined}>
    {!compact&&<><h1>{t.title}</h1><p>{t.disclosure}</p><p>{t.intro}</p></>}
    {!compact&&settings}
    {!compact&&psychInterview==="off"&&<button type="button"
      data-hh-ali-psychologist-offer onClick={offerPsychologistInterview}>
      {locale==="ru"?"Мягко разобраться в ситуации":locale==="es"?"Explorar mi situación":"Explore my situation gently"}
    </button>}
    {authenticated&&!messengerView&&<HolisticAgentMemoryPanel locale={locale}
      onUse={items=>setUseAgentMemory(items.length>0)}/>}
    {authenticated&&<SecureDialogueHistory history={privateTranscript} locale={locale}/>}
    {!messengerView&&<EmotionalAvatar messages={messages} busy={busy} status={status} locale={locale} compact={compact} companionVoice={voiceEnabled?voice:undefined}/>}
    <div ref={threadRef} className={styles.thread} role="log" aria-live="polite"
      onScroll={event=>{const el=event.currentTarget;
        if(programmaticScrollTop.current!==null){
          const automatic=Math.abs(el.scrollTop-programmaticScrollTop.current)<3;
          programmaticScrollTop.current=null;
          if(automatic)return;
        }
        const atBottom=el.scrollHeight-el.scrollTop-el.clientHeight<64;
        followTail.current=atBottom;
        if(atBottom)setNewBelow(false)}}>
      {compact&&messengerView&&!pageHelp&&!messages.length&&!homeHandoffPreview&&<>
        {supportQuizOpen?<MessengerSupportQuiz locale={locale}
          onCancel={()=>setSupportQuizOpen(false)} onFinish={completeSupportQuiz}/>:
          <>
            <MessengerAiLanding locale={locale} composer={composer} onCreateVideo={()=>startContent()}
              onPractice={()=>startGuided("meditation")} onSupport={openSupportQuiz}
              onAsk={()=>composerRef.current?.focus({preventScroll:true})}
              onTopicSelect={text=>{setDraft(text);window.requestAnimationFrame(()=>composerRef.current?.focus({preventScroll:true}));}}
              onStartAnalysis={()=>{if(draft.trim()){void sendTurn(draft);}else openSupportQuiz();}}
              onJourneySelect={startJourney}/>

          </>}
      </>}
      {compact&&messengerView&&homeHandoffPreview&&messages.length===0&&
        <p className={styles.user} data-hh-chat-turn="user" data-home-handoff-user-preview>
          {homeHandoffPreview}
        </p>}
      {compact&&(!messengerView||pageHelp)&&<p className={styles.assistant} data-hh-ai-welcome>{pageHelp?.greeting??starter.welcome}</p>}
      {!compact&&!messages.length&&<p className={styles.muted}>{t.start}</p>}
      {compact&&messengerView&&supportSelection?.mode==="talk"&&
        <label className={styles.mode} data-hh-friend-tone-control>
          <span>{locale==="ru"?"Друг · тон беседы":locale==="es"?"Amigo · tono":"Friend · conversation tone"}</span>
          <select data-hh-friend-tone value={friendTone}
            onChange={event=>setFriendTone(event.target.value as typeof friendTone)}>
            <option value="friendly">{locale==="ru"?"Дружеский":locale==="es"?"Amistoso":"Friendly"}</option>
            <option value="confiding">{locale==="ru"?"Доверительный":locale==="es"?"De confianza":"Confiding"}</option>
            <option value="tender">{locale==="ru"?"Нежный, романтичный":locale==="es"?"Tierno, romántico":"Tender, romantic"}</option>
          </select>
          <small>{locale==="ru"?"Без давления и откровенных сексуальных сцен. Настройки истории и приватности — в аккаунте.":
            locale==="es"?"Sin presión ni escenas sexuales explícitas. Revisa la privacidad y el historial en tu cuenta.":"No pressure or explicit sexual scenes. Review chat history and privacy in your account."}</small>
        </label>}
      {psychInterview==="pending"&&<div className={styles.projectOptions}
        role="group" data-hh-ali-psychologist-consent
        aria-label={locale==="ru"?"Согласие на предварительную беседу":locale==="es"?"Consentimiento para conversar":"Consent to optional conversation"}>
        <button type="button" onClick={consentPsychologistInterview} data-hh-ali-psychologist-agree>
          {locale==="ru"?"Да, начать":locale==="es"?"Sí, empezar":"Yes, begin"}</button>
        <button type="button" onClick={leavePsychologistInterview} data-hh-ali-psychologist-decline>
          {locale==="ru"?"Не сейчас":locale==="es"?"Ahora no":"Not now"}</button>
      </div>}
      {psychInterview==="active"&&<div className={styles.projectOptions}
        role="group" data-hh-ali-psychologist-active aria-label="Optional preliminary conversation">
        <button type="button" onClick={finishPsychologistInterview} data-hh-ali-psychologist-finish>
          {locale==="ru"?"Закончить и посмотреть резюме":locale==="es"?"Terminar y ver resumen":"Finish and review summary"}</button>
        <button type="button" onClick={leavePsychologistInterview}>
          {locale==="ru"?"Остановить":locale==="es"?"Parar":"Stop"}</button>
      </div>}
      {psychSummaryVisible&&<div className={styles.projectOptions}
        data-hh-ali-psychologist-handoff role="group"
        aria-label={locale==="ru"?"Резюме и следующий шаг":
          locale==="es"?"Resumen y siguiente paso":"Summary and next step"}>
        <button type="button" data-hh-ali-psychologist-copy
          disabled={!psychFinalSummary}
          onClick={()=>{
            if(!psychFinalSummary)return;
            if(typeof navigator==="undefined"||!navigator.clipboard?.writeText){
              setPsychCopyStatus("failed");return;
            }
            void navigator.clipboard.writeText(psychFinalSummary).then(
              ()=>setPsychCopyStatus("copied")).catch(
              ()=>setPsychCopyStatus("failed"));
          }}>
          {locale==="ru"?"Скопировать моё резюме":locale==="es"?
            "Copiar mi resumen":"Copy my summary"}
        </button>
        <a data-hh-ali-psychologist-private-handoff
          className={styles.testLink} href={"/"+locale+"/services/free-situation-review"}>
          {locale==="ru"?"Перейти к отдельной защищённой заявке":
            locale==="es"?"Abrir solicitud privada por separado":
              "Open separate protected request"}
        </a>
        <p>{locale==="ru"?"Резюме не отправлено мастеру. По желанию скопируйте его и вставьте только в защищённую заявку.":
          locale==="es"?"El resumen no se ha enviado. Si quieres, cópialo y pégalo solo en la solicitud privada.":
            "Your summary has not been sent. You may copy and paste it into the protected request if you choose."}</p>
        {psychCopyStatus!=="idle"&&<p role="status" aria-live="polite">
          {psychCopyStatus==="copied"?
            (locale==="ru"?"Резюме скопировано.":locale==="es"?"Resumen copiado.":"Summary copied."):
            (locale==="ru"?"Не удалось скопировать автоматически. Вы можете выделить текст резюме в чате.":
              locale==="es"?"No se pudo copiar automáticamente. Selecciona el texto del resumen en el chat.":
                "Automatic copying failed. You can select the summary text directly in the chat.")}
        </p>}
      </div>}
      {compact&&messengerView&&journeyPath&&messages.length>0&&
        <div data-hh-chat-journey-tabs role="group"
          aria-label={locale==="ru"?"Режим разговора":locale==="es"?"Modo de conversación":"Conversation path"}
          style={{display:"flex",gap:6,flexWrap:"wrap",padding:"4px 0"}}>
          {(["therapy","consultation","goal"] as const).map(path=>
            <button type="button" key={path} data-hh-chat-journey-path={path}
              aria-pressed={journeyPath===path} disabled={busy||proBusy||journeyPath===path}
              onClick={()=>startJourney(path)}
              style={{borderRadius:16,padding:"5px 10px",fontSize:12,
                border:"1px solid #b8cbbf",
                background:journeyPath===path?"#e1eee5":"#fffdf8",
                color:"#16483b",fontWeight:journeyPath===path?700:500}}>
              {threeJourneyLabel(path,locale)}
            </button>)}
        </div>}
      {messages.map((m,index)=>messengerView&&m.role==="assistant"?
        <div key={index} className={styles.messageWithAvatar} data-hh-ai-assistant-message>
          <img src={persona.image||"/images/holistic-house/reiki-approved-sunrise-v3.webp"}
            width={37} height={37} loading="lazy" alt="" className={styles.messagePortrait}/>
          {renderWaveGoalMenu(m.text,index)??<p className={styles.assistant}>{m.variant==="alternative"&&<strong className={styles.alternativeLabel}>{locale==="ru"?"Альтернативный ответ · AI на устройстве":locale==="es"?"Respuesta alternativa · IA en el dispositivo":"Alternative answer · On-device AI"}{"\n"}</strong>}{m.text}</p>}
          {voiceEnabled&&<button type="button" data-hh-voice-turn={index}
            aria-label={voice.t.play} title={voice.t.playConsent}
            disabled={!voice.supported}
            onClick={()=>{stopAliPersonaAudio();voice.speak(m.text,true);}}
            style={{minWidth:32,minHeight:32,marginInlineStart:6,border:"1px solid #E9DFD1",borderRadius:10,background:"#FFFCF7",color:"#143D3A"}}>🔊</button>}
        </div>:
        m.role==="assistant"&&(readWaveEntryMenu(m.text)||readWaveGoalMenu(m.text))?
        <div key={index} data-hh-chat-turn="assistant">{renderWaveGoalMenu(m.text,index)}</div>:
        <p key={index} data-hh-chat-turn={m.role} className={m.role==="user"?styles.user:styles.assistant}>
          {m.variant==="alternative"&&<strong className={styles.alternativeLabel}>{locale==="ru"?"Альтернативный ответ · AI на устройстве":locale==="es"?"Respuesta alternativa · IA en el dispositivo":"Alternative answer · On-device AI"}{"\n"}</strong>}{m.text}{voiceEnabled&&<button type="button" data-hh-voice-turn={index}
            aria-label={voice.t.play} title={voice.t.playConsent}
            disabled={!voice.supported}
            onClick={()=>{stopAliPersonaAudio();voice.speak(m.text,true);}}
            style={{minWidth:32,minHeight:32,marginInlineStart:6,border:"1px solid #E9DFD1",borderRadius:10,background:"#FFFCF7",color:"#143D3A"}}>🔊</button>}</p>)}
      {lastAnswerRef.current&&messages[messages.length-1]?.role==="assistant"&&<div className={styles.answerActions} data-hh-alternative-actions>
        <strong>{locale==="ru"?"Ответ не подошёл?":locale==="es"?"¿No te convence la respuesta?":"Not quite the answer you wanted?"}</strong>
        <button type="button" disabled={alternativeBusy||busy} onClick={()=>void requestAlternativeAnswer("different")}>
          {locale==="ru"?"Другой вариант":locale==="es"?"Otra respuesta":"Another answer"}</button>
        <button type="button" disabled={alternativeBusy||busy} onClick={()=>void requestAlternativeAnswer("simple")}>
          {locale==="ru"?"Объяснить проще":locale==="es"?"Explicar más simple":"Explain simply"}</button>
        <button type="button" disabled={alternativeBusy||busy} onClick={()=>void requestAlternativeAnswer("deep")}>
          {locale==="ru"?"Подробнее":locale==="es"?"Más detalle":"More detail"}</button>
        <small>{locale==="ru"?"Только локальная бесплатная модель браузера, если она доступна. Диалог не отправляется новому провайдеру.":locale==="es"?"Solo el modelo local gratuito del navegador, si está disponible. No se envía el diálogo a otro proveedor.":"Uses only the browser's free on-device model when available. Your conversation is not sent to another provider."}</small>
      </div>}
      {alternativeBusy&&<p role="status" className={styles.muted}>{locale==="ru"?"Готовлю альтернативный ответ на устройстве…":locale==="es"?"Preparando otra respuesta en el dispositivo…":"Preparing an alternative on your device…"}</p>}
      {alternativeError&&<p role="status" className={styles.muted}>{alternativeError}</p>}
      {compact&&messengerView&&projectFlow==="sessions"&&sessionStep==="goal"&&
        <div className={styles.projectOptions} role="group" data-hh-session-goal-options
          aria-label={messengerProject(locale,"sessions").question}>
          {sessionGoalChoices(locale).map((option:{id:string;label:string;description:string})=><button type="button"
            key={option.id} disabled={busy} data-hh-session-goal-choice={option.id}
            onClick={()=>selectSessionGoal(option)}><strong>{option.label}</strong>
            <small>{option.description}</small></button>)}
        </div>}
      {compact&&messengerView&&projectFlow&&projectFlow!=="sessions"&&<div className={styles.projectOptions}
        role="group" data-hh-project-step={projectFlow}
        aria-label={messengerProject(locale,projectFlow).question}>
        {messengerProject(locale,projectFlow).options.slice(0,4).map(option=><button type="button"
          key={option.id} disabled={busy} data-hh-project-choice={option.id}
          onClick={()=>selectProjectOption(option)}><strong>{option.label}</strong><small>{option.description}</small></button>)}
      </div>}
      {compact&&messengerView&&sessionOffers.length>0&&
        <div className={styles.projectOptions} role="group" data-hh-session-offers
          aria-label={sessionCopy(locale).offersLabel}>
          {sessionOffers.map(option=><a key={option.id} data-hh-session-offer={option.id}
            href={"/"+locale+option.href}><strong>{option.label}</strong>
            <small>{sessionOfferDescription(locale,option.id)}</small></a>)}
        </div>}
      {compact&&pageHelpLink&&<a className={styles.testLink} data-hh-ihelp-link href={pageHelpLink.href}>{pageHelpLink.label} · {t.option}</a>}
      {compact&&messengerView&&journeyPath&&journeyAction&&
        <div data-hh-chat-journey-resources
          style={{display:"flex",gap:8,flexWrap:"wrap",padding:"4px 0"}}>
          {(journeyAction==="practices"?[
            {href:"/practice",ru:"Практики",en:"Practices",es:"Prácticas"},
            {href:"/meditations",ru:"Медитации",en:"Meditations",es:"Meditaciones"}
          ]:journeyAction==="tests"?[
            {href:"/tests",ru:"Библиотека тестов",en:"Test library",es:"Biblioteca de pruebas"}
          ]:journeyAction==="diagnostic"?[
            {href:"/holistic-support",ru:"Разбор ситуации",en:"Situation review",es:"Revisión de situación"}
          ]:journeyAction==="coaches"?[
            {href:"/my-coach",ru:"ИИ-коучи",en:"AI coaches",es:"Coaches de IA"},
            {href:"/coaching/sessions",ru:"Встречи",en:"Sessions",es:"Sesiones"}
          ]:journeyAction==="program"?[
            {href:"/my-coach",ru:"ИИ-коуч",en:"AI coach",es:"Coach de IA"},
            {href:"/coaching/sessions",ru:"Коучинговые встречи",en:"Coaching sessions",es:"Sesiones de coaching"}
          ]:[]).map(link=><a key={link.href} className={styles.testLink}
            data-hh-journey-resource={link.href} href={"/"+locale+link.href}>
            {link[locale]}</a>)}
        </div>}
      {compact&&guideLink==="tests"&&<a className={styles.testLink} data-hh-ai-tests-link
        href={"/"+locale+"/tests"}>{starter.testsLink}</a>}
      {compact&&testChatOpen&&<MessengerTestJourney key={testFocus||"all"} locale={locale} focus={testFocus}
        incomingTurn={testChatTurn} suggestedKey={testSuggestedKey}
        onAdvance={()=>setTestRevision(value=>value+1)} onClose={()=>{
          setTestChatOpen(false);setTestChatTurn(null);setTestSuggestedKey("");setTestFocus(null);setGuideLink(null);
        }}/>}
      {compact&&entryOpen&&pageHelp&&<div className={styles.startActions} role="group"
        aria-label={starter.actions} data-hh-ihelp-actions>
        {pageHelp.actions.map(action=><button type="button" key={action.id}
          data-hh-ihelp-option={action.id} disabled={busy}
          onClick={()=>selectPageHelpAction(action)}>{action.label}</button>)}
        <button type="button" data-hh-ihelp-ask onClick={()=>{
          setEntryOpen(false);composerRef.current?.focus({preventScroll:true});
        }}>{locale==="ru"?"Задать другой вопрос":locale==="es"?"Hacer otra pregunta":"Ask another question"}</button>
      </div>}
      {compact&&entryOpen&&!pageHelp&&!messengerView&&<div className={styles.startActions} role="group" aria-label={starter.actions}>
        <button type="button" data-hh-ai-start="video" disabled={busy} onClick={()=>startContent(locale)}>
          <span className={styles.startIcon} aria-hidden="true">🎬</span>
          <strong>{starter.video}</strong><small>{starter.videoSub}</small>
        </button>
        <button type="button" data-hh-ai-start="meditation" disabled={busy} onClick={()=>startGuided("meditation")}>
          <span className={styles.startIcon} aria-hidden="true">🪷</span>
          <strong>{starter.meditation}</strong><small>{starter.meditationSub}</small>
        </button>
        <button type="button" data-hh-ai-start="hint" disabled={busy} onClick={()=>startGuided("hint")}>
          <span className={styles.startIcon} aria-hidden="true">✨</span>
          <strong>{starter.hint}</strong><small>{starter.hintSub}</small>
        </button>
        <a data-hh-ai-start="master" href={"/"+locale+"/services/free-situation-review"}>
          <span className={styles.startIcon} aria-hidden="true">🤝</span>
          <strong>{starter.master}</strong><small>{starter.masterSub}</small>
        </a>
      </div>}
      {compact&&contentStep&&<div className={styles.videoInline} data-hh-content-step={contentStep}>
        {contentStep==="kind"?<div className={styles.videoOptions} role="group" aria-label={starter.contentQuestion}>
          {(["video","audio","meditation","message"] as const).map(kind=>
            <button type="button" key={kind} disabled={busy} data-hh-content-kind={kind}
              onClick={()=>chooseContentKind(kind)}>{starter.contentKinds[kind]}</button>)}
        </div>:contentStep==="source"?<div className={styles.videoOptions} role="group"
          aria-label={starter.contentSourceQuestion}>
          {(["text","voice"] as const).map(source=>
            <button type="button" key={source} disabled={busy} data-hh-content-source={source}
              onClick={()=>chooseContentSource(source)}>{starter.contentSources[source]}</button>)}
        </div>:null}
      </div>}
      {compact&&contentVoice&&<MessengerAudioVideo locale={locale}
        initialGoal={contentBrief} disabled={busy} autoOpen/>}
      {compact&&guidedTrack==="meditation"&&messages.length>0&&
        <div className={styles.publicVideoActions} data-hh-public-video-choices>
          <div className={styles.topicChoices} role="group" aria-label={starter.chooseTheme}>
            {(["stress","relationships","energy","meaning"] as const).map(goal=>
              <button type="button" key={goal} aria-pressed={videoGoal===goal}
                onClick={()=>{setVideoGoal(goal);setShowVideoSignIn(false);}}>
                {starter.themes[goal]}
              </button>)}
          </div>
          <a className={styles.readyVideoLink} data-hh-guest-ready-videos
            href={"/"+locale+"/mytube?goal="+videoGoal}>{starter.readyVideos}</a>
          {authenticated?
            <a className={styles.personalVideoButton} data-hh-video-open-studio
              href={"/"+locale+"/holistic-support/mandala"}>{starter.requestVideo}</a>:
            authStatus==="checking"?<p role="status" data-hh-video-auth-check>{starter.checkingSignIn}</p>:
            authStatus==="unavailable"?<button type="button" data-hh-video-auth-retry
              onClick={()=>onAuthRetry?.()} disabled={!onAuthRetry}>{starter.retrySignIn}</button>:
            showVideoSignIn?null:<button className={styles.personalVideoButton} data-hh-personal-video-request
              type="button" onClick={()=>setShowVideoSignIn(true)}>{starter.requestVideo}</button>}
          {showVideoSignIn&&!authenticated&&authStatus==="guest"&&<div className={styles.videoAuth} data-hh-video-sign-in>
            <p>{starter.videoAuth}</p>
            <MessengerSignIn locale={locale} continueTo="video-studio"/>
          </div>}
        </div>}
      {compact&&videoStep&&<div className={styles.videoInline} data-hh-video-chat-step={videoStep}>
        {videoStep==="phrase"&&<div className={styles.videoPhraseFilters} data-hh-video-phrase-filters>
          {(["tone","speaker","length"] as const).map(key=><fieldset key={key}>
            <legend>{videoCopy[key]}</legend>
            <div>{(key==="tone"?["gentle","confident","grounded","inspiring"]:
              key==="speaker"?["self","support"]:["short","extended"]).map((value,index)=>{
              const label=(key==="tone"?videoCopy.tones:key==="speaker"?videoCopy.speakers:videoCopy.lengths)[index];
              return <button type="button" key={value} disabled={busy}
                aria-pressed={videoDraft[key]===value} data-hh-video-phrase-style={key+"-"+value}
                onClick={()=>updateVideoPhraseStyle(key,value,label)}>{label}</button>;
            })}</div>
          </fieldset>)}
        </div>}
        {videoChoices.length>0&&<div className={styles.videoOptions} role="group"
          aria-label={messengerVideoQuestion(videoStep,locale)} data-hh-video-chat-options>
          {videoChoices.map(item=><button type="button" key={item.id} disabled={busy}
             aria-pressed={videoStep==="category"?videoPendingCategory===item.id:undefined}
             data-hh-video-chat-choice={item.id} onClick={()=>{
               if(videoStep==="category"){
                 followTail.current=true;setNewBelow(false);setVideoPendingCategory(item.id);
               }else answerVideo(item.id,item.label);
             }}>{item.label}</button>)}
        </div>}
        {videoStep==="category"&&<button type="button" className={styles.videoStudioLink}
           data-hh-personal-video-request disabled={busy||!videoPendingCategory}
           onClick={()=>{
             const selected=videoChoices.find(item=>item.id===videoPendingCategory);
             if(selected)answerVideo(selected.id,selected.label);
           }}>{starter.requestVideo}</button>}
        {videoStep==="review"?<div className={styles.videoReview} data-hh-video-chat-review>
          {videoDraft.mytubeTopicId&&<p data-hh-video-canonical-topic>{
            messengerVideoChoices(videoDraft,"mytube-topic",locale)
              .find(item=>item.id===videoDraft.mytubeTopicId)?.label
          }</p>}
          <p>{videoDraft.duration} s · {videoDraft.aspect==="portrait"?"9:16":videoDraft.aspect==="square"?"1:1":"16:9"} · {videoCopy.editNames.music}: {videoDraft.music==="none"?videoCopy.musicNames[3]:videoDraft.music}</p>
          <details className={styles.videoEditDetails} data-hh-video-edit-details>
            <summary>{videoCopy.edit}</summary>
            <div className={styles.videoEditOptions} role="group" aria-label={videoCopy.edit}>
            {(["category","subcategory","mytube-topic","topic","scenario","idea","phrase","mood","aspect","duration","music","phrases"] as const).map(step=><button
              type="button" key={step} disabled={busy} data-hh-video-edit-step={step}
              onClick={()=>openVideoEdit(step,step in videoCopy.editNames?
                videoCopy.editNames[step as keyof typeof videoCopy.editNames]:messengerVideoQuestion(step,locale))}>
              {step in videoCopy.editNames?videoCopy.editNames[step as keyof typeof videoCopy.editNames]:videoCopy[step]}</button>)}
            </div>
          </details>
          {authenticated?<a className={styles.videoStudioLink} data-hh-video-open-studio
            href={"/"+locale+"/holistic-support/mandala#video-director-chat"}
            onClick={event=>{if(!stageVideoHandoff())event.preventDefault();}}>
            {videoCopy.toStudio}</a>:
            authStatus==="checking"?<p role="status" data-hh-video-auth-check>{starter.checkingSignIn}</p>:
            authStatus==="unavailable"?<button type="button" className={styles.videoStudioLink}
              data-hh-video-auth-retry onClick={()=>onAuthRetry?.()} disabled={!onAuthRetry}>
              {starter.retrySignIn}</button>:
            showVideoSignIn?null:<button type="button" className={styles.videoStudioLink} data-hh-personal-video-request
              onClick={()=>{if(stageVideoHandoff())setShowVideoSignIn(true);}}>
              {videoCopy.toStudio}</button>}
          {showVideoSignIn&&!authenticated&&authStatus==="guest"&&<div className={styles.videoAuth} data-hh-video-sign-in>
            <p>{starter.videoAuth}</p>
            <MessengerSignIn locale={locale} continueTo="video-studio"/>
          </div>}
        </div>:<div className={styles.videoCommands} role="group" aria-label={videoCopy.edit}>
          {videoStep!=="category"&&<button type="button" disabled={busy} data-hh-video-chat-back
            onClick={()=>answerVideo("назад",videoCopy.back)}>{videoCopy.back}</button>}
          {videoStep==="phrase"&&<button type="button" disabled={busy} data-hh-video-chat-skip
            onClick={()=>answerVideo("пропусти",videoCopy.noPhrases)}>{videoCopy.noPhrases}</button>}
          {videoStep!=="category"&&<button type="button" disabled={busy} data-hh-video-chat-auto
            onClick={()=>answerVideo("выбери сам",videoCopy.auto)}>{videoCopy.auto}</button>}
        </div>}
      </div>}
    {judgmentView!==null&&judgmentView.choices.length>0&&<div className={styles.judgmentChoices}
      role="group" aria-label={locale==="ru"?"Варианты ответа":
        locale==="es"?"Opciones de respuesta":"Reply options"} data-hh-judgment-choices>
      {judgmentView?.choices.slice(0,2).map(choice=><button type="button"
        key={choice.id} data-hh-judgment-choice={choice.id} disabled={busy}
        onClick={()=>void sendTurn(choice.label,choice.id)}>{choice.label}</button>)}
      <button type="button" data-hh-judgment-skip disabled={busy}
        onClick={()=>void sendTurn(locale==="ru"?"Не сейчас":locale==="es"?"No quiero consejos":"Not now")}>
        {locale==="ru"?"Другое / Пропустить":locale==="es"?"Otro / Omitir":"Other / Skip"}
      </button>
    </div>}
    {source&&<p className={messengerView?styles.sourceBadge:styles.muted}>{t.source}: {source}</p>}
    {process.env.NEXT_PUBLIC_HH_LEARNING_OBSERVATORY_ENABLED==="true"&&messages[messages.length-1]?.role==="assistant"&&
      <div className={styles.hiLearningRating} role="group" aria-label={
        locale==="ru"?"Добровольная анонимная оценка ответа":
        locale==="es"?"Valoración anónima y voluntaria":"Voluntary anonymous answer rating"}>
        <span>{locale==="ru"?"Оценить без передачи текста":
          locale==="es"?"Valorar sin enviar mensajes":"Rate without sending messages"}</span>
        {ratedLearningReply===messages[messages.length-1].text?<small>{
          locale==="ru"?"Спасибо, оценка сохранена":locale==="es"?"Gracias, valoración guardada":"Thanks, rating saved"
        }</small>:<>
          <button type="button" disabled={qualityPending} onClick={()=>void rateLearningReply("helpful")}>👍 {locale==="ru"?"Полезно":locale==="es"?"Útil":"Helpful"}</button>
          <button type="button" disabled={qualityPending} onClick={()=>void rateLearningReply("unhelpful")}>👎 {locale==="ru"?"Не помогло":locale==="es"?"No ayudó":"Not helpful"}</button>
        </>}
        {qualityFailure&&<small role="status">{
          locale==="ru"?"Оценка не сохранена":locale==="es"?"No se guardó la valoración":"Rating not saved"
        }</small>}
      </div>}
    {evidenceUsed&&<p className={styles.muted} role="status">{t.evidenceUsed}</p>}
    {historyUsed&&<p className={styles.muted} role="status">{t.historyUsed}</p>}
    {availableSuggestions.length>0&&
      <div className={styles.choices} data-hh-verified-options><h2>{t.suggestions}</h2>
        <div className={styles.offerList}>{availableSuggestions.slice(0,3).map(renderRecommendation)}</div>
        {availableSuggestions.length>3&&<details className={styles.moreRecommendations}>
          <summary>{locale==="ru"?"Другие варианты":locale==="es"?"Más opciones":"More options"} ({availableSuggestions.length-3})</summary>
          <div className={styles.offerList}>{availableSuggestions.slice(3).map(renderRecommendation)}</div>
        </details>}
        {messengerView?<details className={styles.choicesInfo}>
          <summary>{locale==="ru"?"Об этих рекомендациях":locale==="es"?"Sobre estas opciones":"About these options"}</summary>
          <small>{t.localFeedback}</small>
        </details>:<small className={styles.muted}>{t.localFeedback}</small>}
      </div>}
    {status&&<p role="alert" className={styles.assistant}>{status}</p>}
    {compact&&messengerView&&(homeHandoffPhase==="queued"||homeHandoffPhase==="sending")&&
      <p className={styles.muted} role="status" data-home-handoff-pending>
        {locale==="ru"?"Ваш запрос принят. Ali готовит ответ…":
         locale==="es"?"Tu mensaje está listo. Ali prepara una respuesta…":
         "Your message is ready. Ali is preparing a reply…"}
      </p>}
    {compact&&messengerView&&homeHandoffPhase==="retry"&&
      <div className={styles.assistant} role="alert" data-home-handoff-retry>
        <span>{locale==="ru"?"Можем продолжить разговор. Для подтверждения исходного запроса потребуется повторная отправка.":
          locale==="es"?"Podemos seguir hablando. Para confirmar la solicitud original, tendrás que reenviarla.":
          "We can keep talking. The original request still needs to be resent for confirmation."}</span>{" "}
        <button type="button" onClick={retryHomeAliTurn}>
          {locale==="ru"?"Повторить отправку":locale==="es"?"Reintentar envío":"Retry sending"}
        </button>
      </div>}
    {compact&&needsPrivateSignIn&&<MessengerSignIn locale={locale}/>}
    </div>
    {newBelow&&<button type="button" className={styles.jumpToLatest} onClick={()=>{
      followTail.current=true;
      if(threadRef.current)threadRef.current.scrollTop=threadRef.current.scrollHeight;
      setNewBelow(false);
    }}>{locale==="ru"?"↓ Новые сообщения":locale==="es"?"↓ Mensajes nuevos":"↓ New messages"}</button>}
    {compact&&voiceFile&&<section className={styles.videoReview}
      data-hh-voice-to-video aria-label={locale==="ru"?"Аудио в видео":locale==="es"?"Audio a vídeo":"Voice to video"}>
      <strong>{locale==="ru"?"🎙 Аудиосообщение → видеоряд":
        locale==="es"?"🎙 Audio → vídeo":"🎙 Voice message → video"}</strong>
      <p>{voiceFile.name} · {(voiceFile.size/1024/1024).toFixed(2)} MB</p>
      <label className={styles.consent}>
        <input type="checkbox" checked={voiceConsent} disabled={voiceBusy}
          onChange={event=>setVoiceConsent(event.currentTarget.checked)}
          data-hh-voice-stt-consent/>
        {locale==="ru"?"Разрешаю один раз передать запись внешнему распознавателю. Наш сервер не сохраняет аудио.":
          locale==="es"?"Autorizo el reconocimiento externo una vez. Nuestro servidor no guarda el audio.":
            "I allow one-time external transcription. Our server does not store the audio."}
      </label>
      <button type="button" data-hh-voice-transcribe
        disabled={!voiceConsent||voiceBusy||busy}
        onClick={()=>void transcribeChatAudio()}>
        {voiceBusy?(locale==="ru"?"Расшифровываю…":locale==="es"?"Transcribiendo…":"Transcribing…"):
          (locale==="ru"?"Расшифровать аудиосообщение":
            locale==="es"?"Transcribir audio":"Transcribe voice message")}
      </button>
      {voiceError&&<p role="alert">{voiceError}</p>}
      {voiceTranscript&&<div data-hh-voice-timed-result>
        <p>{locale==="ru"?"Смысловых отрезков":locale==="es"?"Fragmentos":"Timed segments"}:
          {" "}{voiceTranscript.segments.length} · {voiceTranscript.durationSeconds.toFixed(1)} s</p>
        <details><summary>{locale==="ru"?"Просмотреть текст и таймкоды":
          locale==="es"?"Ver texto y tiempos":"Review text and timecodes"}</summary>
          <ol>{voiceTranscript.segments.map((segment,index)=>
            <li key={index}><small>{segment.startSeconds.toFixed(1)}–
              {segment.endSeconds.toFixed(1)} s</small>{" "}{segment.text}</li>)}</ol>
        </details>
        {voiceHandoffReady&&<a className={styles.videoStudioLink}
          data-hh-voice-open-studio href={"/"+locale+"/holistic-support/mandala#video-audio"}>
          {locale==="ru"?"Открыть студию с записью и расшифровкой":
            locale==="es"?"Abrir estudio con audio y transcripción":
              "Open Studio with audio and transcript"}
        </a>}
      </div>}
    </section>}
    {compact&&!messengerView&&voiceEnabled&&<details className={styles.compactSettings} data-hh-voice-settings>
      <summary>{locale==="ru"?"Настройки голоса":locale==="es"?"Ajustes de voz":"Voice settings"}</summary>
      {voiceControls}
    </details>}
    {compact&&messengerView&&supportSelection&&!supportQuizOpen&&
      <div className={styles.supportContext} data-hh-support-context>
        <span>{supportSelection.categoryLabel} · {supportSelection.needLabel}</span>
        <button type="button" onClick={()=>{resetConversation();setSupportQuizOpen(true);}}>
          {locale==="ru"?"Изменить":locale==="es"?"Cambiar":"Change"}
        </button>
      </div>}
    {!supportQuizOpen&&!showLandingComposer&&composer}
    {compact&&!contentVoice&&(!messengerView||recorderOpen)&&<MessengerAudioVideo locale={locale}
      initialGoal={videoDraft.goal||""} disabled={busy} autoOpen={messengerView&&recorderOpen}/>}
    {!compact&&<details className={styles.programPanel} data-hh-eight-session-preview>
      <summary>{t.programTitle}</summary>
      <p className={styles.muted}>{t.programInfo}</p>
      <form onSubmit={createOutline} className={styles.form}>
        <label className={styles.mode}>{t.programFocus}
          <select value={previewFocus} onChange={e=>{
            setPreviewFocus(e.target.value as PreviewFocus);
            setOutline(null);
          }}>
            <option value="">{t.programFocus}</option>
            {(["stress","relationships","self_worth","meaning"] as const).map(item=>
              <option key={item} value={item}>{t.programFocusItems[item]}</option>)}
          </select>
        </label>
        <label className={styles.mode}>{t.programTime}
          <select value={previewMinutes}
            onChange={e=>setPreviewMinutes(Number(e.target.value) as typeof previewMinutes)}>
            {[8,12,20].map(n=><option key={n} value={n}>{n} min</option>)}
          </select>
        </label>
        <label className={styles.consent}>
          <input type="checkbox" checked={previewImagery}
            onChange={e=>setPreviewImagery(e.target.checked)}/>{t.programImagery}
        </label>
        <label className={styles.consent}>
          <input type="checkbox" checked={previewReady}
            onChange={e=>setPreviewReady(e.target.checked)}/>{t.programSafety}
        </label>
        <button type="submit" disabled={!previewFocus||!previewReady||outlineBusy}>
          {outlineBusy?t.loading:t.programStart}
        </button>
      </form>
      {outlineError&&<p role="status">{outlineError}</p>}
      {outline&&<section aria-label={t.programTitle} className={styles.outline}>
        <h2>{outline.title}</h2>
        <p className={styles.muted} role="status">{t.programReady}</p>
        <ol>{outline.lessons.map(item=><li key={item.number}>
          <strong>{t.programStep} {item.number}. {item.title}</strong>
          {item.steps.length>0&&<ul>{item.steps.map((step,i)=><li key={i}>{step}</li>)}</ul>}
          <small>{t.programNoMedia}</small>
        </li>)}</ol>
      </section>}
    </details>}
  </section>;
}
