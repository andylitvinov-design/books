// Transparent, deterministic selection: no profile, storage or network calls.
export const SHAMANICA_GOALS=Object.freeze(["energy","relationships","money","growth"]);
export const SHAMANICA_METHODS=Object.freeze(["remedies","artifacts","energy","rituals","learning","unsure"]);
export const SHAMANICA_STARTS=Object.freeze(["free","personal","object","course"]);
export const SHAMANICA_SERVICES=Object.freeze(["remedies","artifacts","energy","rituals","learning"]);
const preference={
 energy:["energy","artifacts","rituals","learning","remedies"],
 relationships:["rituals","learning","energy","artifacts","remedies"],
 money:["artifacts","rituals","learning","energy","remedies"],
 growth:["learning","rituals","artifacts","energy","remedies"],
};
const allowed=(xs,v)=>typeof v==="string"&&xs.includes(v);
export function shamanicaRecommendations({goal,method,start}={}){
 const g=allowed(SHAMANICA_GOALS,goal)?goal:"growth";
 const m=allowed(SHAMANICA_METHODS,method)?method:"unsure";
 const s=allowed(SHAMANICA_STARTS,start)?start:"personal";
 const order=[
  ...(s==="free"||s==="course"?["learning"]:[]),
  ...(s==="object"?["artifacts","rituals"]:[]),
  ...(s==="personal"&&m==="unsure"?["energy"]:[]),
  ...(m==="unsure"?[]:[m]),
  ...preference[g],
 ];
 return [...new Set(order)].filter(id=>SHAMANICA_SERVICES.includes(id)).slice(0,2);
}
export function shamanicaServiceHref(locale,id){
 const root="/"+(locale==="ru"||locale==="es"?locale:"en");
 switch(id){
  case "remedies":return root+"/services/psychohomeopathy";
  case "artifacts":return root+"/holistic-support#talismans";
  case "energy":return root+"/services/remote-energy-support";
  case "rituals":return root+"/holistic-support/mandala";
  case "learning":return root+"/academy";
  default:return root+"/shamanica";
 }
}

// Category entrances open the existing three-offer catalogue, not a single detail
// page. Keep shamanicaServiceHref for legacy direct-service callers.
export function shamanicaCategoryHref(locale,id){
 const root="/"+(locale==="ru"||locale==="es"?locale:"en");
 if(id!=="guidance"&&!SHAMANICA_SERVICES.includes(id))return root+"/shamanica";
 return root+"/shamanica/results?category="+encodeURIComponent(id);
}
