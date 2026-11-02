"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Leaf, RotateCcw, ShieldCheck } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import type { VideoTheme } from "@/lib/mandala/holistic-video-themes";
import { selectResourcePractice } from "@/lib/mandala/resource-practice-selector.mjs";
import css from "./mandala-resource-practice.module.css";

type Kind = "ritual" | "exercise" | "practice";
type Focus = { difficulty?: string; goal?: string; goals?: string[]; details?: string[] };
type Props = { locale: PublicLocale; theme: VideoTheme; focus: Focus; disabled?: boolean };
type Ready = { status: "ready"; kind: Kind; id: string; title: string; description: string;
  topic: string; durationMinutes: number; steps: string[]; transfer: string };
type Blocked = { status: "blocked"; message: string };

const copy = {
  ru: { label: "Шаг 3", title: "Практика или ритуал",
    intro: "Подбор по той же теме и личному фокусу, что использовались для медитации. Без передачи данных внешнему ИИ.",
    kinds: {ritual:"Ритуал", exercise:"Упражнение", practice:"Практика"},
    regenerate: "Обновить практику", context: "Тема", next: "Перенести в жизнь",
    duration: "3 минуты", note: "Бережная самостоятельная практика, не психотерапия и не лечение. Можно пропустить любое действие или остановиться.",
    source: "Собственный локальный алгоритм Holistic House" },
  en: { label: "Step 3", title: "Practice or ritual",
    intro: "Suggested from the same theme and focus as your meditation. No personal data sent to external AI.",
    kinds: {ritual:"Ritual", exercise:"Exercise", practice:"Practice"},
    regenerate: "Choose another", context: "Theme", next: "Try in daily life",
    duration: "3 minutes", note: "A gentle self-guided resource practice, not psychotherapy or treatment. Skip or stop any step.",
    source: "Holistic House first-party local selection" },
  es: { label: "Paso 3", title: "Práctica o ritual",
    intro: "Elegido según el mismo tema e intención que tu meditación. No se envían datos a una IA externa.",
    kinds: {ritual:"Ritual", exercise:"Ejercicio", practice:"Práctica"},
    regenerate: "Elegir otra", context: "Tema", next: "Llevar a la vida diaria",
    duration: "3 minutos", note: "Práctica suave de recursos, no psicoterapia ni tratamiento. Puedes saltar cualquier paso o parar.",
    source: "Selección local de Holistic House" },
} as const;

export function MandalaResourcePractice({locale,theme,focus,disabled=false}:Props) {
  const t = copy[locale];
  const [kind,setKind] = useState<Kind>("ritual");
  const [revision,setRevision] = useState(0);
  const result = useMemo(() => selectResourcePractice({
    locale,theme,focus,kind,revision,
  }) as Ready | Blocked, [locale,theme,focus,kind,revision]);

  return <section className={css.panel} data-meditation-resource-practice
    aria-labelledby="meditation-resource-practice-heading">
    <header className={css.heading}>
      <span className={css.icon}><Leaf size={21} aria-hidden="true"/></span>
      <div><small>{t.label}</small>
        <h3 id="meditation-resource-practice-heading">{t.title}</h3>
      </div>
      <span className={css.duration}>{t.duration}</span>
    </header>
    <p className={css.intro}>{t.intro}</p>
    <div className={css.kinds} role="group" aria-label={t.title}>
      {(["ritual","exercise","practice"] as const).map(option=>
        <button type="button" key={option} data-resource-kind={option}
          disabled={disabled} aria-pressed={kind===option}
          onClick={()=>{setKind(option);setRevision(0);}}>
          {kind===option?<Check size={16} aria-hidden="true"/>:null}{t.kinds[option]}
        </button>)}
    </div>
    {result.status==="blocked" ? <p role="alert" className={css.alert}>{result.message}</p> :
      <div className={css.result} data-resource-selection={result.id} aria-live="polite">
        <span className={css.topic}>{t.context}: {result.topic}</span>
        <h4>{result.title}</h4>
        <p>{result.description}</p>
        <ol className={css.steps}>
          {result.steps.map((step,i)=><li key={i}><span>{i+1}</span><p>{step}</p></li>)}
        </ol>
        <div className={css.transfer}><ArrowRight size={17} aria-hidden="true"/>
          <p><strong>{t.next}:</strong> {result.transfer}</p>
        </div>
        <button type="button" className={css.refresh} disabled={disabled}
          data-resource-regenerate onClick={()=>setRevision(value=>value+1)}>
          <RotateCcw size={16} aria-hidden="true"/>{t.regenerate}
        </button>
      </div>}
    <p className={css.disclaimer}><ShieldCheck size={16} aria-hidden="true"/>{t.note}</p>
    <small className={css.source}>{t.source}</small>
  </section>;
}
