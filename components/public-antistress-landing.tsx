"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ArrowRight, BookOpenCheck, CalendarDays, Check, ChevronDown, CircleHelp, Clock3, Heart, Leaf, LockKeyhole, PauseCircle, ShieldCheck, Sparkles, Target, Waves } from "lucide-react";
import { PublicSiteHeader } from "@/components/public-site-header";
import Course14DayOverview from "@/components/app/course-14-day-overview";
import { PublicAntistressRouteMap } from "@/components/public-antistress-route-map";
import { oporaRecoveryStages } from "@/lib/inner-growth/antistress-recovery-pathway";
import { ANTISTRESS_ROUTER_VERSION, antistressModuleTitle } from "@/lib/inner-growth/antistress-module-router";
import { moduleDayMeta } from "@/lib/inner-growth/antistress-module-lessons";
import { antiStressBlueprint } from "@/lib/inner-growth/anti-stress-blueprint";
import { PublicAntistressEvidence } from "@/components/public-antistress-evidence";
import CourseHomeScreenHabit from "@/components/pwa/course-home-screen-habit";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./public-antistress-landing.module.css";

const copy = {
  "ru": {
    "eyebrow": "HOLISTIC HOUSE · ОПОРА",
    "brand": "ОПОРА",
    "heroTitle": "Антистресс",
    "heroLine": "Меньше борьбы с собой. Больше внутренней опоры.",
    "heroText": "14 коротких занятий, чтобы замечать напряжение раньше, находить посильную паузу и пробовать способы поддержки, которые подходят именно вам.",
    "heroImageAlt": "Человек на фоне спокойного горного пейзажа — образ паузы и личной опоры",
    "heroImageLine": "Спокойствие не нужно заслуживать.",
    "free": "Первый курс бесплатно",
    "factDays": "14 занятий",
    "factSkills": "6 маршрутов",
    "factTime": "В своём темпе",
    "start": "Начать курс бесплатно",
    "explore": "Посмотреть программу",
    "howLink": "Как проходит курс",
    "subtle": "Без автоматической записи. Выбор тестов и сохранение прогресса — после вашего согласия.",
    "back": "Все курсы",
    "method": "Метод ОПОРА",
    "today": "Представьте одну спокойную паузу — этого достаточно для начала.",
    "forEyebrow": "УЗНАЁТЕ СЕБЯ?",
    "forTitle": "Когда напряжение стало привычным фоном",
    "forLead": "Этот курс для обычных напряжённых дней, когда хочется не заставить себя «стать спокойным», а найти более бережный способ справляться.",
    "pains": [
      {
        "title": "Трудно выключить мысли",
        "text": "День закончился, а внутренний диалог всё ещё продолжается."
      },
      {
        "title": "Напряжение копится",
        "text": "Пауза нужна, но не всегда понятно, с чего начать."
      },
      {
        "title": "Сил становится меньше",
        "text": "Хочется восстановиться, не превращая отдых в новую обязанность."
      },
      {
        "title": "Сложно сказать «стоп»",
        "text": "Собственные границы и потребности часто остаются на втором плане."
      }
    ],
    "outcomeEyebrow": "ЧТО МОЖНО ОСВОИТЬ",
    "outcomeTitle": "Практические результаты, а не обещания чудес",
    "outcomes": [
      {
        "title": "Замечать сигналы раньше",
        "text": "Узнать собственные признаки напряжения и перегрузки."
      },
      {
        "title": "Выбирать подходящую паузу",
        "text": "Опробовать мягкую, короткую и нейтральную альтернативу."
      },
      {
        "title": "Меньше спорить с мыслями",
        "text": "Потренироваться отличать факт от тревожного предположения."
      },
      {
        "title": "Собрать личный набор опор",
        "text": "Отобрать 2–3 способа, которые реально пригодились вам."
      }
    ],
    "skillsEyebrow": "ПРОГРАММА НА 14 ДНЕЙ",
    "skillsTitle": "7 навыков устойчивости: сначала освоение, затем углубление.",
    "skillsLead": "Первая неделя — 7 практических навыков. Вторая неделя — те же 7 навыков, но с большей самостоятельностью. Для других тематических маршрутов сохраняются собственные уроки.",
    "daysWord": "Дни",
    "dayWord": "День",
    "skills": [
      {
        "days": "01–02",
        "title": "Ориентация и право выбора",
        "description": "Найти простой внешний ориентир, сохранить возможность начать, пропустить или остановиться.",
        "d1": "Я здесь, и могу выбирать",
        "d2": "Я могу возвращать внимание"
      },
      {
        "days": "03–04",
        "title": "Ранние признаки перегрузки",
        "description": "Замечать один личный сигнал и отличать сильное напряжение от нехватки сил.",
        "d1": "Мой первый признак перегрузки",
        "d2": "Суета и усталость требуют разной поддержки"
      },
      {
        "days": "05–06",
        "title": "Мягкая регуляция",
        "description": "Пробовать комфортную позу, небольшую паузу и регулировать интенсивность упражнения.",
        "d1": "Пауза для тела и внимания",
        "d2": "Выбираю комфортную нагрузку и место для отдыха"
      },
      {
        "days": "07–08",
        "title": "Ресурсы и восстановление",
        "description": "Находить реальные опоры, а при желании — спокойный образ; выделять место отдыху.",
        "d1": "Мои реальные ресурсы",
        "d2": "Мой ресурсный образ и время отдыха"
      },
      {
        "days": "09–10",
        "title": "Гибкость по отношению к мыслям",
        "description": "Отличать предположение от факта и выбирать маленький посильный следующий шаг.",
        "d1": "Тревожная мысль — не факт",
        "d2": "Факт, догадка и маленькое решение"
      },
      {
        "days": "11–12",
        "title": "Границы и человеческая поддержка",
        "description": "Репетировать уважительную границу и знать, к кому можно обратиться.",
        "d1": "Граница и добрая внутренняя фраза",
        "d2": "Поддержка другого человека"
      },
      {
        "days": "13–14",
        "title": "Личный протокол антистресс",
        "description": "Выбрать полезные инструменты под разные ситуации и сохранить план на будущее.",
        "d1": "Техника под мою ситуацию",
        "d2": "Моя система поддержки"
      }
    ],
    "processEyebrow": "НЕ ЛЕКЦИИ, А ОПЫТ",
    "processTitle": "Как проходит одно занятие",
    "processLead": "Короткая последовательность: заметить состояние, выбрать фокус, попробовать упражнение и решить, что сохранить.",
    "steps": [
      {
        "number": "01",
        "title": "Тёплый вход",
        "text": "Как вы себя чувствуете сегодня? Можно ответить или пропустить."
      },
      {
        "number": "02",
        "title": "Личный фокус",
        "text": "Вы выбираете важную шкалу или направление, а не получаете навязанную цель."
      },
      {
        "number": "03",
        "title": "Практика",
        "text": "Фото, короткая инструкция, выбор ответа; доступна мягкая альтернатива."
      },
      {
        "number": "04",
        "title": "Небольшой итог",
        "text": "Что оказалось удобным? Что хочется сохранить или изменить?"
      }
    ],
    "samplerEyebrow": "ПОПРОБУЙТЕ ПРЯМО ЗДЕСЬ",
    "samplerTitle": "Один маленький выбор — уже практика",
    "samplerLead": "Представьте, что вы устали после напряжённого дня. Что сейчас было бы комфортнее? Это демонстрация без теста и сохранения данных.",
    "samplerChoices": [
      {
        "label": "Посмотреть на предмет вокруг",
        "response": "Можно на несколько секунд отметить его цвет или форму. Не нужно специально менять дыхание или состояние."
      },
      {
        "label": "Устроиться чуть удобнее",
        "response": "Можно мягко изменить позу или выбрать короткий отдых — только если вам комфортно."
      },
      {
        "label": "Пока ничего не делать",
        "response": "Отказаться или отложить упражнение — тоже полноценный выбор. Здесь не нужно себя заставлять."
      }
    ],
    "samplerEmpty": "Выберите удобный вариант. Правильного ответа нет.",
    "measuresEyebrow": "ОТСЛЕЖИВАНИЕ ИЗМЕНЕНИЙ",
    "measuresTitle": "Вы сможете видеть свою динамику — без давления на цифры",
    "measuresText": "В начале программа предлагает подходящие тесты и шкалы. Если позже появятся сопоставимые измерения, их можно сравнить. Напряжение, восстановленность, повседневная активность и выбранные вами параметры отображаются отдельно. Отсутствие улучшения — тоже честный результат наблюдения.",
    "measuresFoot": "Прохождение уроков и изменение психологических показателей — разные вещи. Наш 14-дневный курс пока не проходил отдельного клинического исследования эффективности.",
    "trustEyebrow": "БЕРЕЖНЫЙ ФОРМАТ",
    "trustTitle": "Вы управляете процессом",
    "trustItems": [
      "Можно не закрывать глаза и не сосредотачиваться на дыхании.",
      "Можно выбрать нейтральную практику, упростить или остановить упражнение.",
      "Не нужно вспоминать травматические события или вызывать сильные переживания.",
      "Результаты и личные записи сохраняются только с вашим согласием."
    ],
    "faqEyebrow": "ВОПРОСЫ И ОТВЕТЫ",
    "faqTitle": "Перед началом",
    "faqs": [
      {
        "q": "Сколько времени занимает занятие?",
        "a": "Ориентир — короткая ежедневная практика, часто около 5–12 минут, в зависимости от урока и выбранного темпа. При необходимости используйте короткий вариант или паузу."
      },
      {
        "q": "Нужно ли проходить все 14 дней подряд?",
        "a": "Нет. Курс рассчитан на 14 занятий, но вы можете делать паузы и возвращаться к сохранённому прогрессу. Два занятия в один день не обязательны."
      },
      {
        "q": "Это курс лечения тревоги или психологической травмы?",
        "a": "Нет. Это самостоятельное обучение навыкам самоподдержки при повседневном стрессе, не лечение ПТСР, шоковой травмы или тревожного расстройства и не замена врачу или психотерапевту."
      },
      {
        "q": "Будут ли тесты?",
        "a": "Да. Перед первым уроком нужно пройти исходный HH Weekly Pulse (8 вопросов о последней неделе). GAD-7 и ресурсный опросник — по желанию. Если недавний совместимый результат Weekly Pulse уже есть, повторять тест не требуется. Позднее сравниваются только совместимые измерения."
      },
      {
        "q": "Что делать, если практика вызывает дискомфорт?",
        "a": "Вы можете сразу остановиться, выбрать нейтральный вариант или пропустить задание. Если трудности сильные или сохраняются, обратитесь к квалифицированному специалисту."
      },
      {
        "q": "Есть ли оплата или обязательная подписка?",
        "a": "Первый активный курс доступен бесплатно. Переход на страницу курса сам по себе не записывает вас и не списывает деньги."
      }
    ],
    "finalEyebrow": "ВАШИ 14 ЗАНЯТИЙ",
    "finalTitle": "Опора начинается с небольшого шага.",
    "finalText": "Не нужно быть «готовым ко всему». Достаточно выбрать, что было бы посильно сегодня.",
    "finalLink": "Начать «ОПОРА — Антистресс»",
    "otherLink": "Узнать о методе ОПОРА",
    "legal": "Образовательная программа для повседневного стресса. Не предназначена для диагностики, лечения ПТСР, шоковых травм или экстренной помощи. При серьёзных симптомах обратитесь за профессиональной поддержкой."
  },
  "en": {
    "eyebrow": "HOLISTIC HOUSE · OPORA",
    "brand": "OPORA",
    "heroTitle": "Stress Relief",
    "heroLine": "Less pressure on yourself. More room to find your footing.",
    "heroText": "Fourteen short lessons to notice tension earlier, make a manageable pause and explore forms of support that work for you.",
    "heroImageAlt": "A person in a calm mountain landscape, illustrating a moment of pause and steadiness",
    "heroImageLine": "You do not have to earn a moment of calm.",
    "free": "Your first course is free",
    "factDays": "14 lessons",
    "factSkills": "6 learning paths",
    "factTime": "At your own pace",
    "start": "Start the free course",
    "explore": "Explore the 14 days",
    "howLink": "How it works",
    "subtle": "Opening the course will not enroll you. Your choices and progress are only saved after consent.",
    "back": "All courses",
    "method": "The OPORA Method",
    "today": "A small, comfortable pause is enough to begin.",
    "forEyebrow": "DOES THIS SOUND FAMILIAR?",
    "forTitle": "When tension becomes part of everyday life",
    "forLead": "Designed for ordinary stressful days, when forcing yourself to 'calm down' is less useful than discovering a gentler response.",
    "pains": [
      {
        "title": "Thoughts won't switch off",
        "text": "The day has ended, but your mind is still busy."
      },
      {
        "title": "Tension keeps building",
        "text": "You need a pause but aren't sure how to begin."
      },
      {
        "title": "Your energy runs low",
        "text": "You want to recharge without making rest another task."
      },
      {
        "title": "It is hard to say 'stop'",
        "text": "Your own needs and boundaries often come last."
      }
    ],
    "outcomeEyebrow": "SKILLS TO EXPLORE",
    "outcomeTitle": "Practical takeaways, not miracle promises",
    "outcomes": [
      {
        "title": "Notice early signs",
        "text": "Identify some of your own signals of stress and overload."
      },
      {
        "title": "Choose a useful pause",
        "text": "Try a brief, gentle alternative that suits your comfort."
      },
      {
        "title": "Relate differently to thoughts",
        "text": "Practise separating a fact from a worrying assumption."
      },
      {
        "title": "Build your personal toolkit",
        "text": "Choose two or three approaches you have genuinely tried."
      }
    ],
    "skillsEyebrow": "YOUR 14-DAY PATH",
    "skillsTitle": "Seven practical stress skills — learn, then deepen.",
    "skillsLead": "Week one introduces all seven skills. Week two revisits each with more independent practice. Specialized routes retain their own lesson plans.",
    "daysWord": "Days",
    "dayWord": "Day",
    "skills": [
      {
        "days": "01–02",
        "title": "Orientation and choice",
        "description": "Find a neutral point of reference and keep the choice to begin, skip or stop.",
        "d1": "I am here, and I can choose",
        "d2": "Returning my attention"
      },
      {
        "days": "03–04",
        "title": "Recognising overload",
        "description": "Notice a personal early signal and distinguish high tension from low energy.",
        "d1": "My first sign of overload",
        "d2": "Busy and exhausted need different support"
      },
      {
        "days": "05–06",
        "title": "Gentle regulation",
        "description": "Try a comfortable posture, a short pause and your own pace of practice.",
        "d1": "A pause for body and attention",
        "d2": "Choosing a comfortable pace"
      },
      {
        "days": "07–08",
        "title": "Resources and recovery",
        "description": "Find concrete forms of support and, optionally, a calming mental image.",
        "d1": "My real-world resources",
        "d2": "My restorative image and time to rest"
      },
      {
        "days": "09–10",
        "title": "Flexibility with thoughts",
        "description": "Tell a thought from a fact and choose a manageable next step.",
        "d1": "A worrying thought is not a fact",
        "d2": "Facts, assumptions and a small solution"
      },
      {
        "days": "11–12",
        "title": "Boundaries and support",
        "description": "Rehearse a respectful boundary and identify a possible person to turn to.",
        "d1": "A boundary and a kind inner phrase",
        "d2": "Support from another person"
      },
      {
        "days": "13–14",
        "title": "Your personal anti-stress plan",
        "description": "Choose helpful tools for different situations and record a plan for later.",
        "d1": "A tool for my situation",
        "d2": "My support system"
      }
    ],
    "processEyebrow": "PRACTICE, NOT JUST THEORY",
    "processTitle": "What happens in a lesson",
    "processLead": "A small sequence: notice how you are, choose a focus, try something and decide what is worth keeping.",
    "steps": [
      {
        "number": "01",
        "title": "A warm check-in",
        "text": "How are you feeling today? Answer or skip."
      },
      {
        "number": "02",
        "title": "Your own focus",
        "text": "Choose a meaningful area or scale rather than being assigned one."
      },
      {
        "number": "03",
        "title": "Guided practice",
        "text": "An image, brief instructions and a choice of responses, with gentler alternatives."
      },
      {
        "number": "04",
        "title": "A small reflection",
        "text": "What felt useful? What would you keep or adapt?"
      }
    ],
    "samplerEyebrow": "TRY A TINY EXAMPLE",
    "samplerTitle": "One small choice can be a practice",
    "samplerLead": "Imagine you have had a tiring day. What would feel most comfortable now? This demonstration does not test you or save anything.",
    "samplerChoices": [
      {
        "label": "Look at an object nearby",
        "response": "For a few seconds, notice its colour or shape. There is no need to change your breathing or how you feel."
      },
      {
        "label": "Get a little more comfortable",
        "response": "You might gently adjust your posture or rest briefly, only if comfortable."
      },
      {
        "label": "Do nothing for now",
        "response": "Postponing or skipping a practice is a valid choice. You do not have to push yourself here."
      }
    ],
    "samplerEmpty": "Choose any option; there is no right answer.",
    "measuresEyebrow": "NOTICE YOUR CHANGES",
    "measuresTitle": "See your patterns without chasing a score",
    "measuresText": "At the start, you can review suggested questionnaires and choose a suitable focus. If comparable measurements become available later, you can review them separately: perceived stress load, recovery and other self-reported areas. A lack of improvement is also useful information.",
    "measuresFoot": "Lesson completion is not the same as psychological improvement. This specific 14-day course has not been independently clinically validated.",
    "trustEyebrow": "A GENTLER APPROACH",
    "trustTitle": "You stay in control",
    "trustItems": [
      "You do not have to close your eyes or focus on breathing.",
      "Choose a neutral version, simplify or stop an exercise.",
      "There is no requirement to revisit traumatic memories or provoke intense feelings.",
      "Personal choices and notes are saved only with your consent."
    ],
    "faqEyebrow": "COMMON QUESTIONS",
    "faqTitle": "Before you begin",
    "faqs": [
      {
        "q": "How long is each lesson?",
        "a": "Lessons are designed to be brief, often about 5–12 minutes depending on the exercise and your pace. A shorter option or a break may be available."
      },
      {
        "q": "Must I complete 14 days in a row?",
        "a": "No. The programme has 14 lessons, but you can pause and resume your saved progress. You do not need to rush through multiple lessons in a day."
      },
      {
        "q": "Does this treat anxiety disorders or trauma?",
        "a": "No. This is self-guided education for everyday stress, not treatment for PTSD, shock trauma or anxiety disorders, and not a substitute for medical or psychological care."
      },
      {
        "q": "Will I take questionnaires?",
        "a": "Yes. Before the first lesson, complete HH Weekly Pulse (8 questions about the past week). GAD-7 and Resource Pulse are optional. A recent compatible Weekly Pulse result counts without repeating the test; later comparisons require comparable results."
      },
      {
        "q": "What if an exercise feels uncomfortable?",
        "a": "Stop immediately if you wish, choose a neutral option or skip it. For severe or persistent distress, seek support from a qualified professional."
      },
      {
        "q": "Is there a fee or required subscription?",
        "a": "Your first active course is free. Opening the course page does not enrol you or charge you."
      }
    ],
    "finalEyebrow": "YOUR 14 LESSONS",
    "finalTitle": "Finding your footing begins with one small step.",
    "finalText": "You do not have to be ready for everything. Start with what feels manageable today.",
    "finalLink": "Start OPORA Stress Relief",
    "otherLink": "Explore the OPORA Method",
    "legal": "Self-guided education for everyday stress. Not a diagnostic tool, treatment for PTSD or shock trauma, or emergency support. Seek professional care for significant symptoms."
  },
  "es": {
    "eyebrow": "HOLISTIC HOUSE · OPORA",
    "brand": "OPORA",
    "heroTitle": "Antiestrés",
    "heroLine": "Menos exigencia contigo. Más espacio para encontrar apoyo.",
    "heroText": "Catorce lecciones breves para reconocer antes la tensión, hacer una pausa posible y explorar formas de apoyo que se adapten a ti.",
    "heroImageAlt": "Una persona ante un paisaje tranquilo de montaña, imagen de pausa y estabilidad",
    "heroImageLine": "No necesitas ganarte un momento de calma.",
    "free": "Tu primer curso es gratis",
    "factDays": "14 lecciones",
    "factSkills": "6 rutas",
    "factTime": "A tu propio ritmo",
    "start": "Empezar el curso gratis",
    "explore": "Ver los 14 días",
    "howLink": "Cómo funciona",
    "subtle": "Abrir el curso no te inscribe. Tus elecciones y avances solo se guardan con tu consentimiento. El espacio personal se abre en inglés.",
    "back": "Todos los cursos",
    "method": "Método OPORA",
    "today": "Una pausa pequeña y cómoda basta para empezar.",
    "forEyebrow": "¿TE SUENA FAMILIAR?",
    "forTitle": "Cuando la tensión se convierte en una costumbre",
    "forLead": "Para los días de estrés cotidiano en los que exigirte «tranquilidad» ayuda menos que encontrar una respuesta más amable.",
    "pains": [
      {
        "title": "La mente no se desconecta",
        "text": "El día termina, pero los pensamientos siguen dando vueltas."
      },
      {
        "title": "La tensión se acumula",
        "text": "Necesitas una pausa, aunque no sepas por dónde empezar."
      },
      {
        "title": "Te quedas sin energía",
        "text": "Quieres descansar sin convertir el descanso en otra obligación."
      },
      {
        "title": "Cuesta decir «basta»",
        "text": "Tus necesidades y límites quedan a menudo en segundo plano."
      }
    ],
    "outcomeEyebrow": "HABILIDADES PRÁCTICAS",
    "outcomeTitle": "Herramientas concretas, sin promesas milagrosas",
    "outcomes": [
      {
        "title": "Reconocer señales tempranas",
        "text": "Identificar algunas señales personales de sobrecarga."
      },
      {
        "title": "Elegir una pausa útil",
        "text": "Probar una alternativa breve, suave y cómoda para ti."
      },
      {
        "title": "Relacionarte mejor con las ideas",
        "text": "Distinguir hechos de suposiciones inquietantes."
      },
      {
        "title": "Crear tu caja de herramientas",
        "text": "Seleccionar dos o tres recursos que hayas probado realmente."
      }
    ],
    "skillsEyebrow": "TU CAMINO DE 14 DÍAS",
    "skillsTitle": "Siete habilidades prácticas: aprender y profundizar.",
    "skillsLead": "Semana uno: siete habilidades. Semana dos: las mismas siete habilidades practicadas con más autonomía. Las otras rutas tienen sus propios ejercicios.",
    "daysWord": "Días",
    "dayWord": "Día",
    "skills": [
      {
        "days": "01–02",
        "title": "Orientación y elección",
        "description": "Encontrar un punto de referencia neutro y poder comenzar, saltar o detenerte.",
        "d1": "Estoy aquí y puedo elegir",
        "d2": "Volver a dirigir mi atención"
      },
      {
        "days": "03–04",
        "title": "Reconocer la sobrecarga",
        "description": "Notar señales tempranas y distinguir entre mucha tensión y poca energía.",
        "d1": "Mi primera señal de sobrecarga",
        "d2": "El ajetreo y el cansancio necesitan apoyos distintos"
      },
      {
        "days": "05–06",
        "title": "Regulación suave",
        "description": "Probar una postura cómoda, una pequeña pausa y ajustar la intensidad.",
        "d1": "Una pausa para el cuerpo y la atención",
        "d2": "Elegir un ritmo cómodo"
      },
      {
        "days": "07–08",
        "title": "Recursos y recuperación",
        "description": "Encontrar apoyos reales y, si te resulta cómodo, una imagen mental tranquila.",
        "d1": "Mis recursos reales",
        "d2": "Mi imagen reparadora y tiempo para descansar"
      },
      {
        "days": "09–10",
        "title": "Flexibilidad con los pensamientos",
        "description": "Distinguir un pensamiento de un hecho y elegir un siguiente paso posible.",
        "d1": "Un pensamiento preocupante no es un hecho",
        "d2": "Hechos, suposiciones y un pequeño paso"
      },
      {
        "days": "11–12",
        "title": "Límites y apoyo humano",
        "description": "Ensayar un límite respetuoso y reconocer a quién podrías acudir.",
        "d1": "Un límite y una frase amable",
        "d2": "El apoyo de otra persona"
      },
      {
        "days": "13–14",
        "title": "Tu plan personal antiestrés",
        "description": "Elegir herramientas para distintas situaciones y conservar tu plan.",
        "d1": "Una herramienta para mi situación",
        "d2": "Mi sistema de apoyo"
      }
    ],
    "processEyebrow": "PRÁCTICA, NO SOLO TEORÍA",
    "processTitle": "Cómo es una lección",
    "processLead": "Una secuencia sencilla: observar tu estado, elegir un enfoque, probar algo y decidir qué conservar.",
    "steps": [
      {
        "number": "01",
        "title": "Una bienvenida cálida",
        "text": "¿Cómo te sientes hoy? Puedes responder o saltar."
      },
      {
        "number": "02",
        "title": "Tu enfoque",
        "text": "Eliges un área o una escala importante para ti."
      },
      {
        "number": "03",
        "title": "Práctica guiada",
        "text": "Una imagen, instrucciones breves y opciones, con alternativas suaves."
      },
      {
        "number": "04",
        "title": "Pequeña reflexión",
        "text": "¿Qué te resultó útil? ¿Qué quisieras mantener o adaptar?"
      }
    ],
    "samplerEyebrow": "PRUEBA UN EJEMPLO",
    "samplerTitle": "Una pequeña elección ya es una práctica",
    "samplerLead": "Imagina que has tenido un día agotador. ¿Qué te resultaría más cómodo ahora? Este ejemplo no te evalúa ni guarda datos.",
    "samplerChoices": [
      {
        "label": "Mirar un objeto cercano",
        "response": "Durante unos segundos puedes observar su color o forma. No tienes que cambiar la respiración ni tu estado."
      },
      {
        "label": "Ponerte un poco más cómodo",
        "response": "Tal vez prefieras cambiar suavemente de postura o descansar, solo si te resulta agradable."
      },
      {
        "label": "No hacer nada por ahora",
        "response": "Aplazar o saltar una práctica también es una elección válida. No tienes que obligarte."
      }
    ],
    "samplerEmpty": "Elige cualquier opción. No hay una respuesta correcta.",
    "measuresEyebrow": "OBSERVA TUS CAMBIOS",
    "measuresTitle": "Ver tu evolución sin perseguir una puntuación",
    "measuresText": "Al empezar puedes revisar cuestionarios sugeridos y escoger tu enfoque. Si después tienes mediciones comparables, podrás revisar por separado el estrés percibido, la recuperación y otros aspectos observados. No notar mejoras también es información válida.",
    "measuresFoot": "Completar lecciones no equivale a una mejoría psicológica. Este curso específico de 14 días no cuenta con validación clínica independiente.",
    "trustEyebrow": "UN ENFOQUE AMABLE",
    "trustTitle": "Tú decides",
    "trustItems": [
      "No necesitas cerrar los ojos ni concentrarte en la respiración.",
      "Puedes elegir una versión neutra, simplificar o detener un ejercicio.",
      "No es necesario recordar traumas ni provocar emociones intensas.",
      "Tus elecciones y notas se guardan solo con tu consentimiento."
    ],
    "faqEyebrow": "PREGUNTAS FRECUENTES",
    "faqTitle": "Antes de empezar",
    "faqs": [
      {
        "q": "¿Cuánto dura una lección?",
        "a": "Las lecciones son breves, a menudo de unos 5–12 minutos, según el ejercicio y tu ritmo. Puedes escoger una versión corta o hacer una pausa."
      },
      {
        "q": "¿Debo completar 14 días seguidos?",
        "a": "No. Hay 14 lecciones, pero puedes pausar y retomar el avance guardado. No necesitas hacer varias lecciones en un día."
      },
      {
        "q": "¿Trata los trastornos de ansiedad o el trauma?",
        "a": "No. Es educación autónoma para el estrés cotidiano, no tratamiento de TEPT, trauma agudo ni trastornos de ansiedad, y no sustituye la atención médica o psicológica."
      },
      {
        "q": "¿Hay cuestionarios?",
        "a": "Sí. Antes de la primera lección necesitas completar HH Weekly Pulse (8 preguntas sobre los últimos 7 días). GAD-7 y Resource Pulse son opcionales. Si ya tienes un resultado reciente compatible, no hace falta repetirlo. Las comparaciones posteriores requieren mediciones equivalentes."
      },
      {
        "q": "¿Y si una práctica me incomoda?",
        "a": "Puedes detenerte, elegir una alternativa neutra o saltar el ejercicio. Si el malestar es intenso o persistente, busca apoyo profesional."
      },
      {
        "q": "¿Hay que pagar o suscribirse?",
        "a": "Tu primer curso activo es gratuito. Abrir la página no te inscribe ni supone ningún cobro."
      }
    ],
    "finalEyebrow": "TUS 14 LECCIONES",
    "finalTitle": "Encontrar apoyo empieza con un pequeño paso.",
    "finalText": "No necesitas estar preparado para todo. Basta con elegir lo que te resulte posible hoy.",
    "finalLink": "Empezar OPORA Antiestrés",
    "otherLink": "Conocer el método OPORA",
    "legal": "Educación autónoma para el estrés cotidiano. No sirve para diagnosticar ni tratar el TEPT o el trauma agudo, ni para emergencias. Ante síntomas importantes, busca atención profesional."
  }
} as const;

const challengeIcons = [Waves, PauseCircle, Leaf, ShieldCheck] as const;
const chapterLinks = {
  ru: { label: "Разделы курса", links: [{ id: "for-whom", title: "Для кого" }, { id: "stress-levels", title: "6 маршрутов" }, { id: "programme", title: "7 навыков" }, { id: "daily-programme", title: "14 дней" }, { id: "how", title: "Занятие" }, { id: "methodologies", title: "Методики" }, { id: "measurements", title: "Тесты и шкалы" }, { id: "questions", title: "Вопросы" }] },
  en: { label: "Course sections", links: [{ id: "for-whom", title: "Who it is for" }, { id: "stress-levels", title: "6 routes" }, { id: "programme", title: "7 skills" }, { id: "daily-programme", title: "14 days" }, { id: "how", title: "Lesson" }, { id: "methodologies", title: "Methods" }, { id: "measurements", title: "Tests & measures" }, { id: "questions", title: "Questions" }] },
  es: { label: "Secciones del curso", links: [{ id: "for-whom", title: "Para quién" }, { id: "stress-levels", title: "6 rutas" }, { id: "programme", title: "7 habilidades" }, { id: "daily-programme", title: "14 días" }, { id: "how", title: "Clase" }, { id: "methodologies", title: "Métodos" }, { id: "measurements", title: "Pruebas y escalas" }, { id: "questions", title: "Preguntas" }] },
} as const;
const outcomeIcons = [Target, PauseCircle, BookOpenCheck, Heart] as const;

export function PublicAntistressLanding({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const programme = antiStressBlueprint(locale) as unknown as {
    outcomes: {title:string;text:string}[];
    skills: {id:string;title:string;description:string;days:[number,number];outcome:string}[];
    days: {title:string}[];
  };
  const [chosenExample, setChosenExample] = useState<number | null>(null);
  const [previewModuleId,setPreviewModuleId]=useState('AS2');
  const previewDay=(day:number)=>previewModuleId==='AS2' ? programme.days[day-1]?.title || '' : moduleDayMeta(previewModuleId,day,locale,ANTISTRESS_ROUTER_VERSION)?.title || programme.days[day-1]?.title || '';
  const previewTitle=antistressModuleTitle(previewModuleId,locale);
  const recoveryStages = oporaRecoveryStages(locale);
  const enrollmentLocale = locale === "es" ? "en" : locale;
  const enrollmentPath = "/" + enrollmentLocale + "/app/course?program=stress";
  const aboutPath = "/" + locale + "/courses";
  const methodPath = "/" + locale + "/courses/methodology";

  return (
    <main className={styles.root} lang={locale} data-opora-antistress-landing data-course-visual-style="academy-light">
      <PublicSiteHeader locale={locale} showAssessmentStrip={false} />
      <div className={styles.container}>
        <nav className={styles.crumbs} aria-label={t.back}>
          <Link href={aboutPath}><ArrowLeft size={15} aria-hidden="true" />{t.back}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t.brand} · {t.heroTitle}</span>
        </nav>
        <section className={styles.hero} aria-labelledby="antistress-hero-title">
          <div className={styles.heroText}>
            <p className={styles.eyebrow}><Sparkles size={16} aria-hidden="true" />{t.eyebrow}</p>
            <h1 id="antistress-hero-title">{t.brand} <span>{t.heroTitle}</span></h1>
            <p className={styles.heroLine}>{t.heroLine}</p>
            <p className={styles.heroLead}>{t.heroText}</p>
            <div className={styles.facts} aria-label={t.factDays}>
              <span><CalendarDays size={17} aria-hidden="true" />{t.factDays}</span>
              <span><Target size={17} aria-hidden="true" />{t.factSkills}</span>
              <span><Clock3 size={17} aria-hidden="true" />{t.factTime}</span>
            </div>
            <div className={styles.heroActions}>
              <Link href={enrollmentPath} prefetch={false} className={styles.mainCta} data-antistress-start>{t.start}<ArrowRight size={19} aria-hidden="true" /></Link>
              <a className={styles.outlineCta} href="#programme">{t.explore}<ArrowRight size={17} aria-hidden="true" /></a>
            </div>
            <p className={styles.heroSubtle}><LockKeyhole size={15} aria-hidden="true" />{t.subtle}</p>
          </div>
          <div className={styles.heroVisual}>
            <div className={styles.visualFrame}>
              <img src="/images/holistic-house/course-focus-mountain-boy.webp"
                width={920} height={700} alt={t.heroImageAlt}
                className={styles.heroImage} decoding="async" />
            </div>
            <div className={styles.imageCaption}><span aria-hidden="true">✦</span> {t.heroImageLine}</div>
          </div>
        </section>

        <div className={styles.freeStrip} aria-label={t.free}>
          <span><Check size={17} aria-hidden="true" />{t.free}</span>
          <span>{t.today}</span>
          <a href="#how">{t.howLink}<ArrowRight size={15} aria-hidden="true" /></a>
        </div>
        <CourseHomeScreenHabit locale={locale} />
        <nav className={styles.chapterNav} aria-label={chapterLinks[locale].label} data-course-chapter-navigation>
          {chapterLinks[locale].links.map((item, index) => (
            <a key={item.id} href={"#" + item.id}>
              <span aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>{item.title}
            </a>
          ))}
        </nav>

        <section className={styles.section} id="for-whom" aria-labelledby="antistress-for-whom">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionEyebrow}>{t.forEyebrow}</p>
            <h2 id="antistress-for-whom">{t.forTitle}</h2>
            <p>{t.forLead}</p>
          </div>
          <div className={styles.challengeGrid}>
            {t.pains.map((pain, index) => {
              const Icon = challengeIcons[index];
              return <article className={styles.challenge} key={pain.title}>
                <span className={styles.challengeIcon}><Icon size={22} strokeWidth={1.7} aria-hidden="true" /></span>
                <h3>{pain.title}</h3><p>{pain.text}</p>
              </article>;
            })}
          </div>
        </section>

        <section className={styles.outcomes} aria-labelledby="antistress-outcomes">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionEyebrow}>{t.outcomeEyebrow}</p>
            <h2 id="antistress-outcomes">{t.outcomeTitle}</h2>
          </div>
          <div className={styles.outcomeGrid}>
            {programme.outcomes.map((item, index) => {
              const Icon = outcomeIcons[index];
              return <article className={styles.outcome} key={item.title}>
                <span className={styles.outcomeIcon}><Icon size={24} aria-hidden="true" /></span>
                <h3>{item.title}</h3><p>{item.text}</p>
              </article>;
            })}
          </div>
        </section>

        <PublicAntistressRouteMap locale={locale} selectedId={previewModuleId} onSelect={setPreviewModuleId} />

        <section className={styles.section} id="programme" aria-labelledby="antistress-programme">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionEyebrow}>{t.skillsEyebrow}</p>
            <h2 id="antistress-programme">{t.skillsTitle}</h2>
            <p>{t.skillsLead}</p>
          </div>
          <div className={styles.pathIllustration} aria-hidden="true">
            <img src="/images/holistic-house/course-journey-landscape.svg" width={860} height={245} alt="" loading="lazy" decoding="async" />
          </div>
          <p className={styles.previewLabel} data-antistress-preview-module>{locale==="ru"?"Просмотр программы":locale==="es"?"Vista previa de la ruta":"Route preview"}: <strong>{previewTitle}</strong></p>
          <div className={styles.skills}>
            {programme.skills.map((skill, index) => {
              const stageDays=previewModuleId==='AS2'?skill.days:[index * 2 + 1,index * 2 + 2];
              return <details className={styles.skill} key={skill.id} data-antistress-skill={index + 1}>
              <summary>
                <span className={styles.skillArtwork} aria-hidden="true"><span className={styles.skillNumber}>{String(index + 1).padStart(2, "0")}</span></span>
                <span className={styles.skillCopy}>
                  <small>{t.dayWord} {stageDays[0]} + {stageDays[1]}</small>
                  <strong>{previewModuleId==='AS2'?skill.title:(recoveryStages[index]?.title||skill.title)}</strong>
                  <span>{previewModuleId==='AS2'?skill.description:(recoveryStages[index]?.description||skill.description)}</span>
                </span>
                <ChevronDown className={styles.skillArrow} size={21} aria-hidden="true" />
              </summary>
              <div className={styles.lessonPair}>
                <p><span>{t.dayWord} {stageDays[0]}</span><strong>{previewDay(stageDays[0])}</strong></p>
                <p><span>{t.dayWord} {stageDays[1]}</span><strong>{previewDay(stageDays[1])}</strong></p>
                <p className={styles.skillResult}><span><Check size={14} aria-hidden="true" /></span><strong>{previewModuleId==='AS2'?skill.outcome:(recoveryStages[index]?.description||skill.outcome)}</strong></p>
              </div>
            </details>})}
          </div>
        </section>

        <section className={styles.detailedDays} id="daily-programme"
          aria-label={locale==="ru"?"Практики, результаты и измерения каждого дня":locale==="es"?"Ejercicios, resultados y medidas de cada día":"Exercises, outcomes and measurements for all 14 days"}
          data-antistress-full-day-scheme data-antistress-detailed-14-day-scheme>
          <Course14DayOverview locale={locale} programId="stress" moduleId={previewModuleId} routerVersion={ANTISTRESS_ROUTER_VERSION} compact />
        </section>
        <section className={styles.process} id="how" aria-labelledby="antistress-how">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionEyebrow}>{t.processEyebrow}</p>
            <h2 id="antistress-how">{t.processTitle}</h2>
            <p>{t.processLead}</p>
          </div>
          <div className={styles.processGrid}>
            {t.steps.map(step => <article className={styles.processCard} key={step.number}>
              <span className={styles.processNumber}>{step.number}</span>
              <h3>{step.title}</h3><p>{step.text}</p>
            </article>)}
          </div>
        </section>

        <section className={styles.practiceDemo} aria-labelledby="antistress-practice-demo">
          <div className={styles.demoCopy}>
            <p className={styles.sectionEyebrow}>{t.samplerEyebrow}</p>
            <h2 id="antistress-practice-demo">{t.samplerTitle}</h2>
            <p>{t.samplerLead}</p>
          </div>
          <div className={styles.demoInteraction} data-antistress-practice-demo>
            <div className={styles.choiceList} role="group" aria-label={t.samplerTitle}>
              {t.samplerChoices.map((choice, index) => (
                <button key={choice.label} type="button" className={styles.choice}
                  aria-pressed={chosenExample === index}
                  onClick={() => setChosenExample(index)}>
                  <span aria-hidden="true">{chosenExample === index ? <Check size={16} /> : String(index + 1).padStart(2, "0")}</span>
                  {choice.label}
                </button>
              ))}
            </div>
            <div className={styles.demoResponse} role="status" aria-live="polite">
              <Leaf size={21} aria-hidden="true" />
              <p>{chosenExample === null ? t.samplerEmpty : t.samplerChoices[chosenExample].response}</p>
            </div>
          </div>
        </section>

        <PublicAntistressEvidence locale={locale} />

        <section className={styles.safety} aria-labelledby="antistress-safety">
          <div className={styles.safetyHeader}>
            <span className={styles.safetyIcon}><ShieldCheck size={31} aria-hidden="true" /></span>
            <div><p className={styles.sectionEyebrow}>{t.trustEyebrow}</p><h2 id="antistress-safety">{t.trustTitle}</h2></div>
          </div>
          <ul className={styles.safetyList}>{t.trustItems.map(item => <li key={item}><Check size={19} aria-hidden="true" />{item}</li>)}</ul>
        </section>

        <section className={styles.section} id="questions" aria-labelledby="antistress-faq">
          <div className={styles.sectionIntro}>
            <p className={styles.sectionEyebrow}>{t.faqEyebrow}</p>
            <h2 id="antistress-faq">{t.faqTitle}</h2>
          </div>
          <div className={styles.faqList}>
            {t.faqs.map((entry, index) => <details key={entry.q} className={styles.faq} open={index === 0 ? true : undefined}>
              <summary><span>{entry.q}</span><ChevronDown size={19} aria-hidden="true" /></summary>
              <p>{entry.a}</p>
            </details>)}
          </div>
        </section>

        <section className={styles.final} aria-labelledby="antistress-final">
          <p className={styles.finalEyebrow}><Sparkles size={18} aria-hidden="true" />{t.finalEyebrow}</p>
          <h2 id="antistress-final">{t.finalTitle}</h2>
          <p>{t.finalText}</p>
          <div className={styles.finalActions}>
            <Link href={enrollmentPath} className={styles.mainCta} prefetch={false} data-antistress-start>{t.finalLink}<ArrowRight size={19} aria-hidden="true" /></Link>
            <Link href={methodPath} className={styles.finalSecondary}>{t.otherLink}<ArrowRight size={17} aria-hidden="true" /></Link>
          </div>
          <p className={styles.finalDisclaimer}><CircleHelp size={16} aria-hidden="true" />{t.legal}</p>
        </section>
      </div>
    </main>
  );
}
