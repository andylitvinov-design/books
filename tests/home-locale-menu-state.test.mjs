import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
const source=readFileSync(new URL('../scripts/verify-home-locale-switch.mjs',import.meta.url),'utf8')
const helper=source.match(/async function chooseHomeLocale\(page, locale\) \{[\s\S]*?\n\}/)?.[0]
assert.ok(helper)
for(const initialOpen of [false,true])test('language selection respects restored native menu open='+initialOpen,async()=>{
 let open=initialOpen, toggles=0, clicks=0
 const trigger={async click(){toggles++;open=!open}}
 const link={async click(){assert.equal(open,true);clicks++}}
 const menu={async evaluate(fn){return fn({open})},locator(selector){return selector==='.site-language-menu-trigger'?trigger:link}}
 const page={locator(selector){assert.equal(selector,'.site-language-menu');return menu}}
 const expect=target=>({async toHaveCount(n){assert.equal(n,1)},async toHaveAttribute(name,value){if(target===menu){assert.equal(name,'open');assert.equal(open,true)}else{assert.equal(name,'href');assert.equal(value,'/')}}})
 const run=new Function('expect','homePath',helper+';return chooseHomeLocale')(expect,locale=>locale==='en'?'/':'/ru')
 await run(page,'en');assert.equal(toggles,initialOpen?0:1);assert.equal(clicks,1)
})

// Run the actual component's refs/effects with controlled commit ordering. This
// checks the native-open state contract, not a claim about browser scheduling.
const navigationSource=readFileSync(new URL('../components/site-navigation.tsx',import.meta.url),'utf8')
const navigationFile=ts.createSourceFile('site-navigation.tsx',navigationSource,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX)
const component=navigationFile.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text==='SiteNavigation')
assert.ok(component?.body)
const hookStatements=component.body.statements.filter(node=>
 ts.isVariableStatement(node)&&node.declarationList.declarations.some(declaration=>
  ts.isCallExpression(declaration.initializer)&&declaration.initializer.expression.getText(navigationFile)==='useRef')
 ||ts.isExpressionStatement(node)&&ts.isCallExpression(node.expression)&&node.expression.expression.getText(navigationFile)==='useEffect')
const compiledHooks=ts.transpileModule('function render(pathname,activeLocale,locale){'+
 hookStatements.map(node=>node.getText(navigationFile)).join('\n')+
 '\nreturn {languageRef,siteMenuRef}}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText

class MenuNode {
 constructor(parent=null){this.parent=parent;this.open=false;this.focused=false}
 contains(node){return node===this||Boolean(node.parent&&this.contains(node.parent))}
 querySelector(){return this.summary}
 focus(){this.focused=true}
}
function navigationHarness(){
 const refs=[],listeners=new Map(),language=new MenuNode(),sections=new MenuNode()
 language.summary=new MenuNode(language);sections.summary=new MenuNode(sections)
 let refIndex=0,effects=[],previous=[]
 const useRef=value=>{const index=refIndex++;return refs[index]??(refs[index]={current:value})}
 const useEffect=(callback,deps)=>effects.push({callback,deps})
 const document={addEventListener:(name,callback)=>listeners.set(name,callback),
  removeEventListener:(name,callback)=>{if(listeners.get(name)===callback)listeners.delete(name)}}
 const render=new Function('useRef','useEffect','document','Node','savePublicLocale','saveUiLocale',
  compiledHooks+';return render')(useRef,useEffect,document,MenuNode,()=>{},()=>{})
 const h={language,sections,listeners,
  render(pathname='/',locale='en'){
   refIndex=0;effects=[]
   const bindings=render(pathname,locale,locale)
   bindings.languageRef.current=language;bindings.siteMenuRef.current=sections
  },
  commit(){
   effects.forEach((effect,index)=>{
    const last=previous[index]
    if(!last||effect.deps.some((value,i)=>!Object.is(value,last.deps[i]))){
     last?.cleanup?.();effect.cleanup=effect.callback();previous[index]=effect
    }
   })
  },
  replay(){previous.forEach(effect=>{effect.cleanup?.();effect.cleanup=effect.callback()})},
  unmount(){previous.forEach(effect=>effect.cleanup?.())},
  open(){language.open=true;sections.open=true},
  dispatch(name,target){listeners.get(name)?.({target})},
 }
 h.render();return h
}

test('initial effects preserve native menus opened before the first commit',()=>{
 const h=navigationHarness();h.open();h.commit()
 assert.equal(h.language.open,true);assert.equal(h.sections.open,true);h.unmount()
})
test('unchanged effect replay preserves native open state',()=>{
 const h=navigationHarness();h.commit();h.open();h.replay()
 assert.equal(h.language.open,true);assert.equal(h.sections.open,true);h.unmount()
})
for(const [label,path,locale] of [['route','/ru','en'],['locale','/','ru']])test(label+' changes still close both menus',()=>{
 const h=navigationHarness();h.commit();h.open();h.render(path,locale);h.commit()
 assert.equal(h.language.open,false);assert.equal(h.sections.open,false);h.unmount()
})
test('unchanged navigation rerender preserves native menus',()=>{
 const h=navigationHarness();h.commit();h.open();h.render();h.commit()
 assert.equal(h.language.open,true);assert.equal(h.sections.open,true);h.unmount()
})
for(const event of ['pointerdown','focusin'])test('outside '+event+' still dismisses both menus',()=>{
 const h=navigationHarness();h.commit();h.open();h.dispatch(event,new MenuNode())
 assert.equal(h.language.open,false);assert.equal(h.sections.open,false);h.unmount()
})
test('inside pointer keeps the selected menu open and dismisses the other menu',()=>{
 const h=navigationHarness();h.commit();h.open();h.dispatch('pointerdown',h.language.summary)
 assert.equal(h.language.open,true);assert.equal(h.sections.open,false);h.unmount()
})
test('Escape closes both menus and restores the open menu trigger focus',()=>{
 const h=navigationHarness();h.commit();h.open();let prevented=false
 h.listeners.get('keydown')({key:'Escape',preventDefault(){prevented=true}})
 assert.equal(h.language.open,false);assert.equal(h.sections.open,false)
 assert.equal(h.language.summary.focused,true);assert.equal(prevented,true);h.unmount()
})
test('unmount removes all dismissal listeners',()=>{
 const h=navigationHarness();h.commit();assert.equal(h.listeners.size,3)
 h.unmount();assert.equal(h.listeners.size,0)
})
