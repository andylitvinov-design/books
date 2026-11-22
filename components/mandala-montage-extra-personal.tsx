"use client";
import {ArrowRight,Heart,MessageCircleHeart,Type} from "lucide-react";
import type {PublicLocale} from "@/lib/public-locales";
import css from "./mandala-video-personal-compact.module.css";
type Props={locale:PublicLocale;disabled:boolean;onSimple:()=>void;onSupport:()=>void;onPersonal:()=>void};
const copy={
 en:{title:"Choose text for your video",
   simple:["Make it simple","No text required","0 XP"],
   support:["Emotional support","Ready-to-use supportive phrases","0 XP"],
   personal:["Personalized video therapy","Answer questions about your goal","+50 XP*"],
   note:"*Draft price only. No XP is charged when choosing; final price requires server confirmation."},
 ru:{title:"Выберите текст для видео",
   simple:["Простое видео","Без текста","0 XP"],
   support:["Эмоциональная поддержка","Готовые поддерживающие фразы","0 XP"],
   personal:["Персональная видеотерапия","Ответьте на вопросы о своей цели","+50 XP*"],
   note:"*Предварительная стоимость. При выборе XP не списываются; нужно подтверждение сервера."},
 es:{title:"Elige el texto del vídeo",
   simple:["Vídeo sencillo","Sin texto","0 XP"],
   support:["Apoyo emocional","Frases de apoyo preparadas","0 XP"],
   personal:["Videoterapia personalizada","Preguntas sobre tu objetivo","+50 XP*"],
   note:"*Precio provisional. No se cobran XP al elegir; requiere confirmación del servidor."}
} as const;
export function MandalaMontageExtraPersonal({locale,disabled,onSimple,onSupport,onPersonal}:Props){
 const t=copy[locale];
 const options=[{id:"simple",data:t.simple,Icon:Type,action:onSimple},
   {id:"support",data:t.support,Icon:MessageCircleHeart,action:onSupport},
   {id:"personal",data:t.personal,Icon:Heart,action:onPersonal}] as const;
 return <section className={css.extraRoot} data-video-montage-extra-personal aria-label={t.title}>
   <h2>{t.title}</h2>
   <div className={css.extraChoices} role="group" aria-label={t.title}>
     {options.map(({id,data,Icon,action})=><button type="button" key={id}
       data-video-extra-text-option={id} disabled={disabled} onClick={action}>
       <span className={css.extraIcon}><Icon size={19} aria-hidden="true"/></span>
       <span className={css.extraCopy}><strong>{data[0]}</strong><small>{data[1]}</small></span>
       <span className={css.extraPrice}>{data[2]}</span><ArrowRight size={17} aria-hidden="true"/>
     </button>)}
   </div>
   <p className={css.extraNote}>{t.note}</p>
 </section>;
}
