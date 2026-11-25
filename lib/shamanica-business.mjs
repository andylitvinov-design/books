// Non-personal, deterministic quiz recommendations. Never store or send responses.
export const BUSINESS_GOALS=Object.freeze(["express","analysis","team","leader"]);
export const BUSINESS_CONCERNS=Object.freeze(["unclear","decision","conflict","resources"]);
export const BUSINESS_STARTS=Object.freeze(["free","consultation","team","tools"]);
export const BUSINESS_SERVICES=Object.freeze(["analysis","support","team","leader","artifacts","remedies"]);
const ALL_SERVICES=new Set(["express",...BUSINESS_SERVICES]);
export function shamanicaBusinessHref(locale,id){
 const lang=["ru","en","es"].includes(locale)?locale:"en";
 const base="/"+lang;
 switch(id){
  case "express":return base+"/services/free-situation-review?topic=business";
  case "analysis":return base+"/explore/business";
  case "support":return base+"/services/business-consulting#business-offers";
  case "team":return base+"/services/systemic-constellations";
  case "leader":return base+"/services/business-consulting";
  case "artifacts":return base+"/holistic-support#talismans";
  case "remedies":return base+"/services/psychohomeopathy";
  default:return base+"/shamanica/business";
 }
}
export function shamanicaBusinessRecommendations({goal,concern,start}={}){
 const g=BUSINESS_GOALS.includes(goal)?goal:"express";
 const c=BUSINESS_CONCERNS.includes(concern)?concern:"unclear";
 const s=BUSINESS_STARTS.includes(start)?start:"free";
 if(s==="free")return ["express",g==="express"?"support":g];
 const second=s==="tools"?(c==="resources"?"remedies":"artifacts")
  :s==="team"?"team"
  :s==="consultation"?"leader"
  :c==="conflict"?"team":c==="resources"?"leader":"support";
 const result=[g,g===second?"support":second];
 return result.every(id=>ALL_SERVICES.has(id))&&result[0]!==result[1]?result:["express","support"];
}
