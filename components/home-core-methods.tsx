import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-core-methods.module.css";

type MethodId = "alchemy" | "energy" | "coaching";
type MethodCopy = {
  title: string;
  formula: string;
  description: string;
  primary: string;
  secondary?: string;
  footnote: string;
};
type SectionCopy = {
  eyebrow: string;
  heading: string;
  intro: string;
  caveat: string;
  methods: Record<MethodId, MethodCopy>;
};

const methods: { id: MethodId; image: string; primaryPath: string; secondaryPath?: string }[] = [
  {
    id: "alchemy",
    image: "/images/holistic-house/hero-olive-incense.webp",
    primaryPath: "/services/alchemy-of-soul",
  },
  {
    id: "energy",
    image: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
    primaryPath: "/services/remote-energy-support",
    secondaryPath: "/academy/principles-of-energywork",
  },
  {
    id: "coaching",
    image: "/images/holistic-house/course-start-heron.webp",
    primaryPath: "/coaching",
    secondaryPath: "/services/catalog#service-listings",
  },
];

const copy: Record<PublicLocale, SectionCopy> = {
  ru: {
    eyebrow: "МОИ МЕТОДЫ",
    heading: "Три направления работы",
    intro: "Глубинное исследование, энергетические практики или работа с конкретной целью — выберите подходящий путь.",
    caveat: "Это не медицинская диагностика или лечение. Эффективность гомеопатии для лечения заболеваний не подтверждена надёжными научными данными.",
    methods: {
      alchemy: {
        title: "Алхимия души",
        formula: "Гипнотерапия · гомеопатия · расстановки",
        description: "Образная и системная работа с внутренними конфликтами, повторяющимися сценариями и важными жизненными вопросами.",
        primary: "Исследовать метод",
        footnote: "Гомеопатия используется только как дополнительный, необязательный подход.",
      },
      energy: {
        title: "Энергетическая коррекция",
        formula: "Сессия · персональный талисман",
        description: "Дистанционная энергетическая поддержка, личные практики и символический талисман по индивидуальному запросу.",
        primary: "Получить поддержку",
        secondary: "Обучиться",
        footnote: "Время и формат согласуются с мастером; талисман не заказывается автоматически.",
      },
      coaching: {
        title: "Коучинг / психотерапия",
        formula: "Самостоятельный коучинг · специалист",
        description: "Разберите свою цель по шагам, сравните коучинговые модели или найдите специалиста для личной работы.",
        primary: "ИИ-коучинг · бесплатно",
        secondary: "Подобрать специалиста",
        footnote: "Сейчас доступна бесплатная самостоятельная коуч-сессия с автоподбором модели, без ИИ-чата и живого специалиста.",
      },
    },
  },
  en: {
    eyebrow: "MY APPROACHES",
    heading: "Three ways to work together",
    intro: "Explore deeper patterns, receive energywork support or focus on a practical next step.",
    caveat: "These approaches are not medical assessment or treatment. Homeopathy has no reliable evidence of effectiveness for treating health conditions.",
    methods: {
      alchemy: {
        title: "Alchemy of the Soul",
        formula: "Hypnotherapy · homeopathy · constellations",
        description: "Guided imagery and systemic exploration of inner conflict, repeated patterns and important life questions.",
        primary: "Explore the approach",
        footnote: "Homeopathy is optional and supplementary, not a replacement for treatment.",
      },
      energy: {
        title: "Energy correction",
        formula: "Personal session · symbolic talisman",
        description: "Remote energywork support, individual practice and an optional symbolic talisman by personal arrangement.",
        primary: "Get support",
        secondary: "Learn the practice",
        footnote: "The practitioner confirms requests; talismans cannot be ordered automatically.",
      },
      coaching: {
        title: "Coaching / psychotherapy",
        formula: "Self-guided coaching · practitioner support",
        description: "Work through a goal step by step, compare coaching approaches or find a practitioner for personal sessions.",
        primary: "AI coaching · free",
        secondary: "Find a practitioner",
        footnote: "Currently this opens a free self-guided session with automated model matching, not a live AI chat or therapist.",
      },
    },
  },
  es: {
    eyebrow: "MIS MÉTODOS",
    heading: "Tres formas de trabajar juntos",
    intro: "Explora patrones profundos, recibe apoyo energético o concéntrate en tu siguiente paso.",
    caveat: "Estas prácticas no sustituyen la evaluación ni el tratamiento médico. No hay pruebas fiables de eficacia de la homeopatía para tratar enfermedades.",
    methods: {
      alchemy: {
        title: "Alquimia del alma",
        formula: "Hipnoterapia · homeopatía · constelaciones",
        description: "Trabajo con imágenes guiadas y perspectiva sistémica sobre conflictos, patrones y decisiones importantes.",
        primary: "Conocer el método",
        footnote: "La homeopatía es opcional y complementaria, no un sustituto del tratamiento.",
      },
      energy: {
        title: "Corrección energética",
        formula: "Sesión personal · talismán simbólico",
        description: "Apoyo energético a distancia, práctica individual y talismán opcional previo acuerdo.",
        primary: "Recibir apoyo",
        secondary: "Aprender",
        footnote: "El profesional confirma la solicitud; el talismán no se compra automáticamente.",
      },
      coaching: {
        title: "Coaching / psicoterapia",
        formula: "Coaching autoguiado · profesionales",
        description: "Explora tu objetivo paso a paso, compara modelos de coaching o encuentra un profesional.",
        primary: "Coaching con IA · gratis",
        secondary: "Elegir profesional",
        footnote: "Por ahora: sesión autoguiada gratuita con selección automática de modelo; no es chat con IA ni terapia en vivo.",
      },
    },
  },
};

export function HomeCoreMethods({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  return (
    <section className={styles.section} aria-labelledby="home-core-methods-title" data-home-core-methods>
      <header className={styles.heading}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="home-core-methods-title">{t.heading}</h2>
        <p>{t.intro}</p>
      </header>
      <div className={styles.grid}>
        {methods.map((method, index) => {
          const item = t.methods[method.id];
          return (
            <article key={method.id} className={styles.card} data-core-method={method.id}>
              <div className={styles.photo} aria-hidden="true">
                <Image src={method.image} alt="" fill unoptimized loading="lazy"
                  sizes="(max-width: 700px) calc(100vw - 28px), (max-width: 1000px) 50vw, 370px" />
                <span className={styles.number}>0{index + 1}</span>
              </div>
              <div className={styles.content}>
                <div className={styles.summary}>
                  <h3>{item.title}</h3>
                  <p className={styles.formula}>{item.formula}</p>
                </div>
                <div className={styles.details}>
                  <p className={styles.description}>{item.description}</p>
                <div className={styles.actions}>
                  <Link className={styles.primary} href={"/" + locale + method.primaryPath} prefetch={false}>
                    {item.primary}<ArrowUpRight size={16} aria-hidden="true" />
                  </Link>
                  {method.secondaryPath && item.secondary && (
                    <Link className={styles.secondary} href={"/" + locale + method.secondaryPath} prefetch={false}>
                      {item.secondary}<ArrowUpRight size={16} aria-hidden="true" />
                    </Link>
                  )}
                </div>
                <p className={styles.footnote}>{item.footnote}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.caveat}>{t.caveat}</p>
    </section>
  );
}
