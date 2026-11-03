"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Target } from "lucide-react";
import { useHomePersonalSpace } from "@/components/home-personal-space";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-featured-workspace.module.css";

const photos = {
  "reiki": "/images/holistic-house/reiki-practitioner-sunrise.webp",
  "opora": "/images/holistic-house/course-start-heron.webp",
  "academy": "/images/holistic-house/books-library.webp",
  "allTests": "/images/holistic-house/ideas-pine-reference.webp",
  "profile": "/images/holistic-house/report-lighthouse-coast.webp",
  "growth": "/images/holistic-house/course-focus-mountain-boy.webp",
  "review": "/images/holistic-house/andy-about.png",
  "businessConstellations": "/images/holistic-house/video-posters/constellations-en-v1.webp",
  "constellations": "/images/holistic-house/hero-olive-incense.webp",
  "aiCoaching": "/images/holistic-house/course-start-heron.webp",
  "therapist": "/images/holistic-house/video-posters/services-en-v2.webp",
  "alchemy": "/images/holistic-house/hero-olive-incense.webp",
  "energy": "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  "pro": "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  "service": "/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp",
  "course": "/images/holistic-house/andy-about.png"
} as const;
type OfferId = keyof typeof photos;
type ModuleKey = "courses" | "personality" | "situation" | "coaching" | "alchemy" | "energy" | "master";
const moduleIds: ModuleKey[] = ["courses","personality","situation","coaching","alchemy","energy","master"];
const copy = {
  "en": {
    "heading": "Explore your path at Holistic House",
    "summary": "Seven clear steps — begin for free, explore your question, or deepen your practice when you are ready.",
    "eyebrow": "YOUR PATH",
    "sectionCounter": "STEP",
    "journeyLabel": "Jump to a step in your journey",
    "modules": {
      "courses": {
        "title": "Free courses",
        "lead": "Start learning at your own pace, without buying a session.",
        "offers": [
          {
            "id": "reiki",
            "title": "Reiki Practitioner · free",
            "body": "Five introductory lessons, guided practice and reflection.",
            "cta": "Start free Reiki course"
          },
          {
            "id": "opora",
            "title": "OPORA · 14 days",
            "body": "Practical daily exercises to support balance and resilience.",
            "cta": "Explore the free course"
          },
          {
            "id": "academy",
            "title": "Explore the Academy",
            "body": "Find other courses and learning pathways.",
            "cta": "Browse courses"
          }
        ]
      },
      "personality": {
        "title": "Personality discovery",
        "lead": "Free self-tests can help you reflect, save a personal profile and plan your next steps.",
        "offers": [
          {
            "id": "allTests",
            "title": "Free personality tests",
            "body": "Choose a topic, complete a self-check and explore your results.",
            "cta": "Take a free test"
          },
          {
            "id": "profile",
            "title": "Build my personal profile",
            "body": "Collect your results and private reports in My Space.",
            "cta": "Open my profile"
          },
          {
            "id": "growth",
            "title": "My development plan",
            "body": "Turn your reflections into a private path with next steps.",
            "cta": "View my development path"
          }
        ]
      },
      "situation": {
        "title": "Understand a situation or problem",
        "lead": "Explore one important question — from a free express review to systemic work.",
        "offers": [
          {
            "id": "review",
            "title": "Free express situation review",
            "body": "Describe your question and receive a personal written analysis.",
            "cta": "Request a free review"
          },
          {
            "id": "businessConstellations",
            "title": "Business constellation",
            "body": "Explore roles, team dynamics and business decisions.",
            "cta": "Explore business constellations"
          },
          {
            "id": "constellations",
            "title": "Systemic & family constellation",
            "body": "Explore family patterns, relationships and recurring situations.",
            "cta": "Explore constellations"
          }
        ]
      },
      "coaching": {
        "title": "Personal coaching & therapy",
        "lead": "Choose a guided self-reflection session or request one-to-one work with a professional.",
        "offers": [
          {
            "id": "aiCoaching",
            "title": "Free AI-assisted coaching session",
            "body": "A self-guided coaching conversation with automated model selection — not a live AI chat.",
            "cta": "Start free coaching"
          },
          {
            "id": "therapist",
            "title": "Session with a therapist / coach",
            "body": "Individual session online or in Toronto · from €50 for 30 minutes.",
            "cta": "Request a personal session"
          }
        ]
      },
      "alchemy": {
        "title": "Deep inner work · Alchemy of the Soul",
        "lead": "Explore deeper patterns using hypnotherapy, systemic constellations and optional complementary approaches.",
        "offers": [
          {
            "id": "alchemy",
            "title": "Alchemy of the Soul",
            "body": "Guided imagery · systemic work · optional homeopathic reflection.",
            "cta": "Explore Alchemy of the Soul"
          }
        ]
      },
      "energy": {
        "title": "Energy support",
        "lead": "Request an individual remote session with the practitioner; timing and format are confirmed personally.",
        "offers": [
          {
            "id": "energy",
            "title": "Personal energy support",
            "body": "Remote energywork session; an optional symbolic talisman can be discussed.",
            "cta": "Request energy support"
          }
        ]
      },
      "master": {
        "title": "Become a Master",
        "lead": "Learn professionally or bring your own practice to the Holistic House community.",
        "offers": [
          {
            "id": "pro",
            "title": "Professional training",
            "body": "Explore the Pro journey from introductory courses to professional study.",
            "cta": "Explore professional training"
          },
          {
            "id": "service",
            "title": "Offer your services",
            "body": "Create a practitioner service listing for moderation.",
            "cta": "List my services"
          },
          {
            "id": "course",
            "title": "Publish your own courses",
            "body": "Prepare your course in My Practice for review before publication.",
            "cta": "Open course editor"
          }
        ]
      }
    },
    "myTests": "My tests",
    "myCourses": "My courses",
    "guestProfile": "Sign in to build my profile",
    "guestGrowth": "Sign in to view my plan",
    "reports": "My reports",
    "growth": "My development path",
    "personalityNote": "Self-tests support reflection; they are not medical diagnoses. Private results require sign-in.",
    "situationNote": "The free express option is a written review, not a live appointment. A request does not confirm booking.",
    "coachingNote": "The free coaching flow is self-guided, with automatic model suggestions; it is not live AI therapy. Paid appointments require confirmation.",
    "alchemyNote": "Homeopathy has no reliable evidence of effectiveness for treating health conditions and does not replace evidence-based care.",
    "energyNote": "Requests are reviewed by the practitioner. Nothing is scheduled or charged automatically.",
    "masterNote": "Listings and courses require review before publication. Free learning does not confer professional qualification.",
    "privacy": "Reports, answers and progress stay private in My Space."
  },
  "ru": {
    "heading": "Ваш путь в Holistic House",
    "summary": "Семь шагов погружения: начните бесплатно, исследуйте запрос и выбирайте глубину работы в своём темпе.",
    "eyebrow": "ВАШ ПУТЬ",
    "sectionCounter": "ШАГ",
    "journeyLabel": "Перейти к этапу погружения",
    "modules": {
      "courses": {
        "title": "Бесплатные курсы",
        "lead": "Начните обучаться в своём темпе, без оплаты консультации.",
        "offers": [
          {
            "id": "reiki",
            "title": "Практик Рейки · бесплатно",
            "body": "Пять вводных уроков, практики и рефлексия.",
            "cta": "Начать бесплатный курс"
          },
          {
            "id": "opora",
            "title": "ОПОРА · 14 дней",
            "body": "Короткие ежедневные упражнения для устойчивости и равновесия.",
            "cta": "Открыть бесплатный курс"
          },
          {
            "id": "academy",
            "title": "Все курсы Академии",
            "body": "Другие программы и направления обучения.",
            "cta": "Посмотреть курсы"
          }
        ]
      },
      "personality": {
        "title": "Диагностика личности",
        "lead": "Бесплатное тестирование, личный профиль и индивидуальный план развития.",
        "offers": [
          {
            "id": "allTests",
            "title": "Бесплатные тесты личности",
            "body": "Выберите тему, пройдите тест и изучите результаты.",
            "cta": "Пройти бесплатный тест"
          },
          {
            "id": "profile",
            "title": "Создать профиль личности",
            "body": "Соберите результаты тестов и отчёты в приватном кабинете.",
            "cta": "Мой профиль личности"
          },
          {
            "id": "growth",
            "title": "Создать план развития",
            "body": "Переведите результаты в индивидуальные шаги развития.",
            "cta": "Мой план развития"
          }
        ]
      },
      "situation": {
        "title": "Диагностика ситуации / проблемы",
        "lead": "Начните с бесплатного разбора или исследуйте системные взаимосвязи.",
        "offers": [
          {
            "id": "review",
            "title": "Бесплатная экспресс-диагностика",
            "body": "Опишите вопрос и получите персональный письменный разбор.",
            "cta": "Получить экспресс-разбор"
          },
          {
            "id": "businessConstellations",
            "title": "Бизнес-расстановка",
            "body": "Исследуйте роли в команде, бизнес-решения и препятствия.",
            "cta": "Открыть бизнес-расстановки"
          },
          {
            "id": "constellations",
            "title": "Системный анализ и семейная расстановка",
            "body": "Исследуйте повторяющиеся семейные и жизненные сценарии.",
            "cta": "Открыть расстановки"
          }
        ]
      },
      "coaching": {
        "title": "Личная коррекция · коучинг / терапия",
        "lead": "Выберите самостоятельную коуч-сессию или встречу со специалистом.",
        "offers": [
          {
            "id": "aiCoaching",
            "title": "Бесплатная ИИ-коуч-сессия",
            "body": "Самостоятельные вопросы с автоматическим выбором модели; это не живой ИИ-чат.",
            "cta": "Начать бесплатно"
          },
          {
            "id": "therapist",
            "title": "Сессия с терапевтом / коучем",
            "body": "Индивидуальная работа онлайн или в Торонто · от €50 за 30 минут.",
            "cta": "Запросить личную сессию"
          }
        ]
      },
      "alchemy": {
        "title": "Глубинная коррекция · Алхимия души",
        "lead": "Образная работа, системные расстановки и необязательные дополнительные подходы.",
        "offers": [
          {
            "id": "alchemy",
            "title": "Алхимия души",
            "body": "Гипнотерапия · расстановки · необязательная гомеопатическая рефлексия.",
            "cta": "Исследовать Алхимию души"
          }
        ]
      },
      "energy": {
        "title": "Энергетическая поддержка",
        "lead": "Запросите индивидуальную дистанционную поддержку с подтверждением мастера.",
        "offers": [
          {
            "id": "energy",
            "title": "Персональная энергетическая поддержка",
            "body": "Дистанционная сессия; символический талисман обсуждается отдельно.",
            "cta": "Получить поддержку"
          }
        ]
      },
      "master": {
        "title": "Стать мастером",
        "lead": "Пройдите профессиональное обучение или предложите свои услуги и курсы.",
        "offers": [
          {
            "id": "pro",
            "title": "Профессиональное обучение",
            "body": "Путь Pro: от знакомства с методом до практической подготовки.",
            "cta": "Открыть обучение"
          },
          {
            "id": "service",
            "title": "Разместить свои услуги",
            "body": "Создайте карточку практики для модерации.",
            "cta": "Разместить услугу"
          },
          {
            "id": "course",
            "title": "Разместить свои курсы",
            "body": "Подготовьте авторский курс в кабинете мастера.",
            "cta": "Редактор курсов"
          }
        ]
      }
    },
    "myTests": "Мои тесты",
    "myCourses": "Мои курсы",
    "guestProfile": "Войти для создания профиля",
    "guestGrowth": "Войти для плана развития",
    "reports": "Мои отчёты",
    "growth": "Мой путь развития",
    "personalityNote": "Тесты предназначены для самопознания, а не медицинской диагностики. Личные данные доступны после входа.",
    "situationNote": "Экспресс-диагностика — письменный разбор, а не звонок. Заявка не является подтверждённой записью.",
    "coachingNote": "Бесплатная коуч-сессия — самостоятельная работа с автоподбором модели, не живой ИИ-терапевт. Запись к специалисту подтверждается отдельно.",
    "alchemyNote": "Нет надёжных доказательств эффективности гомеопатии для лечения заболеваний; она не заменяет доказательную помощь.",
    "energyNote": "Мастер подтверждает запрос лично. Ни запись, ни оплата не происходят автоматически.",
    "masterNote": "Услуги и курсы проходят модерацию. Бесплатный курс не даёт профессиональной квалификации.",
    "privacy": "Ваши отчёты, ответы и прогресс приватны и доступны только в My Space."
  },
  "es": {
    "heading": "Tu camino en Holistic House",
    "summary": "Siete pasos: empieza gratis, explora tu pregunta y profundiza a tu ritmo.",
    "eyebrow": "TU CAMINO",
    "sectionCounter": "PASO",
    "journeyLabel": "Ir a una etapa de tu recorrido",
    "modules": {
      "courses": {
        "title": "Cursos gratuitos",
        "lead": "Comienza a aprender a tu ritmo, sin pagar una sesión.",
        "offers": [
          {
            "id": "reiki",
            "title": "Reiki Practitioner · gratis",
            "body": "Cinco lecciones introductorias, práctica y reflexión.",
            "cta": "Empezar gratis"
          },
          {
            "id": "opora",
            "title": "OPORA · 14 días",
            "body": "Ejercicios cotidianos de apoyo y equilibrio.",
            "cta": "Explorar curso gratuito"
          },
          {
            "id": "academy",
            "title": "Explora la Academia",
            "body": "Descubre otros cursos y caminos de aprendizaje.",
            "cta": "Ver cursos"
          }
        ]
      },
      "personality": {
        "title": "Descubre tu personalidad",
        "lead": "Pruebas gratuitas, perfil personal y plan privado de desarrollo.",
        "offers": [
          {
            "id": "allTests",
            "title": "Pruebas gratuitas de personalidad",
            "body": "Elige un tema, realiza una prueba y explora tus resultados.",
            "cta": "Hacer una prueba"
          },
          {
            "id": "profile",
            "title": "Crear mi perfil personal",
            "body": "Reúne resultados e informes en tu espacio privado.",
            "cta": "Abrir mi perfil"
          },
          {
            "id": "growth",
            "title": "Mi plan de desarrollo",
            "body": "Convierte tus resultados en próximos pasos personales.",
            "cta": "Ver mi plan"
          }
        ]
      },
      "situation": {
        "title": "Comprende tu situación o problema",
        "lead": "Empieza con una revisión gratuita o explora vínculos sistémicos.",
        "offers": [
          {
            "id": "review",
            "title": "Diagnóstico exprés gratuito",
            "body": "Describe una pregunta para obtener una respuesta personal escrita.",
            "cta": "Solicitar revisión"
          },
          {
            "id": "businessConstellations",
            "title": "Constelación de negocios",
            "body": "Explora roles de equipo y decisiones empresariales.",
            "cta": "Explorar constelaciones"
          },
          {
            "id": "constellations",
            "title": "Análisis sistémico y constelación familiar",
            "body": "Explora relaciones, patrones familiares y situaciones recurrentes.",
            "cta": "Ver constelaciones"
          }
        ]
      },
      "coaching": {
        "title": "Sesión personal · coaching / terapia",
        "lead": "Elige una sesión autoguiada o una consulta individual con un profesional.",
        "offers": [
          {
            "id": "aiCoaching",
            "title": "Sesión gratuita de coaching asistido",
            "body": "Preguntas autoguiadas con selección automática de modelo; no es chat de IA en vivo.",
            "cta": "Empezar coaching"
          },
          {
            "id": "therapist",
            "title": "Sesión con terapeuta / coach",
            "body": "Consulta individual en línea o Toronto · desde 50 € por 30 minutos.",
            "cta": "Solicitar sesión"
          }
        ]
      },
      "alchemy": {
        "title": "Trabajo profundo · Alquimia del Alma",
        "lead": "Imágenes guiadas, constelaciones y enfoques complementarios opcionales.",
        "offers": [
          {
            "id": "alchemy",
            "title": "Alquimia del Alma",
            "body": "Hipnoterapia · trabajo sistémico · reflexión homeopática opcional.",
            "cta": "Conocer Alquimia del Alma"
          }
        ]
      },
      "energy": {
        "title": "Apoyo energético",
        "lead": "Solicita apoyo individual a distancia, sujeto a confirmación del profesional.",
        "offers": [
          {
            "id": "energy",
            "title": "Apoyo energético personal",
            "body": "Sesión a distancia y talismán simbólico opcional por acuerdo.",
            "cta": "Solicitar apoyo"
          }
        ]
      },
      "master": {
        "title": "Conviértete en profesional",
        "lead": "Fórmate profesionalmente o presenta tus servicios y cursos.",
        "offers": [
          {
            "id": "pro",
            "title": "Formación profesional",
            "body": "Descubre el recorrido Pro desde la introducción hasta la práctica.",
            "cta": "Explorar formación"
          },
          {
            "id": "service",
            "title": "Publicar mis servicios",
            "body": "Crea un anuncio profesional sujeto a revisión.",
            "cta": "Publicar servicio"
          },
          {
            "id": "course",
            "title": "Compartir mis cursos",
            "body": "Prepara tu curso dentro de tu espacio profesional.",
            "cta": "Abrir editor de cursos"
          }
        ]
      }
    },
    "myTests": "Mis pruebas",
    "myCourses": "Mis cursos",
    "guestProfile": "Entrar para crear mi perfil",
    "guestGrowth": "Entrar para ver mi plan",
    "reports": "Mis informes",
    "growth": "Mi desarrollo",
    "personalityNote": "Las pruebas son de autorreflexión, no diagnósticos médicos. Los datos privados requieren iniciar sesión.",
    "situationNote": "La opción exprés es una respuesta escrita, no una llamada. La solicitud no confirma una reserva.",
    "coachingNote": "El coaching gratuito es autoguiado con modelos sugeridos; no es terapia con IA en vivo. La cita requiere confirmación.",
    "alchemyNote": "La homeopatía no tiene pruebas fiables de eficacia clínica y no sustituye la atención basada en evidencia.",
    "energyNote": "El profesional confirma cada solicitud. No se programa ni se cobra automáticamente.",
    "masterNote": "Los servicios y cursos se revisan antes de publicarse. La formación gratuita no otorga cualificación profesional.",
    "privacy": "Tus informes, respuestas y progreso permanecen privados en My Space."
  }
} as const;

export function HomeFeaturedWorkspace({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const space = useHomePersonalSpace();
  const signedIn = space?.status === "ready" && Boolean(space.summary);
  // Private account pages currently use EN/RU. Public Spanish links remain Spanish.
  const accountLocale = locale === "es" ? "en" : locale;
  const accountRoot = "/" + accountLocale + "/app";
  const nextCourseId = signedIn && space?.summary?.next === "course" ? space.summary.courseId : null;
  const myCoursesHref = nextCourseId
    ? accountRoot + "/course?courseId=" + encodeURIComponent(nextCourseId)
    : accountRoot + "/course?view=courses";

  const hrefs: Record<OfferId, string> = {
    reiki: "/" + locale + "/academy/principles-of-energywork/learn",
    opora: "/" + locale + "/courses/antistress",
    academy: "/" + locale + "/academy",
    allTests: "/" + locale + "/client/tests",
    profile: accountRoot + "/portrait",
    growth: accountRoot + "/portfolio#hh-development-program",
    review: "/" + locale + "/services/free-situation-review",
    businessConstellations: "/" + locale + "/services/business-consulting",
    constellations: "/" + locale + "/services/systemic-constellations",
    aiCoaching: "/" + locale + "/coaching",
    therapist: "/" + locale + "/services#consultation",
    alchemy: "/" + locale + "/services/alchemy-of-soul",
    energy: "/" + locale + "/services/remote-energy-support",
    pro: "/" + locale + "/pro",
    service: accountRoot + "/practice?panel=services",
    course: accountRoot + "/practice?panel=materials&materialTab=courses",
  };

  return (
    <section id="home-my-space-features" className={styles.root}
      data-home-featured-workspace data-home-journey-count={moduleIds.length}
      aria-labelledby="hh-home-features-title">
      <header className={styles.intro}>
        <p className={styles.eyebrow}>{t.eyebrow} · 01–07</p>
        <h1 id="hh-home-features-title">{t.heading}</h1>
        <p>{t.summary}</p>
      </header>
      <nav className={styles.steps} aria-label={t.journeyLabel}>
        {moduleIds.map((id, index) => (
          <a key={id} href={"#home-immersion-" + id} className={styles.stepLink}>
            <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            {t.modules[id].title}
          </a>
        ))}
      </nav>
      <div className={styles.sections}>
        {moduleIds.map((id, index) => {
          const section = t.modules[id];
          const footerLink = id === "courses" && signedIn
            ? { href: myCoursesHref, label: t.myCourses }
            : id === "personality" && signedIn
              ? { href: accountRoot + "/tests", label: t.myTests }
              : null;
          const note = id === "personality" ? t.personalityNote
            : id === "situation" ? t.situationNote
              : id === "coaching" ? t.coachingNote
                : id === "alchemy" ? t.alchemyNote
                  : id === "energy" ? t.energyNote
                    : id === "master" ? t.masterNote : null;
          return (
            <section id={"home-immersion-" + id} className={styles.section}
              data-home-module={id} aria-labelledby={"hh-home-" + id + "-title"} key={id}>
              <header className={styles.sectionHeading}>
                <p className={styles.eyebrow}>{t.sectionCounter} {index + 1}/{moduleIds.length}</p>
                <h2 id={"hh-home-" + id + "-title"}>{section.title}</h2>
                <p className={styles.lead}>{section.lead}</p>
              </header>
              <div className={styles.offers} data-home-module-offers={id}>
                {section.offers.map(offer => (
                  <Link key={offer.id} href={hrefs[offer.id]} prefetch={false}
                    className={styles.offer} data-home-module-action={offer.id}>
                    <span className={styles.photo} aria-hidden="true">
                      <Image src={photos[offer.id]} alt="" fill unoptimized loading="lazy"
                        sizes="(max-width: 350px) 92px, (max-width: 640px) 124px, (max-width: 920px) 160px, 190px" />
                    </span>
                    <span className={styles.offerBody}>
                      <strong className={styles.offerTitle}>{offer.title}</strong>
                      <span className={styles.offerDetail}>{offer.body}</span>
                      <span className={styles.offerAction}>
                        {offer.id === "profile" && !signedIn ? t.guestProfile
                          : offer.id === "growth" && !signedIn ? t.guestGrowth : offer.cta}
                        <ArrowRight size={16} aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
              {(footerLink || note) && (
                <footer className={styles.sectionFooter}>
                  {footerLink && <Link href={footerLink.href} prefetch={false} className={styles.extraLink}>
                    {footerLink.label}<ArrowRight size={15} aria-hidden="true" />
                  </Link>}
                  {note && <p>{note}</p>}
                </footer>
              )}
            </section>
          );
        })}
      </div>
      {signedIn && (
        <nav className={styles.privateLinks} aria-label={t.reports + " · " + t.growth}>
          <Link prefetch={false} href={accountRoot + "/portrait#personal-reports"}
            data-home-reports-cta><ShieldCheck size={15} aria-hidden="true" />{t.reports}</Link>
          <Link prefetch={false} href={accountRoot + "/portfolio#hh-development-program"}
            data-home-development-cta><Target size={15} aria-hidden="true" />{t.growth}</Link>
          <Link prefetch={false} href={accountRoot + "/personal-support"}
            data-home-personal-support-cta><ShieldCheck size={15} aria-hidden="true" />
            {locale === "ru" ? "Моё сопровождение" : locale === "es" ? "Mi acompañamiento" : "My personal support"}</Link>
        </nav>
      )}
      <p className={styles.privacy}>{t.privacy}</p>
    </section>
  );
}
