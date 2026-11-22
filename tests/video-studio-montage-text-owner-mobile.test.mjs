import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const ideas=readFileSync(new URL("../components/mandala-video-ideas.tsx",import.meta.url),"utf8");
const css=readFileSync(new URL("../components/mandala-video-ideas.module.css",import.meta.url),"utf8");
const textCss=readFileSync(new URL("../components/mandala-montage-text-owner.module.css",import.meta.url),"utf8");

test("the approved Text design reuses the original live editor, not a clone",()=>{
 assert.equal((studio.match(/data-video-montage-text hidden=/g)||[]).length,1);
 assert.equal((studio.match(/data-video-text-hero/g)||[]).length,1);
 assert.equal((studio.match(/data-video-text-progress\s/g)||[]).length,1);
 assert.match(studio,/import textRef from "\.\/mandala-montage-text-owner\.module\.css"/);
 assert.match(studio,/creationPriceCredits={creditCatalog\?\.ready&&creditCatalog\.chargeRequired\?creditCatalog\.priceCredits:null}/);
 assert.match(studio,/onChange={setAffirmations}/);
 assert.match(studio,/onPendingChange={setPhrasePending}/);
 assert.match(studio,/onGenerate={openReadyForGeneration}/);
 assert.match(studio,/setMontagePanel\("concept"\)/);
});

test("support, celebration, motivation, love, calm and custom tabs are actual actions",()=>{
 assert.match(ideas,/categoryIds:PhraseCategory\[\]=\["support","congratulations","motivation","love","peace","custom"\]/);
 assert.match(ideas,/categoryPhrases:Record<Exclude<PhraseCategory,"custom">,Record<VideoLocale,string\[\]>>/);
 assert.match(ideas,/data-video-text-category={id}/);
 assert.match(ideas,/onClick={\(\)=>selectPhraseCategory\(id\)}/);
 assert.match(ideas,/categoryDrafts\.current\.set/);
 assert.match(ideas,/categoryPhrases\[next\]\[captionLocale\]/);
 assert.match(ideas,/languageChoices:VideoLocale\[\]=\["en","ru","es"\]/);
 assert.match(ideas,/curated\[next\]\[index\]/);
 assert.match(ideas,/translateVideoGoalPhrase\(line,captionLocale,next\)/);
});

test("existing preview, edit, recorder and guarded create remain independently reachable",()=>{
 assert.match(ideas,/data-video-ideas-preview/);
 assert.match(ideas,/onClick={onPreview}/);
 assert.match(ideas,/data-video-ideas-record/);
 assert.match(ideas,/onClick={onRecord}/);
 assert.match(ideas,/data-video-idea-edit-button={index}/);
 assert.match(ideas,/data-video-ideas-own-phrase/);
 assert.match(ideas,/data-video-ideas-create/);
 assert.match(ideas,/data-video-ideas-generate/);
 assert.match(ideas,/disabled={disabled\|\|selectedCount<5}/);
 assert.match(ideas,/Continue without charging XP/);
 assert.doesNotMatch(ideas,/onClick={\(\)=>\s*postVideoCreditAction/);
});

test("mobile Text rows have readable 44px targets, natural scrolling and warm independent layout",()=>{
 assert.match(css,/\.categoryRail\{/);
 assert.ok(css.includes("max-height:none!important;overflow:visible!important"));
 assert.ok(css.includes("min-width:44px;height:44px"));
 assert.ok(css.includes("@media(max-width:359px)"));
 assert.match(textCss,/\.textPane\[hidden\]\{display:none!important\}/);
 assert.match(textCss,/\.heroCopy h2/);
 assert.ok(textCss.includes("@media(max-width:355px)"));
});
