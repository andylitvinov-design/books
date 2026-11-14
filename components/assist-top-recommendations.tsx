"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { AssistPreferences } from "@/lib/assist/service-match.mjs";
import { assistPriceLabel } from "@/lib/assist/service-match.mjs";
import { rankAssistProducts } from "@/lib/assist/product-recommendations.mjs";
import { telegramServiceRequestUrl } from "@/lib/assist/telegram-business-request.mjs";
import styles from "./assist-top-recommendations.module.css";

type Focus = "stress" | "relationships" | "energy" | "health" | "work" | "growth" | "general" | null;
type ProductId = "review" | "therapy" | "constellation" | "business" | "opora" | "reiki" | "mandala";
type Product = { path:string; image:string; requestId?: "coaching" | "constellations" | "business" | "reiki" };
const products:Record<ProductId,Product> = {
  review:{path:"services/free-situation-review",image:"/images/holistic-house/video-posters/hypnotherapy-en-v1.webp"},
  therapy:{path:"services/imagery-therapy",image:"/images/holistic-house/andy-about.png",requestId:"coaching"},
  constellation:{path:"services/systemic-constellations",image:"/images/holistic-house/video-posters/constellations-en-v1.webp",requestId:"constellations"},
  business:{path:"services/business-consulting",image:"/images/holistic-house/andy-about.png",requestId:"business"},
  opora:{path:"courses/antistress",image:"/images/holistic-house/course-focus-mountain-boy.webp"},
  reiki:{path:"services/remote-energy-support",image:"/images/holistic-house/reiki-approved-sunrise-v3.webp",requestId:"reiki"},
  mandala:{path:"holistic-support/mandala",image:"/academy/reiki-yggdrasil/source/eastern-tradition.png"},
};
const copy = {
  ru:{
    heading:"Предложения под ваш запрос",
    detail:"Конкретные услуги, подобранные под описанную проблему.",
    request:"Заказать",open:"Открыть",more:"Все предложения",price:"Стоимость уточните в предложении",
    none:"По выбранным условиям подходящих предложений пока нет. Измените формат или бюджет.",
    note:"Заказ откроет Telegram с названием услуги. Отправка сообщения не означает запись или оплату. Символические практики не заменяют медицинскую помощь.",
    cards:{
      review:["Бесплатный разбор ситуации","Письменная обратная связь по вашему вопросу."],
      therapy:["Сессия образной психотерапии","Индивидуальная работа с переживаниями и выбором."],
      constellation:["Системные расстановки","Исследование повторяющихся жизненных сценариев."],
      business:["Бизнес-консультация","Обсуждение рабочих трудностей и решений."],
      opora:["14-дневный курс ОПОРА","Ежедневные упражнения для самоподдержки."],
      reiki:["Дистанционная Рейки-сессия","Дополнительная символическая практика для отдыха."],
      mandala:["Персональная мандала","Визуальная практика для саморефлексии."],
    },
  },
  en:{
    heading:"Offers for your situation",
    detail:"Specific services selected for the problem you described.",
    request:"Request",open:"View",more:"All services",price:"See the offer for pricing",
    none:"No suitable offers match those conditions. Try another format or budget.",
    note:"A request opens Telegram with the chosen service. You still need to send it; this does not confirm a booking or payment. Symbolic practices are not medical care.",
    cards:{
      review:["Free Personal Situation Review","Written feedback on your specific question."],
      therapy:["Guided Imagery Therapy Session","Personal support with feelings and life choices."],
      constellation:["Systemic Constellations Session","Explore recurring patterns and life decisions."],
      business:["Business Consultation","Explore work-related challenges and next steps."],
      opora:["14-day OPORA Course","Daily self-guided exercises for support."],
      reiki:["Remote Reiki Session","Optional symbolic practice for rest and reflection."],
      mandala:["Personal Mandala","Visual reflection on your situation."],
    },
  },
  es:{
    heading:"Ofertas para tu situación",
    detail:"Servicios concretos seleccionados para el problema que describes.",
    request:"Solicitar",open:"Ver",more:"Todos los servicios",price:"Consulta el precio en la oferta",
    none:"No hay ofertas que cumplan esas condiciones. Prueba otro formato o presupuesto.",
    note:"La solicitud abre Telegram con el servicio elegido. Debes enviar el mensaje; no confirma reserva ni pago. Las prácticas simbólicas no son atención médica.",
    cards:{
      review:["Revisión personal gratuita","Respuesta escrita a tu pregunta específica."],
      therapy:["Sesión de terapia con imágenes","Apoyo individual para emociones y decisiones."],
      constellation:["Sesión de constelaciones","Explora patrones repetidos y decisiones de vida."],
      business:["Consulta de negocios","Analiza retos laborales y próximos pasos."],
      opora:["Curso OPORA de 14 días","Ejercicios diarios de apoyo personal."],
      reiki:["Sesión de Reiki a distancia","Práctica simbólica opcional para descansar."],
      mandala:["Mandala personal","Reflexión visual sobre tu situación."],
    },
  },
} as const;

export function AssistTopRecommendations({
  locale,focus,preferences={},priorityIds=[],matchingIds,noMatchLabel,
}:{
  locale:PublicLocale;focus:Focus;preferences?:AssistPreferences;
  priorityIds?:readonly string[];matchingIds?:readonly string[];noMatchLabel?:string;
}){
  const t=copy[locale];
  // Keep budget/mode/channel hard filters authoritative even if the same
  // Consultant Mind just named a more relevant first choice.
  const eligible=rankAssistProducts(focus??"general",preferences,20) as ProductId[];
  const prioritized=priorityIds.filter((id):id is ProductId=>
    Object.hasOwn(products,id)&&eligible.includes(id as ProductId));
  const productIds:readonly ProductId[]=matchingIds?.length===0?[]:
    [...new Set([...prioritized,...eligible])].slice(0,3);
  return <section className={styles.root} id="assist-recommendations" tabIndex={-1} data-assist-best-three aria-labelledby="assist-best-three-title">
    <header className={styles.header}>
      <h2 id="assist-best-three-title">{t.heading}</h2>
      <p>{t.detail}</p>
    </header>
    <div className={styles.list} data-assist-product-list>
      {!productIds.length?<p className={styles.empty} role="status">{noMatchLabel??t.none}</p>:null}
      {productIds.map((id)=>{
        const item=products[id];
        const [title,description]=t.cards[id];
        const href="/"+locale+"/"+item.path;
        const draft=item.requestId?telegramServiceRequestUrl(item.requestId,locale):null;
        const priced=id==="review"||id==="therapy"||id==="constellation"||id==="business";
        const price=priced?assistPriceLabel(id,locale)
          .replaceAll(" minutes — ","m · ").replaceAll(" минут — ","м · ")
          .replaceAll(" minutos — ","min · ").replaceAll("; "," / "):t.price;
        return <article className={styles.card} data-assist-best-card={id} data-assist-recommendation={id} key={id}>
          <Link href={href} className={styles.product} prefetch={false} data-assist-product-link={id} aria-label={t.open+": "+title}>
            <span className={styles.thumbnail}><Image src={item.image} alt="" fill sizes="(max-width:760px) 68px, 110px"/></span>
            <span className={styles.content}>
              <strong>{title}</strong>
              <span className={styles.description}>{description}</span>
              <small className={styles.price}>{price}</small>
            </span>
          </Link>
          {draft?<a className={styles.action} href={draft} target="_blank" rel="noopener noreferrer"
              referrerPolicy="no-referrer" aria-label={t.request+": "+title+" — Telegram"} data-assist-best-action={id}>
              {t.request}<ArrowRight size={16} aria-hidden="true"/>
            </a>:<Link className={styles.action} href={href} prefetch={false} data-assist-best-action={id}>
              {t.open}<ArrowRight size={16} aria-hidden="true"/>
            </Link>}
        </article>;
      })}
    </div>
    <Link className={styles.all} href={"/"+locale+"/services/catalog#service-listings"} prefetch={false}>
      <BookOpen size={19} aria-hidden="true"/>{t.more}<ArrowRight size={17} aria-hidden="true"/>
    </Link>
    <p className={styles.note}>{t.note}</p>
  </section>;
}
