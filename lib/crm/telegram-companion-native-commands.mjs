import {parseTelegramHomeAction} from './telegram-companion-menu.mjs';
// Verified, non-invasive Telegram native command Menu for the existing CRM bot.
// Only the all-private-chats scope is touched; owner chat overrides and group
// command scopes are never read, altered or removed.
export const CRM_PRIVATE_COMMAND_SCOPE=Object.freeze({type:'all_private_chats'});
// Visible commands follow site IA. Old advanced commands still work when typed.
// Eight visible private-chat commands, in the owner's exact order.
const NAMES=Object.freeze([
 'support','business','study','diagnostic','profile','video','coach','assistant'
]);
const COPY=Object.freeze({
 ru:['🌿 Get Support · Поддержка','💼 Business Consulting',
   '🎓 Study · Мои курсы','🧭 Free Diagnostic','👤 Profile · Мой профиль',
   '🎬 Generate Video','🧑‍🏫 My Coach','💬 Talk to AI Assistant'],
 en:['🌿 Get Support','💼 Business Consulting','🎓 Study · My Courses',
   '🧭 Free Diagnostic','👤 Profile','🎬 Generate Video','🧑‍🏫 My Coach',
   '💬 Talk to AI Assistant'],
 es:['🌿 Get Support','💼 Business Consulting','🎓 Study · My Courses',
   '🧭 Free Diagnostic','👤 Profile','🎬 Generate Video','🧑‍🏫 My Coach',
   '💬 Talk to AI Assistant']
});
const PREVIOUS_NAMES=Object.freeze(['support','menu','tests','academy','library','events','cabinet','stop']);
const PREVIOUS_COPY=Object.freeze({
 ru:['🌿 Получить поддержку','Главное меню','Бесплатные тесты','Курсы и Reiki',
     'Библиотека и практики','События','Мой кабинет','Остановить диалог'],
 en:['🌿 Get Support','Main menu','Free tests','Academy & Reiki',
     'Library & practices','Events','My Cabinet','Stop conversation'],
 es:['🌿 Get Support','Main menu','Free tests','Academy & Reiki',
     'Library & practices','Events','My Cabinet','Stop conversation']
});
const LEGACY_NAMES=Object.freeze([
 'menu','cabinet','ai','ai_off','checkin','meditation','materials',
 'video','review','daily','daily_off','lang_ru','lang_en','stop'
]);
const LEGACY_COPY=Object.freeze({
 ru:[
 'Открыть главное меню','Открыть личный кабинет','Общаться с AI после согласия',
 'Выключить AI','Чекин состояния','Выбрать медитацию',
 'Мои материалы','Создать видео на сайте','Личный разбор с мастером',
 'Включить утреннее приветствие','Выключить утреннее приветствие',
 'Русский язык','English','Остановить общение'
 ],
 en:[
 'Open main menu','Open my Cabinet','Chat with AI after consent',
 'Turn AI chat off','Quick check-in','Find a meditation',
 'My materials','Create a video on the website','Request a personal review',
 'Enable daily hello','Disable daily hello',
 'Russian language','English language','Stop all contact'
 ],
 es:[
 'Abrir menú principal','Abrir mi espacio','Conversar con IA tras aceptar',
 'Desactivar el chat IA','Registro breve','Elegir meditación',
 'Mis materiales','Crear vídeo en la web','Revisión personal',
 'Activar saludo diario','Desactivar saludo diario',
 'Idioma ruso','Idioma inglés','Detener contacto'
 ]
});
export function telegramCompanionNativeCommands(locale='en'){
 const language=Object.hasOwn(COPY,locale)?locale:'en';
 return NAMES.map((command,i)=>({command,description:COPY[language][i]}));
}
// Retire only commands installed by this bot, by exact known labels.
// Unknown BotFather/owner shortcuts are preserved, including their text.
const RETIRED_ES_LABELS=new Set(['Español','Spanish language','Idioma español']);
const OWNED_DESCRIPTIONS=new Map();
for(const [names,translations] of [[LEGACY_NAMES,LEGACY_COPY],[PREVIOUS_NAMES,PREVIOUS_COPY],[NAMES,COPY]]){
 for(const labels of Object.values(translations))for(let i=0;i<names.length;i++){
  if(!OWNED_DESCRIPTIONS.has(names[i]))OWNED_DESCRIPTIONS.set(names[i],new Set());
  OWNED_DESCRIPTIONS.get(names[i]).add(labels[i]);
 }
}
const validCommand=entry=>Boolean(entry&&typeof entry==='object'&&
 /^[a-z0-9_]{1,32}$/.test(entry.command||'')&&
 typeof entry.description==='string'&&
 entry.description.length>0&&entry.description.length<=256);
export function mergeTelegramCompanionNativeCommands(existing,locale='en'){
 if(!Array.isArray(existing)||existing.length>100||
    !existing.every(validCommand))return null;
 const existingNames=new Set(existing.map(x=>x.command));
 if(existingNames.size!==existing.length)return null;
 const ownerCommands=existing.filter(x=>
   !(OWNED_DESCRIPTIONS.get(x.command)?.has(x.description))&&
   !(x.command==='lang_es'&&RETIRED_ES_LABELS.has(x.description)));
 const ownerByName=new Map(ownerCommands.map(x=>[x.command,x]));
 // The owner may have customized a name; use their command at that slot.
 const canonical=telegramCompanionNativeCommands(locale).map(x=>
   ownerByName.get(x.command)||x);
 const extra=ownerCommands.filter(x=>!NAMES.includes(x.command));
 const result=[...canonical,...extra];
 return result.length<=100?result:null;
}
export function telegramCompanionCommandsEqual(left,right){
 return Array.isArray(left)&&Array.isArray(right)&&left.length===right.length&&
  left.every((x,i)=>x.command===right[i].command&&x.description===right[i].description);
}
export function telegramCompanionCommandSetupReady(env={}){
 return env.VERCEL_ENV==='production'&&
  env.HH_CRM_TG_COMPANION_ENABLED==='true'&&
  env.HH_CRM_MSG_TELEGRAM_ENABLED==='true';
}

/** A signed, customer-originated Home command can install the native Menu
 * immediately, instead of waiting for the next protected 09:00 Toronto cron.
 * Callers must verify the webhook and a committed Companion reply first.
 */
export function shouldBootstrapTelegramNativeMenu(event,botUsername){
 if(event?.type!=='incoming'||event.callbackId||event.inlineAction||
    event.photoFileId||typeof event.rawText!=='string')return false;
 return ['home','support'].includes(parseTelegramHomeAction(event.rawText,botUsername)?.action);
}
