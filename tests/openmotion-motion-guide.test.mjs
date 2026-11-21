import assert from 'node:assert/strict';
import test from 'node:test';
import * as projectModel from '../lib/mandala/video-project-v3.mjs';

const toGuide = data => '\x60\x60\x60hh-motion-v1\n'+JSON.stringify(data)+'\n\x60\x60\x60';
const data = {durationMs:3000, aspect:'portrait', fps:24,
  videoTracks:[], audioTracks:[], textTracks:[]};
const options = {projectId:'original-guide', locale:'es', assets:[], approvedAssets:[]};

test('imports a bounded declarative guide through the existing V3 validator', () => {
  const guide = toGuide({...data, textTracks:[{id:'captions',items:[
    {id:'title',text:'Respira',startMs:0,endMs:2000,position:'center',style:'minimal',approved:true},
  ]}]});
  const project = projectModel.importMotionGuideV3(guide, options);
  assert.equal(project.locale,'es');
  assert.equal(project.textTracks[0].items[0].text,'Respira');
  assert.equal(project.privacy.localOnly,true);
  assert.equal(project.export.state,'idle');
});

test('rejects executable wrappers, prototype keys and unapproved sources', () => {
  for (const guide of [
    toGuide(data)+'\n<script>run()</script>',
    toGuide({...data,src:'https://example.com/video.mp4'}),
    toGuide({...data,videoTracks:[{id:'visual',layer:0,clips:[
      {id:'shot',assetId:'unapproved',startMs:0,durationMs:3000,sourceInMs:0,sourceOutMs:3000,
        speed:1,opacityPercent:100,transitionIn:'cut',transform:{scale:1,x:0,y:0,rotation:0},mask:'none'},
    ]}]}),
    toGuide(data).replace('{"durationMs"', '{"__proto__":{},"durationMs"'),
  ]) assert.throws(()=>projectModel.importMotionGuideV3(guide, options),
    /motion_guide|mytube_v3/);
});

test('compiles a guide with approved sources, crossfade, camera transform and audio cues', () => {
  const assets = [
    {id:'scene',kind:'video',origin:'catalog',durationMs:4000,width:720,height:1280},
    {id:'bed',kind:'audio',origin:'catalog',durationMs:4000,width:0,height:0},
  ];
  const approvedAssets = assets.map(({id,kind,origin,durationMs})=>({
    id,kind,origin,durationMs,loaded:true,consentConfirmed:false,
    rightsKind:'existing_approved_first_party_master',
    path:kind==='video'?'/videos/holistic-house/scene.mp4':'/audio/mandala/bed.mp3',
  }));
  const shot = {id:'first',assetId:'scene',startMs:0,durationMs:2000,
    sourceInMs:0,sourceOutMs:2000,speed:1,opacityPercent:100,transitionIn:'cut',
    transform:{scale:1,x:0,y:0,rotation:0},mask:'none'};
  const guide = toGuide({...data,
    videoTracks:[{id:'visual',layer:0,clips:[shot,{...shot,id:'second',startMs:1500,
      durationMs:1500,transitionIn:'crossfade',transform:{...shot.transform,scale:1.1}}]}],
    audioTracks:[{id:'music',kind:'music',assetId:'bed',startMs:0,durationMs:3000,
      sourceInMs:0,gainPercent:50,fadeInMs:500,fadeOutMs:500,loop:false}],
  });
  const project = projectModel.importMotionGuideV3(guide,{...options,assets,approvedAssets});
  const plan = projectModel.compileVideoProjectV3(project,{approvedAssets});
  const frames = projectModel.resolveVideoFramesV3(plan,1750);
  assert.deepEqual(frames.map(frame=>frame.opacity),[0.5,0.5]);
  assert.equal(frames[1].transform.scale,1.1);
  assert.equal(projectModel.resolveAudioMixV3(plan,250)[0].gain,0.25);
  assert.throws(()=>projectModel.importMotionGuideV3(guide,{...options,assets,approvedAssets:[]}),
    /mytube_v3_unapproved_asset/);
});

test('a first-party preset becomes an editable localized Motion.md timeline', async () => {
  const {createPresetMotionGuideV3} = await import('../lib/mandala/openmotion-preset-guide.mjs');
  const guide=createPresetMotionGuideV3('focused-action','en');
  const parsed=JSON.parse(guide.split('\n').slice(1,-1).join('\n'));
  const ids=parsed.videoTracks[0].clips.map(clip=>clip.assetId);
  assert.deepEqual(ids,['clear-morning','solar-surge','path-to-goals','soft-horizon']);
  const assets=[
    ...ids.map(id=>({id,kind:'video',origin:'catalog',durationMs:5000,width:720,height:1280})),
    {id:'breeze',kind:'audio',origin:'catalog',durationMs:8000,width:0,height:0},
  ];
  const approvedAssets=assets.map(({id,kind,origin,durationMs})=>({
    id,kind,origin,durationMs,path:kind==='audio'?'/audio/mandala/'+id+'.wav':'/videos/holistic-house/'+id+'.mp4',
    rightsKind:'existing_approved_first_party_master',loaded:true,consentConfirmed:false,
  }));
  const project=projectModel.importMotionGuideV3(guide,{projectId:'focused-action',locale:'en',assets,approvedAssets});
  assert.equal(project.textTracks[0].items[0].text,'Focused action');
  assert.equal(project.videoTracks[0].clips[1].transitionIn,'crossfade');
  assert.equal(project.durationMs,18500);
});

test('all localized presets bind the real approved catalogue with matching aspect', async () => {
  const {createPresetMotionProjectV3}=await import('../lib/mandala/openmotion-preset-guide.mjs');
  const {default:catalogue}=await import('../data/video-catalog/free-film-presets-v2.json',{with:{type:'json'}});
  for (const preset of catalogue.presets) {
    for (const locale of ['en','ru','es']) {
      const {project,approvedAssets}=createPresetMotionProjectV3(preset.id,locale);
      assert.equal(project.textTracks[0].items[0].text,preset.label[locale]);
      assert.equal(project.videoTracks[0].clips.length,preset.clips.length);
      const [audio]=project.audioTracks;
      assert.equal(audio.durationMs,project.durationMs);
      assert.equal(audio.loop,true);
      assert.ok(approvedAssets.find(row=>row.id===audio.assetId)?.path.startsWith('/audio/mandala/'));
      for (const asset of project.assets.filter(asset=>asset.kind==='video')) {
        assert.equal(project.aspect,asset.height>asset.width?'portrait':'landscape');
        assert.ok(approvedAssets.find(row=>row.id===asset.id)?.path.startsWith('/videos/holistic-house/'));
      }
    }
  }
});

test('edited local Motion.md imports only approved catalog sources', async () => {
  const {createPresetMotionGuideV3,importCatalogMotionGuideV3}=await import('../lib/mandala/openmotion-preset-guide.mjs');
  const edited=JSON.parse(createPresetMotionGuideV3('focused-action','en').split('\n').slice(1,-1).join('\n'));
  edited.textTracks[0].items[0].text='Start with the next step';
  edited.audioTracks[0].assetId='rain';
  const imported=importCatalogMotionGuideV3(toGuide(edited),'edited-guide','en');
  assert.equal(imported.project.textTracks[0].items[0].text,'Start with the next step');
  assert.equal(imported.project.audioTracks[0].assetId,'rain');
  assert.ok(imported.approvedAssets.some(asset=>asset.path==='/audio/mandala/rain.wav'));
  edited.audioTracks[0].assetId='https://example.com/audio.wav';
  assert.throws(()=>importCatalogMotionGuideV3(toGuide(edited),'edited-guide','en'),/motion_guide_unapproved_audio/);
});

test('Motion.md source search respects the requested aspect and matches supplied tags', async ()=>{
  const {searchMotionGuideScenes}=await import('../lib/mandala/openmotion-preset-guide.mjs');
  const results=searchMotionGuideScenes('path focus','en','portrait');
  assert.ok(results.some(result=>result.id==='path-to-goals'));
  assert.ok(results.every(result=>result.tags.includes('focus')));
  assert.ok(!searchMotionGuideScenes('path focus','en','landscape').some(result=>result.id==='path-to-goals'));
  assert.deepEqual(searchMotionGuideScenes('unrelated example.com','en','portrait'),[]);
});

test('replaces a single clip asset while preserving transitions and rejects an incompatible replacement', async () => {
  const {createPresetMotionGuideV3,replaceMotionGuideScene}=await import('../lib/mandala/openmotion-preset-guide.mjs');
  const base=createPresetMotionGuideV3('focused-action','en');
  const edited=replaceMotionGuideScene(base,'shot-2','ocean-pulse','en');
  const shots=JSON.parse(edited.split('\n').slice(1,-1).join('\n')).videoTracks[0].clips;
  assert.equal(shots[1].assetId,'ocean-pulse');
  assert.equal(shots[1].startMs,4500);
  assert.equal(shots[1].transitionIn,'crossfade');
  assert.equal(shots[2].assetId,'path-to-goals');
  assert.throws(()=>replaceMotionGuideScene(base,'shot-2','sun-warm-ocean-dawn','en'),
    /motion_guide_incompatible_aspect/);
});

test('moves a scene source to the next slot without changing transition timing', async () => {
  const {createPresetMotionGuideV3,moveMotionGuideScene}=await import('../lib/mandala/openmotion-preset-guide.mjs');
  const base=createPresetMotionGuideV3('focused-action','en');
  const edited=moveMotionGuideScene(base,'shot-2',1,'en');
  const shots=JSON.parse(edited.split('\n').slice(1,-1).join('\n')).videoTracks[0].clips;
  assert.deepEqual(shots.map(shot=>shot.assetId),['clear-morning','path-to-goals','solar-surge','soft-horizon']);
  assert.deepEqual(shots.map(shot=>shot.startMs),[0,4500,9000,13500]);
  assert.deepEqual(shots.map(shot=>shot.transitionIn),['cut','crossfade','crossfade','crossfade']);
  assert.throws(()=>moveMotionGuideScene(base,'shot-1',-1,'en'),/motion_guide_move_outside_track/);
});
