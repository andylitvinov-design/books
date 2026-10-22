"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, BookOpen, ChevronDown, Compass, Flower2, Gift, Paperclip, Quote, RefreshCw, Send, Sparkles, Sprout, Sun } from "lucide-react";
import { DaoHexagramGlyph } from "@/components/dao-hexagram-glyph";
import { CompactLeadCapture } from "@/components/compact-lead-capture";
import { daoAuthorHexagramNumbers, getHexagram, hexagramEssence, hexagramTitle } from "@/data/dao-hexagrams.mjs";
import { drawRandomHexagram } from "@/lib/dao-divination.mjs";
import { detectIdeasQuestionLocale, getIdeasAphorismMatches, getIdeasFreeRecommendations, matchIdeasTopic } from "@/lib/ideas-guidance.mjs";
import type { IdeasTopic } from "@/lib/ideas-guidance.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./ideas-discovery.module.css";

type Mode = "dao" | "aphorisms" | "personal";
type Offer = "reading" | "gift";
type Result = { mode: Mode; topic: IdeasTopic; matched: boolean; hexagram?: number };
type DaoReading = { number: number; text: string; kind: "original" | "editorial" };

const copy = {
  ru: {
    eyebrow: "ИДЕИ · ПОДСКАЗКИ ДЛЯ ВАС",
    title: "Идеи",
    lead: "Задайте вопрос, найдите вдохновение и практическую подсказку.",
    question: "О чём хотите спросить?",
    placeholder: "Ваш вопрос или тема…",
    choose: "Выберите способ получить подсказку",
    ask: "Задать вопрос",
    hexagramWord: "Гексаграмма", meaning: "Смысл", message: "Ключевая идея", step: "Практический шаг",
    expand: "Развернуть подсказку", aphorismsForYou: "Три афоризма для вас", sampleAphorisms: "Три афоризма · пример",
    attach: "Добавить текст из файла .txt или .md (только в браузере)",
    attachError: "Можно добавить только текстовый файл до 16 КБ.",
    previewShort: "ПРИМЕР",
    topicMessage: {
      relationships: "Доброта и ясные границы могут сосуществовать.",
      stress: "Маленькие устойчивые действия ценнее спешки.",
      resources: "Рост требует бережного отношения к собственным силам.",
      work: "Постоянство помогает превратить намерение в результат.",
      direction: "Путь открывается через последовательные шаги.",
    },
    topicStep: {
      relationships: "Сегодня сделайте один небольшой шаг навстречу честному диалогу.",
      stress: "Выберите одно спокойное, посильное действие на сегодня.",
      resources: "Уделите время небольшому восстанавливающему действию.",
      work: "Наметьте одну конкретную задачу, которую можно выполнить сегодня.",
      direction: "Запишите ближайший шаг, не пытаясь решить всё сразу.",
    },
    preview: "ПРИМЕР · КНИГА ПЕРЕМЕН",
    previewNote: "Пример для знакомства. Напишите вопрос, чтобы получить собственную подсказку.",
    dao: "Даосская подсказка",
    aphorisms: "Афоризмы",
    personal: "Личная подсказка",
    error: "Сначала напишите вопрос или тему.",
    privacyShort: "Текст остаётся в браузере · О приватности",
    privacy: "Ваш текст обрабатывается только в браузере: не сохраняется, не передаётся в CRM или аналитику. Не указывайте конфиденциальные данные.",
    basedOn: "Тема запроса",
    generic: "Общий вопрос",
    headings: { dao: "Символ Книги Перемен", aphorisms: "Афоризмы по вашему вопросу", personal: "Три способа начать" },
    topic: { relationships: "Отношения и близость", stress: "Тревога и внутреннее спокойствие", resources: "Ресурсы и энергия", work: "Работа и решения", direction: "Выбор и направление" },
    daoNote: "Одна из 64 гексаграмм выпадает случайно, независимо от смысла вопроса. Это образ для размышления, а не предсказание.",
    expandDao: "Развернуть всё", collapseDao: "Свернуть",
    originalReading: "Полное авторское толкование · русский оригинал", editorialReading: "Полное редакционное толкование · на русском",
    loadingReading: "Загружаем полное толкование…", unavailableReading: "Полное толкование не загрузилось. Откройте карточку гексаграммы.",
    again: "Другой символ",
    card: "Прочитать толкование",
    aphorismNote: "Подбор по смыслу вопроса: редакционные афоризмы, авторские переложения и исторические народные пословицы. Переводы пословиц смысловые, с указанием оригинала и проверяемого сборника.",
    more: "Ещё 3 афоризма", inspiredBy: "Источник идеи · по мотивам", sourceLabel: "Источник", proverbSource: "Происхождение", originalLabel: "Оригинал", editorial: "Holistic House · авторский афоризм",
    personalNote: "Это тематический подбор, не индивидуальная оценка. Выберите формат и заполните существующую форму на странице услуги.",
    guidanceIntro: "Выберите один вариант, с которого хочется начать.",
    guidanceMatch: "Рекомендуем по теме запроса",
    guidanceOther: "Ещё один вариант",
    free: "Бесплатно",
    go: "Открыть",
    reset: "Новый вопрос",
    daoPromoLabel: "Персональная помощь после подсказки",
    order: "Заказать", requestTitle: "Короткая заявка", requestLead: "Оставьте контакт для ответа по выбранному предложению.", fullService: "Подробнее об услуге",
    daoPromoReading: {
      eyebrow: "ЛИЧНОЕ ТОЛКОВАНИЕ",
      title: "Получите персональное даосское гадание и подсказки от Мастера",
      description: "Обсудите вопрос с Андреем. Формат, сроки и стоимость уточняются лично.",
      action: "Спросить Мастера",
    },
    daoPromoGift: {
      eyebrow: "ПОДАРОК · БЕСПЛАТНО",
      title: "Получите личную диагностику и разбор ситуации",
      description: "Коучинг-анкета и рисунок «Я — цель — проблема» для личного письменного разбора. Не медицинский диагноз.",
      action: "Получить в подарок",
    },
    service: {
      review: { title: "Бесплатный разбор ситуации", description: "Опишите вопрос и получите персональный письменный разбор возможных шагов.", action: "Отправить запрос" },
      tests: { title: "Стресс и психопрофиль", description: "Пройдите бесплатные тесты самооценки и увидьте, на что обратить внимание.", action: "Выбрать тесты" },
      dao: { title: "Профиль ресурсов У-Син", description: "Исследуйте личные ресурсы в символической модели пяти элементов.", action: "Узнать о профиле" },
    },
  },
  en: {
    eyebrow: "IDEAS & GUIDANCE",
    title: "Ideas",
    lead: "Ask a question, get inspiration and practical guidance.",
    question: "What would you like guidance on?",
    placeholder: "What’s on your mind?",
    choose: "Choose how to explore your question",
    ask: "Get guidance",
    hexagramWord: "Hexagram", meaning: "Meaning", message: "Key message", step: "Practical step",
    expand: "Expand the full insight", aphorismsForYou: "Three aphorisms for you", sampleAphorisms: "Three aphorisms · example",
    attach: "Add a .txt or .md file locally in this browser",
    attachError: "Only text files up to 16 KB are supported.",
    previewShort: "EXAMPLE",
    topicMessage: {
      relationships: "Kindness and clear boundaries can exist together.",
      stress: "Small, steady actions can be more useful than rushing.",
      resources: "Growth also requires care for your own resources.",
      work: "Consistency can turn intentions into tangible progress.",
      direction: "A path becomes clearer through successive small steps.",
    },
    topicStep: {
      relationships: "Take one small step toward an honest conversation today.",
      stress: "Choose one calm and manageable action for today.",
      resources: "Make room for one small restoring action.",
      work: "Choose one concrete task you can complete today.",
      direction: "Write down the next step without solving the whole journey.",
    },
    preview: "EXAMPLE · BOOK OF CHANGES",
    previewNote: "A sample, not a response to you. Ask a question above to get your own guidance.",
    dao: "Daoist insight",
    aphorisms: "Aphorisms",
    personal: "Personal guidance",
    error: "Please enter a question or topic first.",
    privacyShort: "Private in this browser · More information",
    privacy: "Your text stays in this browser. It is not saved or sent to CRM or analytics. Avoid sharing sensitive personal details.",
    basedOn: "Topic",
    generic: "Open-ended question",
    headings: { dao: "A symbol from the Book of Changes", aphorisms: "Reflections for your question", personal: "Three ways to begin" },
    topic: { relationships: "Relationships and connection", stress: "Stress and inner calm", resources: "Energy and resources", work: "Work and decisions", direction: "Choices and direction" },
    daoNote: "One of 64 hexagrams is drawn at random, independently of your question. It offers a symbol for reflection, not a prediction.",
    expandDao: "Expand all", collapseDao: "Show less",
    originalReading: "Full author interpretation · in Russian", editorialReading: "Full editorial interpretation · in Russian",
    loadingReading: "Loading full interpretation…", unavailableReading: "The full reading could not be loaded. Open the hexagram page instead.",
    again: "Draw another",
    card: "Read interpretation",
    aphorismNote: "Topic-matched original reflections and historical folk proverbs, with cited collections. New proverb translations convey the original meaning; inspired reflections are not verbatim historical quotations.",
    more: "Show 3 more aphorisms", inspiredBy: "Source · inspired by", sourceLabel: "Source", proverbSource: "Provenance", originalLabel: "Original", editorial: "Holistic House editorial · original aphorism",
    personalNote: "These are topic-based options, not a personal assessment. Choose a format and complete its existing request form.",
    guidanceIntro: "Choose the starting point that feels right for you.",
    guidanceMatch: "Suggested for your topic",
    guidanceOther: "Another option",
    free: "Free",
    go: "Explore",
    reset: "New question",
    daoPromoLabel: "Personal help after your insight",
    order: "Request", requestTitle: "Quick request", requestLead: "Leave a contact for a reply about this offer.", fullService: "Service details",
    daoPromoReading: {
      eyebrow: "PERSONAL READING",
      title: "Get a personal Daoist reading and insights from the Master",
      description: "Ask Andrey about your question. Format, timing and price are confirmed personally.",
      action: "Ask the Master",
    },
    daoPromoGift: {
      eyebrow: "FREE GIFT",
      title: "Get a personal situation assessment and written review",
      description: "A coaching questionnaire and ME — GOAL — PROBLEM drawing for a personal written reflection. Not a medical diagnosis.",
      action: "Claim your gift",
    },
    service: {
      review: { title: "Free situation review", description: "Share your situation and request a personal written reflection on possible next steps.", action: "Request review" },
      tests: { title: "Stress & personal profile", description: "Explore free self-check scales and identify areas worth reflecting on.", action: "Explore tests" },
      dao: { title: "Wu Xing resource profile", description: "Explore your resources using the symbolic five-elements model.", action: "Explore profile" },
    },
  },
  es: {
    eyebrow: "IDEAS Y ORIENTACIÓN",
    title: "Ideas",
    lead: "Haz una pregunta, encuentra inspiración y orientación práctica.",
    question: "¿Sobre qué quieres una orientación?",
    placeholder: "Tu pregunta…",
    choose: "Elige cómo explorar tu pregunta",
    ask: "Pedir orientación",
    hexagramWord: "Hexagrama", meaning: "Significado", message: "Mensaje clave", step: "Paso práctico",
    expand: "Desplegar toda la orientación", aphorismsForYou: "Tres aforismos para ti", sampleAphorisms: "Tres aforismos · ejemplo",
    attach: "Añadir un archivo .txt o .md solo en este navegador",
    attachError: "Solo se admiten archivos de texto de hasta 16 KB.",
    previewShort: "EJEMPLO",
    topicMessage: {
      relationships: "La bondad y los límites claros pueden coexistir.",
      stress: "Los pasos pequeños y constantes ayudan más que la prisa.",
      resources: "Crecer también implica cuidar tus propios recursos.",
      work: "La constancia transforma las intenciones en resultados.",
      direction: "El camino se aclara con pequeños pasos sucesivos.",
    },
    topicStep: {
      relationships: "Da hoy un pequeño paso hacia una conversación honesta.",
      stress: "Elige hoy una acción tranquila y manejable.",
      resources: "Dedica un momento a una pequeña acción reparadora.",
      work: "Elige una tarea concreta que puedas completar hoy.",
      direction: "Anota el próximo paso sin intentar resolverlo todo.",
    },
    preview: "EJEMPLO · LIBRO DE LOS CAMBIOS",
    previewNote: "Es un ejemplo, no una respuesta personal. Escribe tu pregunta para continuar.",
    dao: "Consejo taoísta",
    aphorisms: "Aforismos",
    personal: "Orientación personal",
    error: "Primero escribe tu pregunta o tema.",
    privacyShort: "Solo en tu navegador · Privacidad",
    privacy: "El texto permanece en este navegador. No se guarda ni se envía al CRM o a analítica. Evita datos personales sensibles.",
    basedOn: "Tema",
    generic: "Pregunta abierta",
    headings: { dao: "Un símbolo del Libro de los Cambios", aphorisms: "Reflexiones para tu pregunta", personal: "Tres maneras de empezar" },
    topic: { relationships: "Relaciones y cercanía", stress: "Estrés y calma interior", resources: "Energía y recursos", work: "Trabajo y decisiones", direction: "Opciones y rumbo" },
    daoNote: "Uno de los 64 hexagramas se elige al azar, independientemente de tu pregunta. Es un símbolo para reflexionar, no una predicción.",
    expandDao: "Desplegar todo", collapseDao: "Mostrar menos",
    originalReading: "Interpretación completa del autor · en ruso", editorialReading: "Interpretación editorial completa · en ruso",
    loadingReading: "Cargando interpretación completa…", unavailableReading: "No se pudo cargar la interpretación. Abre la página del hexagrama.",
    again: "Otro símbolo",
    card: "Leer interpretación",
    aphorismNote: "Aforismos originales y refranes tradicionales con su colección citada. Las traducciones expresan el sentido; las paráfrasis no son citas históricas literales.",
    more: "Ver 3 aforismos más", inspiredBy: "Fuente · inspirado en", sourceLabel: "Fuente", proverbSource: "Procedencia", originalLabel: "Original", editorial: "Holistic House · aforismo original",
    personalNote: "Son opciones por tema, no una evaluación personal. Elige una y completa el formulario existente de la página.",
    guidanceIntro: "Elige por dónde te gustaría empezar.",
    guidanceMatch: "Sugerido para tu tema",
    guidanceOther: "Otra opción",
    free: "Gratis",
    go: "Explorar",
    reset: "Otra pregunta",
    daoPromoLabel: "Ayuda personal después de tu consejo",
    order: "Solicitar", requestTitle: "Solicitud breve", requestLead: "Deja un contacto para recibir una respuesta sobre esta opción.", fullService: "Ver detalles",
    daoPromoReading: {
      eyebrow: "LECTURA PERSONAL",
      title: "Recibe una lectura taoísta personal y consejos del Maestro",
      description: "Consulta tu pregunta con Andrey. El formato, los plazos y el precio se confirman personalmente.",
      action: "Consultar al Maestro",
    },
    daoPromoGift: {
      eyebrow: "REGALO · GRATIS",
      title: "Recibe una valoración personal y un análisis de tu situación",
      description: "Un cuestionario y un dibujo YO — META — PROBLEMA para recibir una reflexión escrita personal. No es un diagnóstico médico.",
      action: "Recibir mi regalo",
    },
    service: {
      review: { title: "Revisión gratuita de tu situación", description: "Comparte tu pregunta y solicita una reflexión personal por escrito.", action: "Solicitar revisión" },
      tests: { title: "Estrés y perfil personal", description: "Explora pruebas gratuitas de autoevaluación y descubre temas para reflexionar.", action: "Ver pruebas" },
      dao: { title: "Perfil de recursos Wu Xing", description: "Explora tus recursos con el modelo simbólico de los cinco elementos.", action: "Ver perfil" },
    },
  },
} as const;

function freeOfferHref(locale: PublicLocale, id: "review" | "tests" | "dao") {
  if (id === "tests") return "/" + (locale === "es" ? "en" : locale) + "/client/tests";
  if (id === "review") return "/" + locale + "/services/free-situation-review#request-free-review";
  return "/" + (locale === "es" ? "en" : locale) + "/services/dao-health-profile#request-free-wu-xing";
}


type Match = ReturnType<typeof getIdeasAphorismMatches>[number];
type HexagramEntry = NonNullable<ReturnType<typeof getHexagram>>;

// Shared presentation for the real Dao draw and the unmistakably labelled initial example.
function DaoInsightPanel({ entry, locale, topic, example = false }: {
  entry: HexagramEntry; locale: PublicLocale; topic: IdeasTopic; example?: boolean;
}) {
  const t = copy[locale];
  return (
    <article className={styles.daoInsight} data-ideas-dao-card>
      <div className={styles.daoLandscape} aria-hidden="true" />
      <p className={styles.daoEyebrow}>
        <span className={styles.yinYang} aria-hidden="true">☯</span>
        <span>{t.dao}{example ? " · " + t.previewShort : ""}</span>
      </p>
      <h2 className={styles.daoTitle}>{t.hexagramWord} {entry.number} — {hexagramTitle(entry, locale)}</h2>
      <p className={styles.daoLead}>{hexagramEssence(entry, locale)}</p>
      <details className={styles.daoExpanded} open={example}>
        <summary>{t.expand}</summary>
        <div className={styles.daoInterpretation}>
          <div className={styles.daoGlyphCard}>
            <DaoHexagramGlyph upper={entry.upper} lower={entry.lower} label={"Hexagram " + entry.number} />
            <strong>{entry.number}</strong>
            <span>{hexagramTitle(entry, locale)}</span>
          </div>
          <div className={styles.daoPoints}>
            <div className={styles.daoPoint}>
              <Sprout size={24} aria-hidden="true" />
              <div><strong>{t.meaning}</strong><p>{hexagramEssence(entry, locale)}</p></div>
            </div>
            <div className={styles.daoPoint}>
              <Flower2 size={24} aria-hidden="true" />
              <div><strong>{t.message}</strong><p>{t.topicMessage[topic]}</p></div>
            </div>
            <div className={styles.daoPoint}>
              <Sun size={24} aria-hidden="true" />
              <div><strong>{t.step}</strong><p>{t.topicStep[topic]}</p></div>
            </div>
          </div>
        </div>
      </details>
    </article>
  );
}

function AphorismTiles({ items, locale, heading }: {
  items: Match[]; locale: PublicLocale; heading: string;
}) {
  const t = copy[locale];
  return (
    <section className={styles.relatedAphorisms} data-ideas-aphorisms aria-label={heading}>
      <h3 className={styles.aphorismHeading}><Quote size={24} aria-hidden="true" />{heading}</h3>
      <ol className={styles.aphorisms}>
        {items.map((item, index) => (
          <li key={item.id}>
            <span className={styles.number} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
            <div className={styles.aphorismBody}>
              <p>{item.text}</p>
              {item.kind !== "editorial" && item.source ? (
                <a className={styles.aphorismSource} href={item.source.url} target="_blank" rel="noopener noreferrer">
                  {item.kind === "proverb" ? t.proverbSource : t.inspiredBy}: {item.source.author} · {item.source.work}
                </a>
              ) : <span className={styles.aphorismSource}>{t.editorial}</span>}
              {item.kind === "proverb" && item.original ? (
                <p className={styles.aphorismOriginal}><span>{t.originalLabel}: </span><span lang={item.original.language}>{item.original.text}</span></p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}


/** Offer cards reuse the same consented, transactional CRM intake as public services. */
function DaoOfferCards({ locale, openOffer, onToggle }: {
  locale: PublicLocale;
  openOffer: Offer | null;
  onToggle: (offer: Offer) => void;
}) {
  const t = copy[locale];
  // Preserve the in-flight request/receipt if a visitor closes and reopens an offer.
  const [revealedOffers, setRevealedOffers] = useState<Offer[]>([]);
  function reveal(offer: Offer) {
    setRevealedOffers(current => current.includes(offer) ? current : [...current, offer]);
    onToggle(offer);
  }
  return (
    <aside className={styles.daoPromos} aria-label={t.daoPromoLabel} data-ideas-dao-promos>
      <div className={styles.daoPromoWrapper}>
        <article className={styles.daoPromo}>
          <span className={styles.daoPromoEyebrow}><Compass size={17} aria-hidden="true" />{t.daoPromoReading.eyebrow}</span>
          <strong className={styles.daoPromoTitle}>{t.daoPromoReading.title}</strong>
          <span className={styles.daoPromoDescription}>{t.daoPromoReading.description}</span>
          <button type="button" className={styles.daoPromoAction} data-ideas-order-button="reading"
            aria-expanded={openOffer === "reading"} aria-controls="ideas-offer-reading"
            onClick={() => reveal("reading")}>
            {t.order}<ArrowRight size={17} aria-hidden="true" />
          </button>
        </article>
        <div id="ideas-offer-reading" hidden={openOffer !== "reading"}>
          {revealedOffers.includes("reading") ? (
            <>
              <CompactLeadCapture locale={locale} variant="inline" serviceTitle={t.daoPromoReading.title}
                title={t.requestTitle} lead={t.requestLead} />
              <Link className={styles.daoPromoMore} href={"/" + locale + "/services/free-consultation#intro-request"} prefetch={false}>
                {t.fullService}<ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          ) : null}
        </div>
      </div>
      <div className={styles.daoPromoWrapper}>
        <article className={[styles.daoPromo, styles.daoPromoGift].join(" ")}>
          <span className={styles.daoPromoEyebrow}><Gift size={17} aria-hidden="true" />{t.daoPromoGift.eyebrow}</span>
          <strong className={styles.daoPromoTitle}>{t.daoPromoGift.title}</strong>
          <span className={styles.daoPromoDescription}>{t.daoPromoGift.description}</span>
          <button type="button" className={styles.daoPromoAction} data-ideas-order-button="gift"
            aria-expanded={openOffer === "gift"} aria-controls="ideas-offer-gift"
            onClick={() => reveal("gift")}>
            {t.daoPromoGift.action}<ArrowRight size={17} aria-hidden="true" />
          </button>
        </article>
        <div id="ideas-offer-gift" hidden={openOffer !== "gift"}>
          {revealedOffers.includes("gift") ? (
            <>
              <CompactLeadCapture locale={locale} variant="inline" serviceTitle={t.daoPromoGift.title}
                title={t.requestTitle} lead={t.requestLead} />
              <Link className={styles.daoPromoMore} href={"/" + locale + "/services/free-situation-review#request-free-review"} prefetch={false}>
                {t.fullService}<ArrowRight size={15} aria-hidden="true" />
              </Link>
            </>
          ) : null}
        </div>
      </div>
    </aside>
  );
}

export function IdeasDiscovery({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [error, setError] = useState(false);
  const [attachmentError, setAttachmentError] = useState(false);
  const [visibleAphorisms, setVisibleAphorisms] = useState(3);
  const [result, setResult] = useState<Result | null>(null);
  const [openOffer, setOpenOffer] = useState<Offer | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("dao");
  const [expandedDao, setExpandedDao] = useState(false);
  const [fullDaoReading, setFullDaoReading] = useState<DaoReading | null>(null);
  const [daoReadingError, setDaoReadingError] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function choose(mode: Mode) {
    setActiveMode(mode);
    if (!question.trim()) {
      setError(false);
      textareaRef.current?.focus();
      return;
    }
    const matched = matchIdeasTopic(question);
    setExpandedDao(false);
    setFullDaoReading(null);
    setDaoReadingError(false);
    setError(false);
    setVisibleAphorisms(3);
    setOpenOffer(null);
    setResult({ mode, ...matched, hexagram: mode === "dao" ? drawRandomHexagram() : undefined });
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      setError(true);
      textareaRef.current?.focus();
      return;
    }
    // Asking the question always opens the short Daoist answer first.
    // The other two modes remain available through their own buttons.
    choose("dao");
  }

  useEffect(() => {
    const number = result?.mode === "dao" ? result.hexagram : undefined;
    if (!expandedDao || !number || fullDaoReading?.number === number) return;
    const selectedNumber: number = number;
    let cancelled = false;
    async function loadReading() {
      try {
        if (daoAuthorHexagramNumbers.includes(selectedNumber)) {
          const { default: records } = await import("@/data/dao-hexagram-author.json");
          const text = records.find(record => record.number === selectedNumber)?.text;
          if (!cancelled) {
            if (text) setFullDaoReading({ number: selectedNumber, text, kind: "original" });
            else setDaoReadingError(true);
          }
        } else {
          // The 52 full editorial readings are intentionally code-split.
          const { getDaoEditorialHexagramText } = await import("@/data/dao-hexagrams-editorial.mjs");
          const text = getDaoEditorialHexagramText(selectedNumber);
          if (!cancelled) {
            if (text) setFullDaoReading({ number: selectedNumber, text, kind: "editorial" });
            else setDaoReadingError(true);
          }
        }
      } catch {
        if (!cancelled) setDaoReadingError(true);
      }
    }
    void loadReading();
    return () => { cancelled = true; };
  }, [expandedDao, result?.mode, result?.hexagram, fullDaoReading]);

  const exampleHexagram = getHexagram(42);
  const hexagram = result?.mode === "dao" && result.hexagram ? getHexagram(result.hexagram) : null;
  const answerLocale = result ? detectIdeasQuestionLocale(question, locale) : locale;
  const answerCopy = copy[answerLocale];
  const topicLabel = result ? (result.matched ? answerCopy.topic[result.topic] : answerCopy.generic) : "";
  const aphorismMatches = result && (result.mode === "aphorisms" || result.mode === "dao") ? getIdeasAphorismMatches(question, answerLocale, result.topic) : [];
  return (
    <section className={styles.root} aria-labelledby="ideas-title" data-ideas-discovery lang={locale}>
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}><Sparkles size={15} aria-hidden="true" />{t.eyebrow}</p>
          <h1 id="ideas-title">{t.title}</h1>
          <p className={styles.lead}>{t.lead}</p>
        </div>
        <span className={styles.decor} aria-hidden="true">✦</span>
      </div>

      <form className={styles.question} onSubmit={submitQuestion}>
        <label htmlFor="ideas-question">{t.question}</label>
        <div className={styles.questionFields}>
          <Sparkles className={styles.inputSparkle} size={21} aria-hidden="true" />
          <textarea
            id="ideas-question" ref={textareaRef} maxLength={500} rows={1} autoComplete="off"
            placeholder={t.placeholder} value={question} aria-invalid={error || attachmentError}
            aria-describedby={error || attachmentError ? "ideas-question-error ideas-question-privacy" : "ideas-question-privacy"}
            onChange={(event) => { setQuestion(event.target.value); setError(false); setAttachmentError(false); setResult(null); setVisibleAphorisms(3); setOpenOffer(null); }}
          />
          <input ref={fileInputRef} className={styles.fileInput} type="file" tabIndex={-1}
            accept=".txt,.md,text/plain,text/markdown"
            onChange={async (event) => {
              const file = event.currentTarget.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              if (file.size > 16384 || !/\.(txt|md)$/i.test(file.name)) {
                setAttachmentError(true); return;
              }
              try {
                const excerpt = (await file.text()).trim();
                setQuestion(current => [current, excerpt].filter(Boolean).join(" ").slice(0, 500));
                setAttachmentError(false); setError(false); setResult(null); setVisibleAphorisms(3); setOpenOffer(null);
                textareaRef.current?.focus();
              } catch { setAttachmentError(true); }
            }}
          />
          <button type="button" className={styles.attach} aria-label={t.attach}
            title={t.attach} onClick={() => fileInputRef.current?.click()}>
            <Paperclip size={20} aria-hidden="true" />
          </button>
        </div>
        <button type="submit" className={styles.submit}><Send size={18} aria-hidden="true" />{t.ask}</button>
        {error || attachmentError ? <p className={styles.error} role="alert" id="ideas-question-error">{attachmentError ? t.attachError : t.error}</p> : null}
        <details className={styles.privacyDisclosure}>
          <summary id="ideas-question-privacy">{t.privacyShort}</summary>
          <p className={styles.privacy}>{t.privacy}</p>
        </details>
      </form>

      <p className={styles.actionLabel}>{t.choose}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => choose("dao")} aria-pressed={activeMode === "dao"} className={styles.action}>
          <span className={styles.modeYin} aria-hidden="true">☯</span><span>{t.dao}</span>
        </button>
        <button type="button" onClick={() => choose("aphorisms")} aria-pressed={activeMode === "aphorisms"} className={styles.action}>
          <Quote aria-hidden="true" size={22} /><span>{t.aphorisms}</span>
        </button>
        <button type="button" onClick={() => choose("personal")} aria-pressed={activeMode === "personal"} className={styles.action}>
          <Sprout aria-hidden="true" size={22} /><span>{t.personal}</span>
        </button>
      </div>

      {result ? (
        <div className={`${styles.results} ${result.mode === "personal" ? styles.personalResults : ""}`} key={result.mode + "-" + result.topic} aria-live="polite" data-ideas-result={result.mode} data-question-language={answerLocale} lang={answerLocale}>
          {result.mode !== "dao" ? (
            <div className={styles.resultsHeading}>
              <div>
                <p className={styles.tag}>{answerCopy.basedOn}: {topicLabel}</p>
                <h2>{answerCopy.headings[result.mode]}</h2>
              </div>
              <button type="button" className={styles.reset} onClick={() => { setResult(null); setQuestion(""); textareaRef.current?.focus(); }}>{answerCopy.reset} ×</button>
            </div>
          ) : null}
          {result.mode === "dao" && hexagram ? (
            <AphorismTiles items={aphorismMatches.slice(0, 3)} locale={answerLocale} heading={answerCopy.aphorismsForYou} />
          ) : null}
          {result.mode === "dao" && hexagram ? (
            <div className={styles.daoQuick} data-ideas-dao>
              <div className={styles.daoLandscape} aria-hidden="true" />
              <p className={styles.daoEyebrow}><span className={styles.yinYang} aria-hidden="true">☯</span><span>{answerCopy.dao}</span></p>
              <h2 className={styles.daoTitle}>{answerCopy.hexagramWord} {hexagram.number} — {hexagramTitle(hexagram, answerLocale)}</h2>
              <p className={styles.daoSummary} data-ideas-dao-summary>
                <strong>{answerCopy.dao} · {hexagramTitle(hexagram, answerLocale)}.</strong>{" "}{hexagramEssence(hexagram, answerLocale)}
              </p>
              <button type="button" className={styles.expandDao}
                aria-expanded={expandedDao} aria-controls="ideas-dao-details"
                onClick={() => { setExpandedDao(open => !open); setDaoReadingError(false); }}>
                {expandedDao ? answerCopy.collapseDao : answerCopy.expandDao}<ChevronDown aria-hidden="true" size={18} />
              </button>
              <div id="ideas-dao-details" className={styles.daoDetails} hidden={!expandedDao}
                data-ideas-dao-expanded={expandedDao ? "true" : undefined}>
                {expandedDao ? (
                  <>
                    <div className={styles.resultsHeading}>
                      <div>
                        <p className={styles.tag}>{answerCopy.basedOn}: {topicLabel}</p>
                        <h2>{answerCopy.headings.dao}</h2>
                      </div>
                      <button type="button" className={styles.reset}
                        onClick={() => { setResult(null); setQuestion(""); setExpandedDao(false); textareaRef.current?.focus(); }}>
                        {answerCopy.reset} ×
                      </button>
                    </div>
                    <div className={styles.daoInterpretation} data-ideas-dao-meaning>
                      <div className={styles.daoGlyphCard}>
                        <DaoHexagramGlyph upper={hexagram.upper} lower={hexagram.lower} label={"Hexagram " + hexagram.number} />
                        <strong>{hexagram.number}</strong>
                        <span>{hexagramTitle(hexagram, answerLocale)}</span>
                      </div>
                      <div className={styles.daoPoints}>
                        <div className={styles.daoPoint}>
                          <Sprout size={24} aria-hidden="true" />
                          <div><strong>{answerCopy.meaning}</strong><p>{hexagramEssence(hexagram, answerLocale)}</p></div>
                        </div>
                        <div className={styles.daoPoint}>
                          <Flower2 size={24} aria-hidden="true" />
                          <div><strong>{answerCopy.message}</strong><p>{answerCopy.topicMessage[result.topic]}</p></div>
                        </div>
                        <div className={styles.daoPoint}>
                          <Sun size={24} aria-hidden="true" />
                          <div><strong>{answerCopy.step}</strong><p>{answerCopy.topicStep[result.topic]}</p></div>
                        </div>
                      </div>
                    </div>
                    <div className={styles.daoReading} data-ideas-dao-reading>
                      {fullDaoReading?.number === hexagram.number ? (
                        <>
                          <p className={styles.tag}>{fullDaoReading.kind === "original" ? answerCopy.originalReading : answerCopy.editorialReading}</p>
                          <div className={styles.daoProse} lang="ru">
                            {fullDaoReading.text.split(/\n\n+/).filter(Boolean).map((part, index) => <p key={index}>{part}</p>)}
                          </div>
                        </>
                      ) : <p className={styles.daoReadingStatus} role="status">{daoReadingError ? answerCopy.unavailableReading : answerCopy.loadingReading}</p>}
                    </div>
                    <div className={styles.hexagramActions}>
                      <Link href={"/" + answerLocale + "/dao/hexagrams/" + hexagram.number} prefetch={false}>
                        {answerCopy.card}<ArrowRight size={16} aria-hidden="true" />
                      </Link>
                      <button type="button" onClick={() => {
                        setExpandedDao(false);
                        setFullDaoReading(null);
                        setDaoReadingError(false);
                        setResult({ ...result, hexagram: drawRandomHexagram() });
                      }}><RefreshCw size={16} aria-hidden="true" />{answerCopy.again}</button>
                    </div>
                    <p className={styles.note}>{answerCopy.daoNote}</p>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}
          {result.mode === "dao" && hexagram ? (
            <DaoOfferCards locale={answerLocale} openOffer={openOffer}
              onToggle={offer => setOpenOffer(current => current === offer ? null : offer)} />
          ) : null}
          {result.mode === "aphorisms" ? (
            <>
              <ol className={styles.aphorisms}>
                {aphorismMatches.slice(0, visibleAphorisms).map((item, index) => (
                  <li key={item.id}>
                    <span className={styles.number}>{String(index + 1).padStart(2, "0")}</span>
                    <div className={styles.aphorismBody}>
                      <p>{item.text}</p>
                      <div className={styles.aphorismAttribution}>
                        <BookOpen size={14} aria-hidden="true" />
                        <span className={styles.aphorismSourceLabel}>
                          {item.kind === "inspired" && item.source ? answerCopy.inspiredBy : answerCopy.sourceLabel}:
                        </span>
                        {item.kind === "inspired" && item.source ? (
                          <a className={styles.aphorismSource} href={item.source.url} target="_blank" rel="noopener noreferrer">
                            {item.source.author} · <cite>{item.source.work}</cite><ArrowUpRight size={13} aria-hidden="true" />
                          </a>
                        ) : <span className={styles.aphorismSource}>{answerCopy.editorial}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {visibleAphorisms < aphorismMatches.length ? (
                <button type="button" className={styles.moreAphorisms}
                  onClick={() => setVisibleAphorisms(count => Math.min(count + 3, aphorismMatches.length))}>
                  <Sparkles size={17} aria-hidden="true" />{answerCopy.more}<ArrowRight size={17} aria-hidden="true" />
                </button>
              ) : null}
            </>
          ) : null}
          {result.mode === "personal" ? (
            <div className={styles.guidance} data-ideas-guidance>
              <div className={styles.guidanceIntro}>
                <p>{answerCopy.guidanceIntro}</p>
                <span className={styles.guidanceFree}>{answerCopy.free}</span>
              </div>
              <ol className={styles.guidanceList} data-ideas-guidance-list>
                {getIdeasFreeRecommendations(result.topic).map((id, index) => {
                  const item = answerCopy.service[id];
                  return (
                    <li className={index === 0 ? styles.guidancePriority : undefined} key={id}>
                      <Link className={styles.guidanceLink} href={freeOfferHref(answerLocale, id)} prefetch={false}>
                        <span className={styles.guidanceIndex} aria-hidden="true">0{index + 1}</span>
                        <span className={styles.guidanceContent}>
                          <span className={styles.guidanceEyebrow}>{index === 0 ? answerCopy.guidanceMatch : answerCopy.guidanceOther}</span>
                          <strong className={styles.guidanceTitle}>{item.title}</strong>
                          <span className={styles.guidanceDescription}>{item.description}</span>
                          <span className={styles.guidanceAction}>{item.action}<ArrowRight size={14} aria-hidden="true" /></span>
                        </span>
                        <span className={styles.guidanceArrow} aria-hidden="true"><ArrowUpRight size={19} /></span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </div>
          ) : null}
          {result.mode !== "dao" ? <p className={styles.note}>{result.mode === "aphorisms" ? answerCopy.aphorismNote : answerCopy.personalNote}</p> : null}
        </div>
      ) : exampleHexagram ? (
        <div className={styles.results + " " + styles.preview} data-ideas-preview aria-label={t.preview}>
          <AphorismTiles items={getIdeasAphorismMatches("growth", locale, "resources").slice(0, 3)}
            locale={locale} heading={t.sampleAphorisms} />
          <DaoInsightPanel entry={exampleHexagram} locale={locale} topic="resources" example />
          <p className={styles.note}>{t.previewNote}</p>
          <DaoOfferCards locale={locale} openOffer={openOffer}
            onToggle={offer => setOpenOffer(current => current === offer ? null : offer)} />
        </div>
      ) : null}
    </section>
  );
}
