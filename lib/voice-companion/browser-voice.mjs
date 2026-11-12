// Pure, provider-independent speech policy. No text or medical data is stored here.
export const VOICE_LANGUAGES=Object.freeze({ru:'ru-RU',en:'en-US',es:'es-ES'});
export const browserSpeechLanguage=locale=>VOICE_LANGUAGES[locale]||VOICE_LANGUAGES.en;
export function prepareSpeechText(value){
 if(typeof value!=='string')return '';
 return value.replace(/```[\s\S]*?```/g,' ').replace(/`([^`]+)`/g,'$1')
  .replace(/!?\[([^\]]+)\]\(https?:\/\/[^)]+\)/gi,'$1')
  .replace(/https?:\/\/\S+/gi,' ').replace(/<[^>]+>/g,' ')
  .replace(/^\s{0,3}#{1,6}\s+/gm,'').replace(/\*\*|__|[*_~]/g,'')
  .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu,' ')
  .replace(/[ \t]+/g,' ').replace(/\n{3,}/g,'\n\n').trim().slice(0,12000);
}
// Short utterances avoid Safari's long-text silent truncation. Never split a surrogate pair.
export function speechSegments(value,maxLength=170){
 const text=prepareSpeechText(value);
 const size=Math.max(60,Math.min(220,Number.isFinite(maxLength)?maxLength:170));
 const segments=[];let rest=text;
 while(rest&&segments.length<100){
  if([...rest].length<=size){segments.push(rest);break;}
  const chars=[...rest];const chunk=chars.slice(0,size).join('');
  const boundary=Math.max(chunk.lastIndexOf('. '),chunk.lastIndexOf('! '),chunk.lastIndexOf('? '),
    chunk.lastIndexOf('。'),chunk.lastIndexOf('\n'),chunk.lastIndexOf(' '));
  // Boundary positions above use UTF-16 indices; convert the prefix back to
  // code points before slicing so astral letters are never split or dropped.
  const length=boundary>chunk.length*0.4?boundary+1:chunk.length;
  const count=[...chunk.slice(0,length)].length;
  const piece=chars.slice(0,count).join('').trim();
  if(!piece)break;
  segments.push(piece);rest=chars.slice(count).join('').trim();
 }
 return segments;
}
// Server TTS is strictly for pre-authored public phrases, never a private turn.
export function chooseVoiceRoute({channel,playbackConsent=false,staticPhrase=false,
  freeTierConfirmed=false,cloudConsent=false,piperLocalReady=false}={}){
 if(channel==='web')return playbackConsent?'browser-speech':'text';
 if(channel==='telegram')return staticPhrase&&freeTierConfirmed&&cloudConsent?'gemini-static':'text';
 return piperLocalReady&&playbackConsent?'piper-local':'text';
}

// A final browser STT event can arrive after abort/new conversation.
// This one-shot guard is independent of React, vendor speech APIs and private text.
export function createRecognitionGate(isCurrent){
 let delivered=false;
 return Object.freeze({
  isActive:()=>Boolean(isCurrent()),
  accept(value){
   if(delivered||!isCurrent()||typeof value!=='string')return null;
   const transcript=value.trim();
   if(!transcript)return null;
   delivered=true;
   return transcript.slice(0,2000);
  },
 });
}
