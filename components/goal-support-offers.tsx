"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import cardStyles from "./home-featured-workspace.module.css";
import styles from "./goal-support-offers.module.css";

type Direction = "energy" | "love" | "business";
type Localized = Record<PublicLocale, string>;
type Offer = {
  id: string;
  image: string;
  path: string;
  free: boolean;
  title: Localized;
  description: Localized;
  details: Localized;
  action: Localized;
  compactAction: Localized;
};

const localize = (en: string, ru: string, es: string): Localized => ({ en, ru, es });

// Existing public journeys only; these cards do not book, charge, or create a CRM lead.
const offers: Record<Direction, readonly [Offer, Offer, Offer]> = {
  energy: [
    {
      id: "opora", image: "/images/holistic-house/course-start-heron.webp",
      path: "/courses/antistress", free: true,
      title: localize("OPORA · guided stress support", "ОПОРА · мягкая поддержка при стрессе", "OPORA · apoyo para el estrés"),
      description: localize("Practise grounding and self-support with short daily exercises.", "Осваивайте устойчивость и самоподдержку через короткие ежедневные упражнения.", "Practica la estabilidad y el autocuidado con ejercicios diarios breves."),
      details: localize("A self-guided 14-day programme. Choose your own pace; it is not medical treatment or a promise of symptom relief.", "Самостоятельная 14-дневная программа. Занимайтесь в своём темпе; это не лечение и не гарантия улучшения.", "Programa autoguiado de 14 días. Avanza a tu ritmo; no es un tratamiento médico ni garantiza resultados."),
      action: localize("Start free OPORA course", "Начать курс ОПОРА бесплатно", "Empezar OPORA gratis"),
      compactAction: localize("Start free", "Начать", "Empezar"),
    },
    {
      id: "reiki", image: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
      path: "/academy/principles-of-energywork/learn", free: true,
      title: localize("Free Reiki Practitioner course", "Бесплатный курс «Практик Рейки»", "Curso gratuito de Reiki"),
      description: localize("Five introductory lessons, practice and personal reflection.", "Пять вводных уроков, практика и личная рефлексия.", "Cinco lecciones introductorias, práctica y reflexión personal."),
      details: localize("Explore the Reiki systems before deciding what to study next. A separate initiation or further training requires its own arrangements; this course does not award a professional qualification.", "Познакомьтесь с системами Рейки и решите, продолжать ли обучение. Посвящение и дальнейшая подготовка согласуются отдельно; вводный курс не даёт профессиональную квалификацию.", "Conoce los sistemas Reiki y decide si quieres continuar. La iniciación y la formación adicional se acuerdan aparte; el curso no otorga un título profesional."),
      action: localize("Start free Reiki course", "Начать курс Рейки бесплатно", "Empezar Reiki gratis"),
      compactAction: localize("Start free", "Начать", "Empezar"),
    },
    {
      id: "remote-energy", image: "/images/holistic-house/andy-about.png",
      path: "/services/remote-energy-support", free: false,
      title: localize("Personal energy support", "Личная энергетическая поддержка", "Apoyo energético personal"),
      description: localize("Explore remote energywork and request a suitable format with a practitioner.", "Выберите формат дистанционной энергопрактики и отправьте запрос мастеру.", "Explora una práctica energética a distancia y solicita el formato adecuado."),
      details: localize("This is a complementary wellbeing practice, not a medical treatment. The practitioner confirms the format, time and any fee; requesting does not create a booking or payment.", "Это дополнительная практика благополучия, а не медицинское лечение. Мастер отдельно подтверждает формат, время и стоимость; заявка не является записью или оплатой.", "Es una práctica complementaria, no un tratamiento médico. El profesional confirma formato, horario y tarifa; la solicitud no reserva ni cobra."),
      action: localize("Request energy support", "Запросить поддержку", "Solicitar apoyo energético"),
      compactAction: localize("Request", "Запросить", "Solicitar"),
    },
  ],
  love: [
    {
      id: "love-review", image: "/images/holistic-house/hero-olive-incense.webp",
      path: "/services/free-situation-review", free: true,
      title: localize("Free relationship situation review", "Бесплатный разбор отношений", "Revisión gratuita de relaciones"),
      description: localize("Describe one question about closeness, trust or a recurring situation.", "Опишите один вопрос о близости, доверии или повторяющейся ситуации.", "Describe una pregunta sobre confianza, cercanía o un patrón repetido."),
      details: localize("You can include a simple drawing and request a personal written reflection. This is not a live session, instant reply or confirmed appointment.", "Можно приложить простой рисунок и запросить личный письменный ответ. Это не живая сессия, мгновенный ответ или подтверждённая запись.", "Puedes adjuntar un dibujo sencillo y solicitar una respuesta personal por escrito. No es una sesión en vivo ni una cita confirmada."),
      action: localize("Request free written review", "Получить бесплатный разбор", "Solicitar revisión gratuita"),
      compactAction: localize("Free review", "Разбор", "Revisión"),
    },
    {
      id: "family-constellations", image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      path: "/services/systemic-constellations", free: false,
      title: localize("Systemic & family constellations", "Системные и семейные расстановки", "Constelaciones sistémicas y familiares"),
      description: localize("Explore roles, family patterns and repeated relationship situations.", "Исследуйте роли, семейные сценарии и повторения в отношениях.", "Explora roles, patrones familiares y situaciones que se repiten."),
      details: localize("Read about the method, then request an individual session if it fits your question. Timing, fee and format are confirmed personally; no result is guaranteed.", "Узнайте о методе и при желании запросите индивидуальную сессию. Формат, стоимость и время согласуются отдельно; результат не гарантируется.", "Conoce el método y solicita una sesión si encaja contigo. El formato, precio y horario se confirman por separado; no hay resultados garantizados."),
      action: localize("Request a constellation session", "Запросить расстановку", "Solicitar una constelación"),
      compactAction: localize("Request", "Запросить", "Solicitar"),
    },
    {
      id: "love-imagery", image: "/images/holistic-house/video-posters/hypnotherapy-en-v1.webp",
      path: "/services/imagery-therapy", free: false,
      title: localize("Guided imagery for relationships", "Образная работа с отношениями", "Imágenes guiadas para relaciones"),
      description: localize("Reflect gently on feelings, boundaries and choices using imagery.", "Мягко исследуйте чувства, границы и выбор через образы.", "Explora sentimientos, límites y decisiones con imágenes guiadas."),
      details: localize("An individual guided-imagery format for exploring your question. The consultation is arranged with the practitioner; the button does not reserve or charge.", "Индивидуальная работа с образами по вашему запросу. Встреча согласуется с практиком отдельно; кнопка не бронирует и не списывает деньги.", "Un formato individual para explorar tu pregunta. La consulta se coordina con el profesional; el botón no reserva ni cobra."),
      action: localize("Explore imagery sessions", "Подробнее об образной работе", "Explorar sesiones con imágenes"),
      compactAction: localize("Explore", "Открыть", "Explorar"),
    },
  ],
  business: [
    {
      id: "business-review", image: "/images/holistic-house/books-library.webp",
      path: "/services/free-situation-review?topic=business", free: true,
      title: localize("Free express business review", "Бесплатный экспресс-разбор бизнеса", "Revisión empresarial gratuita"),
      description: localize("Share a business decision or challenge for a personal written review.", "Опишите бизнес-решение или трудность для личного письменного разбора.", "Comparte una decisión o dificultad empresarial para una revisión escrita."),
      details: localize("Start with one question and an optional sketch. Andrey reviews your request before replying in writing; no appointment or immediate response is implied.", "Начните с одного вопроса и при желании рисунка. Андрей рассматривает запрос перед письменным ответом; это не бронь и не мгновенный результат.", "Empieza con una pregunta y, si quieres, un dibujo. Andrey revisa la solicitud antes de responder por escrito; no es una cita ni una respuesta inmediata."),
      action: localize("Request free business review", "Запросить бесплатный разбор", "Solicitar revisión gratis"),
      compactAction: localize("Free review", "Разбор", "Revisión"),
    },
    {
      id: "business-constellations", image: "/images/holistic-house/video-posters/constellations-en-v1.webp",
      path: "/services/business-consulting#business-offers", free: false,
      title: localize("Business constellation", "Бизнес-расстановка", "Constelación empresarial"),
      description: localize("Explore roles, team dynamics and patterns behind business decisions.", "Исследуйте роли, динамику команды и сценарии бизнес-решений.", "Explora roles, dinámicas de equipo y patrones en decisiones empresariales."),
      details: localize("Review the available business methods and discuss whether systemic mapping is appropriate for your question. Session type and price require personal confirmation.", "Изучите бизнес-методы и обсудите, подходит ли системный разбор вашему запросу. Формат и стоимость подтверждаются отдельно.", "Revisa los métodos disponibles y consulta si un análisis sistémico encaja con tu pregunta. El formato y precio se confirman personalmente."),
      action: localize("Explore business constellations", "Изучить бизнес-расстановки", "Explorar constelaciones"),
      compactAction: localize("Explore", "Открыть", "Explorar"),
    },
    {
      id: "business-coaching", image: "/images/holistic-house/andy-about.png",
      path: "/services/business-consulting#business-offers", free: false,
      title: localize("Business strategy coaching", "Стратегический бизнес-коучинг", "Coaching de estrategia empresarial"),
      description: localize("Clarify priorities, decisions and next steps with Andrey.", "Проясните приоритеты, решения и следующие шаги с Андреем.", "Aclara prioridades, decisiones y próximos pasos con Andrey."),
      details: localize("Personal business consultations are offered at €50 for 30 minutes and €100 for 60 minutes. Submitting a request is not a booking; time and payment need confirmation.", "Личные бизнес-консультации: €50 за 30 минут и €100 за 60 минут. Отправка запроса не равна записи; время и оплата подтверждаются отдельно.", "Las consultas personales cuestan €50 por 30 minutos y €100 por 60 minutos. Una solicitud no es una reserva; horario y pago deben confirmarse."),
      action: localize("Request business coaching", "Запросить бизнес-консультацию", "Solicitar coaching"),
      compactAction: localize("Request", "Запросить", "Solicitar"),
    },
  ],
};

const headings: Record<Direction, { title: Localized; lead: Localized }> = {
  energy: {
    title: localize("Feel supported in body & energy", "Поддержка для тела и энергии", "Apoyo para cuerpo y energía"),
    lead: localize("Three ways to begin: gentle guided practice, introductory learning or personal support.", "Три варианта: мягкая практика, вводное обучение или личная поддержка.", "Tres caminos: práctica suave, aprendizaje inicial o apoyo personal."),
  },
  love: {
    title: localize("Explore love & relationships", "Исследуйте любовь и отношения", "Explora el amor y las relaciones"),
    lead: localize("Start with a free written review or explore a relevant personal session.", "Начните с бесплатного письменного разбора или выберите подходящую личную сессию.", "Empieza con una revisión gratuita o explora una sesión personal."),
  },
  business: {
    title: localize("Find clarity in business & money", "Ясность в бизнесе и деньгах", "Claridad en negocios y dinero"),
    lead: localize("Understand a work challenge, explore constellations or request business coaching.", "Разберите рабочий запрос, исследуйте расстановки или выберите бизнес-коучинг.", "Explora una situación laboral, constelaciones o coaching empresarial."),
  },
};

const labels = {
  en: { kicker: "RECOMMENDED STARTS", open: "Details", close: "Close", free: "FREE", footer: "Free introductions are not live consultations. Paid sessions are confirmed personally; sending a request is not a booking or payment." },
  ru: { kicker: "С ЧЕГО МОЖНО НАЧАТЬ", open: "Детали", close: "Скрыть", free: "БЕСПЛАТНО", footer: "Бесплатные предложения не являются живыми консультациями. Платные сессии подтверждаются лично; запрос не равен записи или оплате." },
  es: { kicker: "POR DÓNDE EMPEZAR", open: "Detalles", close: "Cerrar", free: "GRATIS", footer: "Las opciones gratuitas no son consultas en vivo. Las sesiones de pago se confirman personalmente; solicitar no es reservar ni pagar." },
} as const;

export function GoalSupportOffers({ locale, direction }: { locale: PublicLocale; direction: Direction }) {
  const [expandedOffer, setExpandedOffer] = useState<string | null>(null);
  const heading = headings[direction];
  const t = labels[locale];
  return (
    <section className={styles.section} data-goal-support-offers data-goal-support-theme={direction}
      aria-labelledby={"goal-support-heading-" + direction}>
      <header className={styles.header}>
        <p className={styles.kicker}>{t.kicker}</p>
        <h2 id={"goal-support-heading-" + direction}>{heading.title[locale]}</h2>
        <p>{heading.lead[locale]}</p>
      </header>
      <div className={styles.grid}>
        {offers[direction].map(offer => {
          const expanded = expandedOffer === offer.id;
          const href = "/" + locale + offer.path;
          return (
            <article key={offer.id} className={cardStyles.offer}
              data-goal-support-card={offer.id}
              data-expanded={expanded ? "true" : "false"}
              data-home-offer-free={offer.free ? "true" : undefined}>
              {offer.free && <span className={cardStyles.offerFreeBadge}>{t.free}</span>}
              <span className={cardStyles.photo} aria-hidden="true">
                <Image src={offer.image} alt="" fill loading="lazy" unoptimized
                  sizes="(max-width:350px) 100px, (max-width:640px) 148px, 200px" />
              </span>
              <div className={cardStyles.offerContent}>
                <div className={cardStyles.offerBody}>
                  <h3 className={cardStyles.offerTitle}>{offer.title[locale]}</h3>
                  <p className={cardStyles.offerDetail}>{offer.description[locale]}</p>
                </div>
                <div className={cardStyles.offerControls}>
                  <button type="button" className={cardStyles.offerSecondary}
                    aria-label={expanded ? t.close : t.open}
                    aria-controls={"goal-support-info-" + offer.id}
                    aria-expanded={expanded}
                    data-goal-support-details={offer.id}
                    onClick={() => setExpandedOffer(expanded ? null : offer.id)}>
                    <span className={cardStyles.actionFull} aria-hidden="true">{expanded ? t.close : t.open}</span>
                    <span className={cardStyles.actionCompact} aria-hidden="true">{expanded ? t.close : t.open}</span>
                    <ChevronDown className={cardStyles.detailChevron} size={16} aria-hidden="true" />
                  </button>
                  <Link href={href} className={cardStyles.offerPrimary} prefetch={false}
                    aria-label={offer.action[locale]}
                    data-goal-support-action={offer.id}>
                    <span className={cardStyles.actionFull} aria-hidden="true">{offer.action[locale]}</span>
                    <span className={cardStyles.actionCompact} aria-hidden="true">{offer.compactAction[locale]}</span>
                    <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                </div>
              </div>
              <div className={cardStyles.offerMore} id={"goal-support-info-" + offer.id} hidden={!expanded}>
                <p>{offer.details[locale]}</p>
              </div>
            </article>
          );
        })}
      </div>
      <p className={styles.footer}>{t.footer}</p>
    </section>
  );
}
