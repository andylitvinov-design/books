"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, BookOpen, Heart, Leaf, Sparkles, Zap } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { telegramServiceRequestUrl } from "@/lib/assist/telegram-business-request.mjs";
import styles from "./assist-top-recommendations.module.css";

type Direction = "forMe" | "health" | "relationships" | "energy" | "learning" | "spiritual";
type Focus = "stress" | "relationships" | "energy" | "health" | "work" | "growth" | "general" | null;
type Entry = "homeopathy" | "coaching" | "reiki" | "tests" | "review" | "constellations" | "mandala" | "opora" | "academy" | "mysteries" | "talisman" | "business";
const directions: Direction[] = ["forMe", "health", "relationships", "energy", "learning", "spiritual"];

const entries: Record<Entry, { path: string; image: string; direction: Exclude<Direction,"forMe">; kind: "session" | "explore" }> = {
  homeopathy: { path: "services/psychohomeopathy", image: "/images/holistic-house/hero-olive-incense.webp", direction: "health", kind: "session" },
  coaching: { path: "services/imagery-therapy", image: "/images/holistic-house/andy-about.png", direction: "relationships", kind: "session" },
  reiki: { path: "services/remote-energy-support", image: "/images/holistic-house/reiki-approved-sunrise-v3.webp", direction: "energy", kind: "session" },
  tests: { path: "tests", image: "/images/holistic-house/course-start-heron.webp", direction: "health", kind: "explore" },
  review: { path: "services/free-situation-review", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp", direction: "health", kind: "explore" },
  constellations: { path: "services/systemic-constellations", image: "/images/holistic-house/video-posters/constellations-en-v1.webp", direction: "relationships", kind: "session" },
  mandala: { path: "holistic-support/mandala", image: "/academy/reiki-yggdrasil/source/eastern-tradition.png", direction: "spiritual", kind: "explore" },
  opora: { path: "courses/antistress", image: "/images/holistic-house/course-focus-mountain-boy.webp", direction: "learning", kind: "explore" },
  academy: { path: "academy/reiki", image: "/academy/reiki-yggdrasil/source/basic-program.jpg", direction: "learning", kind: "explore" },
  mysteries: { path: "academy/mysteries", image: "/library/maya-mysteries/media/post-244-1.jpg", direction: "spiritual", kind: "explore" },
  talisman: { path: "holistic-support/mobile", image: "/academy/reiki-yggdrasil/source/advanced-runes.png", direction: "spiritual", kind: "explore" },
  business: { path: "services/business-consulting", image: "/images/holistic-house/andy-about.png", direction: "relationships", kind: "session" },
};
const shelves: Record<Direction, readonly [Entry,Entry,Entry]> = {
  forMe: ["homeopathy","coaching","reiki"],
  health: ["tests","review","homeopathy"],
  relationships: ["coaching","constellations","review"],
  energy: ["reiki","mandala","academy"],
  learning: ["opora","academy","mysteries"],
  spiritual: ["mysteries","mandala","talisman"],
};
// On "For me" a submitted topic changes the editorial selection, without sending
// the visitor's text to a server or suggesting a clinical/AI diagnosis.
const byFocus: Record<Exclude<Focus,null>, readonly [Entry,Entry,Entry]> = {
  stress: ["tests","opora","coaching"],
  relationships: ["coaching","review","mandala"],
  energy: ["reiki","opora","review"],
  health: ["tests","review","coaching"],
  work: ["business","review","opora"],
  growth: ["academy","mandala","coaching"],
  general: ["homeopathy","coaching","reiki"],
};
const tabsIcons = { forMe: Sparkles, health: Leaf, relationships: Heart, energy: Zap, learning: BookOpen, spiritual: Sparkles };

const copy = {
  ru: {
    title: "Рекомендуемые услуги для вас", start: "Выберите проблему выше или опишите ваш запрос — рекомендации изменятся.", matched: "Подборка учитывает ваш запрос. Можно выбрать другое направление.",
    tabs: { forMe: "Для меня", health: "Здоровье", relationships: "Отношения", energy: "Энергия", learning: "Обучение", spiritual: "Духовный путь" },
    themes: "Направления рекомендаций", details: "Подробнее", request: "Заказать", explore: "Открыть", more: "Все сервисы Assist",
    note: "«Заказать» откроет чат @holistichouse с готовым текстом. Нажмите «Отправить» в Telegram: это не подтверждённая запись или оплата. Символические методы не заменяют медицинскую помощь.",
    cards: {
      homeopathy: ["Психогомеопатия","Авторский подход к исследованию состояния и переживаний.","Гомеопатия не имеет надёжных доказательств эффективности для лечения заболеваний. Перед выбором средства необходима консультация специалиста."],
      coaching: ["Коучинг / Терапия","Прояснить ситуацию и найти внутреннюю опору.","Личная работа с переживаниями и образами. Формат и условия встречи согласуются индивидуально."],
      reiki: ["Сеанс Рейки","Символическая практика для отдыха и саморефлексии.","Посмотрите опубликованных мастеров, цены и варианты времени; заявка не означает подтверждённую запись."],
      tests: ["Тесты самочувствия","Начните с бесплатной самопроверки.","Тесты помогают наблюдать за своим состоянием, но не устанавливают диагноз."],
      review: ["Разбор ситуации","Бесплатный письменный ответ на ваш вопрос.","Короткая анкета и личная письменная обратная связь, не видеоконсультация."],
      constellations: ["Расстановки","Исследуйте отношения и семейные сценарии.","Символическое исследование перспектив, без установления фактов о других людях."],
      mandala: ["Личная мандала","Образы и символы для саморефлексии.","Выберите символическую практику и исследуйте своё отношение к ситуации."],
      opora: ["Курс ОПОРА","Небольшие ежедневные практики при стрессе.","14 дней упражнений с возможностью выбирать комфортный ритм."],
      academy: ["Рейки Академия","Курсы Рейки и энергетических систем.","Материалы для изучения традиций и самостоятельных практик."],
      mysteries: ["Древние мистерии","Мифы, традиции и архетипические курсы.","Учебные материалы о духовных традициях и символических практиках."],
      talisman: ["Талисманы","Исследуйте символы и личные смыслы.","Символический каталог Holistic Support, без обещания магического результата."],
      business: ["Бизнес-коучинг","Проясните рабочие цели и решения.","Личная консультация о задачах, ролях и выборе следующего шага."],
    },
  },
  en: {
    title: "Recommended services for you", start: "Choose an issue above or describe your situation to refine these suggestions.", matched: "Suggestions based on your request. You can explore other directions.",
    tabs: { forMe: "For me", health: "Health", relationships: "Relationships", energy: "Energy", learning: "Learning", spiritual: "Spiritual path" },
    themes: "Recommendation topics", details: "Details", request: "Request", explore: "Explore", more: "All Assist services",
    note: "Request opens @holistichouse with a prepared message. Press Send in Telegram; this is not a confirmed booking or payment. Symbolic approaches do not replace medical care.",
    cards: {
      homeopathy: ["Psycho-homeopathy","Explore an author's approach to feelings and wellbeing.","Homeopathy lacks reliable evidence for treating health conditions. Consult a qualified professional before considering a remedy."],
      coaching: ["Coaching / Therapy","Clarify your situation and explore inner support.","Personal exploration of experiences and imagery. Session details are agreed individually."],
      reiki: ["Reiki session","An optional symbolic practice for rest and reflection.","Browse published practitioners, prices and preferred times; a request is not a confirmed appointment."],
      tests: ["Wellbeing check-ins","Start with a free self-check.","Self-checks can help track experiences but cannot diagnose conditions."],
      review: ["Situation review","Free written reflection on your question.","A short form followed by personal written feedback, not a video call."],
      constellations: ["Constellations","Explore relationships and family patterns.","Symbolic mapping of perspectives, not proof about other people."],
      mandala: ["Personal mandala","Images and symbols for reflection.","Explore your relationship with a situation through visual symbolism."],
      opora: ["OPORA course","Gentle daily exercises for stress.","A 14-day learning program with a self-paced format."],
      academy: ["Reiki Academy","Courses in Reiki and energy traditions.","Learning materials on traditions and self-directed practices."],
      mysteries: ["Ancient mysteries","Explore myths, traditions and archetypes.","Study materials on spiritual traditions and symbolic practice."],
      talisman: ["Talismans","Explore personal meanings and symbols.","A symbolic catalogue, without promises of magical outcomes."],
      business: ["Business coaching","Clarify work goals and decisions.","A personal discussion about challenges, roles and next steps."],
    },
  },
  es: {
    title: "Servicios recomendados para ti", start: "Elige un problema arriba o describe tu situación para adaptar las sugerencias.", matched: "Sugerencias basadas en tu consulta. Puedes explorar otras opciones.",
    tabs: { forMe: "Para mí", health: "Salud", relationships: "Relaciones", energy: "Energía", learning: "Aprendizaje", spiritual: "Camino espiritual" },
    themes: "Temas de recomendaciones", details: "Detalles", request: "Solicitar", explore: "Explorar", more: "Todos los servicios Assist",
    note: "Solicitar abre @holistichouse con un mensaje preparado. Pulsa Enviar en Telegram; no es una reserva ni un pago confirmado. Los métodos simbólicos no sustituyen la atención médica.",
    cards: {
      homeopathy: ["Psico-homeopatía","Conoce un enfoque de autor sobre experiencias y bienestar.","La homeopatía carece de pruebas fiables para tratar enfermedades. Consulta a un profesional antes de elegir un remedio."],
      coaching: ["Coaching / Terapia","Aclara tu situación y encuentra apoyo interior.","Exploración individual de experiencias e imágenes. Las condiciones se acuerdan antes de reservar."],
      reiki: ["Sesión de Reiki","Práctica simbólica opcional para el descanso y la reflexión.","Explora profesionales publicados, precios y horarios preferidos; solicitar no confirma una cita."],
      tests: ["Autoevaluaciones","Empieza con una prueba gratuita.","Las pruebas no son diagnósticos médicos."],
      review: ["Revisión personal","Reflexión escrita gratuita sobre tu situación.","Un formulario breve y respuesta escrita individual, no una videollamada."],
      constellations: ["Constelaciones","Explora relaciones y patrones familiares.","Representación simbólica de perspectivas, no pruebas sobre otras personas."],
      mandala: ["Mandala personal","Imágenes y símbolos para reflexionar.","Explora tu situación a través de simbolismo visual."],
      opora: ["Curso OPORA","Ejercicios diarios suaves para el estrés.","Programa de 14 días con un ritmo flexible."],
      academy: ["Academia Reiki","Cursos de Reiki y tradiciones energéticas.","Materiales de estudio y prácticas personales."],
      mysteries: ["Misterios antiguos","Mitos, tradiciones y arquetipos.","Material educativo sobre tradiciones espirituales."],
      talisman: ["Talismanes","Símbolos y significados personales.","Un catálogo simbólico, sin promesas de resultados mágicos."],
      business: ["Coaching de negocios","Aclara objetivos y decisiones laborales.","Sesión sobre problemas prácticos, roles y próximos pasos."],
    },
  },
} as const;

export function AssistTopRecommendations({ locale, focus }: { locale: PublicLocale; focus: Focus }) {
  const t = copy[locale];
  const [manuallySelected, setManuallySelected] = useState<Direction | null>(null);
  const active: Direction = manuallySelected ?? "forMe";
  const ids = active === "forMe" && focus ? byFocus[focus] : shelves[active];
  return (
    <section className={styles.root} data-assist-best-three aria-labelledby="assist-best-three-title">
      <header className={styles.header}>
        <h2 id="assist-best-three-title">{t.title}</h2>
        <p>{focus ? t.matched : t.start}</p>
      </header>
      <div className={styles.tabs} role="group" aria-label={t.themes}>
        {directions.map((direction) => {
          const Icon = tabsIcons[direction];
          return <button key={direction} type="button" className={styles.tab} aria-pressed={active===direction}
            onClick={()=>setManuallySelected(direction)} data-assist-direction={direction}>
            <Icon size={19} strokeWidth={1.8} aria-hidden="true" /><span>{t.tabs[direction]}</span>
          </button>;
        })}
      </div>
      <div className={styles.list} data-assist-selected-direction={active}>
        {ids.map((id) => {
          const item = entries[id];
          const [name, short, extra] = t.cards[id];
          return <article key={id} className={styles.card} data-assist-best-card={id}>
            <div className={styles.thumbnail}>
              <Image src={item.image} alt="" fill unoptimized sizes="(max-width: 350px) 100px, (max-width: 760px) 145px, 180px" />
              <span className={styles.stamp} aria-hidden="true">✦</span>
            </div>
            <div className={styles.content}>
              <span className={styles.tag}>{t.tabs[item.direction]}</span>
              <h3>{name}</h3>
              <p>{short}</p>
              <div className={styles.actions}>
                <details className={styles.details}>
                  <summary>{t.details}</summary>
                  <p>{extra}</p>
                </details>
                {item.kind==="session"
                  ? <a className={styles.cta} href={telegramServiceRequestUrl(id,locale) || "#"}
                      target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer"
                      aria-label={t.request + ": " + name + " — Telegram"}
                      data-assist-best-action={id}>{t.request}<ArrowRight size={17} aria-hidden="true"/></a>
                  : <Link className={styles.cta} href={"/" + locale + "/" + item.path} prefetch={false}
                      data-assist-best-action={id}>{t.explore}<ArrowRight size={17} aria-hidden="true"/></Link>}
              </div>
            </div>
          </article>;
        })}
      </div>
      <Link className={styles.all} href={"/"+locale+"/services/catalog#service-listings"} prefetch={false}>
        <BookOpen size={21} aria-hidden="true" />{t.more}<ArrowRight size={20} aria-hidden="true" />
      </Link>
      <p className={styles.note}>{t.note}</p>
    </section>
  );
}
