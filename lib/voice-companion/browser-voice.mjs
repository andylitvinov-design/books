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

// Interpret an explicit spoken ordinal only when the current assistant turn
// contains an actual, server-defined menu. Never reinterpret free-form speech.
const spokenOrdinals=[
 /^(?:1|один|одна|первый|первая|первое|первую|one|first|uno|una|primer[oa]?)$/u,
 /^(?:2|два|две|второй|вторая|второе|вторую|two|second|dos|segund[oa])$/u,
 /^(?:3|три|третий|третья|третье|третью|three|third|tres|tercer[oa]?)$/u,
 /^(?:4|четыре|четвёртый|четвертый|четвёртая|четвертая|four|fourth|cuatro|cuart[oa])$/u,
 /^(?:5|пять|пятый|пятая|five|fifth|cinco|quint[oa])$/u,
 /^(?:6|шесть|шестой|шестая|six|sixth|seis|sext[oa])$/u,
 /^(?:7|семь|седьмой|седьмая|seven|seventh|siete|séptim[oa]|septim[oa])$/u,
];
/** @param {string} text @param {string[]} [choices] */
export function resolveSpokenMenuChoice(text,choices=[]){
 if(typeof text!=='string'||!Array.isArray(choices)||!choices.length)return text;
 const words=text.normalize('NFKC').toLowerCase().trim().replace(/[.!?,;:¡¿]+$/gu,'').trim()
  .replace(/^(?:пункт|вариант|номер|option|number|opción|opcion|número|numero)\s+/u,'')
  .replace(/\s+(?:пункт|вариант|option|opción|opcion)$/u,'');
 const index=spokenOrdinals.findIndex(pattern=>pattern.test(words));
 return index>=0&&typeof choices[index]==='string'&&choices[index].trim()?choices[index]:text;
}
