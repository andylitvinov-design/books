import {test} from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync("components/mandala-smart-animation.tsx","utf8");
const studio=readFileSync("components/mandala-free-video-studio.tsx","utf8");
test("Smart Animation is a single optional entry in the existing Studio",()=>{
  assert.match(studio,/data-video-smart-animation/);
  assert.match(studio,/<MandalaSmartAnimation locale=\{locale\}/);
  assert.equal((studio.match(/data-video-smart-animation/g)||[]).length,1);
});
test("cartoon preview has an honest gate and does not create a second recorder or API",()=>{
  assert.match(source,/data-cartoon-preview/);
  assert.match(source,/data-cartoon-storyboard/);
  assert.match(source,/data-cartoon-variant/);
  assert.match(source,/not a finished MP4|файл ещё не создан/);
  assert.doesNotMatch(source,/new MediaRecorder|fetch\(|onSubmit=|\/api\/app\/video\/renders/);
  assert.match(source,/encodeURIComponent\(svg\)/);
});
