import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const hub=read("components/app/messages-orders-clients.jsx");
const css=read("components/app/messages-orders-clients.module.css");
const chat=read("components/holistic-agent-chat.tsx");
const history=read("components/holistic-agent-history.tsx");
test("AI assistant header is localized and replaces obsolete notification/refresh actions",()=>{
  assert.match(hub,/data-hh-ai-assistant-header/);
  for(const label of ["AI Assistant","ИИ-ассистент","Asistente IA"])assert.ok(hub.includes(label));
  for(const label of ["Ask · Explore · Learn · Create","Спросить · Исследовать · Учиться · Создавать","Preguntar · Explorar · Aprender · Crear"])assert.ok(hub.includes(label));
  assert.match(hub,/<History size=\{24\}/);assert.match(hub,/<SquarePen size=\{24\}/);
  assert.doesNotMatch(hub,/<RefreshCw size=\{19\}/);
});
test("History opens the existing consented private archive, not a second history store",()=>{
  assert.match(hub,/hh:messenger-open-history/);assert.match(chat,/hh:messenger-open-history/);
  assert.match(chat,/<SecureDialogueHistory history=\{privateTranscript\}/);assert.match(history,/data-hh-secure-chat-history/);assert.match(history,/Separate opt-in|Отдельное разрешение|Consentimiento separado/);
});
test("New chat reuses the established reset handler",()=>{
  assert.match(hub,/hh:messenger-new-chat/);assert.match(chat,/const startNewConversation=\(\)=>resetConversation\(\)/);
  assert.match(chat,/function resetConversation\(\)/);assert.match(chat,/removeEventListener\("hh:messenger-new-chat"/);
});

test("Messenger language switcher lives beside the two enlarged assistant actions, with a native mobile picker",()=>{
  assert.match(hub,/data-hh-ai-assistant-header/);
  assert.match(hub,/data-hh-messenger-language-switcher/);
  assert.match(hub,/data-hh-messenger-language-select value=\{locale\}/);
  for(const language of ["en","ru","es"])assert.ok(hub.includes(`data-hh-messenger-language-option={language}`)&&hub.includes(`{language.toUpperCase()}`));
  assert.match(hub,/aria-pressed=\{locale===language\}/);
  assert.match(hub,/role="group"/);
  const headerStart=hub.indexOf("data-hh-ai-assistant-header");
  const languageIndex=hub.indexOf("data-hh-messenger-language-switcher");
  assert.ok(headerStart>=0&&languageIndex>headerStart,"language control belongs inside assistant header");
  assert.ok(languageIndex<hub.indexOf("data-hh-ai-chat-history"),"language is adjacent to history and new chat");
  assert.ok(hub.indexOf("data-chat-top-tabs")<headerStart,"tabs remain above the compact header");
  assert.doesNotMatch(hub,/styles\.languageBar/);
  assert.doesNotMatch(css,/\.languageBar\s*\{/);
  assert.match(css,/\.root \.headerActions>button\{[^}]*width:44px;height:44px/);
  assert.match(css,/\.root \.languageCompact:focus-within/);
});
test("Manual and message-detected language changes update the localized route without reloading the live chat",()=>{
  assert.match(hub,/function chooseLocale\(nextLocale\)/);
  assert.match(hub,/url\.pathname=url\.pathname\.replace\(localePrefix/);
  assert.match(hub,/window\.history\.replaceState\(window\.history\.state,'',url\)/);
  assert.match(hub,/onConversationLocaleChange=\{chooseLocale\}/);
  assert.doesNotMatch(hub,/window\.location\.(reload|assign)\(/);
  assert.match(css,/\.root \.languageOptions button\[aria-pressed="true"\]/);
  assert.match(hub,/onChange=\{event=>chooseLocale\(event\.currentTarget\.value\)\}/);
});
