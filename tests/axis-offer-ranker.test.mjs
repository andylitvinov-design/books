import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {rankOffersByClientAxes,interpretMeasuredSignal,
  normalizeLifeAreas,LIFE_AREAS,SCORE_WEIGHTS} from '../lib/holistic-support/axis-offer-ranker.mjs';

const knownFacetRefs=['connection::boundaries','emotions::stress',
  'traits::extraversion','work::focus','goal::confidence'];
const now=Date.UTC(2026,9,28);
const source=(facetRef,band,polarity='higher_resource')=>({
  facetRef,optedIn:true,trusted:true,definitionKey:'hh-source',
  definitionVersion:'v1',dimensionKey:'scale.1',resultId:'private-result-1',
  instrumentLocale:'en',value:2,min:0,max:4,band,polarity,
  referenceKind:'source_band',measuredAt:'2026-10-22T00:00:00Z',
  validUntil:'2026-11-15T00:00:00Z',
});
const item=(id,facetRef,extra={})=>({
  id,kind:'video',lifeAreas:['relationships'],topics:['connection'],
  targets:[{facetRef,effect:'develop',weight:3}],audioLanguages:['ru'],
  free:true,published:true,rightsCleared:true,editorialReviewed:true,
  safetyApproved:true,claimsRisk:'low',verifiedDurationMinutes:10,...extra,
});
const rank=(client,items,extra={})=>rankOffersByClientAxes({
  client:{language:'ru',...client},items,knownFacetRefs,now,...extra,
});

test('four canonical areas, not five',()=>{
  assert.equal(LIFE_AREAS.length,4);
  assert.deepEqual(normalizeLifeAreas(['money','goals','energy','relationships']),
    ['business','personal_growth','energy_health','relationships']);
  assert.equal(Object.values(SCORE_WEIGHTS).reduce((a,b)=>a+b,0),100);
});
test('selected exact axis beats unrelated broad sphere',()=>{
  const out=rank({lifeAreas:['relationships'],selectedFacets:['connection::boundaries']},[
    item('broad','emotions::stress'),item('exact','connection::boundaries')]);
  assert.equal(out[0].id,'exact');
  assert.equal(out[0].scoring.explicit,45);
  assert.equal(out[0].rankClass,'goal_axis');
});
test('source-backed low resource and high stress are separate attention signals',()=>{
  assert.equal(interpretMeasuredSignal(source('connection::boundaries','below'),
    {knownFacetRefs,now}).level,'attention');
  assert.equal(interpretMeasuredSignal(source('emotions::stress','above','higher_load'),
    {knownFacetRefs,now}).level,'attention');
  assert.equal(interpretMeasuredSignal(source('emotions::stress','below','higher_load'),
    {knownFacetRefs,now}).level,'resource');
});
test('consented verified source can add up to 25 without mutating raw value',()=>{
  const hits=rank({selectedFacets:['connection::boundaries'],allowMeasuredPersonalization:true,
    measurements:[source('connection::boundaries','below')]},
    [item('relevant','connection::boundaries')]);
  assert.equal(hits[0].scoring.measured,25);
  assert.equal(hits[0].matchedAxes[0].measurement.definitionVersion,'v1');
  assert.equal(hits[0].matchedAxes[0].measurement.value,2);
});
test('unconsented/unverified/stale/unsupported signals never get a boost',()=>{
  const s=source('connection::boundaries','below');
  for(const bad of [{...s,optedIn:false},{...s,trusted:false},
      {...s,dimensionKey:''},{...s,referenceKind:'none'},
      {...s,validUntil:'2026-10-01T00:00:00Z'},
      {...s,polarity:'descriptive'}]){
    assert.equal(interpretMeasuredSignal(bad,{knownFacetRefs,now}),null);
    assert.equal(rank({selectedFacets:['connection::boundaries'],
      allowMeasuredPersonalization:true,measurements:[bad]},
      [item('ok','connection::boundaries')])[0].scoring.measured,0);
  }
  assert.equal(rank({selectedFacets:['connection::boundaries'],measurements:[s]},
    [item('ok','connection::boundaries')])[0].scoring.measured,0);
});
test('low descriptive personality is NOT a deficit',()=>{
  const hits=rank({selectedFacets:['traits::extraversion'],
    allowMeasuredPersonalization:true,
    measurements:[source('traits::extraversion','below','descriptive')]},[
      item('traits','traits::extraversion',{lifeAreas:['personal_growth'],
        targets:[{facetRef:'traits::extraversion',effect:'relieve',weight:3}]})]);
  assert.equal(hits[0].scoring.measured,0);
});
test('contradictory source findings cancel automatic relevance bonus',()=>{
  const hits=rank({selectedFacets:['connection::boundaries'],
    allowMeasuredPersonalization:true,
    measurements:[source('connection::boundaries','below'),
      {...source('connection::boundaries','above'),resultId:'private-result-2'}]},[
        item('ok','connection::boundaries')]);
  assert.equal(hits[0].scoring.measured,0);
});
test('current to desired is a separate user goal gap, not a norm',()=>{
  const hits=rank({selectedFacets:['connection::boundaries'],
    selfGoals:[{facetRef:'connection::boundaries',current:2,desired:8,min:0,max:10}]},[
      item('ok','connection::boundaries')]);
  assert.equal(hits[0].scoring.selfGap,9);
  assert.equal(hits[0].matchedAxes[0].measurement,null);
});
test('hard gate excludes unreviewed/unsafe/unlicensed/wrong audio/unknown duration',()=>{
  const results=rank({selectedFacets:['connection::boundaries'],maxDurationMinutes:12},[
    item('good','connection::boundaries'),
    item('private','connection::boundaries',{published:false}),
    item('unreviewed','connection::boundaries',{editorialReviewed:false}),
    item('foreign','connection::boundaries',{audioLanguages:['en']}),
    item('long','connection::boundaries',{verifiedDurationMinutes:20}),
    item('unsafe','connection::boundaries',{claimsRisk:'high'}),
    item('paid','connection::boundaries',{free:false}),
  ]);
  assert.deepEqual(results.map(x=>x.id),['good']);
});
test('paid services only on opt in; never claim a booking or payment',()=>{
  const service=item('session','connection::boundaries',{
    kind:'service',languages:['ru'],audioLanguages:[],free:false});
  assert.deepEqual(rank({selectedFacets:['connection::boundaries']},[service]),[]);
  const rows=rank({selectedFacets:['connection::boundaries'],allowPaid:true},[service]);
  assert.equal(rows[0].id,'session');
  assert.equal('paymentStatus' in rows[0],false);
});
test('missing/unknown axes cannot invent results or unrelated recommendations',()=>{
  assert.deepEqual(rank({selectedFacets:['unknown::missing']},
    [item('a','connection::boundaries')]),[]);
  assert.deepEqual(rank({selectedFacets:['connection::boundaries']},
    [item('unrelated','work::focus')]),[]);
});
test('ties are deterministic; duplicate content ID appears once',()=>{
  const b=item('b','connection::boundaries');
  const a=item('a','connection::boundaries');
  assert.deepEqual(rank({selectedFacets:['connection::boundaries']},
    [b,a,b]).map(x=>x.id),['a','b']);
});
test('crosswalk lists exactly 34 proposals across 10 topics and four areas',()=>{
  const lines=readFileSync(new URL('../data/holistic-support/axis-offer-crosswalk-v1.csv',import.meta.url),
    'utf8').trim().split(/\r?\n/);
  const rows=lines.slice(1).map(line=>line.split(','));
  assert.equal(rows.length,34);
  assert.equal(new Set(rows.map(x=>x[0])).size,34);
  const topicCounts={emotions:4,recovery:2,body:2,connection:5,work:5,
    money:3,traits:7,support:2,meaning:1,goal:3};
  for(const [topic,n] of Object.entries(topicCounts))
    assert.equal(rows.filter(x=>x[2]===topic).length,n,topic);
  assert.ok(rows.every(x=>LIFE_AREAS.includes(x[1])));
  assert.ok(rows.every(x=>x[0].startsWith(x[2]+'::')));
  assert.ok(rows.every(x=>x[11]==='editorial_proposal_not_published'));
  assert.ok(rows.filter(x=>x[2]==='traits').every(x=>x[4]==='descriptive_only'));
  assert.ok(rows.filter(x=>x[2]==='goal').every(x=>x[4]==='supporting_only_not_goal_score'));
});


test('sensitive intimacy-related axis requires explicit independent consent',()=>{
 const sensitive=item('sensitive','connection::intimacy',{
  targets:[{facetRef:'connection::intimacy',effect:'explore',weight:2}]});
 const fac=[...knownFacetRefs,'connection::intimacy'];
 const baseline={client:{language:'ru',selectedFacets:['connection::intimacy']},
  knownFacetRefs:fac,now,items:[sensitive]};
 assert.deepEqual(rankOffersByClientAxes(baseline),[]);
 const consented=rankOffersByClientAxes({...baseline,
  client:{...baseline.client,allowSensitiveContent:true}});
 assert.equal(consented.length,1);
 assert.equal(consented[0].matchedAxes[0].facetRef,'connection::intimacy');
 const explicitlySensitive=item('marked','connection::boundaries',{sensitive:true});
 assert.deepEqual(rank({selectedFacets:['connection::boundaries']},[explicitlySensitive]),[]);
});
