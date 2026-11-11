"use client";

import {useState} from "react";
import Link from "next/link";
import {Film, ExternalLink, RefreshCcw} from "lucide-react";

type Locale="en"|"ru"|"es";
type Result={taskId:string;status:string;videoUrl?:string|null;duration?:number|null;externalTaskId?:string|null};
type Props={initialLocale:Locale;configured:boolean;enabled:boolean};
const copy={
  en:{
    title:"Kling · your face and voice",intro:"A private owner-only test: your own portrait + your actual spoken recording. No stock voices or client media.",
    statusOn:"Avatar API pilot enabled — one paid render only after separate confirmation.",
    statusOff:"Avatar API render is held until the owner’s budget and server switch are verified; free/manual Kling Studio remains available.",
    noKey:"The Kling API key is missing. Use Kling Web for a manual test.",
    probe:"Verify Kling key (free GET)",probeBusy:"Checking API…",probeOk:"Kling accepted the API key. No video generated.",probeNoPack:"No active video package confirmed. Cash balance and pricing are not checked.",probeFail:"Kling has not confirmed this API key; check provider access.",
    photo:"Your own JPG or PNG portrait",voice:"Your original voice (WAV, MP3, M4A, AAC)",tip:"Use a clear solo portrait. Only a 2–5 second voice excerpt; other formats are converted locally to mono WAV, never archived here.",
    prompt:"Performance direction",consent:"This is my own face and voice. No client, private report or other person's image/audio.",
    privacy:"I approve sending these two specific media files to Kling for this render only.",
    cost:"I approve ONE potentially paid Kling Avatar Standard 720p job (maximum 5 seconds). I have checked the current provider price and remaining balance; the site cannot guarantee the final charge.",
    generate:"Create private test preview",busy:"Preparing and submitting…",inspect:"Check existing task",task:"Kling task ID (keep it)",
    result:"Private preview — not published",archive:"Check lip sync, voice, face, hands and commercial rights; download and archive the MP4 before the provider removes it. Publishing is a separate decision.",
    manual:"Open Kling Avatar web",google:"Connect Google / YouTube",none:"No generation has been submitted.",
    errors:{disabled:"Avatar generation is disabled server-side.",not_configured:"The API key is not configured.",approval:"Confirm consent and the single-render cost.",validation:"Use one approved portrait and a voice clip between 2 and 5 seconds.",origin:"The request must come from the admin website.",unauthorized:"Your admin session has expired.",provider_unavailable:"No definitive response from Kling. Check provider history before any retry.",local:"The selected files cannot be prepared on this device.",unknown:"Unable to complete the request."},
  },
  ru:{
    title:"Kling · моё лицо и голос",intro:"Приватный тест цифрового двойника: твой собственный портрет и настоящая запись голоса. Без стоковых голосов и клиентских данных.",
    statusOn:"Пилот Kling Avatar API доступен. Каждый платный рендер требует отдельного подтверждения.",
    statusOff:"Рендер аватара выключен до проверки бюджета и серверного переключателя. Ручная студия Kling доступна.",
    noKey:"Ключ Kling API отсутствует. Используйте веб-редактор Kling для пробного ролика.",
    probe:"Проверить Kling API (без рендера)",probeBusy:"Проверка подключения…",probeOk:"Kling подтвердил ключ. Рендер не запускался.",probeNoPack:"Активный пакет видео не подтверждён. Денежный баланс и цена не проверены.",probeFail:"Подключение к Kling не подтверждено; проверьте ключ и доступ.",
    photo:"Мой портрет JPG или PNG",voice:"Моя оригинальная речь (WAV, MP3, M4A, AAC)",tip:"Портрет — один человек, лицо видно. Речь — от 2 до 5 секунд; конвертация в WAV выполняется локально в браузере.",
    prompt:"Мимика и движения",consent:"Это моё лицо и мой голос; здесь нет клиентов, частных отчётов или записей других людей.",
    privacy:"Я разрешаю передать два выбранных файла Kling только для этой генерации.",
    cost:"Я разрешаю ОДИН потенциально платный рендер Kling Avatar Standard 720p (не более 5 секунд). Я проверил актуальную цену и остаток средств у Kling; сайт не гарантирует итоговую стоимость.",
    generate:"Создать приватный тест",busy:"Подготовка и отправка…",inspect:"Проверить задачу",task:"ID задачи Kling (сохраните)",
    result:"Приватное превью — не опубликовано",archive:"Проверьте лицо, голос, lip-sync и жесты. Сохраните MP4 в архив до удаления у провайдера. Публикация — отдельное разрешение.",
    manual:"Открыть Kling Avatar",google:"Подключить Google / YouTube",none:"Новых генераций пока нет.",
    errors:{disabled:"Генерация аватара выключена на сервере.",not_configured:"Ключ Kling API не настроен.",approval:"Подтвердите права и стоимость одного рендера.",validation:"Выберите свой портрет и голос длиной 2–5 секунд.",origin:"Запрос допускается только из админки сайта.",unauthorized:"Сессия администратора закончилась.",provider_unavailable:"Kling не подтвердил результат запроса. Проверьте историю провайдера до повторного запуска.",local:"Не удалось обработать выбранные файлы на устройстве.",unknown:"Не удалось выполнить операцию."},
  },
  es:{
    title:"Kling · mi rostro y voz",intro:"Prueba privada: tu foto y tu voz auténtica. Sin voces genéricas ni datos de clientes.",
    statusOn:"El piloto está activado. Cada generación de pago requiere confirmación individual.",
    statusOff:"El render está bloqueado hasta confirmar el presupuesto y activar el servidor. Kling Web sigue disponible.",
    noKey:"No se ha configurado la clave API. Utiliza la versión web.",
    probe:"Comprobar clave Kling (sin generar)",probeBusy:"Comprobando…",probeOk:"Kling confirmó la clave. No se generó ningún vídeo.",probeNoPack:"No se confirmó paquete activo. No se verificó el saldo ni el precio.",probeFail:"Kling no ha confirmado la clave; revisa el acceso.",
    photo:"Mi retrato JPG o PNG",voice:"Mi grabación WAV, MP3, M4A o AAC",tip:"Una cara visible; audio original de 2–5 segundos, convertido a WAV en el navegador.",
    prompt:"Expresión y movimiento",consent:"Esta es mi cara y mi voz; no incluye clientes ni datos privados.",
    privacy:"Autorizo enviar estos dos archivos a Kling para esta generación.",
    cost:"Apruebo UNA generación de pago Avatar Standard 720p (máximo 5 segundos). He comprobado el precio y el saldo vigentes; el sitio no garantiza el cobro final.",
    generate:"Crear vista previa privada",busy:"Preparando y enviando…",inspect:"Consultar tarea",task:"ID de tarea Kling",
    result:"Vista previa privada — sin publicar",archive:"Revisa los labios, el rostro y la voz. Guarda el MP4 antes de su eliminación; publicación por separado.",
    manual:"Abrir Kling Avatar",google:"Conectar Google / YouTube",none:"No se ha enviado una generación.",
    errors:{disabled:"La generación está deshabilitada en el servidor.",not_configured:"Falta la clave API.",approval:"Confirma tu consentimiento y el coste.",validation:"Usa un retrato propio y audio de 2–5 segundos.",origin:"Solicita la operación desde la web de administración.",unauthorized:"La sesión ha caducado.",provider_unavailable:"Kling no confirmó. Comprueba su historial antes de repetir.",local:"No se pueden preparar estos archivos.",unknown:"La solicitud no se pudo completar."},
  },
} as const;
const DEFAULT_PROMPT="Calm experienced therapist speaking directly to the camera. Natural breathing, steady eyes, subtle head movement, hands mostly still, realistic warm room and original appearance.";

async function preparePortrait(file:File):Promise<File>{
  if(file.size>8_000_000||!["image/jpeg","image/png"].includes(file.type))throw Error("local");
  const bitmap=await createImageBitmap(file);
  try{
    if(bitmap.width<300||bitmap.height<300||bitmap.width/bitmap.height>2.5||bitmap.height/bitmap.width>2.5)throw Error("local");
    const ratio=Math.min(1,1280/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement("canvas");
    canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);
    const ctx=canvas.getContext("2d");if(!ctx)throw Error("local");
    ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
    let blob:Blob|null=null;
    for(const quality of [0.85,0.72,0.60]){
      blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
      if(blob && blob.size<=950000)break;
    }
    if(!blob||blob.size>950000)throw Error("local");
    return new File([blob],"owner-portrait.jpg",{type:"image/jpeg"});
  }finally{bitmap.close();}
}
async function toPcmWav(file:File):Promise<File>{
  if(file.size>8_000_000||!["audio/wav","audio/x-wav","audio/wave","audio/mpeg","audio/mp3","audio/mp4","audio/x-m4a","audio/aac","audio/x-aac","application/octet-stream"].includes(file.type))
    throw Error("local");
  const audio=new AudioContext();
  let rendered:AudioBuffer;
  try{
    const buffer=await audio.decodeAudioData(await file.arrayBuffer());
    if(buffer.duration<2||buffer.duration>5)throw Error("local");
    const offline=new OfflineAudioContext(1,Math.ceil(buffer.duration*16000),16000);
    const src=offline.createBufferSource();src.buffer=buffer;src.connect(offline.destination);src.start();
    rendered=await offline.startRendering();
  }finally{await audio.close();}
  const samples=rendered.getChannelData(0), pcm=new ArrayBuffer(44+samples.length*2),view=new DataView(pcm);
  const four=(off:number,value:string)=>{for(let i=0;i<value.length;i++)view.setUint8(off+i,value.charCodeAt(i));};
  four(0,"RIFF");view.setUint32(4,36+samples.length*2,true);four(8,"WAVE");
  four(12,"fmt ");view.setUint32(16,16,true);view.setUint16(20,1,true);
  view.setUint16(22,1,true);view.setUint32(24,16000,true);view.setUint32(28,32000,true);
  view.setUint16(32,2,true);view.setUint16(34,16,true);
  four(36,"data");view.setUint32(40,samples.length*2,true);
  for(let i=0;i<samples.length;i++){const value=Math.max(-1,Math.min(1,samples[i]));view.setInt16(44+i*2,value<0?value*32768:value*32767,true);}
  if(pcm.byteLength>2100000)throw Error("local");
  return new File([pcm],"owner-voice.wav",{type:"audio/wav"});
}

export function KlingAvatarStudio({initialLocale,configured,enabled}:Props){
  const [lang,setLang]=useState<Locale>(initialLocale);
  const [image,setImage]=useState<File|null>(null),[audio,setAudio]=useState<File|null>(null);
  const [prompt,setPrompt]=useState(DEFAULT_PROMPT);
  const [owner,setOwner]=useState(false),[rights,setRights]=useState(false),[paid,setPaid]=useState(false);
  const [busy,setBusy]=useState(false),[task,setTask]=useState<Result|null>(null),[taskId,setTaskId]=useState("");
  const [connection,setConnection]=useState<"idle"|"checking"|"connected"|"failed">("idle");
  const [packageActive,setPackageActive]=useState(false);
  const [external,setExternal]=useState(""),[error,setError]=useState<keyof typeof copy.ru.errors|null>(null);
  const t=copy[lang];
  async function verifyConnection(){
    if(!configured||busy||connection==="checking")return;
    setConnection("checking");
    try{
      const response=await fetch("/api/admin/kling-avatar?mode=connection",{cache:"no-store"});
      const data=await response.json();
      if(data?.ok&&data.result?.connected===true){
        setConnection("connected");setPackageActive(data.result.hasActivePackage===true);
      }else setConnection("failed");
    }catch{setConnection("failed");}
  }
  async function generate(){
    if(!image||!audio||!owner||!rights||!paid){setError("approval");return;}
    if(busy||!enabled)return;
    setBusy(true);setError(null);setTask(null);
    const id="hh_avatar_"+crypto.randomUUID().replace(/-/g,"");
    setExternal(id);
    try{
      const [img,wav]=await Promise.all([preparePortrait(image),toPcmWav(audio)]);
      const form=new FormData();
      form.append("image",img);form.append("audio",wav);form.append("prompt",prompt);
      form.append("externalTaskId",id);form.append("paidApproved","true");
      form.append("identityApproved","true");form.append("privacyApproved","true");
      const r=await fetch("/api/admin/kling-avatar",{method:"POST",body:form,cache:"no-store"});
      const data=await r.json();
      if(!data?.ok){setError(data?.error in t.errors?data.error:"unknown");return;}
      setTask(data.result);setTaskId(data.result.taskId);
    }catch(e){setError(e instanceof Error&&e.message==="local"?"local":"unknown");}
    finally{setBusy(false);setPaid(false);}
  }
  async function inspect(){
    if(busy||!taskId.trim())return;
    setBusy(true);setError(null);
    try{
      const r=await fetch("/api/admin/kling-avatar?taskId="+encodeURIComponent(taskId.trim()),{cache:"no-store"});
      const data=await r.json();
      if(!data?.ok){setError(data?.error in t.errors?data.error:"unknown");return;}
      setTask(data.result);
    }catch{setError("unknown");}finally{setBusy(false);}
  }
  return <section id="kling-avatar-studio" aria-label={t.title} style={{margin:"20px auto",maxWidth:980,border:"1px solid #c4b29d",borderRadius:14,background:"#f7f1e8",color:"#513e30",padding:"clamp(12px,3vw,24px)"}}>
    <div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",flexWrap:"wrap"}}>
      <h2 style={{margin:0,fontSize:"1.15rem",display:"flex",alignItems:"center",gap:8}}><Film size={20}/>{t.title}</h2>
      <select aria-label="Language" value={lang} onChange={e=>setLang(e.target.value as Locale)} style={{background:"#fff",color:"#513e30",padding:7,border:"1px solid #c4b29d",borderRadius:6}}>
        <option value="en">EN</option><option value="ru">RU</option><option value="es">ES</option>
      </select>
    </div>
    <p style={{fontSize:14,lineHeight:1.5}}>{t.intro}</p>
    <p role="status" style={{fontSize:13}}>{!configured?t.noKey:enabled?t.statusOn:t.statusOff}</p>
    {configured&&<div className="kling-avatar-connection" style={{display:"flex",alignItems:"center",flexWrap:"wrap",gap:9,margin:"10px 0"}}>
      <button type="button" disabled={busy||connection==="checking"} onClick={verifyConnection}
        style={{minHeight:44,border:"1px solid #b7a089",borderRadius:8,padding:"8px 12px",background:"#fff",color:"#513e30"}}>
        {connection==="checking"?t.probeBusy:t.probe}
      </button>
      <span role="status" aria-live="polite" style={{fontSize:13}}>{connection==="connected"?(packageActive?t.probeOk:t.probeOk+" "+t.probeNoPack):connection==="failed"?t.probeFail:""}</span>
    </div>}
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,270px),1fr))",gap:14,marginTop:14}}>
      <label style={{fontSize:13,display:"grid",gap:6}}>{t.photo}
        <input type="file" accept="image/jpeg,image/png" onChange={e=>setImage(e.target.files?.[0]||null)} aria-required="true" style={{maxWidth:"100%",fontSize:13}}/>
      </label>
      <label style={{fontSize:13,display:"grid",gap:6}}>{t.voice}
        <input type="file" accept=".wav,.mp3,.m4a,.aac,audio/*" onChange={e=>setAudio(e.target.files?.[0]||null)} aria-required="true" style={{maxWidth:"100%",fontSize:13}}/>
      </label>
    </div>
    <p style={{fontSize:12}}>{t.tip}</p>
    <label style={{fontSize:13,display:"grid",gap:6,margin:"14px 0"}}>{t.prompt}
      <textarea rows={3} maxLength={1200} value={prompt} onChange={e=>setPrompt(e.target.value)}
        style={{maxWidth:"100%",padding:9,background:"white",color:"#513e30",border:"1px solid #c4b29d",borderRadius:7,font:"inherit",resize:"vertical"}}/>
    </label>
    <div style={{display:"grid",gap:9,fontSize:13,lineHeight:1.45}}>
      <label><input type="checkbox" checked={owner} onChange={e=>setOwner(e.target.checked)}/> {t.consent}</label>
      <label><input type="checkbox" checked={rights} onChange={e=>setRights(e.target.checked)}/> {t.privacy}</label>
      <label><input type="checkbox" checked={paid} onChange={e=>setPaid(e.target.checked)}/> {t.cost}</label>
    </div>
    <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap",marginTop:15}}>
      <button type="button" disabled={!enabled||!configured||busy||!image||!audio||!owner||!rights||!paid} onClick={generate}
        style={{padding:"10px 14px",minHeight:44,borderRadius:8,border:0,color:"white",background:"#634a37",cursor:"pointer",opacity:(!enabled||!configured||busy||!image||!audio||!owner||!rights||!paid)?0.55:1}}>
        {busy?t.busy:t.generate}
      </button>
      <a href="https://kling.ai/feature/avatars" target="_blank" rel="noopener noreferrer" style={{fontSize:13,color:"#634a37",display:"inline-flex",gap:5,alignItems:"center"}}>{t.manual}<ExternalLink size={14}/></a>
      <Link href="/admin/youtube-upload" style={{fontSize:13,color:"#634a37",display:"inline-flex",gap:5,alignItems:"center"}}>{t.google}<ExternalLink size={14}/></Link>
    </div>
    <div style={{marginTop:15,fontSize:13}}>
      <label style={{display:"grid",gap:5}}>{t.task}
        <input type="text" autoComplete="off" value={taskId} onChange={e=>setTaskId(e.target.value)} placeholder="Task ID" maxLength={128}
          style={{padding:9,minHeight:40,borderRadius:6,border:"1px solid #c4b29d",background:"white",color:"#513e30",width:"100%",maxWidth:450}}/>
      </label>
      <button type="button" disabled={!taskId||busy||!configured} onClick={inspect} style={{marginTop:8,padding:"8px 10px",minHeight:44,border:"1px solid #ab9682",borderRadius:8,background:"white",color:"#513e30",display:"inline-flex",gap:5,alignItems:"center"}}><RefreshCcw size={14}/>{t.inspect}</button>
      {external&&<p><strong>External:</strong> <code style={{overflowWrap:"anywhere"}}>{external}</code></p>}
      {error&&<p role="alert" style={{color:"#8c281d"}}>{t.errors[error]}</p>}
      {task?<div aria-live="polite"><p><strong>{t.result}</strong> · {task.status}</p>
        {task.videoUrl&&<a href={task.videoUrl} target="_blank" rel="noopener noreferrer" style={{overflowWrap:"anywhere"}}>MP4 · {task.duration??""}s</a>}
        <p style={{fontSize:12}}>{t.archive}</p></div>:<p>{t.none}</p>}
    </div>
  </section>;
}
