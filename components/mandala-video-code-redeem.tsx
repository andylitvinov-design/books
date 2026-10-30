"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Copy,Download,Film,LockKeyhole,RefreshCw,Sparkles} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-video-code-redeem.module.css";

type Tier="smart"|"pro";
type Props={locale:PublicLocale;tier:Tier;onAvailability:(ready:boolean)=>void;suggestedPrompt:string};
type Job={jobId:string;status:string;ready?:boolean;error?:string};
const copy={
  ru:{title:"Ваш код генерации",description:"Код выдается после подтверждения оплаты или как подарок Smart. Он действует для одного заказа.",
    code:"Одноразовый код",placeholder:"HHV-...",prompt:"Какой новый видеокадр создать?",
    promptPlaceholder:"Кинематографический пролёт над туманным лесом на рассвете, мягкий свет, плавная камера…",
    agree:"Я разрешаю передать только это визуальное описание внешней видеомодели. Не указываю личные данные, диагнозы и результаты тестов.",
    create:"Создать AI-фрагмент по коду",check:"Проверить готовность",download:"Скачать AI-фрагмент",
    login:"Войдите через Google, чтобы использовать код",loginLink:"Войти в Мой дом",
    unavailable:"Платный API пока не активирован. Коды ещё нельзя погасить — деньги не списываются.",
    ready:"API активен. Можно использовать выданный одноразовый код.",
    invalid:"Не удалось подтвердить код или заявку. Проверьте код и заказ.",
    started:"Ролик принят в работу. Сохраняйте эту вкладку для проверки статуса.",
    unknown:"Результат отправки неопределён. Обратитесь к мастеру: повторный запуск может привести к двойному списанию.",
    status:"Статус",done:"AI-фрагмент готов. Скачайте его для финального монтажа.",
    pending:"Генерация выполняется. Проверьте статус позднее.",
    compile:"Составить из фильтров",copyPrompt:"Копировать промпт",promptCopied:"Промпт скопирован.",
    consentStorage:"Разрешаю сохранить готовый ролик в приватном кабинете.",archive:"Сохранить в Мой дом",archived:"Видео сохранено в приватном кабинете.",myVideos:"Мои AI-видео",
    not30:"На первом этапе код создаёт короткий AI-фрагмент (Smart — 8 с; Pro — 15 с). Полный 30-секундный фильм собирается отдельно.",
  },
  en:{title:"Your video code",description:"Code issued after payment verification or as a one-time Smart gift.",
    code:"One-time code",placeholder:"HHV-...",prompt:"Describe the NEW AI shot",
    promptPlaceholder:"A cinematic camera glides through a misty sunrise forest with gentle natural light…",
    agree:"I agree to send only this visual description to an external video model. No personal data, diagnoses or test results.",
    create:"Generate AI shot with code",check:"Check progress",download:"Download AI shot",
    login:"Sign in with Google to use your code",loginLink:"Open My House",
    unavailable:"Paid API is not activated yet. Codes cannot be redeemed and no payment is charged.",
    ready:"AI service available. Enter your issued single-use code.",
    invalid:"Code or request could not be confirmed. Check the code and your order.",
    started:"Video accepted. Return here to check job status.",
    unknown:"Submission is uncertain. Contact the owner: restarting could duplicate a charge.",
    status:"Status",done:"AI shot is ready. Download it for the final edit.",
    pending:"Still generating. Check again later.",
    compile:"Build from filters",copyPrompt:"Copy prompt",promptCopied:"Prompt copied.",
    consentStorage:"I agree to save this video privately in My House.",archive:"Save privately",archived:"Video saved in My House.",myVideos:"My AI videos",
    not30:"Initially each code produces one AI shot (Smart 8s; Pro 15s). The full 30s movie is assembled separately.",
  },
  es:{title:"Tu código de vídeo",description:"Código emitido tras confirmar el pago o como regalo Smart único.",
    code:"Código de un uso",placeholder:"HHV-...",prompt:"Describe la escena NUEVA",
    promptPlaceholder:"Una cámara cinematográfica recorre un bosque con niebla y luz dorada al amanecer…",
    agree:"Autorizo enviar solo esta descripción visual a una IA externa. No incluyo datos personales ni médicos.",
    create:"Generar escena IA con código",check:"Consultar estado",download:"Descargar escena IA",
    login:"Inicia sesión con Google para usar el código",loginLink:"Abrir Mi Casa",
    unavailable:"La API de pago aún no está activa. Los códigos no se pueden canjear y no se cobra nada.",
    ready:"Servicio disponible. Introduce el código de un solo uso.",
    invalid:"No se pudo verificar el código o la solicitud. Comprueba tu pedido.",
    started:"Vídeo aceptado. Puedes consultar el estado aquí.",
    unknown:"Envío incierto. Contacta con el propietario: repetirlo podría duplicar el coste.",
    status:"Estado",done:"La escena IA está lista. Descárgala para el montaje final.",
    pending:"Aún generando. Consulta más tarde.",
    compile:"Preparar desde filtros",copyPrompt:"Copiar prompt",promptCopied:"Prompt copiado.",
    consentStorage:"Autorizo guardar este vídeo en mi cuenta privada.",archive:"Guardar en Mi Casa",archived:"Vídeo guardado de forma privada.",myVideos:"Mis vídeos IA",
    not30:"Por ahora cada código crea una escena IA (Smart 8 s; Pro 15 s). El vídeo completo de 30 s se monta aparte.",
  },
} as const;
export function MandalaVideoCodeRedeemer({locale,tier,onAvailability,suggestedPrompt}:Props){
  const t=copy[locale];
  const [ready,setReady]=useState(false);
  const [checking,setChecking]=useState(false);
  const [accountId,setAccountId]=useState("");
  const [code,setCode]=useState("");
  const [visualPrompt,setVisualPrompt]=useState(suggestedPrompt);
  const [promptEdited,setPromptEdited]=useState(false);
  const [archiveAvailable,setArchiveAvailable]=useState(false);
  const [storageConsent,setStorageConsent]=useState(false);
  const [consent,setConsent]=useState(false);
  const [aspectRatio,setAspectRatio]=useState<"9:16"|"16:9"|"1:1">("9:16");
  const [job,setJob]=useState<Job|null>(null);
  const [message,setMessage]=useState("");
  useEffect(()=>{if(!promptEdited)setVisualPrompt(suggestedPrompt);},[promptEdited,suggestedPrompt]);
  useEffect(()=>{
    let alive=true;
    void fetch("/api/holistic-support/video/availability",{cache:"no-store"})
      .then(async r=>r.ok?await r.json():{enabled:false})
      .then(async data=>{
        if(!alive)return;
        const enabled=data?.enabled===true;
        setReady(enabled);onAvailability(enabled);
        setArchiveAvailable(data?.archiveEnabled===true);
        if(!enabled)return;
        const identity=await fetch("/api/app/videos/generate/identity",
          {cache:"no-store",credentials:"same-origin"});
        if(alive&&identity.ok){
          const user=await identity.json();
          if(typeof user.accountId==="string")setAccountId(user.accountId);
        }
      }).catch(()=>{if(alive){setReady(false);onAvailability(false);}});
    return()=>{alive=false;onAvailability(false)};
  },[onAvailability]);
  async function copyPrompt(){
    try{await navigator.clipboard.writeText(visualPrompt);setMessage(t.promptCopied)}
    catch{setMessage(t.invalid)}
  }
  async function archive(){
    if(!job||job.status!=="completed"||checking||!storageConsent||!archiveAvailable)return;
    setChecking(true);
    try{
      const response=await fetch("/api/app/videos/generate/archive",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json","x-hh-account-id":accountId},
        body:JSON.stringify({jobId:job.jobId,consentStore:true}),
      });
      if(!response.ok)throw Error("archive");
      setMessage(t.archived);
      setStorageConsent(false);
    }catch{setMessage(t.invalid)}finally{setChecking(false)}
  }
  async function submit(){
    if(checking||!ready||!accountId||!code||!consent||visualPrompt.trim().length<18)return;
    setChecking(true);setMessage("");
    try{
      const response=await fetch("/api/app/videos/generate",{
        method:"POST",credentials:"same-origin",cache:"no-store",
        headers:{"Content-Type":"application/json","x-hh-account-id":accountId},
        body:JSON.stringify({code,tier,visualPrompt,aspectRatio,consentExternal:consent}),
      });
      const data=await response.json();
      if(!response.ok||!data.jobId){setMessage(t.invalid);return;}
      setCode("");
      setJob(data);
      setMessage(data.status==="unknown"?t.unknown:t.started);
    }catch{setMessage(t.invalid)}
    finally{setChecking(false)}
  }
  async function refresh(){
    if(!job||checking)return;
    setChecking(true);
    try{
      const response=await fetch("/api/app/videos/generate?id="+encodeURIComponent(job.jobId),{
        headers:{"x-hh-account-id":accountId},credentials:"same-origin",cache:"no-store"});
      const data=await response.json();
      if(!response.ok){setMessage(t.invalid);return;}
      setJob(data);setMessage(data.status==="completed"?t.done:
        data.status==="unknown"?t.unknown:t.pending);
    }catch{setMessage(t.invalid)}finally{setChecking(false)}
  }
  async function download(){
    if(!job||job.status!=="completed"||checking)return;
    setChecking(true);
    try{
      const response=await fetch("/api/app/videos/generate/content?id="+
        encodeURIComponent(job.jobId),{credentials:"same-origin",cache:"no-store",
          headers:{"x-hh-account-id":accountId}});
      if(!response.ok)throw Error("download_failed");
      const blob=await response.blob();
      if(!/^video\//.test(blob.type))throw Error("invalid_video");
      const objectURL=URL.createObjectURL(blob);
      const anchor=document.createElement("a");
      anchor.href=objectURL;anchor.download="holistic-house-ai-clip.mp4";
      document.body.appendChild(anchor);anchor.click();anchor.remove();
      window.setTimeout(()=>URL.revokeObjectURL(objectURL),15000);
    }catch{setMessage(t.invalid)}finally{setChecking(false)}
  }
  return <section data-video-code-redeemer className={css.root} aria-label={t.title}>
    <h3><LockKeyhole size={17} aria-hidden="true"/>{t.title}</h3>
    <p>{t.description}</p>
    <p className={ready?css.ok:css.warning} role="status" data-video-api-ready={ready}>
      {ready?t.ready:t.unavailable}
    </p>
    {ready&&!accountId?<p>{t.login} <Link href={"/"+locale+"/app"}>{t.loginLink}</Link></p>:null}
    <fieldset disabled={checking} className={css.controls}>
      <label>{t.code}<input type="text" data-video-redeem-code value={code}
        autoComplete="off" placeholder={t.placeholder} maxLength={54}
        onChange={e=>setCode(e.currentTarget.value)} /></label>
      <div className={css.promptActions}>
        <button type="button" data-video-ai-compile
          onClick={()=>{setVisualPrompt(suggestedPrompt);setPromptEdited(false);}}>
          <Sparkles size={16} aria-hidden="true"/>{t.compile}
        </button>
        <button type="button" data-video-ai-copy
          onClick={()=>void copyPrompt()} disabled={!visualPrompt.trim()}>
          <Copy size={16} aria-hidden="true"/>{t.copyPrompt}
        </button>
      </div>
      <label>{t.prompt}<textarea data-video-ai-visual-prompt value={visualPrompt}
        rows={3} maxLength={800} placeholder={t.promptPlaceholder}
        onChange={e=>{setVisualPrompt(e.currentTarget.value);setPromptEdited(true);}}/></label>
      <label>{locale==="ru"?"Формат":locale==="es"?"Formato":"Format"}
        <select value={aspectRatio} data-video-ai-aspect onChange={e=>
          setAspectRatio(e.currentTarget.value as "9:16"|"16:9"|"1:1")}>
          <option value="9:16">9:16</option>
          <option value="16:9">16:9</option>
          <option value="1:1">1:1</option>
        </select>
      </label>
      <label className={css.consent}><input type="checkbox" checked={consent}
        onChange={e=>setConsent(e.currentTarget.checked)} data-video-ai-consent/>
        <span>{t.agree}</span></label>
      <button type="button" data-video-ai-submit onClick={()=>void submit()}
        disabled={checking||!ready||!accountId||!code||visualPrompt.trim().length<18||!consent}>
        <Film size={17} aria-hidden="true"/>{t.create}
      </button>
    </fieldset>
    <p className={css.help}>{t.not30}</p>
    {job?<div className={css.job} data-video-ai-job>
      <strong>{t.status}: {job.status}</strong>
      {job.status==="completed"?
        <button type="button" onClick={()=>void download()} disabled={checking}
          data-video-ai-download><Download size={16} aria-hidden="true"/>{t.download}</button>:
        <button type="button" onClick={()=>void refresh()} disabled={checking||job.status==="unknown"}
          data-video-ai-refresh><RefreshCw size={16} aria-hidden="true"/>{t.check}</button>}
      {job.status==="completed"?<>
        <video controls playsInline preload="none"
          src={"/api/app/videos/generate/content?id="+encodeURIComponent(job.jobId)}
          aria-label={t.done} className={css.video}/>
        {archiveAvailable?<label className={css.consent}>
          <input type="checkbox" checked={storageConsent}
            onChange={event=>setStorageConsent(event.currentTarget.checked)}/>
          {t.consentStorage}
        </label>:null}
        {archiveAvailable?<button type="button" data-video-ai-archive
          disabled={!storageConsent||checking} onClick={()=>void archive()}>
          <Download size={16} aria-hidden="true"/>{t.archive}</button>:null}
      </>:null}
      <Link href={"/"+locale+"/app/videos"}>{t.myVideos}</Link>
    </div>:null}
    {message?<p role="status" className={css.message}>{message}</p>:null}
  </section>;
}
