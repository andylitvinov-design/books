import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {createContext,runInContext} from 'node:vm';
const js=readFileSync(new URL('../project-management-nav.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../project-management-nav.css',import.meta.url),'utf8');
test('header is separate, owner management target on primary auth origin',()=>{
 assert.match(js,/https:\/\/holistichouse\.vercel\.app\/admin\/project-management/);
 assert.doesNotMatch(js,/setInterval|fetch\(|workflow_dispatch|localStorage|api\.github/);
 assert.match(css,/position:fixed/);
 assert.match(css,/focus-visible/);
});
test('nav mounts exactly once and never reads private data',()=>{
 const elements=[];
 const make=tag=>({tag,attributes:{},className:'',setAttribute(k,v){this.attributes[k]=v;},append(...children){this.children=children;}});
 const doc={readyState:'complete',body:{classList:{add(k){this.added=k;}},append(e){elements.push(e);}},getElementById:()=>elements.find(e=>e.id==='hh-project-management-nav'),createElement:make};
 const sandbox={window:{},document:doc};createContext(sandbox);
 runInContext(js,sandbox);runInContext(js,sandbox);
 assert.equal(elements.length,1);assert.equal(elements[0].children[0].textContent,'PR Monitor');
 assert.equal(elements[0].children[1].textContent,'Project Management');
 assert.equal(elements[0].children[1].href,'https://holistichouse.vercel.app/admin/project-management');
});