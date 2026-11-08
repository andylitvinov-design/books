import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import ts from "typescript";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const chat=read("components/holistic-agent-chat.tsx");
const css=read("components/holistic-agent-chat.module.css");

test("illustrated compact verified cards preserve real recommendation links",()=>{
  const ast=ts.createSourceFile("holistic-agent-chat.tsx",chat,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  assert.equal(ast.parseDiagnostics.length,0,ast.parseDiagnostics.map(d=>ts.flattenDiagnosticMessageText(d.messageText," ")).join(" | "));
  for(const phrase of ["data-hh-verified-options","data-hh-verified-option","src={verifiedOptionArtwork(x)}",
    "href={x.href}","aria-label={t.tried}","aria-label={t.hide}","{t.localFeedback}"]){
    assert.ok(chat.includes(phrase),phrase);
  }
  for(const style of [".optionHeading",".optionSource",".offerImage",".offerContent",".offerKind",".offerTitle",".offerOpen",
    "grid-template-columns:76px minmax(0,1fr)","grid-template-columns:62px minmax(0,1fr)"]){
    assert.ok(css.includes(style),style);
  }
  for(const category of ["kundalini","yggdrasil","tantra","item.kind===\"test\""]){
    assert.ok(chat.includes(category),category);
  }
});

test("latest user question remains the scroll anchor instead of disappearing below options",()=>{
  for(const snippet of ["data-hh-chat-user-turn","querySelectorAll<HTMLElement>",
    "thread.scrollTop=Math.min(Math.max(0,top)","followTail.current=atBottom||anchored",
    "thread.scrollTop=thread.scrollHeight"]){
    assert.ok(chat.includes(snippet),snippet);
  }
  assert.ok(css.includes("overflow-y:auto;overflow-x:hidden"));
  assert.ok(css.includes('.root[data-compact][data-chat-skin="messenger"]>.form'));
});

test("no fake player/durations; previous dismiss/tried behavior remains session-only",()=>{
  const options=chat.slice(chat.indexOf("data-hh-verified-options"),chat.indexOf("{status&&",chat.indexOf("data-hh-verified-options")));
  assert.ok(options.includes("setCompletedIds"));
  assert.ok(options.includes("setDismissedIds"));
  assert.ok(!/autoplay|Try now|10 min|20 min/.test(options));
  assert.ok(chat.includes("These choices apply only to this conversation"));
});
