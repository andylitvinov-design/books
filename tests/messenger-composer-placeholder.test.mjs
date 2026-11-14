import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import test from "node:test";
import {
  animateMessengerComposerPlaceholder,
  MESSENGER_COMPOSER_HINTS,
} from "../lib/holistic-support/messenger-composer-placeholder.mjs";

function fixture({reduced=false}={}) {
  let clock=0, nextId=0;
  const jobs=new Map();
  function target(){
    const listeners=new Map();
    return {
      addEventListener(name,listener){const set=listeners.get(name)||new Set();set.add(listener);listeners.set(name,set);},
      removeEventListener(name,listener){listeners.get(name)?.delete(listener);},
      emit(name){for(const fn of listeners.get(name)||[])fn();},
    };
  }
  const motion={...target(),matches:reduced};
  const view={
    matchMedia:()=>motion,
    setTimeout(fn,delay){const id=++nextId;jobs.set(id,{at:clock+delay,fn});return id;},
    clearTimeout(id){jobs.delete(id);},
  };
  const doc={...target(),visibilityState:"visible",activeElement:null,defaultView:view};
  const input={...target(),ownerDocument:doc,placeholder:"",value:""};
  function advance(duration) {
    const targetTime=clock+duration;
    let safety=0;
    for (;;) {
      const entries=[...jobs.entries()].sort((a,b)=>a[1].at-b[1].at);
      if(!entries.length || entries[0][1].at>targetTime)break;
      assert.ok(++safety<100000,"unexpected endless timer loop");
      const [id,job]=entries[0];jobs.delete(id);clock=job.at;job.fn();
    }
    clock=targetTime;
  }
  return {input,doc,motion,advance,jobs};
}

test("localized hints cover all six AI Assistant paths without repeating the generic placeholder",()=>{
  for (const locale of ["en","ru","es"]) {
    assert.equal(MESSENGER_COMPOSER_HINTS[locale].length,6);
    assert.ok(MESSENGER_COMPOSER_HINTS[locale].every(text=>text.length>8 && text.length<45));
    assert.ok(MESSENGER_COMPOSER_HINTS[locale].some(text=>text.includes("MyTube")));
  }
});

test("types the first phrase, holds it, erases it and types a different second phrase",()=>{
  const f=fixture();
  const stop=animateMessengerComposerPlaceholder(f.input,"en","What's on your mind?");
  assert.equal(f.input.placeholder,"What's on your mind?");
  f.advance(650);
  assert.equal(f.input.placeholder,"H");
  const phrase=MESSENGER_COMPOSER_HINTS.en[0];
  f.advance(55*(phrase.length-1));
  assert.equal(f.input.placeholder,phrase);
  f.advance(800);
  assert.equal(f.input.placeholder,phrase);
  f.advance(900+26*phrase.length+380+55);
  assert.ok(MESSENGER_COMPOSER_HINTS.en[1].startsWith(f.input.placeholder));
  assert.notEqual(f.input.placeholder,MESSENGER_COMPOSER_HINTS.en[0]);
  stop();
  assert.equal(f.jobs.size,0);
});

test("focus and document visibility suspend timers; blur resumes from the first hint",()=>{
  const f=fixture();
  const stop=animateMessengerComposerPlaceholder(f.input,"ru","Что сейчас для вас важно?");
  f.advance(850);
  assert.notEqual(f.input.placeholder,"Что сейчас для вас важно?");
  f.doc.activeElement=f.input;f.input.emit("focus");
  assert.equal(f.jobs.size,0);
  assert.equal(f.input.placeholder,"Что сейчас для вас важно?");
  f.advance(10000);
  assert.equal(f.input.placeholder,"Что сейчас для вас важно?");
  f.doc.activeElement=null;f.input.emit("blur");
  f.advance(650);
  assert.equal(f.input.placeholder,"П");
  f.doc.visibilityState="hidden";f.doc.emit("visibilitychange");
  assert.equal(f.jobs.size,0);
  f.advance(10000);
  f.doc.visibilityState="visible";f.doc.emit("visibilitychange");
  f.advance(650);
  assert.equal(f.input.placeholder,"П");
  stop();
});

test("reduced motion remains static, and cleanup cannot overwrite a typed or dictated message",()=>{
  const f=fixture({reduced:true});
  const stop=animateMessengerComposerPlaceholder(f.input,"es","¿Qué te preocupa ahora?");
  assert.equal(f.input.placeholder,MESSENGER_COMPOSER_HINTS.es[0]);
  assert.equal(f.jobs.size,0);
  f.advance(60000);
  assert.equal(f.input.placeholder,MESSENGER_COMPOSER_HINTS.es[0]);
  stop();
  assert.equal(f.input.placeholder,"¿Qué te preocupa ahora?");
  f.input.value="My dictated message";
  const stop2=animateMessengerComposerPlaceholder(f.input,"en","What's on your mind?");
  f.advance(10000);
  assert.equal(f.input.value,"My dictated message");
  assert.equal(f.jobs.size,0);
  stop2();
});

test("the real chat's sole textarea activates animation only while idle in Messenger",()=>{
  const chat=readFileSync(new URL("../components/holistic-agent-chat.tsx",import.meta.url),"utf8");
  assert.match(chat,/animateMessengerComposerPlaceholder\(input,locale,t\.placeholder\)/);
  assert.match(chat,/messengerView&&!pageHelp&&!busy&&!draft/);
  assert.match(chat,/messages\.length===0/);
  assert.match(chat,/placeholder=\{t\.placeholder\}/);
  assert.match(chat,/aria-label=\{t\.placeholder\}/);
  assert.equal((chat.match(/<form onSubmit=\{submit\} className=\{styles\.form\}>/g)||[]).length,1);
});
