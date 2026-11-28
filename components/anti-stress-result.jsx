// Presentation-only: exact owner-scoped result from the authenticated API.
// No client-generated rating, diagnosis, aggregate or default.
import styles from './anti-stress-result.module.css'
const copy={
 en:{stress:'Self-reported tension',before:'Before',after:'After',missing:'Not recorded',confidence:'Confidence using the skill',signal:'Signal or need',resource:'Chosen support',observation:'My observation',carryover:'My reminder',status:'Practice',partial:'Some answers were left open or skipped',states:{attempted:'Tried',adapted:'Adapted',stopped:'Stopped',declined:'Declined',not_attempted:'Not tried'}},
 ru:{stress:'Напряжение по самооценке',before:'До',after:'После',missing:'Не записано',confidence:'Уверенность в навыке',signal:'Сигнал или потребность',resource:'Моя опора',observation:'Мои наблюдения',carryover:'Моя подсказка',status:'Практика',partial:'Некоторые ответы пропущены или остались открытыми',states:{attempted:'Попробовали',adapted:'Адаптировали',stopped:'Остановили',declined:'Отказались',not_attempted:'Не пробовали'}},
 es:{stress:'Tensión autoinformada',before:'Antes',after:'Después',missing:'No registrado',confidence:'Confianza en la habilidad',signal:'Señal o necesidad',resource:'Apoyo elegido',observation:'Mi observación',carryover:'Mi recordatorio',status:'Práctica',partial:'Algunas respuestas quedaron abiertas u omitidas',states:{attempted:'Probada',adapted:'Adaptada',stopped:'Detenida',declined:'Rechazada',not_attempted:'No realizada'}}
}
function Rating({label,value,missing}){
 const known=Number.isInteger(value)&&value>=0&&value<=10
 return <div className={styles.rating}><span>{label}</span><strong>{known?value+'/10':missing}</strong>{known&&<meter min={0} max={10} value={value} aria-label={label}/>}</div>
}
export default function AntiStressResult({result,locale='en',hideMeditation=false}){
 if(!result||result.programType!=='therapy')return null
 const t=copy[locale]||copy.en
 const rows=[[t.signal,result.signalOrNeed],[t.resource,result.chosenResource],[t.observation,result.observation],[t.carryover,result.carryover],[t.status,t.states[result.practiceStatus]]]
 const planLabels=({en:['My regulation sequence','Alternative or stop rule','Available resources','Daily practice cue','Smallest fallback','When to seek support'],ru:['Моя последовательность','Запасной вариант или остановка','Доступные ресурсы','Момент ежедневной практики','Минимальный запасной вариант','Когда обратиться за поддержкой'],es:['Mi secuencia','Alternativa o parada','Recursos disponibles','Momento de práctica diaria','Alternativa mínima','Cuándo buscar apoyo']}[locale]||['My regulation sequence','Alternative or stop rule','Available resources','Daily practice cue','Smallest fallback','When to seek support'])
 if(result.calmPlan)rows.push([planLabels[0],result.calmPlan.steps],[planLabels[1],result.calmPlan.fallback])
 if(result.resourcePlan)rows.push([planLabels[2],result.resourcePlan.availableResources],[planLabels[3],result.resourcePlan.dailyCue],[planLabels[4],result.resourcePlan.fallback],[planLabels[5],result.resourcePlan.supportThreshold])
 return <section className={styles.card} data-anti-stress-result lang={copy[locale]?locale:'en'}>
  <h3>{result.skill}</h3>
  <h4>{t.stress}</h4><Rating label={t.before} value={result.stress?.before} missing={t.missing}/><Rating label={t.after} value={result.stress?.after} missing={t.missing}/>
  <Rating label={t.confidence} value={result.confidence} missing={t.missing}/>
  <dl>{rows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{typeof value==='string'&&value.trim()?value:t.missing}</dd></div>)}</dl>
  {!hideMeditation&&['draft','saved'].includes(result.meditation?.status)&&typeof result.meditation.body==='string'&&<div><h4>{result.meditation.title}</h4>{result.meditation.body.split('\n\n').map((paragraph,index)=><p key={index}>{paragraph}</p>)}</div>}
  {result.partial&&<p>{t.partial}</p>}
 </section>
}
