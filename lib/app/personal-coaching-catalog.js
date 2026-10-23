import 'server-only'
import { transaction } from './database.js'

// Shared, immutable _v1 reference catalog. This is not private client data and
// cannot be written from the frontend; client questions never enter this query.
const orderedQuestionsSql = `
  SELECT s.scheme_key AS "schemeKey", s.model_key AS "modelKey",
    s.required_custom_plan AS "requiredCustomPlan", s.published,
    m.editorial_status AS "editorialStatus",
    q.question_key AS "id", q.step_key AS "stepKey",
    q.prompt_i18n AS "prompt", q.answer_type AS "type", q.required,
    st.title_i18n AS "stageTitle",
    st.key_question_i18n AS "reflection",
    a.choices AS "choices"
  FROM app_private.coaching_schemes s
  JOIN app_private.coaching_models m ON m.model_key=s.model_key
  CROSS JOIN LATERAL unnest(s.step_keys) WITH ORDINALITY AS ord(step_key,step_order)
  JOIN app_private.coaching_steps st ON st.model_key=s.model_key AND st.step_key=ord.step_key
  JOIN app_private.coaching_questions q ON q.model_key=s.model_key AND q.step_key=ord.step_key
  LEFT JOIN app_private.coaching_answer_sets a ON a.answer_set_key=q.answer_set_key
  WHERE ($1::text IS NULL OR s.scheme_key=$1)
  ORDER BY s.scheme_key,ord.step_order,q.position
`

export async function loadSchemeQuestions(db,schemeKey,{publishedOnly=false}={}){
  if(typeof schemeKey!=='string'||! /^[a-z0-9_]+_v[0-9]+$/.test(schemeKey)||schemeKey.length>90)return null
  const rows=(await db.query(orderedQuestionsSql,[schemeKey])).rows
  if(!rows.length||(publishedOnly&&(!rows[0].published||rows[0].editorialStatus!=='reviewed')))return null
  return {
    schemeKey:rows[0].schemeKey,
    modelKey:rows[0].modelKey,
    requiredCustomPlan:rows[0].requiredCustomPlan,
    questions:rows.map(({id,stepKey,prompt,type,required,stageTitle,reflection,choices})=>
      ({id,stepKey,prompt,type,required,stageTitle,reflection,choices:choices||null})),
  }
}
export async function readPersonalCoachingCatalog(config,actor){
  return transaction(config,actor,async db=>{
    const [models,schemes,questions,signals]=await Promise.all([
      db.query(`SELECT model_key AS "modelKey",name_i18n AS name,focus_i18n AS focus,
        selection_comment_i18n AS "selectionComment",selection_caution_i18n AS caution,
        example_questions_i18n AS "exampleQuestions"
        FROM app_private.coaching_models WHERE editorial_status='reviewed' ORDER BY model_key`),
      db.query(`SELECT scheme_key AS "schemeKey",model_key AS "modelKey",
        name_i18n AS name,result_i18n AS result,style,estimated_minutes AS minutes,
        topic_tags AS tags,required_custom_plan AS "requiredCustomPlan"
        FROM app_private.coaching_schemes WHERE published=true ORDER BY scheme_key`),
      db.query(orderedQuestionsSql,[null]),
      db.query(`SELECT topic_key AS tag,label_i18n AS label,word_stems_i18n AS stems
        FROM app_private.coaching_intent_signals ORDER BY topic_key`),
    ])
    const byScheme=new Map()
    for(const q of questions.rows){
      if(!byScheme.has(q.schemeKey))byScheme.set(q.schemeKey,[])
      byScheme.get(q.schemeKey).push({
        id:q.id,stepKey:q.stepKey,prompt:q.prompt,type:q.type,
        required:q.required,stageTitle:q.stageTitle,
        reflection:q.reflection,choices:q.choices||null,
      })
    }
    return {
      version:'hh-coaching-catalog-v1',
      models:models.rows,
      schemes:schemes.rows.filter(s=>byScheme.has(s.schemeKey)).map(s=>({
        ...s,questions:byScheme.get(s.schemeKey),
      })),
      signals:signals.rows,
    }
  })
}
