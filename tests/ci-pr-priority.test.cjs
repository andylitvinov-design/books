'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {POLICY,priorityFor,rankedCandidates,pickQueueCandidates,desiredLabels,
  classifyDirection,selectNextAvailable,isFreeFor,operationalPriority,mergeStage}=require('../scripts/ci-pr-priority.cjs');
const NOW=Date.parse('2026-11-01T18:00:00Z');
const label=name=>({name});
const pr=(number,title='feat: add assorted enhancements',extra={})=>({
  number,title,state:'open',draft:false,
  created_at:'2026-10-01T00:00:00Z',
  updated_at:new Date(NOW-number*1000).toISOString(),labels:[],...extra
});

test('central direction policy has exactly five ranks and stable unique areas',()=>{
  assert.deepEqual(POLICY.levels.map(x=>x.id),[1,2,3,4,5]);
  assert.equal(new Set(POLICY.directions.map(x=>x.id)).size,POLICY.directions.length);
  for(const area of POLICY.directions)
    assert.ok(area.level>=1&&area.level<=5);
});
test('all five inherited priorities come from development directions',()=>{
  for(const [title,id,tier] of [
    ['fix(ci): wake Watchdog worker','platform','P1'],
    ['fix(video): iPhone Create mp4','video','P1'],
    ['feat(voice): RU/EN TTS narration','audio-hypno','P2'],
    ['fix(messages): reply to guest enquiry','messenger-crm','P3'],
    ['feat(wallet): checkout receipt','orders-payments','P3'],
    ['feat(cabinet): profile improvements','cabinet-diagnostics','P4'],
    ['feat(reiki): initiation course','academy-courses','P4'],
    ['seo: hreflang and canonical','seo-growth','P5'],
    ['style: typography and layout','content-design','P5']]){
    const actual=priorityFor(pr(1,title),NOW);
    assert.equal(actual.direction,id,title);
    assert.equal(actual.tier,tier,title);
  }
});
test('owner can change a direction, not an individual PR priority',()=>{
  const original=pr(42,'feat(voice): synthesize music');
  assert.equal(priorityFor(original,NOW).tier,'P2');
  const oldManual=pr(42,original.title,{labels:[label('hh:priority:p0')]});
  assert.equal(priorityFor(oldManual,NOW).tier,'P2','old manual P0 must not override direction');
  const direction=pr(42,original.title,{labels:[
    label('hh:direction-override:video'),label('hh:priority:5')]});
  const inherited=priorityFor(direction,NOW);
  assert.equal(inherited.direction,'video');
  assert.equal(inherited.tier,'P1','central direction beats stale numeric label');
});
test('unknown titles can use changed file paths or prior auto classification',()=>{
  const unknown=pr(1,'feat: add service assets');
  assert.equal(classifyDirection(unknown).id,'other');
  assert.equal(classifyDirection(unknown,['src/service/audio/voice.wav']).id,'audio-hypno');
  assert.equal(classifyDirection(pr(1,unknown.title,{labels:[
    label('hh:direction:academy-courses')]})).id,'academy-courses');
});
test('classifier creates authoritative direction and level labels and migrates legacy',()=>{
  const item=pr(1,'feat(video): new renderer',{labels:[
    label('hh:priority:p0'),label('hh:direction:audio-hypno'),
    label('hh:priority:3'),label('hh:repair-needed')]});
  const result=desiredLabels(item);
  assert.equal(result.id,'video');
  assert.deepEqual(result.desired,['hh:direction:video','hh:priority:1',
    'hh:merge-priority:02','hh:merge-stage:repair']);
  assert.ok(result.obsolete.includes('hh:priority:p0'));
  assert.ok(result.obsolete.includes('hh:direction:audio-hypno'));
  assert.equal(result.obsolete.includes('hh:repair-needed'),false);
});
test('conflicting or unknown direction overrides fail closed',()=>{
  const item=pr(1,'fix(ci): critical',{labels:[
    label('hh:direction-override:video'),label('hh:direction-override:other')]});
  assert.equal(priorityFor(item,NOW).conflicted,true);
  assert.equal(desiredLabels(item).needsSync,false);
  assert.deepEqual(rankedCandidates([item,pr(2)],NOW).map(x=>x.number),[2]);
});
test('age and work-queue bonuses never jump between five priority levels',()=>{
  const old=pr(1,'style: text',{created_at:'2020-01-01T00:00:00Z'});
  const fresh=pr(2,'feat(reiki): initiation',{created_at:'2026-11-01T17:59:00Z'});
  assert.ok(priorityFor(old,NOW).score<priorityFor(fresh,NOW).score);
});
test('next available repair work skips manual holds and chooses best direction',()=>{
  const items=[
    pr(1,'fix(video): urgent',{labels:[label('hh:repair-needed'),label('hh:repair-manual')]}),
    pr(2,'feat(voice): narration',{labels:[label('hh:repair-needed')]}),
    pr(3,'feat(cabinet): profile',{labels:[label('hh:repair-needed')]}),
    pr(4,'fix(video): pending',{labels:[label('hh:repair-needed'),label('hh:hold')]})
  ];
  assert.equal(selectNextAvailable(items,'repair',NOW).number,2);
  assert.equal(isFreeFor(items[0],'repair'),false);
  assert.equal(selectNextAvailable(items,'ci',NOW),null);
});
test('three fast priority entries plus rotating slot prevent starvation',()=>{
  const items=Array.from({length:60},(_,i)=>pr(i+1,'feat(cabinet): profile'));
  items[45].title='fix(video): urgently repair Create';
  items[55].title='feat(voice): narration';
  const result=pickQueueCandidates(items,NOW,4,3);
  assert.equal(result[0].number,46);
  assert.ok(result.some(x=>x.number===56));
  const seen=new Set();
  for(let i=0;i<60;i++)
    seen.add(pickQueueCandidates(items,NOW+i*600000,4,3)[3].number);
  assert.ok(seen.size>=45);
});
test('invalid queue size fails closed',()=>{
  assert.throws(()=>pickQueueCandidates([pr(1)],NOW,30,3),/Unsafe/);
  assert.throws(()=>pickQueueCandidates([pr(1)],NOW,4,5),/Unsafe/);
});

test('historical CI test maintenance does not displace operational Watchdog P1',()=>{
  const maintenance=pr(850,'fix(ci): restore regression coverage for current test UI');
  const incident=pr(2956,'fix(ci): prevent Watchdog callbacks cancelling repairs');
  assert.equal(priorityFor(maintenance,NOW).direction,'ci-maintenance');
  assert.equal(priorityFor(maintenance,NOW).tier,'P5');
  assert.equal(priorityFor(incident,NOW).tier,'P1');
  assert.equal(rankedCandidates([maintenance,incident],NOW)[0].number,2956);
});

test('ten merge ranks inherit the five directions, then elevate real fixes within a direction',()=>{
  const titles=[
    'fix(video): restore generation','feat(video): scenario library',
    'fix(voice): restore TTS','feat(voice): multilingual voices',
    'fix(messages): restore replies','feat(messages): add chat view',
    'fix(cabinet): restore tests','feat(cabinet): add tests',
    'fix(seo): repair sitemap','feat(seo): add landing pages'
  ];
  assert.deepEqual(titles.map((title,i)=>
    priorityFor(pr(i+1,title),NOW).mergeRank),[1,2,3,4,5,6,7,8,9,10]);
  assert.ok(priorityFor(pr(1,titles[0]),NOW).score>
    priorityFor(pr(2,titles[1]),NOW).score);
  assert.ok(priorityFor(pr(2,titles[1]),NOW).score>
    priorityFor(pr(3,titles[2]),NOW).score);
});
test('queue stage reflects live work status without lying about green CI',()=>{
  const base=pr(1,'fix(video): restore generation');
  const cases=[
    [base,'inspect'],
    [{...base,labels:[label('hh:ci-needed')]},'ci'],
    [{...base,labels:[label('hh:repair-needed')]},'repair'],
    [{...base,labels:[label('hh:worker-claimed')]},'claimed'],
    [{...base,mergeable:false,mergeable_state:'dirty'},'conflict'],
    [{...base,labels:[label('hh:hold')]},'manual'],
    [{...base,draft:true},'draft'],
    [{...base,auto_merge:{enabled_at:'2026-11-01T00:00:00Z'}},'armed']
  ];
  for(const [item,stage] of cases){
    assert.equal(mergeStage(item),stage);
    assert.equal(priorityFor(item,NOW).mergeRank,1,'work status never rewrites importance');
  }
});
test('stale rank/stage and manually forged labels are reconciled without replacing workers',()=>{
  const item=pr(1,'fix(video): repair generation',{labels:[
    label('hh:merge-priority:10'),label('hh:merge-stage:armed'),
    label('hh:priority:5'),label('hh:repair-needed')]});
  const actual=desiredLabels(item);
  assert.equal(actual.rank,1);
  assert.equal(actual.stage,'repair');
  assert.ok(actual.desired.includes('hh:merge-priority:01'));
  assert.ok(actual.desired.includes('hh:merge-stage:repair'));
  assert.ok(actual.obsolete.includes('hh:merge-priority:10'));
  assert.ok(actual.obsolete.includes('hh:merge-stage:armed'));
  assert.ok(!actual.obsolete.includes('hh:repair-needed'));
  assert.equal(operationalPriority(item).rank,1);
});
