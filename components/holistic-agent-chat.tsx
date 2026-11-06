"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { prepareNaturalDialogue, finishNaturalDialogue } from "@/lib/holistic-support/natural-dialogue.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import { AXIS_REFS } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import { ruleConversationReply } from "@/lib/holistic-support/rule-conversation.mjs";
import { publicVideoGoalForMessage } from "@/lib/video-discovery/ranker.mjs";
import MessengerSignIn from "@/components/app/messenger-sign-in";
import {interpretSupportUtterance} from "@/lib/holistic-support/guide-dialogue.mjs";
import {classifyVideoChatQuestion,answerVideoChatQuestion} from "@/lib/mandala/video-chat-dialogue-knowledge.mjs";
import {
  MESSENGER_VIDEO_HANDOFF_KEY,initialMessengerVideoDraft,messengerVideoCopy,
  messengerVideoQuestion,messengerVideoChoices,advanceMessengerVideo,
  changeMessengerVideoPhraseStyle,encodeMessengerVideoHandoff,
} from "@/lib/mandala/video-chat-messenger-flow.mjs";
import {stageVoiceStudioHandoff} from "@/lib/mandala/voice-studio-handoff.mjs";
import type {TimedSpeechTranscript} from "@/lib/mandala/audio-visual-storyboard.mjs";
import styles from "./holistic-agent-chat.module.css";
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
type Message = { role: "user" | "assistant"; text: string };
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
type AgentReply = { status:string;reply:string;modelUsed:boolean;source:string;
  suggestions:{id:string;kind:string;title:string;href:string}[];decision:AgentDecision;
  browserModelAllowed:boolean; usedSavedTestEvidence?:boolean; usedSavedVideoHistory?:boolean };
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
  welcome:"Приветствую! Могу помочь с поддерживающим видео, практикой, тестом или личной экспресс-диагностикой. Выберите вариант или напишите свой вопрос.",
  hello:"Я здесь! Можем создать видео, подобрать практику, выбрать тест или обратиться за личной экспресс-диагностикой. Что вам актуально?",

  video:"Создать контент",videoSub:"Видео · аудио · медитации · послания",
  contentIntent:"Хочу создать контент",
  contentQuestion:"Что хотите создать?",
  contentSourceQuestion:"С чего начнём?",
  contentKinds:{video:"Видеоролик",audio:"Аудио",meditation:"Медитацию",message:"Послание"},
  contentSources:{text:"Написать текст",voice:"Записать / загрузить аудио"},
  contentIdeaQuestion:"Напишите идею ролика (до 160 символов). Затем подберём подходящие кадры.",
  contentIdeaAccepted:"Идея сохранена. ",
  contentVoiceHint:"Запишите голос или выберите аудиофайл ниже. Оригинальный звук войдёт в ролик; укажите тему для подбора видеоряда. Расшифровка речи здесь пока недоступна.",
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
  welcome:"Welcome! I can help with a supportive video, a practice for now, a test or a personal express review. Choose an option or write your question.",
  hello:"I'm here! We can create a video, choose a practice, explore a test or request a personal express review. What matters to you now?",

  video:"Create content",videoSub:"Video · audio · meditations · messages",
  contentIntent:"I want to create content",
  contentQuestion:"What would you like to create?",
  contentSourceQuestion:"How shall we begin?",
  contentKinds:{video:"Video",audio:"Audio",meditation:"Meditation",message:"Message"},
  contentSources:{text:"Write text",voice:"Record / upload audio"},
  contentIdeaQuestion:"Describe your idea (up to 160 characters). Then we'll find matching footage.",
  contentIdeaAccepted:"Idea saved. ",
  contentVoiceHint:"Record your voice or choose an audio file below. Your original audio will accompany the video. Add a topic to guide footage selection; speech transcription is not yet available here.",
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
  contentVoiceHint:"Graba tu voz o elige un archivo de audio abajo. Tu audio original acompañará el vídeo. Indica un tema para seleccionar imágenes; todavía no hay transcripción de voz aquí.",
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
export function HolisticAgentChat({locale,compact=false,quickPrompt,authenticated=false,authStatus="guest",onAuthRetry,pageHelp}:{
 locale:PublicLocale;compact?:boolean;quickPrompt?:HolisticAgentQuickPrompt|null;authenticated?:boolean;
 authStatus?:"guest"|"checking"|"authenticated"|"unavailable";onAuthRetry?:()=>void;pageHelp?:HolisticAgentPageHelp|null
}) {
  const t=copy[locale];
  const starter=messengerStarter[locale];
  const [mode,setMode]=useState<Mode>("rules");
  const [agree,setAgree]=useState(false);
  const [axisRef,setAxisRef]=useState("");
  const [format,setFormat]=useState<""|"video"|"audio"|"test"|"course"|"service">("");
  const [useSavedTests,setUseSavedTests]=useState(false);
  const [useSavedHistory,setUseSavedHistory]=useState(false);
  const [historyUsed,setHistoryUsed]=useState(false);
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
  const [guideLink,setGuideLink]=useState<"tests"|null>(null);
  const [testChatOpen,setTestChatOpen]=useState(false);
  const [testRevision,setTestRevision]=useState(0);
  const [guidedTrack,setGuidedTrack]=useState<GuidedTrack>(null);
  const [contentStep,setContentStep]=useState<"kind"|"source"|"brief"|null>(null);
  const [contentBrief,setContentBrief]=useState("");
  const [contentVoice,setContentVoice]=useState(false);
  const [videoGoal,setVideoGoal]=useState<PublicVideoGoal>("all");
  const [showVideoSignIn,setShowVideoSignIn]=useState(false);
  const [needsPrivateSignIn,setNeedsPrivateSignIn]=useState(false);
  const [messages,setMessages]=useState<Message[]>([]);
  const [pageHelpLink,setPageHelpLink]=useState<{href:string;label:string}|null>(null);
  const [choices,setChoices]=useState<AgentReply["suggestions"]>([]);
  const [videoDraft,setVideoDraft]=useState<MessengerVideoDraft>(
    ()=>initialMessengerVideoDraft() as MessengerVideoDraft);
  const [videoStep,setVideoStep]=useState<string|null>(null);
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
  const [newBelow,setNewBelow]=useState(false);
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
    const thread=threadRef.current;
    if(!thread)return;
    const revealLatest=()=>{
      if(followTail.current){
        // Scroll only the internal transcript, never the iPhone page or dock.
        thread.scrollTop=thread.scrollHeight;
        setNewBelow(false);
      }else if(messages.length)setNewBelow(true);
    };
    revealLatest();
    // New option groups/auth controls can mount after the message count settles.
    const frame=window.requestAnimationFrame(revealLatest);
    return ()=>window.cancelAnimationFrame(frame);
  },[messages.length,status,choices.length,videoStep,videoDraft,contentStep,contentVoice,
    videoPendingCategory,showVideoSignIn,needsPrivateSignIn,entryOpen,guideLink,testRevision,testChatOpen]);
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

  function guestAnswer(text:string,prior:Message[]):string {
    const reviewed=ruleConversationReply({message:text,locale,history:prior});
    const goal=publicVideoGoalForMessage(text);
    if(goal)setVideoGoal(goal as PublicVideoGoal);
    if(!reviewed){setGuidedTrack(null);return starter.safety;}
    if(reviewed.id.startsWith("video")){
      setGuidedTrack("video");setVideoStep("category");
      setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);
      setVideoPendingCategory(null);
      return messengerVideoQuestion("category",locale);
    }
    else if(reviewed.id.startsWith("meditation"))setGuidedTrack("meditation");
    return reviewed.reply;
  }
  function answerVideo(value:string,label=value) {
    if(!compact||!videoStep||busy)return;
    const questionKind=classifyVideoChatQuestion(value);
    if(questionKind){
      const response=answerVideoChatQuestion(questionKind,{
        locale,stage:videoStep,options:videoChoices.map(option=>option.label),
      });
      followTail.current=true;setNewBelow(false);setDraft("");
      setMessages(prev=>[...prev,{role:"user" as const,text:label},
        {role:"assistant" as const,text:response}].slice(-30));
      return;
    }
    const result=advanceMessengerVideo(videoDraft,videoStep,value,locale);
    setVideoPendingCategory(null);
    setVideoDraft(result.draft as MessengerVideoDraft);
    setVideoStep(result.step);
    setDraft("");setStatus("");setSource("");setChoices([]);
    followTail.current=true;setNewBelow(false);
    setMessages(prev=>[...prev,
      {role:"user" as const,text:label},
      {role:"assistant" as const,text:(result.valid?"":videoCopy.unknown+"\\n")+
        messengerVideoQuestion(result.step,locale)},
    ].slice(-30));
  }
  function updateVideoPhraseStyle(key:"tone"|"speaker"|"length",value:string,label:string) {
    if(!compact||videoStep!=="phrase"||busy)return;
    const next=changeMessengerVideoPhraseStyle(videoDraft,key,value);
    if(!next)return;
    setVideoDraft(next as MessengerVideoDraft);setStatus("");setChoices([]);
    followTail.current=true;setNewBelow(false);
    setMessages(prev=>[...prev,{role:"user" as const,text:label},
      {role:"assistant" as const,text:messengerVideoQuestion("phrase",locale)}].slice(-30));
  }
  function openVideoEdit(step:string,label:string) {
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
  function startContent() {
    if(busy)return;
    followTail.current=true;setNewBelow(false);setEntryOpen(false);
    setContentStep("kind");setContentBrief("");setContentVoice(false);
    setGuidedTrack(null);setVideoStep(null);setVideoPendingCategory(null);
    setGuideLink(null);setTestChatOpen(false);setPageHelpLink(null);
    setShowVideoSignIn(false);setNeedsPrivateSignIn(false);
    setDraft("");setStatus("");setSource("");setChoices([]);
    setMessages(prev=>[...prev,{role:"user" as const,text:starter.contentIntent},
      {role:"assistant" as const,text:starter.contentQuestion}].slice(-30));
  }
  function chooseContentKind(kind:"video"|"audio"|"meditation"|"message") {
    if(busy||contentStep!=="kind")return;
    followTail.current=true;setNewBelow(false);setDraft("");
    setContentBrief("");setContentVoice(false);setPageHelpLink(null);
    if(kind==="audio"){
      setContentStep(null);setContentVoice(true);
      setMessages(prev=>[...prev,{role:"user" as const,text:starter.contentKinds.audio},
        {role:"assistant" as const,text:starter.contentAudioHint+" "+starter.contentVoiceHint}].slice(-30));
      return;
    }
    setContentStep("source");
    const context=kind==="meditation"?starter.contentMeditationHint:
      kind==="message"?starter.contentMessageHint:starter.contentTextHint;
    setMessages(prev=>[...prev,{role:"user" as const,text:starter.contentKinds[kind]},
      {role:"assistant" as const,text:context+" "+starter.contentSourceQuestion}].slice(-30));
  }
  function chooseContentSource(source:"text"|"voice") {
    if(busy||contentStep!=="source")return;
    followTail.current=true;setNewBelow(false);setDraft("");
    if(source==="voice"){
      setContentStep(null);setContentVoice(true);
      setMessages(prev=>[...prev,{role:"user" as const,text:starter.contentSources.voice},
        {role:"assistant" as const,text:starter.contentVoiceHint}].slice(-30));
      return;
    }
    setContentStep("brief");setContentVoice(false);
    setMessages(prev=>[...prev,{role:"user" as const,text:starter.contentSources.text},
      {role:"assistant" as const,text:starter.contentIdeaQuestion}].slice(-30));
    composerRef.current?.focus({preventScroll:true});
  }
  function selectPageHelpAction(action:HolisticAgentPageHelp["actions"][number]){
    if(busy)return;
    setContentStep(null);setContentVoice(false);setContentBrief("");
    if(action.track){setPageHelpLink(null);startGuided(action.track);return;}
    followTail.current=true;setNewBelow(false);
    setEntryOpen(false);setVideoStep(null);setGuidedTrack(null);
    setStatus("");setSource("");setChoices([]);
    setNeedsPrivateSignIn(false);setShowVideoSignIn(false);
    setPageHelpLink(action.href?{href:action.href,label:action.label}:null);
    setMessages(prev=>[...prev,{role:"user" as const,text:action.prompt},
      {role:"assistant" as const,text:action.reply}].slice(-30));
  }
  function startGuided(kind:"video"|"meditation"|"hint") {
    if(busy)return;
    setContentStep(null);setContentBrief("");setContentVoice(false);
    followTail.current=true;setNewBelow(false);
    setFormat(kind==="video"?"video":kind==="meditation"?"audio":"test");
    setVideoStep(kind==="video"?"category":null);
    if(kind==="video"){setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);setVideoPendingCategory(null);}
    setGuidedTrack(kind);setVideoGoal("all");setShowVideoSignIn(false);setNeedsPrivateSignIn(false);setPageHelpLink(null);
    setGuideLink(kind==="hint"?"tests":null);
    setTestChatOpen(kind==="hint");
    setEntryOpen(false);setStatus("");setSource("");setChoices([]);
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
      const body=new FormData();
      body.append("file",file,file.name);
      body.append("locale",locale);body.append("consent","yes");
      const response=await fetch("/api/holistic-support/audio-storyboard",{
        method:"POST",body,cache:"no-store",credentials:"same-origin",signal:abort.signal
      });
      const data=await response.json() as {transcript?:TimedSpeechTranscript;error?:string};
      if(!response.ok||!data.transcript)throw Error(data.error||"VOICE_STT_UNAVAILABLE");
      if(voiceAbortRef.current!==abort)return;
      const stored=await stageVoiceStudioHandoff(file,data.transcript);
      if(voiceAbortRef.current!==abort)return;
      setVoiceTranscript(data.transcript);setVoiceHandoffReady(stored);
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
        (locale==="ru"?"Бесплатное распознавание пока не подключено. Аудио не отправлялось провайдеру.":
          locale==="es"?"El reconocimiento gratuito no está configurado. No se envió el audio.":
            "Free transcription is not configured. Audio was not sent to a provider.") :
        (locale==="ru"?"Не удалось распознать голос с таймкодами. Проверьте файл и подключение.":
          locale==="es"?"No se pudo transcribir con tiempos. Comprueba el archivo y la conexión.":
            "Timed transcription failed. Check the file and connection."));
    }finally{
      if(voiceAbortRef.current===abort){
        voiceAbortRef.current=null;setVoiceBusy(false);
      }
    }
  }
  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text=draft.trim().slice(0,2000);
    if(!text||busy||mode==="owned"&&!agree)return;
    if(compact&&isCasualGreeting(text)){
      setContentStep(null);setContentVoice(false);setContentBrief("");
      followTail.current=true;setNewBelow(false);setStatus("");setSource("");setChoices([]);setDraft("");
      setMessages(prev=>[...prev,{role:"user" as const,text},
        {role:"assistant" as const,text:/[а-яё]/iu.test(text)?messengerStarter.ru.hello:
          /^(?:hola|buenas)/i.test(text)?messengerStarter.es.hello:starter.hello}].slice(-30));
      return;
    }
    if(compact&&isContentCreationIntent(text)){startContent();return;}
    if(compact&&contentStep==="kind"){
      const selected=(["video","audio","meditation","message"] as const).find(kind=>
        starter.contentKinds[kind].toLocaleLowerCase()===text.toLocaleLowerCase());
      if(selected){chooseContentKind(selected);return;}
    }
    if(compact&&contentStep==="source"){
      const selected=(["text","voice"] as const).find(source=>
        starter.contentSources[source].toLocaleLowerCase()===text.toLocaleLowerCase());
      if(selected){chooseContentSource(selected);return;}
    }
    if(compact&&contentStep==="brief"){
      if(!requiresProtectedReply(text,locale)){
        setContentBrief(text);setContentStep(null);setContentVoice(false);
        setVideoStep("category");setGuidedTrack("video");setFormat("video");
        setVideoPendingCategory(null);setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);
        setDraft("");followTail.current=true;setNewBelow(false);
        setMessages(prev=>[...prev,{role:"user" as const,text},
          {role:"assistant" as const,text:starter.contentIdeaAccepted+
            messengerVideoQuestion("category",locale)}].slice(-30));
        return;
      }
      setContentBrief("");setContentStep(null);
    }
    if(compact&&isVideoCreationIntent(text)){
      followTail.current=true;setNewBelow(false);setDraft("");setStatus("");setChoices([]);
      setEntryOpen(false);setContentStep(null);setContentVoice(false);setContentBrief("");setGuidedTrack("video");setFormat("video");setTestChatOpen(false);
      setVideoPendingCategory(null);setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);
      setVideoStep("category");setShowVideoSignIn(false);setNeedsPrivateSignIn(false);
      setMessages(prev=>[...prev,{role:"user" as const,text},
        {role:"assistant" as const,text:messengerVideoQuestion("category",locale)}].slice(-30));
      return;
    }
    if(compact&&videoStep){
      if(!requiresProtectedReply(text,locale)){answerVideo(text);return;}
      // Urgent/human-review messages must not leave video options visible.
      setVideoStep(null);setGuidedTrack(null);
    }
    setEntryOpen(false);setContentStep(null);
    // Keep every user turn intact for server safety preflight (UI max 2,000).
    // Bound unusually long assistant replies without altering user risk cues.
    const prior=messages.slice(-6).map(row=>({
      role:row.role,text:row.role==="user"?row.text:row.text.slice(0,4000),
    })),abort=new AbortController();
    // Guest discovery uses public editorial rules, not private account APIs.
    if(compact&&!authenticated&&mode==="rules"){
      followTail.current=true;setNewBelow(false);setStatus("");setSource("");setChoices([]);
      setNeedsPrivateSignIn(false);setShowVideoSignIn(false);setEntryOpen(false);setDraft("");
      const answer=requiresProtectedReply(text,locale)?starter.safety:guestAnswer(text,prior);
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
        body:JSON.stringify({locale,message:text,mode,history:prior,
          selectedGoal:null,ownedInferenceConsent:mode==="owned"&&agree,
          chosenAxes:axisRef?[axisRef]:[],
          preferredFormat:format||null,
          usePrivateProfile:useSavedTests&&Boolean(axisRef),
          usePrivateHistory:useSavedHistory,
          feedback:{dismissedIds,completedIds}}),
      });
      if(!response.ok)throw Error(response.status===401?"SIGN_IN_REQUIRED":response.status===503?"MODE_UNAVAILABLE":"CHAT_UNAVAILABLE");
      const data=await response.json() as AgentReply;
      let reply=data.reply,used=data.source||"none";
      if(mode==="device"&&data.browserModelAllowed&&!abort.signal.aborted){
        try {
          const native=(window as Window & {LanguageModel?:NativeLanguageModel}).LanguageModel;
          const languages=[locale];
          const caps={expectedInputs:[{type:"text",languages}],
            expectedOutputs:[{type:"text",languages}]};
          if(!native||await native.availability(caps)==="unavailable")
            throw Error("DEVICE_UNAVAILABLE");
          const envelope=prepareNaturalDialogue({locale,message:text,history:prior,decision:data.decision,
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
          setStatus(t.unavailable);
        }
      }
      if(abort.signal.aborted)return;
      setChoices(Array.isArray(data.suggestions)?data.suggestions:[]);
      setEvidenceUsed(data.usedSavedTestEvidence===true);
      setHistoryUsed(data.usedSavedVideoHistory===true);
      setMessages(prev=>[...prev,{role:"assistant" as const,text:reply}].slice(-30));
      setSource(used==="browser"?t.used:used==="owned"?t.backend:t.simple);
    } catch (error) {
      if(!abort.signal.aborted){
        const reason=error instanceof Error?error.message:"";
        if(reason==="SIGN_IN_REQUIRED"&&compact&&mode==="rules"){
          // Expired session: answer from public rules; private API stays protected.
          const answer=requiresProtectedReply(text,locale)?starter.safety:guestAnswer(text,prior);
          setMessages(prev=>[...prev,{role:"assistant" as const,text:answer}].slice(-30));
          setSource("");setStatus("");
        }else{
          setNeedsPrivateSignIn(reason==="SIGN_IN_REQUIRED");
          setStatus(reason==="SIGN_IN_REQUIRED"?t.signIn:reason==="MODE_UNAVAILABLE"?t.modeError:t.error);
        }
      }
    } finally {
      setBusy(false);controller.current=null;
    }
  }
  const settings = (
    <details className={compact?styles.compactSettings:styles.expandedSettings} open={!compact}>
      <summary>{compact?(locale==="ru"?"Настройки":locale==="es"?"Ajustes":"Settings"):(locale==="ru"?"Режим ответа и конфиденциальность":locale==="es"?"Modo y privacidad":"Response mode and privacy")}</summary>
    <label className={styles.mode}>{t.mode}
      <select value={mode} onChange={event=>{setMode(event.target.value as Mode);setStatus("");}}>
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
  return <section className={styles.root} data-hh-agent-preview data-compact={compact||undefined}
    data-video-auth-status={compact?(authenticated?"authenticated":authStatus):undefined}
    data-page-help={pageHelp?"true":undefined} data-has-messages={messages.length>0||undefined}>
    {!compact&&<><h1>{t.title}</h1><p>{t.disclosure}</p><p>{t.intro}</p></>}
    {!compact&&settings}
    <EmotionalAvatar messages={messages} busy={busy} status={status} locale={locale} compact={compact}/>
    <div ref={threadRef} className={styles.thread} role="log" aria-live="polite"
      onScroll={event=>{const el=event.currentTarget;
        const atBottom=el.scrollHeight-el.scrollTop-el.clientHeight<64;
        followTail.current=atBottom;
        if(atBottom)setNewBelow(false)}}>
      {compact&&<p className={styles.assistant} data-hh-ai-welcome>{pageHelp?.greeting??starter.welcome}</p>}
      {!compact&&!messages.length&&<p className={styles.muted}>{t.start}</p>}
      {messages.map((m,index)=><p key={index} className={m.role==="user"?styles.user:styles.assistant}>{m.text}</p>)}
      {compact&&pageHelpLink&&<a className={styles.testLink} data-hh-ihelp-link href={pageHelpLink.href}>{pageHelpLink.label} · {t.option}</a>}
      {compact&&guideLink==="tests"&&<a className={styles.testLink} data-hh-ai-tests-link
        href={"/"+locale+"/tests"}>{starter.testsLink}</a>}
      {compact&&testChatOpen&&<MessengerTestJourney locale={locale}
        onAdvance={()=>setTestRevision(value=>value+1)} onClose={()=>setTestChatOpen(false)}/>}
      {compact&&entryOpen&&pageHelp&&<div className={styles.startActions} role="group"
        aria-label={starter.actions} data-hh-ihelp-actions>
        {pageHelp.actions.map(action=><button type="button" key={action.id}
          data-hh-ihelp-option={action.id} disabled={busy}
          onClick={()=>selectPageHelpAction(action)}>{action.label}</button>)}
        <button type="button" data-hh-ihelp-ask onClick={()=>{
          setEntryOpen(false);composerRef.current?.focus({preventScroll:true});
        }}>{locale==="ru"?"Задать другой вопрос":locale==="es"?"Hacer otra pregunta":"Ask another question"}</button>
      </div>}
      {compact&&entryOpen&&!pageHelp&&<div className={styles.startActions} role="group" aria-label={starter.actions}>
        <button type="button" data-hh-ai-start="video" disabled={busy} onClick={startContent}>
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
    {source&&<p className={styles.muted}>{t.source}: {source}</p>}
    {evidenceUsed&&<p className={styles.muted} role="status">{t.evidenceUsed}</p>}
    {historyUsed&&<p className={styles.muted} role="status">{t.historyUsed}</p>}
    {choices.filter(x=>!dismissedIds.includes(x.id)&&!completedIds.includes(x.id)).length>0&&
      <div className={styles.choices}><h2>{t.suggestions}</h2>
        {choices.filter(x=>!dismissedIds.includes(x.id)&&!completedIds.includes(x.id)).map(x=>
          <div className={styles.offer} key={x.id}>
            <a href={x.href} rel="noreferrer">{x.title} · {t.option}</a>
            <div className={styles.feedbackActions}>
              <button type="button" onClick={()=>setDismissedIds(ids=>[...new Set([...ids,x.id])].slice(-20))}>{t.hide}</button>
              <button type="button" onClick={()=>setCompletedIds(ids=>[...new Set([...ids,x.id])].slice(-20))}>{t.tried}</button>
            </div>
          </div>)}
        <small className={styles.muted}>{t.localFeedback}</small>
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
    <form onSubmit={submit} className={styles.form}>
      <textarea ref={composerRef} value={draft} onChange={e=>setDraft(e.target.value)} placeholder={t.placeholder}
        maxLength={contentStep==="brief"?160:2000} rows={compact?1:3} disabled={busy} aria-label={t.placeholder}/>
      <div className={styles.actions}>
        {compact&&<label className={styles.mode} data-hh-voice-message-upload
          style={{display:"inline-flex",alignItems:"center",cursor:"pointer",fontSize:13}}>
          {locale==="ru"?"🎙 Аудио":locale==="es"?"🎙 Audio":"🎙 Voice"}
          <input type="file"
            accept="audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/aac,audio/webm,audio/ogg,.mp3,.m4a,.wav,.webm,.ogg,.aac"
            aria-label={locale==="ru"?"Прикрепить аудиосообщение":locale==="es"?"Adjuntar audio":"Attach voice message"}
            disabled={voiceBusy||busy}
            style={{position:"absolute",width:1,height:1,opacity:0}}
            onChange={event=>{
              selectVoiceMessage(event.currentTarget.files?.[0]||null);
              event.currentTarget.value="";
            }}/>
        </label>}
        <button type="button" onClick={()=>{controller.current?.abort();selectVoiceMessage(null);followTail.current=true;setNewBelow(false);setMessages([]);setPageHelpLink(null);setChoices([]);setStatus("");setSource("");setEvidenceUsed(false);setHistoryUsed(false);setDismissedIds([]);setCompletedIds([]);setEntryOpen(true);setContentStep(null);setContentVoice(false);setContentBrief("");setFormat("");setGuideLink(null);setTestChatOpen(false);setTestRevision(0);setGuidedTrack(null);setVideoGoal("all");setShowVideoSignIn(false);setNeedsPrivateSignIn(false);setVideoStep(null);setVideoPendingCategory(null);setVideoDraft(initialMessengerVideoDraft() as MessengerVideoDraft);}}>{t.reset}</button>
        <button type="submit" disabled={busy||!draft.trim()||(mode==="owned"&&!agree)}>{busy?t.loading:t.send}</button>
        {busy&&<button type="button" onClick={()=>controller.current?.abort()}>{t.cancel}</button>}
      </div>
    </form>
    {compact&&!contentVoice&&<MessengerAudioVideo locale={locale}
      initialGoal={videoDraft.goal||""} disabled={busy}/>}
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
