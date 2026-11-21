import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { notFound } from "next/navigation";
import { isPublicLocale } from "@/data/academy/catalog";
import { shamanicaRecommendations } from "@/lib/shamanica-recommendations.mjs";
import { ServicesThreeVisibleOptions } from "@/components/services-three-visible-options";
import styles from "@/components/shamanica-mobile.module.css";
import priorityStyles from "@/components/shamanica-results-services.module.css";

type Props = {
  params: Promise<{locale:string}>;
  searchParams: Promise<{goal?:string;method?:string;start?:string;category?:string|string[]}>;
};
const photos = {
  remedies: "/images/holistic-house/distance-homeopathy.webp",
  artifacts: "/images/holistic-house/tao-fu-balance.webp",
  energy: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  rituals: "/images/holistic-house/mandala-gold-reference.webp",
  learning: "/academy/reiki-yggdrasil/source/temple-studies.png",
} as const;
// A single, published three-card service component is shared with Services.
// Categories set the priority; individual offers inside them can be ordered.
const offerGroups = {
  remedies: "homeopathy",
  artifacts: "shamanica-artifacts",
  energy: "reiki",
  rituals: "magical",
  learning: "shamanica-learning",
} as const;
type ShamanicPriority = keyof typeof offerGroups;
const translations = {
  ru: {
    title: "Ваш путь в Shamanic", eyebrow: "ВАША ПЕРСОНАЛЬНАЯ ПОДБОРКА",
    lead: "Два направления по вашим ответам. В каждом — три конкретные услуги с ценой и возможностью заказа.",
    again: "Изменить ответы", back: "К направлениям", categoryEyebrow: "ШАМАНИК · УСЛУГИ", categoryLead: "Выберите услугу · Детали или заказ", categoryNav: "Категории услуг", all: "Все услуги Shamanic", priority: "Приоритет",
    items: {
      remedies: ["Подбор препаратов", "Бесплатный разбор, экспресс или полная личная сессия."],
      artifacts: ["Артефакты и места силы", "Талисманы, символические предметы и личные намерения."],
      energy: ["Энергетическая поддержка", "Сеансы Рейки и варианты личной практики."],
      rituals: ["Мандалы и ритуалы", "Персональные мандалы, ритуалы и талисманы."],
      learning: ["Обучение", "Конкретные программы Рейки и посвящения."],
    },
  },
  en: {
    title: "Your Shamanic path", eyebrow: "YOUR PERSONAL SELECTION",
    lead: "Two priorities based on your answers. Each includes three real offers with prices and request options.",
    again: "Change answers", back: "All categories", categoryEyebrow: "SHAMANIC · SERVICES", categoryLead: "Choose a service · Details or Order", categoryNav: "Service categories", all: "All Shamanic services", priority: "Priority",
    items: {
      remedies: ["Remedy guidance", "Written review, express or full personal session."],
      artifacts: ["Artefacts & power places", "Talismans, symbolic objects and personal intentions."],
      energy: ["Energy support", "Reiki sessions and individual practice options."],
      rituals: ["Mandalas & rituals", "Personal mandalas, rituals and talismans."],
      learning: ["Learning", "Specific Reiki courses and initiation options."],
    },
  },
  es: {
    title: "Tu camino en Shamanic", eyebrow: "SELECCIÓN PERSONAL",
    lead: "Dos prioridades según tus respuestas. Cada una ofrece tres servicios reales con precio y solicitud.",
    again: "Cambiar respuestas", back: "Todas las categorías", categoryEyebrow: "SHAMANIC · SERVICIOS", categoryLead: "Elige un servicio · Detalles o solicitar", categoryNav: "Categorías de servicios", all: "Todos los servicios", priority: "Prioridad",
    items: {
      remedies: ["Orientación sobre remedios", "Revisión escrita, sesión exprés o completa."],
      artifacts: ["Objetos y lugares de poder", "Talismanes, objetos simbólicos e intenciones."],
      energy: ["Apoyo energético", "Sesiones de Reiki y opciones de práctica."],
      rituals: ["Mandalas y rituales", "Mandalas personales, rituales y talismanes."],
      learning: ["Aprendizaje", "Cursos de Reiki y opciones de iniciación."],
    },
  },
} as const;

export const metadata: Metadata = {
  title: "Shamanic — personal path | Holistic House",
  robots: { index:false, follow:true },
};

export default async function ShamanicResults({params,searchParams}:Props) {
  const {locale} = await params;
  if (!isPublicLocale(locale)) notFound();
  const args = await searchParams;
  const categories = Object.keys(offerGroups) as ShamanicPriority[];
  const selectedCategory = typeof args.category === "string" && Object.prototype.hasOwnProperty.call(offerGroups,args.category)
    ? args.category as ShamanicPriority : null;
  if (args.category !== undefined && !selectedCategory) notFound();
  // The quiz still selects two ranked groups; a direct category click shows
  // only that category's existing three real Services offers.
  const priorities = shamanicaRecommendations(args) as ShamanicPriority[];
  const t = translations[locale];
  const orderedCategories = selectedCategory
    ? [selectedCategory,...categories.filter(id=>id!==selectedCategory)] : categories;
  return <main lang={locale}
    className={selectedCategory ? styles.resultsPage+" "+priorityStyles.categoryPage : styles.resultsPage}
    data-shamanica-results data-shamanica-category={selectedCategory || undefined}>
    <div className={styles.resultsShell}>
      <Link href={"/"+locale+"/shamanica#shamanica-services-title"} className={styles.backLink}
        data-shamanica-category-back={selectedCategory ? "true" : undefined}>
        <ArrowLeft size={19} aria-hidden="true"/>{selectedCategory ? t.back : t.again}
      </Link>
      <span className={styles.resultsEyebrow} data-shamanica-results-eyebrow><Sparkles size={18} aria-hidden="true"/>
        {selectedCategory ? t.categoryEyebrow : t.eyebrow}
      </span>
      <h1 data-shamanica-results-title>{selectedCategory ? t.items[selectedCategory][0] : t.title}</h1>
      <p className={styles.resultsLead} data-shamanica-results-lead>
        {selectedCategory ? t.categoryLead : t.lead}
      </p>
      {selectedCategory ? <>
        <nav className={priorityStyles.categoryTabs} aria-label={t.categoryNav}
          data-shamanica-category-nav>
          {orderedCategories.map(id => <Link key={id} prefetch={false}
            href={"/"+locale+"/shamanica/results?category="+id}
            className={id === selectedCategory ? priorityStyles.categoryTabActive : undefined}
            aria-current={id === selectedCategory ? "page" : undefined}>
            {t.items[id][0]}
          </Link>)}
        </nav>
        <section className={priorityStyles.categoryOffers}
          data-shamanica-category-offers={selectedCategory}
          aria-label={t.items[selectedCategory][0]}>
          <ServicesThreeVisibleOptions locale={locale} id={offerGroups[selectedCategory]}/>
        </section>
      </> : <div className={styles.resultCards} data-shamanica-priority-groups>
        {priorities.map((id,index) => <section key={id}
          className={priorityStyles.priorityGroup} data-recommended-service={id}
          data-shamanica-priority={index+1} data-priority-offer-count="3">
          <header className={priorityStyles.priorityHeader}>
            <div className={priorityStyles.priorityImage}>
              <Image src={photos[id]} alt="" fill sizes="(max-width:560px) 74px, 90px"/>
            </div>
            <div className={priorityStyles.priorityIntro}>
              <span className={priorityStyles.priorityIndex}>{t.priority} {index+1} / 2</span>
              <h2>{t.items[id][0]}</h2>
              <p>{t.items[id][1]}</p>
            </div>
          </header>
          <ServicesThreeVisibleOptions locale={locale} id={offerGroups[id]}/>
        </section>)}
      </div>}
      <Link href={"/"+locale+"/shamanica#shamanica-services-title"} className={styles.allServices}>
        {t.all}<ArrowRight size={18} aria-hidden="true"/>
      </Link>
    </div>
  </main>;
}
