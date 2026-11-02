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
});

test("single approved phrases workspace with voice/music before the final Create action",()=>{
  assert.doesNotMatch(studio,/data-video-quick-affirmation=\{index\}/);
  assert.match(studio,/data-video-quick-phrases aria-label=\{workspaceCopy\[locale\]\.phrases\.title\}/);
  assert.match(phrases,/children\?:ReactNode/);
  assert.match(phrases,/\{children\}[\s\S]*data-hypno-create-video/);
  assert.match(studio,/<MandalaHypnoCompact[\s\S]*?onCreate=\{startFromHero\}>[\s\S]*?data-hypno-voice[\s\S]*?data-hypno-music[\s\S]*?<\/MandalaHypnoCompact>/);
  assert.match(studioCss,/\.studio\[data-active-workspace="phrases"\] \.quickPhraseSection\{display:block;padding:0/);
});

test("the six-voice chooser appears once below approved phrases and soundtrack cannot erase TTS",()=>{
 const section=studio.slice(studio.indexOf('data-workspace-section="phrases" data-video-quick-phrases'),studio.indexOf('data-workspace-section="effects"'));
 assert.match(section,/\{deepHypnoPane\}/,"single visible workspace mounts canonical editor");
 const definition=studio.slice(studio.indexOf("const deepHypnoPane = ("),studio.indexOf("const deepVideoPane",studio.indexOf("const deepHypnoPane = (")));
 assert.match(definition,/data-hypno-voice[\s\S]*data-hypno-music/,"voice and music are inside shared editor in the right order");
 assert.equal((studio.match(/<MandalaAffirmationVoice locale/g)||[]).length,1);
 assert.ok(studio.indexOf('data-hypno-voice')<studio.indexOf('<MandalaAffirmationVoice locale='));
 assert.doesNotMatch(studio,/AI voice presets are not yet export-ready/);
 assert.match(studio,/if\(activeWorkspace!=="phrases"\)\{setActiveWorkspace\("editor"\);setBasicPanelTab\("music"\);\}/,
   "music preview returns to the shared real audio editor without replacing approved TTS");
 assert.match(studio,/if\(attachedAudio\?\.kind==="file"&&attachedAudio\.narration\)\{/);
 assert.ok(phrases.indexOf('data-hypno-phrases')<phrases.indexOf('{children}'));
 assert.match(phrases,/setReadyDraft\(\{selected,resetPreset:readyDraft\?\.resetPreset\?\?false\}\)/);
 assert.match(phrases,/setCustomDraft\(custom\)/);
 assert.match(phrases,/else if\(readyDraft\|\|customDraft!==null\|\|externalPhraseDraft!==null\)/);
});

test("all phrase changes including catalog and idea are staged until explicit Approve; Create fails closed",()=>{
 const studio=read("components/mandala-free-video-studio.tsx");
 const compact=read("components/mandala-hypno-compact.tsx");
 for(const marker of ["ideaPending","hasPendingEdits","setCatalogPhraseDraft(phrase)","onPendingChange={setPhrasePending}","externalPhraseDraft={catalogPhraseDraft}"])
   assert.ok((compact+studio).includes(marker),marker);
 assert.doesNotMatch(compact,/<MandalaVideoAffirmations /);
 assert.match(compact,/onPendingChange\?\.\(hasPendingEdits\)/);
 assert.match(compact,/data-hypno-create-video disabled=\{disabled\|\|!settings\.enabled\|\|hasPendingEdits\}/);
 assert.match(studio,/disabled=\{recording\|\|preparing\|\|!freeVideoSelected\|\|\(usingFreeFilmCompilation&&!freeFilmSourcesListed\)\|\|voiceGenerating\|\|narrationInvalid\|\|phrasePending\}/);
 assert.match(studio,/if\(phrasePending\)\{/);
 assert.match(compact,/if\(ideaPending&&!draft\)return/);
 assert.match(compact,/externalPhraseDraft!==null\?\[\]:settings\.selected/);
 assert.match(studio,/onPhraseChoose=\{phrase=>\{[\s\S]*?setCatalogPhraseDraft\(phrase\)/);
 assert.doesNotMatch(studio,/custom:phrase,visibility:\["large"\]/);
});

test("TTS never speaks an outdated script when phrases are staged",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const compact=read("components/mandala-hypno-compact.tsx");
  assert.ok(studio.includes("disabled={recording||preparing} approvalPending={phrasePending} onAttach={attachGeneratedAffirmationAudio}"));
  // An unapproved draft blocks narration generation, not public voice comparisons.
  const voice=read("components/mandala-affirmation-voice.tsx");
  assert.ok(voice.includes("disabled={!languageAvailable||!speechText||!consent||busy||mixing||disabled||approvalPending}"));
  assert.ok(voice.includes("if(!languageAvailable||disabled||approvalPending||busy"));
  assert.ok(voice.includes("data-video-affirmation-voice-preview={v.id}"));
  assert.match(studio,/data-video-voice-approval-required/);
  assert.match(compact,/const customPhraseText=externalPhraseDraft\?\?customDraft\?\?settings\.custom/);
  assert.match(compact,/setCustomDraft\(custom\);onExternalPhraseClear\?\.\(\)/);
});

test("mobile filters keep readable short localized chip copy at narrow iPhone width",()=>{
 assert.match(phrases,/const smallFilterLabels=/);
 assert.match(phrases,/className=\{css\.mobileText\}/);
 assert.match(style,/\.overview \.filterRow\{display:grid;grid-template-columns:minmax\(0,1fr\);gap:7px\}/);
 assert.match(style,/\.overview \.ideaGender\{display:grid;grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(phrases,/data-video-affirmation-preview disabled=\{disabled\|\|hasPendingEdits\}/);
 assert.doesNotMatch(phrases,/setOpen\("phrases"\)/);
});


test("Wave interprets explicit custom idea as local goal without sending it to Gemini",()=>{
 const source=read("components/mandala-hypno-compact.tsx");
 assert.match(source,/const goalNote=ownIdea\.trim\(\)\.slice\(0,160\)/);
 assert.match(source,/const requestKey=JSON\.stringify\(\[waveInput,problemNote,goalNote\]\)/);
 assert.match(source,/currentText:problemNote,goalText:goalNote/);
 assert.doesNotMatch(source,/const goalNote=""/);
 assert.match(source,/body:JSON\.stringify\(\{\.\.\.waveInput,externalModelOptIn:true\}\)/);
});


test("Wave theme switch and explicit crisis cannot bypass approved video phrases",()=>{
 const src=read("components/mandala-hypno-compact.tsx");
 const change=src.slice(src.indexOf("const changeTheme=("),src.indexOf("function switchModel("));
 assert.match(change,/setDraftState\(nextDraft\)/);
 assert.match(change,/createWaveDraft\(nextRound,next,nextProblem,nextGoal\)/);
 assert.doesNotMatch(change,/onChange\(/,"theme switch cannot replace prior video wording");
 assert.match(src,/const safetyBlocked=interpretWaveNotes\(\{locale,currentText:problemNote,goalText:goalNote\}\)\.status==="safety_handoff"/);
 assert.match(src,/hasPendingEdits=Boolean\([^;]*\|\|safetyBlocked\)/);
 assert.match(src,/function approvePhrases\(\)\{\s*if\(safetyBlocked\)return/);
 assert.match(src,/if\(disabled\|\|!geminiConsent\|\|safetyBlocked\)return/);
 assert.doesNotMatch(src,/else if\(geminiConsent\)void generateGemini\(\)/);
});

test("Wave retains the chosen idea when a filtered five-phrase list needs fallback entries",()=>{
 const local=phrases.slice(phrases.indexOf("function createWaveDraft("),phrases.indexOf("function filtered("));
 assert.match(local,/const completed=\[\.\.\.phrases,\.\.\.fallbackPhrases\.filter\(line=>!phrases\.includes\(line\)\)\]\.slice\(0,5\)/);
 assert.match(local,/phrases:completed\.length===5\?completed:fallbackPhrases/);
 assert.match(phrases,/data-hypno-own-phrase aria-label=\{extra\.add\}/);
});
