import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {test} from "node:test";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const source=read("components/mandala-free-video-studio.tsx");
const child=read("components/mandala-video-ideas.tsx");
const audio=read("lib/mandala/local-video-music.ts");
const css=read("components/mandala-video-mobile.module.css");

test("video wizard starts Goal → Montage Style/Audio → Ideas Text/Voice → optional Hypno",()=>{
  const tabs=source.match(/const workspaceTabs=\[([\s\S]*?)\] as const;/)?.[1];
  assert.deepEqual([...tabs.matchAll(/id:"([a-z]+)"/g)].map(x=>x[1]),
    ["video","editor","phrases","effects","pro","ready"]);
  const goal=source.slice(source.indexOf("const continueToMontage = () => {"),
    source.indexOf("const openVideoScenarioStep",source.indexOf("const continueToMontage = () => {")));
  assert.match(goal,/setActiveWorkspace\("editor"\)/);
  assert.match(goal,/setMontagePanel\("effects"\)/);
  const montage=source.slice(source.indexOf("const continueMontageOrGenerate=()=>{"),
    source.indexOf("const continueToMontage = () => {"));
  assert.match(montage,/setMontagePanel\("audio"\)/);
  assert.match(montage,/goToIdeasFromMontage\(\)/);
  assert.doesNotMatch(montage,/createVideo\(|startFromHero\(|createQuickVideo\(/);
  const ideas=source.slice(source.indexOf('data-video-quick-phrases aria-label='),
    source.indexOf('data-video-effects-panel aria-label='));
  assert.match(ideas,/data-video-ideas-tabs role="group"/);
  assert.match(ideas,/onCreate=\{createQuickVideo\} hideCreateAction/);
  assert.match(child,/!hideCreateAction\?<button/);
  assert.equal((ideas.match(/data-video-ideas-final-actions/g)||[]).length,1);
  assert.match(ideas,/data-video-ideas-create[\s\S]*?onClick=\{createQuickVideo\}/);
  assert.match(ideas,/data-video-ideas-add-effects[\s\S]*?activateQuickWorkspace\("effects"\)/);
  assert.match(css,/\.ideasFinalActions\{display:grid/);
  for(const phrase of ["Создать видео","Добавить эффекты","Create video","Add effects","Crear vídeo","Añadir efectos"])
    assert.ok(ideas.includes(phrase),phrase);
});

test("Music from Montage and generated/recorded Ideas voice remain independent audio sources",()=>{
  assert.match(source,/const \[voiceBackgroundTrack,setVoiceBackgroundTrack\] = useState<AttachedAudio\|null>\(null\)/);
  assert.match(source,/const \[voiceBackgroundVolume,setVoiceBackgroundVolume\] = useState\(30\)/);
  const attach=source.slice(source.indexOf("function attachGeneratedAffirmationAudio("),
    source.indexOf("async function applyHypnoAudioEffects("));
  assert.match(attach,/setVoiceBackgroundTrack\(/);
  assert.ok(attach.indexOf("setVoiceBackgroundTrack(")<attach.indexOf("chooseAudioFile(voiceOnlyFile)"),
    "persist background before replacing the temporary upload picker");
  assert.match(attach,/const voiceOnlyFile=clip\.speechFile/);
  assert.match(attach,/new File\(\[clip\.speechFile\],clip\.file\.name/);
  assert.match(attach,/chooseAudioFile\(voiceOnlyFile\)/,
    "export isolated speech rather than voice preview WAV with another baked soundtrack");
  assert.match(attach,/setAttachedAudio\(\{kind:"file",file:entry\.file,id:entry\.url,narration:true/);
  const selector=source.slice(source.indexOf("function attachSelectedAudio()"),
    source.indexOf("function stopMicRecording()"));
  assert.match(selector,/setVoiceBackgroundTrack\(uploadedAudio\?/);
  assert.match(selector,/setAudioRights\(true\)/);
  assert.match(source,/voiceBackgroundTrack&&\(attachedAudio\.narration\|\|attachedAudio\.nonLoop\)/);
  assert.match(source,/await startVoiceOverBackgroundAudio\(/);
  assert.match(source,/gainPercent:voiceBackgroundVolume/);
  assert.match(source,/file:selected\.file,loop:true/);
  assert.match(source,/data-video-voice-background-volume/);
  assert.match(source,/bedPlayers\.forEach\(player=>void player\.play\(\)/);
  assert.match(source,/session\.fileUrls\.forEach\(url=>URL\.revokeObjectURL\(url\)\)/);
  assert.match(audio,/export async function startVoiceOverBackgroundAudio\(/);
  assert.match(audio,/decoded\.forEach\(\(buffer,index\)=>\{/);
  assert.match(audio,/node\.loop=index!==0/);
  assert.match(audio,/destination=context\.createMediaStreamDestination\(\)/);
  assert.doesNotMatch(audio.slice(audio.indexOf("export async function startVoiceOverBackgroundAudio")),
    /fetch\(\s*["']https:\/\//);
});

test("The background remains selected if voice needs regeneration",()=>{
  const invalidate=source.slice(source.indexOf("const hypnoVoiceEditor = ("),
    source.indexOf("data-video-ideas-voice-actions"));
  assert.match(invalidate,/setAttachedAudio\(voiceBackgroundTrack\)/);
  assert.match(invalidate,/setVoiceBackgroundTrack\(null\)/);
});
