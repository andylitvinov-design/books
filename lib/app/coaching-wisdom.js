// One server-side read-only integration for My Coach, Personal Coaching Brain
// and the rules-based Holistic Agent. No client content is sent to the DB:
// only a controlled topic enum and an internal result limit.
import 'server-only';
import {transaction} from './database.js';
import {
  classifyWisdomRequest, wisdomTopicQuestion, selectWisdomRow, formatWisdomTurn,
} from '../coaching/wisdom-retrieval.mjs';

const unavailable={
  ru:'Сейчас не могу открыть библиотеку. Можем продолжить разговор без цитат.',
  en:'The wisdom library is temporarily unavailable. We can continue without quotes.',
  es:'La biblioteca de reflexiones no está disponible ahora. Podemos seguir sin citas.',
};
const noMatch={
  ru:'Не нашёл подходящей проверенной мысли для этой темы.',
  en:'I could not find a suitable reviewed thought for this topic.',
  es:'No encontré una reflexión revisada que encaje con este tema.',
};
const entryIdRe=/^[a-z0-9][a-z0-9_-]{1,110}$/;

function clarification(locale,text){
  return {version:'hh-coach-wisdom-v1',mode:'wisdom',method:'reflection',stage:'reflection',
    message:'',reflection:text||'',question:wisdomTopicQuestion(locale)||'',
    hypothesis:'',planSuggestion:'',evidenceQuote:'',wisdomEntryId:''};
}
function alone(locale,text){
  return {version:'hh-coach-wisdom-v1',mode:'wisdom',method:'reflection',stage:'reflection',
    message:'',reflection:text,question:'',hypothesis:'',planSuggestion:'',
    evidenceQuote:'',wisdomEntryId:''};
}

export async function resolveWisdomRequest(config,actor,input,{reader}={}){
  const desired=classifyWisdomRequest(input);
  if(!desired)return null; // do not interrupt normal coaching.
  if(!desired.topic)return clarification(desired.locale,'');
  let rows;
  try{
    // Read under the existing signed-in app account and hh_app_backend RLS role.
    // Injected reader is used only in isolated tests. Production never supplies one.
    if(reader)rows=await reader(desired.topic);
    else rows=await transaction(config,actor,async db=>{
      const result=await db.query(
        "SELECT entry_id,content_type,origin,topic,text_ru,text_en,text_es,"+
        "coach_question_ru,coach_question_en,coach_question_es,source_title,"+
        "source_locator,source_url,attribution,review_status,coach_enabled,avoid_when "+
        "FROM public.hh_coach_wisdom_catalog_v1 "+
        "WHERE topic=$1 AND coach_enabled=true AND review_status='curated' "+
        "ORDER BY entry_id LIMIT 80",[desired.topic]
      );
      return result.rows;
    });
  }catch{
    // Silent, fail-closed. No personal messages, provider errors or secret details in logs.
    return alone(desired.locale,unavailable[desired.locale]);
  }
  const selected=selectWisdomRow(rows,{...desired,turns:input.turns});
  if(!selected)return alone(desired.locale,noMatch[desired.locale]);
  const reply=formatWisdomTurn(selected,desired.locale);
  if(!reply||!entryIdRe.test(reply.wisdomEntryId||''))
    return alone(desired.locale,noMatch[desired.locale]);
  return reply;
}
