import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import ts from "typescript";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const helperSource=read("lib/mandala/portrait-oval.ts");
const compiled=ts.transpileModule(helperSource,{
  fileName:"portrait-oval.ts",
  reportDiagnostics:true,
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022},
});
const errors=(compiled.diagnostics||[]).filter(x=>x.category===ts.DiagnosticCategory.Error);
assert.deepEqual(errors.map(x=>ts.flattenDiagnosticMessageText(x.messageText," ")),[]);
const module={exports:{}};
runInNewContext(compiled.outputText,{module,exports:module.exports,Math,Number,Error});
const {ovalPortraitCrop,paintOvalPortrait}=module.exports;

function checkCover(imageW,imageH,viewW,viewH){
  const o=ovalPortraitCrop(imageW,imageH,viewW,viewH);
  for(const key of ["cx","cy","rx","ry","dx","dy","dw","dh"])
    assert.ok(Number.isFinite(o[key]),key);
  assert.ok(o.rx>0 && o.ry>o.rx,"portrait mask is taller than wide");
  assert.ok(o.dx<=o.cx-o.rx+1e-6 && o.dx+o.dw>=o.cx+o.rx-1e-6,"no horizontal gaps");
  assert.ok(o.dy<=o.cy-o.ry+1e-6 && o.dy+o.dh>=o.cy+o.ry-1e-6,"no vertical gaps");
  assert.ok(o.cx-o.rx>0 && o.cx+o.rx<viewW,"oval fits slide horizontally");
  assert.ok(o.cy-o.ry>0 && o.cy+o.ry<viewH,"oval fits slide vertically");
  return o;
}

test("the same non-stretched oval fits cinematic 16:9 preview and 9:16 export",()=>{
  for(const [iw,ih] of [[3024,4032],[4032,3024],[1080,1080],[1200,1600]]){
    const landscape=checkCover(iw,ih,1280,720);
    assert.ok(landscape.cx<640,"portrait stays left of the headline");
    const vertical=checkCover(iw,ih,480,854);
    assert.ok(Math.abs(vertical.cx-240)<1,"portrait is centred in vertical export");
    checkCover(iw,ih,720,720);
  }
  assert.throws(()=>ovalPortraitCrop(0,4032,1280,720),/INVALID_OVAL/);
});

test("the actual photo is drawn only after canvas ellipse clipping",()=>{
  const steps=[];
  const gradient={addColorStop(){}};
  const ctx={
    save(){steps.push("save")},restore(){steps.push("restore")},
    beginPath(){steps.push("beginPath")},
    ellipse(){steps.push("ellipse")},clip(){steps.push("clip")},
    fill(){steps.push("fill")},stroke(){steps.push("stroke")},
    drawImage(){steps.push("drawImage")},
    fillRect(){steps.push("fillRect")},
    createLinearGradient(){return gradient},
    set shadowColor(v){},set shadowBlur(v){},set fillStyle(v){},set strokeStyle(v){},set lineWidth(v){},
  };
  assert.equal(paintOvalPortrait(ctx,null,1280,720,"mint"),false);
  assert.equal(steps.length,0,"no fabricated face when no image exists");
  assert.equal(paintOvalPortrait(ctx,{naturalWidth:3024,naturalHeight:4032},1280,720,"mint"),true);
  assert.ok(steps.indexOf("clip")>=0);
  assert.ok(steps.indexOf("drawImage")>steps.indexOf("clip"),"rectangle must never escape the oval");
  assert.equal(steps.filter(step=>step==="drawImage").length,1);
  assert.ok(steps.filter(step=>step==="ellipse").length>=2);
  assert.equal(steps.filter(step=>step==="restore").length,2,"no leaked canvas clipping");
});

test("all real film and procedural frames share one oval source, no rectangle portrait",()=>{
  const money=read("lib/mandala/cinematic-money-video.ts");
  const other=read("lib/mandala/holistic-video-themes.ts");
  const studio=read("components/mandala-free-video-studio.tsx");
  const mobile=read("components/holistic-support-mobile.module.css");
  const videoCss=read("components/mandala-video-mobile.module.css");
  assert.match(money,/paintOvalPortrait\(ctx,image,w,h,"gold"\)/);
  assert.match(other,/paintOvalPortrait\(c,image,w,h,tone\)/);
  assert.doesNotMatch(other,/roundRect\(/);
  assert.doesNotMatch(money,/getPortraitLayer|portraitLayers/);
  assert.match(studio,/data-preview-layout="landscape"/);
  assert.match(studio,/formatDimensions\("landscape","hd"\)/);
  assert.match(studio,/const \[outputWidth, outputHeight\] = formatDimensions\(aspect, quality\)/);
  assert.match(studio,/\[aspect, recording\]/);
  assert.match(mobile,/\.photoPreview \{ position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 50% 34%;/);
  assert.match(videoCss,/\.photoPortrait img\{[^}]*object-position:50% 34%\}/);
  assert.doesNotMatch(helperSource,/fetch\(|sendBeacon\(|localStorage|XMLHttpRequest|axios|MediaPipe|FaceDetector/);
});
