"use client";

import { useState } from "react";
import Link from "next/link";
import styles from "./meditation-writer-preview.module.css";
import { MeditationWriterDeviceVoice } from "./meditation-writer-device-voice";

type Locale = "ru" | "en" | "es";
type ProviderPreference = "auto" | "gemini" | "openrouter";
type Focus = "auto" | "stress" | "relationships" | "self_worth" | "meaning";
type Style = "gentle_simple" | "grounded_practical" | "poetic_contained" | "contemplative";
type Goal = "auto" | "settle" | "support" | "clarity" | "boundaries" |
  "relationships" | "confidence" | "meaning" | "goals";
type Motif = "gentle_nature" | "supportive_object" | "comfortable_corner" | "small_light";
type Segment = { id:string; text:string; optionalSilenceSeconds:number };
type PracticalStep = {methodId:string;title:string;steps:string[];
  transferAction:string;reflectionQuestion:string;beforeCheckinPrompt:string;
  afterCheckinPrompt:string;optional:true;needsExplicitStart:true;};
type NextTopic = {day:number;title:string;description:string;
  status:"topic_only";meditationGenerated:false;};
type CoursePlan = {totalDays:8;goalCode:string;dayOne:{day:1;title:string};
  nextTopics:NextTopic[];additionalScriptsGenerated:false;};
type Preview = {status:string;title:string;segments:Segment[];coursePlan?:CoursePlan;
  intentDecision?:{focusCode:Exclude<Focus,"auto">;
    goalCode:Exclude<Goal,"auto">;origin:string};
  plannedDurationSeconds:number;estimatedDurationSeconds?:number;
  generationMode:"template"|"llm";modelUsed:boolean;fallbackReason?:string;
  provider?:"gemini_free"|"openrouter_free";
  goalCode?:Goal;practice?:PracticalStep|null;};
const lang={
  ru:{title:"Личная медитация — текстовый предпросмотр",subtitle:"Мягкая ресурсная практика: шаблон или бесплатный AI-черновик при доступной модели.",
    focus:"Тема",goal:"Какой навык потренировать?",style:"Стиль текста",
    duration:"Длительность",motif:"Образ",practice:"Попробуйте один небольшой шаг",
    nextAction:"Необязательный шаг в жизни",practicalNote:"Это практика самоподдержки, не обещание лечения.",
    checkin:"По желанию: оценка до и после",checkinNone:"Не оценивать",
    checkinScore:"Личные оценки до и после — это наблюдение, а не показатель лечебного эффекта.",
    mode:"Как создать текст",templateMode:"Без внешнего AI",aiMode:"Бесплатный AI · черновик",
    provider:"Система генерации",providerOptions:["Авто · Gemini → OpenRouter","Gemini","OpenRouter"],
    aiConsent:"Согласен передавать бесплатному AI Google или OpenRouter только общие коды цели, образа и стиля. Провайдеры могут использовать запросы для улучшения моделей. Мои личные фразы, история и данные кабинета не отправляются.",
    aiDraft:"Черновик AI · требует редакторской проверки",
    estimated:"Оценочная длительность чтения с паузами",
    aiFallback:"AI сейчас недоступен или текст не прошёл проверку: показан шаблон.",
    phrase:"Необязательная личная фраза",phraseHelp:"Можно оставить пустым",
    wishes:"Что сейчас беспокоит или важно для вас?",wishesPlaceholder:"Например, трудно расслабиться после напряжённого дня…",
    desired:"К чему хотели бы прийти?",desiredPlaceholder:"Например, найти спокойствие и ясность",
    wishesPrivacy:"Пожелания используются внутри защищённого Psychologist Mind. Бесплатный AI получает только общие коды темы и стиля, не ваши личные записи.",
    courseTitle:"Ваш план: восемь дней медитаций",
    courseExplanation:"Медитация первого дня подготовлена. Вот семь тем для продолжения.",
    firstCreated:"Текст первого дня подготовлен",courseNote:"Дни 2–8 — пока только темы, не готовые аудиозаписи или оплаченный курс.",
    courseRequest:"Обсудить заказ курса из 8 медитаций",
    courseRequestNote:"Это переход к заявке специалисту, не автоматическая покупка или списание.",
    consent:"Я добровольно выбираю мягкую образную практику; могу пропустить её или остановиться.",
    create:"Сгенерировать медитацию и 7 тем",loading:"Пишем медитацию и подбираем темы…",
    template:"Текстовый шаблон · без AI-генерации",durationNote:"Плановая длительность с паузами; аудио ещё не создано.",
    signin:"Для персонального предпросмотра войдите в свой кабинет.",
    unavailable:"Предпросмотр пока недоступен или необходима помощь специалиста.",
    pause:"Необязательная тишина",optionsFocus:["Подобрать по описанию","Повседневный стресс","Отношения и границы","Самооценка","Ценности и смысл"],
    optionsStyle:["Мягкий","Практичный","Поэтичный","Созерцательный"],
    optionsMotif:["Спокойная природа","Предмет опоры","Уютное место","Мягкий свет"],
    advancedSettings:"Дополнительные настройки · стиль, длительность, модель",
    strategyChosen:"Выбрана стратегия",strategyDefault:"Общая поддерживающая тема — уточните при желании.",
  },
  en:{title:"Personal meditation — text preview",subtitle:"A gentle optional practice: a template or an AI draft if the free model is available.",
    focus:"Focus",goal:"What would you like to practice?",style:"Writing style",
    duration:"Duration",motif:"Image",practice:"Try one small step",
    nextAction:"Optional step in daily life",practicalNote:"Self-help practice, not a promise of treatment.",
    checkin:"Optional: before and after",checkinNone:"Skip rating",
    checkinScore:"These are your own observations, not evidence of a treatment effect.",
    mode:"Text generation",templateMode:"No external AI",aiMode:"Free AI · draft",
    provider:"AI provider",providerOptions:["Auto · Gemini → OpenRouter","Gemini","OpenRouter"],
    aiConsent:"I agree to send only general goal, image and style codes to free Google or OpenRouter AI. These providers may use free-tier prompts to improve models. My personal phrases, history and account data are not sent.",
    aiDraft:"AI draft · editorial review required",
    estimated:"Estimated spoken length with pauses",
    aiFallback:"AI is unavailable or the draft failed review; showing the template instead.",
    phrase:"Optional personal phrase",phraseHelp:"You can leave this empty",
    wishes:"What feels difficult or important now?",wishesPlaceholder:"For example, it is hard to unwind after a demanding day…",
    desired:"What would you like to move toward?",desiredPlaceholder:"For example, find steadiness and clarity",
    wishesPrivacy:"Your wishes are used only inside protected Psychologist Mind. Free AI receives generic theme and style codes, never your notes.",
    courseTitle:"Your eight-day meditation path",
    courseExplanation:"Your first meditation is prepared. Here are seven topics to continue.",
    firstCreated:"First-day text prepared",courseNote:"Days 2–8 are topics only, not finished audio or a purchased course.",
    courseRequest:"Discuss ordering the eight-meditation course",
    courseRequestNote:"This opens a practitioner enquiry, not a purchase or automatic charge.",
    consent:"I choose this optional resource imagery practice and may skip or stop it.",
    create:"Generate meditation and 7 topics",loading:"Writing meditation and selecting topics…",
    template:"Text template · no AI generation",durationNote:"Planned length with pauses; audio has not been created.",
    signin:"Please sign in to My House for a personal preview.",
    unavailable:"Preview is unavailable or a qualified person's review is needed.",
    pause:"Optional silence",optionsFocus:["Choose from my description","Daily stress","Relationships and boundaries","Self-worth","Values and meaning"],
    optionsStyle:["Gentle","Practical","Poetic","Contemplative"],
    optionsMotif:["Gentle nature","Supportive object","Comfortable corner","Soft light"],
    advancedSettings:"More options · style, length and model",
    strategyChosen:"Selected approach",strategyDefault:"A general supportive topic was used. You can refine it.",
  },
  es:{title:"Meditación personal — vista previa",subtitle:"Una práctica suave: plantilla o borrador de IA si el modelo gratuito está disponible.",
    focus:"Tema",goal:"¿Qué habilidad quieres practicar?",style:"Estilo",
    duration:"Duración",motif:"Imagen",practice:"Prueba un pequeño paso",
    nextAction:"Paso opcional en la vida diaria",practicalNote:"Apoyo personal, no una promesa de tratamiento.",
    checkin:"Opcional: antes y después",checkinNone:"Omitir evaluación",
    checkinScore:"Estas son observaciones personales, no una medida de eficacia terapéutica.",
    mode:"Creación del texto",templateMode:"Sin IA externa",aiMode:"IA gratuita · borrador",
    provider:"Proveedor de IA",providerOptions:["Auto · Gemini → OpenRouter","Gemini","OpenRouter"],
    aiConsent:"Acepto enviar solo códigos generales de objetivo, imagen y estilo a la IA gratuita de Google u OpenRouter. Estos servicios pueden usar solicitudes para mejorar modelos. Mis frases personales, historial y datos de mi cuenta no se envían.",
    aiDraft:"Borrador de IA · requiere revisión editorial",
    estimated:"Duración estimada de voz con pausas",
    aiFallback:"La IA no está disponible o el borrador no pasó la revisión; se muestra la plantilla.",
    phrase:"Frase personal opcional",phraseHelp:"Puedes dejarla vacía",
    wishes:"¿Qué es difícil o importante ahora?",wishesPlaceholder:"Por ejemplo, cuesta relajarse después de un día intenso…",
    desired:"¿Hacia qué te gustaría avanzar?",desiredPlaceholder:"Por ejemplo, sentir más estabilidad y claridad",
    wishesPrivacy:"Tus deseos se usan solo dentro de Psychologist Mind protegido. La IA gratuita recibe códigos generales, nunca tus notas.",
    courseTitle:"Tu programa de ocho días",
    courseExplanation:"La primera meditación está preparada. Estos son los siete temas siguientes.",
    firstCreated:"Texto del primer día preparado",courseNote:"Los días 2–8 son solo temas, no audios terminados ni un curso comprado.",
    courseRequest:"Consultar el pedido del curso de ocho meditaciones",
    courseRequestNote:"Abre una consulta con un profesional, no una compra ni un cobro automático.",
    consent:"Elijo voluntariamente esta práctica de imágenes y puedo omitirla o detenerla.",
    create:"Generar meditación y 7 temas",loading:"Generando la meditación y siete temas…",
    template:"Plantilla de texto · sin generación IA",durationNote:"Duración prevista con pausas; todavía no hay audio.",
    signin:"Inicia sesión en Mi Casa para la vista previa personal.",
    unavailable:"La vista previa no está disponible o requiere ayuda profesional.",
    pause:"Silencio opcional",optionsFocus:["Elegir según mi descripción","Estrés cotidiano","Relaciones y límites","Autoestima","Valores y sentido"],
    optionsStyle:["Suave","Práctico","Poético","Contemplativo"],
    optionsMotif:["Naturaleza tranquila","Objeto de apoyo","Rincón acogedor","Luz suave"],
    advancedSettings:"Más opciones · estilo, duración y modelo",
    strategyChosen:"Enfoque seleccionado",strategyDefault:"Se usó un tema general de apoyo. Puedes ajustarlo.",
  },
};
const foci:Focus[]=["auto","stress","relationships","self_worth","meaning"];
const stylistics:Style[]=["gentle_simple","grounded_practical","poetic_contained","contemplative"];
const motifs:Motif[]=["gentle_nature","supportive_object","comfortable_corner","small_light"];
const goalsByFocus:Record<Focus,Goal[]>={
  auto:["auto"],
  stress:["auto","settle","support","clarity"],
  relationships:["auto","boundaries","relationships","support"],
  self_worth:["auto","confidence","support","clarity"],
  meaning:["auto","meaning","goals","clarity"],
};
const defaultGoal:Record<Focus,Goal>={
  auto:"auto",
  stress:"settle",relationships:"boundaries",self_worth:"confidence",meaning:"meaning",
};
const goalNames:Record<Locale,Record<Goal,string>>={
  ru:{auto:"Подобрать автоматически",settle:"Вернуть устойчивость",support:"Найти опору",
    clarity:"Увидеть ситуацию яснее",boundaries:"Личные границы",
    relationships:"Бережное общение",confidence:"Отнестись к себе мягче",
    meaning:"Прояснить ценности",goals:"Выбрать один шаг"},
  en:{auto:"Select automatically",settle:"Return to the present",support:"Find support",
    clarity:"See a situation more clearly",boundaries:"Personal boundaries",
    relationships:"Gentle communication",confidence:"Be kinder to yourself",
    meaning:"Clarify what matters",goals:"Choose a small step"},
  es:{auto:"Elegir automáticamente",settle:"Volver al presente",support:"Encontrar apoyo",
    clarity:"Ver con más claridad",boundaries:"Límites personales",
    relationships:"Comunicación amable",confidence:"Tratarte con más amabilidad",
    meaning:"Clarificar valores",goals:"Elegir un paso pequeño"},
};
export function MeditationWriterPreview({locale}:{locale:string}) {
  const l:Locale=locale==="ru"?"ru":locale==="es"?"es":"en";
  const t=lang[l];
  const [focus,setFocus]=useState<Focus>("auto");
  const [goal,setGoal]=useState<Goal>("auto");
  const [style,setStyle]=useState<Style>("gentle_simple");
  const [motif,setMotif]=useState<Motif>("gentle_nature");
  const [duration,setDuration]=useState<5|10|15>(10);
  const [clientPhrase,setClientPhrase]=useState("");
  const [problemFrame,setProblemFrame]=useState("");
  const [desiredExperience,setDesiredExperience]=useState("");
  const [mode,setMode]=useState<"template"|"llm">("llm");
  const [providerPreference,setProviderPreference]=useState<ProviderPreference>("auto");
  const [externalOptIn,setExternalOptIn]=useState(false);
  const [consented,setConsented]=useState(false);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");
  const [preview,setPreview]=useState<Preview|null>(null);
  const [before,setBefore]=useState("");
  const [after,setAfter]=useState("");
  async function submit(){
    if(!consented||loading||(mode==="llm"&&!externalOptIn))return;
    setLoading(true);setError("");setPreview(null);
    setBefore("");setAfter("");
    try{
      const response=await fetch("/api/holistic-support/meditation-writer/brief",{
        method:"POST",cache:"no-store",credentials:"same-origin",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({locale:l,focus,intentionCode:goal,styleId:style,motifId:motif,
          durationMinutes:duration,clientPhrase,problemFrame,desiredExperience,resourceImageryOptIn:true,
          generationMode:mode,providerPreference,
          externalModelOptIn:mode==="llm"&&externalOptIn}),
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
  return <section id="meditation-courses" className={styles.shell} aria-label={t.title}>
    <div className={styles.intro}>
      <h2>{t.title}</h2><p>{t.subtitle}</p>
    </div>
    <div className={styles.wishes} data-meditation-client-wishes>
      <label>{t.wishes}
        <textarea rows={3} maxLength={350} value={problemFrame}
          placeholder={t.wishesPlaceholder}
          onChange={e=>{setProblemFrame(e.target.value);setPreview(null);}}/>
      </label>
      <label>{t.desired}
        <input maxLength={180} value={desiredExperience}
          placeholder={t.desiredPlaceholder}
          onChange={e=>{setDesiredExperience(e.target.value);setPreview(null);}}/>
      </label>
      <p>{t.wishesPrivacy}</p>
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
    </div>
    <details className={styles.advanced} data-meditation-advanced>
      <summary>{t.advancedSettings}</summary>
      <div className={styles.controls}>
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
    {mode==="llm"&&<label className={styles.mode} data-meditation-ai-provider>
      {t.provider}
      <select value={providerPreference} onChange={e=>{
        setProviderPreference(e.target.value as ProviderPreference);
        setExternalOptIn(false);setPreview(null);
      }}>
        {(["auto","gemini","openrouter"] as const).map((choice,i)=>
          <option key={choice} value={choice}>{t.providerOptions[i]}</option>)}
      </select>
    </label>}
    </details>
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
      {preview.intentDecision&&<p className={styles.caption} data-meditation-resolved-strategy>
        {t.strategyChosen}: {t.optionsFocus[foci.indexOf(preview.intentDecision.focusCode)]}
        {" · "}{goalNames[l][preview.intentDecision.goalCode]}.
        {preview.intentDecision.origin==="general_default"?" "+t.strategyDefault:""}
      </p>}
      <h3>{preview.title}</h3>
      <p className={styles.caption}>{preview.generationMode==="llm"?t.aiDraft+" · "+(preview.provider==="openrouter_free"?"OpenRouter Free":"Gemini Free"):t.template}</p>
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
      {preview.practice&&<details className={styles.checkin}>
        <summary>{t.checkin}</summary>
        <div className={styles.checkinControls}>
          <label>{preview.practice.beforeCheckinPrompt}
            <select value={before} onChange={e=>setBefore(e.target.value)}>
              <option value="">{t.checkinNone}</option>
              {Array.from({length:11},(_,i)=>i).map(n=>
                <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label>{preview.practice.afterCheckinPrompt}
            <select value={after} onChange={e=>setAfter(e.target.value)}>
              <option value="">{t.checkinNone}</option>
              {Array.from({length:11},(_,i)=>i).map(n=>
                <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
        </div>
        {before!==""&&after!==""&&<p className={styles.caption}>
          {before} → {after}. {t.checkinScore}
        </p>}
      </details>}
      <p className={styles.caption}>{t.durationNote}</p>
      {preview.estimatedDurationSeconds!==undefined&&
        <p className={styles.caption}>{t.estimated}: {Math.max(1,Math.round(preview.estimatedDurationSeconds/60))} min</p>}
      <MeditationWriterDeviceVoice locale={l} segments={preview.segments} />
      {preview.coursePlan&&<section className={styles.course} data-meditation-course-topics>
        <h4>{t.courseTitle}</h4>
        <p className={styles.caption}>{t.courseExplanation}</p>
        <div className={styles.firstDay}>
          <strong>{preview.coursePlan.dayOne.title}</strong>
          <span>{t.firstCreated}</span>
        </div>
        <ol start={2}>
          {preview.coursePlan?.nextTopics.map(topic=>
            <li key={topic.day}>
              <strong>{topic.title}</strong>
              <span>{topic.description}</span>
            </li>)}
        </ol>
        <p className={styles.caption}>{t.courseNote}</p>
        <div className={styles.courseOrder}>
          <Link href={"/"+l+"/services/imagery-therapy"} prefetch={false}
            data-meditation-course-enquiry>{t.courseRequest}</Link>
          <small>{t.courseRequestNote}</small>
        </div>
      </section>
    </article>}
  </section>;
}
