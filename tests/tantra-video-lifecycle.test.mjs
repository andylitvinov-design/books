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
    const media = { pause() { pauses++; } };
    const details = { open: true, querySelectorAll() { return [media]; } };
    tree.props.onToggle({ currentTarget: details });
    assert.equal(model.updates(), 0);
    details.open = false; tree.props.onToggle({ currentTarget: details });
    tree.props.onToggle({ currentTarget: details });
    assert.equal(model.updates(), 2);
    assert.equal(pauses, 2);
    details.open = true; tree.props.onToggle({ currentTarget: details });
    assert.equal(model.updates(), 2);
    assert.equal(pauses, 2);
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
 assert.equal((source.match(/currentTime\s*=/g)||[]).length,1,'Only the explicit reconstruction seek may assign time');
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

for(const action of ['onPlay','onSeeking','onPointerDown','onKeyDown'])test(`${action} after reopening cancels obsolete recovery without changing user controls`,()=>{
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

for(const action of ['onPlay','onSeeking','onPointerDown','onKeyDown'])test(`${action} before loadstart cancels obsolete recovery`,()=>{
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
