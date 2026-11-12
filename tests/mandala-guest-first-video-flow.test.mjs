import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
const studio=readFileSync(new URL('../components/mandala-free-video-studio.tsx',import.meta.url),'utf8')
const credits=readFileSync(new URL('../lib/video-credits/client.mjs',import.meta.url),'utf8')

test('first guest video does not need an account-bound XP hold, but signed-in videos do',()=>{
  assert.match(credits,/action==='status'&&response\.status===401/)
  assert.match(credits,/body\?\.error==='SIGN_IN_REQUIRED'/)
  assert.match(studio,/creditSession==="guest"&&!guestFirstVideoUsed/)
  assert.match(studio,/const guestLocalRender=creditCatalog\.chargeRequired&&creditSession==="guest"&&!guestFirstVideoUsed/)
  assert.match(studio,/if\(creditCatalog\.chargeRequired&&!guestLocalRender\)\{[\s\S]*?videoCreditRequest\("hold"/)
  assert.match(studio,/if\(guestLocalRender\)\{setCreditConfirmed\(true\)/)
  assert.match(studio,/if\(result&&result\.mode!=="catalog"&&guestRenderRef\.current&&playbackStatus==="ready"\)/)
  assert.match(studio,/setGuestFirstVideoUsed\(true\)/)
  assert.match(studio,/error\.message==="SIGN_IN_REQUIRED"\?"guest":"unavailable"/)
  assert.doesNotMatch(studio,/Sign in to create videos\./)
})

test('Montage advances Style, Audio, Text, Storyboard, Story then Hypno without charging',()=>{
 const handler=studio.slice(studio.indexOf('const continueMontageOrGenerate='),
   studio.indexOf('// First mobile step is only',studio.indexOf('const continueMontageOrGenerate=')));
 assert.ok(handler.includes('if(montagePanel==="effects"){'));
 assert.ok(handler.includes('setMontagePanel("text")'));
 assert.ok(handler.includes('setBasicPanelTab("music")'));
 assert.ok(handler.includes('setActiveWorkspace("effects")'));
 assert.ok(handler.includes('setMontagePanel("audio")'));
  assert.ok(handler.includes('if(montagePanel==="audio"){'));
  assert.ok(handler.includes('setMontagePanel("text")'),"Audio advances to the Text/affirmations editor");
  assert.ok(handler.includes('setHypnoEntryGroup("effects")'),"optional Hypno preserved");
 assert.ok(!handler.includes('startFromHero()'));
 assert.ok(!handler.includes('createQuickVideo()'),"Add Effects must never encode or charge credits");
 const direct=studio.slice(studio.indexOf('data-video-quick-generate'),studio.indexOf('</button>',studio.indexOf('data-video-quick-generate')));
 const next=studio.slice(studio.indexOf('data-video-montage-next={montagePanel==="effects"?"audio":montagePanel==="audio"?"text":montagePanel==="text"?"settings":montagePanel==="settings"?"concept":"hypno"}'),studio.indexOf('</button>',studio.indexOf('data-video-montage-next={montagePanel==="effects"?"audio":montagePanel==="audio"?"text":montagePanel==="text"?"settings":montagePanel==="settings"?"concept":"hypno"}')));
 assert.ok(direct.includes('onClick={createQuickVideo}'));
 assert.ok(next.includes('onClick={continueMontageOrGenerate}'));
 assert.ok(next.includes('montagePanel==="audio"?"text"'));
  assert.ok(next.includes('montagePanel==="text"?"settings"'));
  assert.ok(next.includes('montagePanel==="settings"?"concept"'));
 assert.ok(studio.includes('if(!freeVideoSelected){'),"paid formats stay explicitly gated");
 assert.ok(studio.includes('<MandalaVideoConcept locale={locale}'));
 assert.ok(studio.includes('onApprove={approved=>'));
 assert.ok(studio.includes('data-video-concept-text-tools'));
});


test('stale phrase narration blocks direct Generate, not the Add Affirmations navigation',()=>{
 const stage=studio.indexOf('data-video-stage-actions="montage"');
 assert.ok(stage>0,"real final action group");
 const fromCreate=studio.indexOf('data-video-quick-generate',stage);
 const create=studio.slice(fromCreate,studio.indexOf('</button>',fromCreate));
 const addStart=studio.indexOf('data-video-montage-next={montagePanel===',stage);
 const add=studio.slice(addStart,studio.indexOf('</button>',addStart));
 assert.ok(addStart>stage&&addStart<fromCreate,"Affirmations precedes Create Video");
 assert.match(create,/disabled=\{!studioHydrated\|\|recording\|\|preparing\|\|narrationInvalid\}/);
 assert.match(create,/onClick=\{createQuickVideo\}/);
 assert.match(add,/onClick=\{continueMontageOrGenerate\}/);
 assert.doesNotMatch(add,/narrationInvalid/);
 assert.match(studio,/data-video-narration-reapproval/);
 assert.match(studio,/const narrationInvalid=Boolean\(/);
 assert.match(studio,/if\(narrationInvalid\)\{/);
});

test('guest native player is mounted without sign-in; save and share stay gated',()=>{
  const from=studio.indexOf('data-video-result hidden={!result}')
  const block=studio.slice(from,studio.indexOf('):<p>{ui.myVideosInfo}</p>}',from))
  assert.ok(from>0)
  assert.match(block,/\{result \? \(/)
  assert.match(block,/<video ref=\{resultVideoRef\}[^>]*controls playsInline preload="auto"/)
  for(const name of ['onLoadedData','onCanPlay','onPlaying'])
    assert.ok(block.includes(name+'={event=>confirmVideoPlayback(event.currentTarget)}'),name)
  assert.match(block,/data-video-verify-playback/)
  assert.match(block,/data-video-guest-play/)
  assert.match(block,/data-video-guest-save-hint/)
  assert.doesNotMatch(block,/data-video-guest-result-gate|data-video-guest-signin|data-video-guest-check-session/)
  assert.doesNotMatch(block,/result&&\(!creditCatalog\?\.chargeRequired\|\|creditSession==="signed_in"\|\|result\.mode==="catalog"\)/)
  assert.match(block,/\(!creditCatalog\?\.chargeRequired\|\|creditSession==="signed_in"\|\|result\.mode==="catalog"\) \? <>/)
  assert.match(studio,/creditCatalog\?\.chargeRequired&&creditSession!=="signed_in"\)\)return;/)
  assert.match(studio,/data-video-save-direct/)
  assert.match(studio,/data-mandala-video-download/)
})

test('PRO result uses full-size native video, never the previous 112px cropped version',()=>{
  const css=readFileSync(new URL('../components/mandala-video-mobile.module.css',import.meta.url),'utf8')
  const pro=css.slice(css.indexOf('/* Free first video: PRO shows'))
  assert.ok(pro.length>400)
  assert.match(pro,/\[data-video-result\]:not\(\[hidden\]\)\{\s*display:grid!important/)
  assert.match(pro,/object-fit:contain!important/)
  assert.match(pro,/aspect-ratio:auto!important/)
  assert.match(pro,/max-width:760px!important/)
  assert.match(pro,/max-height:62svh!important/)
  assert.match(pro,/guestPreviewActions>button:focus-visible/)
  assert.match(css,/\.studio \.result\[hidden\]\{display:none!important\}/)
})

test('real encoded result opens the existing PRO workspace and retains in-page Blob',()=>{
  const start=studio.indexOf('  // A completed local recording lives in the existing result pane.')
  const end=studio.indexOf('  // Auto-music must be ATTACHED',start)
  assert.ok(start>0&&end>start)
  const effect=studio.slice(start,end)
  function run(result){
    const frames=[],state={workspace:null,mode:null,expanded:false,scrolls:0}
    let callback=null
    const win={requestAnimationFrame(fn){frames.push(fn);return frames.length},cancelAnimationFrame(){}}
    const document={getElementById(id){
      assert.equal(id,'personal-video-result')
      return {scrollIntoView(options){assert.equal(options.behavior,'auto');state.scrolls++}}
    }}
    runInNewContext(effect,{
      result,window:win,document,useEffect(fn){callback=fn},
      setActiveWorkspace(value){state.workspace=value},
      setStudioMode(value){state.mode=value},
      setIntroPlaying(){},
      setQuickDetailedOpen(value){state.expanded=value}
    },{timeout:1000})
    assert.ok(callback)
    callback()
    while(frames.length)frames.shift()()
    return state
  }
  assert.deepEqual(run({mode:'rendered',url:'blob:local'}),{workspace:'pro',mode:'pump',expanded:true,scrolls:1})
  assert.equal(run({mode:'catalog',url:'/videos/holistic-house/unedited.mp4'}).workspace,null)
  assert.equal(run(null).scrolls,0)
})

test('failed Safari decode does not waste the free guest export',()=>{
  assert.match(studio,/guestRenderRef\.current&&playbackStatus==="ready"/)
  assert.match(studio,/setGuestFirstVideoUsed\(true\)/)
  const journey=readFileSync(new URL('../components/mandala-video-effect-journey.tsx',import.meta.url),'utf8')
  assert.match(journey,/status==="verifying"/)
  assert.match(journey,/Checking your video/)
})
