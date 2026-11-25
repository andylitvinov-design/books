import { ArrowUpRight, ClipboardCheck, FileText, Flower2 } from "lucide-react";
import { AcquisitionEventLink } from "@/components/acquisition-event-link";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-free-paths.module.css";

const copy = {
  en: {
    kicker: "START HERE · THREE FREE OPTIONS",
    title: "Choose how you'd like to begin",
    intro: "No appointment needed. Select the format that suits your question.",
    free: "Free",
    cards: [
      { title: "Personal situation review", description: "Tell me what's happening and add your Me / Goal / Problem drawing.", result: "What you receive: a personal written response, not a video call.", action: "Request written review" },
      { title: "Wu Xing resource guide", description: "Explore a symbolic Five Elements map of your energy and inner resources.", result: "What you receive: an educational guide and next-step options.", action: "Explore Wu Xing" },
      { title: "Stress & personality self-checks", description: "Answer questionnaires about stress, mood and personal strengths.", result: "What you receive: available scores and explanations.", action: "Take free tests" },
    ],
    stepsTitle: "How it works",
    steps: ["Choose a free starting point", "Complete the form or self-check", "Review your result and decide what's next"],
    about: "Guidance by Andrey Litvinov · Toronto & online",
    disclaimer: "Self-reflection tools do not provide a medical diagnosis. Paid personal consultations are optional.",
  },
  ru: {
    kicker: "НАЧНИТЕ ЗДЕСЬ · ТРИ БЕСПЛАТНЫХ ВАРИАНТА",
    title: "Выберите, с чего начать",
    intro: "Запись на консультацию не нужна. Выберите удобный формат.",
    free: "Бесплатно",
    cards: [
      { title: "Личный разбор ситуации", description: "Опишите свой вопрос и приложите рисунок «Я / Цель / Проблема».", result: "Результат: личный письменный ответ, не видеозвонок.", action: "Запросить разбор" },
      { title: "Карта ресурсов У-Син", description: "Исследуйте символическую модель пяти элементов и внутренних ресурсов.", result: "Результат: образовательная карта и возможные следующие шаги.", action: "Исследовать У-Син" },
      { title: "Тесты стресса и личности", description: "Ответьте на вопросы о стрессе, настроении и личных ресурсах.", result: "Результат: доступные баллы и пояснения.", action: "Пройти тесты" },
    ],
    stepsTitle: "Как это работает",
    steps: ["Выберите бесплатный формат", "Заполните анкету или тест", "Изучите результат и решите, что дальше"],
    about: "Андрей Литвинов · Торонто и онлайн",
    disclaimer: "Инструменты самопознания не ставят медицинский диагноз. Платные консультации — по желанию.",
  },
  es: {
    kicker: "EMPIEZA AQUÍ · TRES OPCIONES GRATUITAS",
    title: "Elige cómo quieres empezar",
    intro: "Sin necesidad de reservar una consulta. Elige el formato adecuado.",
    free: "Gratis",
    cards: [
      { title: "Revisión personal de tu situación", description: "Describe tu pregunta y añade un dibujo YO / META / PROBLEMA.", result: "Recibirás: una respuesta personal por escrito, no una videollamada.", action: "Solicitar revisión" },
      { title: "Guía de recursos Wu Xing", description: "Explora el mapa simbólico de los cinco elementos y tus recursos internos.", result: "Recibirás: una guía educativa y opciones para continuar.", action: "Explorar Wu Xing" },
      { title: "Pruebas de estrés y personalidad", description: "Responde preguntas sobre estrés, ánimo y fortalezas personales.", result: "Recibirás: resultados y explicaciones disponibles; algunas pruebas siguen en EN/RU.", action: "Hacer pruebas" },
    ],
    stepsTitle: "Cómo funciona",
    steps: ["Elige una opción gratuita", "Completa el formulario o prueba", "Consulta el resultado y decide el siguiente paso"],
    about: "Andrey Litvinov · Toronto y en línea",
    disclaimer: "Estas herramientas no ofrecen diagnósticos médicos. Las consultas personales de pago son opcionales.",
  },
} as const;

const icons = [FileText, Flower2, ClipboardCheck] as const;
const events = ["service_request_start", "service_view", "self_check_start"] as const;

export function HomeFreePaths({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const targets = [
    `/${locale}/services/free-situation-review`,
    `/${locale}/wu-xing`,
    `/${locale}/client/tests`,
  ] as const;

  return (
    <section id="free-start" className={styles.section} aria-labelledby="free-start-title" data-home-free-paths>
      <div className={styles.heading}>
        <p className={styles.kicker}>{t.kicker}</p>
        <h2 id="free-start-title">{t.title}</h2>
        <p>{t.intro}</p>
      </div>
      <div className={styles.cards}>
        {t.cards.map((card, i) => {
          const Icon = icons[i];
          return (
            <article className={styles.card} key={card.title}>
              <div className={styles.top}><span className={styles.icon}><Icon size={22} aria-hidden="true" /></span><span className={styles.free}>{t.free}</span></div>
              <h3>{card.title}</h3>
              <p>{card.description}</p>
              <p className={styles.result}>{card.result}</p>
              <AcquisitionEventLink className={styles.action} href={targets[i]} event={events[i]} prefetch={false}>
                {card.action}<ArrowUpRight size={18} aria-hidden="true" />
              </AcquisitionEventLink>
            </article>
          );
        })}
      </div>
      <div className={styles.steps} aria-label={t.stepsTitle}>
        <strong>{t.stepsTitle}</strong>
        <ol>{t.steps.map(step => <li key={step}>{step}</li>)}</ol>
        <p>{t.about}</p>
      </div>
      <p className={styles.disclaimer}>{t.disclaimer}</p>
    </section>
  );
}
