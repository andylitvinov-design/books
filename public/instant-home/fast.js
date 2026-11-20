(()=>{"use strict";
const locale=document.documentElement.lang==="ru"?"ru":"en",form=document.querySelector("#ali-form"),field=document.querySelector("#ali-message"),submit=document.querySelector("#ali-send"),state=document.querySelector("#ali-state"),microphone=document.querySelector("#ali-mic"),buttons=[...document.querySelectorAll("[data-mode]")];
let mode="self",recognition=null;
const chat="/"+locale+"/app/messages?section=ai";
// Maintain the exact public/UI locale preference the React Home previously set.
try{
 document.cookie="holistic_house_public_locale="+locale+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
 document.cookie="holistic_house_ui_locale="+locale+"; Path=/; Max-Age=31536000; SameSite=Lax; Secure";
}catch{}

function show(text){state.textContent=text;}
function stage(value,selected){
 const text=String(value||"").trim();
 if(!text||text.length>2000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(text))return false;
 try{sessionStorage.setItem("hh:home-ali-handoff:v1",JSON.stringify({v:1,source:"home",text,locale,mode:selected,createdAt:Date.now()}));return true;}catch{return false;}
}
function send(text,target,selected){if(!stage(text,selected)){show(locale==="ru"?"Не удалось передать сообщение. Попробуйте снова.":"Could not pass the message. Please try again.");return;}window.location.assign(target||chat);}
const tiles=[...document.querySelectorAll("[data-home-intent-option]")],review=document.querySelector("[data-home-free-review]");
function selectMode(value){
 mode=value==="business"?"business":"self";
 buttons.forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.mode===mode)));
 const subtitle=document.querySelector("#ali-subtitle");subtitle.textContent=mode==="business"?subtitle.dataset.business:subtitle.dataset.personal;
 for(const tile of tiles){const key=mode==="business"?"business":"self",href=tile.dataset[key+"Href"],label=tile.dataset[key+"Label"],intent=tile.dataset[key+"Intent"];
  if(href&&href.startsWith("/"+locale+"/"))tile.href=href;
  const name=tile.querySelector(".label");if(name&&label)name.textContent=label;
  if(intent)tile.dataset.homeIntentOption=intent;
 }
 if(review){const key=mode==="business"?"business":"self";
  review.href=review.dataset[key+"Href"];
  review.querySelector("strong").textContent=review.dataset[key+"Title"];
  review.querySelector("small").textContent=review.dataset[key+"Detail"];
 }
 show("");
}
buttons.forEach(button=>button.addEventListener("click",()=>selectMode(button.dataset.mode)));
// Topic links use public intent/need URLs; only typed user text is passed privately.
field.addEventListener("input",()=>{submit.disabled=!field.value.trim();show("");});
form.addEventListener("submit",e=>{e.preventDefault();send(field.value,chat,mode);});
microphone.addEventListener("click",()=>{if(recognition){recognition.stop();return;}const Speech=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Speech){show(locale==="ru"?"Используйте микрофон клавиатуры.":"Use your keyboard microphone.");field.focus();return;}const r=new Speech();recognition=r;r.lang=locale==="ru"?"ru-RU":"en-US";r.interimResults=false;r.continuous=false;r.onresult=e=>{const spoken=e.results?.[0]?.[0]?.transcript?.trim()||"";if(spoken){field.value=(field.value?field.value+" ":"")+spoken.slice(0,2000-field.value.length);field.dispatchEvent(new Event("input",{bubbles:true}));}};r.onend=()=>{recognition=null;};r.onerror=()=>{recognition=null;show(locale==="ru"?"Не удалось распознать речь.":"Speech recognition failed.");};try{r.start();show(locale==="ru"?"Слушаю…":"Listening…");}catch{recognition=null;}});
document.addEventListener("keydown",e=>{if(e.key==="Escape")document.querySelectorAll("header details[open]").forEach(d=>d.open=false);});
document.documentElement.dataset.homeInteractive="true";
const register=()=>{"serviceWorker"in navigator&&navigator.serviceWorker.register("/sw.js").catch(()=>{});};
const afterLoad=()=>{"requestIdleCallback"in window?window.requestIdleCallback(register,{timeout:4000}):setTimeout(register,1200);};
if(document.readyState==="complete")afterLoad();else window.addEventListener("load",afterLoad,{once:true});
})();