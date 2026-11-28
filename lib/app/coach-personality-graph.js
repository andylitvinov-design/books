// Server-only published editorial graph. Never query or store client transcript data.
import 'server-only'
import {transaction} from './database.js'
import {coachDialoguePolicy} from '../coaching/unified-coach-policy.mjs'
import {COACH_GRAPH_IDS,COACH_GRAPH_RELEASE,normalizeCoachGraph,buildCoachGraphInstruction} from '../coaching/coach-personality-graph.mjs'
const cache=new Map()
const TTL=300000
const query=`SELECT c.release_id,c.persona_id,
 (SELECT jsonb_agg(jsonb_build_object('key',n.node_key,'kind',n.kind,'ordinal',n.ordinal,'weight',n.weight,'data',n.data) ORDER BY n.node_key)
  FROM app_private.hh_personality_nodes n WHERE n.release_id=c.release_id AND n.persona_id=c.persona_id) AS nodes,
 (SELECT jsonb_agg(jsonb_build_object('from_key',e.from_key,'to_key',e.to_key,'relation',e.relation,'weight',e.weight) ORDER BY e.from_key,e.to_key,e.relation)
  FROM app_private.hh_personality_edges e WHERE e.release_id=c.release_id AND e.persona_id=c.persona_id) AS edges,
 (SELECT jsonb_agg(jsonb_build_object('context_key',w.context_key,'dimension_key',w.dimension_key,'multiplier',w.multiplier) ORDER BY w.context_key,w.dimension_key)
  FROM app_private.hh_personality_context_weights w WHERE w.release_id=c.release_id) AS context_weights
 FROM app_private.hh_personality_characters c JOIN app_private.hh_personality_releases r ON r.release_id=c.release_id
 WHERE c.release_id=$1 AND c.persona_id=$2 AND r.status='published' AND c.fictional=true LIMIT 1`
async function readGraph(config,actor,id){
 if(!config||!actor?.id||!COACH_GRAPH_IDS.includes(id))return null
 const key=COACH_GRAPH_RELEASE+':'+id
 const previous=!config.test?cache.get(key):null
 if(previous?.config===config&&previous.expires>Date.now())return previous.graph
 const row=await transaction(config,actor,async db=>{
   await db.query("SET LOCAL statement_timeout='1200ms'")
   return (await db.query(query,[COACH_GRAPH_RELEASE,id])).rows[0]
 })
 const graph=normalizeCoachGraph(row,id)
 if(graph&&!config.test)cache.set(key,{config,graph,expires:Date.now()+TTL})
 return graph
}
// The checkpoint may use the same cached editorial graph. Fail closed to the
// existing Director instruction; no extra inference, no client transcript query.
export async function readPublishedCoachGraph(config,actor,id){
 try{return await readGraph(config,actor,id)}catch{return null}
}
export async function withPublishedCoachGraph(config,actor,persona,{input=null,directive=null}={}){
 if(!persona||typeof persona.systemInstructions!=='string'||!COACH_GRAPH_IDS.includes(persona.personaId))return persona
 try{
  const graph=await readGraph(config,actor,persona.personaId)
  const hint=input?{...(directive||{}),graphNoAdvice:input.authoritativeEvidence?input.authoritativeNoAdvice===true:coachDialoguePolicy(input).noAdvice}:directive
  const instruction=buildCoachGraphInstruction(graph,{input,directive:hint})
  return instruction?Object.freeze({...persona,systemInstructions:persona.systemInstructions+'\n'+instruction}):persona
 }catch{
  // Keep the exact existing static personality policy if DB or migration is
  // unavailable; no retries, no error details, no new provider, no client data.
  return persona
 }
}
