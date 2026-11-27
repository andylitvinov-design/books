// Local delivery hints, never client evidence or session authority.
const PROFILES=Object.freeze({
 mira:{mode:'reflective',style:'warm and unhurried; leave space before a gentle invitation'},
 max:{mode:'normal',style:'energetic, brief and practical without pressure'},
 sofia:{mode:'reflective',style:'composed and respectful; leave room for feelings and boundaries'},
 alex:{mode:'normal',style:'structured, concise; ask one concrete clarification'},
 merlin:{mode:'reflective',style:'contemplative; let one metaphor land without claiming knowledge'},
 harry:{mode:'normal',style:'friendly and encouraging; never trivialize fear'},
 genie:{mode:'normal',style:'curious and playful only when welcome; grounded in uncertainty'},
 caesar:{mode:'reflective',style:'dignified, measured, direct without dominance'},
});
const MODES=Object.freeze({quick:650,normal:900,reflective:1500,practice:3000});
export function coachBasicDeliveryProfile(personaId){
 const profile=typeof personaId==='string'&&Object.hasOwn(PROFILES,personaId)?PROFILES[personaId]:null;
 return profile?{...profile}:{mode:'normal',style:'clear, respectful and calm'};
}
export function coachBasicListeningMode({personaId,pace,question='',practiceActive=false}={}){
 if(practiceActive===true)return 'practice';
 const q=String(question||'').slice(-900).trim();
 if(/[?？]\s*$/u.test(q)&&/(?:\b(?:yes or no|on a scale|from 0 to 10|from 1 to 10|do you agree|is that correct)\b|да или нет|по шкале|от [01] до 10|правильно ли|верно ли|согласны ли|sí o no|del [01] al 10|en una escala|es correcto)/iu.test(q))
   return pace==='slow'?'normal':'quick';
 if(pace==='slow'||/(?:\b(?:take your time|what would it mean|imagine|what matters most)\b|не торопитесь|какой смысл|представьте|что для вас важнее|tómate tu tiempo|imagina|qué significa)/iu.test(q))return 'reflective';
 if(pace==='fast')return 'normal';
 return coachBasicDeliveryProfile(personaId).mode;
}
export function createCoachBasicEndpointPolicy(){
 let estimate=0;
 return {
  observe(pause){if(Number.isFinite(pause)&&pause>=200&&pause<=2600)estimate=estimate===0?pause:estimate*.75+pause*.25},
  endpoint({mode='normal',duration=0}={}){
   const base=Object.hasOwn(MODES,mode)?MODES[mode]:MODES.normal;
   return Math.min(3000,Math.round(Math.max(duration>=6500?Math.max(base,1050):base,estimate?estimate+250:0)));
  },
  reset(){estimate=0},
 };
}
// Never discard a yes/no, correction, or response to a question.
export function coachBasicBackchannel(text,{duringOutput=false,questionPending=true}={}){
 return duringOutput&&!questionPending&&/^(?:угу|ага|мгм|m+h+m+|uh[ -]?huh|ajá|aja)[.!…,\s]*$/iu.test(String(text||'').trim());
}
export function coachBasicPromptContext(turns=[],earlier=[]){
 const exact=new Set((Array.isArray(turns)?turns:[]).filter(x=>x?.role==='user'&&typeof x.content==='string').map(x=>x.content.trim()));
 const kept=[];
 for(const s of Array.isArray(earlier)?earlier:[]){
   if(typeof s!=='string'||!s.trim()||exact.has(s.trim()))continue;
   exact.add(s.trim());kept.push(s);
 }
 return kept;
}
