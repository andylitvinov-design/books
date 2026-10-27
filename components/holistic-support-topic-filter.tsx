"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { ArrowRight, BriefcaseBusiness, Heart, HeartPulse } from "lucide-react";

import type { PublicLocale } from "@/lib/public-locales";
import styles from "./holistic-support-topic-filter.module.css";

type Topic = "business" | "love" | "health";
type Offer = "meditation" | "talisman" | "expert";

const topicOrder = [
  { id: "business", Icon: BriefcaseBusiness },
  { id: "love", Icon: Heart },
  { id: "health", Icon: HeartPulse },
] as const;

const offerOrder: { id: Offer; image: string }[] = [
  { id: "meditation", image: "/images/holistic-house/reiki-practitioner-sunrise.webp" },
  { id: "talisman", image: "/academy/reiki-yggdrasil/source/advanced-runes.png" },
  { id: "expert", image: "/images/holistic-house/reiki-approved-sunrise-v3.webp" },
];

const copy = {
  en: {
    eyebrow: "SUPPORT BY THEME",
    title: "What matters to you today?",
    lead: "Choose a theme to explore existing meditation recordings, symbolic talisman studies and personal energy support.",
    select: "Choose a theme",
    actions: { meditation: "Watch & listen", talisman: "Order a talisman", expert: "Book energy support" },
    archiveNote: "Your uploaded talismans stay private; historical Academy learning materials remain available separately.",
    topics: {
      business: {
        label: "Business", hint: "Work, direction and decisions",
        cards: {
          meditation: { title: "Meditations for focus", body: "Take a reflective pause with the original Sun meditation before a demanding work decision. The recording is not a business-specific course." },
          talisman: { title: "Symbols for intentions", body: "Explore the preserved Artifacts & Talismans tradition as a way to reflect on your goals, not a promise of business results." },
          expert: { title: "Energy support for work", body: "Request a personal complementary session around work pressure or intention. The practitioner confirms the format and availability." },
        },
      },
      love: {
        label: "Love", hint: "Connection, relationships and self-care",
        cards: {
          meditation: { title: "Meditations for connection", body: "Use the existing Sun practice to pause and reconnect with yourself before an important conversation." },
          talisman: { title: "Symbols for love", body: "Learn about personally meaningful symbols and talisman traditions. No symbol can guarantee another person's feelings." },
          expert: { title: "Support for relationships", body: "Request an individual energy support session focused on your own intention and emotional balance, not on changing someone else." },
        },
      },
      health: {
        label: "Health", hint: "Rest, calm and everyday wellbeing",
        cards: {
          meditation: { title: "Meditations for calm", body: "Open the existing guided videos and gentle instrumental audio for a quiet pause. They are not medical treatment." },
          talisman: { title: "Symbols for resilience", body: "Explore talismans as personal reminders of care and intention, not as tools to prevent or cure illness." },
          expert: { title: "Complementary wellbeing support", body: "Ask a practitioner about a personal energy session. This does not diagnose, treat or replace healthcare." },
        },
      },
    },
  },
  ru: {
    eyebrow: "ПОДДЕРЖКА ПО ТЕМАМ",
    title: "Какая тема вам сейчас важна?",
    lead: "Выберите направление: подходящие медитативные практики из существующего архива, символика талисманов и личная энергетическая поддержка.",
    select: "Выберите тему",
    actions: { meditation: "Смотреть и слушать", talisman: "Заказать талисман", expert: "Заказать энергоподдержку" },
    archiveNote: "Ваши загруженные талисманы остаются приватными; исторические материалы Академии доступны отдельно.",
    topics: {
      business: {
        label: "Бизнес", hint: "Работа, цели и решения",
        cards: {
          meditation: { title: "Медитации для сосредоточенности", body: "Сделайте паузу с существующей медитацией «Полёт к солнцу» перед важным решением. Это не отдельный бизнес-курс." },
          talisman: { title: "Символы намерения", body: "Изучите традиции артефактов и талисманов как способ осмыслить цели, без обещаний делового успеха." },
          expert: { title: "Поддержка для рабочих целей", body: "Запросите индивидуальную энергетическую практику, если беспокоят напряжение или рабочие задачи. Формат и время подтверждает мастер." },
        },
      },
      love: {
        label: "Любовь", hint: "Близость, отношения и забота о себе",
        cards: {
          meditation: { title: "Медитации для внутреннего контакта", body: "Откройте существующие практики Солнца, чтобы вернуться к себе перед важным разговором." },
          talisman: { title: "Символы любви", body: "Познакомьтесь с символическими традициями талисманов для личного смысла — они не могут гарантировать чувства другого человека." },
          expert: { title: "Поддержка в теме отношений", body: "Запросите личную энергетическую сессию для работы со своим состоянием и намерением, а не влияния на другого человека." },
        },
      },
      health: {
        label: "Здоровье", hint: "Спокойствие, отдых и самочувствие",
        cards: {
          meditation: { title: "Медитации для отдыха", body: "Откройте существующие видео- и аудиопрактики для спокойной паузы. Это не медицинское лечение." },
          talisman: { title: "Символы внутренней опоры", body: "Изучите талисманы как личные напоминания о заботе о себе, без обещаний предотвращения или лечения болезней." },
          expert: { title: "Поддержка для самочувствия", body: "Запросите дополнительную энергетическую практику у специалиста. Она не заменяет диагностику и медицинскую помощь." },
        },
      },
    },
  },
  es: {
    eyebrow: "APOYO POR TEMA",
    title: "¿Qué es importante para ti hoy?",
    lead: "Elige un tema y descubre meditaciones existentes, estudios simbólicos sobre talismanes y apoyo energético personal.",
    select: "Elige un tema",
    actions: { meditation: "Ver y escuchar", talisman: "Encargar un talismán", expert: "Solicitar apoyo energético" },
    archiveNote: "Los talismanes que subas son privados; el material histórico de la Academia permanece disponible por separado.",
    topics: {
      business: {
        label: "Negocios", hint: "Trabajo, objetivos y decisiones",
        cards: {
          meditation: { title: "Meditaciones para concentrarse", body: "Haz una pausa con la meditación original del Sol antes de decidir. No se presenta como un curso de negocios." },
          talisman: { title: "Símbolos de intención", body: "Conoce la tradición de artefactos y talismanes como reflexión sobre tus objetivos, sin promesas de éxito." },
          expert: { title: "Apoyo para el trabajo", body: "Solicita una sesión energética complementaria sobre tensión y objetivos laborales. El profesional confirma la modalidad y disponibilidad." },
        },
      },
      love: {
        label: "Amor", hint: "Vínculos, relaciones y autocuidado",
        cards: {
          meditation: { title: "Meditaciones para conectar", body: "Utiliza la práctica original del Sol para volver a ti antes de una conversación importante." },
          talisman: { title: "Símbolos de amor", body: "Explora símbolos personales y tradiciones de talismanes: no garantizan los sentimientos de otra persona." },
          expert: { title: "Apoyo en las relaciones", body: "Solicita una sesión individual centrada en tu propio bienestar e intención, sin intentar cambiar a otra persona." },
        },
      },
      health: {
        label: "Salud", hint: "Descanso, calma y bienestar diario",
        cards: {
          meditation: { title: "Meditaciones para descansar", body: "Abre los vídeos y el audio instrumental existentes para hacer una pausa tranquila. No son tratamientos médicos." },
          talisman: { title: "Símbolos de fortaleza", body: "Conoce los talismanes como recordatorios personales de autocuidado, no como objetos para prevenir o curar enfermedades." },
          expert: { title: "Apoyo complementario", body: "Consulta con un profesional sobre una sesión energética. No diagnostica, trata ni sustituye la atención médica." },
        },
      },
    },
  },
} as const;

export function HolisticSupportTopicFilter({ locale }: { locale: PublicLocale }) {
  const [activeTopic, setActiveTopic] = useState<Topic>("business");
  const t = copy[locale];
  const selected = t.topics[activeTopic];

  return (
    <section className={styles.root} id="holistic-support-topics" data-holistic-topic-filter aria-labelledby="holistic-topic-heading">
      <div className={styles.heading}>
        <p className={styles.eyebrow}>{t.eyebrow}</p>
        <h2 id="holistic-topic-heading">{t.title}</h2>
        <p className={styles.lead}>{t.lead}</p>
      </div>
      <div className={styles.tabs} role="tablist" aria-label={t.select}>
        {topicOrder.map(({ id, Icon }) => (
          <button key={id} type="button" role="tab"
            id={"holistic-topic-tab-" + id}
            aria-controls="holistic-topic-panel"
            aria-selected={activeTopic === id}
            aria-label={t.topics[id].label}
            tabIndex={activeTopic === id ? 0 : -1}
            data-holistic-topic={id}
            className={styles.tab}
            onKeyDown={(event) => {
              const index = topicOrder.findIndex(item => item.id === id);
              const next = event.key === "ArrowRight" ? (index + 1) % topicOrder.length
                : event.key === "ArrowLeft" ? (index + topicOrder.length - 1) % topicOrder.length
                : event.key === "Home" ? 0 : event.key === "End" ? topicOrder.length - 1 : -1;
              if (next < 0) return;
              event.preventDefault();
              const nextId = topicOrder[next].id;
              setActiveTopic(nextId);
              document.getElementById("holistic-topic-tab-" + nextId)?.focus();
            }}
            onClick={() => setActiveTopic(id)}>
            <Icon size={18} strokeWidth={1.7} aria-hidden="true" />
            <span>{t.topics[id].label}</span>
          </button>
        ))}
      </div>
      <div className={styles.panel} id="holistic-topic-panel"
        role="tabpanel" aria-labelledby={"holistic-topic-tab-" + activeTopic}
        tabIndex={0} data-holistic-topic-selected={activeTopic}>
        <p className={styles.topicHint}>{selected.hint}</p>
        <div className={styles.cards}>
          {offerOrder.map(({ id, image }) => (
            <article key={id} className={styles.card} data-holistic-topic-card={id}>
              <div className={styles.photo}>
                <Image src={image} alt="" fill sizes="(max-width:720px) 112px, 360px" />
              </div>
              <div className={styles.cardBody}>
                <h3>{id === "meditation" ? selected.cards[id].title : (
                  <Link href={"/" + locale + (id === "talisman" ? "/talismans" : "/support-options?topic=" + activeTopic)}
                    className={styles.titleButton} prefetch={false}>{selected.cards[id].title}</Link>
                )}</h3>
                <p>{selected.cards[id].body}</p>
                <Link href={id === "meditation" ? "#meditation-practices" : "/" + locale +
                  (id === "talisman" ? "/talismans" : "/support-options?topic=" + activeTopic)}
                  prefetch={false} className={styles.action} data-holistic-order-trigger={id}>
                  {t.actions[id]}<ArrowRight size={17} aria-hidden="true" />
                </Link>
              </div>
            </article>
          ))}
        </div>
        <p className={styles.archiveNote} role="note">{t.archiveNote}</p>
      </div>
    </section>
  );
}
