"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Compass, HandHeart, Quote, RefreshCw, Sparkles } from "lucide-react";
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
    eyebrow: "ВАШ ВОПРОС · ТРИ СПОСОБА НАЙТИ ИДЕЮ",
    title: "Идеи",
    lead: "Опишите, что вас волнует, где нужен ответ или новый взгляд. Выберите символ, три афоризма или подходящий бесплатный первый шаг.",
    question: "О чём хотите спросить?",
    placeholder: "Например: как мне найти опору, когда я переживаю из-за отношений?",
    choose: "Выберите способ получить подсказку",
    dao: "Даосская подсказка",
    aphorisms: "Афоризмы",
    personal: "Личная подсказка",
    error: "Сначала напишите вопрос или тему.",
    privacy: "Ваш текст обрабатывается только в браузере: не сохраняется, не передаётся в CRM или аналитику. Не указывайте конфиденциальные данные.",
    basedOn: "Тема запроса",
    generic: "Общий вопрос",
    headings: { dao: "Символ Книги Перемен", aphorisms: "Три афоризма для размышления", personal: "Три способа начать" },
    topic: { relationships: "Отношения и близость", stress: "Тревога и внутреннее спокойствие", resources: "Ресурсы и энергия", work: "Работа и решения", direction: "Выбор и направление" },
    daoNote: "Одна из 64 гексаграмм выпадает случайно, независимо от смысла вопроса. Это образ для размышления, а не предсказание.",
    again: "Другой символ",
    card: "Прочитать толкование",
    aphorismNote: "Оригинальные редакционные размышления по приблизительно определённой теме — не цитаты древних авторов.",
    personalNote: "Это тематический подбор, не индивидуальная оценка. Выберите формат и заполните существующую форму на странице услуги.",
    guidanceIntro: "Выберите один вариант, с которого хочется начать.",
    guidanceMatch: "Рекомендуем по теме запроса",
    guidanceOther: "Ещё один вариант",
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
    eyebrow: "YOUR QUESTION · THREE WAYS TO FIND AN IDEA",
    title: "Ideas",
    lead: "Share what is on your mind or where you need a fresh perspective. Discover a symbol, three reflections, or a useful free first step.",
    question: "What would you like guidance on?",
    placeholder: "For example: how can I find steadiness when relationships feel uncertain?",
    choose: "Choose how to explore your question",
    dao: "Daoist insight",
    aphorisms: "Aphorisms",
    personal: "Personal guidance",
    error: "Please enter a question or topic first.",
    privacy: "Your text stays in this browser. It is not saved or sent to CRM or analytics. Avoid sharing sensitive personal details.",
    basedOn: "Topic",
    generic: "Open-ended question",
    headings: { dao: "A symbol from the Book of Changes", aphorisms: "Three reflections for your topic", personal: "Three ways to begin" },
    topic: { relationships: "Relationships and connection", stress: "Stress and inner calm", resources: "Energy and resources", work: "Work and decisions", direction: "Choices and direction" },
    daoNote: "One of 64 hexagrams is drawn at random, independently of your question. It offers a symbol for reflection, not a prediction.",
    again: "Draw another",
    card: "Read interpretation",
    aphorismNote: "New editorial reflections matched by approximate topic, not quotations attributed to historical thinkers.",
    personalNote: "These are topic-based options, not a personal assessment. Choose a format and complete its existing request form.",
    guidanceIntro: "Choose the starting point that feels right for you.",
    guidanceMatch: "Suggested for your topic",
    guidanceOther: "Another option",
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
    eyebrow: "TU PREGUNTA · TRES MANERAS DE ENCONTRAR IDEAS",
    title: "Ideas",
    lead: "Comparte qué te preocupa o dónde necesitas una nueva perspectiva. Descubre un símbolo, tres reflexiones o un primer paso gratuito.",
    question: "¿Sobre qué quieres una orientación?",
    placeholder: "Por ejemplo: ¿cómo encontrar equilibrio cuando mis relaciones son inciertas?",
    choose: "Elige cómo explorar tu pregunta",
    dao: "Consejo taoísta",
    aphorisms: "Aforismos",
    personal: "Orientación personal",
    error: "Primero escribe tu pregunta o tema.",
    privacy: "El texto permanece en este navegador. No se guarda ni se envía al CRM o a analítica. Evita datos personales sensibles.",
    basedOn: "Tema",
    generic: "Pregunta abierta",
    headings: { dao: "Un símbolo del Libro de los Cambios", aphorisms: "Tres reflexiones sobre tu tema", personal: "Tres maneras de empezar" },
    topic: { relationships: "Relaciones y cercanía", stress: "Estrés y calma interior", resources: "Energía y recursos", work: "Trabajo y decisiones", direction: "Opciones y rumbo" },
    daoNote: "Uno de los 64 hexagramas se elige al azar, independientemente de tu pregunta. Es un símbolo para reflexionar, no una predicción.",
    again: "Otro símbolo",
    card: "Leer interpretación",
    aphorismNote: "Reflexiones editoriales originales por tema aproximado; no son citas atribuidas a autores históricos.",
    personalNote: "Son opciones por tema, no una evaluación personal. Elige una y completa el formulario existente de la página.",
    guidanceIntro: "Elige por dónde te gustaría empezar.",
    guidanceMatch: "Sugerido para tu tema",
    guidanceOther: "Otra opción",
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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function choose(mode: Mode) {
    if (!question.trim()) {
      setError(true);
      textareaRef.current?.focus();
      return;
    }
    const matched = matchIdeasTopic(question);
    setError(false);
    setResult({ mode, ...matched, hexagram: mode === "dao" ? drawRandomHexagram() : undefined });
  }

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

      <div className={styles.question}>
        <label htmlFor="ideas-question">{t.question}</label>
        <textarea
          id="ideas-question" ref={textareaRef} maxLength={500} rows={2} autoComplete="off"
          placeholder={t.placeholder} value={question} aria-invalid={error}
          aria-describedby={error ? "ideas-question-error ideas-question-privacy" : "ideas-question-privacy"}
          onChange={(event) => { setQuestion(event.target.value); setError(false); setResult(null); }}
        />
        {error ? <p className={styles.error} role="alert" id="ideas-question-error">{t.error}</p> : null}
        <p id="ideas-question-privacy" className={styles.privacy}>{t.privacy}</p>
      </div>

      <p className={styles.actionLabel}>{t.choose}</p>
      <div className={styles.actions}>
        <button type="button" onClick={() => choose("dao")} aria-pressed={result?.mode === "dao"} className={styles.action}>
          <Compass aria-hidden="true" size={21} /><span>{t.dao}</span><ArrowRight aria-hidden="true" size={16} />
        </button>
        <button type="button" onClick={() => choose("aphorisms")} aria-pressed={result?.mode === "aphorisms"} className={styles.action}>
          <Quote aria-hidden="true" size={21} /><span>{t.aphorisms}</span><ArrowRight aria-hidden="true" size={16} />
        </button>
        <button type="button" onClick={() => choose("personal")} aria-pressed={result?.mode === "personal"} className={styles.action}>
          <HandHeart aria-hidden="true" size={21} /><span>{t.personal}</span><ArrowRight aria-hidden="true" size={16} />
        </button>
      </div>

      {result ? (
        <div className={`${styles.results} ${result.mode === "personal" ? styles.personalResults : ""}`} key={result.mode + "-" + result.topic} aria-live="polite" data-ideas-result={result.mode}>
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
            <div className={styles.guidance} data-ideas-guidance>
              <div className={styles.guidanceIntro}>
                <p>{t.guidanceIntro}</p>
                <span className={styles.guidanceFree}>{t.free}</span>
              </div>
              <ol className={styles.guidanceList} data-ideas-guidance-list>
                {getIdeasFreeRecommendations(result.topic).map((id, index) => {
                  const item = t.service[id];
                  return (
                    <li className={index === 0 ? styles.guidancePriority : undefined} key={id}>
                      <Link className={styles.guidanceLink} href={freeOfferHref(locale, id)} prefetch={false}>
                        <span className={styles.guidanceIndex} aria-hidden="true">0{index + 1}</span>
                        <span className={styles.guidanceContent}>
                          <span className={styles.guidanceEyebrow}>{index === 0 ? t.guidanceMatch : t.guidanceOther}</span>
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
          <p className={styles.note}>{result.mode === "dao" ? t.daoNote : result.mode === "aphorisms" ? t.aphorismNote : t.personalNote}</p>
        </div>
      ) : null}
    </section>
  );
}
