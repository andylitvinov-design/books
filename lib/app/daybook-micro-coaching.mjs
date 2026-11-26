// Local authored practices; no external model or new store.
const rows=[
 [
  "focus",
  [
   "Focus",
   "What matters now?",
   "What can you set aside?",
   "Choose one small focus action."
  ],
  [
   "Концентрация",
   "Что сейчас важно?",
   "Что можно отложить?",
   "Выберите один небольшой шаг."
  ],
  [
   "Concentración",
   "¿Qué importa ahora?",
   "¿Qué puedes dejar a un lado?",
   "Elige un pequeño paso."
  ]
 ],
 [
  "decision",
  [
   "Decision-making",
   "What decision is in front of you?",
   "Name two options and one criterion.",
   "Choose a reversible next step."
  ],
  [
   "Принятие решений",
   "Какое решение перед вами?",
   "Назовите два варианта и критерий.",
   "Выберите обратимый шаг."
  ],
  [
   "Decisiones",
   "¿Qué decisión tienes delante?",
   "Nombra dos opciones y un criterio.",
   "Elige un paso reversible."
  ]
 ],
 [
  "confidence",
  [
   "Confidence",
   "Where would you like more confidence?",
   "Recall a specific example you handled well.",
   "Choose a small action based on that experience."
  ],
  [
   "Уверенность",
   "Где хотелось бы больше уверенности?",
   "Вспомните случай, с которым вы справились.",
   "Выберите шаг с опорой на этот опыт."
  ],
  [
   "Confianza",
   "¿Dónde quieres más confianza?",
   "Recuerda un caso que manejaste bien.",
   "Elige un paso basado en esa experiencia."
  ]
 ],
 [
  "boundaries",
  [
   "Boundaries",
   "What request feels difficult?",
   "What are you willing to offer?",
   "Write a respectful boundary."
  ],
  [
   "Личные границы",
   "На какую просьбу трудно ответить?",
   "Что вы готовы предложить?",
   "Сформулируйте уважительную границу."
  ],
  [
   "Límites",
   "¿Qué petición cuesta responder?",
   "¿Qué puedes ofrecer?",
   "Formula un límite respetuoso."
  ]
 ],
 [
  "conversation",
  [
   "Difficult conversations",
   "What outcome do you want?",
   "What neutral observation can you describe?",
   "Write an opening sentence and question."
  ],
  [
   "Сложные разговоры",
   "Какого результата вы хотите?",
   "Какое нейтральное наблюдение можно описать?",
   "Напишите первую фразу и вопрос."
  ],
  [
   "Conversaciones difíciles",
   "¿Qué resultado quieres?",
   "¿Qué observación neutral puedes describir?",
   "Escribe una frase inicial y una pregunta."
  ]
 ],
 [
  "listening",
  [
   "Active listening",
   "Think of a conversation you want to understand.",
   "What might you check instead of assuming?",
   "Write a paraphrase and a checking question."
  ],
  [
   "Активное слушание",
   "Вспомните разговор, который хотите понять.",
   "Что можно уточнить вместо предположения?",
   "Напишите нейтральный пересказ и вопрос."
  ],
  [
   "Escucha activa",
   "Piensa en una conversación que quieras comprender.",
   "¿Qué podrías preguntar en vez de suponer?",
   "Escribe una paráfrasis y una pregunta."
  ]
 ],
 [
  "goal",
  [
   "Goal breakdown",
   "What outcome have you chosen?",
   "Name a useful small milestone.",
   "Choose a first action of ten minutes or less."
  ],
  [
   "Декомпозиция цели",
   "Какой результат вы выбрали?",
   "Назовите небольшой промежуточный результат.",
   "Выберите первый шаг до десяти минут."
  ],
  [
   "Desglosar una meta",
   "¿Qué resultado has elegido?",
   "Nombra un pequeño hito útil.",
   "Elige un paso de diez minutos o menos."
  ]
 ],
 [
  "resources",
  [
   "Resources",
   "What are you working on?",
   "What resource might help?",
   "Choose one resource to use or request."
  ],
  [
   "Ресурсы",
   "Над чем вы работаете?",
   "Какой ресурс мог бы помочь?",
   "Выберите ресурс или просьбу."
  ],
  [
   "Recursos",
   "¿En qué estás trabajando?",
   "¿Qué recurso podría ayudar?",
   "Elige un recurso o una petición."
  ]
 ],
 [
  "setbacks",
  [
   "Setbacks",
   "What did not go as expected?",
   "What was within your influence?",
   "Choose a smaller experiment."
  ],
  [
   "Препятствия",
   "Что пошло не так, как ожидалось?",
   "Что было в пределах вашего влияния?",
   "Выберите меньший эксперимент."
  ],
  [
   "Contratiempos",
   "¿Qué no salió como esperabas?",
   "¿Sobre qué tenías influencia?",
   "Elige un experimento más pequeño."
  ]
 ],
 [
  "motivation",
  [
   "Motivation",
   "Why does this goal matter to you?",
   "What would make starting easier?",
   "Choose a voluntary step or rest."
  ],
  [
   "Мотивация",
   "Почему эта цель важна вам?",
   "Что облегчило бы начало?",
   "Выберите добровольный шаг или отдых."
  ],
  [
   "Motivación",
   "¿Por qué te importa esta meta?",
   "¿Qué facilitaría empezar?",
   "Elige un paso voluntario o descansar."
  ]
 ],
 [
  "delegation",
  [
   "Delegation",
   "What task could be shared?",
   "What outcome and boundaries are important?",
   "Draft a request without assuming agreement."
  ],
  [
   "Делегирование",
   "Какую задачу можно разделить?",
   "Какой результат и границы важны?",
   "Составьте просьбу, не предполагая согласия."
  ],
  [
   "Delegar",
   "¿Qué tarea podría compartirse?",
   "¿Qué resultado y límites importan?",
   "Redacta una petición sin dar por hecho el acuerdo."
  ]
 ],
 [
  "reflection",
  [
   "Weekly reflection",
   "What did you do this week?",
   "What helped and what would you change?",
   "Choose one adjustment."
  ],
  [
   "Недельная рефлексия",
   "Что вы сделали на этой неделе?",
   "Что помогло и что изменить?",
   "Выберите одну корректировку."
  ],
  [
   "Reflexión semanal",
   "¿Qué hiciste esta semana?",
   "¿Qué ayudó y qué cambiarías?",
   "Elige un ajuste."
  ]
 ]
];
export const PRACTICE_VERSION=1;
export function practiceCatalog(locale='en'){const i={en:1,ru:2,es:3}[locale]||1;return rows.map(r=>({id:r[0],version:PRACTICE_VERSION,minutes:3,title:r[i][0],steps:r[i].slice(1)}))}

export function practiceChoice(id){return rows.some(r=>r[0]===id)}

export function weekStart(day){if(typeof day!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(day))throw Error('INVALID_DAY');const d=new Date(day+'T12:00:00Z');if(!Number.isFinite(d.getTime())||d.toISOString().slice(0,10)!==day)throw Error('INVALID_DAY');d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10)}

export function priorWeek(day){const d=new Date(weekStart(day)+'T12:00:00Z');d.setUTCDate(d.getUTCDate()-7);return d.toISOString().slice(0,10)}

export function normalizeSkills(input){if(!Array.isArray(input)||input.length<1||input.length>2)return null;const seen=new Set();for(const s of input){if(!s||!practiceChoice(s.id)||seen.has(s.id)||!Number.isInteger(s.rating)||s.rating<0||s.rating>10)return null;seen.add(s.id)}return input.map(s=>({id:s.id,rating:s.rating}))}

export function skillTags(input){const skills=normalizeSkills(input);if(!skills)throw Error('INVALID_SKILLS');return ['hh-skill-week-v1',...skills.map(s=>'skill:'+s.id+':'+s.rating)]}

export function readSkillTags(tags){if(!Array.isArray(tags)||!tags.includes('hh-skill-week-v1'))return null;const out=[];for(const t of tags){if(typeof t!=='string')return null;if(!t.startsWith('skill:'))continue;const m=/^skill:([a-z]+):(10|[0-9])$/.exec(t);if(!m)return null;out.push({id:m[1],rating:Number(m[2])})}return normalizeSkills(out)}

export function recommendedSkill(skills){const valid=normalizeSkills(skills);return valid?[...valid].sort((a,b)=>a.rating-b.rating)[0].id:null}

export function practiceTags(id){if(!practiceChoice(id))throw Error('INVALID_PRACTICE');return ['hh-micro-v1','practice:'+id]}

export function validEntry(entry,id,day,tags){return Boolean(entry&&entry.id===id&&entry.localDay===day&&entry.kind==='note'&&typeof entry.text==='string'&&Number.isSafeInteger(entry.revision)&&entry.revision>0&&Array.isArray(entry.tags)&&tags.every(t=>entry.tags.includes(t)))}

export async function stableJournalId(accountId,day,scope,digest=(input)=>globalThis.crypto.subtle.digest('SHA-256',input)){weekStart(day);if(typeof accountId!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(accountId)||typeof scope!=='string'||!(scope==='skills'||(scope.startsWith('practice:')&&practiceChoice(scope.slice(9)))))throw Error('INVALID_SCOPE');const bytes=Uint8Array.from(JSON.stringify(['hh-daybook-coaching-v1',accountId,day,scope]),ch=>ch.charCodeAt(0));const b=new Uint8Array(await digest(bytes)).slice(0,16);if(b.length!==16)throw Error('INVALID_DIGEST');b[6]=(b[6]&15)|0x80;b[8]=(b[8]&63)|0x80;const h=Array.from(b,n=>n.toString(16).padStart(2,'0')).join('');return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20)}

// Private owner-scoped evidence; only read on explicit request, at most two pages.
export function preferredPracticeGoal(goals,explicit,weeklyGoalId,dailyGoalId){
 const eligible=Array.isArray(goals)?goals.filter(g=>g&&typeof g.id==='string'&&['accepted','active','in_progress'].includes(g.status)):[];
 const allowed=id=>typeof id==='string'&&eligible.some(g=>g.id===id);
 // null is not yet chosen; an explicit empty selection means no linked goal.
 if(explicit!==null&&explicit!==undefined)return allowed(explicit)?explicit:null;
 return allowed(weeklyGoalId)?weeklyGoalId:allowed(dailyGoalId)?dailyGoalId:null;
}

export async function readWeeklyPracticeEvidence(fetcher,{accountId,day,skills,goalId=null,signal,digest,maxPages=2}){
 const valid=normalizeSkills(skills),week=weekStart(day);
 if(!valid||typeof fetcher!=='function'||typeof accountId!=='string'||!accountId||!Number.isInteger(maxPages)||maxPages<1||maxPages>2)throw Error('INVALID_PRACTICE_HISTORY');
 const days=Object.fromEntries(valid.map(s=>[s.id,new Set()]));
 let cursor=null,pages=0,complete=false;
 const cursors=new Set();
 for(let i=0;i<maxPages;i++){
  if(signal?.aborted)throw Error('PRACTICE_HISTORY_CANCELLED');
  const page=await fetcher('daybook-journal?limit=50'+(cursor?'&before='+encodeURIComponent(cursor):''),undefined,'GET',{accountId,signal});
  if(signal?.aborted)throw Error('PRACTICE_HISTORY_CANCELLED');
  if(!Array.isArray(page?.entries)||page.entries.length>50||!(page.nextCursor===null||typeof page.nextCursor==='string'&&page.nextCursor))throw Error('PRACTICE_HISTORY_UNVERIFIED');
  pages++;
  for(const entry of page.entries){
   if(!entry||typeof entry.localDay!=='string'||entry.localDay<week||entry.localDay>day||!Array.isArray(entry.tags)||!entry.tags.includes('hh-micro-v1')||!entry.text?.trim?.()||goalId!==null&&entry.goalId!==goalId)continue;
   const markers=entry.tags.filter(t=>typeof t==='string'&&t.startsWith('practice:'));
   if(markers.length!==1)continue;
   const skill=markers[0].slice(9);
   if(!Object.hasOwn(days,skill))continue;
   try{if(weekStart(entry.localDay)!==week)continue}catch{continue}
   const id=await stableJournalId(accountId,entry.localDay,'practice:'+skill,digest);
   if(validEntry(entry,id,entry.localDay,practiceTags(skill)))days[skill].add(entry.localDay);
  }
  if(page.nextCursor===null){complete=true;break}
  if(cursors.has(page.nextCursor))throw Error('PRACTICE_HISTORY_UNVERIFIED');
  cursors.add(page.nextCursor);cursor=page.nextCursor;
 }
 if(signal?.aborted)throw Error('PRACTICE_HISTORY_CANCELLED');
 return {week,through:day,goalId,complete,pages,counts:Object.fromEntries(valid.map(s=>[s.id,days[s.id].size]))};
}

export function recommendSkillWithEvidence(skills,evidence,{day,goalId=null}={}){
 const valid=normalizeSkills(skills);
 if(!valid)return null;
 const counts=evidence?.counts,week=day?weekStart(day):null;
 const maxDays=day?Math.round((Date.parse(day+'T12:00:00Z')-Date.parse(week+'T12:00:00Z'))/86400000)+1:0;
 const verified=evidence?.complete===true&&evidence.week===week&&evidence.through===day&&evidence.goalId===goalId&&counts&&Object.keys(counts).length===valid.length&&valid.every(s=>Number.isInteger(counts[s.id])&&counts[s.id]>=0&&counts[s.id]<=maxDays);
 const ranked=[...valid].sort((a,b)=>(verified?counts[a.id]-counts[b.id]:0)||a.rating-b.rating);
 return {id:ranked[0].id,reason:verified&&ranked.length>1&&counts[ranked[0].id]!==counts[ranked[1].id]?'less_recorded_practice':'self_rating'};
}
