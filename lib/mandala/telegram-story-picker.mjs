import {listTelegramStoryCategories,listTelegramStorySubcategories,listTelegramStoryTopics,listTelegramStoryScenarios,listTelegramStoryPlots} from './telegram-story-plots.mjs';
const STEPS=['category','subcategory','topic','scenario','plot'];
export function parseStoryChoice(data){
 if(typeof data!=='string'||Buffer.byteLength(data,'utf8')>64)return null;
 const match=data.match(/^hh-story:([a-f0-9]{12}):([0-9a-z]{1,4}):([0-4]):([0-5])$/);
 if(!match)return null;
 const revision=parseInt(match[2],36);
 if(!Number.isSafeInteger(revision)||revision>1679615||
   (Number(match[3])<4&&Number(match[4])>3))return null;
 return {session:match[1],revision,step:STEPS[Number(match[3])],index:Number(match[4])};
}
export function storyChoiceKeyboard({step,selection={},session,revision,locale='ru'}={}){
 if(!/^[a-f0-9]{12}$/.test(session||'')||!Number.isInteger(revision)||revision<0||revision>1679615)return null;
 const index=STEPS.indexOf(step);
 if(index<0)return null;
 const options=step==='category'?listTelegramStoryCategories(locale):
   step==='subcategory'?listTelegramStorySubcategories(selection.categoryId,locale):
   step==='topic'?listTelegramStoryTopics(selection.categoryId,selection.subcategoryId,locale):
   step==='scenario'?listTelegramStoryScenarios(selection.topicId,locale):
   listTelegramStoryPlots(selection.scenarioId,locale);
 // MyTube now supplies six editorial plot choices; preceding four levels remain 4×4×4×4.
 if(options.length!==(step==='plot'?6:4))return null;
 return {options,reply_markup:{inline_keyboard:options.map((item,i)=>[{
   text:item.label.slice(0,55),
   callback_data:'hh-story:'+session+':'+revision.toString(36)+':'+index+':'+i,
 }])}};
}
