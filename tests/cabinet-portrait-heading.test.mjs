import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { assertCabinetPortrait } from '../scripts/helpers/cabinet-navigation-verifier.mjs';
const source=readFileSync(new URL('../components/app/profile-domains.jsx',import.meta.url),'utf8');
const jsx=(type,props)=>({type,props});
function render(locale,mode='account',input=source){
 const ast=ts.createSourceFile('profile.jsx',input,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);
 let words,heading,section;
 function visit(node){
  if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='WORDS')words=node.initializer.getText(ast);
  if(ts.isJsxElement(node)&&node.openingElement.tagName.getText(ast)==='h1'&&node.openingElement.getText(ast).includes('hh-account-report-title'))heading=node.getText(ast);
  if(ts.isJsxOpeningElement(node)&&node.getText(ast).includes('data-profile-report-archive'))section=node.getText(ast);
  ts.forEachChild(node,visit);
 }visit(ast);
 assert.ok(words&&heading&&section);
 const code=`const WORDS=${words}; export function render(){const t=WORDS[${JSON.stringify(locale)}], external=${mode==='legacy'};return (${section}${heading}</section>);}`;
 const exports={};vm.runInNewContext(ts.transpileModule(code,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require(name){assert.equal(name,'react/jsx-runtime');return {jsx,jsxs:jsx};}});
 return exports.render();
}
function fixture(locale,mode='account',input=source,{guest=false,wrongUrl=false,interactive=true}={}){
 const tree=render(locale,mode,input), heading=tree.props.children;
 const item={props:tree.props,locator(selector){assert.equal(selector,'[data-profile-report-archive]#personal-reports');return this;},getByRole(role,options){assert.equal(role,'heading');return {props:heading.props,present:heading.type==='h1'&&heading.props.children===options.name&&options.level===1&&options.exact};},present:!guest&&interactive};
 const profile={...item,props:{'data-profile-mode':mode}};profile.locator=()=>item;
 const page={url:'http://localhost:3100/'+locale+'/app/'+(wrongUrl?'tests':'portrait'),locator(selector){assert.equal(selector,'[data-profile-domains][data-profile-interactive="true"]');return profile;}};
 const expect=value=>({async toHaveURL(url){assert.equal(value.url,url);},async toBeVisible(){assert.equal(value.present,true);},async toHaveCount(n){assert.equal(+value.present,n);},async toHaveAttribute(key,val){assert.equal(value.props[key],val);}});
 return ()=>assertCabinetPortrait(page,expect,{origin:'http://localhost:3100',locale});
}
for(const locale of ['en','ru'])test(locale+' actual account archive JSX satisfies exact heading contract',async()=>{await fixture(locale)();});
for(const [name,mode,input,options] of [
 ['guest','account',source,{guest:true}],['external','legacy',source,{}],['wrong URL','account',source,{wrongUrl:true}],['noninteractive','account',source,{interactive:false}],
 ['wrong title','account',source.replace("archivePanelTitle: 'My reports'","archivePanelTitle: 'My profile & reports'"),{}],
 ['wrong heading ID','account',source.replace('id="hh-account-report-title"','id="hh-account-report-title-wrong"'),{}],
 ['wrong archive ownership label','account',source.replace("external ? 'hh-analysis-reports-title' : 'hh-account-report-title'","'hh-analysis-reports-title'"),{}],
])test('reject '+name,async()=>{await assert.rejects(fixture('en',mode,input,options));});
