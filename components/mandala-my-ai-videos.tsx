"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Download,Film,RefreshCw} from "lucide-react";

type Locale="ru"|"en"|"es";
type Job={jobId:string;tier:string;status:string;storageState:string;
  size?:number|null;storedAt?:string|null;createdAt?:string|null};
const copies={
  ru:{heading:"Мои AI-видео",intro:"Личные видео, созданные по вашему запросу. Не публикуются открыто без отдельного согласия.",
    empty:"Вы ещё не создавали платные AI-фрагменты.",signin:"Для просмотра видео войдите в свой кабинет.",
    open:"Создать видео",login:"Войти через Google",refresh:"Обновить",
    ready:"Просмотр готового видео",save:"Сохранить MP4",paused:"Новая генерация может быть приостановлена; ранее сохранённые видео остаются приватными.",
    private:"Доступ только владельцу аккаунта. Ссылка на видео не предназначена для публичной публикации.",
    started:"Дата заказа",status:"Статус"},
  en:{heading:"My AI videos",intro:"Your private films. They are not published publicly without separate consent.",
    empty:"You have not generated any AI video clips.",signin:"Sign in to access your private videos.",
    open:"Create video",login:"Sign in with Google",refresh:"Refresh",
    ready:"Watch completed video",save:"Save MP4",paused:"New generation may be paused; archived clips stay private and available.",
    private:"Account-owner access only. This is not a public sharing link.",
    started:"Created",status:"Status"},
  es:{heading:"Mis vídeos IA",intro:"Tus vídeos privados. No se publican sin consentimiento aparte.",
    empty:"Aún no has generado escenas IA.",signin:"Inicia sesión para ver tus vídeos.",
    open:"Crear vídeo",login:"Iniciar sesión con Google",refresh:"Actualizar",
    ready:"Ver vídeo terminado",save:"Guardar MP4",paused:"La generación puede estar en pausa; el archivo privado sigue disponible.",
    private:"Solo el propietario puede verlo. No es un enlace público.",
    started:"Fecha",status:"Estado"},
} as const;

export function MandalaMyAiVideos({locale}: {locale:Locale}){
  const t=copies[locale];
  const [actor,setActor]=useState("");
  const [jobs,setJobs]=useState<Job[]>([]);
  const [needsAuth,setNeedsAuth]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  useEffect(()=>{
    let mounted=true;
    async function boot(){
      try{
        const id=await fetch("/api/app/videos/generate/identity",{cache:"no-store",credentials:"same-origin"});
        if(!id.ok){if(mounted)setNeedsAuth(true);return}
        const user=await id.json();
        if(typeof user.accountId!=="string")throw Error("identity");
        if(mounted)setActor(user.accountId);
        const result=await fetch("/api/app/videos/generate",{cache:"no-store",credentials:"same-origin",
          headers:{"x-hh-account-id":user.accountId}});
        if(!result.ok)throw Error("jobs");
        const payload=await result.json();
        if(mounted)setJobs(Array.isArray(payload.jobs)?payload.jobs.slice(0,20):[]);
      }catch{if(mounted)setError(true)}
      finally{if(mounted)setLoading(false)}
    }
    void boot();
    return()=>{mounted=false};
  },[]);
  async function refresh(){
    if(!actor)return;
    setLoading(true);setError(false);
    try{
      const response=await fetch("/api/app/videos/generate",{cache:"no-store",credentials:"same-origin",
        headers:{"x-hh-account-id":actor}});
      if(!response.ok)throw Error("jobs");
      const data=await response.json();
      setJobs(Array.isArray(data.jobs)?data.jobs.slice(0,20):[]);
    }catch{setError(true)}
    finally{setLoading(false)}
  }
  return <main style={{minHeight:"70vh",maxWidth:900,margin:"0 auto",padding:"24px 14px",
    color:"#173f35",fontFamily:"Arial,Helvetica,sans-serif"}}>
    <section style={{padding:18,background:"#fbfdf7",border:"1px solid #d7e9d7",borderRadius:20}}>
      <h1 style={{margin:"0 0 10px",fontSize:26}}>{t.heading}</h1>
      <p style={{lineHeight:1.5,margin:"0 0 15px"}}>{t.intro}</p>
      <div style={{display:"flex",flexWrap:"wrap",gap:12,alignItems:"center"}}>
        <Link href={`/${locale}/holistic-support/mandala`}
          style={{color:"#087654",textDecoration:"underline"}}>{t.open}</Link>
        {actor?<button type="button" onClick={()=>void refresh()} disabled={loading}
          style={{border:"1px solid #abd6be",borderRadius:11,minHeight:44,
            padding:"8px 13px",background:"#e6f5e9",color:"#126d50"}}>
          <RefreshCw size={16} style={{verticalAlign:"middle",marginRight:7}}/>{t.refresh}
        </button>:null}
      </div>
      {needsAuth?<p>{t.signin} <Link href={`/${locale}/app`}>{t.login}</Link></p>:null}
      {loading?<p role="status">{t.refresh}…</p>:null}
      {error?<p role="alert">{t.paused}</p>:null}
      {!loading&&!needsAuth&&!jobs.length?<p>{t.empty}</p>:null}
      {jobs.map(job=><article key={job.jobId} data-my-ai-video={job.jobId}
        style={{padding:14,marginTop:16,border:"1px solid #d6e5d8",borderRadius:14,background:"white"}}>
        <div style={{display:"flex",gap:12,justifyContent:"space-between",flexWrap:"wrap"}}>
          <strong style={{textTransform:"uppercase"}}>{job.tier}</strong>
          <span>{t.status}: {job.status}</span>
        </div>
        <small>{t.started}: {job.createdAt?new Date(job.createdAt).toLocaleDateString(locale):""}</small>
        {job.status==="completed"?<>
          <p style={{display:"flex",alignItems:"center",gap:6}}><Film size={17}/>{t.ready}</p>
          <video controls playsInline preload="none"
            src={"/api/app/videos/generate/content?id="+encodeURIComponent(job.jobId)}
            style={{display:"block",width:"100%",maxWidth:540,background:"#102c2a",borderRadius:12}}
            aria-label={t.ready}/>
          <p><a href={"/api/app/videos/generate/content?id="+encodeURIComponent(job.jobId)}
            download={"holistic-house-ai-"+job.jobId+".mp4"}
            style={{display:"inline-flex",alignItems:"center",gap:6,color:"#087654"}}>
            <Download size={16}/>{t.save}</a></p>
        </>:null}
      </article>)}
      <p style={{fontSize:12,color:"#658477",marginTop:22}}>{t.private} {t.paused}</p>
    </section>
  </main>;
}
