"use client";

import {useEffect,useRef,useState} from "react";
import Link from "next/link";
import {prepareBrowserPhoto,SUPPORT_PHOTO_ACCEPT} from "@/lib/mandala/prepare-browser-photo";
import {encodeLocalWebCodecsMp4,supportsProceduralWebCodecsMp4,normalizeNativeSafariMp4ForPlayback} from "@/lib/mandala/webcodecs-mp4-export";
import {startPresetAudio,startUploadedAudio} from "@/lib/mandala/local-video-music";
import {savePrivateMp4} from "@/lib/mandala/signed-private-video-upload.mjs";
import {appFetch} from "@/lib/app/client-fetch";
import {
  VIDEO_GIFT_DURATION,VIDEO_GIFT_SCENES,VIDEO_GIFT_OCCASIONS,VIDEO_GIFT_MOTIONS,
  giftSceneAt,giftSuggestedText,giftEnding,giftCameraAt,giftCanUsePhoto,
} from "@/lib/mandala/personal-video-gift-timeline.mjs";
import styles from "./mandala-personal-video-gift.module.css";

const COPY={
  ru:{
    title:"Живая открытка",eyebrow:"PERSONAL VIDEO GIFT · БЕСПЛАТНО",subtitle:"Создайте личное видеопоздравление из фотографии, слов и музыки. Бесплатно, прямо на вашем устройстве.",
    steps:["Повод","Фото","Движение","Поздравление","Звук","Готово"],
    back:"Назад",next:"Продолжить",occasion:"Кому и по какому поводу?",recipient:"Имя получателя",namePlaceholder:"Имя",custom:"Своя тема",
    occasions:{birthday:"День рождения",love:"Любовь",thanks:"Благодарность",support:"Поддержка",anniversary:"Годовщина",custom:"Свой повод"},
    photoTitle:"Добавьте фотографию",photoNote:"Фото обрабатывается на вашем устройстве. Для бесплатной открытки оно не отправляется в AI или облако.",
    rights:"У меня есть право использовать эту фотографию для создания и отправки видеоподарка.",
    photoSubject:"Кто изображён?",self:"Я сам(а)",adult:"Другой взрослый",minor:"Несовершеннолетний",
    adultConsent:"У меня есть разрешение изображённого человека на эту обработку и использование изображения.",
    minorConsent:"Я родитель или уполномоченный опекун либо получил(а) надлежащее разрешение законного представителя.",
    choosePhoto:"Выбрать фотографию",photoMissing:"Выберите действительную фотографию и подтвердите необходимые разрешения.",
    motionTitle:"Как оживить открытку?",freeMotion:"Бесплатное движение камеры (не изменение мимики)",
    motions:{"gentle-zoom":"Мягкое приближение","soft-pan":"Плавный сдвиг","still":"Неподвижное фото"},
    aiMotions:"Мимика и жесты: отдельная платная AI-функция",aiList:"Улыбка · моргание · поворот головы · взмах рукой",
    aiLocked:"HeyGen пока выключен: изображения никому не передаются, оплата не производится.",
    messageTitle:"Ваше поздравление",messageLabel:"Текст поздравления",suggest:"Предложить текст",suggestNote:"Бесплатный готовый вариант; вы можете полностью изменить его. Это не вызов платного AI.",
    ending:"Финальное пожелание",endingPlaceholder:"С теплом и любовью",messageMissing:"Добавьте поздравление.",soundTitle:"Выберите звук",
    sounds:{none:"Без звука",forest:"Лес и спокойствие",ocean:"Океан",breeze:"Лёгкий ветер",voice:"Моё аудиопоздравление"},
    voice:"Загрузить свою аудиозапись",voiceNote:"MP3, WAV или M4A до 15 МБ. Не используйте чужой голос без разрешения.",
    voiceConsent:"Я вправе использовать загруженную аудиозапись; это не имитация речи изображённого человека.",
    orientation:"Формат",portrait:"Вертикальный 9:16",landscape:"Горизонтальный 16:9",
    previewTitle:"Посмотрите открытку",preview:"Просмотр",stop:"Пауза",create:"Создать MP4",creating:"Создание MP4",
    download:"Скачать MP4",share:"Поделиться",cancel:"Отменить",noShare:"На этом устройстве нет общего доступа к файлам. Используйте «Скачать MP4».",
    saveConsent:"Отдельно разрешаю сохранить только готовый MP4 в моём приватном My Videos. Исходное фото и текст не загружаются.",
    cloudSave:"Сохранить в My Videos",saving:"Сохраняем приватно…",saved:"Видео сохранено в My Videos.",
    login:"Для My Videos войдите в Holistic House.",cloudOff:"Приватное облачное сохранение сейчас недоступно. MP4 можно скачать.",
    myVideos:"Открыть My Videos",
    invalidPhoto:"Файл не удалось открыть. Выберите JPEG, PNG, WebP или совместимое фото iPhone.",
    invalidAudio:"Не удалось прочитать аудиозапись.",
    unsupported:"Этот браузер не подтвердил локальную кодировку MP4 с выбранным звуком. Попробуйте актуальный Safari/Chromium или выберите «Без звука».",
    failed:"Не удалось собрать корректный MP4. Ничего не списано и фото не отправлено. Попробуйте ещё раз.",
    timing:"25 секунд · 4 сцены · H.264 / AAC при выбранном звуке",
    privacy:"Фото остаётся на устройстве до явного согласия на отдельную платную AI-анимацию. Мы не имитируем чужой голос.",
    previewOnly:"Бесплатное движение камеры, не реалистичное изменение выражения лица.",
  },
  en:{
    title:"Personal Video Gift",eyebrow:"PERSONAL VIDEO GIFT · FREE",subtitle:"Make a personal video greeting from a photo, your words and music. Created locally on your device.",
    steps:["Occasion","Photo","Motion","Greeting","Sound","Finish"],
    back:"Back",next:"Continue",occasion:"Who is it for?",recipient:"Recipient's name",namePlaceholder:"Name",custom:"Your own theme",
    occasions:{birthday:"Birthday",love:"Love",thanks:"Thank you",support:"Support",anniversary:"Anniversary",custom:"Custom"},
    photoTitle:"Add a photo",photoNote:"Your photo stays on your device for the free gift. It is not sent to AI or cloud storage.",
    rights:"I have the rights to use this photo to make and share the video gift.",
    photoSubject:"Who is pictured?",self:"Myself",adult:"Another adult",minor:"A minor",
    adultConsent:"I have the person's permission for this processing and use of their likeness.",
    minorConsent:"I am the parent/authorized guardian or have proper permission from the legal guardian.",
    choosePhoto:"Choose photo",photoMissing:"Select a valid photo and confirm all applicable permissions.",
    motionTitle:"How should it move?",freeMotion:"Free camera movement (not facial animation)",
    motions:{"gentle-zoom":"Gentle zoom","soft-pan":"Slow pan","still":"Still photo"},
    aiMotions:"Facial gestures: separate paid AI feature",aiList:"Smile · blink · head turn · wave",
    aiLocked:"HeyGen is disabled. No likeness is sent to a provider and no charge is made.",
    messageTitle:"Your greeting",messageLabel:"Editable greeting text",suggest:"Suggest wording",suggestNote:"A free local suggestion. Edit it any way you like; no paid AI request.",
    ending:"Closing wish",endingPlaceholder:"With warmth and love",messageMissing:"Please write a greeting.",soundTitle:"Choose audio",
    sounds:{none:"No sound",forest:"Forest and calm",ocean:"Ocean",breeze:"Gentle breeze",voice:"My voice recording"},
    voice:"Upload your recording",voiceNote:"MP3, WAV or M4A, up to 15 MB. Do not use someone else's voice without permission.",
    voiceConsent:"I have permission to use this recording; it does not imitate the pictured person's voice.",
    orientation:"Aspect ratio",portrait:"Vertical 9:16",landscape:"Horizontal 16:9",
    previewTitle:"Preview your video",preview:"Play preview",stop:"Pause",create:"Create MP4",creating:"Creating MP4",
    download:"Download MP4",share:"Share",cancel:"Cancel",noShare:"File sharing isn't available on this device. Please download the MP4.",
    saveConsent:"I separately consent to storing only the finished MP4 in my private My Videos. The original photo and greeting text are not uploaded.",
    cloudSave:"Save to My Videos",saving:"Saving privately…",saved:"Video saved in My Videos.",
    login:"Sign in to Holistic House to use My Videos.",cloudOff:"Private cloud saving is unavailable. Your local MP4 download still works.",
    myVideos:"Open My Videos",invalidPhoto:"The image couldn't be decoded. Choose a JPEG, PNG, WebP or supported iPhone photo.",
    invalidAudio:"The audio recording could not be read.",
    unsupported:"This browser can't confirm local MP4 encoding with the selected audio. Try a current Safari/Chromium or select No sound.",
    failed:"A valid MP4 could not be produced. No charges or photo uploads occurred; try again.",
    timing:"25 seconds · 4 scenes · H.264 / AAC when audio is selected",
    privacy:"Your photo stays on-device until a separately confirmed AI animation order. Other people's voices are never cloned.",
    previewOnly:"Free camera movement, not realistic facial expression changes.",
  },
  es:{
    title:"Tarjeta animada",eyebrow:"REGALO PERSONAL EN VÍDEO · GRATIS",subtitle:"Crea un vídeo personal con una foto, tus palabras y música. Gratis y en tu dispositivo.",
    steps:["Motivo","Foto","Movimiento","Mensaje","Sonido","Final"],
    back:"Volver",next:"Continuar",occasion:"¿Para quién es?",recipient:"Nombre de la persona",namePlaceholder:"Nombre",custom:"Tema propio",
    occasions:{birthday:"Cumpleaños",love:"Amor",thanks:"Agradecimiento",support:"Ánimo",anniversary:"Aniversario",custom:"Otro motivo"},
    photoTitle:"Añade una foto",photoNote:"La foto permanece en tu dispositivo durante la creación gratuita. No se envía a la IA ni a la nube.",
    rights:"Tengo derechos para usar esta foto y compartir la tarjeta en vídeo.",
    photoSubject:"¿Quién aparece?",self:"Yo",adult:"Otro adulto",minor:"Un menor",
    adultConsent:"Tengo permiso de la persona para procesar y usar su imagen.",
    minorConsent:"Soy su tutor legal autorizado o tengo el permiso adecuado de su representante legal.",
    choosePhoto:"Elegir foto",photoMissing:"Elige una foto válida y confirma todos los permisos necesarios.",
    motionTitle:"¿Qué movimiento prefieres?",freeMotion:"Movimiento de cámara gratuito (no cambia el rostro)",
    motions:{"gentle-zoom":"Acercamiento suave","soft-pan":"Desplazamiento suave","still":"Foto fija"},
    aiMotions:"Gestos faciales: función de IA de pago aparte",aiList:"Sonrisa · parpadeo · giro de cabeza · saludo",
    aiLocked:"HeyGen está desactivado: no se envían imágenes ni se cobra nada.",
    messageTitle:"Tu felicitación",messageLabel:"Mensaje editable",suggest:"Sugerir mensaje",suggestNote:"Sugerencia local gratuita y completamente editable; sin llamada a IA de pago.",
    ending:"Deseo final",endingPlaceholder:"Con cariño y amor",messageMissing:"Escribe un mensaje.",soundTitle:"Elige el sonido",
    sounds:{none:"Sin sonido",forest:"Bosque tranquilo",ocean:"Océano",breeze:"Brisa suave",voice:"Mi mensaje de voz"},
    voice:"Subir mi grabación",voiceNote:"MP3, WAV o M4A, hasta 15 MB. No uses voces ajenas sin permiso.",
    voiceConsent:"Tengo permiso para usar esta grabación y no imito la voz de la persona retratada.",
    orientation:"Formato",portrait:"Vertical 9:16",landscape:"Horizontal 16:9",
    previewTitle:"Vista previa del regalo",preview:"Reproducir",stop:"Pausar",create:"Crear MP4",creating:"Creando MP4",
    download:"Descargar MP4",share:"Compartir",cancel:"Cancelar",noShare:"No se pueden compartir archivos aquí. Descarga el MP4.",
    saveConsent:"Autorizo por separado guardar solo el MP4 final en Mis vídeos. La foto original y el texto no se suben.",
    cloudSave:"Guardar en Mis vídeos",saving:"Guardando en privado…",saved:"Vídeo guardado en Mis vídeos.",
    login:"Inicia sesión en Holistic House para usar Mis vídeos.",cloudOff:"El guardado privado no está disponible. Puedes descargar el MP4.",
    myVideos:"Abrir Mis vídeos",invalidPhoto:"No se pudo abrir la foto. Elige JPEG, PNG, WebP o una foto compatible de iPhone.",
    invalidAudio:"No se pudo leer la grabación.",unsupported:"Tu navegador no admite codificación local MP4 con este sonido. Usa Safari/Chromium actualizado o elige Sin sonido.",
    failed:"No se pudo crear un MP4 válido. No se cobró ni subió la foto. Inténtalo de nuevo.",
    timing:"25 segundos · 4 escenas · H.264 / AAC al seleccionar audio",
    privacy:"La foto permanece en el dispositivo hasta una autorización aparte para IA. No se clonan voces ajenas.",
    previewOnly:"Solo movimiento de cámara, no cambios realistas de expresión.",
  },
};
const SOUND_IDS=["none","forest","ocean","breeze","voice"];
const LOCAL_MOVEMENT=["gentle-zoom","soft-pan","still"];
const palettes={
  peach:["#f8e7d5","#f1ad92"],ocean:["#daedf1","#68b3ac"],lavender:["#eee4f8","#b8a2d4"]
};
function linesFor(ctx,text,width,maxLines){
  const words=String(text||"").trim().split(/\s+/u).filter(Boolean);
  const result=[];
  let line="";
  for(const word of words){
    const candidate=line?line+" "+word:word;
    if(ctx.measureText(candidate).width>width && line){
      result.push(line);line=word;
    }else line=candidate;
  }
  if(line)result.push(line);
  // Dynamically shrink instead of silently dropping client wording.
  return result.slice(0,maxLines);
}
function centeredText(ctx,value,yStart,width,height,bold=true){
  const availableHeight=height-yStart-12;
  const wide=width>height;
  let fontSize=wide?27:29;
  let lines=[];
  do{
    ctx.font=(bold?"700 ":"500 ")+fontSize+"px system-ui, -apple-system, sans-serif";
    lines=linesFor(ctx,value,width*.86,100);
    if(lines.length*fontSize*1.25<=availableHeight||fontSize<=16)break;
    fontSize-=1;
  }while(fontSize>15);
  const lineHeight=fontSize*1.26;
  const start=yStart+Math.max(0,(availableHeight-lines.length*lineHeight)/2)+fontSize;
  ctx.textAlign="center";
  ctx.textBaseline="alphabetic";
  ctx.shadowColor="rgba(0,0,0,.5)";ctx.shadowBlur=9;
  ctx.fillStyle="#ffffff";
  lines.forEach((line,i)=>ctx.fillText(line,width/2,start+lineHeight*i,width*.88));
  ctx.shadowBlur=0;
}
function paintGift(ctx,image,data,second){
  const width=ctx.canvas.width,height=ctx.canvas.height;
  const t=Math.min(VIDEO_GIFT_DURATION,Math.max(0,second));
  const beat=giftSceneAt(Math.min(24.999,t));
  const [top,bottom]=palettes[data.palette]||palettes.peach;
  const gradient=ctx.createLinearGradient(0,0,width,height);
  gradient.addColorStop(0,top);gradient.addColorStop(1,bottom);
  ctx.fillStyle=gradient;ctx.fillRect(0,0,width,height);
  if(image?.naturalWidth>0){
    const camera=giftCameraAt(t,data.motion);
    const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight)*camera.scale;
    const drawWidth=image.naturalWidth*scale,drawHeight=image.naturalHeight*scale;
    ctx.drawImage(image,(width-drawWidth)/2+camera.dx*width,
      (height-drawHeight)/2+camera.dy*height,drawWidth,drawHeight);
  }
  const dark=ctx.createLinearGradient(0,0,0,height);
  dark.addColorStop(0,"rgba(8,30,35,.26)");
  dark.addColorStop(.42,"rgba(8,30,35,.09)");
  dark.addColorStop(1,"rgba(8,30,35,.76)");
  ctx.fillStyle=dark;ctx.fillRect(0,0,width,height);
  const intro=beat.id==="intro",outro=beat.id==="outro";
  if(intro||outro){
    ctx.fillStyle="rgba(8,38,39,.30)";
    ctx.fillRect(0,0,width,height);
    centeredText(ctx,outro?data.ending:data.recipient||data.defaultName,
      height*.32,width,height);
  }else if(beat.id==="message"){
    ctx.fillStyle="rgba(11,43,42,.36)";
    ctx.fillRect(0,height*.37,width,height*.63);
    centeredText(ctx,data.message,height*.42,width,height,false);
  }else{
    const stripe=ctx.createLinearGradient(0,height*.73,0,height);
    stripe.addColorStop(0,"rgba(9,47,49,0)");stripe.addColorStop(1,"rgba(9,47,49,.5)");
    ctx.fillStyle=stripe;ctx.fillRect(0,height*.73,width,height*.27);
  }
}

/**
 * Native Safari fallback: real-time first-party Canvas + native H.264/AAC.
 * The shared MP4 verifier remuxes and checks both end-frame decodability
 * and selected AAC audio; never return a MIME-labelled invalid MP4.
 */
function nativeGiftFormat(withSound){
  if(typeof MediaRecorder==="undefined"||typeof MediaRecorder.isTypeSupported!=="function")return null;
  const preferences=withSound
    ?['video/mp4;codecs="avc1.42E01E,mp4a.40.2"',"video/mp4"]
    :['video/mp4;codecs="avc1.42E01E"',"video/mp4"];
  return preferences.find(value=>MediaRecorder.isTypeSupported(value))||null;
}
async function nativeGiftMp4({canvas,ctx,image,data,sound,voice,signal,onProgress,mime}){
  if(!mime||typeof canvas.captureStream!=="function")throw Error("native_mp4_not_supported");
  const stream=canvas.captureStream(12);
  let session=null,raf=0;
  try{
    if(sound!=="none"){
      session=sound==="voice"
        ?await startUploadedAudio(voice,55,{loop:false,startSeconds:8,deferStart:true})
        :await startPresetAudio(sound,55,{deferStart:true});
      if(!session)throw Error("native_audio_unavailable");
      stream.addTrack(session.track);
    }
    if(signal.aborted)throw Error("export_cancelled");
    const recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:1_500_000});
    const chunks=[];
    const nativeBlob=await new Promise((resolve,reject)=>{
      let finished=false,timeout=0,start=0;
      const settle=(error,value)=>{
        if(finished)return;
        finished=true;
        clearTimeout(timeout);
        signal.removeEventListener("abort",onAbort);
        if(raf)cancelAnimationFrame(raf);
        if(error)reject(error);else resolve(value);
      };
      const onAbort=()=>{
        try{if(recorder.state!=="inactive")recorder.stop();}catch{}
        settle(Error("export_cancelled"));
      };
      recorder.ondataavailable=event=>{if(event.data?.size)chunks.push(event.data);};
      recorder.onerror=()=>settle(Error("native_mp4_recording_failed"));
      recorder.onstop=()=>settle(null,new Blob(chunks,{type:"video/mp4"}));
      signal.addEventListener("abort",onAbort,{once:true});
      try{
        paintGift(ctx,image,data,0);
        recorder.start(1000);
        session?.begin?.();
        start=performance.now();
        timeout=setTimeout(()=>{
          try{if(recorder.state!=="inactive")recorder.stop();}catch{}
          settle(Error("native_mp4_timeout"));
        },50_000);
        const tick=()=>{
          if(signal.aborted){onAbort();return;}
          const time=(performance.now()-start)/1000;
          paintGift(ctx,image,data,Math.min(25,time));
          onProgress(Math.min(99,Math.floor(time/25*99)));
          if(time>=25){
            session?.fadeOut?.();
            if(recorder.state!=="inactive")recorder.stop();
          }else raf=requestAnimationFrame(tick);
        };
        raf=requestAnimationFrame(tick);
      }catch(error){settle(error);}
    });
    if(signal.aborted)throw Error("export_cancelled");
    const mp4=await normalizeNativeSafariMp4ForPlayback(nativeBlob,sound!=="none",VIDEO_GIFT_DURATION);
    onProgress(100);
    return mp4;
  }finally{
    if(raf)cancelAnimationFrame(raf);
    session?.close?.();
    stream.getTracks().forEach(track=>track.stop());
  }
}

async function browserPhoto(file){
  const safe=await prepareBrowserPhoto(file);
  const url=URL.createObjectURL(safe);
  try{
    const image=new Image();
    await new Promise((resolve,reject)=>{
      image.onload=()=>image.naturalWidth&&image.naturalHeight?resolve():reject(Error("photo_invalid"));
      image.onerror=()=>reject(Error("photo_invalid"));
      image.src=url;
    });
    return {image,url};
  }catch(error){URL.revokeObjectURL(url);throw error;}
}
function audioInputValid(file){
  return file&&file.size>128&&file.size<=15*1024*1024&&
    (/audio\/(mpeg|mp3|wav|x-wav|mp4|x-m4a|aac)/.test(file.type)||
      /\.(mp3|wav|m4a)$/i.test(file.name));
}
export function MandalaPersonalVideoGift({locale="en"}){
  const c=COPY[locale]||COPY.en;
  const [step,setStep]=useState(0);
  const [occasion,setOccasion]=useState("birthday");
  const [recipient,setRecipient]=useState("");
  const [picture,setPicture]=useState(null);
  const [photoError,setPhotoError]=useState("");
  const [rights,setRights]=useState(false);
  const [subject,setSubject]=useState("self");
  const [subjectPermission,setSubjectPermission]=useState(false);
  const [guardianPermission,setGuardianPermission]=useState(false);
  const [motion,setMotion]=useState("gentle-zoom");
  const [message,setMessage]=useState("");
  const [ending,setEnding]=useState(giftEnding(locale));
  const [sound,setSound]=useState("forest");
  const [voice,setVoice]=useState(null);
  const [voicePermission,setVoicePermission]=useState(false);
  const [palette,setPalette]=useState("peach");
  const [aspect,setAspect]=useState("portrait");
  const [second,setSecond]=useState(2);
  const [playing,setPlaying]=useState(false);
  const [busy,setBusy]=useState(false);
  const [progress,setProgress]=useState(0);
  const [exportError,setExportError]=useState("");
  const [result,setResult]=useState(null);
  const [saveConsent,setSaveConsent]=useState(false);
  const [saveBusy,setSaveBusy]=useState(false);
  const [saveStatus,setSaveStatus]=useState("");
  const [savedId,setSavedId]=useState("");
  const canvasRef=useRef(null);
  const abortRef=useRef(null);
  const uploadRef=useRef(null);
  const busyRef=useRef(false);
  const photoReady=giftCanUsePhoto({hasPhoto:Boolean(picture),rights,subject,subjectPermission,guardianPermission});
  const soundReady=sound!=="voice"||(Boolean(voice)&&voicePermission);
  const canNext=[true,photoReady,true,message.trim().length>0,soundReady,true][step];
  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas||!picture)return;
    const ctx=canvas.getContext("2d");
    if(ctx)paintGift(ctx,picture.image,{recipient,message,ending,motion,palette,
      defaultName:c.namePlaceholder},second);
  },[picture,recipient,message,ending,motion,palette,aspect,second,step]);
  useEffect(()=>{
    if(!playing)return;
    let raf=0;
    const start=performance.now()-second*1000;
    const tick=()=>{
      const value=Math.min(VIDEO_GIFT_DURATION,(performance.now()-start)/1000);
      setSecond(value);
      if(value<VIDEO_GIFT_DURATION)raf=requestAnimationFrame(tick);
      else setPlaying(false);
    };
    raf=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(raf);
  },[playing]);
  useEffect(()=>()=>{if(picture?.url)URL.revokeObjectURL(picture.url);},[picture]);
  useEffect(()=>()=>{if(result?.url)URL.revokeObjectURL(result.url);},[result]);
  useEffect(()=>()=>{abortRef.current?.abort();},[]);
  useEffect(()=>{
    setResult(null);setSaveConsent(false);setSaveStatus("");setSavedId("");uploadRef.current=null;
  },[occasion,recipient,picture,motion,message,ending,sound,voice,palette,aspect]);
  async function pickPhoto(file){
    if(!file||busy)return;
    setPhotoError("");
    try{const next=await browserPhoto(file);setPicture(next);}
    catch{setPhotoError(c.invalidPhoto);}
  }
  function forward(){
    if(!canNext)return;
    if(step===2&&!message.trim())setMessage(giftSuggestedText(locale,occasion,recipient));
    setPlaying(false);setStep(value=>Math.min(5,value+1));
  }
  async function create(){
    if(busyRef.current||!photoReady||!message.trim()||!soundReady||!picture)return;
    const withSound=sound!=="none";
    const nativeMime=nativeGiftFormat(withSound);
    const nativeReady=Boolean(nativeMime&&typeof HTMLCanvasElement!=="undefined"&&HTMLCanvasElement.prototype.captureStream);
    const webReady=supportsProceduralWebCodecsMp4(withSound);
    if(!nativeReady&&!webReady){setExportError(c.unsupported);return;}
    const useNative=nativeReady&&(/iPhone|iPad|iPod/i.test(navigator.userAgent)||!webReady);
    busyRef.current=true;setBusy(true);setProgress(0);setExportError("");setPlaying(false);
    const controller=new AbortController();abortRef.current=controller;
    const canvas=document.createElement("canvas");
    [canvas.width,canvas.height]=aspect==="portrait"?[360,640]:[640,360];
    const ctx=canvas.getContext("2d",{alpha:false});
    const current={recipient,message,ending,motion,palette,defaultName:c.namePlaceholder};
    try{
      if(!ctx)throw Error("canvas_unavailable");
      const audioFiles=sound==="voice"
        ?[{file:voice,loop:false,startSeconds:8,fadeOutSeconds:1}]
        :sound==="none"?[]
          :[{preset:sound,loop:true,startSeconds:0,fadeOutSeconds:2}];
      const blob=useNative
        ?await nativeGiftMp4({canvas,ctx,image:picture.image,data:current,sound,voice,
          mime:nativeMime,signal:controller.signal,onProgress:value=>setProgress(value)})
        :await encodeLocalWebCodecsMp4({
          canvas,allowProceduralBrowser:true,sourceFrameClock:"timestamp-decoded",
          seconds:VIDEO_GIFT_DURATION,frameRate:12,
          audio:audioFiles.length?{files:audioFiles,volume:55}:undefined,
          renderFrame:time=>{paintGift(ctx,picture.image,current,time);return true;},
          shouldContinue:()=>!controller.signal.aborted,
          onProgress:value=>setProgress(value),
        });
      if(controller.signal.aborted)return;
      const file=new File([blob],"holistic-house-personal-video-gift.mp4",{type:"video/mp4"});
      const url=URL.createObjectURL(blob);
      setResult({file,url});setProgress(100);
    }catch(error){
      if(!controller.signal.aborted)setExportError(
        /unsupported|webcodecs|aac|h264/.test(String(error?.message||""))?c.unsupported:c.failed);
    }finally{busyRef.current=false;setBusy(false);abortRef.current=null;}
  }
  async function share(){
    if(!result)return;
    try{
      if(!navigator.share||!navigator.canShare?.({files:[result.file]})){
        setExportError(c.noShare);return;
      }
      await navigator.share({files:[result.file],title:c.title});
    }catch(error){if(error?.name!=="AbortError")setExportError(c.noShare);}
  }
  async function save(){
    if(!result||!saveConsent||saveBusy)return;
    setSaveBusy(true);setSaveStatus("");
    try{
      const id=await savePrivateMp4({
        file:result.file,
        details:{theme:"life",sceneId:"personal-video-gift",aspect,duration:25},
        request:(path,body)=>appFetch(path,body,"POST"),
        sessionRef:uploadRef,
      });
      setSavedId(id);setSaveStatus(c.saved);
    }catch(error){
      setSaveStatus(error?.code==="SIGN_IN_REQUIRED"||error?.status===401?c.login:c.cloudOff);
    }finally{setSaveBusy(false);}
  }
  return <section className={styles.root} data-personal-video-gift lang={locale}>
    <header className={styles.head}>
      <span className={styles.eyebrow}>{c.eyebrow}</span>
      <h1>{c.title}</h1>
      <p>{c.subtitle}</p>
    </header>
    <nav className={styles.steps} aria-label={c.title}>
      {c.steps.map((label,index)=><span key={label} data-gift-step={index+1}
        aria-current={index===step?"step":undefined} className={index===step?styles.activeStep:""}>
        <span>{index+1}</span><small>{label}</small>
      </span>)}
    </nav>
    <div className={styles.card}>
      {step===0&&<div className={styles.stack}>
        <h2>{c.occasion}</h2>
        <label className={styles.field}>{c.recipient}
          <input autoComplete="off" value={recipient} maxLength={55} placeholder={c.namePlaceholder}
            onChange={e=>setRecipient(e.target.value)}/>
        </label>
        <div className={styles.choices}>
          {VIDEO_GIFT_OCCASIONS.map(id=><button type="button" key={id}
            aria-pressed={occasion===id} onClick={()=>setOccasion(id)}
            className={occasion===id?styles.chosen:styles.choice}>{c.occasions[id]}</button>)}
        </div>
      </div>}
      {step===1&&<div className={styles.stack}>
        <h2>{c.photoTitle}</h2><p>{c.photoNote}</p>
        <label className={styles.upload}>{c.choosePhoto}
          <input type="file" accept={SUPPORT_PHOTO_ACCEPT} onChange={e=>void pickPhoto(e.target.files?.[0])}/>
        </label>
        {picture&&<img src={picture.url} alt="" className={styles.photoPreview}/>}
        {photoError&&<p role="alert">{photoError}</p>}
        <label className={styles.checkbox}><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/>{c.rights}</label>
        <fieldset className={styles.fieldset}><legend>{c.photoSubject}</legend>
          {["self","adult","minor"].map(id=><label key={id} className={styles.radio}>
            <input type="radio" name="gift-subject" checked={subject===id}
              onChange={()=>{setSubject(id);setSubjectPermission(false);setGuardianPermission(false);}}/>{c[id]}</label>)}
        </fieldset>
        {subject!=="self"&&<label className={styles.checkbox}><input type="checkbox" checked={subjectPermission} onChange={e=>setSubjectPermission(e.target.checked)}/>{c.adultConsent}</label>}
        {subject==="minor"&&<label className={styles.checkbox}><input type="checkbox" checked={guardianPermission} onChange={e=>setGuardianPermission(e.target.checked)}/>{c.minorConsent}</label>}
        {!photoReady&&<p className={styles.hint}>{c.photoMissing}</p>}
      </div>}
      {step===2&&<div className={styles.stack}>
        <h2>{c.motionTitle}</h2><p>{c.freeMotion}</p>
        <div className={styles.choices}>{VIDEO_GIFT_MOTIONS.map(id=><button type="button"
          className={motion===id?styles.chosen:styles.choice} key={id}
          aria-pressed={motion===id} onClick={()=>setMotion(id)}>{c.motions[id]}</button>)}</div>
        <div className={styles.locked}><strong>{c.aiMotions}</strong>
          <p>{c.aiList}</p><small>{c.aiLocked}</small></div>
      </div>}
      {step===3&&<div className={styles.stack}>
        <h2>{c.messageTitle}</h2>
        <label className={styles.field}>{c.messageLabel}
          <textarea value={message} maxLength={260} rows={5} onChange={e=>setMessage(e.target.value)}/>
        </label>
        <button type="button" className={styles.secondary} onClick={()=>setMessage(giftSuggestedText(locale,occasion,recipient))}>{c.suggest}</button>
        <p className={styles.hint}>{c.suggestNote}</p>
        <label className={styles.field}>{c.ending}
          <input value={ending} maxLength={110} placeholder={c.endingPlaceholder} onChange={e=>setEnding(e.target.value)}/>
        </label>
        {!message.trim()&&<p className={styles.hint}>{c.messageMissing}</p>}
      </div>}
      {step===4&&<div className={styles.stack}>
        <h2>{c.soundTitle}</h2>
        <div className={styles.choices}>{SOUND_IDS.map(id=><button type="button" key={id}
          className={sound===id?styles.chosen:styles.choice} aria-pressed={sound===id}
          onClick={()=>setSound(id)}>{c.sounds[id]}</button>)}</div>
        {sound==="voice"&&<>
          <label className={styles.field}>{c.voice}
            <input type="file" accept=".mp3,.wav,.m4a,audio/*" onChange={e=>{
              const file=e.target.files?.[0];
              setVoice(audioInputValid(file)?file:null);setVoicePermission(false);
            }}/>
          </label>
          <p className={styles.hint}>{voice?voice.name:c.voiceNote}</p>
          <label className={styles.checkbox}><input type="checkbox" checked={voicePermission}
            onChange={e=>setVoicePermission(e.target.checked)}/>{c.voiceConsent}</label>
        </>}
        <div className={styles.split}>
          <label className={styles.field}>{c.orientation}
            <select value={aspect} onChange={e=>setAspect(e.target.value)}>
              <option value="portrait">{c.portrait}</option>
              <option value="landscape">{c.landscape}</option>
            </select></label>
          <label className={styles.field}>Palette
            <select value={palette} onChange={e=>setPalette(e.target.value)}>
              <option value="peach">Warm Peach</option>
              <option value="ocean">Ocean</option>
              <option value="lavender">Lavender</option>
            </select></label>
        </div>
      </div>}
      {step===5&&<div className={styles.stack}>
        <h2>{c.previewTitle}</h2>
        <p className={styles.hint}>{c.timing}</p>
        <div className={styles.player} data-gift-aspect={aspect}>
          <canvas ref={canvasRef} width={aspect==="portrait"?360:640}
            height={aspect==="portrait"?640:360} aria-label={c.previewTitle}/>
        </div>
        <div className={styles.previewControls}>
          <button type="button" className={styles.secondary} onClick={()=>setPlaying(v=>!v)}>
            {playing?c.stop:c.preview}</button>
          <input aria-label="Video timeline" type="range" min="0" max={VIDEO_GIFT_DURATION}
            step=".5" value={second} onChange={e=>{setPlaying(false);setSecond(Number(e.target.value));}}/>
          <small>{Math.floor(second)} / {VIDEO_GIFT_DURATION}s</small>
        </div>
        <p className={styles.hint}>{c.previewOnly}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.primary} disabled={busy} onClick={()=>void create()}>
            {busy?c.creating+" "+progress+"%":c.create}</button>
          {busy&&<button type="button" className={styles.secondary}
            onClick={()=>abortRef.current?.abort()}>{c.cancel}</button>}
        </div>
        {busy&&<progress className={styles.progress} value={progress} max={100}/>}
        {exportError&&<p role="alert" className={styles.error}>{exportError}</p>}
        {result&&<div className={styles.result} data-gift-result>
          <video controls playsInline preload="metadata" src={result.url}/>
          <div className={styles.actions}>
            <a className={styles.primaryLink} href={result.url} download={result.file.name}>{c.download}</a>
            <button type="button" className={styles.secondary} onClick={()=>void share()}>{c.share}</button>
          </div>
          <label className={styles.checkbox}><input type="checkbox" checked={saveConsent}
            onChange={e=>setSaveConsent(e.target.checked)}/>{c.saveConsent}</label>
          <button type="button" className={styles.secondary} disabled={!saveConsent||saveBusy||Boolean(savedId)}
            onClick={()=>void save()}>{saveBusy?c.saving:c.cloudSave}</button>
          {saveStatus&&<p role="status">{saveStatus}</p>}
          <Link href={"/"+(locale==="es"?"en":locale)+"/app/videos"}>{c.myVideos}</Link>
        </div>}
      </div>}
      <div className={styles.footer}>
        {step>0&&<button type="button" className={styles.secondary}
          disabled={busy||saveBusy} onClick={()=>{setPlaying(false);setStep(v=>v-1);}}>{c.back}</button>}
        {step<5&&<button type="button" className={styles.primary}
          disabled={!canNext||busy} onClick={forward}>{c.next}</button>}
      </div>
    </div>
    <p className={styles.privacy}>{c.privacy}</p>
  </section>;
}
