"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ArrowRight, BatteryCharging, BookOpen, BriefcaseBusiness, Check, ChevronDown,
  Brain, CircleHelp, ClipboardCheck, Compass, CreditCard, Flower2, Gift, GraduationCap,
  HandHeart, HeartHandshake, HeartPulse, Leaf, MessageCircle,
  ChevronRight, Mic, MonitorPlay, Sparkles, Target, UserRound, UsersRound, Wallet, type LucideIcon,
} from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { AssistMode, AssistBudget, AssistPreferences } from "@/lib/assist/service-match.mjs";
import { rankAssistProducts } from "@/lib/assist/product-recommendations.mjs";
import { AssistTopRecommendations } from "./assist-top-recommendations";
import { serviceGroupAnchor, servicesCategoryTargets } from "@/lib/services-quick-categories";
import { ServicesBusinessMenu } from "./services-business-menu";
import styles from "./services-assist-quiz.module.css";

type QuestionKey = "topic" | "need" | "mode" | "budget";
type QuizTopic = "stress_energy" | "relationships_esteem" | "money_growth" | "business_support";
type Focus = "stress" | "relationships" | "energy" | "work" | "health" | "growth";
type Category = "diagnostics" | "business" | "homeopathy" | "coaching" | "psychotherapy" | "video";
type MoreCategory = "constellations" | "practices" | "courses" | "tests";
type Choice = readonly [string, string];
type QuizQuestion = { title: string; options: readonly Choice[] };
type QuizCopy = {
  title: string; lead: string; button: string; all: string; other: string; privacy: string;
  empty: string; section: string; step: string; profile: string; summary: string; shamanica: string;
  moreTitle: string; morePreview: string; moreLinks: Record<MoreCategory, string>;
  questions: Record<Exclude<QuestionKey, "need">, QuizQuestion>;
  needs: Record<QuizTopic, QuizQuestion>;
  businessMode: QuizQuestion;
  categories: Record<Category, string>;
};
const questionKeys = ["topic", "need", "mode", "budget"] as const;
const publicLocales: readonly PublicLocale[] = ["ru", "en", "es"];
const topicFocus: Record<QuizTopic, Focus> = {
  stress_energy:"stress", relationships_esteem:"relationships", money_growth:"growth", business_support:"work",
};
const needFocus: Record<string, Focus> = {
  stress_tension:"stress", energy_fatigue:"energy", stress_overload:"stress", health_wellbeing:"health",
  relationship_couple:"relationships", relationship_family:"relationships",
  esteem_confidence:"growth", relationship_boundaries:"relationships",
  growth_income:"growth", growth_career:"growth", growth_ideas:"growth", growth_direction:"growth",
  business_strategy:"work", business_clients:"work", business_team:"work", business_change:"work",
};
const copy: Record<PublicLocale, QuizCopy> = {
  "ru": {
    "title": "Подберём вашу поддержку",
    "lead": "4 коротких вопроса · Рекомендации под ваш запрос",
    "button": "Посмотреть рекомендации",
    "all": "Все услуги",
    "other": "Предпочитаете диалог с Ali?",
    "shamanica": "Шаманик · энергетические и магические практики",
    "moreTitle": "Другие услуги:",
    "morePreview": "Расстановки · Практики · Курсы · Тесты",
    "moreLinks": {"constellations":"Расстановки","practices":"Практики","courses":"Курсы","tests":"Тесты"},
    "privacy": "Ответы остаются в браузере. Мы не сохраняем их и не отправляем ИИ или в CRM.",
    "empty": "Нет предложения одновременно под ваш формат и бюджет. Попробуйте изменить выбор.",
    "section": "Направления поддержки",
    "step": "Вопрос",
    "profile": "Личный кабинет",
    "summary": "Ваш запрос",
    "questions": {
      "topic": {
        "title": "С чем вам нужна поддержка?",
        "options": [
          [
            "stress_energy",
            "Снять стресс и вернуть энергию"
          ],
          [
            "money_growth",
            "Деньги и уверенность в себе"
          ],
          [
            "relationships_esteem",
            "Улучшить отношения"
          ],
          [
            "business_support",
            "Личностный рост и развитие бизнеса"
          ]
        ]
      },
      "mode": {
        "title": "Какой формат вам ближе?",
        "options": [
          [
            "human",
            "Личная сессия"
          ],
          [
            "self",
            "Курс или практика"
          ],
          [
            "video",
            "Видео и медитации"
          ],
          [
            "any",
            "Помогите выбрать"
          ]
        ]
      },
      "budget": {
        "title": "С чего удобно начать?",
        "options": [
          [
            "free",
            "Бесплатно"
          ],
          [
            "under50",
            "До €50"
          ],
          [
            "under100",
            "До €100"
          ],
          [
            "flexible",
            "Готов обсудить"
          ]
        ]
      }
    },
    "needs": {
      "stress_energy": {
        "title": "Что сейчас сложнее всего?",
        "options": [
          [
            "stress_tension",
            "Стресс и напряжение"
          ],
          [
            "energy_fatigue",
            "Усталость и мало сил"
          ],
          [
            "stress_overload",
            "Перегрузка и тревога"
          ],
          [
            "health_wellbeing",
            "Самочувствие и баланс"
          ]
        ]
      },
      "relationships_esteem": {
        "title": "Что вы хотите улучшить?",
        "options": [
          [
            "relationship_couple",
            "Пара и близость"
          ],
          [
            "relationship_family",
            "Семья и близкие"
          ],
          [
            "esteem_confidence",
            "Уверенность в себе"
          ],
          [
            "relationship_boundaries",
            "Границы и конфликты"
          ]
        ]
      },
      "money_growth": {
        "title": "Какие идеи вам нужны?",
        "options": [
          [
            "growth_income",
            "Личный доход и деньги"
          ],
          [
            "growth_career",
            "Работа и карьера"
          ],
          [
            "growth_ideas",
            "Личное развитие"
          ],
          [
            "growth_direction",
            "Ясность и следующий шаг"
          ]
        ]
      },
      "business_support": {
        "title": "В чём нужна бизнес-поддержка?",
        "options": [
          [
            "business_strategy",
            "Стратегия и решения"
          ],
          [
            "business_clients",
            "Клиенты и продвижение"
          ],
          [
            "business_team",
            "Команда и партнёрство"
          ],
          [
            "business_change",
            "Рост или перемены"
          ]
        ]
      }
    },
    "businessMode": {
      "title": "Как удобнее начать?",
      "options": [
        [
          "consultation",
          "Бизнес-консультация"
        ],
        [
          "written",
          "Письменный разбор"
        ],
        [
          "human",
          "Обсудить со специалистом"
        ],
        [
          "any",
          "Помогите выбрать"
        ]
      ]
    },
    "categories": {
      "diagnostics": "Диагностика\nситуации",
      "business": "Бизнес-\nконсалтинг",
      "homeopathy": "Гомеопатия\nи средства",
      "coaching": "Коучинг\nк цели",
      "psychotherapy": "Психотерапия\nи поддержка",
      "video": "Видеотерапия\nи поддержка"
    }
  },
  "en": {
    "title": "Find Your Support",
    "lead": "4 short questions · Recommendations for your needs",
    "button": "See recommendations",
    "all": "All services",
    "other": "Prefer to chat with Ali?",
    "shamanica": "Shamanic · energy & symbolic practices",
    "moreTitle": "More options:",
    "morePreview": "Constellations · Practices · Courses · Tests",
    "moreLinks": {"constellations":"Constellations","practices":"Practices","courses":"Courses","tests":"Tests"},
    "privacy": "Answers stay in your browser. They are not stored or sent to AI or CRM.",
    "empty": "No published offer matches both your format and budget. You can change your choices.",
    "section": "Areas of Support",
    "step": "Question",
    "profile": "My profile",
    "summary": "Your needs",
    "questions": {
      "topic": {
        "title": "What do you need help with?",
        "options": [
          [
            "stress_energy",
            "Ease stress & restore energy"
          ],
          [
            "money_growth",
            "Grow money & self esteem"
          ],
          [
            "relationships_esteem",
            "Improve relationships"
          ],
          [
            "business_support",
            "Personal & business growth"
          ]
        ]
      },
      "mode": {
        "title": "What kind of support fits?",
        "options": [
          [
            "human",
            "Personal session"
          ],
          [
            "self",
            "Course or practice"
          ],
          [
            "video",
            "Videos & meditations"
          ],
          [
            "any",
            "Help me choose"
          ]
        ]
      },
      "budget": {
        "title": "Where would you like to start?",
        "options": [
          [
            "free",
            "Free"
          ],
          [
            "under50",
            "Up to €50"
          ],
          [
            "under100",
            "Up to €100"
          ],
          [
            "flexible",
            "Let's discuss"
          ]
        ]
      }
    },
    "needs": {
      "stress_energy": {
        "title": "What's hardest right now?",
        "options": [
          [
            "stress_tension",
            "Stress and tension"
          ],
          [
            "energy_fatigue",
            "Low energy or fatigue"
          ],
          [
            "stress_overload",
            "Overwhelm or worry"
          ],
          [
            "health_wellbeing",
            "Everyday wellbeing"
          ]
        ]
      },
      "relationships_esteem": {
        "title": "What would you like to improve?",
        "options": [
          [
            "relationship_couple",
            "Intimacy and partnership"
          ],
          [
            "relationship_family",
            "Family relationships"
          ],
          [
            "esteem_confidence",
            "Confidence and self-esteem"
          ],
          [
            "relationship_boundaries",
            "Boundaries and conflict"
          ]
        ]
      },
      "money_growth": {
        "title": "Which ideas would help most?",
        "options": [
          [
            "growth_income",
            "Personal income ideas"
          ],
          [
            "growth_career",
            "Work and career direction"
          ],
          [
            "growth_ideas",
            "Self-growth ideas"
          ],
          [
            "growth_direction",
            "Clarity and next steps"
          ]
        ]
      },
      "business_support": {
        "title": "Where does your business need help?",
        "options": [
          [
            "business_strategy",
            "Strategy and decisions"
          ],
          [
            "business_clients",
            "Clients and marketing"
          ],
          [
            "business_team",
            "Team and partnerships"
          ],
          [
            "business_change",
            "Growth or transition"
          ]
        ]
      }
    },
    "businessMode": {
      "title": "How would you like to begin?",
      "options": [
        [
          "consultation",
          "Business consultation"
        ],
        [
          "written",
          "Written situation review"
        ],
        [
          "human",
          "Talk to a specialist"
        ],
        [
          "any",
          "Help me choose"
        ]
      ]
    },
    "categories": {
      "diagnostics": "Situation\nDiagnostics",
      "business": "Business\nConsulting",
      "homeopathy": "Homeopathy\n& Remedies",
      "coaching": "Coaching\nto Your Goal",
      "psychotherapy": "Psychotherapy\n& Support",
      "video": "Video Therapy\n& Healing"
    }
  },
  "es": {
    "title": "Encontremos tu apoyo",
    "lead": "4 preguntas breves · Recomendaciones a tu medida",
    "button": "Ver recomendaciones",
    "all": "Todos los servicios",
    "other": "¿Prefieres hablar con Ali?",
    "shamanica": "Shamanic · energía y prácticas simbólicas",
    "moreTitle": "Más opciones:",
    "morePreview": "Constelaciones · Prácticas · Cursos · Tests",
    "moreLinks": {"constellations":"Constelaciones","practices":"Prácticas","courses":"Cursos","tests":"Tests"},
    "privacy": "Las respuestas quedan en tu navegador. No se guardan ni se envían a IA o CRM.",
    "empty": "No hay una oferta publicada que cumpla el formato y presupuesto. Puedes cambiar tu elección.",
    "section": "Áreas de apoyo",
    "step": "Pregunta",
    "profile": "Mi perfil",
    "summary": "Tu necesidad",
    "questions": {
      "topic": {
        "title": "¿En qué necesitas apoyo?",
        "options": [
          [
            "stress_energy",
            "Aliviar el estrés y recuperar energía"
          ],
          [
            "money_growth",
            "Mejorar ingresos y autoestima"
          ],
          [
            "relationships_esteem",
            "Mejorar relaciones"
          ],
          [
            "business_support",
            "Crecimiento personal y empresarial"
          ]
        ]
      },
      "mode": {
        "title": "¿Qué tipo de apoyo prefieres?",
        "options": [
          [
            "human",
            "Sesión personal"
          ],
          [
            "self",
            "Curso o práctica"
          ],
          [
            "video",
            "Vídeos y meditación"
          ],
          [
            "any",
            "Ayúdame a elegir"
          ]
        ]
      },
      "budget": {
        "title": "¿Por dónde quieres empezar?",
        "options": [
          [
            "free",
            "Gratis"
          ],
          [
            "under50",
            "Hasta €50"
          ],
          [
            "under100",
            "Hasta €100"
          ],
          [
            "flexible",
            "Quiero consultarlo"
          ]
        ]
      }
    },
    "needs": {
      "stress_energy": {
        "title": "¿Qué te cuesta más ahora?",
        "options": [
          [
            "stress_tension",
            "Estrés y tensión"
          ],
          [
            "energy_fatigue",
            "Cansancio o poca energía"
          ],
          [
            "stress_overload",
            "Sobrecarga y preocupación"
          ],
          [
            "health_wellbeing",
            "Bienestar cotidiano"
          ]
        ]
      },
      "relationships_esteem": {
        "title": "¿Qué te gustaría mejorar?",
        "options": [
          [
            "relationship_couple",
            "Pareja e intimidad"
          ],
          [
            "relationship_family",
            "Relaciones familiares"
          ],
          [
            "esteem_confidence",
            "Confianza y autoestima"
          ],
          [
            "relationship_boundaries",
            "Límites y conflictos"
          ]
        ]
      },
      "money_growth": {
        "title": "¿Qué ideas te ayudarían?",
        "options": [
          [
            "growth_income",
            "Ideas para mis ingresos"
          ],
          [
            "growth_career",
            "Trabajo y carrera"
          ],
          [
            "growth_ideas",
            "Crecimiento personal"
          ],
          [
            "growth_direction",
            "Claridad y próximos pasos"
          ]
        ]
      },
      "business_support": {
        "title": "¿Qué necesita tu negocio?",
        "options": [
          [
            "business_strategy",
            "Estrategia y decisiones"
          ],
          [
            "business_clients",
            "Clientes y marketing"
          ],
          [
            "business_team",
            "Equipo y socios"
          ],
          [
            "business_change",
            "Crecer o cambiar"
          ]
        ]
      }
    },
    "businessMode": {
      "title": "¿Cómo prefieres empezar?",
      "options": [
        [
          "consultation",
          "Consulta de negocios"
        ],
        [
          "written",
          "Revisión por escrito"
        ],
        [
          "human",
          "Hablar con especialista"
        ],
        [
          "any",
          "Ayúdame a elegir"
        ]
      ]
    },
    "categories": {
      "diagnostics": "Diagnóstico\nde situación",
      "business": "Consultoría\nde negocios",
      "homeopathy": "Homeopatía\ny remedios",
      "coaching": "Coaching\nhacia tu meta",
      "psychotherapy": "Psicoterapia\ny apoyo",
      "video": "Videoterapia\ny bienestar"
    }
  }
};

const choiceIcons: Record<Exclude<QuestionKey, "need">, Record<string, LucideIcon>> = {
  topic:{stress_energy:Flower2,relationships_esteem:UsersRound,money_growth:Compass,business_support:BriefcaseBusiness},
  mode:{human:UserRound,self:BookOpen,video:MonitorPlay,any:CircleHelp,consultation:BriefcaseBusiness,written:MessageCircle},
  budget:{free:Gift,under50:Wallet,under100:CreditCard,flexible:MessageCircle},
};
const needIcons: Record<string, LucideIcon> = {
  stress_tension:Flower2, energy_fatigue:BatteryCharging, stress_overload:HeartPulse, health_wellbeing:Leaf,
  relationship_couple:HeartHandshake, relationship_family:UsersRound, esteem_confidence:Compass, relationship_boundaries:HandHeart,
  growth_income:Wallet, growth_career:BriefcaseBusiness, growth_ideas:BookOpen, growth_direction:Compass,
  business_strategy:Compass, business_clients:UsersRound, business_team:HeartHandshake, business_change:BriefcaseBusiness,
};

const categories: readonly { key: Category; Icon: LucideIcon }[] = [
  { key: "diagnostics", Icon: ClipboardCheck },
  { key: "business", Icon: BriefcaseBusiness },
  { key: "homeopathy", Icon: HandHeart },
  { key: "coaching", Icon: Target },
  { key: "psychotherapy", Icon: Brain },
  { key: "video", Icon: MonitorPlay },
];
// Always show the four additional directions. They target the existing
// three-offer sections on this page rather than hiding in a disclosure.
const additionalCategories: readonly {
  key: MoreCategory; Icon: LucideIcon; target: "constellations" | "practice" | "learning" | "tests";
}[] = [
  { key: "constellations", Icon: UsersRound, target: "constellations" },
  { key: "practices", Icon: Leaf, target: "practice" },
  { key: "courses", Icon: GraduationCap, target: "learning" },
  { key: "tests", Icon: ClipboardCheck, target: "tests" },
];

const supportVisualCopy: Record<PublicLocale, {
 heading:string; tagline:string; prompt:string; audience:string; forMe:string; forBusiness:string;
 goal:string; dictation:string; next:string; or:string; of:string; help:string;
}> = {
 ru:{heading:"Коучинг, консалтинг и психотерапевтическая поддержка",
 tagline:"Выберите подходящий метод и мастера.",
 prompt:"Ответьте на 4 вопроса:",audience:"Кому нужна поддержка",
 forMe:"Для себя",forBusiness:"Для бизнеса",
 goal:"Опишите вашу цель или ситуацию…",dictation:"Открыть поле для диктовки с клавиатуры",
 next:"Далее",or:"ИЛИ",of:"из",help:"Спросить Ali"},
 en:{heading:"Coaching, Consulting & Therapy Support",
 tagline:"Choose the right method & master.",
 prompt:"Answer 4 questions:",audience:"Who needs support",
 forMe:"For Me",forBusiness:"For Business",
 goal:"Describe your goal or situation…",dictation:"Focus field for keyboard dictation",
 next:"Next",or:"OR",of:"of",help:"Ask Ali"},
 es:{heading:"Coaching, consultoría y apoyo terapéutico",
 tagline:"Elige el método y profesional adecuados.",
 prompt:"Responde 4 preguntas:",audience:"Para quién es el apoyo",
 forMe:"Para mí",forBusiness:"Para mi negocio",
 goal:"Describe tu meta o situación…",dictation:"Abrir campo para dictar con el teclado",
 next:"Siguiente",or:"O",of:"de",help:"Preguntar a Ali"}
};
const businessPrompt: Record<PublicLocale,string> = {
  en:"Choose your support in 2 steps",
  ru:"Выберите поддержку за 2 шага",
  es:"Elige apoyo en 2 pasos",
};
export function ServicesAssistQuiz({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const v = supportVisualCopy[locale];
  const [audience,setAudience]=useState<"personal"|"business">("personal");
  const [goal,setGoal]=useState("");
  const goalFieldRef=useRef<HTMLInputElement>(null);
  const [answers, setAnswers] = useState<Partial<Record<QuestionKey, string>>>({topic:"stress_energy"});
  const [step, setStep] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const questionHeading = useRef<HTMLSpanElement>(null);
  const currentKey = questionKeys[step];
  const topic = (answers.topic as QuizTopic | undefined) || "stress_energy";
  const question = currentKey === "need" ? t.needs[topic] :
    currentKey === "mode" && topic === "business_support" ? t.businessMode : t.questions[currentKey];
  const options = question.options;
  const ready = questionKeys.every(key => Boolean(answers[key]));
  const focus: Focus = needFocus[answers.need || ""] || topicFocus[topic];
  const preferredMode = answers.mode;
  const preferences: AssistPreferences = {
    mode: preferredMode === "written" || preferredMode === "consultation" ? "human" : preferredMode as AssistMode | undefined,
    channel: preferredMode === "written" ? "async" : preferredMode === "consultation" ? "online" : undefined,
    budget: answers.budget as AssistBudget | undefined,
  };
  // Personal money and growth are separate from an explicit business inquiry.
  const matchingIds = rankAssistProducts(focus, preferences, 20)
    .filter((id: string) => topic === "business_support"
      ? id === "business" || id === "review" || id === "constellation"
      : id !== "business").slice(0, 3);
  const summary = [
    t.questions.topic.options.find(([value]) => value === answers.topic)?.[1],
    t.needs[topic].options.find(([value]) => value === answers.need)?.[1],
    (topic === "business_support" ? t.businessMode : t.questions.mode).options.find(([value]) => value === answers.mode)?.[1],
    t.questions.budget.options.find(([value]) => value === answers.budget)?.[1],
  ].filter(Boolean).join(" · ");

  function selectOption(key: QuestionKey, value: string) {
    setAnswers(old => key === "topic" && old.topic !== value ? { topic: value } : { ...old, [key]: value });
    setSubmitted(false);
  }
  function nextQuestion() {
    if (!answers[currentKey] || step >= questionKeys.length - 1) return;
    setStep(index => Math.min(index + 1, questionKeys.length - 1));
    requestAnimationFrame(() => questionHeading.current?.focus());
  }
  function jumpTo(index: number) {
    if (index > step && !answers[questionKeys[index]]) return;
    setStep(index);
    setSubmitted(false);
    requestAnimationFrame(() => questionHeading.current?.focus());
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (ready) setSubmitted(true);
  }
  useEffect(() => {
    if (!submitted) return;
    const frame = requestAnimationFrame(() => {
      const target = document.getElementById("assist-recommendations") ||
        document.querySelector<HTMLElement>("[data-services-quiz-results]");
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
        block: "start",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [submitted]);

  return <section className={styles.root} data-services-quiz data-services-quiz-questions="4"
    data-services-quiz-step={step + 1} data-quiz-route={topic} lang={locale} aria-labelledby="services-quiz-title">
    <div className={styles.brandBar}>
      <Link href={"/" + locale} prefetch={false} className={styles.brand} aria-label="Holistic House">
        <Leaf size={38} strokeWidth={1.5} aria-hidden="true" />
        <span><strong>Holistic House</strong><small>S U P P O R T</small></span>
      </Link>
      <div className={styles.brandActions}>
        <details className={styles.languageMenu}>
          <summary aria-label="Language"><span>{locale.toUpperCase()}</span><ChevronDown size={16} aria-hidden="true" /></summary>
          <div className={styles.languageOptions}>{publicLocales.map(lang =>
            <Link href={"/" + lang + "/services"} prefetch={false} key={lang} lang={lang}
              aria-current={lang === locale ? "page" : undefined}>{lang.toUpperCase()}</Link>)}</div>
        </details>
        <Link className={styles.help} href={"/" + locale + "/services?assist=chat"} prefetch={false}
          aria-label={v.help}><CircleHelp size={22} aria-hidden="true" /></Link>
        <Link className={styles.profile} href={"/" + (locale === "es" ? "en" : locale) + "/app/portrait"}
          prefetch={false} aria-label={t.profile}><UserRound size={22} aria-hidden="true" /></Link>
      </div>
    </div>

    <header className={styles.hero}>
      <svg className={styles.lotusMark} viewBox="0 0 84 48" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M42 42C29 29 31 15 42 4c11 11 13 25 0 38Z"/>
        <path d="M41 41C25 40 17 29 18 14c13 4 22 12 23 27Z"/>
        <path d="M43 41C59 40 67 29 66 14c-13 4-22 12-23 27Z"/>
        <path d="M40 41C24 47 10 38 6 26c11-4 25 1 34 15Z"/>
        <path d="M44 41C60 47 74 38 78 26c-11-4-25 1-34 15Z"/>
        <path d="M27 44h30"/>
      </svg>
      <h1 id="services-quiz-title">{v.heading}</h1>
      <p className={styles.heroTagline}>{v.tagline}</p>
      <p className={styles.heroPrompt}>{audience === "business" ? businessPrompt[locale] : v.prompt}</p>
      <div className={styles.heroStage} data-support-luxe-room aria-hidden="true" />
    </header>
    <div className={styles.audienceSwitch} data-services-audience role="group" aria-label={v.audience}>
      <button type="button" aria-pressed={audience === "personal"} onClick={() => {
        setAudience("personal");setAnswers({topic:"stress_energy"});setStep(0);setSubmitted(false);
      }}><UserRound size={23} aria-hidden="true" />{v.forMe}</button>
      <button type="button" aria-pressed={audience === "business"} onClick={() => {
        setAudience("business");setAnswers({topic:"business_support"});setStep(0);setSubmitted(false);
      }}><BriefcaseBusiness size={23} aria-hidden="true" />{v.forBusiness}</button>
    </div>

    {audience === "business" ? <ServicesBusinessMenu locale={locale} /> : <form className={styles.form} data-services-quiz-form onSubmit={submit}>
      <div className={styles.progress}>
        <span>{t.step} {step + 1} {v.of} {questionKeys.length}</span>
        <div className={styles.progressSteps} aria-label={t.step + " " + (step + 1)}>
          {questionKeys.map((key, index) =>
            <button type="button" key={key} className={styles.progressDot} data-quiz-dot={index + 1}
              aria-label={t.step + " " + (index + 1)} aria-current={step === index ? "step" : undefined}
              data-complete={Boolean(answers[key])} disabled={index > step && !answers[key]}
              onClick={() => jumpTo(index)}><span className={styles.progressInner}>
                {answers[key] && index !== step ? <Check size={13} aria-hidden="true" /> : null}
              </span></button>)}
        </div>
      </div>

      <fieldset className={styles.question} data-services-quiz-question={currentKey} key={currentKey}>
        <legend><span ref={questionHeading} tabIndex={-1} className={styles.questionTitle}>{question.title}</span></legend>
        <div className={styles.choices} data-question-kind={currentKey}>
          {options.map(([value, label]) => {
            const selected = answers[currentKey] === value;
            const Icon = currentKey === "need" ? needIcons[value] : choiceIcons[currentKey][value];
            return <button type="button" className={styles.choice} key={value}
              data-services-quiz-choice={value} aria-pressed={selected}
              onClick={() => selectOption(currentKey, value)}>
              <span className={styles.choiceMedia} data-support-choice-photo aria-hidden="true" />
              <span className={styles.choiceContent}>
                <Icon size={25} strokeWidth={1.7} aria-hidden="true" /><span>{label}</span>
                <ChevronRight className={styles.choiceChevron} size={18} aria-hidden="true" />
              </span>
              {selected ? <Check className={styles.check} size={16} strokeWidth={3} aria-hidden="true" /> : null}
            </button>;
          })}
        </div>
      </fieldset>
      <div className={styles.orDivider}><span>{v.or}</span></div>
      <div className={styles.goalComposer}>
        <Sparkles size={24} aria-hidden="true" />
        <input ref={goalFieldRef} data-services-quiz-goal value={goal} maxLength={300}
          onChange={event => setGoal(event.target.value)} autoComplete="off"
          placeholder={v.goal} aria-label={v.goal} />
        <button type="button" aria-label={v.dictation} title={v.dictation}
          onClick={() => goalFieldRef.current?.focus()}><Mic size={23} aria-hidden="true" /></button>
      </div>
      {step < questionKeys.length - 1 ? <button type="button" className={styles.next}
        data-services-quiz-next disabled={!answers[currentKey]} onClick={nextQuestion}>
        {v.next}<ArrowRight size={23} aria-hidden="true" />
      </button> : <button type="submit" className={styles.submit}
        data-services-quiz-submit disabled={!ready} aria-controls="assist-recommendations">
        {t.button}<ArrowRight size={20} aria-hidden="true" />
      </button>}
    </form>}

    {audience === "personal" ? <section className={styles.categories} data-services-quick-categories aria-labelledby="services-quiz-categories-title">
      <div className={styles.categoryHeader}>
        <h2 id="services-quiz-categories-title">{t.section}</h2>
        <a href="#services-unified-heading">{t.all}<ArrowRight size={17} aria-hidden="true" /></a>
      </div>
      <div className={styles.categoryGrid}>
        {categories.map(({key,Icon}) =>
          <a href={"#" + serviceGroupAnchor(servicesCategoryTargets[key])} key={key}
            className={styles.category} data-services-quiz-category={key}
            data-services-quiz-target={servicesCategoryTargets[key]}>
            <span className={styles.categoryMedia} data-services-card-photo aria-hidden="true" />
            <span className={styles.categoryInfo}>
              <span className={styles.categoryIcon}><Icon size={26} strokeWidth={1.65} aria-hidden="true" /></span>
              <span className={styles.categoryName}>{t.categories[key]}</span>
            </span>
          </a>)}
      </div>
      <nav className={styles.categoryGridMore} data-services-extra-categories aria-label={t.moreTitle}>
        {additionalCategories.map(({key,Icon,target}) =>
          <a href={"#" + serviceGroupAnchor(servicesCategoryTargets[target])} key={key}
            className={styles.category + " " + styles.categorySecondary}
            data-services-quiz-category={key} data-services-quiz-target={servicesCategoryTargets[target]}>
            <span className={styles.categoryMedia} data-services-card-photo aria-hidden="true" />
            <span className={styles.categoryInfo}>
              <span className={styles.categoryIcon}><Icon size={24} strokeWidth={1.65} aria-hidden="true" /></span>
              <span className={styles.categoryName}>{t.moreLinks[key]}</span>
            </span>
          </a>)}
      </nav>
      <div className={styles.categoryExtras}>
        <Link href={"/" + locale + "/shamanica"} prefetch={false}
          data-services-shamanica-link><Leaf size={15} aria-hidden="true" /> {t.shamanica}</Link>
        <Link href={"/" + locale + "/services?assist=chat"} prefetch={false}>{t.other}</Link>
      </div>
    </section> : null}

    {submitted && audience === "personal" ? <div className={styles.results} tabIndex={-1} data-services-quiz-results>
      <details className={styles.summary} data-services-quiz-summary>
        <summary><strong>{t.summary}</strong>
          <span>{t.questions.topic.options.find(([value]) => value === answers.topic)?.[1]}</span>
          <ChevronDown size={17} aria-hidden="true" /></summary>
        <p>{summary}{goal.trim() ? <> · {goal.trim()}</> : null}</p>
      </details>
      <AssistTopRecommendations locale={locale} focus={focus} preferences={preferences}
        matchingIds={matchingIds} allowedIds={matchingIds} categoryGroups noMatchLabel={t.empty}
        onAdjustFilters={() => {
          setSubmitted(false);
          setStep(2);
          requestAnimationFrame(() =>
            document.querySelector<HTMLElement>("[data-services-quiz-form]")?.scrollIntoView({ block: "start", behavior: "smooth" }));
        }} />
    </div> : null}
    {audience === "personal" ? <p className={styles.privacy}>{t.privacy}</p> : null}
  </section>;
}
