"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { getHexagram, hexagramEssence, hexagramTitle, archivePhotoFor, trigramInfo } from "@/data/dao-hexagrams.mjs";
import { drawRandomHexagram, validHexagramNumber } from "@/lib/dao-divination.mjs";
import authorRecords from "@/data/dao-hexagram-author.json";
import { DaoHexagramGlyph } from "./dao-hexagram-glyph";
import styles from "./dao-divination.module.css";

type Locale = "en" | "ru" | "es";
type Selection = { number: number; method: "question" | "number" };
const authorByNumber = new Map(authorRecords.map((record) => [record.number, record]));

const copy = {
  ru: {
    eyebrow: "☯ И-Цзин · Книга Перемен", title: "Даосское гадание", introduction: "Сформулируйте вопрос и откройте случайный символ. Или введите номер от 1 до 64, чтобы увидеть конкретную гексаграмму.",
    questionTitle: "Задать вопрос", questionLabel: "Ваш вопрос или ситуация", questionHint: "Вопрос остаётся только в этом окне браузера — мы его не отправляем и не сохраняем.", questionPlaceholder: "Что мне важно понять в моей ситуации?",
    draw: "Получить случайную гексаграмму", numberTitle: "Найти по номеру", numberLabel: "Номер гексаграммы · 1–64", numberPlaceholder: "Например, 49", find: "Открыть карту",
    invalidQuestion: "Напишите свой вопрос перед гаданием.", invalidNumber: "Укажите целое число от 1 до 64.",
    resultFromQuestion: "Выпал символ для вашего вопроса", resultFromNumber: "Выбранная гексаграмма", upper: "Верх", lower: "Низ",
    original: "Авторское толкование", reference: "Традиционная справка", authorFull: "Полное авторское толкование", referenceShort: "Краткое значение", readPage: "Открыть отдельную карточку", allCards: "Все 64 карточки", clear: "Сбросить выбор", source: "Исходная публикация",
    noAuthor: "Развёрнутый авторский текст пока не найден; показана только справочная трактовка.", originalLanguage: "Авторский оригинал на русском.",
    photoOriginal: "Фотография из авторской публикации", photoThematic: "Тематическая фотография из архива автора",
    caveat: "Символ выбирается случайно, независимо от содержания вопроса. Это способ символического размышления, не достоверный прогноз или медицинский совет.",
    questionNotSaved: "Вопрос нигде не сохраняется. Не вводите конфиденциальные персональные данные.",
  },
  en: {
    eyebrow: "☯ I Ching · Book of Changes", title: "Daoist divination", introduction: "Ask a question and draw a random hexagram. Or enter a number from 1 to 64 to reveal the corresponding card.",
    questionTitle: "Ask a question", questionLabel: "Your question or situation", questionHint: "Your question stays in this browser field. It is never submitted or stored.", questionPlaceholder: "What do I need to understand about my situation?",
    draw: "Draw a random hexagram", numberTitle: "Find by number", numberLabel: "Hexagram number · 1–64", numberPlaceholder: "For example, 49", find: "Reveal the card",
    invalidQuestion: "Enter a question before drawing.", invalidNumber: "Enter a whole number from 1 to 64.",
    resultFromQuestion: "Hexagram drawn for your question", resultFromNumber: "Selected hexagram", upper: "Above", lower: "Below",
    original: "Original interpretation", reference: "Traditional reference", authorFull: "Full author interpretation", referenceShort: "Short reference meaning", readPage: "View individual card", allCards: "Browse all 64 cards", clear: "Clear selection", source: "Original Telegram publication",
    noAuthor: "No verified extended author text was found for this hexagram. This is a short reference interpretation only.", originalLanguage: "Original author's text is in Russian.",
    photoOriginal: "Photo from original author post", photoThematic: "Thematic photo from the author's archive",
    caveat: "The draw is random and independent of your question. Use it for reflection, not for guaranteed prediction or medical advice.",
    questionNotSaved: "Your question is not saved. Avoid entering confidential personal information.",
  },
  es: {
    eyebrow: "☯ I Ching · Libro de los Cambios", title: "Adivinación taoísta", introduction: "Escribe una pregunta y recibe un hexagrama al azar. O introduce un número del 1 al 64 para descubrir la tarjeta correspondiente.",
    questionTitle: "Hacer una pregunta", questionLabel: "Tu pregunta o situación", questionHint: "La pregunta permanece en este campo del navegador. No se envía ni se guarda.", questionPlaceholder: "¿Qué necesito comprender de mi situación?",
    draw: "Obtener un hexagrama al azar", numberTitle: "Buscar por número", numberLabel: "Número del hexagrama · 1–64", numberPlaceholder: "Por ejemplo, 49", find: "Revelar la tarjeta",
    invalidQuestion: "Escribe una pregunta antes de consultar.", invalidNumber: "Introduce un número entero del 1 al 64.",
    resultFromQuestion: "Hexagrama obtenido para tu pregunta", resultFromNumber: "Hexagrama elegido", upper: "Arriba", lower: "Abajo",
    original: "Interpretación original", reference: "Referencia tradicional", authorFull: "Interpretación completa del autor", referenceShort: "Significado resumido", readPage: "Abrir tarjeta individual", allCards: "Ver las 64 tarjetas", clear: "Borrar selección", source: "Publicación original en Telegram",
    noAuthor: "No se ha confirmado un texto extenso del autor para este hexagrama. Esta es solo una breve referencia.", originalLanguage: "Texto original del autor en ruso.",
    photoOriginal: "Foto de la publicación original", photoThematic: "Foto temática del archivo del autor",
    caveat: "El resultado es aleatorio e independiente del contenido de la pregunta. Es una herramienta de reflexión, no una predicción ni un consejo médico.",
    questionNotSaved: "La pregunta no se guarda. Evita compartir datos personales confidenciales.",
  },
} as const;

export function DaoDivinationPanel({ locale }: { locale: Locale }) {
  const t = copy[locale];
  const [question, setQuestion] = useState("");
  const [numberText, setNumberText] = useState("");
  const [error, setError] = useState<"question" | "number" | null>(null);
  const [selection, setSelection] = useState<Selection | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);
  useEffect(() => { if (selection) resultRef.current?.focus(); }, [selection]);
  function handleQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!question.trim()) { setError("question"); return; }
    setError(null);
    setSelection({ number: drawRandomHexagram(), method: "question" });
    setQuestion(""); // Do not retain the visitor's question after drawing.
  }
  function handleNumber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = validHexagramNumber(numberText);
    if (value === null) { setError("number"); return; }
    setError(null);
    setSelection({ number: value, method: "number" });
  }
  const item = selection ? getHexagram(selection.number) : null;
  const author = item ? authorByNumber.get(item.number) : undefined;
  const title = item ? hexagramTitle(item, locale) : "";
  return (
    <section className={styles.panel} aria-labelledby="dao-divination-heading">
      <div className={styles.intro}>
        <div>
          <p className={styles.eyebrow}>{t.eyebrow}</p>
          <h2 id="dao-divination-heading">{t.title}</h2>
          <p>{t.introduction}</p>
        </div>
        <span className={styles.headerSymbol} aria-hidden="true">☯</span>
      </div>
      <div className={styles.inputs}>
        <form className={styles.form} onSubmit={handleQuestion} noValidate>
          <h3>{t.questionTitle}</h3>
          <label htmlFor="dao-divination-question">{t.questionLabel}</label>
          <textarea autoComplete="off" id="dao-divination-question" rows={3} maxLength={500} value={question}
            onChange={(event) => { setQuestion(event.target.value); if (error === "question") setError(null); }}
            placeholder={t.questionPlaceholder} aria-invalid={error === "question"} aria-describedby={error === "question" ? "dao-question-privacy dao-question-error" : "dao-question-privacy"} />
          <small id="dao-question-privacy">{t.questionHint}</small>
          {error === "question" ? <p className={styles.error} id="dao-question-error" role="alert">{t.invalidQuestion}</p> : null}
          <button className={styles.primaryButton} type="submit">{t.draw} <span aria-hidden="true">↗</span></button>
        </form>
        <form className={styles.form} onSubmit={handleNumber} noValidate>
          <h3>{t.numberTitle}</h3>
          <label htmlFor="dao-divination-number">{t.numberLabel}</label>
          <input id="dao-divination-number" type="number" min={1} max={64} step={1} inputMode="numeric"
            value={numberText} onChange={(event) => { setNumberText(event.target.value); if (error === "number") setError(null); }}
            placeholder={t.numberPlaceholder} aria-invalid={error === "number"} aria-describedby={error === "number" ? "dao-number-error" : undefined} />
          <small>{locale === "ru" ? "Каждый номер всегда открывает одну и ту же гексаграмму." : locale === "es" ? "Cada número corresponde siempre al mismo hexagrama." : "Each number always opens the same hexagram."}</small>
          {error === "number" ? <p className={styles.error} id="dao-number-error" role="alert">{t.invalidNumber}</p> : null}
          <button className={styles.secondaryButton} type="submit">{t.find} <span aria-hidden="true">→</span></button>
        </form>
      </div>
      <div className={styles.panelFooter}>
        <Link href={"/" + locale + "/dao/hexagrams"}>{t.allCards} →</Link>
        <p>{t.caveat}</p>
      </div>
      {item && selection ? (
        <div className={styles.result} key={item.number + "-" + selection.method} ref={resultRef} tabIndex={-1} aria-label={t.resultFromNumber + ": " + title}>
          <div className={styles.resultHeading}>
            <p className={styles.eyebrow}>{selection.method === "question" ? t.resultFromQuestion : t.resultFromNumber}</p>
            <button className={styles.clear} type="button" onClick={() => {
              setSelection(null); setError(null); setNumberText(""); setQuestion("");
            }}>{t.clear} ×</button>
          </div>
          <div className={styles.resultGrid}>
            <figure className={styles.resultPhoto}>
              {/* Reuse first-party archival images rather than fetching third-party embeds. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={archivePhotoFor(item, author?.photo)} width={720} height={450} alt={author?.photo ? t.photoOriginal : t.photoThematic} loading="lazy" decoding="async" />
              <figcaption>{author?.photo ? t.photoOriginal : t.photoThematic}</figcaption>
            </figure>
            <div className={styles.resultCopy}>
              <div className={styles.resultName}>
                <DaoHexagramGlyph upper={item.upper} lower={item.lower} label={"Hexagram " + item.number} />
                <div>
                  <p className={styles.kicker}>№ {item.number} · {item.hanzi}</p>
                  <h3>{title}</h3>
                  <small className={author ? styles.originalTag : styles.referenceTag}>{author ? t.original : t.reference}</small>
                </div>
              </div>
              <p className={styles.trigrams}>{t.upper}: {trigramInfo[item.upper][locale]} · {t.lower}: {trigramInfo[item.lower][locale]}</p>
              <p>{hexagramEssence(item, locale)}</p>
              {author ? (
                <details className={styles.fullReading} open key={item.number}>
                  <summary>{t.authorFull} <span aria-hidden="true">⌄</span></summary>
                  <div lang="ru" className={styles.authorText}>
                    {author.text.split(/\n\n+/).filter(Boolean).map((part, index) => <p key={index}>{part}</p>)}
                  </div>
                  <p className={styles.languageNote}>{t.originalLanguage}</p>
                  {author.source ? <a href={author.source} rel="noopener noreferrer" target="_blank">{t.source} ↗</a> : null}
                </details>
              ) : <div className={styles.noAuthor}><strong>{t.referenceShort}</strong><p>{t.noAuthor}</p></div>}
              <Link className={styles.detailLink} href={"/" + locale + "/dao/hexagrams/" + item.number}>{t.readPage} →</Link>
            </div>
          </div>
        </div>
      ) : null}
      <p className={styles.disclaimer}>{t.questionNotSaved}</p>
    </section>
  );
}
