import {parseTelegramHomeAction} from './telegram-companion-menu.mjs';
// Verified, non-invasive Telegram native command Menu for the existing CRM bot.
// Only the all-private-chats scope is touched; owner chat overrides and group
// command scopes are never read, altered or removed.
export const CRM_PRIVATE_COMMAND_SCOPE=Object.freeze({type:'all_private_chats'});
const NAMES=Object.freeze([
 'menu','cabinet','ai','ai_off','checkin','meditation','materials',
 'video','review','daily','daily_off','lang_ru','lang_en','stop'
]);
const COPY=Object.freeze({
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
// Only remove a once-installed command if it has an exact known description
// authored by this bot. Custom owner/BotFather descriptions are preserved.
const RETIRED_ES_LABELS=new Set(['Español','Spanish language','Idioma español']);
const validCommand=entry=>Boolean(entry&&typeof entry==='object'&&
 /^[a-z0-9_]{1,32}$/.test(entry.command||'')&&
 typeof entry.description==='string'&&
 entry.description.length>0&&entry.description.length<=256);
export function mergeTelegramCompanionNativeCommands(existing,locale='en'){
 // Fail closed rather than accidentally deleting pre-existing BotFather,
 // diagnostics, owner, group or website commands.
 if(!Array.isArray(existing)||existing.length>100||
    !existing.every(validCommand))return null;
 // Duplicate existing provider commands must fail closed before filtering.
 const originalNames=new Set(existing.map(x=>x.command));
 if(originalNames.size!==existing.length)return null;
 const result=existing.filter(x=>
   x.command!=='lang_es'||!RETIRED_ES_LABELS.has(x.description))
   .map(x=>({command:x.command,description:x.description}));
 const names=new Set(result.map(x=>x.command));
 for(const cmd of telegramCompanionNativeCommands(locale)){
  if(!names.has(cmd.command)){result.push(cmd);names.add(cmd.command)}
 }
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
 return parseTelegramHomeAction(event.rawText,botUsername)?.action==='home';
}
