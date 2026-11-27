'use client'
import {useState} from 'react'
import {goalTapResult} from '@/lib/app/goal-tap-practice.mjs'
import css from './clarity-practice.module.css'
const COPY={ru:['Мини-практика','Начать','Далее','Назад','Мой результат','Перенести в черновик','Закрыть','Это самостоятельная практика, не итог сессии. Сохраните черновик отдельно.','Выход без сохранения?'],en:['Mini practice','Start','Next','Back','My result','Use in draft','Close','Independent practice, not a session result. Save the draft separately.','Leave without saving?'],es:['Mini práctica','Empezar','Siguiente','Atrás','Mi resultado','Usar en borrador','Cerrar','Práctica autónoma, no resultado de sesión. Guarda el borrador por separado.','¿Salir sin guardar?']}
export default function GoalTapPractice({practice,locale,disabled,onApply}){
 const t=COPY[locale]||COPY.en;
 const [step,setStep]=useState(-1),[answers,setAnswers]=useState([]);
 const review=step===practice.steps.length,result=goalTapResult(practice,answers);
 const close=()=>{if(answers.length&&!window.confirm(t[8]))return;setStep(-1);setAnswers([])};
 if(step<0)return <section data-goal-tap-practice><button type="button" className={css.secondary} disabled={disabled} onClick={()=>setStep(0)}>{practice.icon} {t[0]} · {practice.title} · {t[1]}</button></section>;
 return <section className={css.gameResult} data-goal-tap-practice>
 <div className={css.gameDots} aria-label={practice.title}>{Array.from({length:practice.steps.length+1},(_,i)=><span key={i} data-current={i===step} data-past={i<step}/>)}</div>
 {review?<><h3>{t[4]}</h3>{practice.steps.map((s,i)=><div key={i} className={css.gameResultCard}><small>{s.prompt}</small><strong>{s.options[answers[i]]}</strong></div>)}<p>{t[7]}</p></>:<><h3>{practice.steps[step].prompt}</h3><div className={css.gameChoices} role="group" aria-label={practice.steps[step].prompt}>{practice.steps[step].options.map((o,i)=><button key={i} type="button" disabled={disabled} aria-pressed={answers[step]===i} onClick={()=>setAnswers(old=>{const next=[...old];next[step]=i;return next})}>{o}</button>)}</div></>}
 <div className={css.actions}><button type="button" className={css.secondary} disabled={disabled} onClick={()=>step===0?close():setStep(s=>s-1)}>{t[3]}</button><button type="button" className={css.primary} disabled={disabled||(review?!result:answers[step]===undefined)} onClick={()=>{if(review){if(result){onApply(result);setStep(-1);setAnswers([])}}else setStep(s=>s+1)}}>{review?t[5]:t[2]}</button></div><button type="button" className={css.secondary} onClick={close}>{t[6]}</button>
 </section>
}
