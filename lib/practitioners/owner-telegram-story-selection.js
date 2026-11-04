import {randomBytes,randomUUID} from 'node:crypto';
import {transaction} from '../app/database.js';
import {PRACTITIONER_ID} from '../../data/app-services.js';
import {MYTUBE_TAXONOMY_VERSION} from '../mandala/mytube-content-taxonomy.mjs';
import {parseStoryChoice,storyChoiceKeyboard} from '../mandala/telegram-story-picker.mjs';
const STEPS=['category','subcategory','topic','scenario','plot'];
const KEYS=['categoryId','subcategoryId','topicId','scenarioId','plotId'];
async function privateDb(config,fn){
 return transaction(config,null,async db=>{
  await db.query("select set_config('hh.owner_video_manager','1',true)");
  return fn(db);
 },{server:true});
}
export async function beginOwnerStorySelection(config){
 const jobId=randomUUID(),session=randomBytes(6).toString('hex');
 await privateDb(config,db=>db.query(
  `insert into app_private.telegram_owner_story_selection
  (practitioner_id,job_id,callback_session,revision,step,taxonomy_version,expires_at)
  values($1,$2,$3,0,'category',$4,now()+interval '30 minutes')
  on conflict(practitioner_id) do update set
  job_id=excluded.job_id,callback_session=excluded.callback_session,
  revision=0,step='category',taxonomy_version=excluded.taxonomy_version,
  category_id=null,subcategory_id=null,topic_id=null,scenario_id=null,plot_id=null,
  expires_at=excluded.expires_at,updated_at=now()`,
  [PRACTITIONER_ID,jobId,session,MYTUBE_TAXONOMY_VERSION]));
 return {jobId,session,revision:0,step:'category',
  picker:storyChoiceKeyboard({step:'category',session,revision:0})};
}
export async function applyOwnerStoryChoice(config,callback){
 const choice=parseStoryChoice(callback);
 if(!choice)return {state:'invalid'};
 return privateDb(config,async db=>{
  const row=(await db.query(
   `select * from app_private.telegram_owner_story_selection
   where practitioner_id=$1 for update`,[PRACTITIONER_ID])).rows[0];
  if(!row||row.callback_session!==choice.session||
   Number(row.revision)!==choice.revision||row.step!==choice.step||
   row.taxonomy_version!==MYTUBE_TAXONOMY_VERSION||
   new Date(row.expires_at).getTime()<=Date.now())return {state:'stale'};
  const index=STEPS.indexOf(choice.step);
  const selection={categoryId:row.category_id,subcategoryId:row.subcategory_id,
   topicId:row.topic_id,scenarioId:row.scenario_id,plotId:row.plot_id};
  const picker=storyChoiceKeyboard({step:choice.step,selection,
   session:choice.session,revision:choice.revision});
  const selected=picker?.options[choice.index];
  if(!selected)return {state:'invalid'};
  const next={...selection,[KEYS[index]]:selected.id};
  for(let i=index+1;i<KEYS.length;i++)next[KEYS[i]]=null;
  const nextStep=STEPS[index+1]||'complete',revision=choice.revision+1;
  await db.query(
   `update app_private.telegram_owner_story_selection set
   category_id=$2,subcategory_id=$3,topic_id=$4,scenario_id=$5,plot_id=$6,
   revision=$7,step=$8,updated_at=now(),expires_at=now()+interval '30 minutes'
   where practitioner_id=$1`,
   [PRACTITIONER_ID,next.categoryId,next.subcategoryId,next.topicId,
    next.scenarioId,next.plotId,revision,nextStep]);
  return {state:nextStep==='complete'?'complete':'selected',
   jobId:row.job_id,selection:next,revision,step:nextStep,
   picker:nextStep==='complete'?null:storyChoiceKeyboard({
    step:nextStep,selection:next,session:choice.session,revision})};
 });
}
