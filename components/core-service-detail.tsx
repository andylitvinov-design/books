import Image from "next/image";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import Link from "next/link";
import { ArrowLeft, ArrowUpRight, Check, ShieldCheck } from "lucide-react";
import type { Locale } from "@/data/remedies";
import { ServiceVideoShowcase } from "@/components/service-video-showcase";
import styles from "./core-service-detail.module.css";

export type DetailKind = "dao" | "alchemy" | "hypnotherapy";

const copy = {
  en: {
    dao: {
      eyebrow: "FREE · DAO / WU XING RESOURCE REVIEW",
      title: "Free DAO Health & Resource Profile",
      lead: "Explore how you experience your energy, balance and personal resources through the author's DAO / Wu Xing model. This is a symbolic self-reflection profile, not a diagnosis of health conditions.",
      benefit: "A fresh perspective on your present resources and which areas you may wish to explore.",
      sectionsTitle: "What this free profile explores",
      sections: [
        { title: "Your present resources", text: "Describe how you currently experience energy, strain and internal support." },
        { title: "DAO / Wu Xing perspective", text: "Explore your experience using the author's symbolic Five Elements and resource-stage framework." },
        { title: "Reflection and next questions", text: "Consider possible areas for attention without assigning a clinical score or diagnosis." },
      ],
      action: "Request my free DAO profile",
      actionMessage: "Service: FREE DAO Health & Resource Profile (Wu Xing)\nRequest: I would like to request the free symbolic DAO / Wu Xing resource profile. Please tell me how to start.",
      note: "The profile is free. A WhatsApp request opens with the service named; it is not sent until you choose Send.",
      safety: "The DAO model is an author's symbolic framework, not a validated medical diagnostic test. Do not use it to diagnose illness, adjust medicines or replace medical or mental-health care.",
      secondary: "Read about the DAO / Wu Xing model",
      secondaryHref: "/en/wu-xing",
      image: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    },
    alchemy: {
      eyebrow: "ONE-TO-ONE · INTEGRATED SESSION",
      title: "Alchemy of the Soul",
      lead: "Explore a personal, relational or business situation from several angles in one session. We look at what feels blocked and consider new choices, without promising a particular outcome.",
      benefit: "A clearer map of your situation, your patterns and possible next steps.",
      sectionsTitle: "Three approaches in one session",
      sections: [
        { title: "1. Situation analysis", text: "We clarify your question, goals, perceived obstacles and what matters most." },
        { title: "2. Systemic constellations", text: "We map roles and relationships through an exploratory symbolic exercise. This does not prove facts about other people." },
        { title: "3. Complementary homeopathic selection", text: "If relevant to your interests, we can explore homeopathic remedy selection as a complementary personal practice, not established treatment for physical or mental illness." },
      ],
      action: "Ask about an Alchemy of the Soul session",
      actionMessage: "Service: Alchemy of the Soul — integrated personal session\nRequest: I would like to discuss an individual session involving situation analysis, systemic constellations and optional complementary homeopathic selection. Please confirm availability and format.",
      note: "This is a service enquiry, not a confirmed booking. We agree the format and scope before any session.",
      safety: "Homeopathy has no reliable evidence of effectiveness for treating health conditions. No diagnosis, dosage or medication changes are provided here. Constellations are exploratory and do not replace professional legal, financial or clinical advice.",
      secondary: "How systemic constellations work",
      secondaryHref: "/en/services/systemic-constellations",
      image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
    },
    hypnotherapy: {
      eyebrow: "INDIVIDUAL COURSE · GUIDED IMAGERY",
      title: "Guided Imagery Hypnotherapy",
      lead: "A personal course of guided-imagery sessions for exploring unconscious images, emotional patterns and questions that are difficult to answer by thinking alone.",
      benefit: "Explore a steadier inner foundation and possible answers in your own imagery and experience.",
      sectionsTitle: "What we can work on",
      sections: [
        { title: "Strengthen inner resources", text: "Explore imagery connected with safety, boundaries, stability and personal support." },
        { title: "Understand repeating patterns", text: "Use gentle guided imagery and dialogue with inner parts to reflect on your responses and relationships." },
        { title: "Find your own next steps", text: "Integrate observations from the imagery work into realistic everyday choices." },
      ],
      action: "Ask about the guided imagery course",
      actionMessage: "Service: Guided Imagery Hypnotherapy — individual course\nRequest: I would like to explore a personal course of guided imagery sessions focused on inner resources and finding answers. Please let me know the format and availability.",
      note: "The number and frequency of sessions are discussed individually. No automatic booking or payment.",
      safety: "This reflective practice is not a guaranteed treatment for anxiety, depression or other health conditions and does not replace licensed mental-health, psychiatric or crisis care.",
      secondary: "Read about guided imagery",
      secondaryHref: "/en/services/imagery-therapy",
      image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    },
  },
  ru: {
    dao: {
      eyebrow: "БЕСПЛАТНО · ДАО / У-СИН",
      title: "Бесплатная дао-диагностика здоровья",
      lead: "Исследуйте самочувствие, личный ресурс и баланс через авторскую модель Дао / У-Син. Это символическая диагностика ресурса, а не медицинское обследование.",
      benefit: "Взгляд на текущий ресурс и качества, которым можно уделить внимание.",
      sectionsTitle: "Что исследуем в бесплатном разборе",
      sections: [
        { title: "Личный ресурс", text: "Вы описываете состояние, энергию, напряжение и ощущение внутренней опоры." },
        { title: "Авторская модель Дао / У-Син", text: "Рассматриваем переживания через символическую модель пяти элементов и ступеней ресурса." },
        { title: "Направление для размышления", text: "Проясняем, на какие качества стоит обратить внимание, без медицинских диагнозов." },
      ],
      action: "Запросить бесплатную дао-диагностику",
      actionMessage: "Услуга: БЕСПЛАТНАЯ дао-диагностика здоровья и ресурса (У-Син)\nЗапрос: хочу получить бесплатный символический профиль ресурса по модели Дао / У-Син. Подскажите, как начать.",
      note: "Бесплатная услуга. WhatsApp подготовит запрос с названием услуги; сообщение отправляется только после вашего подтверждения.",
      safety: "Модель Дао — авторская символическая система, не подтверждённый диагностический медицинский тест. Она не заменяет врача, обследование или лечение и не предназначена для изменения лекарств.",
      secondary: "Подробнее о модели Дао / У-Син",
      secondaryHref: "/ru/wu-xing",
      image: "/academy/reiki-yggdrasil/source/eastern-tradition.png",
    },
    alchemy: {
      eyebrow: "ЛИЧНАЯ СЕССИЯ · 3 ПОДХОДА",
      title: "Алхимия души",
      lead: "Одна сессия для более глубокого исследования личной, семейной или деловой ситуации: что мешает и какие другие варианты можно рассмотреть.",
      benefit: "Больше ясности в вашей ситуации, связях и следующих шагах.",
      sectionsTitle: "Три подхода в одной сессии",
      sections: [
        { title: "1. Анализ ситуации", text: "Уточняем запрос, цель, возможные препятствия и важные обстоятельства." },
        { title: "2. Системная расстановка", text: "Исследуем роли и связи в символическом формате. Расстановка не доказывает факты о других людях." },
        { title: "3. Дополнительный гомеопатический подбор", text: "При необходимости исследуем индивидуальный подбор гомеопатических средств как дополнительную практику, без обещаний лечебного эффекта." },
      ],
      action: "Запросить сессию «Алхимия души»",
      actionMessage: "Услуга: Алхимия души — комплексная личная сессия\nЗапрос: интересует анализ ситуации, системная расстановка и возможный дополнительный гомеопатический подбор. Подскажите формат и доступное время.",
      note: "Это запрос на сессию, не подтверждённая запись или оплата. Формат согласуем отдельно.",
      safety: "Надёжных доказательств эффективности гомеопатии для лечения заболеваний нет. Эта услуга не заменяет диагностику, назначенные лекарства, медицинскую помощь или профессиональную юридическую/финансовую экспертизу.",
      secondary: "Подробнее о расстановках",
      secondaryHref: "/ru/services/systemic-constellations",
      image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
    },
    hypnotherapy: {
      eyebrow: "ИНДИВИДУАЛЬНЫЙ КУРС · ОБРАЗЫ ПОДСОЗНАНИЯ",
      title: "Курс гипнотерапии",
      lead: "Индивидуальный цикл сессий для исследования образов подсознания, внутренних реакций и личных вопросов, на которые трудно найти ответ только разумом.",
      benefit: "Исследование внутренней опоры, ресурсов и собственных вариантов дальнейших действий.",
      sectionsTitle: "Основные направления работы",
      sections: [
        { title: "Укрепление внутренней опоры", text: "Через образы исследуем чувство безопасности, границы и личный ресурс." },
        { title: "Работа с повторяющимися сценариями", text: "Бережно исследуем чувства, реакции и отношения через направленное воображение." },
        { title: "Поиск собственных ответов", text: "Связываем найденные образы и наблюдения с реальными жизненными решениями." },
      ],
      action: "Узнать о курсе гипнотерапии",
      actionMessage: "Услуга: Курс гипнотерапии — работа с образами подсознания\nЗапрос: интересует индивидуальный курс для укрепления внутреннего ресурса и поиска ответов. Подскажите формат и доступность.",
      note: "Количество и частота сессий определяются индивидуально. Никакой автоматической записи или оплаты.",
      safety: "Работа с образами не гарантирует лечение тревоги, депрессии или других состояний и не заменяет помощь лицензированного специалиста в области психического здоровья или кризисную помощь.",
      secondary: "Подробнее об образной работе",
      secondaryHref: "/ru/services/imagery-therapy",
      image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
    },
  },
} as const;

export function coreOfferDetailData(locale: Locale, kind: DetailKind) {
  return copy[locale][kind];
}

export function CoreServiceDetail({ locale, kind }: { locale: Locale; kind: DetailKind }) {
  const t = copy[locale][kind];
  const whatsappUrl = "https://wa.me/14376066502?text=" + encodeURIComponent(t.actionMessage);
  return (
    <main className={styles.main} lang={locale} data-core-service-detail={kind}>
      <div className={styles.breadcrumb}><Link href={"/" + locale + "/services"}><ArrowLeft size={17} aria-hidden="true"/>{locale === "ru" ? "Все услуги" : "All services"}</Link></div>
      <section className={styles.hero}>
        <div className={styles.intro}>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p className={styles.lead}>{t.lead}</p>
          <p className={styles.benefit}><Check size={17} aria-hidden="true"/>{t.benefit}</p>
          <AcquisitionEventLink className={styles.primary} href={whatsappUrl} target="_blank" rel="noopener noreferrer" prefetch={false} event="service_request_start" attributes={{ "data-contact-channel":"whatsapp", "data-service-request":kind }}>{t.action}<ArrowUpRight size={20} aria-hidden="true"/></AcquisitionEventLink>
          <p className={styles.note}>{t.note}</p>
        </div>
        <div className={styles.photo}><Image src={t.image} alt="" fill priority sizes="(max-width: 760px) 100vw, 38vw" /></div>
      </section>
      <ServiceVideoShowcase topic={kind === "dao" ? "overview" : kind} locale={locale} id="service-video" />
      <section className={styles.outcomes} aria-labelledby="core-service-process-heading">
        <h2 id="core-service-process-heading">{t.sectionsTitle}</h2>
        <div className={styles.items}>
          {t.sections.map(step => <article key={step.title}><h3>{step.title}</h3><p>{step.text}</p></article>)}
        </div>
      </section>
      <section className={styles.footer}>
        <p className={styles.safety}><ShieldCheck size={19} aria-hidden="true"/>{t.safety}</p>
        <div className={styles.links}>
          <Link href={t.secondaryHref}>{t.secondary}<ArrowUpRight size={16} aria-hidden="true"/></Link>
          <Link href={"/" + locale + "/services/free-situation-review"}>{locale === "ru" ? "Сначала бесплатный разбор ситуации" : "Prefer a free situation review?"}<ArrowUpRight size={16} aria-hidden="true"/></Link>
        </div>
      </section>
    </main>
  );
}
