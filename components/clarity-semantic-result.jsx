// Shared client-visible semantic projection: no inferred scores or AI calls.
import {claritySemanticResult} from '@/lib/coaching/clarity-session-fields.mjs'
const copy={
 en:{support:'My Support & Energy Plan',goal:'My Goal & Personal Guidance',outer:'Wheel of life',inner:'Meaning axes & inner resources',dream:'My inspiring dream',current:'Current',desired:'Desired',missing:'Not recorded',self:'Independent answer',coach:'Reviewed protocol',hint:'Self-ratings, not a diagnosis.',dreamEmpty:'Your dream is not recorded yet.'},
 ru:{support:'Моя карта поддержки и ресурсов',goal:'Моя цель и первые шаги',outer:'Колесо жизненного баланса',inner:'Оси смысла и внутренние ресурсы',dream:'Моя вдохновляющая мечта',current:'Сейчас',desired:'Желаемое',missing:'Нет ответа',self:'Самостоятельный ответ',coach:'Подтверждено в протоколе',hint:'Самооценки, не диагноз.',dreamEmpty:'Образ мечты пока не записан.'},
 es:{support:'Mi plan de apoyo y energía',goal:'Mi meta y orientación personal',outer:'Rueda de la vida',inner:'Ejes de sentido y recursos internos',dream:'Mi sueño inspirador',current:'Actual',desired:'Deseado',missing:'Sin respuesta',self:'Respuesta autónoma',coach:'Protocolo revisado',hint:'Autoevaluaciones, no un diagnóstico.',dreamEmpty:'Todavía no has registrado tu sueño.'}
}
const outcomeCopy={
 en:{goal:{chosen:'Goal chosen and reviewed',exploring:'Exploring a direction; no goal chosen',deferred:'Goal choice postponed',unknown:'Goal not yet confirmed'},practice:{attempted:'Tried (client self-report)',planned:'Planned for later, not yet tried',stopped:'Stopped (client self-report)',declined:'Practice declined',listening_only:'Conversation only',unknown:'Practice status not yet recorded'}},
 ru:{goal:{chosen:'Цель выбрана и сверена',exploring:'Исследование направления — цель ещё не выбрана',deferred:'Выбор цели отложен',unknown:'Цель ещё не подтверждена'},practice:{attempted:'Проба выполнена (со слов клиента)',planned:'Запланировано, ещё не пробовали',stopped:'Проба остановлена (со слов клиента)',declined:'Отказ от практики',listening_only:'Только разговор',unknown:'Статус практики пока не записан'}},
 es:{goal:{chosen:'Meta elegida y revisada',exploring:'Explorando un rumbo; sin meta elegida',deferred:'Elección de la meta aplazada',unknown:'Meta aún no confirmada'},practice:{attempted:'Probado (autoinforme)',planned:'Planificado, aún no probado',stopped:'Interrumpido (autoinforme)',declined:'Práctica rechazada',listening_only:'Solo conversación',unknown:'Estado de la práctica aún no registrado'}}
}
const methodCopy={
 en:{partial:'Core result still incomplete',situation_map:'Situation and priority reviewed',support_only:'Support conversation reviewed',support_tried:'Support trial and next step reviewed',support_stopped:'Stopped trial and next step reviewed',support_planned:'Support plan reviewed; not yet tried',goal_deferred:'Decision to defer reviewed',goal_exploring:'Exploration reviewed; no goal chosen',goal_partial_plan:'Goal and first step reviewed; baseline or horizon still open',goal_plan:'Goal and action plan reviewed'},
 ru:{partial:'Основной результат пока неполный',situation_map:'Ситуация и приоритет сверены',support_only:'Разговор о поддержке сверен',support_tried:'Проба и следующий шаг сверены',support_stopped:'Остановленная проба и следующий шаг сверены',support_planned:'План поддержки сверен; проба ещё не выполнена',goal_deferred:'Решение отложить цель сверено',goal_exploring:'Исследование сверено; цель не выбрана',goal_partial_plan:'Цель и первый шаг сверены; исходная точка или горизонт открыты',goal_plan:'Цель и план действий сверены'},
 es:{partial:'Resultado principal aún incompleto',situation_map:'Situación y prioridad revisadas',support_only:'Conversación de apoyo revisada',support_tried:'Prueba y próximo paso revisados',support_stopped:'Prueba interrumpida y próximo paso revisados',support_planned:'Plan de apoyo revisado; aún no probado',goal_deferred:'Decisión de aplazar revisada',goal_exploring:'Exploración revisada; sin meta elegida',goal_partial_plan:'Meta y primer paso revisados; punto inicial u horizonte pendientes',goal_plan:'Meta y plan de acción revisados'}
}
const point=(i,score)=>[110+score*8*Math.cos(-Math.PI/2+i*Math.PI/4),110+score*8*Math.sin(-Math.PI/2+i*Math.PI/4)]
const color={current:'#427969',desired:'#b18a51'}
export function Radar({axes,t}){
 return <><svg viewBox="0 0 220 220" role="img" aria-label={t.current+' / '+t.desired} style={{width:'100%',maxWidth:320,display:'block',margin:'0 auto'}}>
  {[2,4,6,8,10].map(value=><polygon key={value} points={axes.map((_,i)=>point(i,value).join(',')).join(' ')} stroke="currentColor" opacity=".22" fill="none"/>)}
  {axes.map((axis,i)=>{const [x,y]=point(i,10);const [tx,ty]=point(i,11.5);return <g key={axis.id}><line x1="110" y1="110" x2={x} y2={y} stroke="currentColor" opacity=".25"/><text x={tx} y={ty+3} textAnchor="middle" fontSize="10" fill="currentColor">{i+1}</text></g>})}
  {['desired','current'].map(key=>{const coords=axes.map((axis,i)=>axis[key]===null?null:point(i,axis[key]));return <g key={key}>
   {coords.every(Boolean)&&<polygon points={coords.map(x=>x.join(',')).join(' ')} stroke={color[key]} fill={color[key]} fillOpacity=".09" strokeWidth="2"/>}
   {coords.map((p,i)=>p&&<circle key={axes[i].id} cx={p[0]} cy={p[1]} r={key==='current'?3:5} fill={key==='current'?color[key]:'none'} stroke={color[key]} strokeWidth="1.5"/>)}
  </g>})}
 </svg><div style={{display:'flex',flexWrap:'wrap',gap:12}}>{['current',...(axes.some(axis=>axis.desired!==null)?['desired']:[])].map(key=><small key={key} style={{color:color[key]}}>● {t[key]}</small>)}</div>
 <small>{t.hint}</small><ol style={{paddingInlineStart:22,display:'grid',gap:8}}>{axes.map(axis=><li key={axis.id}><strong>{axis.label}</strong><div>{axis.current===null?t.missing:axis.desired===null?String(axis.current):axis.current+' → '+axis.desired+(axis.desired===axis.current?'':' (Δ '+(axis.desired-axis.current>0?'+':'')+(axis.desired-axis.current)+')')}</div>{axis.source&&<small>{axis.source==='daybook'?t.self:t.coach}</small>}</li>)}</ol></>
}
const innerCopy={
 en:{title:'My inner development vector',coverage:'Axes rated',declined:'Profile declined',deferred:'Profile deferred',not_explored:'Profile not yet explored',partial:'Profile incomplete',rated:'All eight axes rated',focus:'My development priority',hint:'The gap is a conversation cue, not an automatic priority.'},
 ru:{title:'Мой внутренний вектор развития',coverage:'Осей оценено',declined:'Клиент отказался от оценки',deferred:'Оценка отложена клиентом',not_explored:'Профиль ещё не исследован',partial:'Профиль пока неполный',rated:'Все восемь осей оценены',focus:'Мой приоритет развития',hint:'Разница оценок — повод для обсуждения, а не автоматически выбранный приоритет.'},
 es:{title:'Mi vector de desarrollo interno',coverage:'Ejes valorados',declined:'Perfil rechazado',deferred:'Perfil aplazado',not_explored:'Perfil aún sin explorar',partial:'Perfil incompleto',rated:'Ocho ejes valorados',focus:'Mi prioridad de desarrollo',hint:'La diferencia orienta la conversación, no elige la prioridad automáticamente.'}
}
export function ClarityInnerVector({rows,locale='en'}){
 const t=copy[locale]||copy.en,x=innerCopy[locale]||innerCopy.en,model=claritySemanticResult(2,rows,locale)
 if(!model?.axes)return null
 const profile=model.innerProfile
 return <section data-clarity-inner-vector style={{display:'grid',gap:8}}>
  <h3 style={{margin:0}}>{x.title}</h3>
  {profile&&<small role="status">{x.coverage}: {profile.rated}/8 · {x[profile.status]}</small>}
  <Radar axes={model.axes} t={t}/>
  {profile?.focus?.value&&<div data-clarity-development-focus><strong>{x.focus}</strong><p>{profile.focus.value}</p></div>}
  <small>{x.hint}</small>
 </section>
}
export default function ClaritySemanticResult({day,rows,locale='en'}){
 const t=copy[locale]||copy.en,model=claritySemanticResult(day,rows,locale)
 if(!model)return null
 const nodes=model.nodes,outcome=outcomeCopy[locale]||outcomeCopy.en
 return <section data-clarity-semantic-result={model.kind} style={{display:'grid',gap:12,overflowWrap:'anywhere'}}>
  {day===2&&<ClarityInnerVector rows={rows} locale={locale}/>}
  <h3 style={{margin:0}}>{t[model.kind]}</h3>
  {model.methodOutcome&&<p role="status" data-clarity-method-outcome={model.methodOutcome.outcome}>{(methodCopy[locale]||methodCopy.en)[model.methodOutcome.outcome]}</p>}
  {model.kind==='goal'&&<p data-clarity-goal-outcome>{outcome.goal[model.goalStatus||'unknown']}</p>}
  {model.kind==='support'&&<p data-clarity-practice-outcome>{outcome.practice[model.practiceStatus||'unknown']}</p>}
  {day!==2&&model.axes&&<Radar axes={model.axes} t={t}/>}
  {model.dream&&<div style={{border:'1px solid #b79565',borderRadius:14,padding:16,textAlign:'center'}}><strong style={{whiteSpace:'pre-wrap'}}>{model.dream.value||t.dreamEmpty}</strong>{model.dream.source&&<p><small>{model.dream.source==='daybook'?t.self:t.coach}</small></p>}</div>}
  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(min(100%,135px),1fr))',gap:8}}>{nodes.map(node=><div key={node.id} style={{border:'1px solid #d5c7b4',borderRadius:10,padding:10}}><strong>{node.label}</strong><p style={{whiteSpace:'pre-wrap'}}>{node.value||t.missing}</p>{node.source&&<small>{node.source==='daybook'?t.self:t.coach}</small>}</div>)}</div>
 </section>
}
