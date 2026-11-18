import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale } from "@/data/academy/catalog";
import { shamanicaRecommendations,shamanicaServiceHref } from "@/lib/shamanica-recommendations.mjs";
import styles from "@/components/shamanica-mobile.module.css";
type Props={params:Promise<{locale:string}>;searchParams:Promise<{goal?:string;method?:string;start?:string}>};
const images={remedies:"/images/holistic-house/distance-homeopathy.webp",artifacts:"/images/holistic-house/tao-fu-balance.webp",energy:"/images/holistic-house/reiki-approved-sunrise-v3.webp",rituals:"/images/holistic-house/mandala-gold-reference.webp",learning:"/academy/reiki-yggdrasil/source/temple-studies.png"} as const;
const translations={
 ru:{title:"Ваш путь в Шаманике",eyebrow:"ВАША ПЕРСОНАЛЬНАЯ ПОДБОРКА",lead:"Два подходящих направления по вашим ответам. Выберите, с чего начать.",action:"Посмотреть предложение",again:"Изменить ответы",all:"Все услуги Шаманики",items:{remedies:["Подбор препаратов","Индивидуальная консультация по гомеопатическим средствам."],artifacts:["Артефакты и места силы","Символические предметы и персональные талисманы."],energy:["Энергетическая поддержка","Выберите формат Рейки-сеанса и оставьте запрос."],rituals:["Мандалы и ритуалы","Создайте личную мандалу или изучите практики."],learning:["Обучение","Вводные уроки, школы Рейки и мистерий."]}},
 en:{title:"Your Shamanica path",eyebrow:"YOUR PERSONAL SELECTION",lead:"Two directions based on your answers. Choose where to begin.",action:"Explore",again:"Change answers",all:"All Shamanica services",items:{remedies:["Remedy guidance","Learn about a personal homeopathy consultation."],artifacts:["Artefacts & power places","Discover symbolic objects and talismans."],energy:["Energy support","Request a personal Reiki session."],rituals:["Mandalas & rituals","Create a mandala or explore symbolic practices."],learning:["Learning","Introductory courses, Reiki and mysteries."]}},
 es:{title:"Tu camino en Shamanica",eyebrow:"SELECCIÓN PERSONAL",lead:"Dos caminos basados en tus respuestas.",action:"Explorar",again:"Cambiar respuestas",all:"Todos los servicios",items:{remedies:["Orientación sobre remedios","Consulta personal sobre preparados homeopáticos."],artifacts:["Objetos y lugares de poder","Objetos simbólicos y talismanes."],energy:["Apoyo energético","Solicita una sesión personal de Reiki."],rituals:["Mandalas y rituales","Crea un mandala y explora prácticas."],learning:["Aprendizaje","Cursos introductorios, Reiki y misterios."]}}
} as const;
export const metadata:Metadata={title:"Shamanica — personal path | Holistic House",robots:{index:false,follow:true}};
export default async function ShamanicaResults({params,searchParams}:Props){
 const {locale}=await params;
 if(!isPublicLocale(locale))notFound();
 const args=await searchParams;
 const items=shamanicaRecommendations(args) as Array<keyof typeof images>;
 const t=translations[locale];
 return <main lang={locale} className={styles.resultsPage} data-shamanica-results>
 <div className={styles.resultsShell}>
  <Link href={"/"+locale+"/shamanica"} className={styles.backLink}><ArrowLeft size={19}/>{t.again}</Link>
  <span className={styles.resultsEyebrow}><Sparkles size={18}/>{t.eyebrow}</span>
  <h1>{t.title}</h1><p className={styles.resultsLead}>{t.lead}</p>
  <div className={styles.resultCards}>{items.map((id,index)=><Link key={id} href={shamanicaServiceHref(locale,id)} prefetch={false} className={styles.resultCard} data-recommended-service={id}>
   <div className={styles.resultPhoto}><Image src={images[id]} alt="" fill sizes="(max-width:600px) 100vw, 230px"/></div>
   <div className={styles.resultText}><span className={styles.resultNumber}>{index+1} / 2</span><h2>{t.items[id][0]}</h2><p>{t.items[id][1]}</p>
   <span className={styles.resultLink}>{t.action}<ArrowRight size={17}/></span></div>
  </Link>)}</div>
  <Link href={"/"+locale+"/shamanica#shamanica-services-title"} className={styles.allServices}>{t.all}<ArrowRight size={18}/></Link>
 </div>
 </main>;
}
