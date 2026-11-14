"use client";

import { useEffect, useRef, useState } from "react";
import { MeditationCourseEnquiry } from "./meditation-course-enquiry";
import { BookOpen, Check, ChevronDown, Clipboard, Download, FileText, Headphones, Leaf, RotateCcw, Sparkles, Square } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import type { GuidedMeditationFocus } from "./mandala-guided-course";
import type { ApprovedVideoConcept } from "./mandala-video-concept";
import { buildMandalaWriterRequest } from "@/lib/holistic-support/meditation-writer/mandala-bridge.mjs";
import { buildPersonalMeditationScript, isMeditationSafetyResponse } from "@/lib/mandala/personal-meditation-script.mjs";
import { buildAdaptiveMeditationOutline } from "@/lib/mandala/adaptive-meditation-course.mjs";
import { findLocalMeditationVoices, meditationNarrationEstimate, playMeditationNarration } from "@/lib/mandala/meditation-narration.mjs";
import css from "./mandala-personal-meditation.module.css";
import { MandalaCloudVoiceStudio } from "./mandala-cloud-voice-studio";

const accents = ["calm","confidence","clarity","boundaries","acceptance","motivation","rest","gratitude"] as const;
type Accent = (typeof accents)[number];
type ImageKey = "video"|"garden"|"water"|"light"|"home"|"forest"|"coast"|"mountain";
type ToneKey = "gentle"|"grounded"|"uplifting";
type LengthKey = 3|5|8|12;
type Technique = "imagery"|"grounding"|"body-awareness"|"self-kindness"|"mindful-noticing"|"future-step";
type Attention = "mixed"|"visual"|"sound"|"body"|"external";
type Depth = "light"|"reflective";
type Ending = "return"|"reflection"|"small-step";
type Moment = "any"|"morning"|"evening"|"before";
type Props = {
  locale:PublicLocale;theme:VideoTheme;wish:string;scene:string;sound:string;caption:string;
  audioSrc?:string|null;
  pace:"slow"|"dynamic";brightness:"soft"|"bright";
  affirmations:string[];affirmationsEnabled:boolean;
  focus:GuidedMeditationFocus;disabled:boolean;
  /** Optional standalone entry: one meditation + eight-day outline, without a purchase. */
  coursePreview?:boolean;
  /** Only the approved creative concept; no private draft is sent to AI. */
  approvedVideoConcept?:ApprovedVideoConcept|null;
  /** A locally composed user-approved course script. Never sent to a provider automatically. */
  seedScript?:string;
  onNarrationReady?:(file:File)=>Promise<boolean>;
  onNarrationInvalidated?:()=>void;
};
type CourseDay={id:string;number:number;title:string;motif:string};
type WriterOrigin="local"|"gemini_free"|"openrouter_free"|"edited"|null;
const copy = {
  en:{
    title:"Personal meditation",eyebrow:"FINAL STEP · YOUR SCRIPT",
    intro:"A personal script from this editor's theme, your own request, chosen goals, imagery, sound and affirmations. The script is authored locally; optional cloud narration requires separate consent.",
    filters:"Taken into account",theme:"Theme",scene:"Scene",sound:"Sound",phrases:"Affirmations",quiet:"Quiet",
    customize:"Additional meditation accents",selected:"Select up to 3 (optional)",extra:"One more personal emphasis · optional",
    placeholder:"For example: more inner steadiness before an important conversation",
    image:"Imagery",images:{video:"Current video scene",garden:"Garden",water:"Water",light:"Soft light",home:"Safe room",forest:"Forest",coast:"Coast",mountain:"Mountains"},
    meditationTheme:"Meditation topic",sameTheme:"Same as video",moment:"When to use it",moments:{any:"Any time",morning:"Morning",evening:"Evening",before:"Before a conversation"},
    method:"Practice method",methods:{imagery:"Guided imagery",grounding:"Grounding", "body-awareness":"Gentle body awareness", "self-kindness":"Self-kindness", "mindful-noticing":"Mindful noticing", "future-step":"Rehearse a small step"},
    attention:"Focus of attention",attentions:{mixed:"A little of everything",visual:"Visual images",sound:"Sounds",body:"Physical support",external:"Eyes-open surroundings"},
    depth:"Depth",depths:{light:"Light and simple",reflective:"Gentle reflection"},
    ending:"Finishing",endings:{return:"Return to the room",reflection:"A reflection prompt","small-step":"One practical next step"},
    voiceTitle:"Listen to your meditation",voiceDescription:"An installed, on-device voice reads the actual generated text with real pauses. No speech file is created.",
    listen:"Play with local voice",stopListening:"Stop narration",noVoice:"No installed local voice for this language. You can still edit and save your text.",
    voice:"Device voice",rate:"Reading speed",withMusic:"Play selected background sound quietly",audioFailure:"Background audio was not available; spoken narration can continue.",voiceEstimate:"Estimated listening",voicePart:"Part",voicePause:"Quiet pause",voiceReading:"Narration",voiceNote:"Playback requires an installed local device voice. This is a live preview, not an MP3 or a pre-rendered audio file.",voiceError:"Could not start local narration. Try another installed voice or browser.",
    tone:"Narration tone",tones:{gentle:"Very gentle",grounded:"Grounded",uplifting:"Encouraging"},
    length:"Approximate pace",minutes:"min",
    accents:{calm:"Calm",confidence:"Confidence",clarity:"Clarity",boundaries:"Boundaries",acceptance:"Acceptance",motivation:"Small steps",rest:"Rest",gratitude:"Gratitude"},
    generate:"Create personal meditation",regenerate:"Update meditation text",creating:"Script created. You can edit it below.",
     writerMode:"Text generation method",localMode:"Local · free",aiMode:"Free AI draft",imageryOptIn:"I choose optional gentle resource imagery and may stop at any time.",aiOptIn:"I consent to send only approved anonymous goal, imagery and style codes to free Gemini/OpenRouter. My personal video story, photos, recordings, profile and health data are not shared.",aiNeedsConsent:"Select both optional consents before AI generation.",aiBusy:"Creating AI draft…",aiFallback:"Free AI unavailable or draft not approved. Local script shown.",aiSignin:"Sign in with your account to use AI. Local script shown.",aiDraft:"AI draft · editorial review required",localDraft:"Locally composed · no external AI",editedDraft:"Text edited by you",
    edited:"Editable script",editHint:"Edit freely before copying or saving. No text is stored online.",
    copy:"Copy text",copied:"Copied",copyError:"Copy is unavailable here; select the text and copy manually.",
    download:"Save .txt",changed:"Settings have changed. Update the text to apply them.",
    safety:"A resource-oriented reflective script, not a diagnosis or substitute for treatment. Pause or stop whenever needed. For a clinical plan, ask a qualified practitioner.",
    privacy:"Text is composed locally. Optional cloud voice sends a chosen excerpt to Google only on explicit consent; no CRM save."
  },
  ru:{
    title:"Персональная медитация",eyebrow:"ПОСЛЕДНИЙ ШАГ · ВАШ ТЕКСТ",
    intro:"Сценарий по запросу клиента, теме, выбранным целям, видеосюжету, звуку и аффирмациям. Текст создаётся локально; отправка для облачной озвучки возможна только по отдельному согласию.",
    filters:"Учитываем",theme:"Тема",scene:"Сюжет",sound:"Звук",phrases:"Аффирмации",quiet:"Без звука",
    customize:"Дополнительные акценты медитации",selected:"Выберите до 3 (необязательно)",extra:"Ещё один личный акцент · необязательно",
    placeholder:"Например: больше внутренней опоры перед важным разговором",
    image:"Образ",images:{video:"Сюжет текущего видео",garden:"Сад",water:"Вода",light:"Мягкий свет",home:"Уютная комната",forest:"Лес",coast:"Морской берег",mountain:"Горы"},
    meditationTheme:"Тема медитации",sameTheme:"Как у видео",moment:"Когда использовать",moments:{any:"Когда удобно",morning:"Утром",evening:"Вечером",before:"Перед разговором"},
    method:"Метод медитации",methods:{imagery:"Образная практика",grounding:"Заземление","body-awareness":"Бережно к телу","self-kindness":"Самоподдержка","mindful-noticing":"Наблюдение","future-step":"Репетиция шага"},
    attention:"Куда направить внимание",attentions:{mixed:"Разные ощущения",visual:"Зрительные образы",sound:"Звуки",body:"Телесная опора",external:"Внешний мир · глаза открыты"},
    depth:"Глубина",depths:{light:"Легко и просто",reflective:"Мягкая рефлексия"},
    ending:"Завершение",endings:{return:"Вернуться в комнату",reflection:"Вопрос для размышления","small-step":"Один практический шаг"},
    voiceTitle:"Прослушать медитацию",voiceDescription:"Установленный локальный голос устройства читает сформированный текст с настоящими паузами. Аудиофайл при этом не создаётся.",
    listen:"Прослушать голосом устройства",stopListening:"Остановить озвучку",noVoice:"Для этого языка нет установленного локального голоса. Текст можно редактировать и сохранить.",
    voice:"Голос устройства",rate:"Скорость чтения",withMusic:"Тихо воспроизвести выбранный звуковой фон",audioFailure:"Фоновый звук недоступен; озвучка может продолжаться.",voiceEstimate:"Примерно прослушивание",voicePart:"Этап",voicePause:"Пауза",voiceReading:"Озвучка",voiceNote:"Нужен локальный голос, установленный на устройстве. Это реальное прослушивание, но не готовый MP3 или записанная дорожка.",voiceError:"Не удалось запустить озвучку. Попробуйте другой установленный голос или браузер.",
    tone:"Тон текста",tones:{gentle:"Очень мягкий",grounded:"Заземляющий",uplifting:"Вдохновляющий"},
    length:"Примерный ритм",minutes:"мин",
    accents:{calm:"Спокойствие",confidence:"Уверенность",clarity:"Ясность",boundaries:"Границы",acceptance:"Принятие",motivation:"Маленькие шаги",rest:"Отдых",gratitude:"Благодарность"},
    generate:"Сформировать персональную медитацию",regenerate:"Обновить текст медитации",creating:"Текст готов. Его можно отредактировать ниже.",
     writerMode:"Способ создания текста",localMode:"Локально · бесплатно",aiMode:"Черновик AI · бесплатно",imageryOptIn:"Я выбираю необязательные мягкие ресурсные образы; практику можно остановить.",aiOptIn:"Согласен передать Gemini/OpenRouter только обезличенные коды цели, образа и стиля. Мой сюжет, фото, записи, профиль и сведения о здоровье не передаются.",aiNeedsConsent:"Для генерации AI нужно оба согласия.",aiBusy:"Создаём черновик AI…",aiFallback:"Бесплатный AI недоступен или черновик не прошёл проверку. Показан локальный текст.",aiSignin:"Войдите в аккаунт для использования AI. Показан локальный текст.",aiDraft:"Черновик AI · необходима проверка",localDraft:"Создано локально · без внешнего AI",editedDraft:"Текст изменён вами",
    edited:"Текст персональной медитации",editHint:"Редактируйте свободно, затем скопируйте или сохраните. На сервер текст не записывается.",
    copy:"Скопировать",copied:"Скопировано",copyError:"Не удалось скопировать автоматически. Выделите текст вручную.",
    download:"Скачать .txt",changed:"Вы изменили фильтры. Нажмите «Обновить текст», чтобы их учесть.",
    safety:"Бережный образный текст для рефлексии, не диагноз и не замена лечению. Можно остановиться в любой момент. Клиническую программу проверяет специалист.",
    privacy:"Текст создаётся локально. В облачный сервис отправляется лишь выбранный отрывок после отдельного согласия, без сохранения в CRM."
  },
  es:{
    title:"Meditación personal",eyebrow:"ÚLTIMO PASO · TU GUION",
    intro:"Guion a partir de tu petición, metas elegidas, escena, sonido y afirmaciones. El guion se prepara localmente; la voz en la nube requiere consentimiento aparte.",
    filters:"Se tiene en cuenta",theme:"Tema",scene:"Escena",sound:"Sonido",phrases:"Afirmaciones",quiet:"Silencio",
    customize:"Acentos adicionales",selected:"Elige hasta 3 (opcional)",extra:"Otro matiz personal · opcional",
    placeholder:"Por ejemplo: más tranquilidad antes de una conversación importante",
    image:"Imagen",images:{video:"Escena actual",garden:"Jardín",water:"Agua",light:"Luz suave",home:"Habitación acogedora",forest:"Bosque",coast:"Costa",mountain:"Montañas"},
    meditationTheme:"Tema de la meditación",sameTheme:"Igual que el vídeo",moment:"Cuándo usarla",moments:{any:"Cuando quieras",morning:"Por la mañana",evening:"Por la noche",before:"Antes de una conversación"},
    method:"Método",methods:{imagery:"Imágenes guiadas",grounding:"Arraigo","body-awareness":"Conciencia corporal suave","self-kindness":"Autocompasión","mindful-noticing":"Observación consciente","future-step":"Ensayar un pequeño paso"},
    attention:"Canal de atención",attentions:{mixed:"Varios sentidos",visual:"Imágenes",sound:"Sonidos",body:"Apoyo físico",external:"Entorno con ojos abiertos"},
    depth:"Profundidad",depths:{light:"Ligera",reflective:"Reflexión suave"},
    ending:"Final",endings:{return:"Volver a la habitación",reflection:"Pregunta de reflexión","small-step":"Un paso práctico"},
    voiceTitle:"Escuchar la meditación",voiceDescription:"Una voz local instalada en el dispositivo lee el texto creado con pausas reales. No se genera un archivo de audio.",
    listen:"Escuchar con voz local",stopListening:"Detener la voz",noVoice:"No hay voz local instalada para este idioma. Puedes editar y guardar el texto.",
    voice:"Voz del dispositivo",rate:"Velocidad de lectura",withMusic:"Reproducir el sonido seleccionado de fondo",audioFailure:"El sonido de fondo no está disponible; la voz puede continuar.",voiceEstimate:"Duración aproximada",voicePart:"Parte",voicePause:"Pausa",voiceReading:"Voz",voiceNote:"Necesitas una voz local instalada. Es una reproducción real, no un MP3 ni un archivo de audio renderizado.",voiceError:"No se pudo iniciar la voz local. Prueba otra voz instalada o navegador.",
    tone:"Tono de narración",tones:{gentle:"Muy suave",grounded:"Con los pies en la tierra",uplifting:"Inspirador"},
    length:"Ritmo aproximado",minutes:"min",
    accents:{calm:"Calma",confidence:"Confianza",clarity:"Claridad",boundaries:"Límites",acceptance:"Aceptación",motivation:"Pasos pequeños",rest:"Descanso",gratitude:"Gratitud"},
    generate:"Crear meditación personal",regenerate:"Actualizar el guion",creating:"Guion creado. Puedes editarlo abajo.",
     writerMode:"Método de creación",localMode:"Local · gratis",aiMode:"Borrador IA · gratis",imageryOptIn:"Elijo imágenes suaves opcionales y puedo parar en cualquier momento.",aiOptIn:"Acepto enviar a Gemini/OpenRouter solo códigos anónimos de objetivo, imagen y estilo. No se envían mi historia, fotos, audio, perfil ni datos de salud.",aiNeedsConsent:"Selecciona ambos consentimientos para usar IA.",aiBusy:"Creando borrador IA…",aiFallback:"La IA gratuita no está disponible o el texto no fue aprobado. Se muestra el texto local.",aiSignin:"Inicia sesión para usar IA. Se muestra el texto local.",aiDraft:"Borrador IA · requiere revisión",localDraft:"Creado localmente · sin IA externa",editedDraft:"Texto editado por ti",
    edited:"Texto editable",editHint:"Edita el guion antes de copiarlo o guardarlo. No se almacena en línea.",
    copy:"Copiar texto",copied:"Copiado",copyError:"No se puede copiar automáticamente. Selecciona el texto y cópialo.",
    download:"Guardar .txt",changed:"Has cambiado los filtros. Actualiza el texto para aplicarlos.",
    safety:"Un guion reflexivo, no diagnóstico ni sustituto de tratamiento. Puedes detenerlo cuando quieras. Un profesional debe revisar un plan clínico.",
    privacy:"Texto creado localmente. La voz en la nube envía solo el fragmento aprobado a Google; no se guarda en CRM."
  }
} as const;
const themeLabels = {
  en:{money:"Money",energy:"Energy",relationships:"Relationships",goals:"Goals",life:"Meaning",health:"Wellbeing"},
  ru:{money:"Деньги",energy:"Энергия",relationships:"Отношения",goals:"Цели",life:"Смыслы",health:"Самочувствие"},
  es:{money:"Dinero",energy:"Energía",relationships:"Relaciones",goals:"Metas",life:"Sentido",health:"Bienestar"}
} as const;

const courseCopy={
  ru:{
    title:"Курсы медитаций",eyebrow:"БЕСПЛАТНО · ПЕРВЫЙ ДЕНЬ",
    intro:"Создайте первую медитацию, настройте её и посмотрите темы следующих семи дней.",
    request:"О чём будет ваша медитация?",placeholder:"Например: хочу спокойно выражать свои желания и сохранять внутреннюю опору",
    regenerate:"Сгенерировать заново",sequence:"Ваша программа на 8 дней",
    planHint:"Восемь связанных тем: первый текст готов. Выберите следующие сессии, чтобы создавать тексты локально по одной. Аудио и видео не создаются и не оплачиваются автоматически.",generateSession:"Создать текст локально",openSession:"Открыть текст",sessionReady:"Текст готов",
    day:"День",first:"Текст первой медитации готов",next:"Тема будущей медитации",
    offerTitle:"Хотите продолжить все 8 дней?",offerText:"Закажите персональный курс: восемь связанных медитаций с постепенным развитием темы и проверкой специалистом.",
    order:"Запросить курс из 8 медитаций",orderNote:"Сначала обсуждение программы и условий. Эта кнопка не проводит оплату и не оформляет заказ автоматически.",
  },
  en:{
    title:"Meditation courses",eyebrow:"FREE · DAY ONE",
    intro:"Create your first meditation, adjust its settings, and preview the next seven daily topics.",
    request:"What would you like to focus on?",placeholder:"For example: speaking up calmly while staying grounded",
    regenerate:"Generate again",sequence:"Your 8-day meditation outline",
    planHint:"Eight connected topics: the first script is ready. Select any later session to create its local text individually. Audio and videos are never created or purchased automatically.",generateSession:"Create local script",openSession:"Open script",sessionReady:"Script ready",
    day:"Day",first:"Your first meditation text is ready",next:"Future meditation topic",
    offerTitle:"Continue for all eight days?",offerText:"Request a personal series of eight connected meditations, progressing gently through your goal and reviewed by a practitioner.",
    order:"Request the 8-meditation course",orderNote:"First discuss the plan and terms. This link does not charge you or place an order.",
  },
  es:{
    title:"Cursos de meditación",eyebrow:"GRATIS · PRIMER DÍA",
    intro:"Crea tu primera meditación, ajusta sus parámetros y conoce los temas de los siete días siguientes.",
    request:"¿Qué te gustaría trabajar?",placeholder:"Por ejemplo: comunicar mis deseos con calma y sentir más apoyo",
    regenerate:"Generar de nuevo",sequence:"Tu programa de meditación de 8 días",
    planHint:"Ocho temas relacionados: ya está el primer guion. Elige cada sesión posterior para crear su texto localmente. El audio y el vídeo no se crean ni se compran automáticamente.",generateSession:"Crear guion local",openSession:"Abrir guion",sessionReady:"Guion listo",
    day:"Día",first:"Texto del primer día preparado",next:"Tema de una futura meditación",
    offerTitle:"¿Quieres continuar durante ocho días?",offerText:"Solicita ocho meditaciones personales conectadas y revisadas por un profesional, con un progreso suave hacia tu objetivo.",
    order:"Solicitar curso de 8 meditaciones",orderNote:"Primero se acuerdan programa y condiciones. El enlace no realiza un pago ni un pedido.",
  },
} as const;

export function MandalaPersonalMeditation({
  locale,theme,wish,scene,sound,caption,audioSrc,pace,brightness,affirmations,affirmationsEnabled,focus,disabled,coursePreview=false,approvedVideoConcept=null,seedScript,onNarrationReady,onNarrationInvalidated
}:Props) {
  const t=copy[locale];
  const course=courseCopy[locale];
  const [courseRequest,setCourseRequest]=useState(wish);
  const [courseDays,setCourseDays]=useState<CourseDay[]>([]);
  const [courseFocus,setCourseFocus]=useState<VideoTheme|null>(null);
  const [courseScripts,setCourseScripts]=useState<Record<number,{text:string;origin:WriterOrigin}>>({});
  const [selectedCourseDay,setSelectedCourseDay]=useState(1);
  const effectiveWish=coursePreview?courseRequest:wish;
  const [selected,setSelected]=useState<Accent[]>([]);
  const [image,setImage]=useState<ImageKey>("video");
  const [tone,setTone]=useState<ToneKey>("gentle");
  const [length,setLength]=useState<LengthKey>(5);
  const [technique,setTechnique]=useState<Technique>("imagery");
  const [meditationTheme,setMeditationTheme]=useState<VideoTheme|"inherit">("inherit");
  const [moment,setMoment]=useState<Moment>("any");
  const [attention,setAttention]=useState<Attention>("mixed");
  const [depth,setDepth]=useState<Depth>("light");
  const [ending,setEnding]=useState<Ending>("return");
  const [rate,setRate]=useState(0.9);
  const [voices,setVoices]=useState<SpeechSynthesisVoice[]>([]);
  const [voiceName,setVoiceName]=useState("");
  const [listening,setListening]=useState(false);
  const [progress,setProgress]=useState({index:0,total:0,kind:"speech"});
  const [withMusic,setWithMusic]=useState(false);
  const narratorRef=useRef<{stop:(reason?:string)=>void}|null>(null);
  const ambientRef=useRef<HTMLAudioElement>(null);
  const [extra,setExtra]=useState("");
  const [script,setScript]=useState("");
  const seededScriptRef=useRef("");
  const [variantIndex,setVariantIndex]=useState(0);
  const [generatedFor,setGeneratedFor]=useState("");
  const [notice,setNotice]=useState("");
  const [generationMode,setGenerationMode]=useState<"local"|"ai">("local");
  const [imageryConsent,setImageryConsent]=useState(false);
  const [externalAiConsent,setExternalAiConsent]=useState(false);
  const [aiBusy,setAiBusy]=useState(false);
  const [writerOrigin,setWriterOrigin]=useState<WriterOrigin>(null);
  const writerAbortRef=useRef<AbortController|null>(null);
  const editorRevisionRef=useRef(0);
  const actualTheme=meditationTheme==="inherit"?theme:meditationTheme;
  const signature=JSON.stringify([locale,theme,meditationTheme,effectiveWish,scene,sound,caption,pace,brightness,affirmationsEnabled,affirmations,
    focus.difficulty,focus.goal,focus.goals,focus.details,selected,image,tone,length,extra,technique,attention,depth,ending,moment,approvedVideoConcept?.signature||null,generationMode]);
  const latestSignatureRef=useRef(signature);
  latestSignatureRef.current=signature;
  useEffect(()=>{writerAbortRef.current?.abort();},[signature]);
  useEffect(()=>()=>writerAbortRef.current?.abort(),[]);
  const stale=Boolean(script&&generatedFor!==signature);
  useEffect(()=>{
    if(!seedScript){
      const previousSeed=seededScriptRef.current;
      if(previousSeed){
        seededScriptRef.current="";
        setScript(current=>current===previousSeed?"":current);
        setGeneratedFor("");
      }
      return;
    }
    if(seededScriptRef.current===seedScript)return;
    seededScriptRef.current=seedScript;
    setScript(seedScript);setGeneratedFor(signature);setNotice("");setWriterOrigin("local");
    setCourseDays([]);setCourseFocus(null);setCourseScripts({});setSelectedCourseDay(1);
  },[seedScript,signature]);
  const chosenVoice=voices.find(item=>item.name===voiceName)||voices[0];
  const estimatedSeconds=script?meditationNarrationEstimate(script,rate):0;
  useEffect(()=>{
    if(typeof window==="undefined"||!("speechSynthesis" in window))return;
    const synth=window.speechSynthesis;
    const refresh=()=>setVoices(findLocalMeditationVoices(synth.getVoices(),locale));
    refresh();
    synth.addEventListener?.("voiceschanged",refresh);
    return ()=>synth.removeEventListener?.("voiceschanged",refresh);
  },[locale]);
  useEffect(()=>()=>{
    narratorRef.current?.stop();
    ambientRef.current?.pause();
  },[]);
  useEffect(()=>{
    const onHidden=()=>{
      if(document.hidden){
        narratorRef.current?.stop();
        narratorRef.current=null;
        ambientRef.current?.pause();
        setListening(false);
      }
    };
    document.addEventListener("visibilitychange",onHidden);
    return ()=>document.removeEventListener("visibilitychange",onHidden);
  },[]);
  function stopNarration(){
    narratorRef.current?.stop();
    narratorRef.current=null;
    ambientRef.current?.pause();
    setListening(false);
    setProgress({index:0,total:0,kind:"speech"});
  }
  function toggleNarration(){
    if(listening){stopNarration();return;}
    if(typeof window==="undefined"||!("speechSynthesis" in window)||
      typeof SpeechSynthesisUtterance==="undefined"){
      setNotice(t.noVoice);return;
    }
    const local=findLocalMeditationVoices(window.speechSynthesis.getVoices(),locale);
    setVoices(local);
    const voice=local.find(item=>item.name===voiceName)||local[0];
    if(!voice){setNotice(t.noVoice);return;}
    if(withMusic&&audioSrc){
      const player=ambientRef.current||new Audio();
      ambientRef.current=player;
      if(player.getAttribute("src")!==audioSrc)player.src=audioSrc;
      player.loop=true;
      player.preload="none";
      player.volume=0.2;
      player.currentTime=0;
      void player.play().catch(()=>{
        setNotice(t.audioFailure);
      });
    }
    try{
      const active=playMeditationNarration({
        script,locale,rate,voice,synthesis:window.speechSynthesis,Utterance:SpeechSynthesisUtterance,
        onProgress:(index,total,kind)=>setProgress({index,total,kind}),
        onStop:reason=>{
          ambientRef.current?.pause();
          narratorRef.current=null;
          setListening(false);
          setProgress({index:0,total:0,kind:"speech"});
          if(reason==="error")setNotice(t.voiceError);
        }
      });
      narratorRef.current=active.active?active:null;
      setListening(active.active);
      if(active.active)setNotice("");
    }catch{
      ambientRef.current?.pause();
      setNotice(t.noVoice);
      setListening(false);
    }
  }
  const toggle=(accent:Accent)=>setSelected(current=>current.includes(accent)
    ? current.filter(item=>item!==accent)
    : current.length<3?[...current,accent]:current);
  const generate=async()=>{
    if(disabled||aiBusy||writerAbortRef.current)return;
    if(generationMode==="ai"&&(!imageryConsent||!externalAiConsent)){
      setNotice(t.aiNeedsConsent);return;
    }
    stopNarration();
    const startSignature=signature;
    const startEditorRevision=editorRevisionRef.current;
    const plan=coursePreview?buildAdaptiveMeditationOutline({
      locale,theme:actualTheme,explicitTheme:meditationTheme!=="inherit",
      request:effectiveWish||focus.goal,difficulty:focus.difficulty,details:focus.details,
    }):null;
    const nextVariant=script?(variantIndex+1)%3:variantIndex;
    let next=buildPersonalMeditationScript({
      locale,theme:plan?.focusTheme||actualTheme,wish:effectiveWish,
      scene:coursePreview&&plan?plan.days[0].motif:scene,
      sound,caption,pace,brightness,affirmationsEnabled,affirmations,
      focus,accents:selected,image,tone,length,extra,technique,attention,depth,ending,moment,
      variantIndex:nextVariant,
    });
    const safetyResponse=isMeditationSafetyResponse(next,locale);
    let origin:WriterOrigin="local";
    let message=safetyResponse?"":t.creating;
    if(!safetyResponse&&generationMode==="ai"){
      // The approved video concept becomes locally computed, allowlisted
      // categories. Raw descriptions/notes are never sent to the unpaid AI.
      const visualWords=(approvedVideoConcept?.sceneOutline||[])
        .slice(0,5).join(" ").toLocaleLowerCase().slice(0,500);
      const motifId=image==="home"||/room|home|комнат|дом|habitaci[oó]n|hogar/u.test(visualWords)
        ?"comfortable_corner":image==="light"||/light|sun|candle|свет|солн|luz|sol/u.test(visualWords)
        ?"small_light":"gentle_nature";
      const avoidWords=(approvedVideoConcept?.avoidImagery||[])
        .map(word=>word.toLocaleLowerCase().slice(0,100)).join(" ");
      const avoidElements=[
        ...(/water|sea|ocean|вода|воды|море|agua|mar/u.test(avoidWords)?["water"]:[]),
        ...(/animal|bird|живот|птиц|animales|aves/u.test(avoidWords)?["animals"]:[]),
        ...(/dark|темнот|oscuro|oscuridad/u.test(avoidWords)?["darkness"]:[]),
        ...(/people|persons|люд|persona/u.test(avoidWords)?["people"]:[]),
      ];
      const bridge=buildMandalaWriterRequest({
        locale,theme:actualTheme,selectedGoals:[actualTheme],motifId,avoidElements,
        durationMinutes:length<=5?5:length<=8?10:15,
        styleId:tone==="grounded"?"grounded_practical":
          tone==="uplifting"?"poetic_contained":"gentle_simple",
        allowPersonalNotes:false,
      });
      if(bridge.status==="ready"){
        const controller=new AbortController();
        writerAbortRef.current=controller;
        setAiBusy(true);
        try{
          const response=await fetch("/api/holistic-support/meditation-writer/brief",{
            method:"POST",credentials:"same-origin",cache:"no-store",redirect:"error",
            headers:{"Content-Type":"application/json","Accept":"application/json"},
            signal:controller.signal,
            body:JSON.stringify({...bridge.request,output:"meditation",
              resourceImageryOptIn:true,generationMode:"llm",
              externalModelOptIn:true,providerPreference:"auto"}),
          });
          if(!response.ok)throw Error(response.status===401?"AI_AUTH_REQUIRED":"AI_UNAVAILABLE");
          const data=await response.json() as {
            status?:string;modelUsed?:boolean;provider?:string;
            segments?:Array<{text?:string;optionalSilenceSeconds?:number}>;
          };
          if(data.status!=="draft_review_required"||data.modelUsed!==true||
            !["gemini_free","openrouter_free"].includes(data.provider||"")||
            !Array.isArray(data.segments)||data.segments.length!==7||
            data.segments.some(part=>typeof part?.text!=="string"||
              part.text.trim().length<35||part.text.length>2400))
            throw Error("AI_UNAVAILABLE");
          const pauseLabel=locale==="ru"?"Пауза по желанию":
            locale==="es"?"Pausa opcional":"Optional quiet pause";
          const pauseUnit=locale==="ru"?"сек.":locale==="es"?"segundos":"seconds";
          const narrated=data.segments.map(part=>{
            const seconds=Number(part.optionalSilenceSeconds);
            return part.text!.trim()+
              (Number.isFinite(seconds)&&seconds>0?
                "\n["+pauseLabel+": "+Math.min(15,Math.round(seconds))+" "+pauseUnit+"]":"");
          }).join("\n\n");
          if(narrated.length>12000||narrated.length<350)
            throw Error("AI_UNAVAILABLE");
          next=narrated;
          origin=data.provider as WriterOrigin;
          message=t.aiDraft;
        }catch(error){
          message=error instanceof Error&&error.message==="AI_AUTH_REQUIRED"?
            t.aiSignin:t.aiFallback;
        }finally{
          if(writerAbortRef.current===controller)writerAbortRef.current=null;
          setAiBusy(false);
        }
        if(controller.signal.aborted||latestSignatureRef.current!==startSignature||
          editorRevisionRef.current!==startEditorRevision)return;
      }else{
        message=t.aiFallback;
      }
    }
    if(latestSignatureRef.current!==startSignature||
      editorRevisionRef.current!==startEditorRevision)return;
    setVariantIndex(nextVariant);
    setScript(next);setGeneratedFor(signature);setNotice(message);
    setWriterOrigin(origin);
    if(coursePreview&&!safetyResponse&&plan){
      setCourseFocus(plan.focusTheme as VideoTheme);
      setCourseDays(plan.days.map(({id,number,title,motif})=>({id,number,title,motif})));
      setCourseScripts({1:{text:next,origin}});setSelectedCourseDay(1);
    }else if(coursePreview){
      setCourseDays([]);setCourseFocus(null);setCourseScripts({});
    }
  };
  function openCourseSession(dayNumber:number){
    if(!coursePreview||disabled||aiBusy||courseDays.length!==8||
      !Number.isInteger(dayNumber)||dayNumber<1||dayNumber>8)return;
    const day=courseDays[dayNumber-1];
    if(!day)return;
    stopNarration();
    const saved=courseScripts[dayNumber];
    if(saved){
      setScript(saved.text);setWriterOrigin(saved.origin);
      setSelectedCourseDay(dayNumber);setGeneratedFor(signature);setNotice("");
      return;
    }
    // Sessions 2–8 are an explicit local request, not seven hidden LLM calls.
    // The first-party composer retains its safety gate and approved resource
    // scenes. No client note, file, audio, billing or personal data is sent.
    const output=buildPersonalMeditationScript({
      locale,theme:courseFocus||actualTheme,wish:effectiveWish,
      scene:day.motif,sound,caption,pace,brightness,
      affirmationsEnabled,affirmations,focus,accents:selected,
      image,tone,length,extra,technique,attention,depth,ending,moment,
      variantIndex:(dayNumber-1)%3,
    });
    if(isMeditationSafetyResponse(output,locale)){
      setNotice(t.safety);return;
    }
    setCourseScripts(current=>({...current,
      [dayNumber]:{text:output,origin:"local"}}));
    setScript(output);setWriterOrigin("local");setSelectedCourseDay(dayNumber);
    setGeneratedFor(signature);setNotice(t.creating);
  }
  async function copyScript(){
    if(!script)return;
    try{
      await navigator.clipboard.writeText(script);
      setNotice(t.copied);
    }catch{setNotice(t.copyError);}
  }
  const download=()=>{
    if(!script)return;
    const url=URL.createObjectURL(new Blob([script+"\n"],{type:"text/plain;charset=utf-8"}));
    const link=document.createElement("a");
    link.href=url;link.download="holistic-house-personal-meditation-"+locale+".txt";
    document.body.appendChild(link);link.click();link.remove();
    window.setTimeout(()=>URL.revokeObjectURL(url),3000);
  };
  return (
    <section className={css.panel} id="personal-meditation" data-video-personal-meditation
      aria-labelledby="personal-meditation-heading">
      <header className={css.heading}>
        <span className={css.icon}><Leaf size={20} aria-hidden="true"/></span>
        <div><small>{coursePreview?course.eyebrow:t.eyebrow}</small><h3 id="personal-meditation-heading">{coursePreview?course.title:t.title}</h3></div>
      </header>
      <p className={css.intro}>{coursePreview?course.intro:t.intro}</p>
      {coursePreview?<label className={css.courseRequest} htmlFor="meditation-course-request">
        {course.request}
        <textarea id="meditation-course-request" data-meditation-course-request
          rows={2} maxLength={160} disabled={disabled}
          placeholder={course.placeholder} value={courseRequest}
          onChange={event=>setCourseRequest(event.currentTarget.value)}/>
      </label>:null}
      <div className={css.context} data-meditation-context aria-label={t.filters}>
        <small>{t.filters}</small>
        <div className={css.chips}>
          <span>{t.theme}: {themeLabels[locale][coursePreview&&courseFocus&&!stale?courseFocus:actualTheme]}</span>
          <span>{t.scene}: {scene}</span>
          <span>{t.sound}: {sound||t.quiet}</span>
          <span>{t.phrases}: {affirmationsEnabled?affirmations.length:0}</span>
        </div>
      </div>
      <div className={css.quickGrid} data-meditation-main-filters>
            <label>{t.meditationTheme}
              <select data-meditation-topic value={meditationTheme} disabled={disabled}
                onChange={event=>setMeditationTheme(event.target.value as VideoTheme|"inherit")}>
                <option value="inherit">{t.sameTheme}</option>
                {(Object.keys(themeLabels[locale]) as VideoTheme[]).map(id=>
                  <option value={id} key={id}>{themeLabels[locale][id]}</option>)}
              </select>
            </label>
        <label>{t.method}
          <select data-meditation-method value={technique} disabled={disabled}
            onChange={event=>setTechnique(event.target.value as Technique)}>
            {(Object.keys(t.methods) as Technique[]).map(id=>
              <option value={id} key={id}>{t.methods[id]}</option>)}
          </select>
        </label>
        <label>{t.length}
          <select data-meditation-length value={length} disabled={disabled}
            onChange={event=>setLength(Number(event.target.value) as LengthKey)}>
            {([3,5,8,12] as const).map(value=><option value={value} key={value}>
              {value} {t.minutes}
            </option>)}
          </select>
        </label>
      </div>
          <label className={css.extra}>{t.extra}
            <textarea rows={2} maxLength={160} value={extra} disabled={disabled}
              data-meditation-extra placeholder={t.placeholder}
              onChange={event=>setExtra(event.currentTarget.value)}/>
          </label>
      <details className={css.customize} data-meditation-accents>
        <summary><Sparkles size={16} aria-hidden="true"/>{t.customize}<ChevronDown size={16} aria-hidden="true"/></summary>
        <div className={css.customBody}>
          <p>{t.selected}</p>
          <div className={css.accentChips} role="group" aria-label={t.customize}>
            {accents.map(id=><button key={id} type="button" disabled={disabled}
              aria-pressed={selected.includes(id)} data-meditation-accent={id} onClick={()=>toggle(id)}>
              {selected.includes(id)?<Check size={13} aria-hidden="true"/>:null}{t.accents[id]}
            </button>)}
          </div>
          <div className={css.selectors}>
            <label>{t.moment}
              <select data-meditation-moment value={moment} disabled={disabled}
                onChange={event=>setMoment(event.target.value as Moment)}>
                {(Object.keys(t.moments) as Moment[]).map(id=>
                  <option value={id} key={id}>{t.moments[id]}</option>)}
              </select>
            </label>
            <label>{t.image}
              <select data-meditation-imagery value={image} disabled={disabled}
                onChange={event=>setImage(event.target.value as ImageKey)}>
                {(Object.keys(t.images) as ImageKey[]).map(id=><option key={id} value={id}>{t.images[id]}</option>)}
              </select>
            </label>
            <label>{t.tone}
              <select data-meditation-tone value={tone} disabled={disabled}
                onChange={event=>setTone(event.target.value as ToneKey)}>
                {(Object.keys(t.tones) as ToneKey[]).map(id=><option key={id} value={id}>{t.tones[id]}</option>)}
              </select>
            </label>
            <label>{t.attention}
              <select data-meditation-attention value={attention} disabled={disabled}
                onChange={event=>setAttention(event.target.value as Attention)}>
                {(Object.keys(t.attentions) as Attention[]).map(id=>
                  <option key={id} value={id}>{t.attentions[id]}</option>)}
              </select>
            </label>
            <label>{t.depth}
              <select data-meditation-depth value={depth} disabled={disabled}
                onChange={event=>setDepth(event.target.value as Depth)}>
                {(Object.keys(t.depths) as Depth[]).map(id=>
                  <option key={id} value={id}>{t.depths[id]}</option>)}
              </select>
            </label>
            <label>{t.ending}
              <select data-meditation-ending value={ending} disabled={disabled}
                onChange={event=>setEnding(event.target.value as Ending)}>
                {(Object.keys(t.endings) as Ending[]).map(id=>
                  <option key={id} value={id}>{t.endings[id]}</option>)}
              </select>
            </label>
          </div>

        </div>
      </details>
      <div className={css.writerModes} role="group" aria-label={t.writerMode} data-meditation-writer-choices>
        <button type="button" data-meditation-writer-mode="local"
          aria-pressed={generationMode==="local"} disabled={disabled||aiBusy}
          onClick={()=>{setGenerationMode("local");setNotice("");}}>
          {t.localMode}
        </button>
        <button type="button" data-meditation-writer-mode="ai"
          aria-pressed={generationMode==="ai"} disabled={disabled||aiBusy}
          onClick={()=>{setGenerationMode("ai");setNotice("");}}>
          {t.aiMode}
        </button>
      </div>
      {generationMode==="ai"?<div className={css.aiPermissions} data-meditation-ai-opt-in>
        <label><input type="checkbox" checked={imageryConsent}
          disabled={disabled||aiBusy} onChange={event=>setImageryConsent(event.target.checked)}/>
          <span>{t.imageryOptIn}</span></label>
        <label><input type="checkbox" checked={externalAiConsent}
          disabled={disabled||aiBusy} onChange={event=>setExternalAiConsent(event.target.checked)}/>
          <span>{t.aiOptIn}</span></label>
      </div>:null}
      <button type="button" className={css.generate} data-meditation-generate
        disabled={disabled||aiBusy||(generationMode==="ai"&&(!imageryConsent||!externalAiConsent))}
        onClick={()=>void generate()}>
        {script?<RotateCcw size={19} aria-hidden="true"/>:<Sparkles size={19} aria-hidden="true"/>}
        {aiBusy?t.aiBusy:script?(coursePreview?course.regenerate:t.regenerate):locale==="ru"?"Сгенерировать текст медитации":locale==="es"?"Generar texto de meditación":"Generate meditation text"}
      </button>
      {script?<div className={css.result} data-meditation-result>
        <p className={css.writerOrigin} data-meditation-generation-source={writerOrigin||"unknown"}>
          {writerOrigin==="gemini_free"?"Gemini Free · "+t.aiDraft:
            writerOrigin==="openrouter_free"?"OpenRouter Free · "+t.aiDraft:
            writerOrigin==="edited"?t.editedDraft:t.localDraft}
        </p>
        <div className={css.resultHead}>
          <strong><FileText size={17} aria-hidden="true"/>{t.edited}</strong>
          <span>{script.length.toLocaleString(locale)} </span>
        </div>
        {stale?<p className={css.stale} role="status">{t.changed}</p>:null}
        <textarea data-meditation-script aria-label={t.edited} rows={15}
          maxLength={12000} value={script} onChange={event=>{
            const value=event.currentTarget.value;
            editorRevisionRef.current++;
            stopNarration();setScript(value);setWriterOrigin("edited");setNotice("");
            if(coursePreview)setCourseScripts(current=>({...current,
              [selectedCourseDay]:{text:value,origin:"edited"}}));
          }}/>
        <div className={css.narration} data-meditation-narration>
          <div className={css.narrationHeading}>
            <strong><Headphones size={17} aria-hidden="true"/>{t.voiceTitle}</strong>
            <small>{t.voiceEstimate}: ~{Math.max(1,Math.ceil(estimatedSeconds/60))} {t.minutes}</small>
          </div>
          <p>{t.voiceDescription}</p>
          <div className={css.narrationControls}>
            {voices.length>1?<label>{t.voice}
              <select data-meditation-voice value={voiceName||chosenVoice?.name||""} disabled={listening}
                onChange={event=>setVoiceName(event.target.value)}>
                {voices.map((voice,index)=><option value={voice.name} key={voice.voiceURI+"-"+index}>
                  {voice.name}
                </option>)}
              </select>
            </label>:null}
            <label>{t.rate}
              <select data-meditation-rate value={rate} disabled={listening}
                onChange={event=>setRate(Number(event.target.value))}>
                <option value={0.75}>0.75×</option><option value={0.9}>0.9×</option>
                <option value={1}>1×</option>
              </select>
            </label>
          </div>
          {audioSrc?<label className={css.musicChoice}>
            <input data-meditation-with-music type="checkbox" checked={withMusic}
              disabled={listening} onChange={event=>setWithMusic(event.currentTarget.checked)}/>
            {t.withMusic}
          </label>:null}
          <button type="button" className={css.listen} data-meditation-listen
            aria-pressed={listening} onClick={toggleNarration}>
            {listening?<Square size={17} aria-hidden="true"/>:<Headphones size={17} aria-hidden="true"/>}
            {listening?t.stopListening:t.listen}
          </button>
          {listening&&progress.total>0?<div className={css.narrationProgress}
            data-meditation-voice-progress aria-label={t.voiceReading}>
            <span>{progress.kind==="pause"?t.voicePause:t.voicePart} · {progress.index}/{progress.total}</span>
            <progress value={progress.index} max={progress.total} aria-label={t.voiceReading}/>
          </div>:null}
          {!voices.length?<p className={css.voiceHint} role="note">{t.noVoice}</p>:null}
          <small className={css.voiceHint}>{t.voiceNote}</small>
        </div>
        <MandalaCloudVoiceStudio locale={locale} sourceText={script} ambientSrc={audioSrc}
          onAudioReady={onNarrationReady} onAudioInvalidated={onNarrationInvalidated}/>
        <div className={css.actions}>
          <button type="button" data-meditation-copy onClick={()=>void copyScript()}>
            <Clipboard size={16} aria-hidden="true"/>{t.copy}
          </button>
          <button type="button" data-meditation-download onClick={download}>
            <Download size={16} aria-hidden="true"/>{t.download}
          </button>
        </div>
        <p className={css.helper}>{t.editHint}</p>
      </div>:null}
      {coursePreview&&script&&!stale&&courseDays.length===8?
        <section className={css.courseOutline} data-meditation-eight-day-plan aria-labelledby="meditation-course-outline-heading">
          <div className={css.courseOutlineHeader}>
            <BookOpen size={20} aria-hidden="true"/>
            <h4 id="meditation-course-outline-heading">{course.sequence}</h4>
          </div>
          <p>{course.planHint}</p>
          <ol className={css.courseDays}>
            {courseDays.map((day,index)=><li key={day.id} data-meditation-course-day={day.number}>
              <span>{course.day} {day.number}</span>
              <div><strong>{day.title}</strong><small>{day.motif}</small></div>
              <em>{index===0?course.first:courseScripts[day.number]?course.sessionReady:course.next}</em>
              <button type="button" className={css.courseSessionAction}
                data-meditation-course-create-day={day.number}
                aria-pressed={selectedCourseDay===day.number}
                disabled={disabled||aiBusy} onClick={()=>openCourseSession(day.number)}>
                {courseScripts[day.number]?course.openSession:course.generateSession}
              </button>
            </li>)}
          </ol>
          <div className={css.courseOffer} data-meditation-eight-day-offer>
            <h4>{course.offerTitle}</h4>
            <p>{course.offerText}</p>
            <MeditationCourseEnquiry key={signature} locale={locale} focus={courseFocus||actualTheme}/>
            <small>{course.orderNote}</small>
          </div>
        </section>:null}
      {notice?<p className={css.notice} role="status" aria-live="polite">{notice}</p>:null}
      <p className={css.safety}>{t.safety}</p>
      <p className={css.privacy}><Check size={14} aria-hidden="true"/>{t.privacy}</p>
    </section>
  );
}
