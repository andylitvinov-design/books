"use client";
import {useMemo,useState} from "react";
import {Check, Clock3, Leaf, RotateCcw, SlidersHorizontal, Sparkles} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import type {VideoTheme} from "@/lib/mandala/holistic-video-themes";
import {buildShortMeditationOptions} from "@/lib/mandala/short-meditation-options.mjs";
import css from "./mandala-therapy-text-picker.module.css";

type Props={locale:PublicLocale;theme:VideoTheme;request:string;scenarioId?:string|null;disabled:boolean;
  onApprove:(text:string)=>void;onInvalidate:()=>void};
const words={
 en:{eyebrow:"YOUR MEDITATIONS ARE READY",title:"Choose your meditation",description:"Two short texts prepared for your scenario. Read and choose one.",a:"Option A",b:"Option B",body:"Meditation text",duration:"≈ 0:30",approve:"Choose this meditation",again:"Generate 2 new options",customize:"Customize text",done:"Finish editing",edit:"Edit meditation text",tooLong:"This edit may be longer than 30 seconds. Keep it to about 70 words.",safe:"A personal meditation is not suitable for this request.",help:"You can stop this reflective practice at any time."},
 ru:{eyebrow:"ВАШИ МЕДИТАЦИИ ГОТОВЫ",title:"Выберите медитацию",description:"Два коротких текста по вашему сценарию. Прочитайте и выберите один.",a:"Вариант A",b:"Вариант B",body:"Текст медитации",duration:"≈ 0:30",approve:"Утвердить медитацию",again:"Два новых варианта",customize:"Изменить текст",done:"Готово",edit:"Редактировать текст медитации",tooLong:"Этот текст может занять больше 30 секунд. Сократите примерно до 70 слов.",safe:"Для этого запроса персональная медитация не подходит.",help:"Эту мягкую практику можно остановить в любой момент."},
 es:{eyebrow:"TUS MEDITACIONES ESTÁN LISTAS",title:"Elige tu meditación",description:"Dos textos breves basados en tu escenario. Lee y elige uno.",a:"Opción A",b:"Opción B",body:"Texto de meditación",duration:"≈ 0:30",approve:"Elegir esta meditación",again:"Crear 2 opciones nuevas",customize:"Personalizar texto",done:"Terminar edición",edit:"Editar texto de meditación",tooLong:"Este texto puede durar más de 30 segundos. Déjalo en unas 70 palabras.",safe:"Este pedido necesita otro tipo de apoyo.",help:"Puedes detener esta práctica reflexiva cuando quieras."}
} as const;
export function MandalaTherapyTextPicker({locale,theme,request,scenarioId=null,disabled,onApprove,onInvalidate}:Props){
 const t=words[locale];
 const [revision,setRevision]=useState(0);
 const [choice,setChoice]=useState<0|1>(0);
 const [editing,setEditing]=useState(false);
 const [edits,setEdits]=useState<Record<string,string>>({});
 const result=useMemo(()=>buildShortMeditationOptions({locale,theme,request,revision,scenarioId}),[locale,theme,request,revision,scenarioId]);
 const active=result.options[choice];
 const key=revision+"-"+choice;
 const script=edits[key]??active?.text??"";
 const count=script.trim()?script.trim().split(/\s+/u).length:0;
 const canApprove=Boolean(active&&script.trim()&&count<=75&&!disabled);
 function regenerate(){
  onInvalidate();setRevision(value=>value+1);setChoice(0);setEditing(false);setEdits({});
 }
 return <section className={css.panel} data-therapy-meditation-picker aria-labelledby="therapy-choose-title">
  <header className={css.heading}><span className={css.icon}><Leaf size={22} aria-hidden="true"/></span>
   <div><small>{t.eyebrow}</small><h3 id="therapy-choose-title">{t.title}</h3><p>{t.description}</p></div>
  </header>
  {result.status==="safety"?<p role="alert" className={css.safety}>{result.message||t.safe}</p>:
  <>
   <div className={css.choices} role="tablist" aria-label={t.title}>
    {result.options.map((option,index)=><button key={option.id} type="button"
      id={"therapy-option-"+option.id} role="tab" aria-selected={choice===index}
      aria-controls="therapy-meditation-script" data-therapy-text-option={option.id}
      disabled={disabled} onClick={()=>{if(choice!==index)onInvalidate();setChoice(index as 0|1);setEditing(false);}}>
      <small>{index===0?t.a:t.b}</small><strong>{option.title}</strong>
    </button>)}
   </div>
   <div className={css.scriptCard} id="therapy-meditation-script" role="tabpanel"
     aria-labelledby={"therapy-option-"+(active?.id||"a")} data-therapy-script-text>
    <div className={css.scriptMeta}><span><Clock3 size={17}/>{t.duration}</span>
      <span className={css.scriptBadge}><Leaf size={16}/>{t.body}</span></div>
    {editing?
     <textarea className={css.editor} data-therapy-text-editor aria-label={t.edit}
       maxLength={750} value={script} disabled={disabled}
       onChange={event=>{
        setEdits(current=>({...current,[key]:event.target.value}));
        onInvalidate();
       }}/>:
     <div className={css.script} data-therapy-full-script>{script}</div>}
    {count>65?<p className={css.warning} role="status">{t.tooLong}</p>:null}
   </div>
   <button type="button" className={css.approve} data-therapy-approve-text
      disabled={!canApprove} onClick={()=>onApprove(script.trim())}>
      <Check size={21} aria-hidden="true"/>{t.approve}
   </button>
   <div className={css.secondary}>
    <button type="button" data-therapy-regenerate-local disabled={disabled} onClick={regenerate}>
      <RotateCcw size={17} aria-hidden="true"/>{t.again}
    </button>
    <button type="button" data-therapy-customize-text disabled={disabled}
      aria-pressed={editing} onClick={()=>setEditing(value=>!value)}>
      <SlidersHorizontal size={17} aria-hidden="true"/>{editing?t.done:t.customize}
    </button>
   </div>
   <p className={css.helper}><Sparkles size={13} aria-hidden="true"/>{t.help}</p>
  </>}
 </section>;
}
