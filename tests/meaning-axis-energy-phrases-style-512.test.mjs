import test from 'node:test';
import assert from 'node:assert/strict';
import phrases from '../data/video-catalog/meaning-axis-energy-phrases-512-v1.json' with {type:'json'};
import movies from '../data/video-catalog/meaning-axis-short-scenarios-512-v1.json' with {type:'json'};

const locales = ['ru','en','es'];
const tiers = ['low','medium','high'];
const fieldIndex = {ru:0,en:1,es:2,ruCaption:3,enCaption:4,esCaption:5};
const scenes = new Map(movies.scenarios.map(row => [row.id,row]));

function rows(lang,mode='full') {
  const idx=fieldIndex[lang+(mode==='caption'?'Caption':'')];
  return phrases.scenarios.flatMap(s => tiers.flatMap(t=>s.tierPhrases[t].map(p=>p[idx])));
}

test('v2 retains 512 stable scenario IDs and keeps 3 × 5 options per locale', () => {
  assert.equal(phrases.scenarios.length,512);
  assert.equal(phrases.meta.totalNewLocalizedPhrases,23040);
  assert.equal(phrases.meta.legacyCanonicalStoryboardsPreserved,256);
  assert.equal(phrases.meta.shortStoryboardsPreserved,512);
  assert.equal(phrases.status,'editorial_draft_native_language_review_required');
  assert.equal(new Set(phrases.scenarios.map(s=>s.id)).size,512);
  for (const s of phrases.scenarios) {
    const parent=scenes.get(s.id);
    assert.ok(parent,`missing film ${s.id}`);
    assert.equal(s.subsectorId,parent.subsectorId);
    assert.equal(s.topicId,parent.topicId);
    assert.equal(s.axisId,parent.axisId);
    for (const tier of tiers){
      assert.equal(s.tierPhrases[tier].length,5,`${s.id}/${tier}`);
      for (const pair of s.tierPhrases[tier]) assert.equal(pair.length,6);
    }
  }
});

test('all primary support lines and captions are globally unique per locale',()=>{
 for(const locale of locales){
   const full=rows(locale),captions=rows(locale,'caption');
   assert.equal(full.length,7680);
   assert.equal(new Set(full).size,7680,`repeated full ${locale}`);
   assert.equal(new Set(captions).size,7680,`repeated caption ${locale}`);
   assert.ok(full.every(line=>line.length>=30&&line.length<=158));
   assert.ok(captions.every(line=>[...line].length>9&&[...line].length<=36));
   assert.ok(full.every(line=>line.includes(' ')&&/[.!?]$/.test(line)));
   assert.ok(full.every(line=>!line.includes('${')&&!line.includes('[topic]')));
 }
});

test('copy is a visual micro-story, not an appended context label',()=>{
 const russian=rows('ru');
 assert.ok(russian.every(s=>!/(?:при стрессе|в семье|на работе|при пустоте внутри)\.$/.test(s)),
   'repeated topic-suffix copy survived');
 assert.ok(russian.every(s=>s.includes('. ')||s.includes('.\n')||s.includes('! ')),
   'line lost both visual and supportive clauses');
 assert.ok(phrases.scenarios.some(s=>s.copyStyle==='identity'));
 assert.ok(phrases.scenarios.some(s=>s.copyStyle==='presence'));
 assert.ok(phrases.scenarios.some(s=>s.copyStyle==='safety'));
 assert.ok(phrases.scenarios.some(s=>s.copyStyle==='care'));
 assert.ok(phrases.scenarios.some(s=>s.copyStyle==='understanding'));
 assert.ok(phrases.scenarios.every(s=>s.copyStyle));
});

test('sensitive themes use non-coercive individual support lenses',()=>{
 const byId=new Map(phrases.scenarios.map(s=>[s.id,s]));
 for(const topic of ['childhood-trauma','rejection-wounds','abandonment-wounds','low-mood','apathy','panic-attacks']){
   assert.equal(byId.get(`${topic}__agency__short-film-v1`).copyStyle,'care');
   assert.equal(byId.get(`${topic}__recognition__short-film-v1`).copyStyle,'presence');
 }
 for(const topic of ['money-mindset','business-decisions','self-discipline']){
   assert.equal(byId.get(`${topic}__love__short-film-v1`).copyStyle,'safety');
 }
 const danger=/(you are cured|will cure|100% guaranteed|trauma is a gift|травма дана|точно вылеч|garanti[sz]a la curación)/i;
 for(const lang of locales) assert.ok(rows(lang).every(line=>!danger.test(line)));
});