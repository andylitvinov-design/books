"use client";

import Link from "next/link";
import { type FormEvent, useRef, useState } from "react";
import { ArrowRight, Compass, HandHeart, Leaf, Quote, RefreshCw, Sparkles, ClipboardCheck } from "lucide-react";
import { DaoHexagramGlyph } from "@/components/dao-hexagram-glyph";
import { getHexagram, hexagramEssence, hexagramTitle } from "@/data/dao-hexagrams.mjs";
import { drawRandomHexagram } from "@/lib/dao-divination.mjs";
import { getIdeasAphorisms, getIdeasFreeRecommendations, matchIdeasTopic } from "@/lib/ideas-guidance.mjs";
import type { IdeasTopic } from "@/lib/ideas-guidance.mjs";
import type { PublicLocale } from "@/lib/public-locales";
import styles from "./ideas-discovery.module.css";

type Mode = "dao" | "aphorisms" | "personal";
type Result = { mode: Mode; topic: IdeasTopic; matched: boolean; hexagram?: number };

const copy = {
  ru: {
    eyebrow: "ИДЕИ · ПОДСКАЗКИ ДЛЯ ВАС",
    title: "Идеи",
    lead: "Задайте вопрос, получите вдохновение и полезную подсказку.",
    question: "О чём хотите спросить?",
    placeholder: "Задайте вопрос или опишите, что вас волнует…",
    choose: "Выберите способ получить подсказку",
    ask: "Задать вопрос",
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
    headings: { dao: "Символ Книги Перемен", aphorisms: "Три афоризма для размышления", personal: "Ваши бесплатные варианты" },
    topic: { relationships: "Отношения и близость", stress: "Тревога и внутреннее спокойствие", resources: "Ресурсы и энергия", work: "Работа и решения", direction: "Выбор и направление" },
    daoNote: "Одна из 64 гексаграмм выпадает случайно, независимо от смысла вопроса. Это образ для размышления, а не предсказание.",
    again: "Другой символ",
    card: "Прочитать толкование",
    aphorismNote: "Оригинальные редакционные размышления по приблизительно определённой теме — не цитаты древних авторов.",
    personalNote: "Это тематический подбор, не индивидуальная оценка. Выберите формат и заполните существующую форму на странице услуги.",
    free: "Бесплатно",
    go: "Открыть",
    reset: "Новый вопрос",
    service: {
      review: { title: "Бесплатный разбор ситуации", description: "Опишите вопрос и получите персональный письменный разбор возможных шагов.", action: "Отправить запрос" },
      tests: { title: "Стресс и психопрофиль", description: "Пройдите бесплатные тесты самооценки и увидьте, на что обратить внимание.", action: "Выбрать тесты" },
      dao: { title: "Профиль ресурсов У-Син", description: "Исследуйте личные ресурсы в символической модели пяти элементов.", action: "Узнать о профиле" },
    },
  },
  en: {
    eyebrow: "IDEAS & GUIDANCE",
    title: "Ideas",
    lead: "Ask a question, find inspiration and a practical next step.",
    question: "What would you like guidance on?",
    placeholder: "Ask a question or share what is on your mind…",
    choose: "Choose how to explore your question",
    ask: "Get guidance",
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
    headings: { dao: "A symbol from the Book of Changes", aphorisms: "Three reflections for your topic", personal: "Your free starting points" },
    topic: { relationships: "Relationships and connection", stress: "Stress and inner calm", resources: "Energy and resources", work: "Work and decisions", direction: "Choices and direction" },
    daoNote: "One of 64 hexagrams is drawn at random, independently of your question. It offers a symbol for reflection, not a prediction.",
    again: "Draw another",
    card: "Read interpretation",
    aphorismNote: "New editorial reflections matched by approximate topic, not quotations attributed to historical thinkers.",
    personalNote: "These are topic-based options, not a personal assessment. Choose a format and complete its existing request form.",
    free: "Free",
    go: "Explore",
    reset: "New question",
    service: {
      review: { title: "Free situation review", description: "Share your situation and request a personal written reflection on possible next steps.", action: "Request review" },
      tests: { title: "Stress & personal profile", description: "Explore free self-check scales and identify areas worth reflecting on.", action: "Explore tests" },
      dao: { title: "Wu Xing resource profile", description: "Explore your resources using the symbolic five-elements model.", action: "Explore profile" },
    },
  },
  es: {
    eyebrow: "IDEAS Y ORIENTACIÓN",
    title: "Ideas",
    lead: "Haz una pregunta, encuentra inspiración y un primer paso útil.",
    question: "¿Sobre qué quieres una orientación?",
    placeholder: "Escribe tu pregunta o lo que te preocupa…",
    choose: "Elige cómo explorar tu pregunta",
    ask: "Pedir orientación",
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
    headings: { dao: "Un símbolo del Libro de los Cambios", aphorisms: "Tres reflexiones sobre tu tema", personal: "Tus primeros pasos gratuitos" },
    topic: { relationships: "Relaciones y cercanía", stress: "Estrés y calma interior", resources: "Energía y recursos", work: "Trabajo y decisiones", direction: "Opciones y rumbo" },
    daoNote: "Uno de los 64 hexagramas se elige al azar, independientemente de tu pregunta. Es un símbolo para reflexionar, no una predicción.",
    again: "Otro símbolo",
    card: "Leer interpretación",
    aphorismNote: "Reflexiones editoriales originales por tema aproximado; no son citas atribuidas a autores históricos.",
    personalNote: "Son opciones por tema, no una evaluación personal. Elige una y completa el formulario existente de la página.",
    free: "Gratis",
    go: "Explorar",
    reset: "Otra pregunta",
    service: {
      review: { title: "Revisión gratuita de tu situación", description: "Comparte tu pregunta y solicita una reflexión personal por escrito.", action: "Solicitar revisión" },
      tests: { title: "Estrés y perfil personal", description: "Explora pruebas gratuitas de autoevaluación y descubre temas para reflexionar.", action: "Ver pruebas" },
      dao: { title: "Perfil de recursos Wu Xing", description: "Explora tus recursos con el modelo simbólico de los cinco elementos.", action: "Ver perfil" },
    },
  },
} as const;

const icons = { review: HandHeart, tests: ClipboardCheck, dao: Leaf } as const;

function freeOfferHref(locale: PublicLocale, id: "review" | "tests" | "dao") {
  if (id === "tests") return "/" + (locale === "es" ? "en" : locale) + "/client/tests";
  if (id === "review") return "/" + locale + "/services/free-situation-review#request-free-review";
  return "/" + (locale === "es" ? "en" : locale) + "/services/dao-health-profile#request-free-wu-xing";
}

export function IdeasDiscovery({ locale }: { locale: PublicLocale }) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [error, setError] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [activeMode, setActiveMode] = useState<Mode>("dao");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function choose(mode: Mode) {
    setActiveMode(mode);
    if (!question.trim()) {
      setError(false);
      textareaRef.current?.focus();
      return;
    }
    const matched = matchIdeasTopic(question);
    setError(false);
    setResult({ mode, ...matched, hexagram: mode === "dao" ? drawRandomHexagram() : undefined });
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) {
      setError(true);
      textareaRef.current?.focus();
      return;
    }
    choose(activeMode);
  }

  const exampleHexagram = getHexagram(42);
  const hexagram = result?.mode === "dao" && result.hexagram ? getHexagram(result.hexagram) : null;
  const topicLabel = result ? (result.matched ? t.topic[result.topic] : t.generic) : "";
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
          <textarea
            id="ideas-question" ref={textareaRef} maxLength={500} rows={1} autoComplete="off"
            placeholder={t.placeholder} value={question} aria-invalid={error}
            aria-describedby={error ? "ideas-question-error ideas-question-privacy" : "ideas-question-privacy"}
            onChange={(event) => { setQuestion(event.target.value); setError(false); setResult(null); }}
          />
          <button type="submit" className={styles.submit}><Sparkles size={17} aria-hidden="true" />{t.ask}</button>
        </div>
        {error ? <p className={styles.error} role="alert" id="ideas-question-error">{t.error}</p> : null}
        <details className={styles.privacyDisclosure}>
          <summary id="ideas-question-privacy">{t.privacyShort}</summary>
          <p className={styles.privacy}>{t.privacy}</p>
        </details>
      </form>

      <p className={styles.actionLabel}>{t.choose}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => choose("dao")} aria-pressed={activeMode === "dao"} className={styles.action}>
          <Compass aria-hidden="true" size={21} /><span>{t.dao}</span><ArrowRight aria-hidden="true" size={16} />
        </button>
        <button type="button" onClick={() => choose("aphorisms")} aria-pressed={activeMode === "aphorisms"} className={styles.action}>
          <Quote aria-hidden="true" size={21} /><span>{t.aphorisms}</span><ArrowRight aria-hidden="true" size={16} />
        </button>
        <button type="button" onClick={() => choose("personal")} aria-pressed={activeMode === "personal"} className={styles.action}>
          <HandHeart aria-hidden="true" size={21} /><span>{t.personal}</span><ArrowRight aria-hidden="true" size={16} />
        </button>
      </div>

      {result ? (
        <div className={styles.results} key={result.mode + "-" + result.topic} aria-live="polite" data-ideas-result={result.mode}>
          <div className={styles.resultsHeading}>
            <div>
              <p className={styles.tag}>{t.basedOn}: {topicLabel}</p>
              <h2>{t.headings[result.mode]}</h2>
            </div>
            <button type="button" className={styles.reset} onClick={() => { setResult(null); setQuestion(""); textareaRef.current?.focus(); }}>{t.reset} ×</button>
          </div>
          {result.mode === "dao" && hexagram ? (
            <article className={styles.hexagramCard}>
              <div className={styles.hexagramMark}>
                <DaoHexagramGlyph upper={hexagram.upper} lower={hexagram.lower} label={"Hexagram " + hexagram.number} />
              </div>
              <div className={styles.hexagramText}>
                <p className={styles.tag}>№ {hexagram.number} · {hexagram.hanzi}</p>
                <h3>{hexagramTitle(hexagram, locale)}</h3>
                <p>{hexagramEssence(hexagram, locale)}</p>
                <div className={styles.hexagramActions}>
                  <Link href={"/" + locale + "/dao/hexagrams/" + hexagram.number} prefetch={false}>{t.card}<ArrowRight size={16} aria-hidden="true" /></Link>
                  <button type="button" onClick={() => setResult({ ...result, hexagram: drawRandomHexagram() })}><RefreshCw size={16} aria-hidden="true" />{t.again}</button>
                </div>
              </div>
            </article>
          ) : null}
          {result.mode === "aphorisms" ? (
            <ol className={styles.aphorisms}>
              {getIdeasAphorisms(result.topic, locale).map((line, index) => (
                <li key={index}><span className={styles.number}>0{index + 1}</span><p>{line}</p></li>
              ))}
            </ol>
          ) : null}
          {result.mode === "personal" ? (
            <div className={styles.offers}>
              {getIdeasFreeRecommendations(result.topic).map((id) => {
                const item = t.service[id];
                const Icon = icons[id];
                return (
                  <article className={styles.offer} key={id}>
                    <div className={styles.offerHead}><Icon size={19} aria-hidden="true" /><span>{t.free}</span></div>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                    <Link href={freeOfferHref(locale, id)} prefetch={false}>{item.action}<ArrowRight size={16} aria-hidden="true" /></Link>
                  </article>
                );
              })}
            </div>
          ) : null}
          <p className={styles.note}>{result.mode === "dao" ? t.daoNote : result.mode === "aphorisms" ? t.aphorismNote : t.personalNote}</p>
        </div>
      ) : exampleHexagram ? (
        <div className={styles.results + " " + styles.preview} data-ideas-preview aria-label={t.preview}>
          <p className={styles.tag}><Leaf size={15} aria-hidden="true" />{t.preview}</p>
          <div className={styles.hexagramCard}>
            <div className={styles.hexagramMark}>
              <DaoHexagramGlyph upper={exampleHexagram.upper} lower={exampleHexagram.lower} label={"Hexagram 42"} />
            </div>
            <div className={styles.hexagramText}>
              <h2 className={styles.previewTitle}>42 · {hexagramTitle(exampleHexagram, locale)}</h2>
              <p>{hexagramEssence(exampleHexagram, locale)}</p>
            </div>
          </div>
          <p className={styles.note}>{t.previewNote}</p>
        </div>
      ) : null}
    </section>
  );
}
