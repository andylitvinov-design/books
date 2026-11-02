/** Deterministic four distinct locally authored soundtracks per approved video story. */
import {mandalaAudioTracks} from "./audio-recommendations.mjs";
const THEMES=new Set(["money","energy","relationships","goals","life","health"]);
const HINTS={calm:/calm|quiet|soft|rest|gentle|recharge|breath|trust|peace|balance|water|forest|sleep/i,
  focus:/goal|clarity|focus|step|direction|financial|decision|action|root|foundation|work/i,
  uplift:/energy|bright|light|fresh|growth|sun|prosper|success|opportunity|inspir|flower|new/i};
export function recommendScenarioMelodies(scenario,{limit=4,voiceFriendly=false}={}){
 if(!scenario||typeof scenario.id!=="string"||!THEMES.has(scenario.theme)||
   !Number.isInteger(limit)||limit<1||limit>8)return [];
 const hints=[scenario.id,...(Array.isArray(scenario.focusTags)?scenario.focusTags:[])].join(" ");
 const moods=Object.keys(HINTS).filter(key=>HINTS[key].test(hints));
 const ranked=mandalaAudioTracks.filter(t=>t.kind==="melody"&&(!voiceFriendly||t.voiceSafe))
  .map((track,index)=>({track,index,score:
   (track.themes.includes(scenario.theme)?35:0)+
   (moods.some(m=>track.moods.includes(m))?18:0)+(track.voiceSafe?3:0)+
   (track.id==="ode-to-joy"&&scenario.theme==="goals"?6:0)+
   (track.id==="greensleeves"&&scenario.theme==="relationships"?6:0)}))
  .sort((a,b)=>b.score-a.score||a.index-b.index);
 if(ranked.length<limit)return [];
 const result=[],used=new Set();
 const add=item=>{if(item&&!used.has(item.track.id)){used.add(item.track.id);result.push(item.track);}};
 add(ranked[0]);
 for(const pace of ["slow","steady","active"]){if(result.length<limit)add(ranked.find(item=>item.track.pace===pace&&!used.has(item.track.id)));}
 for(const item of ranked){if(result.length>=limit)break;add(item);}
 return result.slice(0,limit);
}
