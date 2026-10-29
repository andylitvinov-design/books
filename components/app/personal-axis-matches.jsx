"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Compass, BookOpen, Play, ClipboardList, HandHeart, Headphones } from "lucide-react";
import { PROFILE_RESEARCH_AXES } from "@/lib/profile/profile-scale-selection";
import { publishedAxisOffers, verifiedAxisEvidence, AXIS_REFS } from "@/lib/holistic-support/axis-offer-matcher.mjs";
import { buildHolisticIntelligencePlan } from "@/lib/holistic-support/holistic-intelligence.mjs";
import { coreServiceOffers } from "@/data/core-service-offers";
import { englishGuidedMeditations } from "@/data/academy/english-guided-meditations";
import { freeMeditationVideos } from "@/data/academy/holistic-support-meditations";
import styles from "./personal-axis-matches.module.css";

const TEXT = {
  en: {
    title: "Find your next step by profile axis", intro: "Choose an axis you want to explore. Your verified test results add context; they never decide what is wrong with you.",
    moreAxes:"Compare up to three axes (optional)", axisTwo:"Second axis",axisThree:"Third axis",now:"Now (my own rating 0–10)",want:"Want (my own rating 0–10)",gapNote:"These are optional personal ratings, separate from test scores.",
    choose: "Choose a topic and axis", placeholder: "Select a focus", noFocus: "Choose one axis to see matched published videos, tests, courses and services.",
    measured: "Scored axes in your private tests", none: "No current source-verified measurement for this axis. You can still explore it by choice.",
    current: "Your source score", method: "Test and date", facet: "Axis", result: "Open test result",
    missing: "Not assessed", noAverage: "No population comparison or deficit inferred.",
    suggestions: "Related existing options", noMatches: "No reviewed published offer is linked to this axis yet.",
    relevance: "Editorial topic relevance", privacy: "Only you can see these scores. Choosing a link does not transmit them or create a lead, booking or payment.",
    group: {video:"Videos",audio:"Audio",test:"Tests",course:"Courses",service:"Services"},
    useEvidence:"Use saved test evidence to refine matches",audioLoad:"Check published course audio",
    audioLoading:"Checking released audio…",audioReady:"Course audio checked",
    audioNone:"No course audio is published in this language yet.",audioError:"Audio unavailable; editor sounds are still available.",
    soundtrack:"Soundtrack for the video editor, not a recorded meditation",
    courseAudio:"Published course introduction · listen",audioLink:"Choose in editor",
    levels: {primary:"Primary axis",supporting:"Supporting axis",related:"Related theme"},
    audio:"Original audio", noPromise:"These are thematic suggestions, not predicted results or clinical recommendations.",
    topics: {emotions:"Emotions",recovery:"Recovery",body:"Body",connection:"Relationships",
      work:"Work",money:"Money",traits:"Personality",support:"Personal resources",meaning:"Meaning",goal:"Goals"},
  },
  ru: {
    title: "Персональный подбор по осям профиля", intro: "Выберите ось, с которой хотите поработать. Результаты проверенных тестов дают контекст, но не определяют ваши недостатки.",
    moreAxes:"Сопоставить до трёх осей (необязательно)",axisTwo:"Вторая ось",axisThree:"Третья ось",now:"Сейчас (моя оценка 0–10)",want:"Хочу (моя оценка 0–10)",gapNote:"Это необязательные самооценки, отдельно от баллов теста.",
    choose: "Выберите тему и ось", placeholder: "Выберите приоритет", noFocus: "Выберите ось, чтобы увидеть соответствующие опубликованные видео, тесты, курсы и услуги.",
    measured: "Измеренные оси ваших тестов", none: "По этой оси пока нет актуального проверенного результата. Вы всё равно можете выбрать её как цель.",
    current: "Ваш балл по методике", method: "Тест и дата", facet: "Ось", result: "Открыть результат",
    missing: "Не исследовано", noAverage: "Сравнение с популяцией или вывод о дефиците не производится.",
    suggestions: "Подходящие существующие предложения", noMatches: "Для этой оси пока нет проверенного опубликованного предложения.",
    relevance: "Тематическое соответствие", privacy: "Баллы видны только вам. Переход по ссылке не передаёт их и не создаёт лид, бронь или оплату.",
    group: {video:"Видео",audio:"Аудио",test:"Тесты",course:"Курсы",service:"Услуги"},
    useEvidence:"Учесть результаты моих тестов",audioLoad:"Проверить опубликованные аудиоуроки",
    audioLoading:"Проверяем опубликованные аудиозаписи…",audioReady:"Аудиозаписи проверены",
    audioNone:"На этом языке пока нет опубликованных аудиоуроков.",audioError:"Каталог аудио недоступен; звуки редактора доступны.",
    soundtrack:"Звук для видеоредактора, не готовая аудиомедитация",
    courseAudio:"Опубликованное вступительное аудио · слушать",audioLink:"Выбрать в редакторе",
    levels: {primary:"Основная ось",supporting:"Поддерживающая ось",related:"Смежная тема"},
    audio:"Язык оригинала", noPromise:"Это тематический подбор, а не прогноз результата или медицинская рекомендация.",
    topics: {emotions:"Эмоции",recovery:"Восстановление",body:"Тело",connection:"Отношения",
      work:"Работа",money:"Деньги",traits:"Личность",support:"Ресурсы",meaning:"Смыслы",goal:"Цели"},
  },
  es: {
    title:"Recomendaciones según los ejes del perfil", intro:"Elige qué eje te interesa explorar. Los resultados verificados dan contexto, no señalan deficiencias personales.",
    moreAxes:"Comparar hasta tres ejes (opcional)",axisTwo:"Segundo eje",axisThree:"Tercer eje",now:"Ahora (valoración propia 0–10)",want:"Objetivo (valoración propia 0–10)",gapNote:"Valoraciones opcionales, independientes de las pruebas.",
    choose:"Elige un tema y un eje",placeholder:"Selecciona tu prioridad",noFocus:"Selecciona un eje para ver vídeos, pruebas, cursos y servicios disponibles.",
    measured:"Ejes medidos en tus pruebas",none:"No existe una medición verificada actual para este eje. Aun así, puedes elegirlo como objetivo.",
    current:"Tu puntuación original",method:"Prueba y fecha",facet:"Eje",result:"Abrir resultado",
    missing:"No evaluado",noAverage:"No se infieren déficits ni comparaciones poblacionales.",
    suggestions:"Opciones disponibles",noMatches:"Aún no hay una oferta publicada y revisada vinculada a este eje.",
    relevance:"Relevancia temática editorial",privacy:"Solo tú ves tus resultados. Abrir enlaces no los transmite ni crea una reserva, contacto o pago.",
    group:{video:"Vídeos",audio:"Audio",test:"Pruebas",course:"Cursos",service:"Servicios"},
    useEvidence:"Usar los resultados guardados",audioLoad:"Consultar audio publicado",
    audioLoading:"Comprobando audio…",audioReady:"Audio del curso comprobado",
    audioNone:"Todavía no hay audio publicado en este idioma.",audioError:"Audio no disponible; siguen los sonidos del editor.",
    soundtrack:"Sonido para el editor de vídeo; no es una meditación grabada",
    courseAudio:"Introducción del curso publicada · escuchar",audioLink:"Elegir en el editor",
    levels:{primary:"Eje principal",supporting:"Eje complementario",related:"Tema relacionado"},
    audio:"Idioma original",noPromise:"Son sugerencias temáticas, no resultados previstos ni consejos médicos.",
    topics:{emotions:"Emociones",recovery:"Recuperación",body:"Cuerpo",connection:"Relaciones",
      work:"Trabajo",money:"Dinero",traits:"Personalidad",support:"Recursos",meaning:"Sentido",goal:"Objetivos"},
  },
};
const TYPES = [
  {id:"video",Icon:Play}, {id:"audio",Icon:Headphones}, {id:"test",Icon:ClipboardList},
  {id:"course",Icon:BookOpen}, {id:"service",Icon:HandHeart},
];

export function PersonalAxisMatches({ measurements = [], locale = "en", showMeasurements = true }) {
  const lang = ["en","ru","es"].includes(locale) ? locale : "en";
  const t = TEXT[lang];
  const [focus, setFocus] = useState("");
  const [second, setSecond] = useState("");
  const [third, setThird] = useState("");
  const [now, setNow] = useState("");
  const [want, setWant] = useState("");
  const [includeTestEvidence, setIncludeTestEvidence] = useState(false);
  const [loadCourseAudio, setLoadCourseAudio] = useState(false);
  const [audioRefresh, setAudioRefresh] = useState(0);
  const [publishedCourseAudio, setPublishedCourseAudio] = useState([]);
  const [audioState, setAudioState] = useState("idle");

  // Only fixed lesson/locale GETs reach the public API; no scores, IDs or free
  // text are sent. The server releases audio only from the approved manifest.
  useEffect(() => {
    if (!loadCourseAudio || lang === "es") return;
    const ctrl = new AbortController();
    let alive = true;
    setAudioState("loading");
    const lessons = ["flight","tantra","kundalini","yggdrasil","initiation"];
    Promise.all(lessons.map(async lesson => {
      const response = await fetch("/api/reiki-intro-audio?lesson="+lesson+"&locale="+lang,
        {signal:ctrl.signal,credentials:"omit"});
      if (!response.ok) throw new Error("PUBLIC_AUDIO_UNAVAILABLE");
      const data = await response.json();
      return data?.audio?.src && data?.audio?.publishedAt
        ? {lesson,locale:lang,src:data.audio.src,
          publishedAt:data.audio.publishedAt,verifiedPublicManifest:true} : null;
    })).then(rows => {
      if (!alive) return;
      const approved = rows.filter(Boolean);
      setPublishedCourseAudio(approved);
      setAudioState(approved.length ? "ready" : "none");
    }).catch(() => { if (alive) setAudioState("error"); });
    return () => {alive=false;ctrl.abort();};
  }, [loadCourseAudio,lang,audioRefresh]);
  const media = useMemo(() => lang === "ru"
    ? freeMeditationVideos("ru").map(video => ({...video,sourceLanguage:"ru"}))
    : englishGuidedMeditations.filter(video => video.youtubeId)
      .map(video => ({...video,sourceLanguage:"en"})), [lang]);
  const offers = useMemo(() => publishedAxisOffers({
    locale:lang, services:coreServiceOffers(lang), videos:media,
  }), [lang, media]);
  const evidence = useMemo(() => verifiedAxisEvidence(measurements), [measurements]);
  const selectedEvidence = evidence.filter(row => row.axisRef === focus);
  const selectedAxes = [focus, second, third].filter(Boolean);
  const goalRatings = now !== "" && want !== "" ? {[focus]:{current:Number(now),desired:Number(want)}} : {};
  const intelligence = useMemo(() => focus ? buildHolisticIntelligencePlan({
    locale:lang,
    intent:{chosenAxes:selectedAxes,goalRatings,
      enabledFormats:["video","audio","test","course","service"]},
    profile:{ownerAuthorized:true,consentToUseResults:includeTestEvidence,measurements},
    catalogs:{axisOffers:offers,publishedReikiAudio:publishedCourseAudio},
    limits:{axisOffers:30,publicAudio:5,editorAudio:3},
  }) : null, [focus,second,third,now,want,offers,measurements,includeTestEvidence,publishedCourseAudio,lang]);
  const matches = [...(intelligence?.axisOffers || []),...(intelligence?.audio || [])];

  const selectedLabel = focus && AXIS_REFS[focus]
    ? AXIS_REFS[focus].label[lang] || AXIS_REFS[focus].label.en : "";
  return <section className={styles.root} aria-label={t.title} data-personal-axis-matching>
    <div className={styles.heading}>
      <Compass size={19} aria-hidden="true"/>
      <div><h3>{t.title}</h3><p>{t.intro}</p></div>
    </div>
    <label className={styles.selectLabel} htmlFor="hh-axis-match-focus">{t.choose}</label>
    <div className={styles.selectWrap}>
      <select id="hh-axis-match-focus" value={focus} onChange={event=>{setFocus(event.target.value);setNow("");setWant("");}} data-axis-focus>
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
    <details className={styles.extraControls} data-axis-secondary-controls>
      <summary>{t.moreAxes}</summary>
      <div className={styles.extraGrid}>
        {[{id:"hh-axis-match-second",label:t.axisTwo,value:second,setter:setSecond},
          {id:"hh-axis-match-third",label:t.axisThree,value:third,setter:setThird}].map(field=><label key={field.id} htmlFor={field.id}>
          {field.label}<select id={field.id} value={field.value} onChange={event=>field.setter(event.target.value)}>
            <option value="">—</option>
            {Object.entries(PROFILE_RESEARCH_AXES).map(([topic, axes]) =>
              <optgroup key={topic} label={t.topics[topic] || topic}>
                {axes.map(axis=><option value={topic+"::"+axis.id} key={topic+"::"+axis.id}>
                  {axis.label[lang] || axis.label.en}</option>)}
              </optgroup>)}
          </select>
        </label>)}
      </div>
    </details>
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
      <div className={styles.goalGap} data-axis-personal-gap>
        <div><label htmlFor="hh-axis-self-now">{t.now}</label>
          <input id="hh-axis-self-now" type="number" min="0" max="10" step="1" inputMode="numeric"
            value={now} onChange={event=>setNow(event.target.value)} placeholder="—"/></div>
        <div><label htmlFor="hh-axis-self-want">{t.want}</label>
          <input id="hh-axis-self-want" type="number" min="0" max="10" step="1" inputMode="numeric"
            value={want} onChange={event=>setWant(event.target.value)} placeholder="—"/></div>
        <small>{t.gapNote}</small>
      </div>
      <label className={styles.consent}>
        <input type="checkbox" checked={includeTestEvidence}
          onChange={event=>setIncludeTestEvidence(event.target.checked)}
          data-intelligence-use-test-evidence /> {t.useEvidence}
      </label>
      <h4 className={styles.suggestionTitle}>{t.suggestions}</h4>
      {matches.length ? <div className={styles.groupGrid}>
        {TYPES.map(({id,Icon}) => {
          const rows = matches.filter(item=>item.kind===id).slice(0,2);
          return rows.length ? <section key={id} className={styles.group} data-axis-offer-kind={id}>
            <h5><Icon size={16} aria-hidden="true"/>{t.group[id]}</h5>
            {rows.map(item=><article key={item.id} className={styles.offer}
              data-axis-offer={item.id} data-match-level={item.matchLevel}>
              <span className={styles.rank}>{item.kind==="audio" ?
                (item.playable ? t.courseAudio : t.soundtrack) :
                t.levels[item.matchLevel] + " · " + t.relevance + " " + item.score + "/100"}</span>
              <strong>{item.title}</strong>
              {item.kind!=="audio" && item.matchedAxes?.length ? <small className={styles.matchedAxes}>
                {item.matchedAxes.map(axis=>AXIS_REFS[axis.ref]?.label[lang] || axis.ref).join(" · ")}
              </small> : null}
              {item.kind==="video" && <small>{t.audio}: {item.originalLanguage?.toUpperCase()}</small>}
              {item.kind==="audio" && item.playable ?
                <audio controls preload="none" src={item.href} aria-label={item.title} /> :
                item.href.startsWith("https://") ?
                  <a href={item.href} target="_blank" rel="noopener noreferrer">{t.group[id]}<ArrowRight size={14} aria-hidden="true"/></a> :
                  <Link href={item.href} prefetch={false}>
                    {item.kind==="audio"?t.audioLink:t.group[id]}<ArrowRight size={14} aria-hidden="true"/>
                  </Link>}
            </article>)}
          </section> : null;
        })}
      </div> : <p className={styles.empty}>{t.noMatches}</p>}
      {lang!=="es" && <div className={styles.audioLookup}>
        <button type="button" onClick={()=>{setLoadCourseAudio(true);setAudioRefresh(n=>n+1);}}
          disabled={audioState==="loading"} data-intelligence-public-audio>
          <Headphones size={16} aria-hidden="true"/>
          {audioState==="loading"?t.audioLoading:audioState==="ready"?t.audioReady:t.audioLoad}
        </button>
        {audioState==="none" && <small>{t.audioNone}</small>}
        {audioState==="error" && <small role="status">{t.audioError}</small>}
      </div>}
      <p className={styles.muted}>{t.noPromise}</p>
    </>}
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
