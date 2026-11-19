import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {isSpeechTranscriptLanguageMismatch,normalizeSpeechLanguage} from "../lib/mandala/audio-speech-language.mjs";

const read=path=>readFileSync(new URL(path,import.meta.url),"utf8");
const studio=read("../components/mandala-free-video-studio.tsx");
const route=read("../app/api/holistic-support/audio-storyboard/route.js");
const client=read("../lib/mandala/consented-audio-stt.ts");

test("audio language is independent of EN/RU/ES UI and defaults to auto",()=>{
  assert.match(studio,/useState<"auto"\|VideoLocale>\("auto"\)/);
  assert.match(studio,/data-video-audio-language-picker/);
  assert.ok(studio.indexOf("const [recording, setRecording]")<studio.indexOf("const spokenAudioLanguagePicker="));
  assert.ok(studio.indexOf("const [preparing, setPreparing]")<studio.indexOf("const spokenAudioLanguagePicker="));
  assert.match(studio,/data-video-audio-language value=\{spokenAudioLanguage\}/);
  assert.match(studio,/value="ru">Русский/);
  assert.match(studio,/spokenAudioLanguage!=="auto"/);
  assert.match(studio,/startDeviceVoiceCapture\(spokenAudioLanguage\)/);
  assert.match(studio,/transcribeDeviceAudioFile\(entry.file,spokenAudioLanguage,controller.signal\)/);
  assert.match(studio,/requestConsentedTimedTranscript\(\s*entry.file,spokenAudioLanguage,true,controller.signal\)/);
  assert.doesNotMatch(studio,/startDeviceVoiceCapture\(locale\)/);
  assert.doesNotMatch(studio,/transcribeDeviceAudioFile\(entry.file,locale,controller.signal\)/);
  assert.match(client,/\["ru","en","es","auto"\]/);
  assert.match(route,/if\(language!=="auto"\)multipart.set\("language",language\)/);
  assert.match(route,/audio\/transcriptions/);
  assert.doesNotMatch(route,/audio\/translations/);
});
test("detected Russian stays Russian; likely English substitution triggers retry hint, not translation",()=>{
  assert.equal(normalizeSpeechLanguage("russian"),"ru");
  assert.equal(normalizeSpeechLanguage("es"),"es");
  assert.equal(isSpeechTranscriptLanguageMismatch({requested:"ru",text:"Солнце светит ярко, а дети счастливы сегодня утром."}),false);
  assert.equal(isSpeechTranscriptLanguageMismatch({requested:"auto",detected:"russian",text:"the sun is shining well children are all happy today all happy"}),true);
  assert.equal(isSpeechTranscriptLanguageMismatch({requested:"ru",text:"the sun is shining well children are all happy today all happy"}),true);
  assert.equal(isSpeechTranscriptLanguageMismatch({requested:"en",text:"The sun shines and the children are happy."}),false);
  assert.equal(isSpeechTranscriptLanguageMismatch({requested:"es",text:"El sol brilla y todos están felices."}),false);
  assert.equal(isSpeechTranscriptLanguageMismatch({requested:"ru",text:"Harry Potter"}),false);
  assert.equal(isSpeechTranscriptLanguageMismatch({requested:"auto",detected:null,text:"some recognized words without language metadata"}),false);
  assert.match(route,/AUDIO_STT_LANGUAGE_MISMATCH/);
  assert.match(route,/HH_AUDIO_STT_FREE_CONFIRMED/);
});
