"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronDown, ShieldCheck, Target } from "lucide-react";
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
  "review": "/images/holistic-house/portrait-static/andy-640-25ce838f1a6e.webp",
  "businessConstellations": "/images/holistic-house/video-posters/constellations-en-v1.webp",
  "constellations": "/images/holistic-house/hero-olive-incense.webp",
  "aiCoaching": "/images/holistic-house/course-start-heron.webp",
  "therapist": "/images/holistic-house/video-posters/services-en-v2.webp",
  "alchemy": "/images/holistic-house/hero-olive-incense.webp",
  "energy": "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  "pro": "/images/holistic-house/reiki-approved-sunrise-v3.webp",
  "service": "/images/holistic-house/portrait-static/andy-828-3dcbabded1e9.webp",
  "course": "/images/holistic-house/portrait-static/andy-640-25ce838f1a6e.webp"
} as const;
type OfferId = keyof typeof photos;
// Only explicitly no-cost offerings receive the red corner mark.
// Academy is a mixed-price catalog; registration and paid services are not free offers.
const freeOfferIds: ReadonlySet<OfferId> = new Set([
  "reiki", "opora", "profile", "review", "aiCoaching",
]);
const freeBadgeLabels = { en: "FREE", ru: "БЕСПЛАТНО", es: "GRATIS" } as const;
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
            "cta": "Start Reiki course free"
          },
          {
            "id": "opora",
            "title": "OPORA · 14 days",
            "body": "Practical daily exercises to support balance and resilience.",
            "cta": "Open free OPORA course"
          },
          {
            "id": "academy",
            "title": "Explore the Academy",
            "body": "Find other courses and learning pathways.",
            "cta": "Explore Academy courses"
          }
        ]
      },
      "personality": {
        "title": "Personality Profiles",
        "lead": "One personal or business profile, with free tests, a reflective SWOT and a private development path.",
        "offers": [
          {
            "id": "profile",
            "title": "Personality Profiles · free",
            "body": "Choose the themes and scales that matter to you. Build a test set and plan your next steps.",
            "cta": "Build my free profile"
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
            "cta": "Request free written review"
          },
          {
            "id": "businessConstellations",
            "title": "Business constellation",
            "body": "Explore roles, team dynamics and business decisions.",
            "cta": "Request business session"
          },
          {
            "id": "constellations",
            "title": "Systemic & family constellation",
            "body": "Explore family patterns, relationships and recurring situations.",
            "cta": "Request family constellation"
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
            "cta": "Request a session · from €50"
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
            "cta": "Request an Alchemy session"
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
            "cta": "Explore professional study"
          },
          {
            "id": "service",
            "title": "Offer your services",
            "body": "Create a practitioner service listing for moderation.",
            "cta": "List my service"
          },
          {
            "id": "course",
            "title": "Publish your own courses",
            "body": "Prepare your course in My Practice for review before publication.",
            "cta": "Create my course"
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
            "cta": "Пройти курс Рейки бесплатно"
          },
          {
            "id": "opora",
            "title": "ОПОРА · 14 дней",
            "body": "Короткие ежедневные упражнения для устойчивости и равновесия.",
            "cta": "Пройти курс ОПОРА бесплатно"
          },
          {
            "id": "academy",
            "title": "Все курсы Академии",
            "body": "Другие программы и направления обучения.",
            "cta": "Выбрать курс Академии"
          }
        ]
      },
      "personality": {
        "title": "Профили личности",
        "lead": "Одна услуга: личностный или бизнес-профиль, бесплатные тесты, SWOT и программа развития.",
        "offers": [
          {
            "id": "profile",
            "title": "Профили личности · бесплатно",
            "body": "Выберите интересующие сферы и шкалы, настройте тесты и свой путь развития.",
            "cta": "Создать профиль бесплатно"
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
            "cta": "Заказать бесплатный письменный разбор"
          },
          {
            "id": "businessConstellations",
            "title": "Бизнес-расстановка",
            "body": "Исследуйте роли в команде, бизнес-решения и препятствия.",
            "cta": "Запросить бизнес-расстановку"
          },
          {
            "id": "constellations",
            "title": "Системный анализ и семейная расстановка",
            "body": "Исследуйте повторяющиеся семейные и жизненные сценарии.",
            "cta": "Запросить семейную расстановку"
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
            "cta": "Пройти коуч-сессию бесплатно"
          },
          {
            "id": "therapist",
            "title": "Сессия с терапевтом / коучем",
            "body": "Индивидуальная работа онлайн или в Торонто · от €50 за 30 минут.",
            "cta": "Запросить сессию · от €50"
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
            "cta": "Запросить Алхимию души"
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
            "cta": "Заказать энергетическую поддержку"
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
            "cta": "Выбрать обучение"
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
            "cta": "Создать свой курс"
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
            "cta": "Empezar Reiki gratis"
          },
          {
            "id": "opora",
            "title": "OPORA · 14 días",
            "body": "Ejercicios cotidianos de apoyo y equilibrio.",
            "cta": "Abrir OPORA gratis"
          },
          {
            "id": "academy",
            "title": "Explora la Academia",
            "body": "Descubre otros cursos y caminos de aprendizaje.",
            "cta": "Explorar la Academia"
          }
        ]
      },
      "personality": {
        "title": "Perfiles personales",
        "lead": "Un único servicio: perfil personal o empresarial, pruebas gratuitas, DAFO y desarrollo.",
        "offers": [
          {
            "id": "profile",
            "title": "Perfiles personales · gratis",
            "body": "Elige áreas y escalas, prepara tus pruebas y planifica tus próximos pasos.",
            "cta": "Crear mi perfil gratis"
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
            "cta": "Solicitar revisión escrita gratis"
          },
          {
            "id": "businessConstellations",
            "title": "Constelación de negocios",
            "body": "Explora roles de equipo y decisiones empresariales.",
            "cta": "Solicitar sesión empresarial"
          },
          {
            "id": "constellations",
            "title": "Análisis sistémico y constelación familiar",
            "body": "Explora relaciones, patrones familiares y situaciones recurrentes.",
            "cta": "Solicitar constelación familiar"
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
            "cta": "Empezar coaching gratis"
          },
          {
            "id": "therapist",
            "title": "Sesión con terapeuta / coach",
            "body": "Consulta individual en línea o Toronto · desde 50 € por 30 minutos.",
            "cta": "Solicitar sesión · desde 50 €"
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
            "cta": "Solicitar sesión de Alquimia"
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
            "cta": "Solicitar apoyo energético"
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
            "cta": "Explorar formación Pro"
          },
          {
            "id": "service",
            "title": "Publicar mis servicios",
            "body": "Crea un anuncio profesional sujeto a revisión.",
            "cta": "Publicar mis servicios"
          },
          {
            "id": "course",
            "title": "Compartir mis cursos",
            "body": "Prepara tu curso dentro de tu espacio profesional.",
            "cta": "Crear mi curso"
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

const offerDetails = {
  "en": {
    "reiki": "Five introductory lessons with exercises and reflection. Initiation is arranged separately; completion does not confer professional qualification. You can explore each lesson before choosing whether to continue. Reflection is personal; the free introduction is distinct from any later initiation or paid training.",
    "opora": "Fourteen days of guided self-support. Open the course page to select a suitable route and start; progress is not a medical result. The course introduces the aim of each practice and a manageable exercise for the day. You decide whether the format suits you before starting; no improvement is guaranteed.",
    "academy": "Explore existing programmes and their access terms. Some courses may require payment. Open the catalogue to compare topics, format and availability. Pick a specific programme to see its full description and conditions instead of enrolling automatically.",
    "allTests": "Choose a topic and complete a self-check. The result supports reflection, not medical diagnosis. The test explorer lets you choose a topic and view the relevant explanation of results. Use the outcome as a starting point for your own development rather than a medical assessment.",
    "profile": "Choose a personal, business, wellbeing or comprehensive profile on a public page. Select your themes and scales; the suggested free tests match actual questionnaire axes, not fictional financial or medical scores. Edit the test set before beginning. After the tests, sign in if you want to save available results, reflect with SWOT and set voluntary goals in your private development path.",
    "growth": "Your private development path links available insights with next steps; an account is required to retain progress. See your development area after signing in and choose the next activities that make sense to you. Your saved steps belong to the protected account, not the public page.",
    "review": "Share one question, a short form and a drawing. This is a request for a written response, not a call or confirmed booking. On the service page you can learn which information and simple drawing to provide. Andrey reviews your request before any personal written response; no live consultation or instant result is implied.",
    "businessConstellations": "Review business constellations and request a session. Availability and any fees must be confirmed with the practitioner. The service description explains what can be explored in a work or organisational situation. You can then request a meeting and agree its scope, time and price with the practitioner.",
    "constellations": "Explore family-system patterns with a practitioner. Your request is not an automatic reservation. Learn how the approach can be used to reflect on roles, boundaries and repeated relationship situations. Decide whether to request an individual session; the practitioner confirms the arrangement.",
    "aiCoaching": "One question per screen, with automatic coaching-model selection. This is self-guided, not live AI therapy. Use the public Coaching Lounge to choose among published models and answer guided questions. The guest experience runs in your browser and is not a private saved therapy appointment.",
    "therapist": "Personal sessions are €50/30 minutes or €100/60 minutes. A request is not a confirmed appointment. Choose whether a shorter or longer conversation suits your question. A request opens the existing consultation flow; the practitioner confirms the time and payment details separately.",
    "alchemy": "Guided imagery and systemic work, with optional complementary practices. Homeopathy does not replace medical care. The full service page introduces the approach and its limitations so you can decide whether to request personal work. Symbolic or complementary elements are optional, not proven medical treatments.",
    "energy": "Choose a distance-support format and send a request. A practitioner must confirm it; clicking does not charge you. See the available support format, practitioner options and request process. No session, talisman or charge is created by the button; confirmation is a separate step.",
    "pro": "Review the training paths and requirements. Introductory learning does not itself grant a professional credential. Compare the available learning and professional-practice options before applying. Check the actual course requirements and do not treat an introductory lesson as professional accreditation.",
    "service": "Sign in to My Practice to prepare your service listing. Publication requires moderation and appropriate access. You can edit your offer in the authorised practitioner workspace, including an explanation of the format. Submitting it for review is separate from publishing it on the site.",
    "course": "Create course lessons in My Practice. Publication requires review; no payment is processed by this button. Prepare your own lessons and materials within your authorised practice area. Publication and any paid access require further approval; this link only opens the editor."
  },
  "ru": {
    "reiki": "Пять вводных уроков с практикой и рефлексией. Посвящение согласуется отдельно; курс не присваивает профессиональную квалификацию. Вы сможете знакомиться с темами уроков последовательно и решать, продолжать ли практику. Бесплатное введение не равно посвящению или последующему платному обучению.",
    "opora": "Четырнадцать дней самостоятельной поддержки. На странице курса можно выбрать маршрут; прогресс не является медицинским результатом. Перед упражнением объясняется его цель и предлагается конкретная задача на день. Вы сами выбираете комфортный темп; программа не обещает медицинского результата.",
    "academy": "Посмотрите программы и условия доступа. Некоторые курсы Академии могут быть платными. Откройте каталог, сравните темы и форматы обучения. На странице выбранного курса указаны подробности и условия доступа; автоматической записи здесь нет.",
    "allTests": "Выберите тему и пройдите самопроверку. Результат служит самопознанию, а не медицинскому диагнозу. Каталог поможет выбрать тест по интересующей теме и познакомиться с объяснением результата. Используйте его как основу для размышления и планирования, а не для постановки диагноза.",
    "profile": "Выберите личностный, бизнес-, ресурсный или комплексный профиль на отдельной публичной странице. Отметьте сферы и шкалы; бесплатные тесты предлагаются по реально заявленным шкалам, без вымышленных финансовых или медицинских баллов. Перед началом измените подбор. После тестов можно сохранить результаты в защищённом кабинете, осмыслить SWOT и поставить добровольные цели развития.",
    "growth": "Путь развития собирает доступные рекомендации и следующие шаги. Для сохранения нужен аккаунт. После входа откройте индивидуальный раздел развития, посмотрите доступные рекомендации и выберите следующий шаг. Личный прогресс не выводится на общедоступную страницу.",
    "review": "Один вопрос, краткая анкета и рисунок от руки. Это заявка на письменный ответ, не видеозвонок или подтверждённая бронь. На странице услуги подробно объясняется, какой вопрос, анкета и рисунок нужны для разбора. Андрей сначала получает заявку; письменный ответ не является мгновенной услугой или живой сессией.",
    "businessConstellations": "Изучите метод и запросите сессию. Время и стоимость подтверждаются со специалистом. На странице метода описаны возможные темы для работы с бизнесом, ролями и командой. После ознакомления можно запросить встречу и согласовать цели, время и стоимость.",
    "constellations": "Изучите семейные сценарии и запросите работу с практиком. Запрос ещё не является записью. Узнайте, как в системном подходе рассматривают роли, отношения и повторяющиеся ситуации. Затем можно отправить запрос на индивидуальную работу, который специалист подтвердит отдельно.",
    "aiCoaching": "По одному вопросу на экран с автоматическим подбором модели. Пока это самостоятельный формат, не живой ИИ-терапевт. Публичная гостиная позволяет выбрать опубликованную модель, затем отвечать по одному вопросу на экран. Гостевые ответы остаются в текущем сеансе браузера и не создают запись к терапевту.",
    "therapist": "Стоимость личной сессии: €50 за 30 минут или €100 за 60 минут. Запись подтверждается отдельно. Можно выбрать короткую или часовую встречу в зависимости от запроса. Кнопка ведёт к существующей форме обращения; время сессии и оплату согласуют отдельно.",
    "alchemy": "Работа с образами и расстановками, дополнительные практики по желанию. Гомеопатия не заменяет лечение. Полное описание знакомит с методом и ограничениями, чтобы вы могли решить, подходит ли индивидуальная работа. Символические дополнительные подходы добровольны и не являются доказанным медицинским лечением.",
    "energy": "Выберите формат дистанционной поддержки и оставьте запрос. Мастер подтверждает его до записи и оплаты. На странице указаны формат дистанционной практики и порядок обращения к мастеру. Ни сессия, ни талисман, ни оплата не оформляются автоматически одним нажатием.",
    "pro": "Изучите программы и условия подготовки. Вводный курс не присваивает профессиональную квалификацию. Сравните программы, требования к подготовке и варианты дальнейшей практики. Не считайте ознакомительный урок подтверждением профессиональной квалификации.",
    "service": "Войдите в My Practice и подготовьте карточку услуги. Публикация проходит модерацию. В авторизованном кабинете мастера можно составить описание своей услуги и подготовить её к проверке. Отправка карточки не означает автоматическую публикацию.",
    "course": "Соберите уроки в My Practice. Курс публикуется после проверки, а не автоматически по нажатию. Подготовьте собственные уроки и материалы в кабинете мастера. Публикация и возможный платный доступ требуют отдельной проверки; кнопка только открывает редактор."
  },
  "es": {
    "reiki": "Cinco lecciones introductorias y reflexión. La iniciación se acuerda aparte y no otorga cualificación profesional. Puedes conocer las lecciones una por una y decidir si deseas continuar. El curso introductorio gratuito es distinto de cualquier iniciación o formación profesional posterior.",
    "opora": "Catorce días de apoyo autoguiado. Abre el programa para elegir un recorrido; el avance no es un resultado médico. Antes de cada práctica se explica su objetivo y una tarea cotidiana concreta. Elige tu propio ritmo; no se promete un resultado clínico.",
    "academy": "Explora los programas y sus condiciones; algunos cursos pueden ser de pago. Abre el catálogo para comparar temas, formato y condiciones de acceso. Cada curso tiene su propia información y no se reserva automáticamente.",
    "allTests": "Elige un tema y haz una prueba de autorreflexión. No es un diagnóstico médico. El explorador permite elegir el tema y leer la explicación de los resultados. Úsalo para reflexionar y planificar, no como evaluación médica.",
    "profile": "Elige un perfil personal, empresarial, de bienestar o integral en una página pública. Selecciona temas y escalas; las pruebas gratuitas corresponden a escalas reales, sin inventar puntuaciones de salud ni dinero. Ajusta la selección antes de empezar. Luego puedes guardar resultados disponibles, reflexionar con DAFO y definir metas privadas de desarrollo.",
    "growth": "Tu plan privado reúne ideas y próximos pasos. Necesitas una cuenta para guardar avances. Después de iniciar sesión, revisa recomendaciones y elige los siguientes pasos de desarrollo. Tus avances privados no aparecen en la página pública.",
    "review": "Una pregunta, un formulario breve y un dibujo. Es una solicitud de revisión escrita, no una cita confirmada. La página explica qué pregunta, formulario y dibujo preparar. La solicitud se revisa antes de la respuesta escrita; no es una llamada ni un resultado inmediato.",
    "businessConstellations": "Conoce el método y solicita una sesión empresarial. Precio y disponibilidad se confirman aparte. Conoce qué problemas de equipo y decisiones se pueden explorar. Después solicita una reunión para confirmar objetivos, duración y precio con el profesional.",
    "constellations": "Explora patrones familiares con un profesional. Enviar la solicitud no reserva la sesión. Lee cómo se exploran roles y patrones familiares o relacionales. Puedes pedir una sesión personal, sujeta a confirmación.",
    "aiCoaching": "Una pregunta por pantalla con selección automática de modelo. Es autoguiado, no terapia de IA en vivo. Entra en la sala pública, elige un modelo y responde a las preguntas una a una. La sesión de invitado no crea una cita terapéutica ni guarda un expediente privado.",
    "therapist": "Sesiones personales de 30 minutos por 50 € o 60 minutos por 100 €. La cita requiere confirmación. Elige una conversación corta o larga según tus objetivos. Este enlace abre la solicitud; horario y pago se confirman por separado.",
    "alchemy": "Imágenes guiadas y constelaciones, con métodos complementarios opcionales; la homeopatía no sustituye la medicina. Conoce el enfoque completo y sus límites antes de solicitar una sesión. Los métodos simbólicos adicionales son opcionales y no sustituyen tratamientos médicos probados.",
    "energy": "Elige un formato y solicita apoyo remoto. El profesional confirma antes de reservar o cobrar. Consulta los formatos a distancia y el proceso de solicitud. La sesión, el talismán o el pago no se confirman al pulsar este enlace.",
    "pro": "Explora requisitos y programas. Los cursos introductorios no otorgan cualificación profesional. Compara los programas y requisitos antes de inscribirte. Un curso introductorio no otorga por sí solo acreditación profesional.",
    "service": "Inicia sesión en My Practice para preparar tu anuncio; requiere revisión antes de publicarse. Edita la descripción de tus servicios en el espacio profesional autorizado. Enviar la ficha para revisión no significa publicarla automáticamente.",
    "course": "Organiza tus lecciones en My Practice. Publicar requiere revisión, sin pago automático. Prepara lecciones y materiales en tu espacio profesional. La publicación y cualquier acceso de pago requieren una revisión adicional."
  }
} as const;
const detailLabels = {
  en: { open: "Details", close: "Hide details", mobileClose: "Close", heading: "What to expect", full: "View full information" },
  ru: { open: "Детали", close: "Скрыть детали", mobileClose: "Скрыть", heading: "Как это работает", full: "Открыть полное описание" },
  es: { open: "Detalles", close: "Ocultar detalles", mobileClose: "Cerrar", heading: "Cómo funciona", full: "Ver información completa" },
} as const;
const compactActions = {
  "en": {
    "reiki": "Start free",
    "opora": "Start free",
    "academy": "Courses",
    "allTests": "Free test",
    "profile": "Profile",
    "growth": "My plan",
    "review": "Free review",
    "businessConstellations": "Request",
    "constellations": "Request",
    "aiCoaching": "Start free",
    "therapist": "Request",
    "alchemy": "Request",
    "energy": "Support",
    "pro": "Training",
    "service": "List",
    "course": "Create",
    "guestProfile": "Sign in",
    "guestGrowth": "Sign in"
  },
  "ru": {
    "reiki": "Начать",
    "opora": "Начать",
    "academy": "Курсы",
    "allTests": "Тест",
    "profile": "Профиль",
    "growth": "Мой план",
    "review": "Разбор",
    "businessConstellations": "Запросить",
    "constellations": "Запросить",
    "aiCoaching": "Начать",
    "therapist": "Запросить",
    "alchemy": "Запросить",
    "energy": "Поддержка",
    "pro": "Обучение",
    "service": "Услуга",
    "course": "Курс",
    "guestProfile": "Войти",
    "guestGrowth": "Войти"
  },
  "es": {
    "reiki": "Empezar",
    "opora": "Empezar",
    "academy": "Cursos",
    "allTests": "Test gratis",
    "profile": "Perfil",
    "growth": "Mi plan",
    "review": "Revisión",
    "businessConstellations": "Solicitar",
    "constellations": "Solicitar",
    "aiCoaching": "Empezar",
    "therapist": "Solicitar",
    "alchemy": "Solicitar",
    "energy": "Apoyo",
    "pro": "Formación",
    "service": "Publicar",
    "course": "Crear",
    "guestProfile": "Entrar",
    "guestGrowth": "Entrar"
  }
} as const;

export function HomeFeaturedWorkspace({ locale }: { locale: PublicLocale }) {
  const [expandedOffer, setExpandedOffer] = useState<OfferId | null>(null);
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
    profile: "/" + locale + "/personality-profiles",
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
                <div className={styles.sectionKicker}>
                  <p className={styles.eyebrow}>{t.sectionCounter} {index + 1}/{moduleIds.length}</p>
                  <span className={styles.progressTrack} aria-hidden="true">
                    <span style={{ width: `${Math.round(((index + 1) / moduleIds.length) * 100)}%` }} />
                  </span>
                </div>
                <h2 id={"hh-home-" + id + "-title"}>{section.title}</h2>
                <p className={styles.lead}>{section.lead}</p>
              </header>
              <div className={styles.offers} data-home-module-offers={id}>
                {section.offers.map(offer => {
                  const expanded = expandedOffer === offer.id;
                  const isFree = freeOfferIds.has(offer.id);
                  const actionLabel = offer.cta;
                  const compactLabel = compactActions[locale][offer.id];
                  return (
                    <article key={offer.id} className={styles.offer} data-home-offer-card={offer.id}
                      data-expanded={expanded ? "true" : "false"}
                      data-home-offer-free={isFree ? "true" : undefined}>
                      {isFree && <span className={styles.offerFreeBadge}>{freeBadgeLabels[locale]}</span>}
                      <span className={styles.photo} aria-hidden="true">
                        <Image src={photos[offer.id]} alt="" fill unoptimized loading="lazy"
                          sizes="(max-width: 350px) 100px, (max-width: 640px) 148px, (max-width: 920px) 180px, 230px" />
                      </span>
                      <div className={styles.offerContent}>
                        <div className={styles.offerBody}>
                          <h3 className={styles.offerTitle}>{offer.title}</h3>
                          <p className={styles.offerDetail}>{offer.body}</p>
                        </div>
                        <div className={styles.offerControls}>
                          <button type="button" className={styles.offerSecondary}
                            onClick={() => setExpandedOffer(expanded ? null : offer.id)}
                            aria-controls={"home-offer-info-" + offer.id} aria-expanded={expanded}
                            data-home-offer-details={offer.id}
                            aria-label={expanded ? detailLabels[locale].close : detailLabels[locale].open}>
                            <span className={styles.actionFull} aria-hidden="true">{expanded ? detailLabels[locale].close : detailLabels[locale].open}</span>
                            <span className={styles.actionCompact} aria-hidden="true">{expanded ? detailLabels[locale].mobileClose : detailLabels[locale].open}</span>
                            <ChevronDown className={styles.detailChevron} size={16} aria-hidden="true" />
                          </button>
                          <Link href={hrefs[offer.id]} prefetch={false} className={styles.offerPrimary}
                            aria-label={actionLabel}
                            data-home-module-action={offer.id} data-home-offer-primary={offer.id}>
                            <span className={styles.actionFull} aria-hidden="true">{actionLabel}</span>
                            <span className={styles.actionCompact} aria-hidden="true">{compactLabel}</span>
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                        </div>
                      </div>
                      <div id={"home-offer-info-" + offer.id} hidden={!expanded} className={styles.offerMore}>
                        <h4 className={styles.offerMoreTitle}>{detailLabels[locale].heading}</h4>
                        <p>{offerDetails[locale][offer.id]}</p>
                        <Link href={hrefs[offer.id]} prefetch={false} className={styles.offerMoreLink}>
                          {detailLabels[locale].full}<ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </article>
                  );
                })}
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
