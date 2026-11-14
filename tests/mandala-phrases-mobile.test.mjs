import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=file=>readFileSync(new URL("../"+file,import.meta.url),"utf8");
const phrases=read("components/mandala-hypno-compact.tsx");
const ideas=read("components/mandala-video-ideas.tsx");
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

test("approved phrases retain reusable audio but Apply transitions to Montage without auto-render",()=>{
  assert.doesNotMatch(studio,/data-video-quick-affirmation=\{index\}/);
  assert.match(studio,/data-video-quick-phrases aria-label=\{workspaceCopy\[locale\]\.phrases\.title\}/);
  assert.match(phrases,/children\?:ReactNode/);
  assert.match(phrases,/\{children\}[\s\S]*data-hypno-create-video/);
  assert.match(studio,/<MandalaHypnoCompact[\s\S]*?onCreate=\{startFromHero\}[\s\S]*?onApply=\{\(\)=>\{[\s\S]*?activeWorkspace==="phrases" \? hypnoVoiceEditor : null[\s\S]*?data-hypno-music[\s\S]*?<\/MandalaHypnoCompact>/);
  assert.match(phrases,/onClick=\{onApply\?\?onCreate\}/);
  assert.match(studioCss,/data-active-workspace="phrases"\]\s*\.phraseMusicSection/);
  assert.match(studioCss,/data-active-workspace="phrases"\]\s*\.phraseAudioSettings/);
  assert.match(studioCss,/\.studio\[data-active-workspace="phrases"\] \.quickPhraseSection\{display:block;padding:0/);
});

test("the six-voice chooser appears once below approved phrases and soundtrack cannot erase TTS",()=>{
 const section=studio.slice(studio.indexOf('data-workspace-section="phrases" data-video-quick-phrases'),studio.indexOf('data-workspace-section="effects"'));
 assert.match(section,/\{deepHypnoPane\}/,"single visible workspace mounts canonical editor");
 const definition=studio.slice(studio.indexOf("const deepHypnoPane = ("),studio.indexOf("const deepVideoPane",studio.indexOf("const deepHypnoPane = (")));
 const voiceEditor=studio.slice(studio.indexOf("const hypnoVoiceEditor = ("),studio.indexOf("const deepHypnoPane = ("));
 assert.match(voiceEditor,/data-hypno-voice/,"the one shared voice editor is real");
 assert.match(definition,/\{activeWorkspace==="phrases" \? hypnoVoiceEditor : null\}/);
 assert.ok(definition.indexOf("hypnoVoiceEditor")<definition.indexOf("data-hypno-music"));
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
 const action=studio.indexOf('data-video-stage-actions="montage"');
 const directStart=studio.indexOf("data-video-quick-generate",action);
 assert.ok(action>0&&directStart>action,"the original Create button remains in the real Montage action bar");
 const direct=studio.slice(directStart,studio.indexOf("</button>",directStart));
 assert.ok(direct.includes('onClick={createQuickVideo}'));
 for(const guard of ['if(!freeVideoSelected){','if(phrasePending){','if(narrationInvalid){'])
   assert.ok(studio.includes(guard),"approved phrase and paid-format guard: "+guard);
 assert.match(studio,/if\(phrasePending\)\{/);
 assert.match(compact,/if\(ideaPending&&!draft\)return/);
 assert.match(compact,/externalPhraseDraft!==null\?\[\]:settings\.selected/);
 assert.match(studio,/onPhraseChoose=\{phrase=>\{[\s\S]*?setCatalogPhraseDraft\(phrase\)/);
 assert.doesNotMatch(studio,/custom:phrase,visibility:\["large"\]/);
});

test("TTS never speaks an outdated script when phrases are staged",()=>{
  const studio=read("components/mandala-free-video-studio.tsx");
  const compact=read("components/mandala-hypno-compact.tsx");
  assert.match(studio,/disabled=\{recording\|\|preparing\}\s+approvalPending=\{phrasePending\}\s+initialPreferences=\{voicePreferences\}\s+onAttach=\{attachGeneratedAffirmationAudio\}/);
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


test("real WebKit voice acceptance expands the approved transcript before comparing selected speech",()=>{
  const e2e=read("scripts/verify-affirmation-voice-browser.mjs");
  const voice=read("components/mandala-affirmation-voice.tsx");
  assert.match(voice,/<details className=\{css\.transcriptDisclosure\} data-video-affirmation-transcript-review>/);
  assert.match(voice,/data-video-affirmation-spoken-text/);
  assert.match(e2e,/const transcriptDisclosure=page\.locator\("\[data-video-affirmation-transcript-review\]"\)/);
  assert.match(e2e,/await expect\(transcriptDisclosure\)\.toHaveCount\(1\)/);
  assert.match(e2e,/await expect\(transcriptDisclosure\)\.toHaveCount\(0\)/);
  assert.match(e2e,/await transcriptDisclosure\.locator\(":scope > summary"\)\.click\(\)/);
  assert.match(e2e,/await expect\(speech\)\.toBeVisible\(\)/);
  assert.match(e2e,/assert\.equal\(affirmationRequests\[0\]\.text,transcript\)/);
});

test("real WebKit voice acceptance expands advanced sound options before selecting a verified music bed",()=>{
  const browser=read("scripts/verify-affirmation-voice-browser.mjs");
  const voice=read("components/mandala-affirmation-voice.tsx");
  // WebKit can lose a native <details> toggle after React rerenders. A
  // controlled disclosure must start closed and toggle only on user action.
  assert.match(voice,/const \[voiceAdvancedOpen,setVoiceAdvancedOpen\]=useState\(false\)/);
  assert.match(voice,/<details open=\{voiceAdvancedOpen\} className=\{css\.voiceAdvanced\} data-video-affirmation-voice-advanced/);
  assert.match(voice,/summary onClick=\{event=>\{/);
  assert.match(voice,/event\.preventDefault\(\)/);
  assert.match(voice,/setVoiceAdvancedOpen\(current=>!current\)/);
  assert.doesNotMatch(voice,/node\.open\s*=/,"no competing imperative disclosure write");
  // Real WebKit touch, real state transition, reversible close and reopen,
  // selected sound bed and a decoded audio track remain strict release gates.
  assert.match(browser,/const voiceOptions=page\.locator\("\[data-video-affirmation-voice\] details"\)/);
  assert.match(browser,/if\(engine==="webkit"\)await voiceOptions\.locator\(":scope > summary"\)\.tap\(\)/);
  assert.match(browser,/else await voiceOptions\.locator\(":scope > summary"\)\.click\(\)/);
  assert.match(browser,/await expect\(voiceOptions\)\.toHaveAttribute\("open","",\{timeout:15000\}\)/);
  assert.match(browser,/await expect\(voiceOptions\)\.not\.toHaveAttribute\("open",""\)/);
  assert.match(browser,/await expect\(page\.locator\("\[data-video-affirmation-bed\]"\)\)\.toBeVisible\(\{timeout:15000\}\)/);
  assert.match(browser,/await page\.locator\("\[data-video-affirmation-bed\]"\)\.selectOption\("ocean"\)/);
  assert.match(browser,/const audioTrack=streams\.find\(row=>row\.codec_type==="audio"\)/);
  assert.match(browser,/assert\.ok\(audioTrack/);
});

test("Safari fine-tuning uses one accessible button and a stable hidden region",()=>{
  const browser=read("scripts/verify-affirmation-voice-browser.mjs");
  const css=read("components/mandala-hypno-compact.module.css");
  for(const part of [
    "const ideaControlsId=useId();",
    "<div className={css.ideaDisclosure} data-hypno-idea-details>",
    "data-hypno-idea-toggle",
    "aria-expanded={ideaDisclosureOpen} aria-controls={ideaControlsId}",
    "onClick={()=>setIdeaDisclosureOpen(value=>!value)}",
    "id={ideaControlsId} hidden={!ideaDisclosureOpen}",
  ])assert.ok(phrases.includes(part),part);
  assert.ok(!phrases.includes("<details className={css.ideaDisclosure}"));
  assert.ok(css.includes(".overview .ideaDisclosure>.card[hidden]{display:none!important}"));
  assert.ok(browser.includes("await expect(intentDetails).toBeHidden()"),
    "personal-intent editor is kept in the Personalization tab, outside voice-only mode");
  assert.ok(browser.includes("await expect(phrases.locator('[data-video-ideas-personalization-panel]')).toBeVisible()"));
});

test("choosing Ready preserves private audio state while the current Ideas editor owns phrase selection",()=>{
 const browser=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.ok(ideas.includes("data-video-idea-select"));
 assert.ok(browser.includes("data-video-affirmation-phrase"));
 assert.ok(browser.includes("data-video-affirmation-transcript-review"));
 assert.ok(browser.includes("data-video-narration-reapproval"),"removed spoken phrases require explicit narration reapproval");
 assert.ok(browser.includes("the old WAV may remain attached, but must be unusable until narration is regenerated"),"stale audio stays attached only as unusable media");
 assert.ok(browser.includes("await expect(page.locator('[data-video-quick-generate]')).toBeDisabled"));
 assert.doesNotMatch(browser,/approvalButton\.tap\(\)/,
   "the retired standalone Hypno approval button must not reappear");
});

test("ten-phrase limit and stale spoken-audio guard use the current visible Montage Text editor",()=>{
 const script=read("scripts/verify-affirmation-voice-browser.mjs");
 assert.ok(ideas.includes("else if(chosen.length>=10){"),"ten-phrase cap stays explicit");
  assert.ok(ideas.includes("apply(options,[...chosen.slice(0,-1),index])"),"choosing at the cap replaces the last selected phrase");
  assert.ok(ideas.includes("setFeedback(t.savedReplaced)"),"the replacement is communicated to the visitor");
 assert.ok(ideas.includes("Choose up to 10 phrases for your video."));
 assert.ok(ideas.includes("The maximum remains ten"));
 assert.match(script,/const unselectedToggle=phraseEditor\.locator\('\[data-video-idea-select\]\[aria-pressed="false"\]'\)\.first\(\)/);
 assert.ok(script.includes("const spokenToggle=spokenPhrase.locator('[data-video-idea-select]')"));
 assert.ok(script.includes("adding an unspoken phrase does not invalidate the actual WAV"));
 assert.ok(script.includes("data-video-narration-reapproval"));
 assert.ok(script.includes("the old WAV may remain attached, but must be unusable until narration is regenerated"));
 assert.ok(script.includes("await expect(page.locator('[data-video-quick-generate]')).toBeDisabled"));
});
