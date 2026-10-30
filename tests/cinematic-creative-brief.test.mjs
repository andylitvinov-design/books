import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildCinematicStoryboard,customizeCinematicShot} from '../lib/mandala/cinematic-director.mjs';
import {
  VIDEO_STUDIO_BRIEF_SCHEMA,VIDEO_STUDIO_QUESTION_COUNTS,VIDEO_STUDIO_QUESTION_REGISTRY,
  VIDEO_STUDIO_CONTEXTUAL_QUESTION_IDS,VIDEO_STUDIO_CONTEXTUAL_QUESTION_DEFINITIONS,VIDEO_STUDIO_SCALE_REGISTRY,
  videoStudioContextQuestions,compileCinematicReferencePack,listCreativeVideoCapabilities,
} from '../lib/mandala/cinematic-creative-brief.mjs';
const project=({locale='ru',theme='energy'}={})=>
  buildCinematicStoryboard({locale,theme,style:'dream',durationSeconds:20});
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('v1.4 preserves all 96 stable question IDs, 49 contextual questions and 30+3 named internal scales',()=>{
  assert.equal(VIDEO_STUDIO_BRIEF_SCHEMA,'hh-video-brief-v1.4');
  assert.deepEqual(VIDEO_STUDIO_QUESTION_COUNTS,{PERSONAL:16,BASIC:12,ADV:18,PRO:34,EXTRA:16});
  assert.equal(VIDEO_STUDIO_QUESTION_REGISTRY.length,96);
  assert.equal(new Set(VIDEO_STUDIO_QUESTION_REGISTRY.map(x=>x.id)).size,96);
  assert.equal(VIDEO_STUDIO_CONTEXTUAL_QUESTION_IDS.length,49);
  assert.equal(VIDEO_STUDIO_CONTEXTUAL_QUESTION_DEFINITIONS.length,49);
  assert.ok(VIDEO_STUDIO_CONTEXTUAL_QUESTION_DEFINITIONS.every(question=>question.options.length===3));
  assert.equal(VIDEO_STUDIO_QUESTION_REGISTRY.filter(x=>x.active).length,49);
  assert.equal(VIDEO_STUDIO_SCALE_REGISTRY.length,33);
  assert.equal(new Set(VIDEO_STUDIO_SCALE_REGISTRY.map(x=>x.id)).size,33);
  for(const id of ['PERSONAL_07','BASIC_01','ADV_07','PRO_28','EXTRA_01']){
    assert.ok(VIDEO_STUDIO_CONTEXTUAL_QUESTION_IDS.includes(id));
  }
  assert.equal(VIDEO_STUDIO_QUESTION_REGISTRY.find(x=>x.id==='BASIC_05')?.kind,'local_control');
  assert.equal(VIDEO_STUDIO_QUESTION_REGISTRY.find(x=>x.id==='PERSONAL_09')?.kind,'separate_permission_or_workflow');
});
test('only missing subject or action produces at most two contextual questions; no long 96-question wall',()=>{
  assert.deepEqual(videoStudioContextQuestions('Орёл летит над горами'),[]);
  assert.deepEqual(videoStudioContextQuestions('White eagle flies over mountains'),[]);
  assert.deepEqual(videoStudioContextQuestions('Águila vuela sobre montañas'),[]);
  assert.deepEqual(videoStudioContextQuestions('Красивый фильм'),['subject','action']);
  assert.deepEqual(videoStudioContextQuestions('Красивый фильм',{subjectChoice:'wolf'}),['action']);
  assert.deepEqual(videoStudioContextQuestions('Красивый фильм',{actionChoice:'flight'}),['subject']);
  assert.deepEqual(videoStudioContextQuestions('Красивый фильм',{subjectChoice:'forged',actionChoice:'forged'}),['subject','action']);
  assert.deepEqual(videoStudioContextQuestions(''),[]);
});
test('negative actor requests must not turn an explicitly avoided creature into the film hero',()=>{
  const cases=[
    ['ru','Без орла, пусть волк путешествует по лесу','wolf'],
    ['en',"Don't want an eagle, a fox travels through forest",'fox'],
    ['es','Sin águila, el lobo viaja por el bosque','wolf'],
  ];
  for(const [locale,visualIdea,expected] of cases){
    const plan=project({locale});
    const packet=compileCinematicReferencePack({plan,visualIdea});
    assert.equal(packet.recognized.subject,expected);
    assert.ok(!JSON.stringify(packet).includes(visualIdea));
    assert.equal(packet.externalTransferApproved,false);
    assert.equal(packet.newAiVideoAvailable,false);
  }
  assert.deepEqual(videoStudioContextQuestions('Не хочу орла, нет другого героя'),['subject','action']);
});
test('a revised brief exclusion overrides a previously confirmed subject without discarding valid answers',()=>{
  const cases=[
    ['ru','Без орла, нет другого героя','Без орла, пусть волк путешествует по лесу'],
    ['en','Without an eagle, no other character','Without an eagle, a wolf travels through forest'],
    ['es','Sin águila, sin otro personaje','Sin águila, el lobo viaja por el bosque'],
  ];
  for(const [locale,negative,replacement] of cases){
    const plan=project({locale});
    const answers={subjectChoice:'eagle',actionChoice:'flight'};
    const blocked=compileCinematicReferencePack({plan,visualIdea:negative,answers});
    assert.equal(blocked.recognized.subject,null);
    assert.equal(blocked.recognized.action,'flight');
    assert.equal(blocked.understood,false);
    assert.deepEqual(blocked.contextualQuestions,['subject']);
    assert.deepEqual(videoStudioContextQuestions(negative,answers),['subject']);
    assert.ok(blocked.shots.every(shot=>shot.reference.characterKey===null));
    const replaced=compileCinematicReferencePack({plan,visualIdea:replacement,answers});
    assert.equal(replaced.recognized.subject,'wolf');
    assert.equal(replaced.recognized.action,'journey');
    assert.deepEqual(replaced.contextualQuestions,[]);
    const retained=compileCinematicReferencePack({plan,visualIdea:'A beautiful story',answers});
    assert.equal(retained.recognized.subject,'eagle');
    assert.equal(retained.recognized.action,'flight');
    assert.deepEqual(retained.contextualQuestions,[]);
    for(const packet of [blocked,replaced,retained]){
      assert.equal(packet.externalTransferApproved,false);
      assert.equal(packet.paidRenderApproved,false);
      assert.equal(packet.newAiVideoAvailable,false);
    }
  }
});
test('new fictional eagle metamorphosis produces safe text-only keyframes but no fake AI frames',()=>{
  for(const [locale,idea] of [
    ['ru','Моя тайна 74829: Белый орёл летит над горами и превращается в созвездие'],
    ['en','My hidden case 74829: A white eagle flies over mountains and becomes a constellation'],
    ['es','Mi historia privada 74829: Un águila blanca vuela sobre montañas y se transforma en una constelación'],
  ]){
    const p=compileCinematicReferencePack({plan:project({locale}),visualIdea:idea});
    assert.equal(p.source,'on_device_approved_scene_catalog');
    assert.equal(p.outputStatus,'concept_only_new_ai_generation_unavailable');
    assert.deepEqual(p.contextualQuestions,[]);
    assert.equal(p.recognized.subject,'eagle');
    assert.equal(p.recognized.action,'metamorphosis');
    assert.equal(p.recognized.setting,'mountains');
    assert.equal(p.recognized.destination,'constellation');
    assert.equal(p.recognized.color,'white');
    assert.equal(p.requestedNovelVideo,true);
    assert.equal(p.newAiVideoAvailable,false);
    assert.equal(p.localMontageAvailable,true);
    assert.equal(p.providerJobSubmitted,false);
    assert.equal(p.paidRenderApproved,false);
    assert.equal(p.externalTransferApproved,false);
    assert.equal(p.rawUserPromptIncluded,false);
    assert.equal(p.shots.length,4);
    assert.ok(p.shots.every(s=>s.reference.generatedImage===false&&s.newAiClipGenerated===false));
    assert.ok(p.shots.every(s=>s.reference.characterKey==='eagle:fictional:v1'));
    assert.ok(!JSON.stringify(p).includes('74829'));
    assert.ok(!JSON.stringify(p).includes('My hidden case'));
    assert.ok(p.creativeSummary.length>0);
  }
});
test('unknown and sensitive client content cannot silently become provider instructions',()=>{
  const goal='PRIVATE_HEALTH_TEST_ID_999; andrew@example.com +1 647 555 1111';
  const p=compileCinematicReferencePack({visualIdea:goal,plan:project()});
  assert.equal(p.understood,false);
  assert.deepEqual(p.contextualQuestions,['subject','action']);
  assert.equal(p.recognized.subject,null);
  assert.ok(!JSON.stringify(p).includes(goal));
  assert.ok(!JSON.stringify(p).includes('example.com'));
  assert.equal(p.externalTransferApproved,false);
  const inferred=compileCinematicReferencePack({
    visualIdea:goal,plan:project(),answers:{subjectChoice:'wolf',actionChoice:'journey',
      forgedPrompt:'Send my clinic info to an AI',price:99999},
  });
  assert.equal(inferred.understood,true);
  assert.equal(inferred.recognized.subject,'wolf');
  assert.equal(inferred.recognized.action,'journey');
  assert.ok(!JSON.stringify(inferred).includes('clinic'));
  assert.ok(!JSON.stringify(inferred).includes('99999'));
});
test('a permitted fictional detail near the end of a 2,000-grapheme brief still informs the local plan',()=>{
  const detail='A white eagle flies over mountains';
  const p=compileCinematicReferencePack({visualIdea:'x'.repeat(1_850)+' '+detail,plan:project({locale:'en'})});
  assert.equal(p.recognized.subject,'eagle');
  assert.equal(p.recognized.action,'flight');
  assert.equal(p.recognized.setting,'mountains');
  assert.ok(!JSON.stringify(p).includes('x'.repeat(40)));
});
test('style bible and shot references follow actual edited storyboard but never produce image references',()=>{
  const base=project({theme:'money'});
  const edited=customizeCinematicShot(base,1,base.shots[3].sceneId);
  const p=compileCinematicReferencePack({visualIdea:'Анимация про орла',plan:edited,
    answers:{actionChoice:'flight'}});
  assert.deepEqual(p.realLocalSceneIds,edited.shots.map(s=>s.sceneId));
  assert.ok(p.styleBible.palette.length===3);
  assert.equal(p.styleBible.keyframes,'text_descriptions_only');
  assert.equal(p.styleBible.actualGeneratedImages,false);
  assert.ok(p.shots.every((s,i)=>s.localSceneId===edited.shots[i].sceneId&&s.startSeconds===edited.shots[i].startSeconds));
  assert.ok(p.shots.every(shot=>typeof shot.artOnlyPrompt==='string'&&shot.artOnlyPrompt.includes('fictional only')));
  assert.ok(p.shots.every(shot=>!shot.artOnlyPrompt.includes('Анимация про орла')));
  const forged=structuredClone(edited);
  forged.shots[0].providerPrompt='My patient says I am sick';
  assert.throws(()=>compileCinematicReferencePack({plan:forged,visualIdea:'eagle flies'}),/invalid_cinematic_shot/);
});
test('safe Pro shot directions affect only their selected technical prompt',()=>{
  const plan=project({locale:'en'});
  const p=compileCinematicReferencePack({
    plan,visualIdea:'A white eagle flies over mountains',
    shotDirections:[{shotId:plan.shots[0].id,answers:{
      PRO_09:{selectedOptionId:'close',confirmed:true},
      PRO_16:{selectedOptionId:'follow',confirmed:true},
      PRO_19:{selectedOptionId:'back',confirmed:true},
    }}],
  });
  assert.match(p.shots[0].artOnlyPrompt,/close-up view, following the character, back light/i);
  assert.doesNotMatch(p.shots[1].artOnlyPrompt,/close-up view, following the character, back light/i);
});
test('free local capabilities stay truthful and all novel video compute routes fail closed',()=>{
  const routes=listCreativeVideoCapabilities();
  assert.equal(routes.length,4);
  assert.equal(routes.find(r=>r.id==='local_canvas')?.ready,true);
  assert.equal(routes.find(r=>r.id==='local_canvas')?.producesNovelAiPixels,false);
  assert.ok(routes.filter(r=>r.id!=='local_canvas').every(r=>r.ready===false&&r.chargeMinor===null));
});
test('existing director exposes one free visual prompt and actual local montage, not fake paid render',()=>{
  const ui=read('components/mandala-cinematic-director.tsx');
  const css=read('components/mandala-cinematic-director.module.css');
  assert.match(ui,/data-director-visual-idea/);
  assert.match(ui,/data-director-contextual-questions/);
  assert.match(ui,/data-director-reference-pack/);
  assert.match(ui,/data-director-new-ai-status/);
  assert.match(ui,/data-director-category/);
  assert.match(ui,/questionsForGroup/);
  assert.match(ui,/projectFieldsFromAnswers/);
  assert.match(ui,/data-director-shot-select/);
  assert.match(ui,/shotDirections/);
  assert.match(ui,/sceneSelected:Boolean\(selectedShotNumber\)/);
  for(const group of ['personalization','principal','advanced','pro','extra'])assert.match(ui,new RegExp(group));
  assert.match(ui,/creativeReferencePack:referencePack/);
  assert.match(ui,/newAiVideoAvailable/);
  assert.match(ui,/data-director-apply-montage/);
  assert.match(css,/\.ideaInput textarea/);
  assert.match(css,/\.reference/);
  assert.match(css,/:focus-visible/);
  assert.doesNotMatch(ui,/fetch\(["']https?:\/\/|sendBeacon|localStorage|sessionStorage/);
});
