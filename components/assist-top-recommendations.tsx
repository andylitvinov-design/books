"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, SlidersHorizontal } from "lucide-react";
import { ServicesCardActions } from "@/components/services-card-actions";
import { ServicesThreeVisibleOptions } from "@/components/services-three-visible-options";
import type { PublicLocale } from "@/lib/public-locales";
import type { AssistPreferences } from "@/lib/assist/service-match.mjs";
import { assistPriceLabel } from "@/lib/assist/service-match.mjs";
import { rankAssistProducts } from "@/lib/assist/product-recommendations.mjs";
import { telegramServiceRequestUrl } from "@/lib/assist/telegram-business-request.mjs";
import { resolveTelegramServiceHandoffUrl } from "@/lib/app/telegram-entry-url.mjs";
import styles from "./assist-top-recommendations.module.css";

type Focus = "stress" | "relationships" | "energy" | "health" | "work" | "growth" | "general" | null;
type ProductId = "review" | "therapy" | "constellation" | "business" | "opora" | "reiki" | "mandala" | "mytube";
type Product = { path:string; image:string; requestId?: "coaching" | "constellations" | "business" | "reiki" };
const products:Record<ProductId,Product> = {
  review:{path:"services/free-situation-review",image:"/images/holistic-house/video-posters/hypnotherapy-en-v1.webp"},
  therapy:{path:"services/imagery-therapy",image:"/images/holistic-house/andy-about.png",requestId:"coaching"},
  constellation:{path:"services/systemic-constellations",image:"/images/holistic-house/video-posters/constellations-en-v1.webp",requestId:"constellations"},
  business:{path:"services/business-consulting",image:"/images/holistic-house/andy-about.png",requestId:"business"},
  opora:{path:"courses/antistress",image:"/images/holistic-house/course-focus-mountain-boy.webp"},
  reiki:{path:"services/remote-energy-support",image:"/images/holistic-house/reiki-approved-sunrise-v3.webp",requestId:"reiki"},
  mandala:{path:"holistic-support/mandala",image:"/academy/reiki-yggdrasil/source/eastern-tradition.png"},
  mytube:{path:"mytube",image:"/images/holistic-house/assist-video-botanical.svg"},
};
type QuizCategory = "browse" | "consultation" | "services" | "business" | "courses" | "reiki" | "magical";
const groupForProduct:Record<ProductId, QuizCategory> = {
  review:"browse", therapy:"consultation", constellation:"services", business:"business",
  opora:"courses", reiki:"reiki", mandala:"magical", mytube:"courses",
};
const groupFallback:Record<Exclude<Focus,null>, readonly QuizCategory[]> = {
  stress:["consultation","courses","browse"], relationships:["services","consultation","browse"],
  energy:["reiki","courses","browse"], health:["browse","consultation","services"],
  work:["business","browse","services"], growth:["consultation","courses","browse"],
  general:["browse","consultation","courses"],
};
const groupLabels:Record<PublicLocale,Record<QuizCategory,string>> = {
  ru:{browse:"Тесты и бесплатный разбор",consultation:"Личная поддержка",services:"Отношения и расстановки",business:"Бизнес-анализ и решения",courses:"Курсы и практики",reiki:"Энергетическая поддержка",magical:"Мандалы и ритуалы"},
  en:{browse:"Tests & free review",consultation:"Personal support",services:"Relationships & constellations",business:"Business insights & decisions",courses:"Courses & practices",reiki:"Energy support",magical:"Mandalas & rituals"},
  es:{browse:"Pruebas y revisión gratis",consultation:"Apoyo personal",services:"Relaciones y constelaciones",business:"Análisis y decisiones de negocio",courses:"Cursos y prácticas",reiki:"Apoyo energético",magical:"Mandalas y rituales"},
};
const groupRankLabel:Record<PublicLocale,string> = {ru:"Приоритет",en:"Priority",es:"Prioridad"};
const groupPriceNote:Record<PublicLocale,string> = {
  ru:"Смотрите стоимость у каждой услуги. Варианты с ценой по запросу требуют отдельного подтверждения.",
  en:"Check each offer's price. Request-based prices must be confirmed individually.",
  es:"Comprueba el precio de cada servicio. Los precios a consultar requieren confirmación.",
};

const copy = {
  ru:{
    heading:"Предложения под ваш запрос",noMatchTitle:"Точного совпадения нет",adjust:"Изменить условия",freeAlternative:"Бесплатный письменный разбор",disclaimer:"Важная информация",
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
      mytube:["MyTube · видео","Бесплатные материалы для знакомства с темой."],
    },
  },
  en:{
    heading:"Offers for your situation",noMatchTitle:"No exact match",adjust:"Change choices",freeAlternative:"Free written review",disclaimer:"Before requesting",
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
      mytube:["MyTube · Videos","Free videos to explore this topic."],
    },
  },
  es:{
    heading:"Ofertas para tu situación",noMatchTitle:"No hay coincidencia exacta",adjust:"Cambiar opciones",freeAlternative:"Revisión escrita gratis",disclaimer:"Información importante",
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
      mytube:["MyTube · Vídeos","Vídeos gratuitos para explorar el tema."],
    },
  },
} as const;

export function AssistTopRecommendations({
  locale,focus,preferences={},priorityIds=[],matchingIds,allowedIds,noMatchLabel,categoryGroups=false,onAdjustFilters,
}:{
  locale:PublicLocale;focus:Focus;preferences?:AssistPreferences;
  priorityIds?:readonly string[];matchingIds?:readonly string[];allowedIds?:readonly string[];noMatchLabel?:string;
  categoryGroups?:boolean;onAdjustFilters?:()=>void;
}){
  const t=copy[locale];
  // Keep budget/mode/channel hard filters authoritative even if the same
  // Consultant Mind just named a more relevant first choice.
  const eligible=(rankAssistProducts(focus??"general",preferences,20) as ProductId[])
    .filter(id=>!allowedIds||allowedIds.includes(id));
  const prioritized=priorityIds.filter((id):id is ProductId=>
    Object.hasOwn(products,id)&&eligible.includes(id as ProductId));
  const productIds:readonly ProductId[]=matchingIds?.length===0?[]:
    [...new Set([...prioritized,...eligible])].slice(0,3);
  // The quiz presents TWO ranked service categories, each containing the same
  // three concrete, priced request cards as the public Services catalogue.
  // Other contexts retain the original three individual recommendations.
  if (categoryGroups && !productIds.length) {
    return <section className={styles.root + " " + styles.quizResult + " " + styles.noMatchResult}
      id="assist-recommendations" tabIndex={-1} data-assist-best-three
      aria-labelledby="assist-best-three-title">
      <header className={styles.header}>
        <h2 id="assist-best-three-title">{t.heading}</h2>
      </header>
      <div className={styles.emptyMatch} data-support-empty-result role="status">
        <span className={styles.emptyMark} aria-hidden="true"><SlidersHorizontal size={20}/></span>
        <div><strong>{t.noMatchTitle}</strong><p>{noMatchLabel??t.none}</p></div>
      </div>
      <div className={styles.emptyActions}>
        {onAdjustFilters?<button type="button" onClick={onAdjustFilters}
          className={styles.adjustAction}><SlidersHorizontal size={16} aria-hidden="true"/>{t.adjust}</button>:null}
        <Link href={"/"+locale+"/services/free-situation-review"} prefetch={false}
          className={styles.freeAction}>{t.freeAlternative}<ArrowRight size={16} aria-hidden="true"/></Link>
      </div>
      <details className={styles.disclosure}><summary>{t.disclaimer}</summary>
        <p className={styles.note}>{t.note}</p></details>
    </section>;
  }
  if (categoryGroups && productIds.length) {
    const focusKey=focus??"general";
    const rankedGroups = [...new Set([
      ...productIds.map(id=>groupForProduct[id]),
      ...groupFallback[focusKey],
    ])].slice(0,2);
    return <section className={styles.root + " " + styles.quizResult} id="assist-recommendations" tabIndex={-1}
      data-assist-best-three data-assist-grouped-results aria-labelledby="assist-best-three-title">
      <header className={styles.header}>
        <h2 id="assist-best-three-title">{t.heading}</h2>
        <p>{t.detail}</p>
      </header>
      <div className={styles.groupList} data-services-quiz-priority-groups>
        {rankedGroups.map((id,index)=><section key={id} className={styles.groupBlock}
          data-services-priority-category={id} data-priority-rank={index+1} data-priority-offer-count="3">
          <header className={styles.groupHeading}>
            <span>{groupRankLabel[locale]} {index+1} / {rankedGroups.length}</span>
            <h3>{groupLabels[locale][id]}</h3>
          </header>
          <ServicesThreeVisibleOptions id={id} locale={locale}/>
        </section>)}
      </div>
      <p className={styles.groupPriceNote}>{groupPriceNote[locale]}</p>
      <Link className={styles.all} href={"/"+locale+"/services/catalog#service-listings"} prefetch={false}>
        <BookOpen size={19} aria-hidden="true"/>{t.more}<ArrowRight size={17} aria-hidden="true"/>
      </Link>
      <details className={styles.disclosure}><summary>{t.disclaimer}</summary>
        <p className={styles.note}>{t.note}</p></details>
    </section>;
  }
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
        const handoff=draft?resolveTelegramServiceHandoffUrl(draft,locale):null;
        const priced=id==="review"||id==="therapy"||id==="constellation"||id==="business";
        const price=(priced||id==="mytube")?assistPriceLabel(id,locale)
          .replaceAll(" minutes — ","m · ").replaceAll(" минут — ","м · ")
          .replaceAll(" minutos — ","min · ").replaceAll("; "," / "):t.price;
        return <article className={styles.card} data-support-uniform-card data-assist-best-card={id} data-assist-recommendation={id} key={id}>
          <Link href={href} className={styles.thumbnail} data-support-uniform-photo prefetch={false} tabIndex={-1} aria-hidden="true">
            <Image src={item.image} alt="" fill sizes="(max-width:760px) 34vw, 110px"/>
          </Link>
          <div className={styles.content} data-support-uniform-copy>
            <h3><Link href={href} prefetch={false} data-assist-product-link={id}>{title}</Link></h3>
            <p className={styles.description}>{description}</p>
          </div>
          <span className={styles.price} data-support-uniform-price>{price}</span>
          <ServicesCardActions locale={locale} title={title} description={description}
            href={href} request={description} trackingId={id} actionTrackingId={id}
            telegramUrl={id==="review"?"/api/public/telegram-option-entry?offer=browse_situation&locale="+locale:handoff||draft||undefined}/>
        </article>;
      })}
    </div>
    <Link className={styles.all} href={"/"+locale+"/services/catalog#service-listings"} prefetch={false}>
      <BookOpen size={19} aria-hidden="true"/>{t.more}<ArrowRight size={17} aria-hidden="true"/>
    </Link>
    <p className={styles.note}>{t.note}</p>
  </section>;
}
