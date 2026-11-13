"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import {Mic, Paperclip, Plus, Send, X} from "lucide-react";
import {MessengerAiLanding} from "@/components/app/messenger-ai-landing";
import {MessengerSixProjects,messengerProject} from "@/components/app/messenger-six-projects";
import {sessionGoalChoices,sessionCopy,sessionGoalForText,sessionOfferIds,sessionOfferDescription} from "@/lib/holistic-support/session-goal-intake.mjs";
import type {MessengerProjectId,MessengerProjectOption,MessengerTestFocus} from "@/components/app/messenger-six-projects";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { AXIS_REFS } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import { ruleConversationReply } from "@/lib/holistic-support/rule-conversation.mjs";
import { detectConversationLocale } from "@/lib/holistic-support/conversation-locale.mjs";
import { planJudgmentTurn } from "@/lib/holistic-support/judgment-mind.mjs";
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
type PublicVideoGoal = "all" | "stress" | "energy" | "relationships" | "work" | "meaning" | "practices";
type GuidedTrack = "video" | "meditation" | "hint" | null;
type PreviewFocus = "" | "stress" | "relationships" | "self_worth" | "meaning";
type Outline = {status:"draft_ready";title:string;lessons:Array<{number:number;title:string;steps:string[];videoReady:false}>;published:false;mediaReady:false};
type Message = { role: "user" | "assistant"; text: string; variant?:"alternative" };
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
  browserModelAllowed:boolean; usedSavedTestEvidence?:boolean; usedSavedVideoHistory?:boolean };

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
  ru:{ title:"Разговор с AI-проводником",disclosure:"Я — AI-проводник Holistic House, не человек и не психотерапевт.",
    intro:"Опишите запрос свободно. По вашему согласию можно учесть проверенные результаты выбранной темы без передачи баллов нейросети.",
    placeholder:"Что сейчас для вас важно?",send:"Отправить",cancel:"Остановить",mode:"Способ ответа",
    rules:"Без нейросети",device:"AI на устройстве (может потребоваться загрузка модели)",owned:"AI на нашем сервере (с согласия)",
    consent:"Разрешаю передать моё сообщение и последние реплики этого диалога на собственный защищённый AI-сервер Holistic House.",
    loading:"Формирую ответ…",error:"Не удалось получить ответ. Попробуйте повторить запрос.",signIn:"Личный режим требует защищённого входа. Нажмите кнопку ниже.",modeError:"Этот режим пока недоступен. Выберите «Без нейросети» в настройках чата.",
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
  en:{ title:"Chat with the AI guide",disclosure:"I am Holistic House's AI guide, not a human or a therapist.",
    intro:"Describe your question. With your permission, verified results for your selected topic can inform suggestions without sharing scores with a model.",
    placeholder:"What's on your mind?",send:"Send",cancel:"Stop",mode:"Response mode",
    rules:"Without a language model",device:"On-device AI (may download a model)",owned:"Our AI server (with consent)",
    consent:"I agree to send this message and recent conversation turns to Holistic House's secured, self-hosted AI server.",
    loading:"Preparing a reply…",error:"Could not get a reply. Please try again.",signIn:"This private mode requires sign-in. Use the Google button below.",modeError:"This response mode is unavailable. Select Without a language model in chat settings.",
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
  es:{ title:"Habla con el asistente de IA",disclosure:"Soy el asistente de IA de Holistic House, no una persona ni terapeuta.",
    intro:"Describe tu pregunta. Con tu permiso se pueden considerar resultados del eje elegido sin enviar puntuaciones al modelo.",
    placeholder:"¿Qué te preocupa ahora?",send:"Enviar",cancel:"Detener",mode:"Tipo de respuesta",
    rules:"Sin modelo de IA",device:"IA en el dispositivo (puede descargar un modelo)",owned:"Nuestro servidor de IA (con permiso)",
    consent:"Acepto enviar este mensaje y los últimos turnos de la conversación al servidor privado de IA de Holistic House.",
    loading:"Preparando una respuesta…",error:"No se pudo obtener respuesta. Vuelve a intentarlo.",signIn:"Este modo privado requiere acceso. Usa el botón de Google abajo.",modeError:"Este modo no está disponible. Selecciona Sin modelo de IA en los ajustes del chat.",
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
  hello:"¡Aquí estoy! Podemos crear un vídeo, elegir una práctica, hacer un test o solicitar una revisión personal. ¿Qué necesitas ahora?",

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
  const voiceEnabled=process.env.NEXT_PUBLIC_HH_VOICE_COMPANION_WEB==="true";
  // No browser speech, device voice discovery or local preferences when OFF.
  const voice=useVoiceCompanion(locale,voiceEnabled);
  const [mode,setMode]=useState<Mode>("rules");
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
  const [guideLink,setGuideLink]=useState<"tests"|null>(null);
  const [testChatOpen,setTestChatOpen]=useState(false);
  const [projectFlow,setProjectFlow]=useState<MessengerProjectId|null>(null);
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
  const composerRef=useRef<HTMLTextAreaElement|null>(null);
  const threadRef=useRef<HTMLDivElement|null>(null);
  const followTail=useRef(true);
  const programmaticScrollTop=useRef<number|null>(null);
  const composerFocused=useRef(false);
  const [newBelow,setNewBelow]=useState(false);
  const privateTranscript=usePrivateChatHistory({authenticated,onRestore:entries=>{
    // Explicit restore cancels both pending AI and device speech, and must not
    // auto-read historical replies when the Voice Companion is on.
    controller.current?.abort();voiceAbortRef.current?.abort();voice.stopDialogue();
    const previous:Message[]=entries.flatMap(item=>[
      {role:"user" as const,text:item.user},
      {role:"assistant" as const,text:item.assistant},
    ]).slice(-30);
    lastSpeechTurn.current=previous[previous.length-1]||null;
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
  },[compact,messengerView]);
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
    const reviewed=ruleConversationReply({message:text,locale:language,history:prior});
    const goal=publicVideoGoalForMessage(text);
    if(goal)setVideoGoal(goal as PublicVideoGoal);
    if(!reviewed||!reviewed.id){setGuidedTrack(null);return messengerStarter[language].safety;}
    if(reviewed.id.startsWith("video")){
      setGuidedTrack("video");setVideoStep("category");videoUndo.current=null;
      setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);
      setVideoPendingCategory(null);
      return messengerVideoQuestion("category",language);
    }
    else if(reviewed.id.startsWith("meditation"))setGuidedTrack("meditation");
    return reviewed.reply;
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
  // One clear question per project; choices describe the next step.
  function startProject(id:MessengerProjectId) {
    if(busy)return;
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
  function startContent(language:PublicLocale=locale) {
    if(busy)return;
    followTail.current=true;setNewBelow(false);setEntryOpen(false);
    setProjectFlow(null);setSessionStep(null);setSessionGoal(null);setSessionOffers([]);setTestFocus(null);
    setContentStep("kind");setContentBrief("");setContentVoice(false);
    videoUndo.current=null;
    setGuidedTrack(null);setVideoStep(null);setVideoPendingCategory(null);
    setGuideLink(null);setTestChatOpen(false);setPageHelpLink(null);
    setShowVideoSignIn(false);setNeedsPrivateSignIn(false);
    setDraft("");setStatus("");setSource("");setChoices([]);
    setMessages(prev=>[...prev,{role:"user" as const,text:messengerStarter[language].contentIntent},
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
    const turnLocale=messengerView&&judgmentChoice===null
      ?detectConversationLocale(text,locale) as PublicLocale:locale;
    if(turnLocale!==locale){setLocale(turnLocale);onConversationLocaleChange?.(turnLocale);}
    const turnStarter=messengerStarter[turnLocale],turnCopy=copy[turnLocale];
    if(!text||busy||(mode==="owned"&&!agree&&!(compact&&(testChatOpen||testOfferFromText(text))))||
      (judgmentChoice!==null&&judgmentClickLock.current))return;
    alternativeAbortRef.current?.abort();alternativeAbortRef.current=null;
    lastAnswerRef.current=null;setAlternativeError("");
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
        setMessages(prev=>[...prev,{role:"assistant" as const,text:turnStarter.safety}].slice(-30));
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
        const safeIntent=turnLocale==="ru"?"Подобрать тест":turnLocale==="es"?"Elegir prueba":"Choose a test";
        setMessages(prev=>[...prev,{role:"user" as const,text:safeIntent},
          {role:"assistant" as const,text:explanation}].slice(-30));
        return;
      }
    }
    if(compact&&isCasualGreeting(text)){
      setProjectFlow(null);setSessionStep(null);setSessionGoal(null);setSessionOffers([]);setPageHelpLink(null);
      setJudgmentView(null);judgmentClickLock.current=false;
      setContentStep(null);setContentVoice(false);setContentBrief("");
      followTail.current=true;setNewBelow(false);setStatus("");setSource("");setChoices([]);setDraft("");
      setMessages(prev=>[...prev,{role:"user" as const,text},
        {role:"assistant" as const,text:ruleConversationReply({message:text,locale:turnLocale,history:messages.slice(-6)})?.reply||
          (/[а-яё]/iu.test(text)?messengerStarter.ru.hello:
            /^(?:hola|buenas)/i.test(text)?messengerStarter.es.hello:turnStarter.hello)}].slice(-30));
      return;
    }
    if(compact&&isContentCreationIntent(text)){setTestChatOpen(false);setTestChatTurn(null);setTestSuggestedKey("");startContent(turnLocale);return;}
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
    // Sessions asks for a goal before exposing any service. An unclear first
    // free-text answer gets one optional outcome question before a shortlist.
    if(compact&&judgmentChoice===null&&projectFlow==="sessions"&&sessionStep&&
      !isContentCreationIntent(text)&&!isVideoCreationIntent(text)&&!requiresProtectedReply(text,turnLocale)){
      const goal=sessionGoal||sessionGoalForText(text);
      if(sessionStep==="goal"&&(!goal||text.length<36)){
        followTail.current=true;setNewBelow(false);setDraft("");setChoices([]);
        setSessionGoal(goal);setSessionStep("outcome");
        setMessages(prev=>[...prev,{role:"user" as const,text},
          {role:"assistant" as const,text:sessionCopy(turnLocale).detail}].slice(-30));
      }else{
        finishSessionIntake(text,goal||"personal",turnLocale);
      }
      return;
    }
    setEntryOpen(false);setContentStep(null);setProjectFlow(null);setPageHelpLink(null);
    setSessionStep(null);setSessionGoal(null);setSessionOffers([]);
    // Keep every user turn intact for server safety preflight (UI max 2,000).
    // Bound unusually long assistant replies without altering user risk cues.
    const prior=messages.slice(-6).map(row=>({
      role:row.role,text:row.role==="user"?row.text:row.text.slice(0,4000),
    })),abort=new AbortController();
    // Guest discovery uses public editorial rules, not private account APIs.
    if(compact&&!authenticated&&mode==="rules"){
      followTail.current=true;setNewBelow(false);setStatus("");setSource("");setChoices([]);
      setNeedsPrivateSignIn(false);setShowVideoSignIn(false);setEntryOpen(false);setDraft("");
      const candidate=planJudgmentTurn({message:text,locale:turnLocale,
        safety:{status:"clear"},history:prior,pending:judgmentView?.pending,choiceId:judgmentChoice});
      const handled=candidate.status!=="abstain";
      const answer=requiresProtectedReply(text,turnLocale)?turnStarter.safety:
        handled?candidate.reply:guestAnswer(text,prior,turnLocale);
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
      const response=await fetch("/api/holistic-agent/turn",{
        method:"POST",credentials:"same-origin",signal:abort.signal,
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale:turnLocale,message:text,mode,history:prior,
          selectedGoal:null,ownedInferenceConsent:mode==="owned"&&agree,
          chosenAxes:axisRef?[axisRef]:[],
          preferredFormat:format||null,
          usePrivateProfile:useSavedTests&&Boolean(axisRef),
          usePrivateHistory:useSavedHistory,
          useAgentMemory:authenticated&&useAgentMemory,
          judgmentContext:judgmentView?.token||null,
          judgmentChoice,
          feedback:{dismissedIds,completedIds}}),
      });
      if(!response.ok)throw Error(response.status===401?"SIGN_IN_REQUIRED":response.status===503?"MODE_UNAVAILABLE":"CHAT_UNAVAILABLE");
      const data=await response.json() as AgentReply;
      let reply=data.reply,used=data.source||"none";
      if(mode==="device"&&data.browserModelAllowed&&!abort.signal.aborted){
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
          setStatus(turnCopy.unavailable);
        }
      }
      if(abort.signal.aborted)return;
      setChoices(Array.isArray(data.suggestions)?data.suggestions:[]);
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
      const friendlyTurn=Boolean(socialRule&&typeof socialRule.id==="string"&&["conversation_greeting","conversation_small_talk","conversation_chat_invitation"].includes(socialRule.id));
      setSource(friendlyTurn?"":used==="browser"?turnCopy.used:used==="owned"?turnCopy.backend:turnCopy.simple);
    } catch (error) {
      if(!abort.signal.aborted){
        if(voice.conversing)voice.stopDialogue();
        const reason=error instanceof Error?error.message:"";
        if(reason==="SIGN_IN_REQUIRED"&&compact&&mode==="rules"){
          // Expired session: answer from public rules; private API stays protected.
          const candidate=planJudgmentTurn({message:text,locale:turnLocale,
            safety:{status:"clear"},history:prior,pending:null});
          const answer=requiresProtectedReply(text,turnLocale)?turnStarter.safety:
            candidate.status!=="abstain"?candidate.reply:guestAnswer(text,prior,turnLocale);
          setJudgmentView(!requiresProtectedReply(text,turnLocale)&&candidate.status!=="abstain"?
            candidate as JudgmentView:null);
          setMessages(prev=>[...prev,{role:"assistant" as const,text:answer}].slice(-30));
          setSource("");setStatus("");
        }else{
          setNeedsPrivateSignIn(reason==="SIGN_IN_REQUIRED");
          setStatus(reason==="SIGN_IN_REQUIRED"?turnCopy.signIn:reason==="MODE_UNAVAILABLE"?turnCopy.modeError:turnCopy.error);
        }
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
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendTurn(draft);
  }
  function resetConversation(){voice.stopDialogue();lastSpeechTurn.current=null;alternativeAbortRef.current?.abort();alternativeAbortRef.current=null;lastAnswerRef.current=null;setAlternativeBusy(false);controller.current?.abort();selectVoiceMessage(null);followTail.current=true;setNewBelow(false);setMessages([]);setPageHelpLink(null);setChoices([]);setJudgmentView(null);judgmentClickLock.current=false;setStatus("");setSource("");setEvidenceUsed(false);setHistoryUsed(false);setDismissedIds([]);setCompletedIds([]);setEntryOpen(true);setProjectFlow(null);setSessionStep(null);setSessionGoal(null);setSessionOffers([]);setTestFocus(null);setContentStep(null);setContentVoice(false);setContentBrief("");setFormat("");setGuideLink(null);setTestChatOpen(false);setTestChatTurn(null);setTestSuggestedKey("");setTestRevision(0);setGuidedTrack(null);setVideoGoal("all");setShowVideoSignIn(false);setNeedsPrivateSignIn(false);setVideoStep(null);videoUndo.current=null;setVideoPendingCategory(null);setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);setRecorderOpen(false);}

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
  return <section className={styles.root} data-hh-agent-preview lang={locale} data-compact={compact||undefined}
    data-video-auth-status={compact?(authenticated?"authenticated":authStatus):undefined}
    data-page-help={pageHelp?"true":undefined} data-has-messages={messages.length>0||undefined}
    data-chat-skin={messengerView?"messenger":undefined}>
    {!compact&&<><h1>{t.title}</h1><p>{t.disclosure}</p><p>{t.intro}</p></>}
    {!compact&&settings}
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
      {compact&&messengerView&&!pageHelp&&!messages.length&&<>
        <MessengerAiLanding locale={locale} onCreateVideo={()=>startContent()}
          onPractice={()=>startGuided("meditation")} onAsk={()=>composerRef.current?.focus({preventScroll:true})}/>
        <MessengerSixProjects locale={locale} onSelect={startProject}/>
      </>}
      {compact&&(!messengerView||pageHelp)&&<p className={styles.assistant} data-hh-ai-welcome>{pageHelp?.greeting??starter.welcome}</p>}
      {!compact&&!messages.length&&<p className={styles.muted}>{t.start}</p>}
      {messages.map((m,index)=>messengerView&&m.role==="assistant"?
        <div key={index} className={styles.messageWithAvatar} data-hh-ai-assistant-message>
          <img src="/images/holistic-house/reiki-approved-sunrise-v3.webp"
            width={37} height={37} loading="lazy" alt="" className={styles.messagePortrait}/>
          <p className={styles.assistant}>{m.variant==="alternative"&&<strong className={styles.alternativeLabel}>{locale==="ru"?"Альтернативный ответ · AI на устройстве":locale==="es"?"Respuesta alternativa · IA en el dispositivo":"Alternative answer · On-device AI"}{"\n"}</strong>}{m.text}</p>
          {voiceEnabled&&<button type="button" data-hh-voice-turn={index}
            aria-label={voice.t.play} title={voice.t.play}
            disabled={!voice.playbackConsent||!voice.supported}
            onClick={()=>voice.speak(m.text)}
            style={{minWidth:32,minHeight:32,marginInlineStart:6,border:"1px solid #E9DFD1",borderRadius:10,background:"#FFFCF7",color:"#143D3A"}}>🔊</button>}
        </div>:
        <p key={index} data-hh-chat-turn={m.role} className={m.role==="user"?styles.user:styles.assistant}>
          {m.variant==="alternative"&&<strong className={styles.alternativeLabel}>{locale==="ru"?"Альтернативный ответ · AI на устройстве":locale==="es"?"Respuesta alternativa · IA en el dispositivo":"Alternative answer · On-device AI"}{"\n"}</strong>}{m.text}{voiceEnabled&&<button type="button" data-hh-voice-turn={index}
            aria-label={voice.t.play} title={voice.t.play}
            disabled={!voice.playbackConsent||!voice.supported}
            onClick={()=>voice.speak(m.text)}
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
    {voiceEnabled&&<VoiceCompanionControls voice={voice} locale={locale}
      greeting={pageHelp?.greeting??starter.welcome}
      latestReply={[...messages].reverse().find(item=>item.role==="assistant")?.text}
      onTranscript={text=>setDraft(prev=>((prev?prev+" ":"")+text).slice(0,2000))}
      onConversationTurn={text=>{
        if(busy||mode==="owned"&&!agree){setDraft(text);voice.stopDialogue();return;}
        if(requiresProtectedReply(text,locale))voice.stopDialogue();
        setDraft(text);void sendTurn(text);
      }}/>}
    <form onSubmit={submit} className={styles.form}>
      <textarea ref={composerRef} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.placeholder}
        onFocus={()=>{
          if(!compact||!messengerView)return;
          composerFocused.current=true;
          followTail.current=true;
          window.requestAnimationFrame(revealFocusedContext);
        }}
        onBlur={()=>{composerFocused.current=false;}}
        maxLength={contentStep==="brief"?160:2000} rows={compact?1:3} disabled={busy} aria-label={t.placeholder}/>
      <div className={styles.actions}>
        {messengerView?<details className={styles.composerMore} data-hh-ai-more>
          <summary aria-label={locale==="ru"?"Дополнительные действия":locale==="es"?"Más acciones":"More actions"}><Plus size={19} aria-hidden="true"/></summary>
          <div className={styles.composerMenu}>{voiceAttachment}{resetControl}</div>
        </details>:voiceAttachment}
        {messengerView&&!pageHelp&&voiceEnabled&&<button type="button"
          className={styles.recorderToggle} data-hh-conversation-mic
          onClick={()=>voice.conversing?voice.stopDialogue():voice.startDialogue(text=>{
            if(busy||(mode==="owned"&&!agree)){setDraft(text);voice.stopDialogue();return;}
            if(requiresProtectedReply(text,locale))voice.stopDialogue();
            setDraft(text);void sendTurn(text);
          })}
          disabled={!voice.conversing&&(!voice.recognitionSupported||!voice.sttConsent||!voice.supported||!voice.playbackConsent)}
          aria-pressed={voice.conversing}
          aria-label={voice.conversing?(locale==="ru"?"Завершить голосовой разговор":locale==="es"?"Terminar conversación":"End voice conversation"):
            (locale==="ru"?"Начать голосовой разговор":locale==="es"?"Hablar por voz":"Talk by voice")}
          title={locale==="ru"?"Голосовой разговор":locale==="es"?"Conversación por voz":"Voice conversation"}>
          <Mic size={20} aria-hidden="true"/>
        </button>}
        {messengerView&&<EmotionalAvatar messages={messages} busy={busy}
          status={status} locale={locale} compact={compact} iconOnly companionVoice={voiceEnabled?voice:undefined}/>}
        {!messengerView&&resetControl}
        <button type="submit" disabled={busy||!draft.trim()||(mode==="owned"&&!agree&&!(compact&&(testChatOpen||testOfferFromText(draft))))}
          aria-label={messengerView?(busy?t.loading:t.send):undefined}>{messengerView?<Send size={20} aria-hidden="true"/>:busy?t.loading:t.send}</button>
        {busy&&<button type="button" onClick={()=>{voice.stopDialogue();controller.current?.abort();}}
          aria-label={messengerView?t.cancel:undefined}>{messengerView?<X size={19} aria-hidden="true"/>:t.cancel}</button>}
      </div>
    </form>
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
