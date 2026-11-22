import test from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../data/video-catalog/meaning-axis-energy-phrases-512-v1.json' with {type:'json'};

const locales=['ru','en','es'];
const levels=['low','medium','high'];
const priorityTopics=['panic-attacks','childhood-trauma','apathy','low-mood','breakup-recovery','abandonment-wounds'];
const byKey=new Map(catalog.scenarios.map(s=>[s.id,s]));
const index={ru:0,en:1,es:2};

function distinctSentences(locale){
  const result=new Set();
  for(const row of catalog.scenarios) for(const tier of levels) for(const line of row.tierPhrases[tier]){
    for(const bit of line[index[locale]].replaceAll('\n',' ').split(/(?<=[.!?])\s+/)){
      if(bit.trim())result.add(bit.trim());
    }
  }
  return result;
}

test('V4 improves specific six priority topics without changing canonical scenario counts',()=>{
 assert.equal(catalog.scenarios.length,512);
 assert.equal(catalog.meta.legacyCanonicalStoryboardsPreserved,256);
 assert.equal(catalog.meta.editorialP0SceneFirstV4.topicCount,6);
 assert.equal(catalog.meta.editorialP0SceneFirstV4.scenarioCount,48);
 assert.equal(catalog.meta.editorialP0SceneFirstV4.firstRankLinesRevisedPerLocale,144);
 assert.equal(catalog.meta.editorialP0SceneFirstV4.remainingPrimaryPhrasesNeedingIndividualRevision,7536);
 assert.equal(catalog.status,'editorial_draft_native_language_review_required');
 assert.equal(new Set(catalog.scenarios.map(x=>x.id)).size,512);
});

test('every priority scenario preserves 3 × 5 options and scene-first self-directed wording',()=>{
 let changed=0;
 for(const topic of priorityTopics)for(const axis of ['anchor','connection','freedom','agency','love','dignity','self-realization','recognition']){
  const s=byKey.get(`${topic}__${axis}__short-film-v1`);
  assert.ok(s,`${topic}/${axis}`);
  for(const tier of levels){
   assert.equal(s.tierPhrases[tier].length,5,`${topic}/${axis}/${tier}`);
   const first=s.tierPhrases[tier][0];
   assert.equal(first.length,6);
   for(const language of locales){
    const text=first[index[language]];
    assert.ok(text.length>=30 && text.length<=158,`${topic}/${axis}/${tier}/${language} length`);
    assert.ok(text.includes('. ') || text.includes('.\n') || text.includes('! '),`${topic}/${axis}/${tier}/${language} two-beat writing`);
   }
   changed++;
  }
 }
 assert.equal(changed,144);
});

test('global 7,680 phrases and captions remain unique in every language; captions <=36',()=>{
 for(const [i,lang] of locales.entries()){
  const full=[],short=[];
  for(const s of catalog.scenarios)for(const tier of levels)for(const line of s.tierPhrases[tier]){
   full.push(line[i]);short.push(line[i+3]);
  }
  assert.equal(full.length,7680);
  assert.equal(new Set(full).size,7680,`full uniqueness ${lang}`);
  assert.equal(new Set(short).size,7680,`captions uniqueness ${lang}`);
  assert.ok(short.every(text=>[...text].length<=36),`caption length ${lang}`);
  assert.ok(distinctSentences(lang).size>=790,`sentence diversity ${lang}`);
 }
});

test('remains a voluntary editorial catalog with no unreviewed clinical claims',()=>{
 assert.equal(catalog.meta.editorialP0SceneFirstV4.reviewStatus,'pending_native_language_review');
 const danger=/(will cure|guaranteed relief|you are cured|травма дана для роста|100% гарант|cura garantizada|debes perdonar)/iu;
 for(const s of catalog.scenarios)for(const tier of levels)for(const line of s.tierPhrases[tier])
  for(let i=0;i<3;i++)assert.equal(danger.test(line[i]),false);
});