"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import Link from "next/link";
import {ArrowLeft,ArrowRight,Check,Download,Play,Pause,Share2,Video,Save,LockKeyhole} from "lucide-react";
import {appFetch} from "@/lib/app/client-fetch";
import {savePrivateMp4} from "@/lib/mandala/signed-private-video-upload.mjs";
import {prepareBrowserPhoto,SUPPORT_PHOTO_ACCEPT} from "@/lib/mandala/prepare-browser-photo";
import {VIDEO_GIFT_DURATION,VIDEO_GIFT_FREE_MOTIONS,
  VIDEO_GIFT_AI_MOTIONS,VIDEO_GIFT_PALETTES,
  validateVideoGiftDraft} from "@/lib/mandala/video-gift-contract.mjs";
import {VIDEO_GIFT_EMOTIONS,VIDEO_GIFT_STYLES,getGiftEmotionCategory,getGiftEmotionMessage,
 getGiftEmotionStyle,suggestGiftEmotionText} from "@/lib/mandala/video-gift-emotions.mjs";
import type {GiftEmotionCategoryId,GiftEmotionMessageId,GiftEmotionStyleId} from "@/lib/mandala/video-gift-emotions.mjs";
import type {VideoGiftOccasion,VideoGiftMotion,VideoGiftAspect,VideoGiftPalette,
  VideoGiftSubject,VideoGiftManifest} from "@/lib/mandala/video-gift-contract.mjs";
import {VIDEO_GIFT_SIZES,paintVideoGiftFrame,exportVideoGiftMp4} from "@/lib/mandala/video-gift-browser";
import {GIFT_VISUAL_GROUPS,listGiftApprovedScenes,defaultGiftVisualGroup} from "@/lib/mandala/video-gift-clip-catalog.mjs";
import type {GiftVisualGroup} from "@/lib/mandala/video-gift-clip-catalog.mjs";
import type {GiftSound} from "@/lib/mandala/video-gift-browser";
import styles from "./mandala-video-gift.module.css";

const COPY={
  ru:{
    title:"Живая открытка",eyebrow:"PERSONAL VIDEO GIFT",tagline:"Подарок из любимой фотографии — бесплатно, прямо на вашем устройстве.",
    steps:["Послание","Фотография","Движение","Пожелание","Музыка","Готово"],
    prev:"Назад",next:"Далее",formats:"Формат",portrait:"9:16 · вертикальный",landscape:"16:9 · горизонтальный",
    quizPrompts:["Что хочешь передать?","Какое послание?","Какое настроение?","Кому этот подарок?"],
    recipient:"Имя получателя",recipientHint:"Имя на первой заставке",sampleName:"Дорогой человек",
    upload:"Выбрать фотографию",photoPrivate:"Фотография остаётся на телефоне. В GitHub и публичное хранилище она не загружается.",
    source:"Кто изображён на фото?",self:"Я",other:"Другой взрослый",minor:"Несовершеннолетний",
    photoRights:"У меня есть права использовать эту фотографию.",
    personConsent:"Изображённый человек разрешил анимировать и использовать свою внешность.",
    guardian:"Получено разрешение родителя или законного представителя несовершеннолетнего.",
    photoError:"Не удалось прочитать фотографию. Выберите другое изображение.",consentError:"Подтвердите необходимые права и разрешения.",
    freeTitle:"Бесплатное движение фотографии",freeMoves:["Плавное приближение","Лёгкая панорама","Мягкое покачивание"],
    videoGroup:"Фоны и видеофрагменты",chooseGroup:"Выберите группу",videoNote:"Подходящие 5-секундные сцены из нашей медиатеки подгружаются автоматически. Они появятся в готовом MP4 на 14–19-й секунде.",noScene:"Без дополнительного видео",emptyGroup:"Пока нет разрешённых сцен. Выберите другую группу.",clipCredits:"Сцены: Joel Holland / Dareful · CC BY 4.0",
    aiTitle:"Реалистичное оживление · HeyGen, платно",aiMoves:["Улыбка","Моргание","Поворот головы","Помахать рукой"],
    aiUnavailable:"Будет доступно только после проверки цены, разрешений и явного подтверждения оплаты. Бесплатная открытка работает сейчас.",
    palette:"Палитра",palettes:["Тёплый рассвет","Нежная роза","Океан","Лес"],
    text:"Текст поздравления",final:"Финальное пожелание",suggest:"Предложить текст",editable:"Текст можно исправлять сколько угодно без новой генерации фотографии.",
    soundtrack:"Звуковое оформление",sounds:["Без звука","Лес · звуковая атмосфера","Лёгкий ветер","Кристальный звук","Голосовое поздравление"],
    voice:"Добавить запись поздравления",voiceRights:"Я имею разрешение использовать эту аудиозапись. Она не создаёт имитацию чужого голоса.",
    preview:"Посмотреть композицию",stop:"Остановить просмотр",create:"Создать MP4 бесплатно",
    creating:"Создаётся MP4…",cancel:"Отменить",ready:"MP4 готов",download:"Скачать MP4",
    share:"Поделиться",save:"Сохранить в My Videos",cloudConsent:"Разрешаю приватно сохранить готовый MP4 в My Videos. Исходное фото и текст не загружаются.",
    signIn:"Для сохранения войдите в My House. Готовый MP4 можно скачать сейчас и загрузить позже.",
    cloudDisabled:"Приватное сохранение пока недоступно; скачивание остаётся бесплатным.",
    saved:"Готовый MP4 сохранён в вашем приватном My Videos.",videos:"Открыть My Videos",
    problem:"Не удалось создать проверенный MP4 на этом устройстве. Попробуйте обновить Safari или Chromium; ничего не списано.",
    finish:"Для продолжения заполните обязательные поля.",sharing:"На этом устройстве используйте кнопку «Скачать MP4».",
    noAi:"Без внешнего AI, без списаний и подписок.",length:"25 секунд · H.264 MP4 · AAC при выборе звука",
  },
  en:{
    title:"Personal Video Gift",eyebrow:"LIVING GREETING CARD",tagline:"A special gift from a favourite photo — free and created on your device.",
    steps:["Message","Photo","Motion","Words","Music","Create"],
    prev:"Back",next:"Next",formats:"Format",portrait:"9:16 · portrait",landscape:"16:9 · landscape",
    quizPrompts:["What do you want to say?","Choose your message","Choose an emotional style","Who is this gift for?"],
    recipient:"Recipient's name",recipientHint:"Displayed in the opening title",sampleName:"Someone special",
    upload:"Choose photo",photoPrivate:"Your photo stays on your device. It is never uploaded to public storage or GitHub.",
    source:"Who is in the photo?",self:"Me",other:"Another adult",minor:"A child",
    photoRights:"I own this photo or have permission to use it.",
    personConsent:"The person shown agreed to the use and animation of their likeness.",
    guardian:"A parent or legal guardian has given the necessary permission.",
    photoError:"Could not open this photo. Try another image.",consentError:"Confirm all required permissions.",
    freeTitle:"Free photo movement",freeMoves:["Gentle zoom","Slow panorama","Soft floating motion"],
    videoGroup:"Video backgrounds and clips",chooseGroup:"Choose a group",videoNote:"Approved 5-second footage loads automatically from our media library, appearing at 14–19 seconds in the final MP4.",noScene:"No extra footage",emptyGroup:"No approved clips in this group yet. Choose another group.",clipCredits:"Footage: Joel Holland / Dareful · CC BY 4.0",
    aiTitle:"Realistic facial animation · paid HeyGen",aiMoves:["Soft smile","Blinking","Head turn","Wave a hand"],
    aiUnavailable:"Available only after verified pricing, permissions and an explicit paid confirmation. Free cards work now.",
    palette:"Palette",palettes:["Sunrise","Soft rose","Ocean","Forest"],
    text:"Greeting message",final:"Final wish",suggest:"Suggest a message",editable:"Edit your message any time without regenerating the photo.",
    soundtrack:"Soundtrack",sounds:["Silence","Forest atmosphere","Light breeze","Crystal tones","Voice greeting"],
    voice:"Choose recorded greeting",voiceRights:"I have the right to use this recording. No voice impersonation is performed.",
    preview:"Preview composition",stop:"Stop preview",create:"Create free MP4",
    creating:"Creating MP4…",cancel:"Cancel",ready:"Your MP4 is ready",download:"Download MP4",
    share:"Share",save:"Save in My Videos",cloudConsent:"I consent to storing the finished MP4 privately in My Videos. The original photo and text are not uploaded.",
    signIn:"Sign in to My House to save. You can download the MP4 now and upload it later.",
    cloudDisabled:"Private saving is unavailable right now; local downloading remains free.",
    saved:"Your MP4 is saved privately in My Videos.",videos:"Open My Videos",
    problem:"Could not create a verified MP4 on this device. Please update Safari or Chromium. No charge was made.",
    finish:"Fill in the required fields to continue.",sharing:"Use Download MP4 on this device.",
    noAi:"No external AI, charges or required subscriptions.",length:"25 seconds · H.264 MP4 · AAC with sound",
  },
  es:{
    title:"Tarjeta de vídeo personal",eyebrow:"TARJETA VIVA",tagline:"Un regalo de una foto especial — gratis y creado en tu dispositivo.",
    steps:["Mensaje","Foto","Movimiento","Texto","Música","Crear"],
    prev:"Atrás",next:"Siguiente",formats:"Formato",portrait:"9:16 · vertical",landscape:"16:9 · horizontal",
    quizPrompts:["¿Qué quieres transmitir?","Elige tu mensaje","Elige el estilo emocional","¿Para quién es el regalo?"],
    recipient:"Nombre del destinatario",recipientHint:"Se muestra al principio",sampleName:"Alguien especial",
    upload:"Elegir fotografía",photoPrivate:"Tu foto permanece en tu dispositivo; nunca se sube a GitHub ni a carpetas públicas.",
    source:"¿Quién aparece en la foto?",self:"Yo",other:"Otra persona adulta",minor:"Menor de edad",
    photoRights:"Tengo derecho a utilizar esta fotografía.",
    personConsent:"La persona retratada autorizó el uso y la animación de su imagen.",
    guardian:"Un padre, madre o tutor legal ha dado el permiso necesario.",
    photoError:"No pudimos abrir la foto. Prueba otra imagen.",consentError:"Confirma todos los permisos necesarios.",
    freeTitle:"Movimiento de foto gratuito",freeMoves:["Zoom suave","Panorámica lenta","Movimiento flotante"],
    videoGroup:"Fondos y fragmentos de vídeo",chooseGroup:"Elige un grupo",videoNote:"Los clips autorizados de cinco segundos aparecen automáticamente. Se añadirán a los segundos 14–19 del MP4 final.",noScene:"Sin clip adicional",emptyGroup:"Todavía no hay clips autorizados. Elige otro grupo.",clipCredits:"Vídeo: Joel Holland / Dareful · CC BY 4.0",
    aiTitle:"Animación realista · HeyGen de pago",aiMoves:["Sonrisa suave","Parpadeo","Giro de cabeza","Saludo con la mano"],
    aiUnavailable:"Solo después de verificar precio, permisos y pago confirmado. La tarjeta gratuita funciona ahora.",
    palette:"Paleta",palettes:["Amanecer","Rosa suave","Océano","Bosque"],
    text:"Mensaje de felicitación",final:"Deseo final",suggest:"Proponer un texto",editable:"Puedes editar el texto sin volver a generar la foto.",
    soundtrack:"Sonido",sounds:["Sin sonido","Bosque","Brisa suave","Tonos de cristal","Saludo de voz"],
    voice:"Elegir grabación de voz",voiceRights:"Tengo derecho a usar esta grabación. No se imitan voces ajenas.",
    preview:"Vista previa",stop:"Detener vista previa",create:"Crear MP4 gratuito",
    creating:"Creando MP4…",cancel:"Cancelar",ready:"Tu MP4 está listo",download:"Descargar MP4",
    share:"Compartir",save:"Guardar en Mis vídeos",cloudConsent:"Autorizo guardar el MP4 final de forma privada. La foto y el texto originales no se suben.",
    signIn:"Inicia sesión en Mi Casa para guardarlo. Puedes descargar el MP4 ahora y subirlo luego.",
    cloudDisabled:"El guardado privado no está disponible; la descarga local sigue siendo gratuita.",
    saved:"MP4 guardado de forma privada en Mis vídeos.",videos:"Abrir Mis vídeos",
    problem:"No se pudo crear un MP4 verificado. Actualiza Safari o Chromium. No se ha cobrado nada.",
    finish:"Completa los campos obligatorios.",sharing:"Utiliza Descargar MP4 en este dispositivo.",
    noAi:"Sin IA externa, cargos ni suscripciones obligatorias.",length:"25 segundos · H.264 MP4 · AAC con sonido",
  }
} as const;
const PALETTES=VIDEO_GIFT_PALETTES;
const SOUND_IDS=["none","forest","breeze","crystal","voice"] as const;
type Locale="ru"|"en"|"es";

export function MandalaVideoGift({locale}:{locale:Locale}){
  const t=COPY[locale];
  const starter=suggestGiftEmotionText(locale,"miss-you","thinking-of-you");
  const [step,setStep]=useState(0);
  const [giftQuizStage,setGiftQuizStage]=useState(0);
  const [giftCategoryId,setGiftCategoryId]=useState<GiftEmotionCategoryId>("miss-you");
  const [giftMessageId,setGiftMessageId]=useState<GiftEmotionMessageId>("thinking-of-you");
  const [giftStyleId,setGiftStyleId]=useState<GiftEmotionStyleId>("warm");
  const [occasion,setOccasion]=useState<VideoGiftOccasion>("love");
  const [visualGroup,setVisualGroup]=useState<GiftVisualGroup>(defaultGiftVisualGroup("love"));
  const [sceneId,setSceneId]=useState<string|null>(null);
  const scenePreviewRef=useRef<HTMLVideoElement|null>(null);
  const [recipient,setRecipient]=useState("");
  const [aspect,setAspect]=useState<VideoGiftAspect>("portrait");
  const [sourceOwner,setSourceOwner]=useState<VideoGiftSubject>("self");
  const [rightsConfirmed,setRightsConfirmed]=useState(false);
  const [subjectConsent,setSubjectConsent]=useState(false);
  const [guardianConsent,setGuardianConsent]=useState(false);
  const [photo,setPhoto]=useState<HTMLImageElement|null>(null);
  const [photoUrl,setPhotoUrl]=useState<string|null>(null);
  const photoUrlRef=useRef<string|null>(null);
  const [photoBusy,setPhotoBusy]=useState(false);
  const [motion,setMotion]=useState<VideoGiftMotion>("zoom");
  const [palette,setPalette]=useState<VideoGiftPalette>("sunrise");
  const [message,setMessage]=useState(starter.message);
  const [finalWish,setFinalWish]=useState(starter.finalWish);
  const [soundtrack,setSoundtrack]=useState<(typeof SOUND_IDS)[number]>("forest");
  const [voice,setVoice]=useState<File|null>(null);
  const [voiceRights,setVoiceRights]=useState(false);
  const [playing,setPlaying]=useState(false);
  const [result,setResult]=useState<{blob:Blob;url:string}|null>(null);
  const resultUrlRef=useRef<string|null>(null);
  const [working,setWorking]=useState(false);
  const [progress,setProgress]=useState(0);
  const [saving,setSaving]=useState(false);
  const [cloudConsent,setCloudConsent]=useState(false);
  const [saved,setSaved]=useState(false);
  const [notice,setNotice]=useState("");
  const saveSessionRef=useRef(null);
  const controllerRef=useRef<AbortController|null>(null);
  const canvasRef=useRef<HTMLCanvasElement|null>(null);
  const previewStart=useRef(0);
  const groupScenes=useMemo(()=>listGiftApprovedScenes({
    group:visualGroup,occasion,aspect
  }),[visualGroup,occasion,aspect]);
  const selectedScene=sceneId==="none"?null:(groupScenes.find(x=>x.id===sceneId)||groupScenes[0]||null);
  const selectedGiftCategory=getGiftEmotionCategory(giftCategoryId);
  const selectedGiftMessage=getGiftEmotionMessage(giftCategoryId,giftMessageId);
  const manifest=useMemo<VideoGiftManifest|null>(()=>{
    try{return validateVideoGiftDraft({locale,occasion,giftCategoryId,giftMessageId,giftStyleId,recipient,sourceOwner,
      rightsConfirmed,subjectConsent,guardianConsent,motion,palette,aspect,
      requestMusic:soundtrack,message,finalWish});}catch{return null;}
  },[locale,occasion,giftCategoryId,giftMessageId,giftStyleId,recipient,sourceOwner,rightsConfirmed,subjectConsent,
    guardianConsent,motion,palette,aspect,soundtrack,message,finalWish]);
  useEffect(()=>()=>{if(photoUrlRef.current)URL.revokeObjectURL(photoUrlRef.current);
    if(resultUrlRef.current)URL.revokeObjectURL(resultUrlRef.current);
    controllerRef.current?.abort();
  },[]);
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(step!==5||!canvas||!photo||!manifest||manifest.requiresPaidAnimation)return;
    const [w,h]=VIDEO_GIFT_SIZES[aspect];canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext("2d",{alpha:false});
    if(!ctx)return;
    let frame=0;
    if(playing)previewStart.current=performance.now();
    const render=()=>{
      const seconds=playing?((performance.now()-previewStart.current)/1000)%VIDEO_GIFT_DURATION:0;
      const video=scenePreviewRef.current;
      const duringClip=Boolean(selectedScene&&playing&&seconds>=14&&seconds<19);
      if(video&&duringClip&&video.paused){
        try{video.currentTime=Math.max(0,seconds-14);}catch{/* Decode readiness is checked below. */}
        void video.play().catch(()=>{/* Export has stricter decode gate. */});
      }else if(video&&!duringClip&&!video.paused)video.pause();
      const decoded=duringClip&&video&&video.readyState>=2?video:null;
      paintVideoGiftFrame(ctx,photo,manifest,seconds,decoded,selectedScene?.credit??null);
      if(playing)frame=requestAnimationFrame(render);
    };
    render();
    return()=>{cancelAnimationFrame(frame);scenePreviewRef.current?.pause();};
  },[step,photo,manifest,aspect,playing,selectedScene]);
  const invalidateResult=()=>{
    setSaved(false);setCloudConsent(false);setResult(null);saveSessionRef.current=null;
    if(resultUrlRef.current){URL.revokeObjectURL(resultUrlRef.current);resultUrlRef.current=null;}
  };
  const chooseGiftCategory=(id:GiftEmotionCategoryId)=>{
    const choice=getGiftEmotionCategory(id);
    if(!choice)return;
    const first=choice.messages[0];
    const preset=getGiftEmotionStyle(choice.defaultStyle);
    setGiftCategoryId(choice.id);setGiftMessageId(first.id);setGiftStyleId(choice.defaultStyle);
    setOccasion(first.occasion);setVisualGroup(defaultGiftVisualGroup(first.occasion));setSceneId(null);
    if(preset){setPalette(preset.palette);setMotion(preset.motion);setSoundtrack(preset.soundtrack);}
    const suggestion=suggestGiftEmotionText(locale,choice.id,first.id);
    setMessage(suggestion.message);setFinalWish(suggestion.finalWish);setGiftQuizStage(1);
    invalidateResult();
  };
  const chooseGiftMessage=(id:GiftEmotionMessageId)=>{
    const choice=getGiftEmotionMessage(giftCategoryId,id);
    if(!choice)return;
    setGiftMessageId(choice.id);setOccasion(choice.occasion);
    setVisualGroup(defaultGiftVisualGroup(choice.occasion));setSceneId(null);
    const suggestion=suggestGiftEmotionText(locale,giftCategoryId,choice.id);
    setMessage(suggestion.message);setFinalWish(suggestion.finalWish);setGiftQuizStage(2);
    invalidateResult();
  };
  const chooseGiftStyle=(id:GiftEmotionStyleId)=>{
    const choice=getGiftEmotionStyle(id);
    if(!choice)return;
    setGiftStyleId(choice.id);setPalette(choice.palette);setMotion(choice.motion);
    setSoundtrack(choice.soundtrack);
    const hasScenes=listGiftApprovedScenes({group:choice.group,occasion,aspect}).length>0;
    setVisualGroup(hasScenes?choice.group:defaultGiftVisualGroup(occasion));
    setSceneId(null);setGiftQuizStage(3);invalidateResult();
  };
  async function choosePhoto(file:File|null){
    if(!file)return;
    setNotice("");setPhotoBusy(true);invalidateResult();
    try{
      const blob=await prepareBrowserPhoto(file);
      const url=URL.createObjectURL(blob);
      let image:HTMLImageElement;
      try{
        image=await new Promise<HTMLImageElement>((resolve,reject)=>{
          const node=new Image();
          node.onload=()=>node.naturalWidth&&node.naturalHeight?resolve(node):reject(new Error("invalid_image"));
          node.onerror=()=>reject(new Error("invalid_image"));
          node.src=url;
        });
      }catch(error){URL.revokeObjectURL(url);throw error;}
      if(photoUrlRef.current)URL.revokeObjectURL(photoUrlRef.current);
      photoUrlRef.current=url;
      setPhotoUrl(url);setPhoto(image);
    }catch{setNotice(t.photoError);setPhoto(null);setPhotoUrl(null);}
    finally{setPhotoBusy(false);}
  }
  function changeStep(delta:number){
    if(working||saving)return;
    setNotice("");
    if(step===0&&delta<0&&giftQuizStage>0){
      setGiftQuizStage(current=>current-1);setPlaying(false);return;
    }
    if(step===0&&delta>0&&giftQuizStage<3){
      if(giftQuizStage===0)chooseGiftCategory(giftCategoryId);
      else if(giftQuizStage===1)chooseGiftMessage(giftMessageId);
      else chooseGiftStyle(giftStyleId);
      return;
    }
    if(delta>0){
      if(step===0&&!recipient.trim()){setNotice(t.finish);return;}
      if(step===1){
        if(!photo){setNotice(t.photoError);return;}
        if(!rightsConfirmed||(sourceOwner!=="self"&&!subjectConsent)||
           (sourceOwner==="minor"&&!guardianConsent)){setNotice(t.consentError);return;}
      }
      if(step===3&&(!message.trim()||!finalWish.trim())){setNotice(t.finish);return;}
      if(step===4&&soundtrack==="voice"&&(!voice||!voiceRights)){setNotice(t.finish);return;}
    }
    setPlaying(false);if(delta<0&&step===1)setGiftQuizStage(3);
    setStep(value=>Math.max(0,Math.min(5,value+delta)));
  }
  async function create(){
    if(working||saving)return;
    setNotice("");
    if(!manifest||!photo||manifest.requiresPaidAnimation){setNotice(t.finish);return;}
    if(soundtrack==="voice"&&(!voice||!voiceRights)){setNotice(t.finish);return;}
    invalidateResult();
    const controller=new AbortController();controllerRef.current=controller;
    setWorking(true);setProgress(0);setPlaying(false);
    const sound:GiftSound={music:soundtrack==="voice"?"none":soundtrack,voice:soundtrack==="voice"?voice:null};
    try{
      const blob=await exportVideoGiftMp4({image:photo,manifest,sound,
        sceneId:selectedScene?.id??null,
        signal:controller.signal,onProgress:setProgress});
      if(blob.size<1024||blob.size>12_000_000)throw new Error("gift_mp4_size_invalid");
      const url=URL.createObjectURL(blob);resultUrlRef.current=url;
      setResult({blob,url});setProgress(100);
    }catch(error){
      if(!controller.signal.aborted)setNotice(t.problem);
    }finally{if(controllerRef.current===controller)controllerRef.current=null;setWorking(false);}
  }
  async function share(){
    if(!result)return;
    const file=new File([result.blob],"holistic-house-gift.mp4",{type:"video/mp4"});
    try{
      if(navigator.canShare?.({files:[file]})&&navigator.share)await navigator.share({files:[file]});
      else setNotice(t.sharing);
    }catch(error){if((error as Error)?.name!=="AbortError")setNotice(t.sharing);}
  }
  async function save(){
    if(!result||saving||!cloudConsent||saved)return;
    setNotice("");setSaving(true);
    try{
      const session=await appFetch("bootstrap?view=portrait");
      const accountId=session?.account?.id;
      if(typeof accountId!=="string")throw new Error("SIGN_IN_REQUIRED");
      await savePrivateMp4({file:result.blob,
        details:{theme:"gift",sceneId:"personal-gift",aspect,duration:25},
        request:(path:string,body:unknown)=>appFetch(path,body,"POST",{accountId}),
        sessionRef:saveSessionRef});
      setSaved(true);setNotice(t.saved);
    }catch(error){
      const code=(error as {code?:string})?.code;
      setNotice(code==="FEATURE_UNAVAILABLE"?t.cloudDisabled:code==="ACCOUNT_CHANGED"?
        t.signIn:t.signIn);
    }finally{setSaving(false);}
  }
  return <section className={styles.shell} data-personal-video-gift lang={locale}>
    <header className={styles.hero}>
      <span className={styles.eyebrow}>{t.eyebrow}</span>
      <h1>{t.title}</h1><p>{t.tagline}</p>
      <div className={styles.chips}><span><LockKeyhole size={14}/>{t.noAi}</span><span>{t.length}</span></div>
    </header>
    <nav className={styles.steps} aria-label={t.title}>
      {t.steps.map((name,index)=><button type="button" key={name}
        disabled={working||saving||index>step}
        className={step===index?styles.activeStep:styles.pastStep}
        aria-current={step===index?"step":undefined}
        onClick={()=>{setPlaying(false);if(index===0&&step>0)setGiftQuizStage(3);setStep(index);setNotice("");}}
        data-video-gift-step={index+1}><span>{index<step?<Check size={15}/>:index+1}</span>{name}</button>)}
    </nav>
    <div className={styles.panel}>
      {step===0&&<>
        <h2>{t.quizPrompts[giftQuizStage]}</h2>
        <div className={styles.quizProgress} aria-label={t.steps[0]}>
          {[0,1,2,3].map(index=><span key={index}
            aria-current={giftQuizStage===index?"step":undefined}
            className={giftQuizStage===index?styles.quizCurrent:styles.quizDot}/>)}
        </div>
        {giftQuizStage===0&&<div className={styles.options} data-video-gift-quiz="category">
          {VIDEO_GIFT_EMOTIONS.map(choice=><button type="button" key={choice.id}
            data-video-gift-category={choice.id}
            className={giftCategoryId===choice.id?styles.selected:styles.option}
            aria-pressed={giftCategoryId===choice.id}
            onClick={()=>chooseGiftCategory(choice.id)}>
            {choice.label[locale]}{giftCategoryId===choice.id&&<Check size={17}/>}</button>)}
        </div>}
        {giftQuizStage===1&&<div className={styles.options} data-video-gift-quiz="message">
          {selectedGiftCategory?.messages.map(choice=><button type="button" key={choice.id}
            data-video-gift-message={choice.id}
            className={giftMessageId===choice.id?styles.selected:styles.option}
            aria-pressed={giftMessageId===choice.id}
            onClick={()=>chooseGiftMessage(choice.id)}>
            {choice.label[locale]}{giftMessageId===choice.id&&<Check size={17}/>}</button>)}
        </div>}
        {giftQuizStage===2&&<div className={styles.options} data-video-gift-quiz="style">
          {VIDEO_GIFT_STYLES.map(choice=><button type="button" key={choice.id}
            data-video-gift-style={choice.id}
            className={giftStyleId===choice.id?styles.selected:styles.option}
            aria-pressed={giftStyleId===choice.id}
            onClick={()=>chooseGiftStyle(choice.id)}>
            {choice.label[locale]}{giftStyleId===choice.id&&<Check size={17}/>}</button>)}
        </div>}
        {giftQuizStage===3&&<>
          <p className={styles.quizSummary}>
            {selectedGiftCategory?.label[locale]} · {selectedGiftMessage?.label[locale]} ·
            {" "}{getGiftEmotionStyle(giftStyleId)?.label[locale]}
          </p>
          <label className={styles.field}>{t.recipient}
            <input value={recipient} maxLength={64} placeholder={t.sampleName}
              onChange={e=>{setRecipient(e.target.value);invalidateResult();}}/>
            <small>{t.recipientHint}</small>
          </label>
        </>}
      </>}
      {step===1&&<>
        <h2>{t.steps[1]}</h2>
        <label className={styles.filePicker}>
          {photoUrl?<img src={photoUrl} alt={t.upload}/>:<Video size={32}/>}
          <span>{photoBusy?"…":t.upload}</span>
          <input type="file" accept={SUPPORT_PHOTO_ACCEPT} disabled={photoBusy}
            onChange={e=>void choosePhoto(e.currentTarget.files?.[0]??null)}/>
        </label>
        <p className={styles.hint}>{t.photoPrivate}</p>
        <fieldset className={styles.group}><legend>{t.source}</legend>
          {(["self","other","minor"] as const).map(id=><label key={id} className={styles.inline}>
            <input type="radio" checked={sourceOwner===id} onChange={()=>setSourceOwner(id)}/>
            {t[id]}
          </label>)}
        </fieldset>
        <label className={styles.check}><input type="checkbox" checked={rightsConfirmed}
          onChange={e=>setRightsConfirmed(e.target.checked)}/>{t.photoRights}</label>
        {sourceOwner!=="self"&&<label className={styles.check}><input type="checkbox"
          checked={subjectConsent} onChange={e=>setSubjectConsent(e.target.checked)}/>{t.personConsent}</label>}
        {sourceOwner==="minor"&&<label className={styles.check}><input type="checkbox"
          checked={guardianConsent} onChange={e=>setGuardianConsent(e.target.checked)}/>{t.guardian}</label>}
      </>}
      {step===2&&<>
        <h2>{t.steps[2]}</h2><h3>{t.freeTitle}</h3>
        <div className={styles.options}>
          {VIDEO_GIFT_FREE_MOTIONS.map((id,index)=><button key={id} type="button"
            className={motion===id?styles.selected:styles.option} aria-pressed={motion===id}
            onClick={()=>{setMotion(id);invalidateResult();}}>{t.freeMoves[index]}{motion===id&&<Check size={17}/>}</button>)}
        </div>
        <label className={styles.field}>{t.palette}
          <select value={palette} onChange={e=>{setPalette(e.target.value as VideoGiftPalette);invalidateResult();}}>
            {PALETTES.map((id,index)=><option key={id} value={id}>{t.palettes[index]}</option>)}
          </select>
        </label>
        <section className={styles.mediaPicker} data-video-gift-media-library>
          <h3>{t.videoGroup}</h3>
          <label className={styles.field}>{t.chooseGroup}
            <select data-video-gift-group value={visualGroup}
              onChange={e=>{
                setVisualGroup(e.target.value as GiftVisualGroup);
                setSceneId(null);invalidateResult();
              }}>
              {GIFT_VISUAL_GROUPS.map(group=><option key={group.id} value={group.id}>
                {group.label[locale]} · {listGiftApprovedScenes({group:group.id,occasion,aspect}).length}
              </option>)}
            </select>
          </label>
          <p className={styles.hint}>{t.videoNote}</p>
          {groupScenes.length?<div className={styles.mediaGallery} role="group" aria-label={t.videoGroup}>
            {groupScenes.map(scene=><button type="button" key={scene.id}
              data-video-gift-scene={scene.id}
              aria-pressed={selectedScene?.id===scene.id}
              className={selectedScene?.id===scene.id?styles.mediaActive:styles.mediaOption}
              onClick={()=>{setSceneId(scene.id);invalidateResult();}}>
              <img src={scene.poster} alt="" loading="lazy" decoding="async"/>
              <span>{scene.label[locale]}</span>
              {selectedScene?.id===scene.id?<Check size={17}/>:null}
            </button>)}
          </div>:<p className={styles.hint} role="status">{t.emptyGroup}</p>}
          <button type="button" className={styles.secondary}
            onClick={()=>{setSceneId("none");invalidateResult();}}>{t.noScene}</button>
          <small className={styles.hint}>{t.clipCredits}</small>
        </section>
        <div className={styles.locked}><h3>{t.aiTitle}</h3><p>{t.aiUnavailable}</p>
          <div className={styles.options}>
            {VIDEO_GIFT_AI_MOTIONS.map((id,index)=><button type="button" key={id}
              disabled className={styles.option} title={t.aiUnavailable}>{t.aiMoves[index]}</button>)}
          </div>
        </div>
      </>}
      {step===3&&<>
        <h2>{t.steps[3]}</h2>
        <label className={styles.field}>{t.text}
          <textarea rows={5} maxLength={500} value={message}
            onChange={e=>{setMessage(e.target.value);invalidateResult();}}/>
        </label>
        <label className={styles.field}>{t.final}
          <input maxLength={140} value={finalWish}
            onChange={e=>{setFinalWish(e.target.value);invalidateResult();}}/>
        </label>
        <button type="button" className={styles.secondary} onClick={()=>{
          const suggestion=suggestGiftEmotionText(locale,giftCategoryId,giftMessageId);
          setMessage(suggestion.message);setFinalWish(suggestion.finalWish);invalidateResult();
        }}>{t.suggest}</button><p className={styles.hint}>{t.editable}</p>
      </>}
      {step===4&&<>
        <h2>{t.steps[4]}</h2><div className={styles.options}>
          {SOUND_IDS.map((id,index)=><button type="button" key={id}
            className={soundtrack===id?styles.selected:styles.option}
            aria-pressed={soundtrack===id} onClick={()=>{
              setSoundtrack(id);invalidateResult();
            }}>{t.sounds[index]}{soundtrack===id&&<Check size={17}/>}</button>)}
        </div>
        {soundtrack==="voice"&&<>
          <label className={styles.field}>{t.voice}
            <input type="file" accept="audio/*,.m4a,.mp3,.wav" onChange={e=>{
              setVoice(e.currentTarget.files?.[0]??null);setVoiceRights(false);invalidateResult();
            }}/>
          </label>
          <label className={styles.check}><input type="checkbox" checked={voiceRights}
            onChange={e=>setVoiceRights(e.target.checked)}/>{t.voiceRights}</label>
        </>}
      </>}
      {step===5&&<>
        <h2>{t.steps[5]}</h2>
        <div className={styles.format} role="group" aria-label={t.formats}>
          {(["portrait","landscape"] as const).map(id=><button type="button" key={id}
            aria-pressed={aspect===id} className={aspect===id?styles.selected:styles.option}
            disabled={working||saving} onClick={()=>{setAspect(id);invalidateResult();}}>
            {id==="portrait"?t.portrait:t.landscape}</button>)}
        </div>
        {!result&&<div className={styles.previewArea}>
          {selectedScene?<video ref={scenePreviewRef} src={selectedScene.video}
            poster={selectedScene.poster} preload="metadata" muted playsInline
            crossOrigin="anonymous" className={styles.preloadClip} aria-hidden="true"/>:null}
          <canvas ref={canvasRef} aria-label={t.preview}
            className={aspect==="portrait"?styles.portrait:styles.landscape}/>
          <button type="button" className={styles.secondary} disabled={!manifest||!photo||working}
            onClick={()=>setPlaying(value=>!value)}>
            {playing?<Pause size={17}/>:<Play size={17}/>}
            {playing?t.stop:t.preview}
          </button>
        </div>}
        {result&&<div className={styles.output} data-video-gift-ready>
          <strong><Check size={18}/>{t.ready}</strong>
          <video src={result.url} controls playsInline preload="metadata"
            className={aspect==="portrait"?styles.portrait:styles.landscape}/>
          <div className={styles.actions}>
            <a href={result.url} download="holistic-house-personal-gift.mp4"
              className={styles.primary}><Download size={18}/>{t.download}</a>
            <button type="button" className={styles.secondary} onClick={()=>void share()}>
              <Share2 size={18}/>{t.share}</button>
          </div>
          <label className={styles.check}><input type="checkbox" checked={cloudConsent}
            disabled={saving||saved} onChange={e=>setCloudConsent(e.target.checked)}/>{t.cloudConsent}</label>
          <button type="button" className={styles.secondary} disabled={saving||saved||!cloudConsent}
            onClick={()=>void save()}><Save size={17}/>{saving?"…":saved?t.saved:t.save}</button>
          <Link href={"/"+(locale==="es"?"en":locale)+"/app/videos"}>{t.videos}</Link>
        </div>}
        {!result&&<button type="button" className={styles.primary}
          disabled={!manifest||!photo||working||saving} onClick={()=>void create()}>
          {working?t.creating:t.create}<ArrowRight size={18}/></button>}
        {working&&<div className={styles.progress} role="status" aria-live="polite">
          <progress max={100} value={progress}/><span>{progress}%</span>
          <button type="button" className={styles.secondary} onClick={()=>controllerRef.current?.abort()}>{t.cancel}</button>
        </div>}
      </>}
      {notice&&<p className={styles.notice} role="alert">{notice}</p>}
      {step<5&&<footer className={styles.footer}>
        {(step>0||giftQuizStage>0)&&<button type="button" onClick={()=>changeStep(-1)}
          className={styles.secondary}><ArrowLeft size={17}/>{t.prev}</button>}
        <button type="button" className={styles.primary} disabled={photoBusy}
          onClick={()=>changeStep(1)}>{t.next}<ArrowRight size={18}/></button>
      </footer>}
    </div>
  </section>;
}
