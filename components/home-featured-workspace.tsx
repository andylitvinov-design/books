"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Target } from "lucide-react";

import { useHomePersonalSpace } from "@/components/home-personal-space";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./home-featured-workspace.module.css";

const photos = {
  opora: "/images/holistic-house/course-start-heron.webp",
  reiki: "/images/holistic-house/reiki-practitioner-sunrise.webp",
  tests: "/images/holistic-house/report-lighthouse-coast.webp",
  profile: "/images/holistic-house/course-focus-mountain-boy.webp",
  plan: "/images/holistic-house/ideas-pine-reference.webp",
  review: "/images/holistic-house/andy-about.png",
  businessConstellations: "/images/holistic-house/video-posters/constellations-en-v1.webp",
  familyConstellations: "/images/holistic-house/video-posters/services-en-v2.webp",
  selfCoaching: "/images/holistic-house/course-start-heron.webp",
  personalSession: "/images/holistic-house/video-posters/services-en-v2.webp",
  alchemy: "/images/holistic-house/hero-olive-incense.webp",
  energySupport: "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  energyLearning: "/images/holistic-house/reiki-practitioner-sunrise.webp",
  professional: "/images/holistic-house/books-library.webp",
  service: "/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp",
  course: "/images/holistic-house/andy-about.png",
} as const;

type OfferId = keyof typeof photos;
type ModuleKey = "freeCourses" | "personality" | "situation" | "personal" | "alchemy" | "energy" | "master";
const moduleIds: ModuleKey[] = ["freeCourses","personality","situation","personal","alchemy","energy","master"];

const copy = {
  "en": {
    "heading": "Your path through Holistic House",
    "eyebrow": "EXPLORE AT YOUR OWN PACE",
    "sectionCounter": "STEP",
    "modules": {
      "freeCourses": {
        "title": "Free courses",
        "lead": "Begin with a free practice and learn at your own pace.",
        "offers": [
          {
            "id": "opora",
            "title": "OPORA · 14 days",
            "body": "Short steps for everyday calm and self-support.",
            "cta": "Explore free course"
          },
          {
            "id": "reiki",
            "title": "Reiki Practitioner · free",
            "body": "Five introductory lessons with reflection and practical exercises.",
            "cta": "Start free course"
          }
        ]
      },
      "personality": {
        "title": "Discover your personality",
        "lead": "Take free self-checks, build your private profile and follow a development path.",
        "offers": [
          {
            "id": "tests",
            "title": "Free personality & stress tests",
            "body": "Explore your resources, strengths and current challenges.",
            "cta": "Take free tests"
          },
          {
            "id": "profile",
            "title": "My personality profile",
            "body": "Keep your results together in your private space.",
            "cta": "Create my profile"
          },
          {
            "id": "plan",
            "title": "My development path",
            "body": "Use your results to choose next steps and track progress.",
            "cta": "View development path"
          }
        ]
      },
      "situation": {
        "title": "Understand your situation",
        "lead": "Explore one problem, a business decision or a family-system pattern.",
        "offers": [
          {
            "id": "review",
            "title": "Free express situation review",
            "body": "Share one question and a drawing for a personal written review.",
            "cta": "Request a free review"
          },
          {
            "id": "businessConstellations",
            "title": "Business constellation",
            "body": "Explore roles, relationships and obstacles in a work situation.",
            "cta": "Explore business constellations"
          },
          {
            "id": "familyConstellations",
            "title": "Systemic & family constellations",
            "body": "Explore recurring patterns and your place in a relationship system.",
            "cta": "Explore systemic work"
          }
        ]
      },
      "personal": {
        "title": "Personal coaching & therapy",
        "lead": "Start with a free guided session or enquire about individual support.",
        "offers": [
          {
            "id": "selfCoaching",
            "title": "Free AI-guided coaching path",
            "body": "Answer one question at a time with automatic coaching-model selection.",
            "cta": "Start free self-guided session"
          },
          {
            "id": "personalSession",
            "title": "Session with a coach / therapist",
            "body": "Individual conversation online or in Toronto, from €50 for 30 minutes.",
            "cta": "Request a personal session"
          }
        ]
      },
      "alchemy": {
        "title": "Deep work · Alchemy of the Soul",
        "lead": "A personal approach combining guided imagery and systemic exploration.",
        "offers": [
          {
            "id": "alchemy",
            "title": "Alchemy of the Soul",
            "body": "Explore recurring inner conflicts through imagery, constellations and optional complementary methods.",
            "cta": "Explore the approach"
          }
        ]
      },
      "energy": {
        "title": "Energy support",
        "lead": "Choose personal support or learn the underlying energywork practice.",
        "offers": [
          {
            "id": "energySupport",
            "title": "Remote energy support",
            "body": "Enquire about a personal distance energywork session with a practitioner.",
            "cta": "Request support"
          },
          {
            "id": "energyLearning",
            "title": "Learn energywork",
            "body": "Explore training in Reiki and related personal practices.",
            "cta": "Explore the training"
          }
        ]
      },
      "master": {
        "title": "Become a Master",
        "lead": "Train professionally, then share your own services and courses.",
        "offers": [
          {
            "id": "professional",
            "title": "Professional education",
            "body": "Explore the Pro pathway and choose further training.",
            "cta": "Explore professional learning"
          },
          {
            "id": "service",
            "title": "Publish your services",
            "body": "Prepare your practitioner listing for moderation.",
            "cta": "Open service editor"
          },
          {
            "id": "course",
            "title": "Share your courses",
            "body": "Build lessons in your private practitioner workspace.",
            "cta": "Open course editor"
          }
        ]
      }
    },
    "myTests": "My tests",
    "reports": "My reports",
    "growth": "My development path",
    "profileNote": "A free account is required to save your personal profile and development path.",
    "situationNote": "A free review is written, not a live session. A request does not confirm a booking.",
    "personalNote": "The free flow is self-guided with automatic model matching; it is not a live AI chat or therapy. Booking requires confirmation.",
    "alchemyNote": "Homeopathy is optional, has no reliable evidence of effectiveness for medical treatment and does not replace healthcare.",
    "energyNote": "This is a personal reflective practice, not medical treatment. A practitioner must confirm each request.",
    "masterNote": "Public listings require moderation; introductory courses do not grant professional qualifications.",
    "privacy": "Personal test results, reports and progress remain private in My Space."
  },
  "ru": {
    "heading": "Ваш путь в Holistic House",
    "eyebrow": "ПОСТЕПЕННОЕ ПОГРУЖЕНИЕ",
    "sectionCounter": "ШАГ",
    "modules": {
      "freeCourses": {
        "title": "Бесплатные курсы",
        "lead": "Начните с бесплатной практики и занимайтесь в своём темпе.",
        "offers": [
          {
            "id": "opora",
            "title": "ОПОРА · 14 дней",
            "body": "Короткие упражнения для спокойствия и поддержки себя.",
            "cta": "Открыть бесплатный курс"
          },
          {
            "id": "reiki",
            "title": "Практик Рейки · бесплатно",
            "body": "Пять вводных уроков с упражнениями и рефлексией.",
            "cta": "Начать обучение"
          }
        ]
      },
      "personality": {
        "title": "Диагностика личности",
        "lead": "Пройдите бесплатные тесты, создайте профиль и план личного развития.",
        "offers": [
          {
            "id": "tests",
            "title": "Бесплатное тестирование",
            "body": "Изучите стресс, ресурсы, сильные стороны и особенности личности.",
            "cta": "Пройти бесплатные тесты"
          },
          {
            "id": "profile",
            "title": "Профиль личности",
            "body": "Сохраните результаты тестов в своём защищённом кабинете.",
            "cta": "Создать профиль"
          },
          {
            "id": "plan",
            "title": "Мой план развития",
            "body": "Выберите следующие шаги по результатам и следите за прогрессом.",
            "cta": "Открыть план развития"
          }
        ]
      },
      "situation": {
        "title": "Диагностика ситуации и проблемы",
        "lead": "Разберите конкретную ситуацию, бизнес-вопрос или семейный сценарий.",
        "offers": [
          {
            "id": "review",
            "title": "Бесплатная экспресс-диагностика",
            "body": "Опишите один запрос и добавьте рисунок для личного письменного разбора.",
            "cta": "Получить бесплатный разбор"
          },
          {
            "id": "businessConstellations",
            "title": "Бизнес-расстановка",
            "body": "Исследуйте роли, связи и препятствия в работе и проектах.",
            "cta": "Исследовать бизнес-расстановки"
          },
          {
            "id": "familyConstellations",
            "title": "Системный анализ и семейная расстановка",
            "body": "Исследуйте повторяющиеся отношения и семейные паттерны.",
            "cta": "Открыть метод"
          }
        ]
      },
      "personal": {
        "title": "Личная коррекция · коучинг / терапия",
        "lead": "Сначала бесплатная сессия по вопросам или индивидуальная работа со специалистом.",
        "offers": [
          {
            "id": "selfCoaching",
            "title": "Бесплатная ИИ-коуч-сессия",
            "body": "Отвечайте на вопросы по одному с автоматическим подбором коучинговой модели.",
            "cta": "Начать бесплатную сессию"
          },
          {
            "id": "personalSession",
            "title": "Сессия с коучем / терапевтом",
            "body": "Индивидуальная работа онлайн или в Торонто, от €50 за 30 минут.",
            "cta": "Запросить консультацию"
          }
        ]
      },
      "alchemy": {
        "title": "Глубинная коррекция · Алхимия души",
        "lead": "Образная и системная работа с повторяющимися внутренними конфликтами.",
        "offers": [
          {
            "id": "alchemy",
            "title": "Алхимия души",
            "body": "Гипнотерапия, расстановки и необязательные дополнительные символические практики.",
            "cta": "Узнать о методе"
          }
        ]
      },
      "energy": {
        "title": "Энергетическая поддержка",
        "lead": "Запросите дистанционную поддержку или изучите энергетические практики.",
        "offers": [
          {
            "id": "energySupport",
            "title": "Персональная энергетическая поддержка",
            "body": "Оставьте заявку на дистанционную практику по согласованию с мастером.",
            "cta": "Получить поддержку"
          },
          {
            "id": "energyLearning",
            "title": "Обучение энергетическим практикам",
            "body": "Изучите Рейки и способы личной практики.",
            "cta": "Перейти к обучению"
          }
        ]
      },
      "master": {
        "title": "Стать мастером",
        "lead": "Пройдите профессиональное обучение и разместите свои услуги или курсы.",
        "offers": [
          {
            "id": "professional",
            "title": "Профессиональное обучение",
            "body": "Выберите направление и программу подготовки в разделе Про.",
            "cta": "Начать обучение"
          },
          {
            "id": "service",
            "title": "Разместить свои услуги",
            "body": "Создайте карточку практики для проверки перед публикацией.",
            "cta": "Редактор услуг"
          },
          {
            "id": "course",
            "title": "Разместить свои курсы",
            "body": "Подготовьте уроки в своём кабинете мастера.",
            "cta": "Редактор курсов"
          }
        ]
      }
    },
    "myTests": "Мои тесты",
    "reports": "Мои отчёты",
    "growth": "Мой путь развития",
    "profileNote": "Для сохранения профиля личности и плана развития нужен бесплатный аккаунт.",
    "situationNote": "Бесплатный разбор — письменный, не видеозвонок. Заявка не означает подтверждённую запись.",
    "personalNote": "Пока доступен самостоятельный формат с автоподбором модели, а не живой ИИ-чат или терапия. Запись подтверждается отдельно.",
    "alchemyNote": "Гомеопатия необязательна, её лечебная эффективность не доказана; она не заменяет медицинскую помощь.",
    "energyNote": "Это символическая и личная практика, не лечение. Мастер подтверждает каждую заявку.",
    "masterNote": "Публикация проходит модерацию. Вводные курсы не дают профессиональной квалификации.",
    "privacy": "Личные тесты, отчёты и прогресс остаются в защищённом кабинете My Space."
  },
  "es": {
    "heading": "Tu camino en Holistic House",
    "eyebrow": "AVANZA A TU RITMO",
    "sectionCounter": "PASO",
    "modules": {
      "freeCourses": {
        "title": "Cursos gratuitos",
        "lead": "Empieza con una práctica gratuita y avanza a tu ritmo.",
        "offers": [
          {
            "id": "opora",
            "title": "OPORA · 14 días",
            "body": "Prácticas breves de calma y apoyo personal.",
            "cta": "Explorar curso gratis"
          },
          {
            "id": "reiki",
            "title": "Reiki Practitioner · gratis",
            "body": "Cinco lecciones introductorias con ejercicios y reflexión.",
            "cta": "Empezar gratis"
          }
        ]
      },
      "personality": {
        "title": "Descubre tu personalidad",
        "lead": "Realiza pruebas gratis, crea un perfil privado y un plan de desarrollo.",
        "offers": [
          {
            "id": "tests",
            "title": "Pruebas gratuitas",
            "body": "Conoce tus recursos, fortalezas y desafíos actuales.",
            "cta": "Hacer pruebas"
          },
          {
            "id": "profile",
            "title": "Mi perfil personal",
            "body": "Guarda tus resultados en tu espacio privado.",
            "cta": "Crear mi perfil"
          },
          {
            "id": "plan",
            "title": "Mi plan de desarrollo",
            "body": "Elige tus próximos pasos y sigue tu progreso.",
            "cta": "Abrir mi plan"
          }
        ]
      },
      "situation": {
        "title": "Analiza tu situación",
        "lead": "Explora una pregunta personal, empresarial o familiar.",
        "offers": [
          {
            "id": "review",
            "title": "Análisis exprés gratuito",
            "body": "Envía una pregunta y un dibujo para una revisión escrita personal.",
            "cta": "Solicitar revisión gratis"
          },
          {
            "id": "businessConstellations",
            "title": "Constelación empresarial",
            "body": "Explora roles, relaciones y obstáculos laborales.",
            "cta": "Ver constelaciones empresariales"
          },
          {
            "id": "familyConstellations",
            "title": "Análisis sistémico y familiar",
            "body": "Explora patrones y vínculos que se repiten.",
            "cta": "Conocer el método"
          }
        ]
      },
      "personal": {
        "title": "Coaching y terapia personal",
        "lead": "Prueba una sesión guiada gratuita o consulta con un profesional.",
        "offers": [
          {
            "id": "selfCoaching",
            "title": "Coaching guiado gratis con IA",
            "body": "Responde una pregunta por vez con selección automática de modelo.",
            "cta": "Empezar sesión guiada"
          },
          {
            "id": "personalSession",
            "title": "Sesión con terapeuta o coach",
            "body": "Sesiones personales en línea o en Toronto desde €50 / 30 min.",
            "cta": "Solicitar una sesión"
          }
        ]
      },
      "alchemy": {
        "title": "Trabajo profundo · Alquimia del Alma",
        "lead": "Explora patrones internos mediante imágenes y trabajo sistémico.",
        "offers": [
          {
            "id": "alchemy",
            "title": "Alquimia del Alma",
            "body": "Imágenes guiadas, constelaciones y técnicas complementarias opcionales.",
            "cta": "Conocer el enfoque"
          }
        ]
      },
      "energy": {
        "title": "Apoyo energético",
        "lead": "Solicita apoyo personal a distancia o aprende prácticas de energía.",
        "offers": [
          {
            "id": "energySupport",
            "title": "Apoyo energético a distancia",
            "body": "Consulta una sesión personalizada que requiere confirmación.",
            "cta": "Solicitar apoyo"
          },
          {
            "id": "energyLearning",
            "title": "Aprender trabajo energético",
            "body": "Explora Reiki y otras prácticas personales.",
            "cta": "Explorar formación"
          }
        ]
      },
      "master": {
        "title": "Hazte profesional",
        "lead": "Estudia una formación profesional y publica tus servicios o cursos.",
        "offers": [
          {
            "id": "professional",
            "title": "Formación profesional",
            "body": "Explora la ruta Pro y los programas disponibles.",
            "cta": "Ver formación"
          },
          {
            "id": "service",
            "title": "Publicar mis servicios",
            "body": "Prepara una ficha profesional para revisión.",
            "cta": "Abrir editor de servicios"
          },
          {
            "id": "course",
            "title": "Publicar mis cursos",
            "body": "Prepara lecciones en tu espacio profesional.",
            "cta": "Abrir editor de cursos"
          }
        ]
      }
    },
    "myTests": "Mis pruebas",
    "reports": "Mis informes",
    "growth": "Mi desarrollo",
    "profileNote": "Necesitas una cuenta gratuita para guardar el perfil y el plan de desarrollo.",
    "situationNote": "La revisión gratuita es escrita, no una videollamada. La solicitud no confirma una reserva.",
    "personalNote": "Por ahora es un recorrido autoguiado con selección automática de modelo, no un chat de IA ni terapia en vivo.",
    "alchemyNote": "La homeopatía es opcional, no tiene eficacia médica demostrada y no sustituye la atención sanitaria.",
    "energyNote": "Es una práctica personal y simbólica, no tratamiento médico. El profesional debe confirmar cada solicitud.",
    "masterNote": "Las publicaciones requieren revisión; los cursos introductorios no otorgan una cualificación profesional.",
    "privacy": "Los resultados, informes y avances permanecen privados en My Space."
  }
} as const;

export function HomeFeaturedWorkspace({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const space = useHomePersonalSpace();
  const signedIn = space?.status === "ready" && Boolean(space.summary);
  // Private account routes currently support EN and RU. Public ES remains ES.
  const accountLocale = locale === "es" ? "en" : locale;
  const accountRoot = "/" + accountLocale + "/app";
  const hrefs: Record<OfferId, string> = {
    opora: "/" + locale + "/courses/antistress",
    reiki: "/" + locale + "/academy/principles-of-energywork/learn",
    tests: "/" + locale + "/client/tests",
    profile: accountRoot + "/portrait",
    plan: accountRoot + "/portfolio#hh-development-program",
    review: "/" + locale + "/services/free-situation-review",
    businessConstellations: "/" + locale + "/services/business-consulting",
    familyConstellations: "/" + locale + "/services/systemic-constellations",
    selfCoaching: accountRoot + "/coaching",
    personalSession: "/" + locale + "/services#consultation",
    alchemy: "/" + locale + "/services/alchemy-of-soul",
    energySupport: "/" + locale + "/services/remote-energy-support",
    energyLearning: "/" + locale + "/academy/principles-of-energywork",
    professional: "/" + locale + "/pro",
    service: accountRoot + "/practice?panel=services",
    course: accountRoot + "/practice?panel=materials&materialTab=courses",
  };

  return (
    <section id="home-my-space-features" className={styles.root}
      data-home-featured-workspace aria-labelledby="hh-home-features-title">
      <h2 className={styles.srOnly} id="hh-home-features-title">{t.heading}</h2>
      <nav className={styles.stepNav} aria-label={t.heading} data-home-step-navigation>
        {moduleIds.map((id, index) => (
          <Link key={id} href={"#home-step-" + (index + 1)} prefetch={false} className={styles.stepLink}>
            <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>
            <span>{t.modules[id].title}</span>
          </Link>
        ))}
      </nav>
      <div className={styles.sections}>
        {moduleIds.map((id, index) => {
          const section = t.modules[id];
          const footer = id === "personality" && signedIn
            ? { href: accountRoot + "/tests", label: t.myTests }
            : null;
          return (
            <section id={"home-step-" + (index + 1)} className={styles.section} data-home-module={id}
              aria-labelledby={"hh-home-" + id + "-title"} key={id}>
              <header className={styles.sectionHeading}>
                <p className={styles.eyebrow}>{t.eyebrow} <span aria-hidden="true">·</span> {t.sectionCounter} {index + 1}/{moduleIds.length}</p>
                <h3 id={"hh-home-" + id + "-title"}>{section.title}</h3>
                <p className={styles.lead}>{section.lead}</p>
              </header>
              <div className={styles.offers} data-home-module-offers={id}>
                {section.offers.map(offer => (
                  <Link key={offer.id} href={hrefs[offer.id]} prefetch={false}
                    className={styles.offer} data-home-module-action={offer.id}>
                    <span className={styles.photo} aria-hidden="true">
                      <Image src={photos[offer.id]} alt="" fill unoptimized loading="lazy"
                        sizes="(max-width: 640px) 120px, (max-width: 920px) 160px, 190px" />
                    </span>
                    <span className={styles.offerBody}>
                      <strong className={styles.offerTitle}>{offer.title}</strong>
                      <span className={styles.offerDetail}>{offer.body}</span>
                      <span className={styles.offerAction}>{offer.cta}<ArrowRight size={16} aria-hidden="true" /></span>
                    </span>
                  </Link>
                ))}
              </div>
              {(footer || id === "personality" || id === "situation" || id === "personal" || id === "alchemy" || id === "energy" || id === "master") && (
                <footer className={styles.sectionFooter}>
                  {footer && <Link href={footer.href} prefetch={false} className={styles.extraLink}>
                    {footer.label}<ArrowRight size={15} aria-hidden="true" />
                  </Link>}
                  {id === "personality" && <p>{t.profileNote}</p>}
                  {id === "situation" && <p>{t.situationNote}</p>}
                  {id === "personal" && <p>{t.personalNote}</p>}
                  {id === "alchemy" && <p>{t.alchemyNote}</p>}
                  {id === "energy" && <p>{t.energyNote}</p>}
                  {id === "master" && <p>{t.masterNote}</p>}
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
