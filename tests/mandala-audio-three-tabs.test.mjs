import assert from "node:assert/strict";
import test from "node:test";
import {readFileSync} from "node:fs";

const read=file=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
const studio=read("components/mandala-free-video-studio.tsx");
const css=read("components/mandala-video-mobile.module.css");
const ready=read("components/mandala-video-ready.tsx");
const meditation=read("components/mandala-personal-meditation.tsx");
const voice=read("components/mandala-cloud-voice-studio.tsx");

test("Audio replaces Hypno in six-tab EN/RU/ES navigation",()=>{
  for(const [language,label] of [["en","Audio"],["ru","Аудио"],["es","Audio"]])
    assert.match(studio,new RegExp("effects:\{tab:\""+label+"\""),language);
  assert.match(studio,/\{id:"editor",Icon:Scissors\},\{id:"effects",Icon:Music2\}/);
  assert.match(studio,/data-video-quick-control=\{item.id\}/);
  assert.doesNotMatch(studio,/effects:"Hypno"\b|effects:"Гипно"\b/);
  assert.equal((studio.match(/data-video-quick-control=\{item.id\}/g)||[]).length,1);
});

test("three accessible in-place Audio tabs keep warm 320-430px mobile layout",()=>{
  for(const name of ["music","voice","meditations"]){
    assert.match(studio,new RegExp("id:\""+name+"\""),name);
    assert.match(studio,new RegExp('data-video-audio-panel=\"'+name+'\"'),name);
  }
  assert.match(studio,/role="tablist"/);
  assert.match(studio,/role="tabpanel"/);
  assert.match(studio,/aria-selected=\{audioWorkspaceTab===tab.id\}/);
  assert.match(studio,/hidden=\{audioWorkspaceTab!=="music"\}/);
  assert.match(studio,/hidden=\{audioWorkspaceTab!=="voice"\}/);
  assert.match(studio,/hidden=\{audioWorkspaceTab!=="meditations"\}/);
  assert.match(css,/\.audioWorkspaceTabs\{display:grid;grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.audioWorkspacePanel\[hidden\]\{display:none!important\}/);
  assert.match(css,/@media\(max-width:359px\)\{\.audioWorkspace/);
  assert.match(css,/\.audioWorkspaceTabs button\{[^}]*min-height:49px/);
});

test("one existing music picker is moved from Montage, preserving original attach and sound preview",()=>{
  assert.equal((studio.match(/data-video-audio-compact-selected/g)||[]).length,1);
  assert.equal((studio.match(/data-video-audio-library-overlay/g)||[]).length,1);
  assert.equal((studio.match(/\{deepAudioPane\}/g)||[]).length,1);
  assert.equal((studio.match(/<audio\b/g)||[]).length,1);
  const picker=studio.slice(studio.indexOf("const soundtrackWorkspacePanel = ("),studio.indexOf("const supplementaryCloudVoicePanel",studio.indexOf("const soundtrackWorkspacePanel = (")));
  for(const marker of ["data-video-audio-compact-upload","data-video-audio-library-track","data-video-audio-compact-play","data-video-audio-compact-volume","data-video-audio-compact-attach","data-video-audio-library-rights","data-video-audio-bed-panel"])
    assert.ok(picker.includes(marker),marker);
  assert.match(picker,/onClick=\{toggleSoundPreview\}/);
  assert.match(picker,/onClick=\{attachSelectedAudio\}/);
  assert.match(studio,/\{soundtrackWorkspacePanel\}/);
  assert.doesNotMatch(studio,/montagePanel==="audio" \? <div/);
  assert.doesNotMatch(studio,/\{id:"audio",Icon:Music2\}/);
});

test("Ideas has only Personalization and Concept; Audio owns Voice and My Voice",()=>{
  const local=read("components/mandala-local-voice-tracks.tsx");
  assert.match(studio,/data-video-ideas-tab="personalization"/);
  assert.match(studio,/data-video-ideas-tab="concept"/);
  assert.equal((studio.match(/data-video-ideas-tab="/g)||[]).length,2,
    "Ideas exposes only its two approved destinations");
  assert.doesNotMatch(studio,/data-video-legacy-phrase-editor|data-video-ideas-voice-mode|data-video-phrase-audio-shortcut/);
  assert.doesNotMatch(studio,/setIdeasSubtab\("(?:text|voice|my-voice)"\)/);
  assert.match(studio,/data-video-audio-voice-modes/);
  assert.match(studio,/data-video-audio-voice-mode="voice"/);
  assert.match(studio,/data-video-audio-voice-mode="my-voice"/);
  assert.match(studio,/audioWorkspaceTab==="voice" \? hypnoVoiceEditor : null/);
  assert.match(studio,/ownVoiceOnly=\{ideasVoiceMode==="my-voice"\}/);
  assert.match(studio,/setActiveWorkspace\("effects"\);\s*setAudioWorkspaceTab\("voice"\);\s*setVoiceStudioActivated\(true\)/);
  assert.match(studio,/data-video-audio-own-upload/);
  assert.match(studio,/data-video-own-voice-record/);
  assert.doesNotMatch(studio,/data-video-ideas-own-upload|data-video-ideas-record-voice/);
  assert.match(local,/data-video-own-voice-record/);
  assert.equal((studio.match(/<MandalaAffirmationVoice locale=/g)||[]).length,1);
  assert.match(studio,/\{supplementaryCloudVoicePanel\}/);
  assert.match(studio,/voiceEditor=\{null\}/);
});

test("Ready offers remain and its advanced meditation opens the single Audio editor",()=>{
  for(const marker of ["data-ready-meditation","data-ready-ritual","data-ready-journey","data-ready-offer-panel"])assert.ok(ready.includes(marker),marker);
  assert.match(ready,/onClick=\{onOpenMeditation\}/);
  assert.match(studio,/onOpenMeditation=\{\(\)=>\{setActiveWorkspace\("effects"\);setAudioWorkspaceTab\("meditations"\);\}\}/);
  assert.equal((studio.match(/<MandalaPersonalMeditation\b/g)||[]).length,1);
  const audio=studio.slice(studio.indexOf('data-video-audio-panel="meditations"'),studio.indexOf("data-video-audio-additional-effects"));
  assert.match(audio,/<MandalaPersonalMeditation/);
  assert.match(meditation,/data-meditation-generate/);
  assert.match(meditation,/data-meditation-script/);
  assert.match(meditation,/data-meditation-listen/);
  assert.match(meditation,/<MandalaCloudVoiceStudio locale=\{locale\} sourceText=\{script\}/);
  assert.match(audio,/onNarrationReady=\{attachMeditationNarration\}/);
});

test("Montage keeps its production controls and exactly one shared timeline",()=>{
  assert.equal((studio.match(/<MandalaMultiTrackTimeline\b/g)||[]).length,1);
  assert.equal((studio.match(/\{activeWorkspace==="editor" \? sharedMontageTimeline : null\}/g)||[]).length,1);
  assert.match(studio,/onOpenAudio=\{\(\)=>\{\s*setActiveWorkspace\("effects"\);setAudioWorkspaceTab\("music"\)/);
  for(const tab of ["effects","text","visual","settings"])assert.ok(studio.includes('id:"'+tab+'"'),tab);
  assert.equal((studio.match(/\{soundtrackWorkspacePanel\}/g)||[]).length,1);
  assert.equal((studio.match(/\{deepAudioPane\}/g)||[]).length,1);
});

test("cloud TTS is optional with explicit consent; never fake an account charge",()=>{
  const audio=studio.slice(studio.indexOf('data-video-audio-panel="meditations"'),studio.indexOf("data-video-audio-additional-effects"));
  assert.match(audio,/Списание средств пока отключено до подтверждения тарифа/);
  assert.doesNotMatch(audio,/(?:debitWallet|chargeAccount|spendCredits)\(/);
  assert.match(voice,/if\(mode==="custom"&&!consent\)/);
  assert.match(voice,/fetch\("\/api\/holistic-support\/voice"/);
  assert.match(studio,/if\(uploadedAudio && !audioRights\)|if\(uploadedAudio&&!audioRights\)/);
});

test("existing visual effects survive only as opt-in advanced section",()=>{
  assert.match(studio,/data-video-audio-additional-effects/);
  assert.match(studio,/id="video-hypnocorrection-mobile" data-video-hypnocorrection-panel/);
  assert.match(studio,/<MandalaHypnocorrectionMobile locale=\{locale\}/);
  assert.match(studio,/onWavePreset=\{\(\)=>\{/);
  assert.match(studio,/paintHypnoLightOverlay\(ctx,/);
});

test("legacy Goal and personal-meditation links route into the canonical Audio workspace",()=>{
  assert.match(studio,/data-video-quick-open-audio onClick=\{\(\)=>\{[\s\S]*?setActiveWorkspace\("effects"\);setAudioWorkspaceTab\("music"\)/);
  assert.match(studio,/"personal-meditation":"effects"/);
  assert.match(studio,/if\(hash==="personal-meditation"\)\{setActiveWorkspace\("effects"\);setAudioWorkspaceTab\("meditations"\);\}/);
});
