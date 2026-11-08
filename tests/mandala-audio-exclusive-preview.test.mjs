import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import vm from "node:vm";
import ts from "typescript";

// Exercise the actual Studio handler functions with deterministic native-player
// doubles. No media devices, browser/network audio or client files are needed.
const src=readFileSync(new URL("../components/mandala-free-video-studio.tsx",import.meta.url),"utf8");
const ast=ts.createSourceFile("mandala-free-video-studio.tsx",src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
assert.equal(ast.parseDiagnostics.length,0);

function locate(match){
  let result;
  const visit=node=>{
    if(!result&&match(node))result=node;
    if(!result)ts.forEachChild(node,visit);
  };
  visit(ast);
  assert.ok(result,"Missing actual Studio code");
  return result;
}
function evaluate(text,context){
  const code=ts.transpileModule("("+text+")",{
    compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}
  }).outputText;
  return vm.runInNewContext(code,context);
}
function handler(name,context){
  const node=locate(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  return evaluate(node.getText(ast),context);
}
function nativeHandler(name,context){
  const audio=locate(node=>ts.isJsxSelfClosingElement(node)&&node.tagName.getText(ast)==="audio"&&
    node.attributes.properties.some(p=>ts.isJsxAttribute(p)&&p.name.text==="onPlay"));
  const prop=audio.attributes.properties.find(p=>ts.isJsxAttribute(p)&&p.name.text===name);
  assert.ok(prop?.initializer&&ts.isJsxExpression(prop.initializer));
  return evaluate(prop.initializer.expression.getText(ast),context);
}
function fakePlayer(name,events){
  return {
    name,paused:true,muted:false,volume:1,
    play(){this.paused=false;events.push("play:"+name);return Promise.resolve();},
    pause(){this.paused=true;events.push("pause:"+name);}
  };
}
function rig(){
  const events=[];
  const first=fakePlayer("first",events);
  let next=null;
  const ctx={
    recording:false,preparing:false,micRecording:false,uploadedAudio:null,
    music:"first",previewAudioUrl:"/first.mp3",soundVolume:75,
    audioPreviewRef:{current:first},activeAudioPreviewRef:{current:null},
    restoreAudioSessionRef:{current:null},aliveRef:{current:true},
    ui:{soundUnavailable:"Playback failed"},
    setSoundPreview(value){events.push("indicator:"+value);},
    setMusicWarning(value){events.push("warning:"+value);},
    stopMovieSound(){events.push("stop-film");},
    setPreviewPlaying(value){events.push("film:"+value);},
    acquirePlaybackSession(){events.push("session");return ()=>events.push("restore");},
    setAudioAuto(value){events.push("auto:"+value);},
    flushSync(callback){callback();},
    chooseMusic(choice){
      // Simulate React's keyed <audio> replacement without an implicit
      // browser pause. The handler must pause the previous node itself.
      next=fakePlayer(choice,events);
      ctx.music=choice;ctx.previewAudioUrl="/"+choice+".mp3";
      ctx.audioPreviewRef.current=next;
    }
  };
  ctx.stopSoundPreview=handler("stopSoundPreview",ctx);
  ctx.toggleSoundPreview=handler("toggleSoundPreview",ctx);
  ctx.playAudioTrack=handler("playAudioTrack",ctx);
  return {ctx,events,first,get next(){return next;}};
}

test("compact Play then Library Play never leaves two melodies running",()=>{
  const r=rig();
  r.ctx.toggleSoundPreview();
  assert.equal(r.first.paused,false);
  r.ctx.playAudioTrack("second");
  assert.equal(r.first.paused,true,"old compact player must stop before the keyed source changes");
  assert.equal(r.next.paused,false,"library selected melody starts");
  assert.ok(r.events.indexOf("pause:first")<r.events.indexOf("play:second"));
  r.ctx.playAudioTrack("second");
  assert.equal(r.next.paused,true,"second tap pauses the selected library melody");
});
test("starting a melody stops film audio, including when using native audio controls",()=>{
  const r=rig();
  r.ctx.toggleSoundPreview();
  assert.equal(r.events.filter(x=>x==="stop-film").length,1);
  r.ctx.stopSoundPreview();
  r.first.paused=false;
  nativeHandler("onPlay",r.ctx)({currentTarget:r.first});
  assert.equal(r.events.filter(x=>x==="stop-film").length,2);
  assert.equal(r.ctx.activeAudioPreviewRef.current,r.first);
});
test("stale old player pause does not release the replacement's audio session",()=>{
  const r=rig();
  const second=fakePlayer("second",r.events);
  r.ctx.activeAudioPreviewRef.current=second;
  r.ctx.audioPreviewRef.current=second;
  r.ctx.restoreAudioSessionRef.current=()=>r.events.push("restore-new");
  const onPause=nativeHandler("onPause",r.ctx);
  onPause({currentTarget:r.first});
  assert.equal(r.events.includes("restore-new"),false);
  assert.equal(r.ctx.activeAudioPreviewRef.current,second);
  onPause({currentTarget:second});
  assert.equal(r.events.includes("restore-new"),true);
});
test("keyed audio detach pauses old Safari media before replacing it",()=>{
  const r=rig();
  const call=locate(node=>ts.isVariableDeclaration(node)&&node.name.getText(ast)==="setAudioPreviewNode");
  assert.ok(ts.isCallExpression(call.initializer));
  const setNode=evaluate(call.initializer.arguments[0].getText(ast),r.ctx);
  r.first.paused=false;
  r.ctx.activeAudioPreviewRef.current=r.first;
  r.ctx.restoreAudioSessionRef.current=()=>r.events.push("restore-on-unmount");
  setNode(null);
  assert.equal(r.first.paused,true);
  assert.equal(r.ctx.audioPreviewRef.current,null);
  assert.equal(r.ctx.activeAudioPreviewRef.current,null);
  assert.ok(r.events.includes("restore-on-unmount"));
});
test("starting film preview stops audition, but preserves intentional film voice + music lanes",()=>{
  const node=locate(node=>ts.isFunctionDeclaration(node)&&node.name?.text==="startMovieSound");
  const body=node.body.getText(ast);
  assert.ok(body.indexOf("stopSoundPreview()")<body.indexOf("stopMovieSound()"));
  assert.match(body,/players:bedPlayer\?\[\.\.\.players,bedPlayer\]:players/);
  assert.match(src,/\{previewAudioUrl && !audioPlaybackError \? <audio key=\{previewAudioUrl\} ref=\{setAudioPreviewNode\}/);
});
