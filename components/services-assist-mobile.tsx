"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { consultServiceQuestion } from "@/lib/assist/consultant-mind.mjs";
import { ArrowDown, ArrowRight, HeartHandshake, Mic, Sparkles } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import { inferAssistPreferences, nextAssistQuestion, rankAssistOffers } from "@/lib/assist/service-match.mjs";
import type { AssistPreferences } from "@/lib/assist/service-match.mjs";
import styles from "./services-assist-mobile.module.css";
import { AssistTopRecommendations } from "./assist-top-recommendations";
import { ServicesAssistMyTube } from "./services-assist-mytube";

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
  ["growth", /смысл|цель|путь|развит|самопозн|meaning|purpose|growth|goal|\blost\b|\bdirection\b|desorient|perdid|rumbo|sentido|propósito|потерял|потеряна|не знаю куда|ориентир/i],
];
const urgent = /суицид|убить себя|самоповрежд|покончить с собой|хочу умереть|боль в груди|не могу дышать|трудно дышать|suicid|self.harm|kill myself|i want to die|chest pain|cannot breathe|cant breathe|quiero morir|hacerme daño|dolor en el pecho|no puedo respirar/i;
const detect = (text: string): Focus => signals.find(([,re])=>re.test(text))?.[0] ?? "general";
const toolList: readonly Option[] = ["therapy","homeopathy","reiki","mandala","talisman","constellation","academy","masters"];

const copy = {
  ru: {
    eyebrow:"HOLISTIC HOUSE · SERVICES", title:"AI Assistant", lead:"Помогу подобрать подходящую услугу или специалиста для вашей ситуации.", ask:"С чем вы хотели бы обратиться?", choose:"Выберите проблему или опишите её своими словами.",
    placeholder:"Опишите вашу ситуацию или цель…", submit:"Показать рекомендации", topics:"Частые обращения",
    hints:[["Стресс / тревога","Меня беспокоят стресс и тревога","stress"],["Мало сил","Чувствую усталость и недостаток энергии","energy"],["Конфликты в паре","У меня конфликт в отношениях с партнером","relationships"],["Плохой сон","Мне трудно спать и расслабиться","stress"],["Работа / деньги","Меня тревожат работа и деньги","work"],["Душевная боль","Мне тяжело эмоционально, хочется поддержки","stress"],["Ссоры в семье","Есть напряжение и конфликты в семье","relationships"],["Нет ясности в жизни","Я потерял направление и смысл","growth"],["Симптомы в теле","Меня беспокоят физические симптомы и самочувствие","health"],["Сложно решиться","Мне трудно принять важное решение","growth"],["Нужна практика","Хочу освоить практику для поддержки себя","growth"],["Другое…","","general"]],
    privacy:"Подбор работает в вашем браузере: текст не сохраняется и не отправляется внешнему ИИ.", voice:"Открыть клавиатуру для диктовки голосом",
    label:"Ваш запрос", answer:"Что может помочь", change:"Изменить запрос", tools:"Инструменты поддержки", browse:"Можно выбрать метод самостоятельно — без разговора.", all:"Все услуги и мастера",
    reply:{stress:"Начните с самопроверки, затем попробуйте практику. Личная работа остаётся вашим выбором.",relationships:"Сначала можно прояснить ситуацию, а затем выбрать индивидуальную поддержку.",energy:"Оцените своё состояние и попробуйте подходящую практику.",health:"При физических симптомах важна медицинская оценка. Здесь — только дополнительная поддержка и самоисследование.",work:"Бесплатный разбор поможет сформулировать запрос. Затем можно обсудить решения на консультации.",growth:"Начните с прояснения вопроса, а затем выберите обучение или личную работу.",general:"Вот несколько реальных вариантов, с которых можно начать без обязательной записи."},
    skip:"Пропустить", adjust:"Изменить пожелания", noOffers:"С такими условиями сейчас нет подтверждённых вариантов. Можно изменить формат или бюджет.",
    questions:{"mode":{"prompt":"Как вам удобнее получить поддержку?","options":[["Со специалистом","human"],["С ИИ-консультантом","ai"],["Посмотреть видео","video"],["Самостоятельно","self"],["Пока не знаю","any"]]},"channel":{"prompt":"Как вам комфортнее общаться?","options":[["Очно","inperson"],["По видеосвязи","online"],["Заочно, без встречи","async"],["Неважно","any"]]},"budget":{"prompt":"Какой бюджет сейчас комфортен?","options":[["Только бесплатно","free"],["До €50","under50"],["До €100","under100"],["Можно обсудить","flexible"]]}},
    cards:{tests:["Тесты самочувствия","Бесплатная самопроверка и наблюдение за динамикой.","Бесплатно"],review:["Разбор ситуации","Короткая анкета и личный письменный ответ.","Бесплатно"],opora:["Курс ОПОРА","Пошаговые упражнения для работы со стрессом.","Курс"],therapy:["Образная психотерапия","Индивидуальная работа с переживаниями и образами.","Личная сессия"],constellation:["Расстановки","Исследование отношений и повторяющихся сценариев.","Личная сессия"],business:["Бизнес-консультация","Прояснение рабочих целей и практических решений.","Консультация"],reiki:["Сеансы Рейки","Энергетические и символические практики по желанию.","По запросу"],mandala:["Персональная мандала","Визуальная символическая практика для саморефлексии.","Практика"],talisman:["Талисманы","Символический каталог в Holistic Support.","Символика"],homeopathy:["Психогомеопатия","Авторский подход и его ограничения.","Ознакомиться"],masters:["Мастера","Опубликованные профили и услуги специалистов.","Каталог"],academy:["Рейки Академия","Обучающие программы и доступные практики.","Обучение"],mytube:["Видео MyTube","Короткие практики и тематические видео.","Видео"],aiCoach:["ИИ-коуч","Разговор с ИИ-помощником для размышления, не психотерапия.","ИИ"]},
    caution:"Гомеопатия не имеет надёжных доказательств эффективности для лечения заболеваний. Символические и энергетические практики не заменяют медицинскую или психологическую помощь.",
    crisis:"Если вы можете причинить себе вред, испытываете опасные симптомы или находитесь в непосредственной опасности, обратитесь в местную экстренную или кризисную службу прямо сейчас.",
  },
  en: {
    eyebrow:"HOLISTIC HOUSE · SERVICES", title:"AI Assistant", lead:"Find the right support, service or specialist for your situation.", ask:"What would you like help with right now?", choose:"Choose a common issue or describe it in your own words.",
    placeholder:"Describe your situation or goal…", submit:"See recommendations", topics:"Common concerns",
    hints:[["Stress / anxiety","I feel stressed and anxious","stress"],["Low energy","I feel tired and low on energy","energy"],["Relationship conflict","I have conflict with my partner","relationships"],["Sleep problems","I struggle with sleep and relaxation","stress"],["Work or money","I am worried about work and money","work"],["Emotional pain","I am in emotional pain and need support","stress"],["Family tension","I am dealing with tension in my family","relationships"],["Feeling lost","I feel lost and lack a sense of direction","growth"],["Body symptoms","I am concerned about physical symptoms","health"],["Hard decisions","I am struggling to make a decision","growth"],["Need a practice","I want to learn a supportive practice","growth"],["Other…","","general"]],
    privacy:"Matching happens in your browser. Your text is not stored or sent to external AI.", voice:"Open keyboard to use voice dictation",
    label:"Your question", answer:"Suggested next steps", change:"Change my question", tools:"Support tools", browse:"Prefer browsing? Choose a method yourself.", all:"All services & practitioners",
    reply:{stress:"Start with a self-check, try a practice and consider personal support if helpful.",relationships:"Clarify your situation first, then choose individual support if you wish.",energy:"Explore your current state and consider a gentle practice.",health:"Physical symptoms deserve medical assessment. These options are for additional support and reflection only.",work:"A free review can clarify the question before a business consultation.",growth:"Clarify your goal, then explore learning or personal support.",general:"Here are real starting points that do not require a booking."},
    skip:"Skip", adjust:"Change preferences", noOffers:"No verified options match all these preferences. You can adjust the format or budget.",
    questions:{"mode":{"prompt":"How would you like support?","options":[["Talk to a specialist","human"],["AI guide","ai"],["Watch a video","video"],["Explore on my own","self"],["Not sure","any"]]},"channel":{"prompt":"How would you like to connect?","options":[["In person","inperson"],["Video call","online"],["Written / no meeting","async"],["No preference","any"]]},"budget":{"prompt":"What budget feels comfortable?","options":[["Free only","free"],["Up to €50","under50"],["Up to €100","under100"],["Flexible","flexible"]]}},
    cards:{tests:["Wellbeing check-ins","Free self-checks and ways to observe changes.","Free"],review:["Situation review","Short form and personal written reply.","Free"],opora:["OPORA course","Step-by-step stress support exercises.","Course"],therapy:["Guided imagery therapy","One-to-one exploration of experiences and imagery.","Session"],constellation:["Constellations","Explore relationship patterns and perspectives.","Session"],business:["Business consulting","Clarify work goals and decisions.","Consultation"],reiki:["Reiki sessions","Optional symbolic and energy practices.","Enquire"],mandala:["Personal mandala","Visual symbolism for self-reflection.","Practice"],talisman:["Talismans","Symbolic catalogue in Holistic Support.","Symbolic"],homeopathy:["Psycho-homeopathy","Explore the author's approach and its limitations.","Learn more"],masters:["Practitioners","Browse published practitioner services.","Directory"],academy:["Reiki Academy","Explore learning programs and practices.","Learning"],mytube:["MyTube videos","Short practices and topic videos.","Video"],aiCoach:["AI coach","Talk to an AI reflection assistant, not psychotherapy.","AI"]},
    caution:"Homeopathy lacks reliable evidence for treating health conditions. Symbolic and energy practices do not replace medical or mental-health care.",
    crisis:"If you may harm yourself, have urgent symptoms or are in immediate danger, contact your local emergency or crisis service now.",
  },
  es: {
    eyebrow:"HOLISTIC HOUSE · SERVICES", title:"AI Assistant", lead:"Encuentra el servicio o profesional adecuado para tu situación.", ask:"¿Con qué necesitas ayuda ahora?", choose:"Elige una dificultad o describe tu situación.",
    placeholder:"Describe tu situación o tu objetivo…", submit:"Ver recomendaciones", topics:"Problemas frecuentes",
    hints:[["Estrés / ansiedad","Siento estrés y ansiedad","stress"],["Poca energía","Me siento cansado y sin energía","energy"],["Conflicto de pareja","Tengo conflictos en mi relación de pareja","relationships"],["Problemas de sueño","Me cuesta dormir y relajarme","stress"],["Trabajo / dinero","Me preocupan el trabajo y el dinero","work"],["Dolor emocional","Siento dolor emocional y necesito apoyo","stress"],["Tensión familiar","Tengo tensiones y conflictos en mi familia","relationships"],["Sin rumbo","Me siento perdido y sin dirección","growth"],["Síntomas físicos","Me preocupan síntomas físicos y mi salud","health"],["Decisión difícil","Me cuesta tomar una decisión importante","growth"],["Busco una práctica","Quiero aprender una práctica de apoyo","growth"],["Otro…","","general"]],
    privacy:"La selección ocurre en tu navegador. El texto no se guarda ni se envía a una IA externa.", voice:"Abrir teclado para usar dictado de voz",
    label:"Tu consulta", answer:"Opciones que pueden ayudar", change:"Cambiar consulta", tools:"Herramientas de apoyo", browse:"También puedes explorar métodos directamente.", all:"Servicios y profesionales",
    reply:{stress:"Empieza con una autoevaluación, prueba ejercicios y considera apoyo personal si quieres.",relationships:"Aclara primero la situación y después elige apoyo individual.",energy:"Explora tu estado y prueba una práctica suave.",health:"Los síntomas físicos requieren evaluación médica. Estas opciones son solo apoyo adicional.",work:"Una revisión gratuita puede aclarar tus preguntas antes de una consulta.",growth:"Aclara tus objetivos y explora formación o apoyo personal.",general:"Estas son opciones reales que no requieren una reserva."},
    skip:"Omitir", adjust:"Cambiar preferencias", noOffers:"No hay opciones verificadas que cumplan todas estas preferencias. Puedes cambiar el formato o presupuesto.",
    questions:{"mode":{"prompt":"¿Cómo prefieres recibir apoyo?","options":[["Con profesional","human"],["Guía de IA","ai"],["Ver un video","video"],["Por mi cuenta","self"],["No sé aún","any"]]},"channel":{"prompt":"¿Cómo prefieres conectarte?","options":[["En persona","inperson"],["Videollamada","online"],["Por escrito / sin cita","async"],["Me da igual","any"]]},"budget":{"prompt":"¿Qué presupuesto te resulta cómodo?","options":[["Solo gratis","free"],["Hasta €50","under50"],["Hasta €100","under100"],["Flexible","flexible"]]}},
    cards:{tests:["Pruebas de bienestar","Autoevaluaciones gratuitas para observar cambios.","Gratis"],review:["Revisión de situación","Formulario breve y respuesta escrita personal.","Gratis"],opora:["Curso OPORA","Ejercicios guiados para el estrés.","Curso"],therapy:["Terapia de imágenes guiadas","Exploración individual de experiencias e imágenes.","Sesión"],constellation:["Constelaciones","Explora patrones de relación y perspectivas.","Sesión"],business:["Consultoría de negocios","Aclara metas y decisiones prácticas.","Consulta"],reiki:["Sesiones de Reiki","Prácticas simbólicas y energéticas opcionales.","Consultar"],mandala:["Mandala personal","Práctica visual para autorreflexión.","Práctica"],talisman:["Talismanes","Catálogo simbólico en Holistic Support.","Simbólico"],homeopathy:["Psico-homeopatía","Conoce el enfoque del autor y sus límites.","Información"],masters:["Profesionales","Explora servicios profesionales publicados.","Catálogo"],academy:["Academia Reiki","Formación y prácticas disponibles.","Formación"],mytube:["Videos MyTube","Prácticas breves y videos temáticos.","Video"],aiCoach:["Guía IA","Conversación con IA para reflexionar, no psicoterapia.","IA"]},
    caution:"La homeopatía carece de pruebas fiables de eficacia para tratar enfermedades. Las prácticas simbólicas y energéticas no sustituyen la atención médica o psicológica.",
    crisis:"Si podrías hacerte daño, tienes síntomas urgentes o estás en peligro inmediato, contacta con emergencias o con una línea de crisis local ahora.",
  },
} as const;
type Selection = {text:string;focus:Focus};
type ChatTurn = {role:"user"|"assistant";text:string};
const compactCopy = {
  ru: {moreIssues:"Показать ещё проблемы",lessIssues:"Скрыть остальные",moreTools:"Больше инструментов",lessTools:"Скрыть инструменты",viewMatches:"Посмотреть подходящие мне варианты"},
  en: {moreIssues:"More concerns",lessIssues:"Show fewer",moreTools:"More tools",lessTools:"Fewer tools",viewMatches:"View my matching options"},
  es: {moreIssues:"Ver más problemas",lessIssues:"Mostrar menos",moreTools:"Más herramientas",lessTools:"Menos herramientas",viewMatches:"Ver mis opciones recomendadas"},
} as const;

export function ServicesAssistMobile({locale}:{locale:PublicLocale}) {
  const t=copy[locale], labels=compactCopy[locale];
  const [text,setText]=useState("");
  const [selection,setSelection]=useState<Selection|null>(null);
  const [preferences,setPreferences]=useState<AssistPreferences>({});
  const [turns,setTurns]=useState<ChatTurn[]>([]);
  const [consultantPriority,setConsultantPriority]=useState<string[]>([]);
  const [expandedIssues,setExpandedIssues]=useState(false);
  const [expandedTools,setExpandedTools]=useState(false);
  const [critical,setCritical]=useState(false);
  const inputRef=useRef<HTMLTextAreaElement>(null);
  const chatRef=useRef<HTMLDivElement>(null);
  const formRef=useRef<HTMLFormElement>(null);
  const crisis=selection!==null&&(critical||urgent.test(selection.text));
  const question=selection&&!crisis?nextAssistQuestion(preferences):null;
  const suggestions=selection&&!crisis?rankAssistOffers(selection.focus,preferences):[];

  // Only the message history scrolls; never jump the page to a second questionnaire.
  useEffect(()=>{
    if(!selection)return;
    const frame=requestAnimationFrame(()=>{if(chatRef.current)chatRef.current.scrollTop=chatRef.current.scrollHeight;});
    return ()=>cancelAnimationFrame(frame);
  },[selection,question,turns]);

  // Keep the input in document flow, moving only the obscured portion above
  // the mobile dock. On iOS let the browser handle a focused textarea.
  useEffect(()=>{
    if(!selection)return;
    const viewport=window.visualViewport;
    let frame=0;
    const revealComposer=()=>{
      if(frame)cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
        frame=0;
        if(document.activeElement===inputRef.current)return;
        const form=formRef.current;
        if(!form)return;
        const viewportBottom=viewport?viewport.offsetTop+viewport.height:window.innerHeight;
        const dock=document.querySelector<HTMLElement>('[data-hh-unified-dock]');
        const dockRect=dock?.getBoundingClientRect();
        const dockBottomLimit=dockRect&&dockRect.height>0?dockRect.top:viewportBottom;
        const visibleBottom=Math.min(viewportBottom,dockBottomLimit)-12;
        const overlap=form.getBoundingClientRect().bottom-visibleBottom;
        if(overlap>1)window.scrollBy({top:Math.ceil(overlap),behavior:"smooth"});
      });
    };
    revealComposer();
    window.addEventListener("resize",revealComposer,{passive:true});
    viewport?.addEventListener("resize",revealComposer,{passive:true});
    return()=>{
      if(frame)cancelAnimationFrame(frame);
      window.removeEventListener("resize",revealComposer);
      viewport?.removeEventListener("resize",revealComposer);
    };
  },[selection,question,turns]);

  function beginRequest(value:string) {
    const trimmed=value.trim().slice(0,280);
    if(!trimmed)return;
    const focus=detect(trimmed);
    const unsafe=urgent.test(trimmed);
    // The exact same source-bounded Consultant Mind as authenticated AI chat.
    // Pure local function: no user text leaves the browser or enters training.
    const advice=unsafe?null:consultServiceQuestion({message:trimmed,locale,history:[]});
    setConsultantPriority(advice?.suggestions.map(item=>item.id.replace(/^service:/,""))??[]);
    setSelection({text:trimmed,focus});
    setPreferences(inferAssistPreferences(trimmed));
    setCritical(unsafe);
    setTurns(unsafe?[{role:"user",text:trimmed}]:[{role:"user",text:trimmed},{role:"assistant",text:advice?.reply??t.reply[focus]}]);
    setText("");
    setExpandedIssues(false);
    inputRef.current?.blur();
  }
  function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value=text.trim().slice(0,280);
    if(!value)return;
    if(!selection){beginRequest(value);return;}
    // New typed messages stay in this messenger. Infer only explicitly stated preferences.
    // Do not transmit the conversation to providers or add it to URLs/storage.
    const unsafe=urgent.test(value);
    const advice=unsafe||critical||urgent.test(selection.text)?null:
      consultServiceQuestion({message:value,locale,history:turns.slice(-6)});
    setTurns(current=>[...current,{role:"user" as const,text:value},
      ...(advice?[{role:"assistant" as const,text:advice.reply}]:[])].slice(-12));
    if(advice)setConsultantPriority(advice.suggestions.map(item=>item.id.replace(/^service:/,"")));
    setSelection(current=>current?{
      text:(current.text+" "+value).slice(0,280),
      focus:detect(value)==="general"?current.focus:detect(value),
    }:current);
    setPreferences(current=>({...current,...inferAssistPreferences(value)}));
    if(urgent.test(value))setCritical(true);
    setText("");
  }
  function chooseAnswer(value:string,label:string) {
    if(!question)return;
    setTurns(current=>[...current,{role:"assistant" as const,text:t.questions[question].prompt},{role:"user" as const,text:label}].slice(-12));
    setPreferences(current=>({...current,[question]:value}));
  }
  // Navigate on an explicit tap only: selecting a preference must not jump the page.
  function scrollToRecommendations() {
    const target=document.getElementById("assist-recommendations");
    if(!target)return;
    inputRef.current?.blur();
    target.focus({preventScroll:true});
    target.scrollIntoView({
      behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",
      block:"start",
    });
  }
  function reset() {
    setSelection(null);setText("");setPreferences({});setTurns([]);setConsultantPriority([]);
    setCritical(false);setExpandedIssues(false);
    inputRef.current?.focus();
  }
  return <section className={styles.assist} data-assist-mobile lang={locale} aria-labelledby="assist-title">
    <div className={styles.photo} role="img" aria-label="Holistic House"/>
    <header className={styles.intro}><p className={styles.eyebrow}><HeartHandshake size={15} aria-hidden="true"/>{t.eyebrow}</p><h1 id="assist-title">{t.title}</h1><p>{t.lead}</p></header>
    <div className={styles.conversation} data-assist-dialogue>
      <div className={styles.messages} id="assist-results" ref={chatRef} role="log" aria-live="polite" aria-label={t.answer} aria-relevant="additions text" tabIndex={0}>
        {selection?<>
          {turns.map((turn,index)=><div key={index} className={turn.role==="user"?styles.turnUser:styles.turnAssistant} data-assist-message={turn.role}><p>{turn.text}</p></div>)}
          {crisis?<p role="alert" className={styles.crisis}>{t.crisis}</p>:<>
            {question?<div className={styles.inlineQuestion} data-assist-question={question}>
              <p className={styles.questionPrompt}>{t.questions[question].prompt}</p>
              <div className={styles.answerOptions}>{t.questions[question].options.map(([label,value])=><button type="button" key={value} onClick={()=>chooseAnswer(value,label)}>{label}</button>)}</div>
              <button type="button" className={styles.skip} onClick={()=>chooseAnswer("any",t.skip)}>{t.skip}</button>
            </div>:<button type="button" className={styles.viewMatches} data-assist-view-matches
              aria-controls="assist-recommendations" onClick={scrollToRecommendations}>
              {labels.viewMatches}<ArrowDown size={19} aria-hidden="true"/>
            </button>}
          </>}
        </>:<div className={styles.chatStart}>
          <div className={styles.greeting}>
            <span className={styles.avatar} aria-hidden="true"><Sparkles size={20}/></span>
            <div className={styles.speech}><strong>{t.ask}</strong><span>{t.choose}</span></div>
          </div>
          <div className={styles.quick}>
            <div className={styles.chips} role="group" aria-label={t.topics} data-assist-topic-suggestions data-assist-issue-suggestions>
              {t.hints.slice(0,expandedIssues?12:6).map(([label,example,focus])=><button key={label} type="button" aria-pressed={false}
                onClick={()=>{
                  if(focus==="general"){setText("");inputRef.current?.focus();return;}
                  beginRequest(example);
                }}>{label}</button>)}
            </div>
            <button type="button" className={styles.expand} aria-expanded={expandedIssues} onClick={()=>setExpandedIssues(current=>!current)}>
              {expandedIssues?labels.lessIssues:labels.moreIssues}<span aria-hidden="true">{expandedIssues?" −":" +"}</span>
            </button>
          </div>
        </div>}
      </div>
      <form ref={formRef} className={styles.form} data-assist-composer onSubmit={submit}>
        <label className={styles.srOnly} htmlFor="assist-question">{t.label}</label>
        <textarea id="assist-question" ref={inputRef} rows={1} value={text} maxLength={280} autoComplete="off"
          placeholder={t.placeholder} onChange={event=>setText(event.target.value)}
          onKeyDown={event=>{if(event.key==="Enter"&&!event.shiftKey&&!event.nativeEvent.isComposing){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/>
        <button type="button" className={styles.voiceButton} aria-label={t.voice} title={t.voice} onClick={()=>inputRef.current?.focus()}><Mic size={20} aria-hidden="true"/></button>
        <button type="submit" className={styles.sendButton} disabled={!text.trim()} aria-label={t.submit} title={t.submit}><ArrowRight size={21} aria-hidden="true"/></button>
      </form>
      {selection?<button type="button" className={styles.reset} data-assist-reset onClick={reset}>{t.change}</button>:null}
    </div>
    <p className={styles.privacy}>{t.privacy}</p>
    {!crisis&&selection?<AssistTopRecommendations locale={locale} focus={selection.focus} preferences={preferences}
      priorityIds={consultantPriority} matchingIds={suggestions.map(({id})=>id)} noMatchLabel={t.noOffers}/>:null}
    {!crisis&&selection?<ServicesAssistMyTube locale={locale} focus={selection.focus} question={selection.text}/>:null}
    <section className={styles.tools} aria-labelledby="assist-tools-title">
      <h2 id="assist-tools-title">{t.tools}</h2><p>{t.browse}</p>
      <div className={styles.toolGrid}>{toolList.slice(0,expandedTools?toolList.length:4).map((key)=>{
        const card=t.cards[key];
        return <Link className={styles.tool} href={"/"+locale+"/"+routes[key]} key={key} prefetch={false} data-assist-tool={key}>
          <span aria-hidden="true">✦</span><strong>{card[0]}</strong><small>{card[2]}</small>
        </Link>;
      })}</div>
      <button type="button" className={styles.moreTools} aria-expanded={expandedTools} onClick={()=>setExpandedTools(current=>!current)}>
        {expandedTools?labels.lessTools:labels.moreTools}
      </button>
      <Link className={styles.all} href={"/"+locale+"/services/catalog#service-listings"} prefetch={false}>{t.all}<ArrowRight size={18} aria-hidden="true"/></Link>
    </section>
    <p className={styles.caution}>{t.caution}</p>
  </section>;
}
