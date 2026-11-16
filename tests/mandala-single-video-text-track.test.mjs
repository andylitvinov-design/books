import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {pickSingleVideoTextSource as choose} from "../lib/mandala/single-video-text-track.mjs";
const common={
 affirmationsEnabled:true,affirmationVisibility:["large","small","frame"],
 affirmationLines:["Я могу выбрать спокойствие","Я сохраняю опору"],
 storyboardCaptions:["Устойчивый темп владельца","Дверь офиса закрывается вовремя"],
};
test("client calm intention wins over unrelated stage copy",()=>{
 assert.equal(choose({...common,wish:"Хочу больше спокойствия и опоры"}),"affirmations");
 assert.equal(choose(common),"affirmations");
});
test("specific user intention can select the more relevant scene captions",()=>{
 assert.equal(choose({...common,wish:"Хочу закрывать двери офиса вовремя"}),"stage");
});
test("voice and manual text are protected from unapproved automatic replacement",()=>{
 assert.equal(choose({...common,approvedNarration:true,wish:"закрывать двери офиса вовремя"}),"affirmations");
 assert.equal(choose({...common,timelineCaptions:[{text:"Моя редакторская подпись"}]}),"stage");
 assert.equal(choose({...common,timelineCaptions:[]}),"none");
 assert.equal(choose({...common,captionMode:"custom",caption:"Мой текст"}),"caption");
});
test("no phantom text; disabled affirmations fall back to the actual storyboard",()=>{
 assert.equal(choose({...common,affirmationsEnabled:false}),"stage");
 assert.equal(choose({...common,affirmationVisibility:[]}),"stage");
 assert.equal(choose({captionMode:"theme",caption:"Тема"}),"caption");
 assert.equal(choose({}),"none");
});
test("semantic matching tolerates Unicode accents in Spanish and Russian",()=>{
 assert.equal(choose({affirmationsEnabled:true,affirmationVisibility:["large"],
  affirmationLines:["Puedo intentarlo"],storyboardCaptions:["Mi música y conexión genuina"],
  wish:"Quiero música, conexión y calma"}),"stage");
});
test("the same single compositor is used in scrub, preview and both export encoders",()=>{
 const code=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
 assert.match(code,/pickSingleVideoTextSource/);
 assert.equal((code.match(/paintSingleVideoTextOverlay\(ctx,/g)||[]).length,5);
 assert.equal((code.match(/paintVideoAffirmations\(ctx,/g)||[]).length,1);
 assert.equal((code.match(/paintStageCaptionOverlay\(ctx,/g)||[]).length,1);
 assert.equal((code.match(/paintCinematicFrame\(ctx,image,effect,[^\n]*?aspect,moneyScene,visibleCaption,/g)||[]).length,5);
 assert.doesNotMatch(code,/if\(activeWorkspace!=="phrases"\)paintStageCaptionOverlay/);
 assert.match(code,/density:"low"/);
});
