import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("voice picker lists local device voices matching the conversation language",()=>{
 const avatar=read("components/app/emotional-avatar.tsx");
 assert.match(avatar,/voice\.localService===true&&voice\.lang\?\.toLowerCase\(\)\.startsWith\(locale\)/);
 assert.match(avatar,/deviceVoices\.map\(voice/);
 assert.match(avatar,/aria-label=\{t\.voice\}/);
 assert.match(avatar,/selectedVoiceURI\|\|undefined/);
 const speech=read("lib/assistant-avatar/device-speech.mjs");
 assert.match(speech,/callbacks\.voiceURI\?voices\.find/);
 assert.match(speech,/v\.localService===true/);
});
