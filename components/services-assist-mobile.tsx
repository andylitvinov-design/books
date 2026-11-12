"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowRight, HeartHandshake, Search, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { inferAssistPreferences, nextAssistQuestion, rankAssistOffers } from "@/lib/assist/service-match.mjs";
import type { AssistPreferences } from "@/lib/assist/service-match.mjs";
import styles from "./services-assist-mobile.module.css";
import { AssistTopRecommendations } from "./assist-top-recommendations";
import { ServicesAssistHomeopathy } from "./services-assist-homeopathy";

type Focus = "stress" | "relationships" | "energy" | "health" | "work" | "growth" | "general";
const routes = {
  tests: "tests", review: "services/free-situation-review", opora: "courses/antistress",
  therapy: "services/imagery-therapy", constellation: "services/systemic-constellations",
  business: "services/business-consulting", reiki: "services/remote-energy-support",
  mandala: "holistic-support/mandala", talisman: "holistic-support/mobile",
  homeopathy: "services/psychohomeopathy", masters: "masters", academy: "academy/reiki",
  mytube: "mytube", aiCoach: "my-coach",
} as const;
type Option = keyof typeof routes;
const signals: readonly [Exclude<Focus,"general">, RegExp][] = [
  ["health", /болезн|симптом|здоровь|врач|диагноз|illness|symptom|health|salud|síntoma/i],
  ["stress", /стресс|тревог|страх|напряж|выгоран|устал|stress|anxiet|burnout|ansiedad|estrés|agotad/i],
  ["relationships", /отношен|любов|партн|семь|одиноч|relationship|partner|love|family|relaci|pareja|familia/i],
  ["work", /работ|карьер|бизнес|деньг|финанс|work|career|business|money|trabajo|negocio|dinero/i],
  ["energy", /энерг|сил нет|тело|рейки|reiki|energ|body|cuerpo/i],
  ["growth", /смысл|цель|путь|развит|самопозн|meaning|purpose|growth|goal|sentido|propósito/i],
];
const urgent = /суицид|убить себя|самоповрежд|покончить с собой|suicid|self.harm|kill myself|quiero morir|hacerme daño/i;
const detect = (text: string): Focus => signals.find(([,re])=>re.test(text))?.[0] ?? "general";
const toolList: readonly Option[] = ["therapy","homeopathy","reiki","mandala","talisman","constellation","academy","masters"];

const copy = {
  ru: {
    eyebrow:"HOLISTIC HOUSE · ASSIST", title:"Что сейчас вам нужно?", lead:"Расскажите, что происходит. Мы поможем найти подходящий способ поддержки.",
    placeholder:"Например: я постоянно напряжён и хочу научиться расслабляться…", submit:"Подобрать поддержку", topics:"Или выберите тему",
    hints:[["Стресс и тревога","Хочу уменьшить стресс и тревогу","stress"],["Отношения","Хочу разобраться в отношениях","relationships"],["Нет энергии","Чувствую усталость и нехватку сил","energy"],["Здоровье","Меня беспокоит самочувствие","health"],["Работа и деньги","Хочу разобраться с работой и деньгами","work"],["Смысл и развитие","Ищу смысл и направление развития","growth"]],
    privacy:"Подбор работает в вашем браузере: текст не сохраняется и не отправляется внешнему ИИ.", voice:"Можно использовать диктовку на клавиатуре телефона.",
    label:"Ваш запрос", answer:"Что может помочь", change:"Изменить запрос", tools:"Инструменты поддержки", browse:"Можно выбрать метод самостоятельно — без разговора.", all:"Все услуги и мастера",
    reply:{stress:"Начните с самопроверки, затем попробуйте практику. Личная работа остаётся вашим выбором.",relationships:"Сначала можно прояснить ситуацию, а затем выбрать индивидуальную поддержку.",energy:"Оцените своё состояние и попробуйте подходящую практику.",health:"При физических симптомах важна медицинская оценка. Здесь — только дополнительная поддержка и самоисследование.",work:"Бесплатный разбор поможет сформулировать запрос. Затем можно обсудить решения на консультации.",growth:"Начните с прояснения вопроса, а затем выберите обучение или личную работу.",general:"Вот несколько реальных вариантов, с которых можно начать без обязательной записи."},
    skip:"Пропустить", adjust:"Изменить пожелания", noOffers:"С такими условиями сейчас нет подтверждённых вариантов. Можно изменить формат или бюджет.",
    questions:{"mode":{"prompt":"Как вам удобнее получить поддержку?","options":[["Со специалистом","human"],["С ИИ-консультантом","ai"],["Посмотреть видео","video"],["Самостоятельно","self"],["Пока не знаю","any"]]},"channel":{"prompt":"Как вам комфортнее общаться?","options":[["Очно","inperson"],["По видеосвязи","online"],["Заочно, без встречи","async"],["Неважно","any"]]},"budget":{"prompt":"Какой бюджет сейчас комфортен?","options":[["Только бесплатно","free"],["До €50","under50"],["До €100","under100"],["Можно обсудить","flexible"]]}},
    cards:{tests:["Тесты самочувствия","Бесплатная самопроверка и наблюдение за динамикой.","Бесплатно"],review:["Разбор ситуации","Короткая анкета и личный письменный ответ.","Бесплатно"],opora:["Курс ОПОРА","Пошаговые упражнения для работы со стрессом.","Курс"],therapy:["Образная психотерапия","Индивидуальная работа с переживаниями и образами.","Личная сессия"],constellation:["Расстановки","Исследование отношений и повторяющихся сценариев.","Личная сессия"],business:["Бизнес-консультация","Прояснение рабочих целей и практических решений.","Консультация"],reiki:["Сеансы Рейки","Энергетические и символические практики по желанию.","По запросу"],mandala:["Персональная мандала","Визуальная символическая практика для саморефлексии.","Практика"],talisman:["Талисманы","Символический каталог в Holistic Support.","Символика"],homeopathy:["Психогомеопатия","Авторский подход и его ограничения.","Ознакомиться"],masters:["Мастера","Опубликованные профили и услуги специалистов.","Каталог"],academy:["Рейки Академия","Обучающие программы и доступные практики.","Обучение"],mytube:["Видео MyTube","Короткие практики и тематические видео.","Видео"],aiCoach:["ИИ-коуч","Разговор с ИИ-помощником для размышления, не психотерапия.","ИИ"]},
    caution:"Гомеопатия не имеет надёжных доказательств эффективности для лечения заболеваний. Символические и энергетические практики не заменяют медицинскую или психологическую помощь.",
    crisis:"Если вы можете причинить себе вред или находитесь в непосредственной опасности, обратитесь в местную экстренную или кризисную службу прямо сейчас.",
  },
  en: {
    eyebrow:"HOLISTIC HOUSE · ASSIST", title:"What would help right now?", lead:"Tell us what's happening. Explore suitable ways to find support.",
    placeholder:"For example: I feel tense and want to learn to relax…", submit:"Find support", topics:"Or choose a topic",
    hints:[["Stress & anxiety","I need help with stress and anxiety","stress"],["Relationships","I want clarity in relationships","relationships"],["Low energy","I feel tired and low on energy","energy"],["Health","I'm concerned about my health","health"],["Work & money","I need clarity about work and money","work"],["Meaning & growth","I want direction and personal growth","growth"]],
    privacy:"Matching happens in your browser. Your text is not stored or sent to external AI.", voice:"You can use your phone keyboard's dictation.",
    label:"Your question", answer:"Suggested next steps", change:"Change my question", tools:"Support tools", browse:"Prefer browsing? Choose a method yourself.", all:"All services & practitioners",
    reply:{stress:"Start with a self-check, try a practice and consider personal support if helpful.",relationships:"Clarify your situation first, then choose individual support if you wish.",energy:"Explore your current state and consider a gentle practice.",health:"Physical symptoms deserve medical assessment. These options are for additional support and reflection only.",work:"A free review can clarify the question before a business consultation.",growth:"Clarify your goal, then explore learning or personal support.",general:"Here are real starting points that do not require a booking."},
    skip:"Skip", adjust:"Change preferences", noOffers:"No verified options match all these preferences. You can adjust the format or budget.",
    questions:{"mode":{"prompt":"How would you like support?","options":[["Talk to a specialist","human"],["AI guide","ai"],["Watch a video","video"],["Explore on my own","self"],["Not sure","any"]]},"channel":{"prompt":"How would you like to connect?","options":[["In person","inperson"],["Video call","online"],["Written / no meeting","async"],["No preference","any"]]},"budget":{"prompt":"What budget feels comfortable?","options":[["Free only","free"],["Up to €50","under50"],["Up to €100","under100"],["Flexible","flexible"]]}},
    cards:{tests:["Wellbeing check-ins","Free self-checks and ways to observe changes.","Free"],review:["Situation review","Short form and personal written reply.","Free"],opora:["OPORA course","Step-by-step stress support exercises.","Course"],therapy:["Guided imagery therapy","One-to-one exploration of experiences and imagery.","Session"],constellation:["Constellations","Explore relationship patterns and perspectives.","Session"],business:["Business consulting","Clarify work goals and decisions.","Consultation"],reiki:["Reiki sessions","Optional symbolic and energy practices.","Enquire"],mandala:["Personal mandala","Visual symbolism for self-reflection.","Practice"],talisman:["Talismans","Symbolic catalogue in Holistic Support.","Symbolic"],homeopathy:["Psycho-homeopathy","Explore the author's approach and its limitations.","Learn more"],masters:["Practitioners","Browse published practitioner services.","Directory"],academy:["Reiki Academy","Explore learning programs and practices.","Learning"],mytube:["MyTube videos","Short practices and topic videos.","Video"],aiCoach:["AI coach","Talk to an AI reflection assistant, not psychotherapy.","AI"]},
    caution:"Homeopathy lacks reliable evidence for treating health conditions. Symbolic and energy practices do not replace medical or mental-health care.",
    crisis:"If you may harm yourself or are in immediate danger, contact your local emergency or crisis service now.",
  },
  es: {
    eyebrow:"HOLISTIC HOUSE · ASSIST", title:"¿Qué necesitas ahora?", lead:"Cuéntanos qué ocurre y descubre formas de apoyo adecuadas.",
    placeholder:"Por ejemplo: siento tensión y quiero relajarme…", submit:"Buscar apoyo", topics:"O elige un tema",
    hints:[["Estrés y ansiedad","Busco apoyo con estrés y ansiedad","stress"],["Relaciones","Quiero entender mis relaciones","relationships"],["Poca energía","Siento cansancio y poca energía","energy"],["Salud","Me preocupa mi salud","health"],["Trabajo y dinero","Quiero aclarar mi trabajo y dinero","work"],["Sentido y desarrollo","Busco sentido y crecimiento personal","growth"]],
    privacy:"La selección ocurre en tu navegador. El texto no se guarda ni se envía a una IA externa.", voice:"Puedes usar el dictado del teclado.",
    label:"Tu consulta", answer:"Opciones que pueden ayudar", change:"Cambiar consulta", tools:"Herramientas de apoyo", browse:"También puedes explorar métodos directamente.", all:"Servicios y profesionales",
    reply:{stress:"Empieza con una autoevaluación, prueba ejercicios y considera apoyo personal si quieres.",relationships:"Aclara primero la situación y después elige apoyo individual.",energy:"Explora tu estado y prueba una práctica suave.",health:"Los síntomas físicos requieren evaluación médica. Estas opciones son solo apoyo adicional.",work:"Una revisión gratuita puede aclarar tus preguntas antes de una consulta.",growth:"Aclara tus objetivos y explora formación o apoyo personal.",general:"Estas son opciones reales que no requieren una reserva."},
    skip:"Omitir", adjust:"Cambiar preferencias", noOffers:"No hay opciones verificadas que cumplan todas estas preferencias. Puedes cambiar el formato o presupuesto.",
    questions:{"mode":{"prompt":"¿Cómo prefieres recibir apoyo?","options":[["Con profesional","human"],["Guía de IA","ai"],["Ver un video","video"],["Por mi cuenta","self"],["No sé aún","any"]]},"channel":{"prompt":"¿Cómo prefieres conectarte?","options":[["En persona","inperson"],["Videollamada","online"],["Por escrito / sin cita","async"],["Me da igual","any"]]},"budget":{"prompt":"¿Qué presupuesto te resulta cómodo?","options":[["Solo gratis","free"],["Hasta €50","under50"],["Hasta €100","under100"],["Flexible","flexible"]]}},
    cards:{tests:["Pruebas de bienestar","Autoevaluaciones gratuitas para observar cambios.","Gratis"],review:["Revisión de situación","Formulario breve y respuesta escrita personal.","Gratis"],opora:["Curso OPORA","Ejercicios guiados para el estrés.","Curso"],therapy:["Terapia de imágenes guiadas","Exploración individual de experiencias e imágenes.","Sesión"],constellation:["Constelaciones","Explora patrones de relación y perspectivas.","Sesión"],business:["Consultoría de negocios","Aclara metas y decisiones prácticas.","Consulta"],reiki:["Sesiones de Reiki","Prácticas simbólicas y energéticas opcionales.","Consultar"],mandala:["Mandala personal","Práctica visual para autorreflexión.","Práctica"],talisman:["Talismanes","Catálogo simbólico en Holistic Support.","Simbólico"],homeopathy:["Psico-homeopatía","Conoce el enfoque del autor y sus límites.","Información"],masters:["Profesionales","Explora servicios profesionales publicados.","Catálogo"],academy:["Academia Reiki","Formación y prácticas disponibles.","Formación"],mytube:["Videos MyTube","Prácticas breves y videos temáticos.","Video"],aiCoach:["Guía IA","Conversación con IA para reflexionar, no psicoterapia.","IA"]},
    caution:"La homeopatía carece de pruebas fiables de eficacia para tratar enfermedades. Las prácticas simbólicas y energéticas no sustituyen la atención médica o psicológica.",
    crisis:"Si podrías hacerte daño o estás en peligro inmediato, contacta con emergencias o con una línea de crisis local ahora.",
  },
} as const;
type Selection = { text:string; focus:Focus };

export function ServicesAssistMobile({locale}:{locale:PublicLocale}) {
  const t = copy[locale];
  const [text,setText] = useState("");
  const [selection,setSelection] = useState<Selection|null>(null);
  const [preferences,setPreferences] = useState<AssistPreferences>({});
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useEffect(()=>{
    if(!selection) return;
    const frame = requestAnimationFrame(()=>document.getElementById("assist-results")?.scrollIntoView({block:"start",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth"}));
    return ()=>cancelAnimationFrame(frame);
  },[selection]);
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = text.trim().slice(0,280);
    if(!value) return;
    inputRef.current?.blur();
    setSelection({text:value,focus:detect(value)});
    setPreferences(inferAssistPreferences(value));
  }
  const crisis = selection !== null && urgent.test(selection.text);
  const question = selection && !crisis ? nextAssistQuestion(preferences) : null;
  const suggestions = selection && !crisis ? rankAssistOffers(selection.focus,preferences) : [];
  return <section className={styles.assist} data-assist-mobile lang={locale} aria-labelledby="assist-title">
    <div className={styles.photo} role="img" aria-label="Holistic House" />
    <header className={styles.intro}><p className={styles.eyebrow}><HeartHandshake size={15} aria-hidden="true"/>{t.eyebrow}</p><h1 id="assist-title">{t.title}</h1><p>{t.lead}</p></header>
    <AssistTopRecommendations locale={locale} focus={selection?.focus ?? null} />
    <form className={styles.form} onSubmit={submit}>
      <label htmlFor="assist-question">{t.label}</label>
      <textarea id="assist-question" ref={inputRef} rows={3} value={text} maxLength={280} autoComplete="off"
        placeholder={t.placeholder} onChange={event=>setText(event.target.value)}/>
      <button type="submit" disabled={!text.trim()}><Search size={18} aria-hidden="true"/>{t.submit}<ArrowRight size={18} aria-hidden="true"/></button>
      <small>{t.voice}</small>
    </form>
    <div className={styles.quick}><p>{t.topics}</p><div className={styles.chips} role="group" aria-label={t.topics}>
      {t.hints.map(([label,example,focus])=><button key={focus} type="button" aria-pressed={selection?.focus===focus}
        onClick={()=>{inputRef.current?.blur();setText(example);setSelection({text:example,focus:focus as Focus});setPreferences(inferAssistPreferences(example));}}>{label}</button>)}
    </div></div>
    <p className={styles.privacy}>{t.privacy}</p>
    {selection?<section id="assist-results" className={styles.results} aria-live="polite" aria-labelledby="assist-results-title" tabIndex={-1}>
      <div className={styles.bubble}><strong>{t.label}</strong><p>{selection.text}</p></div>
      {crisis?<p role="alert" className={styles.crisis}>{t.crisis}</p>:<>
        <p className={styles.reply}><Sparkles size={18} aria-hidden="true"/>{t.reply[selection.focus]}</p>
        {question ? <div className={styles.question} data-assist-question={question}>
          <p>{t.questions[question].prompt}</p>
          <div className={styles.answerOptions}>{t.questions[question].options.map(([label,value])=><button type="button" key={value} onClick={()=>setPreferences(current=>({...current,[question]:value}))}>{label}</button>)}</div>
          <button type="button" className={styles.skip} onClick={()=>setPreferences(current=>({...current,[question]:"any"}))}>{t.skip}</button>
        </div> : <button type="button" className={styles.adjust} onClick={()=>setPreferences({})}>{t.adjust}</button>}
        <h2 id="assist-results-title">{t.answer}</h2>
        <ServicesAssistHomeopathy locale={locale} />
        {suggestions.length===0 ? <p className={styles.noOffers}>{t.noOffers}</p> : null}
        <div className={styles.recommendations}>{suggestions.map(({id:key},index)=>{
          const card=t.cards[key];
          return <Link className={styles.rec} href={"/"+locale+"/"+routes[key]} key={key} prefetch={false} data-assist-recommendation={key}>
            <span className={styles.index}>{index+1}</span><span className={styles.recText}><small>{card[2]}</small><strong>{card[0]}</strong><span>{card[1]}</span></span><ArrowRight size={18} aria-hidden="true"/>
          </Link>;
        })}</div>
      </>}
      <button type="button" data-assist-reset className={styles.reset} onClick={()=>{setSelection(null);setText("");setPreferences({});inputRef.current?.focus();}}>{t.change}</button>
    </section>:null}
    <section className={styles.tools} aria-labelledby="assist-tools-title">
      <h2 id="assist-tools-title">{t.tools}</h2><p>{t.browse}</p>
      <div className={styles.toolGrid}>{toolList.map((key)=>{
        const card=t.cards[key];
        return <Link className={styles.tool} href={"/"+locale+"/"+routes[key]} key={key} prefetch={false} data-assist-tool={key}>
          <span aria-hidden="true">✦</span><strong>{card[0]}</strong><small>{card[2]}</small>
        </Link>;
      })}</div>
      <Link className={styles.all} href={"/"+locale+"/services/catalog#service-listings"} prefetch={false}>{t.all}<ArrowRight size={18} aria-hidden="true"/></Link>
    </section>
    <p className={styles.caution}>{t.caution}</p>
  </section>;
}
