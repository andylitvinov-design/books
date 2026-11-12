'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const dir=path.resolve(__dirname,'..');
const load=f=>fs.readFileSync(path.join(dir,f),'utf8');
test('both original graphs restored, first paint and lifecycle preserved',()=>{
 const html=load('pr-monitor.html'),idx=load('index.html');
 assert.equal(idx,html,'root and direct monitor must have identical full HTML');
 for(const f of ['pr-trends.js','pr-trends.css','pr-merge-velocity-ui.js',
   'pr-graphs-restore.js','pr-graphs-restore.css'])
  assert.ok(html.includes('/'+f),f);
 assert.ok(html.indexOf('/pr-trends.js')<html.indexOf('/pr-trends-recovery.js'),
  'original graph must load before recovery enhancer');
 assert.match(html,/data-pr-stage-only/,'full Created→LIVE stage view retained');
 assert.doesNotMatch(html,/Загружаю проверенный монитор|http-equiv="refresh"/i);
});
test('chart scripts are nonempty and syntax-valid; external styles survive strict CSP',()=>{
 const trends=load('pr-trends.js'),organizer=load('pr-graphs-restore.js');
 assert.ok(trends.length>10000);
 for(const code of [trends,organizer])
  assert.doesNotThrow(()=>new vm.Script(code));
 assert.match(trends,/hh-pr-trends/);
 assert.match(organizer,/hh-merge-velocity/);
 assert.match(load('pr-trends.css'),/\.hh-trends-plot/);
 const css=load('pr-graphs-restore.css');
 assert.match(css,/#hh-merge-velocity/);
 assert.match(css,/@media\(max-width:850px\)/);
 assert.doesNotMatch(organizer,/\bfetch\s*\(|setInterval\s*\(|setTimeout\s*\(/);
});
function fixture(withLatency=true){
 const nodes=[];
 class Node{
  constructor(id='',className=''){
   this.id=id;this.className=className;this.children=[];this.parentElement=null;
  }
  get firstChild(){return this.children[0]||null}
  get nextSibling(){
   if(!this.parentElement)return null;
   return this.parentElement.children[this.parentElement.children.indexOf(this)+1]||null;
  }
  get previousElementSibling(){
   if(!this.parentElement)return null;
   return this.parentElement.children[this.parentElement.children.indexOf(this)-1]||null;
  }
  setAttribute(){}
  contains(n){return n===this||this.children.some(c=>c.contains(n))}
  appendChild(n){return this.insertBefore(n,null)}
  insertBefore(n,before){
   if(n.parentElement){
    const a=n.parentElement.children;a.splice(a.indexOf(n),1);
   }
   n.parentElement=this;
   let i=before?this.children.indexOf(before):-1;
   if(i<0)i=this.children.length;
   this.children.splice(i,0,n);return n;
  }
  querySelector(s){return s==='header.header'?this.children.find(n=>n.className==='header')||null:null}
 }
 const main=new Node('main','wrap'),header=new Node('header','header');
 const links=new Node('links'),activity=new Node('hh-pr-trends');
 const latency=new Node('hh-merge-velocity'),stage=new Node('hh-pr-two-screens');
 for(const n of [header,links,activity,stage])main.appendChild(n);
 if(withLatency)main.appendChild(latency);
 let observer=null,disconnected=false;
 class Observer{
  constructor(cb){this.cb=cb;observer=this}
  observe(){}
  disconnect(){disconnected=true}
 }
 const find=(n,id)=>n.id===id?n:n.children.map(c=>find(c,id)).find(Boolean);
 const document={
  readyState:'complete',body:main,createElement:()=>new Node(),
  getElementById:id=>find(main,id),
  querySelector:s=>s==='main.wrap'?main:null,
  addEventListener(){}
 };
 const win={document};
 new vm.Script(load('pr-graphs-restore.js')).runInNewContext({window:win,MutationObserver:Observer,Promise});
 return{main,header,activity,latency,stage,links,get pair(){return find(main,'hh-pr-top-graphs')},
  get observer(){return observer},get disconnected(){return disconnected}};
}
test('both charts move together after page header; original DOM and stage view retained',()=>{
 const p=fixture();
 assert.equal(p.main.children[0],p.header);
 assert.equal(p.main.children[1],p.pair);
 assert.deepEqual(p.pair.children,[p.activity,p.latency]);
 assert.equal(p.main.contains(p.stage),true);
 assert.equal(p.pair.children.length,2);
});
test('late second chart is inserted without copying or dropping the first',async()=>{
 const p=fixture(false);
 assert.ok(p.observer,'late chart needs observer, not repeated API calls');
 assert.equal(p.pair.children[0],p.activity);
 p.main.appendChild(p.latency);
 p.observer.cb();
 await Promise.resolve();
 assert.deepEqual(p.pair.children,[p.activity,p.latency]);
 assert.equal(p.disconnected,true);
 assert.equal(p.main.contains(p.stage),true);
});
