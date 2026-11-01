import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=file=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
const phrases=read("components/mandala-hypno-compact.tsx");
const style=read("components/mandala-hypno-compact.module.css");
const studio=read("components/mandala-free-video-studio.tsx");
const studioCss=read("components/mandala-video-mobile.module.css");

test("one video editor and first section is an idea, not duplicate request or development vector",()=>{
  assert.match(phrases, /data-hypno-idea/);
  assert.ok(phrases.indexOf("data-hypno-idea")<phrases.indexOf("data-hypno-phrases"));
  assert.doesNotMatch(phrases, /Вектор развития|Откуда идём|Куда идём/);
  assert.match(phrases, /data-hypno-idea-choice=\{index\}/);
  assert.match(phrases, /data-hypno-idea-own/);
  assert.match(phrases, /data-hypno-suggest-tests/);
  assert.match(phrases, /\/personality-profiles/);
  assert.match(phrases, /data-hypno-apply-request/);
  assert.match(phrases, /chosenIdea,\.\.\.result\.phrases,\.\.\.fallbackPhrases/);
  assert.equal((studio.match(/id="video-hero"/g)||[]).length,1);
  assert.equal((studio.match(/<MandalaHypnoCompact/g)||[]).length,1);
});

test("four actually selectable phrase filters precede five text-only full-width recommendations",()=>{
  for(const marker of ["data-hypno-filter-type","data-hypno-filter-tone","data-hypno-filter-focus","data-hypno-filter-length"])
    assert.match(phrases,new RegExp(marker));
  assert.ok(phrases.indexOf("data-hypno-phrase-filters")<phrases.indexOf("className={css.phraseMiniList}"));
  assert.match(phrases,/candidates\.map\(\(sentence,i\)=>/);
  assert.match(phrases,/setKind\(id\);filtered/);
  assert.match(phrases,/setTone\(id\);filtered/);
  assert.match(phrases,/setFocus\(id\);filtered/);
  assert.match(phrases,/setLength\(id\);filtered/);
  assert.match(phrases,/data-hypno-approve/);
  assert.match(phrases,/data-hypno-own-phrase/);
  assert.match(style,/\.overview \.phraseMiniList\{display:grid;grid-template-columns:minmax\(0,1fr\)/);
  assert.match(style,/\.overview \.phraseMiniList button\{display:flex;align-items:center;gap:12px/);
  assert.match(style,/\.filterRow\{display:grid;grid-template-columns:/);
  assert.match(style,/@media\(max-width:370px\)/);
});

test("voice and music are consecutive, reuse canonical sound attach/play functions",()=>{
  assert.ok(studio.indexOf("data-hypno-voice")<studio.indexOf("data-hypno-music"));
  assert.match(studio,/data-phrase-music-attach=\{id\}/);
  assert.match(studio,/onClick=\{\(\)=>toggleQuickMusic\(id\)\}/);
  assert.match(studio,/data-phrase-music-play=\{id\}/);
  assert.match(studio,/onClick=\{\(\)=>playQuickTrack\(id\)\}/);
  assert.match(studio,/activeWorkspace==="phrases" \? deepAudioPane : null/);
  assert.match(studio,/activeWorkspace==="video" \? deepAudioPane : null/);
  assert.equal((studio.match(/id="video-audio"/g)||[]).length,1);
  assert.equal((studio.match(/const deepAudioPane =/g)||[]).length,1);
  assert.match(studioCss,/\.phraseVoiceSection,\.phraseMusicSection/);
  assert.match(studioCss,/\.phraseMusicList\{display:grid;gap:9px/);
  assert.doesNotMatch(studio,/AI voice presets are not yet export-ready/);
  assert.equal((studio.match(/<MandalaAffirmationVoice locale/g)||[]).length,1);
  assert.match(studio,/attachedAudio\?\.kind==="file"&&attachedAudio\.narration===true/);
});

test("single approved phrases workspace with voice/music before the final Create action",()=>{
  assert.doesNotMatch(studio,/data-video-quick-affirmation=\{index\}/);
  assert.match(studio,/data-video-quick-phrases aria-label=\{workspaceCopy\[locale\]\.phrases\.title\}/);
  assert.match(phrases,/children\?:ReactNode/);
  assert.match(phrases,/\{children\}[\s\S]*data-hypno-create-video/);
  assert.match(studio,/<MandalaHypnoCompact[\s\S]*?onCreate=\{startFromHero\}>[\s\S]*?data-hypno-voice[\s\S]*?data-hypno-music[\s\S]*?<\/MandalaHypnoCompact>/);
  assert.match(studio.slice(studio.indexOf("data-hypno-voice"),studio.indexOf("data-hypno-music")),/<MandalaAffirmationVoice locale=\{locale\}/);
  assert.match(studioCss,/\.studio\[data-active-workspace="phrases"\] \.quickPhraseSection\{display:block;padding:0/);
});

test("ready, selected and custom changes are drafts until approval",()=>{
 const ready=phrases.split("  const ready=()=>{")[1]?.split("  const changeTheme=")[0]||"";
 const choice=phrases.split("  function toggleSelected(i:number){")[1]?.split("  const toggle=")[0]||"";
 const own=phrases.split("  function addCustom(){")[1]?.split("  function toggleSelected")[0]||"";
 const approve=phrases.split("  function approvePhrases(){")[1]?.split("  const selectedScene=")[0]||"";
 assert.match(ready,/setDraftState\(\{model:"wave"/);
 for(const part of [ready,choice,own])assert.doesNotMatch(part,/\bonChange\(/);
 assert.match(choice,/setDraftState\(\{model:"wave"/);
 assert.match(own,/setStagedCustom\(custom\)/);
 assert.match(approve,/onChange\(next\)/);
 assert.match(phrases,/data-hypno-pending-approval/);
 assert.match(phrases,/data-hypno-create-video disabled=\{disabled\|\|!settings\.enabled\|\|hasPendingChanges\}/);
 assert.doesNotMatch(phrases,/MandalaVideoAffirmations locale=\{locale\}/);
});

test("prepared phrase catalog stages selection through the one approval gate",()=>{
  assert.match(studio,/<MandalaPhraseCatalog/);
  assert.match(studio,/onPhraseChoose=\{stageCatalogPhrase\}/);
  assert.match(studio,/\{\(stageCatalogPhrase:\(text:string\)=>void\)=><>/);
  assert.match(phrases,/setStagedCustom\(cleaned\);setStagedSelection\(\[\]\)/);
  assert.match(phrases,/typeof children==="function"\?children\(stageCatalogPhrase\):children/);
  assert.doesNotMatch(studio,/onPhraseChoose=\{phrase=>\{\s*setAffirmations/);
});
