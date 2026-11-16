import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=readFileSync('components/app/practice-workspace.jsx','utf8');
test('professional video entry is practitioner-scoped, not owner-only Growth Studio',()=>{
 assert.match(src,/data-practice-professional-growth/);
 assert.match(src,/professionalVideoServices=services\.filter/);
 assert.match(src,/item\.status==='published' && item\.active===true/);
 assert.match(src,/holistic-support\/mandala\?pro=1&master=/);
 assert.match(src,/No links to unpublished services/);
 assert.match(src,/professionalVideoServices\.length\?professionalVideoServices\.map/);
 assert.match(src,/activePanel==='marketing'&&isOwner/);
});
test('published public slugs only and no hidden sensitive query strings',()=>{
 assert.match(src,/\^\[a-z0-9\]\[a-z0-9-\]/);
 assert.doesNotMatch(src,/professionalVideoHref=.*clientNote|professionalVideoHref=.*testResults/);
});
