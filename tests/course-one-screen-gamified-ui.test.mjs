import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import vm from 'node:vm';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = (path) => readFileSync(join(root, path), 'utf8');

const opora = source('components/app/course-slide-player.jsx');
const oporaCss = source('components/app/course-slide-player.module.css');
const map = source('components/app/course-quest.jsx');
const mapCss = source('components/app/course-quest.module.css');
const academy = source('components/energywork-ai-learner.tsx');
const academyCss = source('components/energywork-ai-learner.module.css');

// Source-bound JSX fragments and handlers: no browser, curriculum evaluation,
// network client or device. External persistence/OAuth effects are synthetic.
const academyAst = ts.createSourceFile('energywork-ai-learner.tsx', academy, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
assert.equal(academyAst.parseDiagnostics.length, 0);
const learner = academyAst.statements.find(node => ts.isFunctionDeclaration(node) && node.name?.text === 'EnergyworkAiLearner');
assert.ok(learner?.body);
const descendants = node => { const values = [node]; ts.forEachChild(node, child => { values.push(...descendants(child)); }); return values; };
// Traverse only the component's actual direct return, never dormant helpers or
// declarations. Preserve the ancestor branch predicates of extracted controls.
const learnerReturns = learner.body.statements.filter(ts.isReturnStatement);
assert.equal(learnerReturns.length, 1, 'one direct learner render');
const learnerRender = learnerReturns[0].expression;
assert.ok(learnerRender);
const learnerNodes = descendants(learnerRender);
function visibilityFor(node) {
  const guards=[];
  let child=node;
  while(child!==learnerRender){
    const parent=child.parent;
    assert.ok(parent,'selected JSX belongs to the actual learner render');
    if(ts.isConditionalExpression(parent)){
      assert.ok(child===parent.whenTrue||child===parent.whenFalse,'JSX must be a rendered branch');
      guards.push((child===parent.whenTrue?'':'!')+'('+parent.condition.getText(academyAst)+')');
    }else if(ts.isBinaryExpression(parent)){
      assert.equal(child,parent.right,'JSX must be the conditionally rendered operand');
      const kind=parent.operatorToken.kind;
      assert.ok(kind===ts.SyntaxKind.AmpersandAmpersandToken||kind===ts.SyntaxKind.BarBarToken,'known JSX visibility condition');
      guards.push((kind===ts.SyntaxKind.AmpersandAmpersandToken?'':'!')+'('+parent.left.getText(academyAst)+')');
    }else{
      assert.ok(ts.isJsxElement(parent)||ts.isJsxFragment(parent)||ts.isJsxExpression(parent)||ts.isParenthesizedExpression(parent),
        'selected fragment must remain on a direct JSX render path');
    }
    child=parent;
  }
  return guards;
}
const visibleFragment = node => '('+(visibilityFor(node).join(' && ')||'true')+') ? ('+node.getText(academyAst)+') : null';

const attribute = (node, name) => (ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null)
  ?.attributes.properties.find(prop => ts.isJsxAttribute(prop) && prop.name.getText(academyAst) === name);
const expression = (node, name) => attribute(node, name)?.initializer?.expression?.getText(academyAst);
function oneElement(predicate) {
  const matches = learnerNodes.filter(node => (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) && predicate(node));
  assert.equal(matches.length, 1, 'one actual learner JSX element'); return matches[0];
}
const savedLine = oneElement(node => attribute(node, 'data-reiki-private-save-status'));
const footer = oneElement(node => expression(node, 'className') === 'styles.footer');
assert.deepEqual(visibilityFor(savedLine), [], 'save status must be unconditionally reachable in actual render');
assert.deepEqual(visibilityFor(footer), [], 'navigation must be unconditionally reachable in actual render');
const firstConsent = oneElement(node => expression(node, 'checked') === 'firstLessonConsent');
const finishButton = oneElement(node => expression(node, 'onClick') === 'finishForToday');
const learnerVideo = oneElement(node => node.tagName?.getText(academyAst) === 'ReikiLessonVideo');
const treeNodes = tree => !tree || typeof tree !== 'object' ? [] : Array.isArray(tree) ? tree.flatMap(treeNodes) : [tree, ...treeNodes(tree.props?.children)];
const treeText = tree => tree == null || typeof tree === 'boolean' ? '' : typeof tree !== 'object' ? String(tree) : Array.isArray(tree) ? tree.map(treeText).join(' ') : treeText(tree.props?.children);
const compile = source => ts.transpileModule(source, {fileName:'fixture.tsx', compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const jsx = (type, props) => ({type, props});
const words = new Proxy({}, {get:(_,name)=>String(name)});
function academySaveHarness(overrides={}) {
  const writes=[], storageWrites=[], navigations=[], errors=[], hydrated=[], completions=[];
  const storage=new Map();
  const handlers = ['startSaving','signIn','saveLessonOneToCabinet','next','finishForToday'].map(name => {
    const matches=learner.body.statements.filter(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
    assert.equal(matches.length,1,'actual '+name+' handler'); return matches[0].getText(academyAst);
  }).join('\n');
  const runtime={exports:{},
    require:key=>{assert.equal(key,'react/jsx-runtime');return {jsx,jsxs:jsx,Fragment:'Fragment'}},
    styles:words,t:words,locale:'en',LockKeyhole:'LockKeyhole',Link:'Link',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',BookOpen:'BookOpen',
    sync:'guest',slide:{id:'flight-done',kind:'milestone'},slides:[{id:'flight-done'},{id:'tan-01'}],index:0,
    busy:false,consented:false,shareConsented:false,firstLessonConsent:false,completed:false,
    experienceMissing:false,feedbackMissing:false,tantraStudyMissing:false,otherStudyMissing:false,isMeditationFeedback:false,
    saveError:null,dirtyRef:{current:new Set()},progressRef:{current:'flight-done'},accountIdRef:{current:'synthetic-owner'},
    answersRef:{current:{}},authorizedOAuthLeave:{current:false},ENERGYWORK_COURSE_VERSION:'synthetic-version',
    ENERGYWORK_FIRST_LESSON_STORAGE_KEY:'synthetic-handoff-key',
    energyworkCreateFirstLessonHandoff:(_answers,locale,_now,afterSave)=>JSON.stringify({locale,afterSave,answers:{}}),
    energyworkReadFirstLessonHandoff:value=>value?JSON.parse(value):null,
    energyworkAdvanceAlreadyStored:()=>false,
    hydrate:value=>hydrated.push(value),completeFirstLesson:async value=>completions.push(value),
    appFetch:async (...args)=>{writes.push(args);return args[0]==='auth/start'?{redirectUrl:'https://oauth.example.test/authorize'}:{accountId:'synthetic-owner'}},
    store:async id=>{writes.push(['store',id])},previous(){},reloadProgress(){writes.push(['reload'])},
    window:{sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>{storageWrites.push({key,value});storage.set(key,value)}},location:{assign:url=>navigations.push(url)}},
    ...overrides,
  };
  for(const [name,key] of [['setBusy','busy'],['setConsented','consented'],['setShareConsented','shareConsented'],['setFirstLessonConsent','firstLessonConsent']])runtime[name]=value=>{runtime[key]=value};
  runtime.setSaveError=value=>{runtime.saveError=value;errors.push(value)};
  runtime.setIndex=value=>{runtime.index=typeof value==='function'?value(runtime.index):value};
  const source=handlers+`\nfunction view(){return <>${savedLine.getText(academyAst)}${footer.getText(academyAst)}</>}; globalThis.render=view; globalThis.renderFirstConsent=()=>(${visibleFragment(firstConsent)}); globalThis.renderFinishButton=()=>(${visibleFragment(finishButton)}); globalThis.finish=finishForToday;`;
  vm.runInNewContext(compile(source),runtime,{timeout:1000});
  return {runtime,writes,storageWrites,navigations,errors,hydrated,completions,render:()=>runtime.render()};
}
const byHandler = (tree,name) => treeNodes(tree).find(node=>node.type==='button'&&node.props.onClick?.name===name);

test('OPORA: one-screen lesson uses a compact progress bar and real choice handling', () => {
  assert.match(opora, /data-course-one-screen="v1"/);
  assert.match(opora, /role="progressbar"/);
  assert.match(opora, /style=\{\{width:progress \+ '%'\}\}/);
  assert.match(opora, /onClick=\{\(\)=>void updatePreferences\(\{length:'quick'\}\)\}/);
  assert.match(opora, /onClick=\{\(\)=>void updatePreferences\(\{length:'standard'\}\)\}/);
  assert.match(opora, /onClick=\{\(\)=>void updatePreferences\(\{imagery:'no_imagery'\}\)\}/);
  assert.match(opora, /data-course-optional-explanation/);
  assert.match(opora, /<details className=\{styles\.supportDetails\}/);
  assert.match(opora, /lesson\.antiStress\?\.neutralText\|\|lesson\.disclaimer/);
  assert.match(opora, /onClick=\{finished/);
  assert.match(oporaCss, /HH ONE SCREEN COURSE 2026-10-17/);
  assert.match(oporaCss, /\.overlay\[data-course-one-screen\] \.footer/);
  assert.match(oporaCss, /\.overlay\[data-course-one-screen\] \.primary \{order:1;\}/);
});

test('OPORA: small screens prioritize first screen while preserving accessibility fallback', () => {
  assert.match(oporaCss, /@media\(max-width:700px\)/);
  assert.match(oporaCss, /@media\(max-width:700px\) and \(max-height:740px\)/);
  assert.match(oporaCss, /height:clamp\(110px,23dvh,177px\)/);
  assert.match(oporaCss, /object-fit:contain/);
  assert.match(oporaCss, /overflow-y:auto;overflow-x:hidden/);
  assert.match(opora, /words\.safety/);
  assert.match(opora, /onDiscomfort=/);
  assert.match(opora, /onStopPractice=/);
  assert.doesNotMatch(oporaCss.slice(oporaCss.indexOf('HH ONE SCREEN COURSE 2026-10-17')), /\.content\{overflow:hidden/);
});

test('OPORA learning path: five nearby steps and a manual 14-day reveal without progress rewrites', () => {
  assert.match(map, /const \[showAllDays, setShowAllDays\] = useState\(false\)/);
  assert.match(map, /const visibleRoadmap = showAllDays \? roadmap : roadmap\.filter/);
  assert.match(map, /item\.day < firstVisibleDay \+ 5/);
  assert.match(map, /\{visibleRoadmap\.map/);
  assert.match(map, /aria-expanded=\{showAllDays\}/);
  assert.match(map, /View all 14 lessons/);
  assert.match(map, /onClick=\{\(\) => \{ setShowAllDays\(value => !value\); setSelected\(null\) \}\}/);
  assert.match(map, /const xp = 20 \* count/);
  assert.match(mapCss, /\.mapShell \.pathToggle/);
});

test('Academy: current bottom save status retains guest, consent and authenticated persistence', async () => {
  assert.match(academy, /data-course-one-screen="v1"/);
  assert.match(academy, /data-energywork-slide-kind=\{slide\.kind\}/);
  const slideSection=oneElement(node=>node.openingElement?.tagName.getText(academyAst)==='section' && attribute(node,'data-energywork-slide-kind'));
  assert.ok(savedLine.pos > slideSection.end && savedLine.end < footer.pos,'private status remains after lesson and before navigation');
  const guest=academySaveHarness();
  assert.match(treeText(guest.render()),/preview/);
  const next=byHandler(guest.render(),'next');assert.ok(next);assert.equal(next.props.disabled,true);
  await next.props.onClick();
  assert.equal(guest.writes.length,0);assert.equal(guest.storageWrites.length,0);assert.equal(guest.navigations.length,0);
  guest.runtime.renderFirstConsent().props.onChange({target:{checked:true}});
  const accepted=byHandler(guest.render(),'next');assert.equal(accepted.props.disabled,false);
  await accepted.props.onClick();
  assert.equal(guest.storageWrites.length,1,'only affirmative first-lesson save writes the same-tab handoff');
  assert.deepEqual(guest.writes.map(args=>args[0]),['auth/start'],'guest cannot write authenticated course progress');
  assert.deepEqual(JSON.parse(JSON.stringify(guest.writes[0][1])),{locale:'en',continueTo:'energywork'});
  assert.deepEqual(guest.navigations,['https://oauth.example.test/authorize']);
  await accepted.props.onClick();assert.equal(guest.writes.length,1,'busy retained callback cannot launch OAuth twice');

  const consent=academySaveHarness({sync:'consent',slide:{id:'flight-01',kind:'reflection'}});
  const start=byHandler(consent.render(),'startSaving');assert.ok(start);assert.equal(start.props.disabled,true);
  await start.props.onClick();assert.equal(consent.writes.length,0);
  const checkbox=treeNodes(consent.render()).find(node=>node.type==='input');
  assert.ok(checkbox);checkbox.props.onChange({target:{checked:true}});
  const enabled=byHandler(consent.render(),'startSaving');assert.equal(enabled.props.disabled,false);await enabled.props.onClick();
  assert.equal(consent.writes.length,1);
  assert.deepEqual(JSON.parse(JSON.stringify(consent.writes[0])),['academy-energywork',{
    action:'start',consent:true,teacherConsent:false,version:'synthetic-version'},'POST',{accountId:'synthetic-owner'}]);
  assert.equal(consent.hydrated.length,1);assert.equal(consent.runtime.consented,false);assert.equal(consent.runtime.shareConsented,false);
  assert.equal(consent.storageWrites.length,0);

  const ready=academySaveHarness({sync:'ready',slide:{id:'flight-01',kind:'reflection'}});
  assert.match(treeText(ready.render()),/saved/);
  const courseLink=treeNodes(ready.render()).find(node=>node.type==='Link');
  assert.equal(courseLink.props.href,'/en/app/course?view=courses');assert.equal(courseLink.props.prefetch,false);
  ready.runtime.dirtyRef.current.add('flight-01');assert.match(treeText(ready.render()),/saving/);
  const unavailable=academySaveHarness({sync:'unavailable'});
  assert.match(treeText(unavailable.render()),/offline/);
  await byHandler(unavailable.render(),'next').props.onClick();assert.equal(unavailable.writes.length,0);
});

test('Academy: save failures and invalid OAuth keep the learner in place without claiming success', async () => {
  for(const status of [403,500]){
    const h=academySaveHarness({sync:'consent',consented:true,slide:{id:'flight-01',kind:'reflection'},appFetch:async()=>{throw {status}}});
    await byHandler(h.render(),'startSaving').props.onClick();
    assert.equal(h.hydrated.length,0);assert.equal(h.navigations.length,0);assert.equal(h.runtime.busy,false);
    assert.equal(h.runtime.saveError,status===403?'accountError':'saveFailed');
    assert.equal(h.runtime.consented,true,'a failed save must not pretend consent was consumed by a confirmed start');
  }
  const bad=academySaveHarness({firstLessonConsent:true,appFetch:async()=>({redirectUrl:'javascript:untrusted'})});
  await byHandler(bad.render(),'next').props.onClick();
  assert.equal(bad.navigations.length,0);assert.equal(bad.runtime.authorizedOAuthLeave.current,false);assert.equal(bad.runtime.saveError,'signupError');
  const failed=academySaveHarness({sync:'ready',store:async()=>{throw {status:409}}});
  await failed.runtime.finish();assert.equal(failed.navigations.length,0);assert.equal(failed.runtime.saveError,'conflict');
  const saved=academySaveHarness({sync:'ready'});
  await saved.runtime.renderFinishButton().props.onClick();
  assert.deepEqual(saved.writes,[['store','tan-01']]);assert.deepEqual(saved.navigations,['/en/app/course?view=courses']);
});

test('Academy: immersive mobile viewport still scrolls dense lessons and keeps real video', () => {
  assert.match(academyCss, /HH ONE SCREEN COURSE 2026-10-17/);
  assert.match(academyCss, /position:fixed;inset:0;z-index:2147483000;height:100dvh/);
  assert.match(academyCss, /overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain/);
  assert.match(academyCss, /\.page\[data-course-one-screen\] \.next\{/);
  assert.match(academyCss, /\.page\[data-course-one-screen\] \.art\{/);
  assert.match(academy, /<AcademyVideoPlayer key=\{slide\.id\}/);
  // The old t.stop was guest preview copy, not a stop handler. Real video
  // remains source-bound without an explicit autoplay request; missing media
  // renders an honest fallback. Child player defaults are outside this fixture.
  const video=academyAst.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='ReikiLessonVideo');
  assert.ok(video);
  const runtime={exports:{},copy:{en:words},styles:words,AcademyVideoPlayer:'AcademyVideoPlayer',PlayCircle:'PlayCircle',
    require:key=>{assert.equal(key,'react/jsx-runtime');return {jsx,jsxs:jsx}}};
  vm.runInNewContext(compile(video.getText(academyAst)+';globalThis.view=ReikiLessonVideo'),runtime,{timeout:1000});
  const slide={id:'synthetic-video',kind:'video',title:{en:'Synthetic lesson'}};
  const caller={exports:{},slide,locale:'en',media:{youtubeId:'original-synthetic',title:'Original'},lessonVideo:undefined,
    ReikiLessonVideo:'ReikiLessonVideo',require:runtime.require};
  vm.runInNewContext(compile('globalThis.render=()=>('+visibleFragment(learnerVideo)+')'),caller,{timeout:1000});
  const invoked=caller.render();assert.ok(invoked,'actual learner invokes its real video helper on video slides');
  assert.equal(invoked.type,'ReikiLessonVideo');assert.equal(invoked.props.slide,slide);assert.equal(invoked.props.original,caller.media);
  caller.slide={...slide,kind:'reflection'};assert.equal(caller.render(),null,'video is not mounted on unrelated reflection screens');
  for(const [lessonVideo,original,id,role,title] of [
    [{youtubeId:'intro-synthetic',title:{en:'Intro'}},{youtubeId:'original-synthetic',title:'Original'},'intro-synthetic','introduction','Intro'],
    [undefined,{youtubeId:'original-synthetic',title:'Original'},'original-synthetic','meditation','Original'],
  ]){
    const tree=runtime.view({slide,locale:'en',lessonVideo,original});
    assert.equal(tree.props['data-reiki-media-role'],role);
    const player=treeNodes(tree).find(node=>node.type==='AcademyVideoPlayer');assert.ok(player);
    assert.equal(player.props.youtubeId,id);assert.equal(player.props.title,title);assert.equal(player.props.autoPlay,undefined);
  }
  const missing=runtime.view({slide,locale:'en',original:null});
  assert.equal(treeNodes(missing).some(node=>node.type==='AcademyVideoPlayer'),false);
  assert.match(treeText(missing),/unavailable/);
});
