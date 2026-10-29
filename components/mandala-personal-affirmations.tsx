"use client";

import { useState } from "react";
import Link from "next/link";
import { ListFilter, Sparkles, Target } from "lucide-react";
import { appFetch } from "@/lib/app/client-fetch";
import { affirmationGoalCatalog, personalizedVideoAffirmations } from "@/lib/mandala/video-affirmations";
import type { AffirmationSettings, VideoAffirmationGoal } from "@/lib/mandala/video-affirmations";
import type { VideoLocale, VideoTheme } from "@/lib/mandala/holistic-video-themes";
import css from "./mandala-video-affirmations.module.css";

const copy = {
  en: {
    personal:"Suggest personal affirmations from my tests",
    goals:"Set priorities / goals",
    title:"My priorities",
    hint:"Choose up to three goals. The first chosen goal has the strongest emphasis.",
    apply:"Apply my goals",
    limit:"Choose up to three goals.",
    success:"Suggested from your saved, eligible test indicators. You can edit all five phrases.",
    goalSuccess:"Goals applied. You can edit all five phrases.",
    empty:"No eligible recent test indicators. Choose your goals instead, or take a test.",
    auth:"Sign in to use saved tests; no scores are guessed.",
    unavailable:"Could not read your test indicators securely. You can still choose goals.",
    tests:"Go to My Tests",
    busy:"Checking my test indicators…",
  },
  ru: {
    personal:"Предложить персональный подбор установок",
    goals:"Расставить акценты / цели",
    title:"Мои цели и акценты",
    hint:"Выберите до трёх целей. Первая будет главным акцентом.",
    apply:"Применить выбранные цели",
    limit:"Можно выбрать не больше трёх целей.",
    success:"Подобраны пять фраз по вашим сохранённым подходящим тестам. Все фразы можно изменить.",
    goalSuccess:"Цели применены. Все пять фраз можно изменить.",
    empty:"Подходящих актуальных показателей нет. Выберите цели вручную или пройдите тест.",
    auth:"Войдите в кабинет для подбора по сохранённым тестам. Баллы не придумываются.",
    unavailable:"Не удалось безопасно прочитать результаты. Цели доступны без входа.",
    tests:"Перейти в Мои тесты",
    busy:"Сверяем показатели ваших тестов…",
  },
  es: {
    personal:"Sugerir afirmaciones según mis tests",
    goals:"Elegir prioridades / metas",
    title:"Mis metas y prioridades",
    hint:"Elige hasta tres metas. La primera tendrá prioridad.",
    apply:"Aplicar mis metas",
    limit:"Elige como máximo tres metas.",
    success:"Cinco frases sugeridas a partir de tus tests guardados. Puedes editarlas.",
    goalSuccess:"Metas aplicadas. Puedes editar las cinco frases.",
    empty:"No hay indicadores recientes adecuados. Elige metas o haz un test.",
    auth:"Inicia sesión para usar tus tests guardados. No se inventan puntuaciones.",
    unavailable:"No se pudieron consultar los indicadores con seguridad. Puedes elegir metas.",
    tests:"Abrir mis tests",
    busy:"Consultando mis indicadores…",
  },
} as const;

export function MandalaPersonalAffirmations({locale,theme,settings,onChange,disabled=false}: {
  locale:VideoLocale; theme:VideoTheme; settings:AffirmationSettings;
  onChange:(next:AffirmationSettings)=>void; disabled?:boolean;
}) {
  const ui=copy[locale];
  const [goalsOpen,setGoalsOpen]=useState(false);
  const [goals,setGoals]=useState<VideoAffirmationGoal[]>([]);
  const [axes,setAxes]=useState<string[]>([]);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [testsLink,setTestsLink]=useState(false);
  const apply=(nextAxes:readonly string[],nextGoals:readonly VideoAffirmationGoal[])=>{
    const phrases=personalizedVideoAffirmations(locale,theme,nextAxes,nextGoals);
    onChange({...settings,presetOverride:phrases,selected:[0,1,2,3,4],enabled:true});
  };
  const chooseGoal=(id:VideoAffirmationGoal)=>{
    if(goals.includes(id)) {setGoals(values=>values.filter(value=>value!==id));setMessage("");return;}
    if(goals.length>=3) {setMessage(ui.limit);return;}
    setGoals(values=>[...values,id]);setMessage("");
  };
  const loadProfile=async()=>{
    if(busy||disabled)return;
    setBusy(true);setMessage("");setTestsLink(false);
    try {
      // Deliberate click only. Authenticated server returns only eligible axis keys.
      const response=await appFetch("video-affirmation-focus") as {axes?:string[]};
      const fresh=Array.isArray(response.axes)?response.axes.filter(axis=>typeof axis==="string").slice(0,3):[];
      setAxes(fresh);
      if(!fresh.length) {
        setMessage(ui.empty);setTestsLink(true);setGoalsOpen(true);
        return;
      }
      apply(fresh,goals);setMessage(ui.success);
    } catch(error) {
      const status=(error as {status?:number}).status;
      setMessage(status===401?ui.auth:ui.unavailable);
      setTestsLink(status===401);
    } finally {setBusy(false);}
  };
  const useGoals=()=>{
    if(!goals.length)return;
    apply(axes,goals);setMessage(ui.goalSuccess);
    setTestsLink(false);setGoalsOpen(false);
  };
  return (
    <div className={css.personalFocus} data-video-personal-affirmations>
      <div className={css.personalButtons}>
        <button type="button" data-video-personal-suggest className={css.personalSuggest}
          disabled={disabled||busy} onClick={()=>{void loadProfile();}}>
          <Sparkles size={17} aria-hidden="true"/>{busy?ui.busy:ui.personal}
        </button>
        <button type="button" data-video-goals-toggle className={css.goalsToggle}
          disabled={disabled} aria-expanded={goalsOpen} aria-controls="video-affirmation-priorities"
          onClick={()=>setGoalsOpen(open=>!open)}>
          <ListFilter size={17} aria-hidden="true"/>{ui.goals}
        </button>
      </div>
      {goalsOpen && <div id="video-affirmation-priorities" className={css.goalsFilter} data-video-goals-filter>
        <h4><Target size={17} aria-hidden="true"/>{ui.title}</h4>
        <p>{ui.hint}</p>
        <div className={css.goalChips} role="group" aria-label={ui.title}>
          {affirmationGoalCatalog[locale].map(item=>(
            <button key={item.id} type="button" data-video-goal={item.id}
              disabled={disabled} aria-pressed={goals.includes(item.id)}
              onClick={()=>chooseGoal(item.id)}>
              {goals.includes(item.id) && <b>{goals.indexOf(item.id)+1}</b>}
              {item.label}
            </button>
          ))}
        </div>
        <button type="button" data-video-goals-apply className={css.goalApply}
          disabled={disabled||!goals.length} onClick={useGoals}>{ui.apply}</button>
      </div>}
      {message && <div className={css.personalMessage} role="status" data-video-profile-feedback>
        {message}
        {testsLink && <Link href={"/"+locale+"/app/tests"} prefetch={false}>{ui.tests}</Link>}
      </div>}
    </div>
  );
}
