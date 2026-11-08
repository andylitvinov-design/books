/** Versioned, deterministic Cron Skills registry. Metadata != an executable agent. */
export const SKILL_SCHEDULES=Object.freeze(['10m','30m','hourly','daily_9','weekly_mon_9']);
export const SKILL_CATEGORIES=Object.freeze(['delivery','operations','product','governance']);
const defs=[
['pr.queue-reconcile','delivery','PR Sentinel','Сверка очереди PR','Control de PR','external','10m'],
['ci.exact-head-diagnose','delivery','CI Analyzer','Диагностика CI','Diagnóstico CI','external','10m'],
['pr.repair-router','delivery','Repair Router','Маршрутизация исправлений','Asignación de reparaciones','external','30m'],
['pr.repair-execute','delivery','Source Repair','Исправление исходного кода','Reparación del código','external','hourly'],
['pr.merge-guardian','delivery','Merge Guardian','Контроль безопасного merge','Control de integración','external','10m'],
['release.live-proof','delivery','Live Verifier','Проверка LIVE','Verificación LIVE','external','30m'],
['pr.duplicate-finder','delivery','PR Duplicate Finder','Поиск дубликатов PR','Detección de PR duplicados','external','daily_9'],
['task.tree-sync','delivery','Task Tree Sync','Синхронизация дерева задач','Sincronización de tareas','external','daily_9'],
['task.stall-watchdog','delivery','Stall Watchdog','Поиск зависших задач','Detección de bloqueos','builtin','30m'],
['pr.latency-optimizer','delivery','PR Latency Optimizer','Анализ задержек PR','Análisis de demoras PR','external','hourly'],
['agents.health-lease','operations','Agent Health','Проверка аренды запусков','Salud de agentes','builtin','30m'],
['cost.budget-guard','operations','Budget Guard','Контроль дневных лимитов','Control del presupuesto','builtin','hourly'],
['site.production-health','operations','Site Health','Проверка сайтов','Salud del sitio','external','hourly'],
['video.render-incident','operations','Video Render Doctor','Диагностика видеорендера','Diagnóstico de vídeo','external','30m'],
['data.backup-integrity','operations','Backup Auditor','Проверка резервных копий','Control de copias','external','daily_9'],
['security.dependency-watch','operations','Security Watch','Проверка зависимостей','Seguridad de dependencias','external','weekly_mon_9'],
['language.parity-guard','operations','Language Guardian','Контроль переводов','Control de traducciones','external','weekly_mon_9'],
['analytics.daily-brief','product','Analytics Brief','Сводка аналитики','Resumen analítico','external','daily_9'],
['seo.opportunities','product','SEO Scout','Анализ SEO','Análisis SEO','external','weekly_mon_9'],
['academy.quality','product','Academy Quality','Проверка курсов','Calidad de cursos','external','weekly_mon_9'],
['media.video-scout','product','Media Scout','Поиск видеосцен','Búsqueda de escenas','external','daily_9'],
['marketing.advisor','product','Marketing Advisor','Маркетинговые рекомендации','Asesoría de marketing','external','weekly_mon_9'],
['client.journey','product','Client Journey','Анализ клиентского пути','Recorrido del cliente','external','daily_9'],
['report.morning-brief','governance','Morning Brief','Утренний брифинг','Informe matutino','builtin','daily_9'],
['knowledge.weekly-sync','governance','Knowledge Sync','Обновление памяти','Memoria del proyecto','external','weekly_mon_9'],
['skill.audit','governance','Skill Auditor','Аудит навыков','Auditoría de habilidades','external','weekly_mon_9'],
['agent.efficiency','governance','Agent Efficiency','Эффективность агентов','Eficiencia de agentes','external','weekly_mon_9'],
['telegram.owner-intake','governance','Telegram Intake','Приём команд Telegram','Entrada de Telegram','event','10m'],
['council.russian-output','governance','Council RU Guard','Русский язык Совета','Respuestas del Consejo en ruso','event','10m']
];
export const CRON_SKILLS=Object.freeze(defs.map(([id,category,titleEn,titleRu,titleEs,executor,defaultSchedule])=>
 Object.freeze({id,category,titleEn,titleRu,titleEs,executor,defaultSchedule,
   runnable:executor==='builtin',capability:executor==='builtin'?'database.aggregate.read':'requires_explicit_adapter'})));
const byId=new Map(CRON_SKILLS.map(item=>[item.id,item]));
export function getCronSkill(id){return typeof id==='string'?byId.get(id)||null:null;}
export function validateCronJob(input){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const skill=getCronSkill(input.skillId);
 if(!skill||!skill.runnable||!SKILL_SCHEDULES.includes(input.schedule))return null;
 if(input.projectKey!==undefined&&input.projectKey!=='holistichouse')return null;
 if(typeof input.enabled!=='boolean')return null;
 return {skillId:skill.id,projectKey:'holistichouse',schedule:input.schedule,enabled:input.enabled};
}
const intervals={'10m':600000,'30m':1800000,hourly:3600000};
const TORONTO='America/Toronto';
function torontoDateParts(date){
 const entries=new Intl.DateTimeFormat('en-CA',{timeZone:TORONTO,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(date);
 return Object.fromEntries(entries.filter(p=>['year','month','day'].includes(p.type)).map(p=>[p.type,Number(p.value)]));
}
function torontoAtNine(utcDay){
 const y=utcDay.getUTCFullYear(),m=utcDay.getUTCMonth(),d=utcDay.getUTCDate();
 const guess=Date.UTC(y,m,d,9);
 const tz=new Intl.DateTimeFormat('en-US',{timeZone:TORONTO,timeZoneName:'shortOffset'})
  .formatToParts(new Date(guess)).find(p=>p.type==='timeZoneName')?.value||'';
 const offset=/^GMT([+-])(\d{1,2})(?::(\d{2}))?$/.exec(tz);
 if(!offset)throw Error('CC_SKILL_TZ_UNAVAILABLE');
 const minutes=(Number(offset[2])*60+Number(offset[3]||0))*(offset[1]==='+'?1:-1);
 return new Date(guess-minutes*60000);
}
export function nextCronSkillDue(schedule,now=new Date()){
 const ms=now instanceof Date?now.getTime():NaN;
 if(!SKILL_SCHEDULES.includes(schedule)||!Number.isFinite(ms))throw Error('CC_SKILL_SCHEDULE_INVALID');
 if(intervals[schedule])return new Date(ms+intervals[schedule]).toISOString();
 const {year,month,day}=torontoDateParts(now);
 const localDay=Date.UTC(year,month-1,day);
 for(let offset=0;offset<9;offset++){
  const date=new Date(localDay+offset*86400000);
  if(schedule==='weekly_mon_9'&&date.getUTCDay()!==1)continue;
  const candidate=torontoAtNine(date);
  if(candidate.getTime()>ms)return candidate.toISOString();
 }
 throw Error('CC_SKILL_NEXT_DUE_UNAVAILABLE');
}
