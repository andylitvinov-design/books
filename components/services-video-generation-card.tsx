"use client";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Clapperboard, Info } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./services-video-generation-card.module.css";

const thumbnails = [
 "/images/holistic-house/reiki-approved-sunrise-v3.webp",
 "/images/holistic-house/assist-video-lake.svg",
 "/images/holistic-house/assist-video-letter.svg",
] as const;
const content = {
 ru: {
  title:"Видеогенерация", badge:"Для практики", sub:"Три сценария видео для мягкой поддержки",
  ideas:[["Видео-настрой","Короткое персональное видео для внутренней опоры"],["Видео-медитация","С мягким голосовым сопровождением и образами"],["Видео-послание","Под ваш запрос, цель или эмоциональное состояние"]],
  info:"Сценарии служат для знакомства. Персональное видео создаётся по вашему запросу.",
  action:"Персональное видео", detail:"На основе вашей темы · текст + аудио + визуал",
  create:"Сгенерировать видео",
  note:"Видео не заменяет психотерапию или медицинскую помощь.", open:"Видеостудия: ",
 },
 en: {
  title:"Personal video", badge:"Gentle practice", sub:"Three video ideas for calm reflection and support",
  ideas:[["Video intention","A short film for clarity and intention"],["Video meditation","Nature imagery and a gentle pace for reflection"],["Video message","Your own words, a goal or a meaningful thought"]],
  info:"These are starting ideas. Choose your topic, words, music and length in the video studio.",
  action:"Your own video", detail:"Your topic · visuals, text and sound",
  create:"Create my personal video",note:"Video practices do not replace psychotherapy or medical care.",open:"Video studio: ",
 },
 es: {
  title:"Vídeo personal",badge:"Práctica suave",sub:"Tres ideas para una reflexión tranquila",
  ideas:[["Vídeo de intención","Una película breve sobre tu intención"],["Vídeo meditación","Naturaleza y un ritmo tranquilo"],["Vídeo mensaje","Tus palabras, una meta o una idea importante"]],
  info:"Son ideas iniciales. Elige tema, texto, música y duración en el estudio.",
  action:"Vídeo personalizado",detail:"Tu tema · imagen, texto y sonido",
  create:"Crear mi vídeo personal",note:"Estas prácticas no sustituyen la psicoterapia ni la atención médica.",open:"Estudio de vídeo: ",
 },
} as const;
export function ServicesVideoGenerationCard({locale}:{locale:PublicLocale}) {
 const t=content[locale], url="/"+locale+"/holistic-support/mandala";
 return <section className={styles.card} data-assist-video-generation lang={locale} aria-labelledby="services-video-title">
  <header className={styles.top}>
   <Image className={styles.flora} src="/images/holistic-house/assist-video-botanical.svg" alt="" width={320} height={168} unoptimized loading="lazy" aria-hidden="true"/>
   <div className={styles.titles}><h3 id="services-video-title">{t.title}</h3><span>{t.badge}</span></div>
   <p>{t.sub}</p>
  </header>
  <div className={styles.list}>
   {t.ideas.map(([title,desc],i)=><Link key={title} href={url} prefetch={false}
    data-assist-video-scenario={i+1} className={styles.item} aria-label={t.open+title}>
    <Image src={thumbnails[i]} width={220} height={124} alt="" unoptimized loading="lazy"/>
    <span><strong>{title}</strong><small>{desc}</small></span><ChevronRight size={20} aria-hidden="true"/>
   </Link>)}
  </div>
  <p className={styles.info}><Info size={21} aria-hidden="true"/>{t.info}</p>
  <div className={styles.bottom}>
   <span className={styles.film} aria-hidden="true"><Clapperboard size={32}/></span>
   <div><h4>{t.action}</h4><p>{t.detail}</p>
    <Link href={url} prefetch={false} data-assist-video-create className={styles.cta}>
     {t.create}<ArrowRight size={19} aria-hidden="true"/>
    </Link>
   </div>
  </div>
  <p className={styles.note}>{t.note}</p>
 </section>;
}
