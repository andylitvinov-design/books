/**
 * Compact, reviewable context between self-guided coaching sessions.
 * This is a client-owned summary, not an inferred psychological profile.
 * Source history is reduced to short text fields; raw answers/transcripts never travel.
 */
const FIELDS = Object.freeze([
  'active_goals','previous_commitments','completed_actions','open_topics',
  'linked_reports','life_plan_changes','previous_insights'
]);
const MAX_ITEMS = 4;
const MAX_TEXT = 240;
const SNAPSHOT_MAX_ITEMS = 10;
const SNAPSHOT_GOAL_STATUSES = new Set(['active','in_progress','paused']);
const SNAPSHOT_ACTION_STATUSES = new Set(['not_started','planned','in_progress','paused']);

const DEVELOPMENT_SECTORS = Object.freeze({
 body:{en:'Body, health & energy',ru:'Тело, здоровье и энергия',es:'Cuerpo, salud y energía'},
 work:{en:'Work, business & money',ru:'Дело, бизнес и деньги',es:'Trabajo, negocios y dinero'},
 relationships:{en:'Relationships & connection',ru:'Отношения и близость',es:'Relaciones y cercanía'},
 growth:{en:'Personality & personal growth',ru:'Личность и развитие',es:'Personalidad y crecimiento'},
});

/**
 * Project only an explicitly saved owner-defined development plan.
 * No default 50/100 values, assessments, measured profile or check-in answers
 * are inferred as Life Plan facts.
 */
export function developmentGoalsContextItems(snapshot, locale='en') {
  if (!snapshot || !Number.isSafeInteger(snapshot.revision) || snapshot.revision < 1 ||
      !snapshot.goals || snapshot.goals.version !== 1 ||
      !snapshot.goals.targets || typeof snapshot.goals.targets !== 'object') return [];
  const goals=snapshot.goals;
  const updated=typeof snapshot.updatedAt==='string' ? snapshot.updatedAt.slice(0,10) : '';
  return Object.entries(DEVELOPMENT_SECTORS).flatMap(([key,labels]) => {
    const value=goals.targets[key];
    if (!Number.isInteger(value) || value<0 || value>100) return [];
    const name=labels[locale]||labels.en;
    const date=updated ? ' · '+updated : '';
    return [{text:'Saved Life Plan target — '+name+': '+value+'/100'+date,
      source:'saved_development_goals',status:'current',confirmed:false}];
  }).slice(0,MAX_ITEMS);
}



const cleanText = value => typeof value === 'string'
  ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/gu,' ').trim().slice(0,MAX_TEXT)
  : '';

function unique(items) {
  const seen = new Set();
  return items.filter(item => {
    const key = item.text.toLocaleLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0,MAX_ITEMS);
}

function isSensitiveText(value) { return /(?:diagnos|suicid|medicat|prescription|sexual|assault|abuse|depression|trauma|panico|diagn[oó]stic|suicid|medicamento|abuso|depresi[oó]n|trauma|agresi[oó]n|sexual|паническ|диагноз|суицид|лекарств|насили|депресс|травм|сексуал)/iu.test(value); }

function item(text, source, sourceSessionId = null, status = 'needs_review') {
  const value = cleanText(text);
  return value ? { text:value, source, sourceSessionId, status, confirmed:false, sensitive:isSensitiveText(value) } : null;
}

/**
 * Build a compact candidate context from previously completed sessions.
 * Every derived item remains unconfirmed until the client reviews it.
 */
export function buildClientCoachingContext(sessions = [], { lifePlanChanges = [], linkedReports = [] } = {}) {
  const history = Array.isArray(sessions) ? sessions.slice(-8) : [];
  const goals = [], commitments = [], completed = [], topics = [], insights = [], reportRefs = [];
  for (const session of history) {
    if (!session || session.status !== 'completed') continue;
    const sid = cleanText(session.id || '');
    const plan = session.actionPlan || {};
    const reportDate = cleanText(session.completedAt || session.startedAt || '').slice(0,10);
    if (sid) reportRefs.push({ text:reportDate ? 'Coaching session report · '+reportDate : 'Coaching session report', sourceSessionId:sid });
    const goal = cleanText(plan.goal || session.clientQuestion || '');
    if (goal) goals.push(item(goal,'previous_session',sid));
    const action = cleanText(plan.actionText || '');
    if (action) commitments.push(item(action,'previous_action_plan',sid,'planned'));
    const topic = cleanText(session.clientQuestion || '');
    if (topic && !plan.goal) topics.push(item(topic,'unresolved_session_topic',sid));
    for (const reflection of Object.values(session.reflections || {})) {
      const note = cleanText(reflection?.text || '');
      if (note) insights.push(item(note,'client_reflection',sid));
    }
  }
  const normalizeExternal = (rows, source) => (Array.isArray(rows) ? rows : [])
    .map(row => item(typeof row === 'string' ? row : row?.text,source,
      typeof row === 'object' ? row.sourceSessionId || null : null))
    .filter(Boolean);
  const context = {
    version:1,
    generatedAt:new Date().toISOString(),
    reviewStatus:'needs_review',
    active_goals:unique(goals),
    previous_commitments:unique(commitments),
    completed_actions:unique(completed),
    open_topics:unique(topics),
    linked_reports:unique([...reportRefs.map(row=>item(row.text,'completed_coaching_session',row.sourceSessionId)),...normalizeExternal(linkedReports,'linked_report')]),
    life_plan_changes:normalizeExternal(lifePlanChanges,'life_plan_change'),
    previous_insights:unique(insights),
    preferred_coaching_style:null,
  };
  return context;
}

/** Validate a user-edited context before saving it in the encrypted owner record. */
export function normalizeClientCoachingContext(input, { clientConfirmed = false } = {}) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || input.version !== 1)
    throw new Error('COACHING_CONTEXT_INVALID');
  const output = { version:1, generatedAt:cleanText(input.generatedAt) || new Date().toISOString(),
    reviewStatus:clientConfirmed ? 'client_confirmed' : 'needs_review' };
  for (const field of FIELDS) {
    const rows = Array.isArray(input[field]) ? input[field] : [];
    if (rows.length > MAX_ITEMS) throw new Error('COACHING_CONTEXT_LIMIT');
    output[field] = rows.map(row => {
      const text = cleanText(typeof row === 'string' ? row : row?.text);
      if (!text) return null;
      return { text, source:clientConfirmed ? 'client_edited_or_confirmed' : 'unconfirmed',
        sourceSessionId:typeof row === 'object' && /^[0-9a-f-]{36}$/i.test(row.sourceSessionId || '')
          ? row.sourceSessionId : null,
        status:field === 'previous_commitments'
          ? (['planned','in_progress','completed','paused','not_started'].includes(row?.status) ? row.status : 'planned')
          : 'current',
        confirmed:clientConfirmed, sensitive:isSensitiveText(text) };
    }).filter(Boolean);
  }
  output.preferred_coaching_style = cleanText(input.preferred_coaching_style || '') || null;
  if (output.preferred_coaching_style && !['supportive','direct','reflective','structured','mentor'].includes(output.preferred_coaching_style))
    throw new Error('COACHING_CONTEXT_STYLE_INVALID');
  if (JSON.stringify(output).length > 12000) throw new Error('COACHING_CONTEXT_TOO_LARGE');
  return output;
}

/** Only this allowlisted, confirmed projection may be supplied to a future coach model. */
export function confirmedModelContext(context) {
  if (context?.version !== 1 || context.reviewStatus !== 'client_confirmed') return null;
  const result = { version:1 };
  for (const field of FIELDS) {
    result[field] = (Array.isArray(context[field]) ? context[field] : [])
      .filter(row => row?.confirmed === true && row?.sensitive !== true)
      .slice(0,MAX_ITEMS).map(row => ({ text:cleanText(row.text), status:row.status || 'current' }))
      .filter(row => row.text);
  }
  result.preferred_coaching_style = context.preferred_coaching_style || null;
  return JSON.stringify(result).length <= 8000 ? result : null;
}

/**
 * Pure projection used by the server-owned Context Snapshot reader.  The
 * caller supplies only an already-decrypted, owner-scoped Life Plan; this
 * module never creates or retains another memory record.
 */
export function projectCoachContextSnapshot({plan,latestTurnAct=null,selectedGoalId=null,policyVersion='v1'}={}) {
  const base={version:'hh-coach-context-snapshot-v1',items:[],sourceRevision:null,
    consentRevision:null,excludedReasonCodes:[]};
  if(!plan||typeof plan!=='object')return {...base,excludedReasonCodes:['CONTEXT_UNAVAILABLE']};
  const grants=new Set((Array.isArray(plan.contextPermissions)?plan.contextPermissions:[])
    .map(row=>row?.sessionId).filter(Boolean));
  base.sourceRevision=Number.isSafeInteger(plan.plan?.planVersion)?plan.plan.planVersion:null;
  base.consentRevision=grants.size?policyVersion:null;
  if(!grants.size)return {...base,excludedReasonCodes:['NO_ACTIVE_CONTEXT_GRANT']};
  if(['correction','topic_shift'].includes(latestTurnAct))
    return {...base,excludedReasonCodes:['LATEST_TURN_OVERRIDES_CONTEXT']};
  const rows=[];
  let sensitiveExcluded=false;
  for(const goal of Array.isArray(plan.goals)?plan.goals:[]){
    if(!grants.has(goal?.sourceSessionId)||!SNAPSHOT_GOAL_STATUSES.has(goal?.status))continue;
    if(selectedGoalId&&goal.id!==selectedGoalId)continue;
    const text=cleanText(goal.title);
    if(text&&isSensitiveText(text)){sensitiveExcluded=true;continue;}
    if(text)rows.push({id:goal.id,category:'goals_actions',kind:'goal',status:goal.status,text});
  }
  const selectedGoalIds=new Set(rows.map(row=>row.id));
  for(const action of Array.isArray(plan.actions)?plan.actions:[]){
    if(!grants.has(action?.sourceSessionId)||!SNAPSHOT_ACTION_STATUSES.has(action?.status))continue;
    if(selectedGoalId&&!selectedGoalIds.has(action.goalId))continue;
    const text=cleanText(action.description);
    if(text&&isSensitiveText(text)){sensitiveExcluded=true;continue;}
    if(text)rows.push({id:action.id,category:'goals_actions',kind:'action',status:action.status,text});
  }
  const seen=new Set();
  base.items=rows.filter(row=>{
    const key=row.kind+'|'+row.text.toLocaleLowerCase();
    if(seen.has(key))return false;
    seen.add(key);return true;
  }).slice(0,SNAPSHOT_MAX_ITEMS);
  if(sensitiveExcluded)base.excludedReasonCodes.push('SENSITIVE_ITEM_EXCLUDED');
  return base;
}
