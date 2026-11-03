// Component event/lifecycle tests using mocked React hooks and media objects.
// These do not launch a browser or establish provider playback/audio behavior.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../components/tantra-video-testimonials.tsx', import.meta.url), 'utf8');
const parent = readFileSync(new URL('../components/tantra-reiki-testimonials.tsx', import.meta.url), 'utf8');
const jsx = (type, props, key) => ({ type, props, key });
const player = function AcademyVideoPlayer() {};
function mount(props) {
  let state = 0; let ref; let updates = 0; let cleanup; let effectMounted = false;
  const exports = {};
  const code = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, require(id) {
    if (id === 'react') return { useEffect(effect) { if (!effectMounted) { effectMounted = true; cleanup = effect(); } }, useRef(value) { return ref ??= { current: value }; }, useState() { return [state, value => { state = typeof value === 'function' ? value(state) : value; updates++; }]; } };
    if (id === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (id === '@/components/academy-video-player') return { AcademyVideoPlayer: player };
    throw new Error('Unexpected import: ' + id);
  } });
  return { render: () => exports.TantraVideoTestimonials(props), updates: () => updates, unmount: () => cleanup?.() };
}
function flatten(node) { if (!node || typeof node !== 'object') return []; return [node, ...[node.props?.children].flat(Infinity).flatMap(flatten)]; }
const videos = [1, 2].map(i => ({ src: `https://psitrends.com/images/example-${i}.mp4`, poster: `/images/p${i}.png`, type: 'video/mp4' }));
const labels = {
  en: { summary: 'Video testimonials · Original video · Russian audio', language: 'Original video · Russian audio', nativeLabel: 'Participant video', nativeSuffix: ' · Russian audio', youtubeTitle: 'Alena · Tantra Reiki testimonial · Russian audio' },
  ru: { summary: 'Видеоотзывы · Видео из архива · русский язык', language: 'Видео из архива · русский язык', nativeLabel: 'Видеоотзыв участника', nativeSuffix: '', youtubeTitle: 'Алёна · отзыв о Тантра Рейки' },
  es: { summary: 'Testimonios en vídeo · Vídeo original · audio en ruso', language: 'Vídeo original · audio en ruso', nativeLabel: 'Vídeo de un participante', nativeSuffix: '', youtubeTitle: 'Alena · testimonio de Tantra Reiki' },
};
for (const [locale, label] of Object.entries(labels)) {
  test(`${locale}: close pauses both media objects, preserves positions and resets only YouTube`, () => {
    const model = mount({ ...label, videos, initiallyOpen: locale !== 'en' });
    let tree = model.render();
    assert.equal(tree.type, 'details');
    assert.equal(tree.props.open, locale !== 'en');
    const media = [12.5, 47].map(currentTime => ({ currentTime, paused: false, calls: 0, pause() { this.paused = true; this.calls++; } }));
    const details = { open: true, querySelectorAll(selector) { assert.equal(selector, 'video'); return media; } };
    tree.props.onToggle({ currentTarget: details });
    const oldPlayer = flatten(tree).find(x => x.type === player);
    details.open = false;
    tree.props.onToggle({ currentTarget: details });
    assert.deepEqual(media.map(x => x.paused), [true, true]);
    assert.deepEqual(media.map(x => x.currentTime), [12.5, 47]);
    tree = model.render();
    const nextPlayer = flatten(tree).find(x => x.type === player);
    assert.notEqual(nextPlayer.key, oldPlayer.key);
    assert.equal(nextPlayer.props.youtubeId, 'qM_nFUkYJ1k');
    assert.equal(nextPlayer.props.title, label.youtubeTitle);
    assert.deepEqual(flatten(tree).filter(x => x.type === 'video').map(x => x.props.preload), ['none', 'none']);
    assert.equal(flatten(tree).filter(x => x.type === 'iframe').length, 0);
    assert.deepEqual(flatten(tree).filter(x => x.type === 'figure' && x.key).map(x => x.key), videos.map(x => x.src));
  });
  test(`${locale}: closed cleanup is repeat-safe and open toggle never starts or resets playback`, () => {
    const model = mount({ ...label, videos, initiallyOpen: locale !== 'en' });
    const tree = model.render();
    let pauses = 0;
    const media = { paused: false, pause() { pauses++; this.paused = true; } };
    const details = { open: true, querySelectorAll() { return [media]; } };
    tree.props.onToggle({ currentTarget: details });
    assert.equal(model.updates(), 0);
    details.open = false; tree.props.onToggle({ currentTarget: details });
    tree.props.onToggle({ currentTarget: details });
    assert.equal(model.updates(), 2);
    assert.equal(pauses, 1, 'Repeat close must not pause a stopped decoder again');
    details.open = true; tree.props.onToggle({ currentTarget: details });
    assert.equal(model.updates(), 2);
    assert.equal(pauses, 1);
  });
  test(`${locale}: missed pre-hydration open still cleans up the first observed closed toggle`, () => {
    const model = mount({ ...label, videos, initiallyOpen: locale !== 'en' });
    const tree = model.render();
    // Native details/media controls operated before React attached its listener.
    // Only the eventual close is observed; no synthetic open event is supplied.
    const media = [11, 22].map(currentTime => ({ currentTime, paused: false, pause() { this.paused = true; } }));
    tree.props.onToggle({ currentTarget: { open: false, querySelectorAll() { return media; } } });
    assert.deepEqual(media.map(x => x.paused), [true, true]);
    assert.deepEqual(media.map(x => x.currentTime), [11, 22]);
    assert.equal(model.updates(), 1);
    assert.notEqual(flatten(model.render()).find(x => x.type === player).key, flatten(tree).find(x => x.type === player).key);
  });
}
test('source contract: locale key and original titles/audio labels stay in server component', () => {
  assert.match(parent, /<TantraVideoTestimonials\s+key=\{locale\}/);
  assert.match(parent, /initiallyOpen=\{locale !== "en"\}/);
  assert.match(parent, /nativeSuffix=\{locale === "en" \? " · Russian audio" : ""\}/);
  for (const text of ['Video testimonials', 'Видеоотзывы', 'Testimonios en vídeo', 'qM_nFUkYJ1k']) assert.ok((parent + source).includes(text));
});
test('cleanup handler contains no direct provider command/fetch, autoplay or CSP mutation', () => {
  assert.doesNotMatch(source, /fetch\(|postMessage\(|\.play\(|autoplay=|innerHTML|contentWindow|location\./);
  assert.match(source, /<summary onClickCapture=\{onSummaryClickCapture\}>\{props.summary\}<\/summary>/);
  assert.match(source, /onToggle=\{onToggle\}/);
});

for (const locale of Object.keys(labels)) test(`${locale}: summary activation pauses while still open without canceling native activation`, () => {
  const model = mount({ ...labels[locale], videos, initiallyOpen: true });
  const tree = model.render(); const summary = flatten(tree).find(x => x.type === 'summary');
  const media = [12.5, 47].map(currentTime => ({ currentTime, paused: false, pause() { this.openWhenPaused=details.open; this.paused = true; } }));
  const details = { open: true, querySelectorAll(selector) { assert.equal(selector, 'video'); return media; } };
  summary.props.onClickCapture({ currentTarget: { closest(selector) { assert.equal(selector, 'details'); return details; } }, preventDefault() { assert.fail('Native activation must not be prevented'); }, stopPropagation() { assert.fail('Native activation must propagate'); } });
  assert.deepEqual(media.map(x => x.paused), [true, true]);
  assert.deepEqual(media.map(x => x.currentTime), [12.5, 47]);assert.deepEqual(media.map(x=>x.openWhenPaused),[true,true]);assert.equal(details.open, true);assert.equal(model.updates(), 0);
  details.open = false;tree.props.onToggle({currentTarget: details});assert.equal(model.updates(), 1);
});
test('closing a mixed native video section pauses only active media, once across both event handlers', () => {
  const model=mount({...labels.en,videos,initiallyOpen:true});
  const tree=model.render(),summary=flatten(tree).find(node=>node.type==='summary');
  const active={currentTime:30.5,currentSrc:videos[0].src,paused:false,calls:0,
    pause(){this.calls++;this.paused=true}};
  const stopped={currentTime:17.9,currentSrc:videos[1].src,paused:true,calls:0,
    pause(){this.calls++;throw Error('Redundant pause poisons the idle WebKit decoder')}};
  const details={open:true,querySelectorAll(selector){
    assert.equal(selector,'video');return [active,stopped];
  }};
  summary.props.onClickCapture({currentTarget:{closest(){return details}}});
  assert.equal(active.calls,1);assert.equal(stopped.calls,0);
  details.open=false;
  tree.props.onToggle({currentTarget:details});
  tree.props.onToggle({currentTarget:details});
  assert.equal(active.calls,1,'close toggle cannot pause the same decoder twice');
  assert.equal(stopped.calls,0,'already-paused video must never receive pause()');
  assert.deepEqual([active.currentTime,stopped.currentTime],[30.5,17.9]);
  assert.equal(model.updates(),2,'YouTube poster cleanup still runs on close');
});

test('opening summary and absent ancestor never pause or reset any player', () => {
  const model=mount({...labels.en,videos,initiallyOpen:false});const summary=flatten(model.render()).find(x=>x.type==='summary');
  for(const details of [null,{open:false,querySelectorAll(){assert.fail('Opening must not access media')}}])summary.props.onClickCapture({currentTarget:{closest(){return details}}});
  assert.equal(model.updates(),0);
});
// The old blanket ban on currentTime writes/onPlay observers prevented recovery
// of WebKit's decoded frame after reconstruction. Keep the stronger user-facing
// contract: only a captured, still-paused reconstruction may seek once; controls win.
test('native explicit play observer never controls playback and media identity is preserved', () => {
 const model=mount({...labels.en,videos,initiallyOpen:true});const tree=model.render();
 for(const el of flatten(tree).filter(x=>x.type==='video')){
  const media={pause(){assert.fail('observer cannot pause')},play(){assert.fail('observer cannot play')}};
  el.props.onPlay({currentTarget:media,preventDefault(){assert.fail('cannot prevent play')}});
  assert.equal(el.props.onPlayCapture,undefined);assert.equal(el.props.onClickCapture,undefined);assert.equal(el.props.controls,true);
 }
 assert.doesNotMatch(source,/preventDefault\(|stopPropagation\(|\.load\(|setTimeout\(|setInterval\(/);
 assert.equal((source.match(/currentTime\s*=/g)||[]).length,3,'Only paused reconstruction, decoded-frame resume and one user-play stalled-decoder recovery may seek');
 assert.match(source,/onPlay=\{onNativePlay\} onPlaying=\{onNativePlay\}/);
 assert.match(source,/video\.currentTime = saved\.time/);
});

function recoveryFixture(overrides={}){
 const model=mount({...labels.es,videos,initiallyOpen:true}),tree=model.render();
 const handlers=flatten(tree).find(x=>x.type==='video').props;
 let position=5.391310898,decoder=0;
 const writes=[];
 const media={currentSrc:videos[0].src,duration:236,paused:false,seeking:false,ended:false,
  get currentTime(){return position},set currentTime(value){writes.push(value);position=value;decoder=value},
  pause(){this.paused=true},play(){assert.fail('Recovery must never start playback')},...overrides};
 const details={open:true,querySelectorAll(){return [media]}};
 const event={currentTarget:media};
 const close=()=>{details.open=false;tree.props.onToggle({currentTarget:details})};
 const reopen=()=>{details.open=true;tree.props.onToggle({currentTarget:details})};
 const reconstruct=()=>{handlers.onLoadStart(event);handlers.onLoadedMetadata(event)};
 return {model,handlers,media,event,close,reopen,reconstruct,writes,decoder:()=>decoder,setPosition:value=>{position=value}};
}

test('paused decoder reconstruction seeks exactly once to captured time, including unchanged cached DOM time',()=>{
 const f=recoveryFixture();f.close();f.reopen();
 f.handlers.onLoadedMetadata(f.event);assert.deepEqual(f.writes,[],'Initial metadata without a post-close reload cannot seek');
 f.reconstruct();assert.deepEqual(f.writes,[5.391310898]);assert.equal(f.decoder(),5.391310898);assert.equal(f.media.paused,true);
 f.reconstruct();assert.equal(f.writes.length,1,'No retry loop or second seek from repeated metadata');
});

test('repeated close notifications retain the first position and subsequent user playback starts a fresh capture',()=>{
 const f=recoveryFixture();f.close();f.setPosition(0);f.close();f.reopen();f.reconstruct();
 assert.deepEqual(f.writes,[5.391310898]);
 f.handlers.onPlay(f.event);f.media.paused=false;f.setPosition(12.25);f.close();f.reopen();f.reconstruct();
 assert.deepEqual(f.writes,[5.391310898,12.25]);
});

for(const action of ['onPlay','onSeeking'])test(`${action} after reopening cancels obsolete recovery without changing user controls`,()=>{
 const f=recoveryFixture();f.close();f.reopen();f.handlers.onLoadStart(f.event);
 const before=f.media.paused;f.handlers[action](f.event);assert.equal(f.media.paused,before);
 f.handlers.onLoadedMetadata(f.event);assert.deepEqual(f.writes,[]);
});

for(const [label,change] of [
 ['different source',f=>{f.media.currentSrc=videos[1].src}],
 ['already playing',f=>{f.media.paused=false}],
 ['new seek in flight',f=>{f.media.seeking=true}],
 ['ended playback',f=>{f.media.ended=true}],
 ['invalid duration',f=>{f.media.duration=NaN}],
 ['duration shorter than saved position',f=>{f.media.duration=2}],
 ['unmounted component',f=>f.model.unmount()],
])test(`reconstruction does not override ${label}`,()=>{
 const f=recoveryFixture();f.close();f.reopen();f.handlers.onLoadStart(f.event);change(f);
 f.handlers.onLoadedMetadata(f.event);assert.deepEqual(f.writes,[]);
});

test('a different video object cannot inherit the saved source position',()=>{
 const f=recoveryFixture();f.close();f.reopen();
 const other={...f.media};f.handlers.onLoadStart({currentTarget:other});f.handlers.onLoadedMetadata({currentTarget:other});
 assert.deepEqual(f.writes,[]);
});

for(const time of [0,-1,NaN,Infinity])test(`invalid or zero retained time ${time} never schedules a recovery`,()=>{
 const f=recoveryFixture();f.setPosition(time);f.close();f.reopen();f.reconstruct();assert.deepEqual(f.writes,[]);
});

test('already-ended media at close is not rewound by later reconstruction',()=>{
 const f=recoveryFixture({ended:true});f.close();f.reopen();f.media.ended=false;f.reconstruct();assert.deepEqual(f.writes,[]);
});

for(const action of ['onPlay','onSeeking'])test(`${action} before loadstart cancels obsolete recovery`,()=>{
 const f=recoveryFixture();f.close();f.reopen();f.handlers[action](f.event);f.reconstruct();assert.deepEqual(f.writes,[]);
});

test('metadata while closed recovers once and reopening does not perform another seek',()=>{
 const f=recoveryFixture();f.close();f.reconstruct();assert.deepEqual(f.writes,[5.391310898]);
 f.reopen();f.reconstruct();assert.deepEqual(f.writes,[5.391310898]);assert.equal(f.media.paused,true);
});

for(const resolvedSource of [videos[0].src,videos[1].src,''])test(`empty loadstart source requires exact saved source at metadata: ${resolvedSource || 'empty'}`,()=>{
 const f=recoveryFixture();f.close();f.media.currentSrc='';f.handlers.onLoadStart(f.event);
 f.media.currentSrc=resolvedSource;f.handlers.onLoadedMetadata(f.event);
 assert.deepEqual(f.writes,resolvedSource===videos[0].src?[5.391310898]:[]);
 f.media.currentSrc=videos[0].src;f.reconstruct();assert.equal(f.writes.length,resolvedSource===videos[0].src?1:0,'No second attempt');
});

test('known different source at loadstart invalidates recovery even if metadata later matches',()=>{
 const f=recoveryFixture();f.close();f.media.currentSrc=videos[1].src;f.handlers.onLoadStart(f.event);
 f.media.currentSrc=videos[0].src;f.handlers.onLoadedMetadata(f.event);assert.deepEqual(f.writes,[]);
});

test('native seek rejection is contained once without retry or control side effects',()=>{
 const f=recoveryFixture();f.close();let attempts=0;
 Object.defineProperty(f.media,'currentTime',{get:()=>5.391310898,set(){attempts++;throw new Error('Transient native seek rejection')}});
 f.media.pause=()=>assert.fail('Recovery cannot pause user controls');
 assert.doesNotThrow(()=>f.reconstruct());assert.equal(attempts,1);assert.equal(f.media.paused,true);
 assert.doesNotThrow(()=>f.reconstruct());f.reopen();assert.equal(attempts,1);assert.deepEqual(f.writes,[]);
});


function deferredWebKitFixture(overrides={}) {
  const callbacks=[];
  const f=recoveryFixture({
    requestVideoFrameCallback(fn){callbacks.push(fn);return callbacks.length;},
    ...overrides
  });
  function frame(mediaTime) {
    assert.ok(callbacks.length>0,'Expected a genuinely new decoded frame callback');
    callbacks.shift()(0,{mediaTime});
  }
  return {...f,callbacks,frame};
}
test('WebKit defers saved-position seek until an actual new decoded frame after explicit play',()=>{
  const f=deferredWebKitFixture();f.close();f.reopen();
  assert.deepEqual(f.writes,[],'Reopening a paused disclosure must never seek');
  f.media.paused=false;f.handlers.onPlay(f.event);
  f.handlers.onPlaying(f.event);
  assert.deepEqual(f.writes,[],'Preroll play/playing must not seek');
  assert.equal(f.callbacks.length,1,'Only one resumed-frame observation may run');
  f.frame(0.066666);
  f.frame(0.2);
  f.frame(0.366666);
  assert.deepEqual(f.writes,[],'Early WebKit preroll frames must never trigger a seek');
  f.frame(0.533333);
  assert.deepEqual(f.writes,[5.391310898],'Only a warmed decoded pipeline authorizes one exact recovery');
  f.handlers.onPlaying(f.event);
  assert.equal(f.writes.length,1,'Never repeat a resolved native seek');
});

test('reopened WebKit decoder cannot be sought by repeated unadvanced preroll frames',()=>{
  const f=deferredWebKitFixture();f.close();f.reopen();f.media.paused=false;
  f.handlers.onPlay(f.event);
  for(let i=0;i<7;i++)f.frame(0.066666);
  assert.deepEqual(f.writes,[],'A stuck frame-zero decoder cannot authorize another seek');
  assert.equal(f.callbacks.length,1,'Native controls remain available without a retry timer');
});
test('healthy same-source native replay advances two real frames without mutating time',()=>{
  const f=deferredWebKitFixture();f.close();f.reopen();
  f.media.paused=false;f.handlers.onPlay(f.event);
  f.frame(5.42);assert.deepEqual(f.writes,[]);assert.equal(f.callbacks.length,1);
  f.frame(5.46);assert.deepEqual(f.writes,[]);
  assert.equal(f.callbacks.length,0,'Two correctly decoded frames finish recovery monitoring');
});
test('real user seek, source replacement or paused media cancels a pending frame callback',()=>{
  for(const cancel of [
    f=>f.handlers.onSeeking(f.event),
    f=>f.handlers.onKeyDown({...f.event,key:'ArrowRight'}),
    f=>{f.media.currentSrc=videos[1].src},
    f=>{f.media.paused=true},
    f=>{f.media.seeking=true},
    f=>{f.media.ended=true}
  ]){
    const f=deferredWebKitFixture();f.close();f.reopen();
    f.media.paused=false;f.handlers.onPlay(f.event);
    cancel(f);f.frame(0.066666);
    assert.deepEqual(f.writes,[],'A new user/media state must veto the recovery seek');
  }
});
test('Space and pointer activation preserve a true play while native seeking remains authoritative',()=>{
  const f=deferredWebKitFixture();f.close();f.reopen();
  assert.equal(f.handlers.onPointerDown,undefined,'Do not intercept native play controls');
  f.handlers.onKeyDown({...f.event,key:' '});
  f.media.paused=false;f.handlers.onPlay(f.event);
  assert.equal(f.callbacks.length,1);
  f.frame(0.066666);assert.equal(f.writes.length,0,'Native play stays untouched during preroll');
  for(const at of [0.2,0.366666,0.533333])f.frame(at);
  assert.equal(f.writes.length,1,'One restored seek follows decoded warmup');
});
test('closing during an unfinished frame observer rejects stale callbacks without losing the paused position',()=>{
  const f=deferredWebKitFixture();f.close();f.reopen();
  f.media.paused=false;f.handlers.onPlay(f.event);
  assert.equal(f.callbacks.length,1);
  f.close();f.reopen();f.media.paused=false;f.handlers.onPlay(f.event);
  assert.equal(f.callbacks.length,2);
  f.frame(0.066666);assert.deepEqual(f.writes,[],'Old frame generation cannot override new state');
  f.frame(0.066666);assert.deepEqual(f.writes,[],'Fresh generation must also warm its decoder');
  for(const at of [0.2,0.366666,0.533333])f.frame(at);
  assert.deepEqual(f.writes,[5.391310898]);
});


test('WebKit stalled same-source play gets one bounded recovery only after explicit native play',()=>{
  const callbacks=[];
  const f=deferredWebKitFixture({ownerDocument:{defaultView:{requestAnimationFrame(callback){callbacks.push(callback);return callbacks.length;}}}});
  f.close();f.reopen();
  assert.deepEqual(callbacks,[],'Disclosure reopening alone never schedules playback recovery');
  f.media.paused=false;f.handlers.onPlay(f.event);
  assert.equal(callbacks.length,1,'Explicit play starts one bounded clock observation');
  callbacks.shift()(0);
  assert.deepEqual(f.writes,[],'A fresh playing decoder is never sought immediately');
  callbacks.shift()(1800);
  assert.equal(f.writes.length,1,'A genuinely stalled decoded clock gets only one backward GOP seek');
  assert.ok(f.writes[0]>=0&&f.writes[0]<5.391310898);
  f.handlers.onPlaying(f.event);
  assert.equal(f.writes.length,1,'Replayed playing event cannot start a retry loop');
});
test('WebKit healthy clock advance, native seeking and paused media cancel recovery',()=>{
  for(const cancel of [
    f=>f.setPosition(5.8),
    f=>f.handlers.onSeeking(f.event),
    f=>{f.media.paused=true},
  ]){
    const callbacks=[];
    const f=deferredWebKitFixture({ownerDocument:{defaultView:{requestAnimationFrame(callback){callbacks.push(callback);return callbacks.length;}}}});
    f.close();f.reopen();f.media.paused=false;f.handlers.onPlay(f.event);
    callbacks.shift()(0);
    cancel(f);
    callbacks.shift()(1800);
    assert.deepEqual(f.writes,[],'Healthy clock or real user/media state must veto recovery');
  }
});


test('muted same-source native video avoids hidden WebKit suspend and restores mute when visible',()=>{
  const model=mount({...labels.en,videos,initiallyOpen:true});
  const tree=model.render(),summary=flatten(tree).find(node=>node.type==='summary');
  const original={currentSrc:videos[0].src,currentTime:30.5,muted:true,
    paused:false,seeking:false,ended:false,pauses:0,
    pause(){this.paused=true;this.pauses++},
    play(){assert.fail('Never start playback when a disclosure opens')}};
  const alreadyAudible={currentSrc:videos[1].src,currentTime:15.3,muted:false,
    paused:false,seeking:false,ended:false,pauses:0,
    pause(){this.paused=true;this.pauses++},
    play(){assert.fail('Never start playback while a disclosure is closed')}};
  const details={open:true,querySelectorAll(selector){
    assert.equal(selector,'video');return [original,alreadyAudible];}};
  summary.props.onClickCapture({currentTarget:{closest(){return details}}});
  assert.deepEqual([original.paused,alreadyAudible.paused],[true,true]);
  assert.equal(original.muted,false,'paused hidden WebKit decoder is not suspended as muted');
  assert.equal(alreadyAudible.muted,false,'an unmuted user choice stays unmuted');
  details.open=false;tree.props.onToggle({currentTarget:details});
  assert.equal(original.muted,false,'duplicate close does not restore mute while hidden');
  details.open=true;tree.props.onToggle({currentTarget:details});
  assert.equal(original.muted,true,'original mute choice is restored after visibility');
  assert.equal(alreadyAudible.muted,false);
  assert.equal(original.currentTime,30.5,'close/reopen never seeks or resets position');
  assert.equal(original.paused,true,'reopening never auto-plays');
  assert.equal(original.pauses,1,'no redundant pause to poison WebKit decoder');
});

test('hidden muted recovery never applies saved preferences to a new source',()=>{
  const model=mount({...labels.en,videos,initiallyOpen:true});
  const tree=model.render();
  const video={currentSrc:videos[0].src,currentTime:24,muted:true,
    paused:false,seeking:false,ended:false,
    pause(){this.paused=true},play(){assert.fail('No automatic media play')}};
  const details={open:false,querySelectorAll(){return [video]}};
  tree.props.onToggle({currentTarget:details});
  assert.equal(video.muted,false);
  video.currentSrc=videos[1].src;video.muted=false;
  details.open=true;tree.props.onToggle({currentTarget:details});
  assert.equal(video.muted,false,'changed source must not inherit old mute choice');
  assert.equal(video.currentTime,24);
});

test('real WebKit browser acceptance requires new presented decoded frames after pipeline counter reset',()=>{
  const verifier=readFileSync(new URL('../scripts/verify-tantra-testimonials.mjs',import.meta.url),'utf8');
  const functionBody=verifier.split('async function startVisibleNative(')[1]?.split('async function focusWithoutScroll(')[0];
  assert.ok(functionBody,'The real browser acceptance must execute startVisibleNative');
  assert.match(functionBody,/frame\.at > \(before\.presentedFrame\?\.at \?\? -1\)/,'a frame after explicit native play is required');
  assert.match(functionBody,/frame\.mediaTime > before\.time \+ 0\.35/,'a genuinely advanced presented frame is required');
  assert.match(functionBody,/Math\.abs\(frame\.mediaTime - el\.currentTime\) < 0\.35/,'the frame must match the active media clock');
  assert.match(functionBody,/!el\.paused && !el\.seeking && !el\.ended && !el\.error/,'paused, stalled-seek or errored media cannot pass');
  assert.doesNotMatch(functionBody,/toBeGreaterThan\(initial\.frames\)/,'GStreamer resets this counter on a real decoder rebuild');
});
