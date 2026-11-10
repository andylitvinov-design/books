import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
const source=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-mobile.module.css",import.meta.url),"utf8");

test("Audio Music reuses one owner-approved compact picker and the canonical audio state",()=>{
  const start=source.indexOf("const soundtrackWorkspacePanel = (");
  const end=source.indexOf("const supplementaryCloudVoicePanel",start);
  const pane=source.slice(start,end);
  assert.ok(start>0&&end>start,"one canonical music picker definition");
  for(const marker of ["data-video-montage-audio","data-video-audio-mode=\"library\"",
    "data-video-audio-mode=\"upload\"","data-video-audio-compact-selected",
    "data-video-audio-compact-volume","data-video-audio-compact-attach",
    "data-video-audio-library","data-video-audio-library-rights","{deepAudioPane}"])
    assert.ok(pane.includes(marker),marker);
  for(const marker of ["onClick={toggleSoundPreview}","onClick={attachSelectedAudio}",
    "chooseAudioFile(event.currentTarget.files?.[0])"])
    assert.ok(pane.includes(marker),marker);
  assert.ok(source.includes("data-video-audio-library-rights"));
  assert.doesNotMatch(pane,/data-video-basic-duration|data-video-basic-format|data-video-basic-tab/);
  assert.equal((source.match(/const soundtrackWorkspacePanel = \(/g)||[]).length,1);
  assert.equal((source.match(/\{soundtrackWorkspacePanel\}/g)||[]).length,1);
  assert.equal((source.match(/\{deepAudioPane\}/g)||[]).length,1);
  assert.equal((source.match(/<audio\b/g)||[]).length,1);
});

test("Montage keeps its four production tabs and routes its audio shortcut to Audio",()=>{
  const railStart=source.indexOf('<nav className={videoStyles.montageQuickTools}');
  const rail=source.slice(railStart,source.indexOf("</nav>",railStart));
  for(const id of ["effects","text","visual","settings"])assert.ok(rail.includes('id:"'+id+'"'),id);
  assert.doesNotMatch(rail,/id:"audio"/);
  assert.match(source,/data-video-montage-open-audio/);
  assert.match(source,/onClick=\{\(\)=>\{setActiveWorkspace\("effects"\);setAudioWorkspaceTab\("music"\)/);
  assert.doesNotMatch(source,/montagePanel==="audio" \? <div/);
  assert.ok(source.includes('data-video-audio-panel="music"'));
});

test("Audio Voice reuses the single consented local voice editor and optional cloud disclosure",()=>{
  const voiceStart=source.indexOf("const hypnoVoiceEditor = (");
  const voiceEnd=source.indexOf("const deepHypnoPane = (",voiceStart);
  const voice=source.slice(voiceStart,voiceEnd);
  const cloudStart=source.indexOf("const supplementaryCloudVoicePanel = (");
  const cloudEnd=source.indexOf("// One idempotent action",cloudStart);
  const cloud=source.slice(cloudStart,cloudEnd);
  assert.ok(voiceStart>0&&voiceEnd>voiceStart);
  assert.match(voice,/data-hypno-voice/);
  assert.equal((source.match(/<MandalaAffirmationVoice locale/g)||[]).length,1);
  assert.match(source,/data-video-audio-panel="voice"/);
  assert.match(source,/audioWorkspaceTab==="voice" \? hypnoVoiceEditor : null/);
  assert.match(cloud,/data-video-voice-studio/);
  assert.match(cloud,/voiceStudioActivated\?<MandalaCloudVoiceStudio locale=\{locale\}/);
  assert.match(source,/\{supplementaryCloudVoicePanel\}/);
  assert.match(source,/onToggle=\{event=>setVoiceStudioActivated\(event.currentTarget.open\)\}/);
  assert.match(css,/\.audioWorkspaceTabs\{display:grid;grid-template-columns:repeat\(4,minmax\(0,1fr\)\)/);
});
