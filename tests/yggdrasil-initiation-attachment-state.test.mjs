import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import ts from "typescript";
import { whatsappEnquiryUrl, WHATSAPP_NUMBER } from "../lib/whatsapp-enquiry.js";

const source = readFileSync(new URL("../components/yggdrasil-initiation-form.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, { compilerOptions: {
  target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
  jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
} }).outputText;

// Exercise the real React component and its hash/choice callbacks, with inert
// links; no WhatsApp, Telegram, downloads or user files are opened in tests.
function fixture({ hash = "", locale = "en" } = {}) {
  const hooks = [], effects = [], listeners = new Map();
  let cursor = 0, dirty = false, tree;
  const equal = (a,b) => a && b && a.length === b.length && a.every((v,i)=>Object.is(v,b[i]));
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!hooks[index]) hooks[index] = {value:initial};
      return [hooks[index].value, (next) => {
        if (!Object.is(hooks[index].value,next)) { hooks[index].value=next; dirty=true; }
      }];
    },
    useCallback(callback,deps) {
      const index = cursor++;
      if(!hooks[index] || !equal(hooks[index].dependencies,deps)) hooks[index]={value:callback,dependencies:deps};
      return hooks[index].value;
    },
    useEffect(effect,deps) {
      const index = cursor++;
      if (!hooks[index] || !equal(hooks[index].dependencies,deps)) {
        hooks[index]?.cleanup?.();
        hooks[index]={dependencies:deps};
        effects.push(()=>{hooks[index].cleanup=effect();});
      }
    },
  };
  const jsx = (type,props)=>({type,props});
  const browser = {
    location:{hash},
    addEventListener:(event,fn)=>listeners.set(event,fn),
    removeEventListener:(event)=>listeners.delete(event),
  };
  const require = (name) => {
    if(name==="react")return react;
    if(name==="react/jsx-runtime")return {jsx,jsxs:jsx,Fragment:"fragment"};
    if(name==="lucide-react")return new Proxy({}, {get:(_target,icon)=>function MockIcon(props){return jsx("icon",{...props,icon});}});
    if(name==="@/lib/whatsapp-enquiry")return {whatsappEnquiryUrl};
    if(name.endsWith(".module.css"))return {__esModule:true,default:new Proxy({}, {get:(_,key)=>key})};
    throw new Error("Unexpected dependency: "+name);
  };
  const loaded={exports:{}};
  new Function("require","module","exports","window",compiled)(require,loaded,loaded.exports,browser);
  function nodes(predicate,node=tree,found=[]) {
    if(!node||typeof node!=="object")return found;
    if(Array.isArray(node)){node.forEach(child=>nodes(predicate,child,found));return found;}
    if(predicate(node))found.push(node);
    return nodes(predicate,node.props?.children,found);
  }
  function render() {
    let attempts=0;
    do {
      assert.ok(attempts++<12,"Effects should settle");
      cursor=0;dirty=false;
      tree=loaded.exports.YggdrasilInitiationForm({locale});
      while(effects.length)effects.shift()();
    }while(dirty);
  }
  render();
  return {
    mode(intent) {
      const button=nodes(n=>n.props?.["data-intent"]===intent)[0];
      assert.ok(button,"Expected visible choice "+intent);
      button.props.onClick();
      render();
    },
    hash(value) {
      browser.location.hash=value;
      assert.ok(listeners.get("hashchange"),"hashchange handler");
      listeners.get("hashchange")();
      render();
    },
    buttons:()=>nodes(n=>n.type==="button"&&Boolean(n.props?.["data-intent"])),
    allNative:()=>nodes(n=>["input","textarea","form"].includes(n.type)),
    urls:()=>nodes(n=>n.type==="a"&&typeof n.props?.href==="string").map(n=>n.props.href),
    handoff:()=>nodes(n=>n.props?.["data-reiki-initiation-handoff"])[0],
    pdf:()=>nodes(n=>n.type==="a"&&n.props?.download)[0],
  };
}
function messageFrom(href) {
  const url=new URL(href);
  assert.equal(url.origin,"https://wa.me");
  assert.equal(url.pathname,"/"+WHATSAPP_NUMBER);
  return url.searchParams.get("text")??"";
}

test("capture has three accessible choices and no personal fields or answer uploads", () => {
  const f=fixture();
  assert.deepEqual(f.buttons().map(x=>x.props["data-intent"]),["free","personal","pdf"]);
  assert.deepEqual(f.buttons().map(x=>x.props["aria-pressed"]),[true,false,false]);
  assert.deepEqual(f.allNative(),[]);
  assert.ok(f.handoff());
  assert.equal(f.pdf(),undefined);
});

test("free level 1 opens only an explicit, localized WhatsApp handoff", () => {
  for(const locale of ["en","ru","es"]){
    const f=fixture({locale});
    const link=f.handoff();
    assert.equal(link.props.target,"_blank");
    assert.equal(link.props.rel,"noopener noreferrer");
    assert.equal(link.props["data-reiki-initiation-handoff"],"free");
    const message=messageFrom(link.props.href);
    assert.match(message,/Reiki Yggdrasil/);
    assert.match(message, /FREE|БЕСПЛАТНУЮ|GRATIS/);
    assert.ok(message.includes("/"+locale+"/academy/reiki/yggdrasil/free-initiation"));
    assert.doesNotMatch(message,/previous-answers\.pdf|Selected file|private-selector/i);
  }
});

test("personal option changes the actual handoff and does not retain the free request", () => {
  const f=fixture();
  const initial=messageFrom(f.handoff().props.href);
  f.mode("personal");
  assert.deepEqual(f.buttons().map(x=>x.props["aria-pressed"]),[false,true,false]);
  const personal=messageFrom(f.handoff().props.href);
  assert.notEqual(personal,initial);
  assert.match(personal,/PERSONAL.*Reiki Yggdrasil|\bPERSONAL\b/);
  assert.match(personal,/€100/);
  assert.equal(f.pdf(),undefined);
  assert.deepEqual(f.allNative(),[]);
});

test("PDF choice links to the existing guide endpoint and never sends a chat message", () => {
  const f=fixture({locale:"ru"});
  f.mode("pdf");
  assert.deepEqual(f.buttons().map(x=>x.props["aria-pressed"]),[false,false,true]);
  assert.equal(f.handoff(),undefined);
  assert.equal(f.pdf().props.href,"/api/academy/reiki-guide?course=yggdrasil&locale=ru");
  assert.deepEqual(f.allNative(),[]);
});

test("old answer-upload links safely select the free initiation without restoring a file picker", () => {
  const f=fixture({hash:"#apply-answers"});
  assert.equal(f.handoff().props["data-reiki-initiation-handoff"],"free");
  f.mode("personal");
  f.hash("#apply-answers");
  assert.equal(f.handoff().props["data-reiki-initiation-handoff"],"free");
  assert.deepEqual(f.allNative(),[]);
});

for(const [hash,expected] of [
  ["#apply-free","free"],
  ["#request-free-initiation","free"],
  ["#apply-personal","personal"],
  ["#apply-pdf","pdf"],
]) test("deep link "+hash+" selects the correct visible action", () => {
  const f=fixture({hash});
  assert.deepEqual(f.buttons().map(x=>x.props["data-intent"]).filter((_,i)=>f.buttons()[i].props["aria-pressed"]),[expected]);
  f.mode("free");
  f.hash(hash);
  assert.deepEqual(f.buttons().map(x=>x.props["data-intent"]).filter((_,i)=>f.buttons()[i].props["aria-pressed"]),[expected]);
  assert.deepEqual(f.allNative(),[]);
});
