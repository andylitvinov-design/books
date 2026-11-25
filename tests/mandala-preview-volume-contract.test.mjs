import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import {readFileSync} from "node:fs";
import ts from "typescript";
const source=readFileSync(new URL("../lib/mandala/preview-volume.ts",import.meta.url),"utf8");
const studio=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
test("iOS media gain follows 0 / 15 / 100 without native volume",()=>{
  const nodes=[],sources=[],contexts=[];
  class FakeAudioContext{
    currentTime=0;destination={};closed=false;resumes=0;
    constructor(){contexts.push(this);}
    createMediaElementSource(element){
      const src={element,connect(){},disconnect(){}};sources.push(src);return src;
    }
    createGain(){
      const gain={value:1,cancelScheduledValues(){},setValueAtTime(v){this.value=v;},
        setTargetAtTime(v){this.value=v;}};
      const node={gain,connect(){},disconnect(){}};nodes.push(node);return node;
    }
    resume(){this.resumes++;return Promise.resolve();}
    close(){this.closed=true;return Promise.resolve();}
  }
  const output={};
  const js=ts.transpileModule(source,{fileName:"preview-volume.ts",
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  vm.runInNewContext(js,{exports:output,window:{AudioContext:FakeAudioContext}});
  const group=output.createPreviewGainGroup([{id:"song"}],[.15]);
  assert.ok(group);assert.equal(sources.length,1);
  assert.equal(nodes[0].gain.value,.15);
  group.setGains([0]);assert.equal(nodes[0].gain.value,0);
  group.setGains([1]);assert.equal(nodes[0].gain.value,1);
  group.setGains([3]);assert.equal(nodes[0].gain.value,1);
  group.setGains([.05]);assert.equal(nodes[0].gain.value,.05);
  group.resume();assert.equal(contexts[0].resumes,2);
  group.close();assert.equal(contexts[0].closed,true);
  group.setGains([1]);assert.equal(nodes[0].gain.value,.05);
});
test("native music, film preview and exported MP4 receive same slider percent",()=>{
  assert.match(studio,/function ensureAuditionOutput\(player:HTMLAudioElement\)/);
  assert.match(studio,/createPreviewGainGroup\(\[player\],\[soundVolume\/100\]\)/);
  assert.match(studio,/session\.mixer=createPreviewGainGroup\(session\.players,/);
  assert.match(studio,/session\.mixer\.setGains\(levels\)/);
  assert.match(studio,/audio:files\.length\?\{files,volume:soundVolume\}:undefined/);
  assert.match(studio,/data-video-audio-compact-volume/);
  const musicPane=studio.slice(studio.indexOf('{montagePanel==="audio" ? <div className={videoStyles.montageAudioCompact}'),
    studio.indexOf('{musicWarning?<p role="alert" className={videoStyles.montageAudioWarning}>'));
  assert.doesNotMatch(musicPane,/data-video-audio-affirmations|data-video-voice-studio/);
  assert.match(studio,/data-video-voice-studio open=\{voiceStudioActivated\}/);
  assert.match(studio,/voiceEditor=\{activeWorkspace==="effects"\?hypnoVoiceEditor:null\}/);
});
