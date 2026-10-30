"use client";

import { useState } from "react";
import styles from "./meditation-writer-preview.module.css";
import { MeditationWriterDeviceVoice } from "./meditation-writer-device-voice";

type Locale = "ru" | "en" | "es";
type Focus = "stress" | "relationships" | "self_worth" | "meaning";
type Style = "gentle_simple" | "grounded_practical" | "poetic_contained" | "contemplative";
type Goal = "settle" | "support" | "clarity" | "boundaries" |
  "relationships" | "confidence" | "meaning" | "goals";
type Motif = "gentle_nature" | "supportive_object" | "comfortable_corner" | "small_light";
type Segment = { id:string; text:string; optionalSilenceSeconds:number };
type PracticalStep = {methodId:string;title:string;steps:string[];
  transferAction:string;reflectionQuestion:string;beforeCheckinPrompt:string;
  afterCheckinPrompt:string;optional:true;needsExplicitStart:true;};
type Preview = {status:string;title:string;segments:Segment[];
  plannedDurationSeconds:number;estimatedDurationSeconds?:number;
  generationMode:"template"|"llm";modelUsed:boolean;fallbackReason?:string;
  goalCode?:Goal;practice?:PracticalStep|null;};
const lang={
  ru:{title:"Личная медитация — текстовый предпросмотр",subtitle:"Мягкая ресурсная практика: шаблон или бесплатный AI-черновик при доступной модели.",
    focus:"Тема",goal:"Какой навык потренировать?",style:"Стиль текста",
    duration:"Длительность",motif:"Образ",practice:"Попробуйте один небольшой шаг",
    nextAction:"Необязательный шаг в жизни",practicalNote:"Это практика самоподдержки, не обещание лечения.",
    mode:"Как создать текст",templateMode:"Без внешнего AI",aiMode:"Бесплатный AI · черновик",
    aiConsent:"Согласен на отправку Google только обезличенных настроек темы, образа и стиля. Google может использовать запросы бесплатного API для улучшения моделей. Мои личные фразы и данные кабинета не передаются и не используются AI-черновиком.",
    aiDraft:"Черновик Gemini · требует редакторской проверки",
    estimated:"Оценочная длительность чтения с паузами",
    aiFallback:"AI сейчас недоступен или текст не прошёл проверку: показан шаблон.",
    phrase:"Необязательная личная фраза",phraseHelp:"Можно оставить пустым",
    consent:"Я добровольно выбираю мягкую образную практику; могу пропустить её или остановиться.",
    create:"Подготовить текст",loading:"Формируется предпросмотр…",
    template:"Текстовый шаблон · без AI-генерации",durationNote:"Плановая длительность с паузами; аудио ещё не создано.",
    signin:"Для персонального предпросмотра войдите в свой кабинет.",
    unavailable:"Предпросмотр пока недоступен или необходима помощь специалиста.",
    pause:"Необязательная тишина",optionsFocus:["Повседневный стресс","Отношения и границы","Самооценка","Ценности и смысл"],
    optionsStyle:["Мягкий","Практичный","Поэтичный","Созерцательный"],
    optionsMotif:["Спокойная природа","Предмет опоры","Уютное место","Мягкий свет"]},
  en:{title:"Personal meditation — text preview",subtitle:"A gentle optional practice: a template or an AI draft if the free model is available.",
    focus:"Focus",goal:"What would you like to practice?",style:"Writing style",
    duration:"Duration",motif:"Image",practice:"Try one small step",
    nextAction:"Optional step in daily life",practicalNote:"Self-help practice, not a promise of treatment.",
    mode:"Text generation",templateMode:"No external AI",aiMode:"Free AI · draft",
    aiConsent:"I agree to send Google only anonymous topic, image and style settings. Google may use free-tier prompts to improve its models. My personal phrases and account data are not sent or used to write the AI draft.",
    aiDraft:"Gemini draft · editorial review required",
    estimated:"Estimated spoken length with pauses",
    aiFallback:"AI is unavailable or the draft failed review; showing the template instead.",
    phrase:"Optional personal phrase",phraseHelp:"You can leave this empty",
    consent:"I choose this optional resource imagery practice and may skip or stop it.",
    create:"Prepare text",loading:"Preparing preview…",
    template:"Text template · no AI generation",durationNote:"Planned length with pauses; audio has not been created.",
    signin:"Please sign in to My House for a personal preview.",
    unavailable:"Preview is unavailable or a qualified person's review is needed.",
    pause:"Optional silence",optionsFocus:["Daily stress","Relationships and boundaries","Self-worth","Values and meaning"],
    optionsStyle:["Gentle","Practical","Poetic","Contemplative"],
    optionsMotif:["Gentle nature","Supportive object","Comfortable corner","Soft light"]},
  es:{title:"Meditación personal — vista previa",subtitle:"Una práctica suave: plantilla o borrador de IA si el modelo gratuito está disponible.",
    focus:"Tema",goal:"¿Qué habilidad quieres practicar?",style:"Estilo",
    duration:"Duración",motif:"Imagen",practice:"Prueba un pequeño paso",
    nextAction:"Paso opcional en la vida diaria",practicalNote:"Apoyo personal, no una promesa de tratamiento.",
    mode:"Creación del texto",templateMode:"Sin IA externa",aiMode:"IA gratuita · borrador",
    aiConsent:"Acepto enviar a Google solo ajustes anónimos de tema, imagen y estilo. Google puede usar solicitudes gratuitas para mejorar sus modelos. Las frases personales y los datos de mi cuenta no se envían ni se usan para crear el borrador de IA.",
    aiDraft:"Borrador Gemini · requiere revisión editorial",
    estimated:"Duración estimada de voz con pausas",
    aiFallback:"La IA no está disponible o el borrador no pasó la revisión; se muestra la plantilla.",
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
const goalsByFocus:Record<Focus,Goal[]>={
  stress:["settle","support","clarity"],
  relationships:["boundaries","relationships","support"],
  self_worth:["confidence","support","clarity"],
  meaning:["meaning","goals","clarity"],
};
const defaultGoal:Record<Focus,Goal>={
  stress:"settle",relationships:"boundaries",self_worth:"confidence",meaning:"meaning",
};
const goalNames:Record<Locale,Record<Goal,string>>={
  ru:{settle:"Вернуть устойчивость",support:"Найти опору",
    clarity:"Увидеть ситуацию яснее",boundaries:"Личные границы",
    relationships:"Бережное общение",confidence:"Отнестись к себе мягче",
    meaning:"Прояснить ценности",goals:"Выбрать один шаг"},
  en:{settle:"Return to the present",support:"Find support",
    clarity:"See a situation more clearly",boundaries:"Personal boundaries",
    relationships:"Gentle communication",confidence:"Be kinder to yourself",
    meaning:"Clarify what matters",goals:"Choose a small step"},
  es:{settle:"Volver al presente",support:"Encontrar apoyo",
    clarity:"Ver con más claridad",boundaries:"Límites personales",
    relationships:"Comunicación amable",confidence:"Tratarte con más amabilidad",
    meaning:"Clarificar valores",goals:"Elegir un paso pequeño"},
};
export function MeditationWriterPreview({locale}:{locale:string}) {
  const l:Locale=locale==="ru"?"ru":locale==="es"?"es":"en";
  const t=lang[l];
  const [focus,setFocus]=useState<Focus>("stress");
  const [goal,setGoal]=useState<Goal>("settle");
  const [style,setStyle]=useState<Style>("gentle_simple");
  const [motif,setMotif]=useState<Motif>("gentle_nature");
  const [duration,setDuration]=useState<5|10|15>(10);
  const [clientPhrase,setClientPhrase]=useState("");
  const [mode,setMode]=useState<"template"|"llm">("template");
  const [externalOptIn,setExternalOptIn]=useState(false);
  const [consented,setConsented]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [preview,setPreview]=useState<Preview|null>(null);
  async function submit(){
    if(!consented||loading||(mode==="llm"&&!externalOptIn))return;
    setLoading(true);setError("");setPreview(null);
    try{
      const response=await fetch("/api/holistic-support/meditation-writer/brief",{
        method:"POST",cache:"no-store",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale:l,focus,intentionCode:goal,styleId:style,motifId:motif,
          durationMinutes:duration,clientPhrase,resourceImageryOptIn:true,
          generationMode:mode,externalModelOptIn:mode==="llm"&&externalOptIn}),
      });
      const data=await response.json() as Preview & {error?:string};
      if(!response.ok){
        setError(response.status===401?t.signin:t.unavailable);return;
      }
      if(!["template_ready","draft_review_required"].includes(data.status)||
        !["template","llm"].includes(data.generationMode)){
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
      <label>{t.focus}<select value={focus} onChange={e=>{
        const next=e.target.value as Focus;
        setFocus(next);setGoal(defaultGoal[next]);setPreview(null);
      }}>
        {foci.map((id,i)=><option key={id} value={id}>{t.optionsFocus[i]}</option>)}
      </select></label>
      <label>{t.goal}<select value={goal} onChange={e=>{
        setGoal(e.target.value as Goal);setPreview(null);
      }}>
        {goalsByFocus[focus].map(id=><option key={id} value={id}>
          {goalNames[l][id]}</option>)}
      </select></label>
      <label>{t.style}<select value={style} onChange={e=>{
        setStyle(e.target.value as Style);setPreview(null);
      }}> 
        {stylistics.map((id,i)=><option key={id} value={id}>{t.optionsStyle[i]}</option>)}
      </select></label>
      <label>{t.motif}<select value={motif} onChange={e=>{
        setMotif(e.target.value as Motif);setPreview(null);
      }}> 
        {motifs.map((id,i)=><option key={id} value={id}>{t.optionsMotif[i]}</option>)}
      </select></label>
      <label>{t.duration}<select value={duration} onChange={e=>{
        setDuration(Number(e.target.value) as 5|10|15);setPreview(null);
      }}> 
        {[5,10,15].map(n=><option key={n} value={n}>{n} min</option>)}
      </select></label>
    </div>
    <label className={styles.mode}>{t.mode}
      <select value={mode} onChange={e=>{
        setMode(e.target.value as "template"|"llm");
        setExternalOptIn(false);setPreview(null);
      }}>
        <option value="template">{t.templateMode}</option>
        <option value="llm">{t.aiMode}</option>
      </select>
    </label>
    {mode==="llm"&&<label className={styles.consent}>
      <input type="checkbox" checked={externalOptIn}
        onChange={e=>setExternalOptIn(e.target.checked)}/>
      <span>{t.aiConsent}</span>
    </label>}
    <label className={styles.phrase}>{t.phrase}
      <input maxLength={160} value={clientPhrase} placeholder={t.phraseHelp}
        onChange={e=>{setClientPhrase(e.target.value);setPreview(null);}}/>
    </label>
    <label className={styles.consent}><input type="checkbox" checked={consented}
      onChange={e=>{setConsented(e.target.checked);
        if(!e.target.checked)setPreview(null);
      }}/><span>{t.consent}</span></label>
    <button className={styles.submit} type="button" disabled={!consented||loading||(mode==="llm"&&!externalOptIn)}
      onClick={submit}>{loading?t.loading:t.create}</button>
    {error&&<p className={styles.error} role="alert">{error}</p>}
    {preview&&<article className={styles.preview} aria-live="polite">
      <h3>{preview.title}</h3>
      <p className={styles.caption}>{preview.generationMode==="llm"?t.aiDraft:t.template}</p>
      {preview.fallbackReason&&<p className={styles.error} role="status">{t.aiFallback}</p>}
      {preview.practice&&<section className={styles.practice} aria-label={t.practice}>
        <h4>{t.practice}: {preview.practice.title}</h4>
        <ol>{preview.practice.steps.slice(0,2).map((step,i)=>
          <li key={i}>{step}</li>)}</ol>
        <p><strong>{t.nextAction}:</strong> {preview.practice.transferAction}</p>
        <p className={styles.caption}>{preview.practice.reflectionQuestion}</p>
        <p className={styles.caption}>{t.practicalNote}</p>
      </section>}
      {preview.segments.map(s=><div key={s.id} className={styles.segment}>
        <p>{s.text}</p>
        {s.optionalSilenceSeconds>0&&<small>{t.pause}: {s.optionalSilenceSeconds} s</small>}
      </div>)}
      <p className={styles.caption}>{t.durationNote}</p>
      {preview.estimatedDurationSeconds!==undefined&&
        <p className={styles.caption}>{t.estimated}: {Math.max(1,Math.round(preview.estimatedDurationSeconds/60))} min</p>}
      <MeditationWriterDeviceVoice locale={l} segments={preview.segments} />
    </article>}
  </section>;
}
