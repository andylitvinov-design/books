import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  oporaExperienceDay,oporaExperienceGuide,oporaExperienceGuidesValid,
  OPORA_EXPERIENCE_DESIGN_VERSION,
} from '../lib/inner-growth/opora-as56-experience-guides.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('all 14 days provide one readable daily action and a reminder in EN/RU/ES',()=>{
  assert.equal(OPORA_EXPERIENCE_DESIGN_VERSION,'as-5.7-soft-morning');
  assert.equal(oporaExperienceGuidesValid(),true);
  for(const lang of ['en','ru','es']){
    const titles=new Set();
    for(let day=1;day<=14;day++){
      const copy=oporaExperienceDay(day,lang);
      assert.ok(copy,'Missing day '+day+' locale '+lang);
      assert.equal(copy.practice,oporaExperienceGuide(day,lang));
      assert.ok(copy.title.length>=8&&copy.title.length<=140);
      assert.ok(copy.practice.length>=18&&copy.practice.length<=140);
      assert.ok(copy.reminder.length>=18&&copy.reminder.length<=140);
      assert.doesNotMatch(copy.practice,/\n/);
      assert.doesNotMatch(copy.practice,/\b(quiz|score|test your understanding)\b/i);
      titles.add(copy.title);
    }
    assert.equal(titles.size,14,'Daily titles must be distinct '+lang);
  }
  assert.equal(oporaExperienceDay(0,'en'),null);
  assert.equal(oporaExperienceDay(15,'ru'),null);
});

test('photographic mobile player uses a bright panel and high-contrast large type',()=>{
  const css=read('components/app/opora-experience-player.module.css');
  const jsx=read('components/app/opora-experience-player.jsx');
  assert.match(css,/100dvh/);
  assert.match(css,/\.frame::before/);
  assert.match(css,/filter:brightness\(1\.23\)/);
  assert.match(css,/rgba\(250,255,253,\.92\)/);
  assert.match(css,/\.lead\s*\{[\s\S]*?font-size:clamp\(18px,4\.7vw,21px\)/);
  assert.match(css,/\.title\s*\{[\s\S]*?color:#153e51/);
  assert.match(css,/prefers-reduced-motion/);
  assert.doesNotMatch(css,/background:#0a3649/);
  assert.match(jsx,/oporaExperienceDay\(cycle\.day,lang\)/);
  assert.match(jsx,/data-course-visual-theme=\{OPORA_EXPERIENCE_DESIGN_VERSION\}/);
  assert.match(jsx,/locale==='es'/);
  assert.match(jsx,/practiceAttempt:attempted/);
  assert.match(jsx,/visitedSlideKeys:\[\.\.\.scenes\]/);
  assert.match(jsx,/\(moment==='welcome'\|\|moment==='arrive'\|\|receipt\)/);
});
