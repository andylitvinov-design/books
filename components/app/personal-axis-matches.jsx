"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Compass, BookOpen, Play, ClipboardList, HandHeart } from "lucide-react";
import { PROFILE_RESEARCH_AXES } from "@/lib/profile/profile-scale-selection";
import { publishedAxisOffers, rankAxisOffers, verifiedAxisEvidence, AXIS_REFS } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import { coreServiceOffers } from "@/data/core-service-offers";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import styles from "./personal-axis-matches.module.css";

const TEXT = {
  en: {
    title: "Find your next step by profile axis", intro: "Choose an axis you want to explore. Your verified test results add context; they never decide what is wrong with you.",
    choose: "Choose a topic and axis", placeholder: "Select a focus", noFocus: "Choose one axis to see matched published videos, tests, courses and services.",
    measured: "Scored axes in your private tests", none: "No current source-verified measurement for this axis. You can still explore it by choice.",
    current: "Your source score", method: "Test and date", facet: "Axis", result: "Open test result",
    missing: "Not assessed", noAverage: "No population comparison or deficit inferred.",
    suggestions: "Related existing options", noMatches: "No reviewed published offer is linked to this axis yet.",
    relevance: "Editorial topic relevance", privacy: "Only you can see these scores. Choosing a link does not transmit them or create a lead, booking or payment.",
    group: {video:"Videos",test:"Tests",course:"Courses",service:"Services"},
    levels: {primary:"Primary axis",supporting:"Supporting axis",related:"Related theme"},
    audio:"Original audio", noPromise:"These are thematic suggestions, not predicted results or clinical recommendations.",
    topics: {emotions:"Emotions",recovery:"Recovery",body:"Body",connection:"Relationships",
      work:"Work",money:"Money",traits:"Personality",support:"Personal resources",meaning:"Meaning",goal:"Goals"},
  },
  ru: {
    title: "Персональный подбор по осям профиля", intro: "Выберите ось, с которой хотите поработать. Результаты проверенных тестов дают контекст, но не определяют ваши недостатки.",
    choose: "Выберите тему и ось", placeholder: "Выберите приоритет", noFocus: "Выберите ось, чтобы увидеть соответствующие опубликованные видео, тесты, курсы и услуги.",
    measured: "Измеренные оси ваших тестов", none: "По этой оси пока нет актуального проверенного результата. Вы всё равно можете выбрать её как цель.",
    current: "Ваш балл по методике", method: "Тест и дата", facet: "Ось", result: "Открыть результат",
    missing: "Не исследовано", noAverage: "Сравнение с популяцией или вывод о дефиците не производится.",
    suggestions: "Подходящие существующие предложения", noMatches: "Для этой оси пока нет проверенного опубликованного предложения.",
    relevance: "Тематическое соответствие", privacy: "Баллы видны только вам. Переход по ссылке не передаёт их и не создаёт лид, бронь или оплату.",
    group: {video:"Видео",test:"Тесты",course:"Курсы",service:"Услуги"},
    levels: {primary:"Основная ось",supporting:"Поддерживающая ось",related:"Смежная тема"},
    audio:"Язык оригинала", noPromise:"Это тематический подбор, а не прогноз результата или медицинская рекомендация.",
    topics: {emotions:"Эмоции",recovery:"Восстановление",body:"Тело",connection:"Отношения",
      work:"Работа",money:"Деньги",traits:"Личность",support:"Ресурсы",meaning:"Смыслы",goal:"Цели"},
  },
  es: {
    title:"Recomendaciones según los ejes del perfil", intro:"Elige qué eje te interesa explorar. Los resultados verificados dan contexto, no señalan deficiencias personales.",
    choose:"Elige un tema y un eje",placeholder:"Selecciona tu prioridad",noFocus:"Selecciona un eje para ver vídeos, pruebas, cursos y servicios disponibles.",
    measured:"Ejes medidos en tus pruebas",none:"No existe una medición verificada actual para este eje. Aun así, puedes elegirlo como objetivo.",
    current:"Tu puntuación original",method:"Prueba y fecha",facet:"Eje",result:"Abrir resultado",
    missing:"No evaluado",noAverage:"No se infieren déficits ni comparaciones poblacionales.",
    suggestions:"Opciones disponibles",noMatches:"Aún no hay una oferta publicada y revisada vinculada a este eje.",
    relevance:"Relevancia temática editorial",privacy:"Solo tú ves tus resultados. Abrir enlaces no los transmite ni crea una reserva, contacto o pago.",
    group:{video:"Vídeos",test:"Pruebas",course:"Cursos",service:"Servicios"},
    levels:{primary:"Eje principal",supporting:"Eje complementario",related:"Tema relacionado"},
    audio:"Idioma original",noPromise:"Son sugerencias temáticas, no resultados previstos ni consejos médicos.",
    topics:{emotions:"Emociones",recovery:"Recuperación",body:"Cuerpo",connection:"Relaciones",
      work:"Trabajo",money:"Dinero",traits:"Personalidad",support:"Recursos",meaning:"Sentido",goal:"Objetivos"},
  },
};
const TYPES = [
  {id:"video",Icon:Play}, {id:"test",Icon:ClipboardList},
  {id:"course",Icon:BookOpen}, {id:"service",Icon:HandHeart},
];

export function PersonalAxisMatches({ measurements = [], locale = "en", showMeasurements = true }) {
  const lang = ["en","ru","es"].includes(locale) ? locale : "en";
  const t = TEXT[lang];
  const [focus, setFocus] = useState("");
  const media = useMemo(() => lang === "ru"
    ? freeMeditationVideos("ru").map(video => ({...video,sourceLanguage:"ru"}))
    : englishGuidedMeditations.filter(video => video.youtubeId)
      .map(video => ({...video,sourceLanguage:"en"})), [lang]);
  const offers = useMemo(() => publishedAxisOffers({
    locale:lang, services:coreServiceOffers(lang), videos:media,
  }), [lang, media]);
  const evidence = useMemo(() => verifiedAxisEvidence(measurements), [measurements]);
  const selectedEvidence = evidence.filter(row => row.axisRef === focus);
  const matches = useMemo(() => focus ? rankAxisOffers({
    chosenAxis:focus,offers,measurements,limit:30,
  }) : [], [focus,offers,measurements]);

  const selectedLabel = focus && AXIS_REFS[focus]
    ? AXIS_REFS[focus].label[lang] || AXIS_REFS[focus].label.en : "";
  return <section className={styles.root} aria-label={t.title} data-personal-axis-matching>
    <div className={styles.heading}>
      <Compass size={19} aria-hidden="true"/>
      <div><h3>{t.title}</h3><p>{t.intro}</p></div>
    </div>
    <label className={styles.selectLabel} htmlFor="hh-axis-match-focus">{t.choose}</label>
    <div className={styles.selectWrap}>
      <select id="hh-axis-match-focus" value={focus} onChange={event=>setFocus(event.target.value)} data-axis-focus>
        <option value="">{t.placeholder}</option>
        {Object.entries(PROFILE_RESEARCH_AXES).map(([topic, axes]) =>
          <optgroup key={topic} label={t.topics[topic] || topic}>
            {axes.map(axis => <option key={topic+"::"+axis.id} value={topic+"::"+axis.id}>
              {axis.label[lang] || axis.label.en}
            </option>)}
          </optgroup>)}
      </select>
      <ChevronDown size={17} aria-hidden="true"/>
    </div>
    {showMeasurements && <details className={styles.measureDetails}>
      <summary>{t.measured} · {evidence.length}</summary>
      {evidence.length ? <div className={styles.scrollTable}>
        <table><thead><tr><th>{t.facet}</th><th>{t.current}</th><th>{t.method}</th></tr></thead>
          <tbody>{evidence.map(item=><tr key={item.resultId+":"+item.dimensionKey}>
            <td>{AXIS_REFS[item.axisRef]?.label[lang] || item.axisRef}</td>
            <td>{item.rawValue} / {item.max}</td>
            <td>{item.sourceTitle}<small>{item.measuredAt.slice(0,10)}</small></td>
          </tr>)}</tbody></table>
      </div> : <p className={styles.muted}>{t.missing}</p>}
      <p className={styles.muted}>{t.noAverage}</p>
    </details>}
    {!focus ? <p className={styles.empty}>{t.noFocus}</p> : <>
      <div className={styles.focusLine} data-axis-context>
        <strong>{selectedLabel}</strong>
        {selectedEvidence.length ? <div className={styles.evidence}>
          {selectedEvidence.slice(0,2).map(item=><div key={item.resultId+item.dimensionKey}>
            <span>{t.current}: <b>{item.rawValue} / {item.max}</b> · {item.sourceTitle}</span>
            <Link href={"/"+lang+"/app/results/"+encodeURIComponent(item.resultId)}
              prefetch={false}>{t.result}<ArrowRight size={14} aria-hidden="true"/></Link>
          </div>)}
          <small>{t.noAverage}</small>
        </div> : <small>{t.none}</small>}
      </div>
      <h4 className={styles.suggestionTitle}>{t.suggestions}</h4>
      {matches.length ? <div className={styles.groupGrid}>
        {TYPES.map(({id,Icon}) => {
          const rows = matches.filter(item=>item.kind===id).slice(0,2);
          return rows.length ? <section key={id} className={styles.group} data-axis-offer-kind={id}>
            <h5><Icon size={16} aria-hidden="true"/>{t.group[id]}</h5>
            {rows.map(item=><article key={item.id} className={styles.offer}
              data-axis-offer={item.id} data-match-level={item.matchLevel}>
              <span className={styles.rank}>{t.levels[item.matchLevel]} · {t.relevance} {item.score}/100</span>
              <strong>{item.title}</strong>
              {item.kind==="video" && <small>{t.audio}: {item.originalLanguage?.toUpperCase()}</small>}
              {item.href.startsWith("https://") ?
                <a href={item.href} target="_blank" rel="noopener noreferrer">{t.group[id]}<ArrowRight size={14} aria-hidden="true"/></a> :
                <Link href={item.href} prefetch={false}>{t.group[id]}<ArrowRight size={14} aria-hidden="true"/></Link>}
            </article>)}
          </section> : null;
        })}
      </div> : <p className={styles.empty}>{t.noMatches}</p>}
      <p className={styles.muted}>{t.noPromise}</p>
    </>}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
