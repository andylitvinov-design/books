"use client";

import {useState} from "react";
import {Check, ChevronDown, Clapperboard, Copy, Sparkles} from "lucide-react";
import {PROFESSIONAL_TEMPLATES} from "@/lib/mandala/professional-growth-templates.mjs";
import {proposeProfessionalCampaign} from "@/lib/mandala/professional-content-director.mjs";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-professional-promo.module.css";

type Preset = {id:string;theme:string;clips:readonly string[];focusTags?:readonly string[]};
type Scene = {id:string;status:string;media:string;video:string;poster?:string;
  motifs:readonly string[];tags:readonly string[];rightsReference?:{kind:string};
  commercialUseVerified?:boolean};
type Source = {id:string;kind:string;published:boolean;publicSnapshot:boolean;
  practitionerId:string;locale:string;title:string;publicDescription?:string;href:string};
type Identity = {id?:string;practitionerId?:string;published:boolean;publicSnapshot:boolean;
  displayName?:string;professionalTitle?:string;credentialVerified?:boolean};
type Proposal = ReturnType<typeof proposeProfessionalCampaign>;
type Props = {
  locale:PublicLocale;presets:readonly Preset[];scenes:readonly Scene[];
  publicOffer?:Source|null;publicPractitioner?:Identity|null;
  disabled?:boolean;initiallyOpen?:boolean;
  onApply:(presetId:string,seconds:30,aspect:"portrait",proposal:Proposal)=>void;
};
const copy={
  ru:{title:"Промо-видео для моей практики",intro:"Объясните услугу или поделитесь полезной мыслью. Мы предложим сюжет из доступных кадров.",
    goal:"Формат публикации",topic:"О чём хотите рассказать?",placeholder:"Например, как проходит первая консультация",
    suggest:"Предложить профессиональный сценарий",errorOffer:"Выберите опубликованную услугу для этого типа промо.",
    notReady:"Сюжет пока без подходящих четырёх видеосцен. Выберите другую тему.",
    scenes:"Сценарий и настоящие кадры",post:"Текст публикации",copy:"Скопировать пост",copied:"Текст скопирован",
    copyError:"Не удалось скопировать. Выделите текст вручную.",
    rights:"Проверьте коммерческие права на видео и музыку перед публикацией. Подбор по каталогу не означает разрешения на рекламу.",
    facts:"Я проверил(а) сведения об услуге и права на использованные материалы.",
    apply:"Перенести сюжет в бесплатный видеоредактор",note:"Далее создайте файл в общем редакторе. Это черновик, не опубликованная реклама.",
    noOffer:"Без услуги создаётся только образовательный черновик без ссылки на запись.",show:"Развернуть"},
  en:{title:"Promo video for my practice",intro:"Introduce a service or share a useful idea. We suggest a film using available footage.",
    goal:"Content format",topic:"What would you like to explain?",placeholder:"For example, what happens during a first consultation",
    suggest:"Suggest a professional storyboard",errorOffer:"Select a published service for this promotion.",
    notReady:"No matching four-scene licensed montage is available. Try another topic.",
    scenes:"Storyboard and real footage",post:"Post caption",copy:"Copy post",copied:"Caption copied",
    copyError:"Could not copy. Select the text manually.",
    rights:"Check commercial rights to footage and music before posting. Being in the catalog is not advertising clearance.",
    facts:"I reviewed the service facts and the rights to the materials.",
    apply:"Move storyboard into the free video editor",note:"Create the actual file using the shared editor. This is a draft, not a published advertisement.",
    noOffer:"Without a service this is an educational draft with no booking link.",show:"Expand"},
  es:{title:"Vídeo promocional de mi práctica",intro:"Presenta un servicio o comparte una idea útil. Propondremos un vídeo con material disponible.",
    goal:"Formato",topic:"¿De qué quieres hablar?",placeholder:"Por ejemplo, cómo es una primera consulta",
    suggest:"Proponer un guion profesional",errorOffer:"Selecciona un servicio publicado para esta promoción.",
    notReady:"No hay cuatro clips aptos para este tema. Prueba otra opción.",
    scenes:"Guion y vídeos reales",post:"Texto para publicar",copy:"Copiar texto",copied:"Texto copiado",
    copyError:"No se pudo copiar. Selecciona el texto manualmente.",
    rights:"Comprueba los derechos comerciales de los vídeos y música antes de publicar. Un clip del catálogo no implica permiso publicitario.",
    facts:"He revisado los datos del servicio y los derechos de los materiales.",
    apply:"Abrir el guion en el editor gratuito",note:"Crea el archivo en el editor compartido. Esto es un borrador, no una publicación.",
    noOffer:"Sin un servicio, se genera un borrador educativo sin enlace de reserva.",show:"Abrir"}
} as const;

export function MandalaProfessionalPromo({
  locale,presets,scenes,publicOffer=null,publicPractitioner=null,
  disabled=false,initiallyOpen=false,onApply
}:Props) {
  const t=copy[locale];
  const [goal,setGoal]=useState("introduce");
  const [topic,setTopic]=useState("");
  const [avoid,setAvoid]=useState<string[]>([]);
  const [proposal,setProposal]=useState<Proposal|null>(null);
  const [draft,setDraft]=useState("");
  const [factChecked,setFactChecked]=useState(false);
  const [notice,setNotice]=useState("");
  const ready=Boolean(proposal?.montage?.presetId && proposal.sceneIds.length===4);
  const prepare=()=>{
    setFactChecked(false);setNotice("");
    try{
      const next=proposeProfessionalCampaign({
        goal,locale,topic,publicOffer,publicPractitioner,
        presets:[...presets],scenes:[...scenes],avoidMotifs:avoid
      });
      setProposal(next);setDraft(next.postDraft);
    }catch(error){
      setProposal(null);setDraft("");
      const message=error instanceof Error?error.message:"";
      setNotice(message.includes("offer")?t.errorOffer:t.notReady);
    }
  };
  const copyPost=async()=>{
    try{
      if(!draft||typeof navigator.clipboard?.writeText!=="function")throw Error("clipboard");
      await navigator.clipboard.writeText(draft);
      setNotice(t.copied);
    }catch{setNotice(t.copyError)}
  };
  const exclusions=[{id:"water",labels:{ru:"Без воды",en:"No water",es:"Sin agua"}},
    {id:"forest",labels:{ru:"Без леса",en:"No forest",es:"Sin bosque"}},
    {id:"dark",labels:{ru:"Без темноты",en:"No darkness",es:"Sin oscuridad"}}];
  return <details className={css.root} data-professional-video-promo open={initiallyOpen?true:undefined}>
    <summary className={css.header}><Clapperboard size={22} aria-hidden="true"/>
      <span><strong>{t.title}</strong><small>{t.intro}</small></span>
      <ChevronDown size={18} aria-hidden="true"/>
    </summary>
    <div className={css.body}>
      <label className={css.label}>{t.goal}
        <select data-professional-goal value={goal} disabled={disabled}
          onChange={event=>{setGoal(event.currentTarget.value);setProposal(null);setNotice("");}}>
          {PROFESSIONAL_TEMPLATES.map(item=><option key={item.id} value={item.goal}>{item.title[locale]}</option>)}
        </select>
      </label>
      <label className={css.label}>{t.topic}
        <textarea data-professional-topic value={topic} maxLength={140} rows={2}
          placeholder={t.placeholder} disabled={disabled}
          onChange={event=>{setTopic(event.currentTarget.value);setProposal(null);setNotice("");}}/>
      </label>
      {!publicOffer?<p className={css.small}>{t.noOffer}</p>:null}
      <div className={css.exclusions} role="group" aria-label={t.goal}>
        {exclusions.map(item=><label key={item.id}>
          <input type="checkbox" checked={avoid.includes(item.id)} disabled={disabled}
            onChange={event=>{
              const checked=event.currentTarget.checked;
              setAvoid(old=>checked?[...old,item.id]:old.filter(x=>x!==item.id));
              setProposal(null);
            }}/>
          <span>{item.labels[locale]}</span>
        </label>)}
      </div>
      <button type="button" className={css.primary} data-professional-suggest
        disabled={disabled} onClick={prepare}><Sparkles size={17} aria-hidden="true"/>{t.suggest}</button>
      {proposal?<section className={css.proposal} data-professional-proposal>
        <h4>{proposal.headline}</h4>
        <p className={css.small}>{proposal.durationSec} s · {proposal.aspect} · Free local draft</p>
        {ready?<><strong>{t.scenes}</strong>
          <ol className={css.beats}>
            {proposal.shotPlan.map((shot,index)=><li key={String(index)}>
              <span>{index+1}. {shot.onScreenText}</span>
              <small>{shot.startSec}–{shot.endSec}s · {shot.sceneId||"—"}</small>
            </li>)}
          </ol>
        </>:<p role="status" className={css.warning}>{t.notReady}</p>}
        <label className={css.label}>{t.post}
          <textarea data-professional-post value={draft} rows={5} maxLength={1200}
            disabled={disabled} onChange={event=>setDraft(event.currentTarget.value)}/>
        </label>
        <button type="button" className={css.secondary} data-professional-copy
          disabled={!draft||disabled} onClick={copyPost}><Copy size={16} aria-hidden="true"/>{t.copy}</button>
        <p className={css.warning}>{t.rights}</p>
        <label className={css.confirm}><input type="checkbox" checked={factChecked}
          disabled={disabled||!ready} onChange={event=>setFactChecked(event.currentTarget.checked)}/>
          {t.facts}</label>
        <button type="button" className={css.primary} data-professional-apply
          disabled={disabled||!ready||!factChecked}
          onClick={()=>onApply(proposal.montage!.presetId,30,"portrait",{...proposal,postDraft:draft})}>
          <Check size={17} aria-hidden="true"/>{t.apply}</button>
        <p className={css.small}>{t.note}</p>
      </section>:null}
      {notice?<p className={css.notice} role="status">{notice}</p>:null}
    </div>
  </details>;
}
