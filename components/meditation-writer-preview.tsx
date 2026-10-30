"use client";

import { useState } from "react";
import styles from "./meditation-writer-preview.module.css";

type Locale = "ru" | "en" | "es";
type Focus = "stress" | "relationships" | "self_worth" | "meaning";
type Style = "gentle_simple" | "grounded_practical" | "poetic_contained" | "contemplative";
type Motif = "gentle_nature" | "supportive_object" | "comfortable_corner" | "small_light";
type Segment = { id:string; text:string; optionalSilenceSeconds:number };
type Preview = {status:string;title:string;segments:Segment[];
  plannedDurationSeconds:number;generationMode:string;modelUsed:boolean;};
const lang={
  ru:{title:"Личная медитация — текстовый предпросмотр",subtitle:"Мягкая ресурсная практика. Сейчас доступен текстовый шаблон. Художественные стили заработают после подключения AI-писателя.",
    focus:"Тема",style:"Стиль текста",duration:"Длительность",motif:"Образ",
    phrase:"Необязательная личная фраза",phraseHelp:"Можно оставить пустым",
    consent:"Я добровольно выбираю мягкую образную практику; могу пропустить её или остановиться.",
    create:"Подготовить текст",loading:"Формируется предпросмотр…",
    template:"Текстовый шаблон · без AI-генерации",durationNote:"Плановая длительность с паузами; аудио ещё не создано.",
    signin:"Для персонального предпросмотра войдите в свой кабинет.",
    unavailable:"Предпросмотр пока недоступен или необходима помощь специалиста.",
    pause:"Необязательная тишина",optionsFocus:["Повседневный стресс","Отношения и границы","Самооценка","Ценности и смысл"],
    optionsStyle:["Мягкий","Практичный","Поэтичный","Созерцательный"],
    optionsMotif:["Спокойная природа","Предмет опоры","Уютное место","Мягкий свет"]},
  en:{title:"Personal meditation — text preview",subtitle:"A gentle optional practice. This is a template preview; literary styles will apply when the AI writer is connected.",
    focus:"Focus",style:"Writing style",duration:"Duration",motif:"Image",
    phrase:"Optional personal phrase",phraseHelp:"You can leave this empty",
    consent:"I choose this optional resource imagery practice and may skip or stop it.",
    create:"Prepare text",loading:"Preparing preview…",
    template:"Text template · no AI generation",durationNote:"Planned length with pauses; audio has not been created.",
    signin:"Please sign in to My House for a personal preview.",
    unavailable:"Preview is unavailable or a qualified person's review is needed.",
    pause:"Optional silence",optionsFocus:["Daily stress","Relationships and boundaries","Self-worth","Values and meaning"],
    optionsStyle:["Gentle","Practical","Poetic","Contemplative"],
    optionsMotif:["Gentle nature","Supportive object","Comfortable corner","Soft light"]},
  es:{title:"Meditación personal — vista previa",subtitle:"Una práctica opcional y suave. Esta es una plantilla; los estilos literarios se aplicarán cuando se conecte el escritor de IA.",
    focus:"Tema",style:"Estilo",duration:"Duración",motif:"Imagen",
    phrase:"Frase personal opcional",phraseHelp:"Puedes dejarla vacía",
    consent:"Elijo voluntariamente esta práctica de imágenes y puedo omitirla o detenerla.",
    create:"Preparar texto",loading:"Preparando vista previa…",
    template:"Plantilla de texto · sin generación IA",durationNote:"Duración prevista con pausas; todavía no hay audio.",
    signin:"Inicia sesión en Mi Casa para la vista previa personal.",
    unavailable:"La vista previa no está disponible o requiere ayuda profesional.",
    pause:"Silencio opcional",optionsFocus:["Estrés cotidiano","Relaciones y límites","Autoestima","Valores y sentido"],
    optionsStyle:["Suave","Práctico","Poético","Contemplativo"],
    optionsMotif:["Naturaleza tranquila","Objeto de apoyo","Rincón acogedor","Luz suave"]},
};
const foci:Focus[]=["stress","relationships","self_worth","meaning"];
const stylistics:Style[]=["gentle_simple","grounded_practical","poetic_contained","contemplative"];
const motifs:Motif[]=["gentle_nature","supportive_object","comfortable_corner","small_light"];
export function MeditationWriterPreview({locale}:{locale:string}) {
  const l:Locale=locale==="ru"?"ru":locale==="es"?"es":"en";
  const t=lang[l];
  const [focus,setFocus]=useState<Focus>("stress");
  const [style,setStyle]=useState<Style>("gentle_simple");
  const [motif,setMotif]=useState<Motif>("gentle_nature");
  const [duration,setDuration]=useState<5|10|15>(10);
  const [clientPhrase,setClientPhrase]=useState("");
  const [consented,setConsented]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [preview,setPreview]=useState<Preview|null>(null);
  async function submit(){
    if(!consented||loading)return;
    setLoading(true);setError("");setPreview(null);
    try{
      const response=await fetch("/api/holistic-support/meditation-writer/brief",{
        method:"POST",cache:"no-store",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale:l,focus,styleId:style,motifId:motif,
          durationMinutes:duration,clientPhrase,resourceImageryOptIn:true}),
      });
      const data=await response.json() as Preview & {error?:string};
      if(!response.ok){
        setError(response.status===401?t.signin:t.unavailable);return;
      }
      if(data.status!=="template_ready"||data.generationMode!=="template"){
        setError(t.unavailable);return;
      }
      setPreview(data);
    }catch{setError(t.unavailable);}
    finally{setLoading(false);}
  }
  return <section className={styles.shell} aria-label={t.title}>
    <div className={styles.intro}>
      <h2>{t.title}</h2><p>{t.subtitle}</p>
    </div>
    <div className={styles.controls}>
      <label>{t.focus}<select value={focus} onChange={e=>setFocus(e.target.value as Focus)}>
        {foci.map((id,i)=><option key={id} value={id}>{t.optionsFocus[i]}</option>)}
      </select></label>
      <label>{t.style}<select value={style} onChange={e=>setStyle(e.target.value as Style)}>
        {stylistics.map((id,i)=><option key={id} value={id}>{t.optionsStyle[i]}</option>)}
      </select></label>
      <label>{t.motif}<select value={motif} onChange={e=>setMotif(e.target.value as Motif)}>
        {motifs.map((id,i)=><option key={id} value={id}>{t.optionsMotif[i]}</option>)}
      </select></label>
      <label>{t.duration}<select value={duration} onChange={e=>setDuration(Number(e.target.value) as 5|10|15)}>
        {[5,10,15].map(n=><option key={n} value={n}>{n} min</option>)}
      </select></label>
    </div>
    <label className={styles.phrase}>{t.phrase}
      <input maxLength={160} value={clientPhrase} placeholder={t.phraseHelp}
        onChange={e=>setClientPhrase(e.target.value)}/>
    </label>
    <label className={styles.consent}><input type="checkbox" checked={consented}
      onChange={e=>setConsented(e.target.checked)}/><span>{t.consent}</span></label>
    <button className={styles.submit} type="button" disabled={!consented||loading}
      onClick={submit}>{loading?t.loading:t.create}</button>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {preview&&<article className={styles.preview} aria-live="polite">
      <h3>{preview.title}</h3><p className={styles.caption}>{t.template}</p>
      {preview.segments.map(s=><div key={s.id} className={styles.segment}>
        <p>{s.text}</p>
        {s.optionalSilenceSeconds>0&&<small>{t.pause}: {s.optionalSilenceSeconds} s</small>}
      </div>)}
      <p className={styles.caption}>{t.durationNote}</p>
    </article>}
  </section>;
}
