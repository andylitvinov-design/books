import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUpRight, Check, ChevronDown, Compass, Flower2, HeartHandshake, Layers3, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";

import { PageVideo } from "@/components/page-video";
import { PersonalTestimonials } from "@/components/personal-testimonials";
import { PublicConsultationCta } from "@/components/public-consultation-cta";
import { PublicSiteHeader } from "@/components/public-site-header";
import { getHomeopathyLocaleParams, isSupportedLocale } from "@/data/remedies";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import type { PublicService } from "@/lib/practitioners/public-types";
import styles from "./services-landing.module.css";

type Props = { params: Promise<{ locale: string }> };
type DirectionId = "psychohomeopathy" | "imagery" | "constellations";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const translations = {
  ru: {
    title: "Три направления индивидуальной работы — Holistic House",
    meta: "Психогомеопатия, образная психотерапия, системные расстановки и архетипическая поддержка в Торонто и онлайн. Начните с бесплатной диагностики ситуации.",
    eyebrow: "Индивидуальная работа · Торонто и онлайн",
    heading: "Три пути к внутренней опоре и движению вперёд",
    lead: "Когда не хватает сил, трудно понять себя или двигаться к цели, не нужно выбирать из десятка методов. Начнём с вашей ситуации и найдём подходящий формат работы.",
    primary: "Записаться на бесплатную диагностику",
    secondary: "Посмотреть 3 подхода",
    free: "Бесплатно · без обязательств",
    routeEyebrow: "Три направления · один понятный выбор",
    routeTitle: "С чем вы приходите?",
    routeText: "Это три самостоятельных направления, а не обязательные этапы. В каждом собраны близкие по задаче методы.",
    freeTitle: "Начните с бесплатной диагностики ситуации",
    freeText: "Проясним вашу проблему, цель или бизнес-вопрос, исследуем точку ступора и возможную зону роста. После разговора вы сами решите, нужна ли дальнейшая работа.",
    freeSteps: ["Ваш запрос", "Точка ступора", "Возможный следующий шаг"],
    freeAction: "Получить бесплатную диагностику",
    servicesLabel: "Три направления личной работы",
    services: [
      {
        id: "psychohomeopathy" as const,
        index: "01",
        title: "Психогомеопатия",
        headline: "Когда не хватает сил и тело сигнализирует о напряжении",
        summary: "Усталость, бессилие, физические симптомы и психосоматические проявления. Исследуем эмоциональный фон, привычные реакции и то, что вы переживаете.",
        outcome: "Фокус: личный ресурс, самочувствие и понимание связи переживаний с состоянием.",
        specialties: ["Алхимия души / психогомеопатия", "Консультация по гомеопатии", "Внутренние состояния, ресурсы и психосоматика"],
        action: "Подробнее о психогомеопатии",
        target: "/services/andy-litvinov/homeopathy-consultation",
        image: "/images/holistic-house/video-posters/homeopathy-en-v2.webp",
        alt: "Андрей рассказывает о личной работе и самочувствии",
        icon: Flower2,
        note: "Гомеопатия не имеет надёжных доказательств эффективности лечения заболеваний. Не заменяет диагностику или лечение у врача.",
      },
      {
        id: "imagery" as const,
        index: "02",
        title: "Образная психотерапия",
        headline: "Когда хочется ясности, близости и внутренней устойчивости",
        summary: "Грусть, одиночество, тревога, сложные отношения, потеря ориентиров. Через образы бессознательного и личные сессии исследуем ваши чувства, внутренние конфликты и опоры.",
        outcome: "Фокус: лучше понимать себя, укреплять границы и находить собственное направление.",
        specialties: ["Гипнотерапия и регрессионные техники", "Работа с внутренним ребёнком и частями личности", "Образы бессознательного и повторяющиеся сценарии"],
        action: "Подробнее об образной терапии",
        target: "/services/imagery-therapy",
        image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
        alt: "Андрей рассказывает об образной работе",
        icon: HeartHandshake,
        note: "",
      },
      {
        id: "constellations" as const,
        index: "03",
        title: "Расстановки и архетипическая поддержка",
        headline: "Когда есть цель, но трудно увидеть путь к ней",
        summary: "Личные и деловые решения, отношения, повторяющиеся сценарии и препятствия на пути к цели. Исследуем систему отношений, роли и возможные шаги через расстановки и архетипические образы.",
        outcome: "Фокус: увидеть ситуацию шире, прояснить варианты выбора и следующие действия.",
        specialties: ["Семейные и системные расстановки", "Бизнес-расстановки и расстановки решений", "Архетипические расстановки и поддержка"],
        action: "Подробнее о расстановках",
        target: "/services/andy-litvinov/personal-constellation-session",
        image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
        alt: "Андрей рассказывает о системных расстановках",
        icon: Layers3,
        note: "Расстановки не гарантируют внешнего результата и не заменяют профессиональную финансовую или юридическую консультацию.",
      },
    ],
    offersTitle: "Конкретные сессии и мастера",
    offersLead: "Подробные предложения собраны внутри соответствующих направлений. Можно посмотреть формат и отправить запрос.",
    seeOfferings: "Показать предложения",
    noOffers: "Подробные предложения появятся после публикации мастерами. Три направления личной работы доступны выше.",
    details: "Подробнее",
    request: "Отправить запрос",
    freeService: "Бесплатно",
    onRequest: "По запросу",
    seeMasters: "Все мастера и практики",
    learnTitle: "Как устроены методы",
    learnLead: "Короткие видео о подходах, без дополнительных направлений в каталоге.",
    videoIntro: "Общее знакомство",
    videoImagery: "Гипнотерапия и образная работа",
    videoConstellation: "Системные расстановки",
    reikiTitle: "Ищете Рейки или энергетические практики?",
    reikiText: "Обучение и энергетические практики находятся в Academy, отдельно от трёх направлений индивидуальных консультаций.",
    reikiAction: "Перейти к программам Рейки",
    bottomDisclaimer: "Бесплатная диагностика ситуации — первичный разговор, не медицинская диагностика. При физических симптомах обращайтесь к квалифицированному врачу. Индивидуальные методы не гарантируют результата.",
  },
  en: {
    title: "Three paths of personal work — Holistic House",
    meta: "Psychohomeopathy, guided imagery psychotherapy, systemic constellations and archetypal support in Toronto and online. Begin with a free situation review.",
    eyebrow: "Personal sessions · Toronto & online",
    heading: "Three ways to find support, clarity and direction",
    lead: "Low energy, emotional difficulties or a goal that feels out of reach? You don't need to choose among a dozen techniques. We start with your situation and find the format that fits.",
    primary: "Book a free situation assessment",
    secondary: "Explore the three approaches",
    free: "Free · no obligation",
    routeEyebrow: "Three directions · one clear starting point",
    routeTitle: "What brings you here?",
    routeText: "These are three independent approaches, not steps you must complete in sequence. Related methods are grouped under each one.",
    freeTitle: "Start with a free situation & goal assessment",
    freeText: "Explore a personal challenge, goal or business question. We look at where you feel stuck, possible areas for growth and a useful next step. You decide whether to continue.",
    freeSteps: ["Your question", "Where you're stuck", "A possible next step"],
    freeAction: "Request my free assessment",
    servicesLabel: "Three personal-work directions",
    services: [
      {
        id: "psychohomeopathy" as const,
        index: "01",
        title: "Psychohomeopathy",
        headline: "When you feel exhausted and your body is under strain",
        summary: "Fatigue, low energy, physical symptoms and psychosomatic concerns. We explore your emotional experience, recurring responses and sense of personal resources.",
        outcome: "Focus: wellbeing, personal resources and understanding how experiences relate to how you feel.",
        specialties: ["Alchemy of the Soul / psychohomeopathy", "Individual homeopathy consultation", "Inner states, resources & psychosomatic concerns"],
        action: "Explore psychohomeopathy",
        target: "/services/andy-litvinov/homeopathy-consultation",
        image: "/images/holistic-house/video-posters/homeopathy-en-v2.webp",
        alt: "Andrey introducing his approach to wellbeing",
        icon: Flower2,
        note: "Homeopathy lacks reliable evidence of effectiveness for medical conditions and does not replace medical diagnosis or treatment.",
      },
      {
        id: "imagery" as const,
        index: "02",
        title: "Guided imagery psychotherapy",
        headline: "When you need clarity, connection and inner stability",
        summary: "Sadness, loneliness, anxiety, difficult relationships or feeling lost. Personal sessions explore unconscious imagery, feelings, inner conflicts and ways to build your own sense of support.",
        outcome: "Focus: understanding yourself, strengthening boundaries and finding your own direction.",
        specialties: ["Hypnotherapy and regression-based exploration", "Inner-child and parts-oriented work", "Unconscious imagery and repeating patterns"],
        action: "Explore guided imagery sessions",
        target: "/services/imagery-therapy",
        image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
        alt: "Andrey explaining imagery-based personal work",
        icon: HeartHandshake,
        note: "",
      },
      {
        id: "constellations" as const,
        index: "03",
        title: "Constellations & archetypal support",
        headline: "When you have a goal but can't see how to reach it",
        summary: "Personal or business choices, relationship patterns and obstacles on the way to a goal. Systemic constellations and archetypal imagery help explore roles, relationships and possible next steps.",
        outcome: "Focus: seeing the wider picture, exploring choices and clarifying your next action.",
        specialties: ["Family & systemic constellations", "Business & decision constellations", "Archetypal constellations and support"],
        action: "Explore constellation sessions",
        target: "/services/andy-litvinov/personal-constellation-session",
        image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
        alt: "Andrey explaining systemic constellations",
        icon: Layers3,
        note: "Constellations do not guarantee real-world outcomes and do not replace qualified financial or legal advice.",
      },
    ],
    offersTitle: "Individual sessions & practitioners",
    offersLead: "Specific offerings are grouped under the three approaches. Open details or send a request.",
    seeOfferings: "View available sessions",
    noOffers: "Individual offers will appear as practitioners publish them. The three core approaches are available above.",
    details: "Details",
    request: "Request a session",
    freeService: "Free",
    onRequest: "On request",
    seeMasters: "All practitioners",
    learnTitle: "More about the methods",
    learnLead: "Short explanations of the approaches, without adding more service categories.",
    videoIntro: "An introduction",
    videoImagery: "Hypnotherapy & imagery",
    videoConstellation: "Systemic constellations",
    reikiTitle: "Looking for Reiki or energy practices?",
    reikiText: "Training and energy work belong in the Academy, separate from the three personal consultation directions.",
    reikiAction: "Explore Reiki programs",
    bottomDisclaimer: "A free situation assessment is an introductory conversation, not a medical diagnosis. Physical symptoms require evaluation by a qualified healthcare professional. No specific outcomes are guaranteed.",
  },
} as const;

function classifyOffering(service: PublicService): DirectionId | null {
  const value = [service.slug, service.copy.title].join(" ").toLowerCase();
  if (/homeopath|alchemy|гомеопат|алхим/.test(value)) return "psychohomeopathy";
  if (/imagery|hypno|psychotherap|therapy|образн|гипно|психотерап/.test(value)) return "imagery";
  if (/constellation|archetyp|business|расстанов|архетип|бизнес|decision/.test(value)) return "constellations";
  return null;
}

export function generateStaticParams() { return getHomeopathyLocaleParams(); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) return { title: "Not found" };
  const t = translations[locale];
  return {
    metadataBase: metadataBaseFor(),
    title: t.title,
    description: t.meta,
    alternates: { canonical: `/${locale}/services`, languages: { ru: "/ru/services", en: "/en/services" } },
  };
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  if (!isSupportedLocale(locale)) notFound();
  const t = translations[locale];
  let offerings: PublicService[] = [];
  try {
    offerings = await createPractitionerRepository(getAppConfig()).listPublicServices(locale);
  } catch {
    // The three main service directions must remain visible when the marketplace is unavailable.
  }

  const grouped: Record<DirectionId, PublicService[]> = { psychohomeopathy: [], imagery: [], constellations: [] };
  for (const offering of offerings) {
    // The free Wu Xing profile is a separate client-cabinet tool, not a fourth therapy direction.
    if (offering.slug === "free-wu-xing-diagnostic") continue;
    const group = classifyOffering(offering);
    if (group) grouped[group].push(offering);
  }
  const hasOffers = Object.values(grouped).some((items) => items.length > 0);

  return (
    <main className={styles.page} lang={locale}>
      <PublicSiteHeader locale={locale} />
      <section className={styles.hero} aria-labelledby="services-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><Sparkles aria-hidden="true" size={16} />{t.eyebrow}</p>
          <h1 id="services-title">{t.heading}</h1>
          <p className={styles.heroLead}>{t.lead}</p>
          <div className={styles.heroActions}>
            <Link href={`/${locale}/services/free-situation-review`} className={styles.primaryButton}>
              {t.primary}<ArrowUpRight aria-hidden="true" size={20}/>
            </Link>
            <Link href="#available-services" className={styles.secondaryButton}>
              {t.secondary}<ArrowDown aria-hidden="true" size={18}/>
            </Link>
          </div>
          <p className={styles.microcopy}><Check aria-hidden="true" size={16} />{t.free}</p>
        </div>
        <div className={styles.heroPhoto}>
          <Image src="/images/holistic-house/video-posters/hypnotherapy-en-v1.webp" alt="" fill priority sizes="(max-width: 800px) 100vw, 43vw"/>
          <div className={styles.heroPhotoTag}><Compass aria-hidden="true" size={19}/>{t.servicesLabel}</div>
        </div>
      </section>

      <section id="available-services" className={styles.directions} aria-labelledby="directions-title">
        <div className={styles.sectionIntro}>
          <p className={styles.eyebrow}>{t.routeEyebrow}</p>
          <h2 id="directions-title">{t.routeTitle}</h2>
          <p>{t.routeText}</p>
        </div>
        <nav className={styles.jumpNav} aria-label={t.servicesLabel}>
          {t.services.map((service) => (
            <a href={`#${service.id}`} key={service.id}>
              <span>{service.index}</span><strong>{service.title}</strong><ArrowDown aria-hidden="true" size={17}/>
            </a>
          ))}
        </nav>
        <div className={styles.directionStack}>
          {t.services.map((service) => {
            const Icon = service.icon;
            return (
              <article className={styles.direction} id={service.id} key={service.id}>
                <div className={styles.directionMedia}>
                  <Image src={service.image} alt={service.alt} fill sizes="(max-width: 840px) 100vw, 42vw"/>
                  <span className={styles.chapterNumber}>{service.index} / 03</span>
                </div>
                <div className={styles.directionContent}>
                  <p className={styles.directionName}><Icon aria-hidden="true" size={19}/>{service.title}</p>
                  <h3>{service.headline}</h3>
                  <p className={styles.description}>{service.summary}</p>
                  <p className={styles.outcome}>{service.outcome}</p>
                  <div className={styles.specialties}>
                    <p>{locale === "ru" ? "В рамках направления" : "This approach includes"}</p>
                    <ul>{service.specialties.map((item) => <li key={item}><Check aria-hidden="true" size={15}/>{item}</li>)}</ul>
                  </div>
                  <div className={styles.directionActions}>
                    <Link href={`/${locale}${service.target}`} className={styles.directionLink}>{service.action}<ArrowRight aria-hidden="true" size={19}/></Link>
                    <Link href={`/${locale}/services/free-situation-review`} className={styles.smallLink}>{locale === "ru" ? "Начать бесплатно" : "Start free"}<ArrowUpRight aria-hidden="true" size={16}/></Link>
                  </div>
                  {service.note ? <p className={styles.finePrint}>{service.note}</p> : null}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className={styles.freeBanner} id="free-situation-review-offer" aria-labelledby="free-review-title">
        <div className={styles.freeText}>
          <p className={styles.eyebrow}><Sparkles aria-hidden="true" size={16}/>{t.free}</p>
          <h2 id="free-review-title">{t.freeTitle}</h2>
          <p>{t.freeText}</p>
          <div className={styles.steps}>{t.freeSteps.map((step, i)=><span key={step}><b>{i+1}</b>{step}</span>)}</div>
        </div>
        <Link href={`/${locale}/services/free-situation-review`} className={styles.freeButton}>{t.freeAction}<ArrowUpRight aria-hidden="true" size={21}/></Link>
      </section>

      <section className={styles.extra} aria-label={t.offersTitle}>
        <details>
          <summary><span><strong>{t.offersTitle}</strong><small>{t.offersLead}</small></span><span className={styles.detailsToggle}>{t.seeOfferings}<ChevronDown aria-hidden="true" size={18}/></span></summary>
          <div className={styles.offerGroups}>
            {hasOffers ? t.services.map((direction) => (
              grouped[direction.id].length ? <div key={direction.id} className={styles.offerGroup}>
                <h3>{direction.title}</h3>
                <div className={styles.offerList}>{grouped[direction.id].map((offering) => (
                  <article key={offering.id} className={styles.offer}>
                    <div><h4>{offering.copy.title}</h4><p>{offering.copy.shortDescription}</p><small>{offering.practitionerName}</small></div>
                    <div className={styles.offerActions}>
                      <Link href={`/${locale}/services/${offering.practitionerSlug}/${offering.slug}`}>{t.details}<ArrowRight aria-hidden="true" size={15}/></Link>
                      <Link href={`/${locale}/app/consultations?service=${encodeURIComponent(offering.id)}`}>{t.request}</Link>
                    </div>
                  </article>
                ))}</div>
              </div> : null
            )) : <p>{t.noOffers}</p>}
            <Link href={`/${locale}/masters`} className={styles.allMasters}>{t.seeMasters}<ArrowRight aria-hidden="true" size={16}/></Link>
          </div>
        </details>
      </section>

      <section className={styles.extra} aria-label={t.learnTitle}>
        <details>
          <summary><span><strong>{t.learnTitle}</strong><small>{t.learnLead}</small></span><span className={styles.detailsToggle}><ChevronDown aria-hidden="true" size={19}/></span></summary>
          <div className={styles.methodVideos}>
            <div><h3>{t.videoIntro}</h3><PageVideo slot="services-intro" locale={locale}/></div>
            {locale === "en" ? <>
              <div><h3>{t.videoImagery}</h3><PageVideo slot="method-hypnotherapy" locale="en"/></div>
              <div><h3>{t.videoConstellation}</h3><PageVideo slot="method-constellations" locale="en"/></div>
            </> : null}
          </div>
        </details>
      </section>

      <PersonalTestimonials locale={locale} variant="services" />

      <aside className={styles.reikiAside}>
        <div><p className={styles.eyebrow}>{locale === "ru" ? "Обучение и практики" : "Training & practices"}</p><h2>{t.reikiTitle}</h2><p>{t.reikiText}</p></div>
        <Link href={`/${locale}/academy/reiki`}>{t.reikiAction}<ArrowRight aria-hidden="true" size={18}/></Link>
      </aside>

      <PublicConsultationCta locale={locale} id="consultation" />
      <p className={styles.disclaimer}>{t.bottomDisclaimer}</p>
    </main>
  );
}
