import assert from 'node:assert/strict';
import vm from 'node:vm';
import ts from 'typescript';
const jsx=(type,props)=>({type,props});
export const nodes=value=>Array.isArray(value)?value.flatMap(nodes):value&&typeof value==='object'?[value,...nodes(value.props?.children)]:[];
export const text=value=>Array.isArray(value)?value.map(text).join(' '):value&&typeof value==='object'?text(value.props?.children):typeof value==='string'?value:'';
export function renderFreeEntry(source,locale){
 const deps={'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'a'},'next/image':{default:'img'},
  'lucide-react':Object.fromEntries(['ArrowLeft','ArrowRight','CheckCircle2','ShieldCheck','Sparkles'].map(x=>[x,'icon'])),
  './free-entry-landing.module.css':{default:new Proxy({},{get:(_,key)=>String(key)})}};
 for(const [path,name] of [['public-site-header','PublicSiteHeader'],['compact-lead-capture','CompactLeadCapture'],['free-situation-review-form','FreeSituationReviewForm'],['service-video-showcase','ServiceVideoShowcase'],['personal-testimonials','PersonalTestimonials']])deps['@/components/'+path]={[name]:name};
 const exports={};vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText,{exports,require(name){assert.ok(Object.hasOwn(deps,name),'Unexpected dependency '+name);return deps[name];}});
 return exports.FreeEntryLanding({locale,kind:'situation'});
}
export function assertFreeEntry(source,locale){
 const tree=renderFreeEntry(source,locale),all=nodes(tree);
 assert.equal(tree.props['data-free-entry-landing'],'situation');assert.equal(tree.props.lang,locale);
 const capture=all.filter(n=>n.type==='CompactLeadCapture');assert.equal(capture.length,1);
 assert.equal(capture[0].props.id,'request-free-review');assert.equal(capture[0].props.locale,locale);
 assert.equal(capture[0].props.serviceTitle,'Free written Situation Review');
 assert.match(capture[0].props.disclaimer,locale==='ru'?/не диагностируют и не лечат/:locale==='es'?/No diagnostican ni tratan/:/do not diagnose or treat/);
 const primary=all.filter(n=>n.type==='a'&&n.props.href==='#request-free-review');assert.equal(primary.length,1);
 assert.equal(text(primary[0].props.children).trim(),({en:'Request my free review',ru:'Запросить бесплатный разбор',es:'Solicitar revisión gratis'})[locale]);
 const details=all.filter(n=>n.type==='details'&&Object.hasOwn(n.props,'data-optional-written-review'));assert.equal(details.length,1);assert.ok(!details[0].props.open);
 assert.equal(nodes(details[0]).filter(n=>n.type==='FreeSituationReviewForm'&&n.props.locale===locale).length,1);
 assert.equal(all.filter(n=>n.type==='ServiceVideoShowcase'&&n.props.topic==='overview').length,1);
 assert.equal(all.filter(n=>n.type==='PersonalTestimonials'&&n.props.variant==='all').length,1);
 assert.ok(all.indexOf(capture[0])>all.findIndex(n=>n.type==='ServiceVideoShowcase'));
 assert.doesNotMatch(text(tree),/€50|€100/);
 assert.equal(all.filter(n=>['ContactChannelChooser','ConsultationChoiceCapture','ConsultationCartEntry'].includes(n.type)).length,0);
 assert.match(text(tree),locale==='ru'?/НЕ ЗВОНОК/:locale==='es'?/SIN LLAMADA/:/NO LIVE CALL/);
 return tree;
}
