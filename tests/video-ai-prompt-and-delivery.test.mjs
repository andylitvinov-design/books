import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {compileVideoVisualPrompt} from "../lib/mandala/video-ai-prompt.mjs";
const root=new URL("../",import.meta.url);
const file=path=>readFileSync(new URL(path,root),"utf8");

test("visual filters generate distinct HeyGen-ready prompts without a remote call",()=>{
 const a=compileVideoVisualPrompt({theme:"energy",scene:"lotus",color:"gold",
   motion:"calm",visualDescription:"Golden lotus above peaceful water"});
 const b=compileVideoVisualPrompt({theme:"goals",scene:"temple",color:"violet",
   motion:"dynamic",visualDescription:""};
 assert.match(a,/lotus above peaceful water/i);
 assert.match(a,/stable camera/);
 assert.match(a,/warm amber/);
 assert.match(b,/architectural portal/);
 assert.match(b,/violet/);
 assert.notEqual(a,b);
 assert.ok(a.length>=120&&a.length<=800);
});
test("clinical data and identifiers do not sneak into the filter compiler",()=>{
 const description="Пациент с диагнозом/ medical record personal@sample.org";
 const output=compileVideoVisualPrompt({theme:"health",scene:"nature",
   visualDescription:description});
 assert.ok(!output.includes(description));
 assert.ok(!output.includes("personal@"));
 assert.ok(!output.includes("Пациент"));
 assert.throws(()=>compileVideoVisualPrompt({theme:"unknown"}),/invalid_visual_brief/);
});
test("HeyGen prompt is visible and copyable even when the paid pipeline is paused",()=>{
 const code=file("components/mandala-video-code-redeem.tsx");
 const studio=file("components/mandala-free-video-studio.tsx");
 const ui=file("components/mandala-free-video-generator.tsx");
 assert.match(code,/data-video-ai-copy/);
 assert.match(code,/data-video-ai-compile/);
 assert.match(code,/suggestedPrompt:string/);
 assert.match(code,/fieldset disabled=\{checking\}/);
 assert.match(code,/!ready\|\|!accountId/);
 assert.match(studio,/compileVideoVisualPrompt/);
 assert.match(studio,/suggestedPrompt=\{suggestedAiPrompt\}/);
 assert.match(studio,/onVisualDescriptionChange=\{setVisualDescription\}/);
 assert.match(ui,/onVisualDescriptionChange\?:/);
});
test("paid generation stays behind two independent gates and read paths are owner-scoped",()=>{
 const api=file("lib/mandala/video-ai-heygen.mjs");
 const status=file("app/api/app/videos/generate/route.js");
 const content=file("app/api/app/videos/generate/content/route.js");
 const archive=file("app/api/app/videos/generate/archive/route.js");
 const storage=file("lib/mandala/video-ai-archive.js");
 const page=file("app/[locale]/app/videos/page.tsx");
 const client=file("components/mandala-my-ai-videos.tsx");
 assert.match(api,/HH_VIDEO_PAID_ENABLED/);
 assert.match(api,/HH_VIDEO_HEYGEN_RELEASE_APPROVED/);
 assert.match(api,/safeAssetUrl/);
 assert.match(api,/Idempotency-Key/);
 assert.match(api,/\.heygen\\\.ai/);
 assert.match(status,/listVideoAiJobs/);
 assert.match(status,/claimVideoCode/);
 assert.match(content,/signedPrivateVideoAsset/);
 assert.match(archive,/consentStore!==true/);
 assert.match(archive,/privateVideoArchiveEnabled/);
 assert.match(storage,/HH_VIDEO_PRIVATE_ARCHIVE_ENABLED/);
 assert.match(storage,/MAX_BYTES=12_000_000/);
 assert.match(storage,/checkPrivateMediaStorage/);
 assert.match(client,/<video controls playsInline/);
 assert.match(page,/MandalaMyAiVideos/);
});
