import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {environment,mount,turn,deferred} from './helpers/free-review-source-fixture.mjs';
import {whatsappEnquiryUrl} from '../lib/whatsapp-enquiry.js';
import {RECEIPT_SESSION_KEY} from '../lib/practitioners/enquiry-receipt.mjs';
import {assertFreeReviewSyntheticPayload,assertFreeReviewPreparedUrls} from '../scripts/helpers/free-review-private-handoff-verifier.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const reference='HH-ABCD1234EF56';
const one=a=>{assert.equal(a.length,1);return a[0]};
function nodes(root,predicate){const a=[];function visit(n){if(predicate(n))a.push(n);ts.forEachChild(n,visit)}visit(root);return a}
function actualProps(locale){
 const source=read('components/personal-express-enquiry.tsx');
 const ast=ts.createSourceFile('parent.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 assert.equal(ast.parseDiagnostics.length,0);
 const fn=one(ast.statements.filter(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='PersonalExpressEnquiry'));
 assert.ok(fn.modifiers.some(n=>n.kind===ts.SyntaxKind.ExportKeyword));
 const wizard=one(fn.parameters[0].name.elements.filter(n=>n.name.getText(ast)==='enableWizard'));
 assert.equal(wizard.initializer.getText(ast),'false');
 const declaration=one(ast.statements.filter(ts.isVariableStatement).flatMap(s=>s.declarationList.declarations).filter(d=>d.name.getText(ast)==='copy'));
 const copy=runInNewContext(ts.transpileModule('const copy='+declaration.initializer.getText(ast)+';copy',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,{}, {timeout:500});
 const t=copy[locale], focus='situation', pathname='/'+locale+'/services/free-situation-review';
 const chooser=one(nodes(fn,n=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText(ast)==='ContactChannelChooser'));
 assert.ok(ts.isConditionalExpression(chooser.parent));
 assert.equal(chooser.parent.condition.getText(ast),'enableWizard');assert.equal(chooser.parent.whenFalse,chooser);
 const values={locale,focus,t,whatsappUrl:whatsappEnquiryUrl({locale,service:t.service,request:t.request,pagePath:pathname})};
 const props={};
 for(const attr of chooser.attributes.properties){
  assert.ok(ts.isJsxAttribute(attr));const name=attr.name.text;
  if(name==='key')continue;
  if(!attr.initializer){props[name]=true;continue}
  assert.ok(ts.isJsxExpression(attr.initializer));
  props[name]=runInNewContext('('+attr.initializer.expression.getText(ast)+')',values,{timeout:500});
 }
 assert.equal(props.compactPhone,true);assert.equal(props.stayAfterSave,true);assert.equal(props.allowSecureExpressClaim,true);
 for(const key of ['quick','bookingSku','cartContact','compactTrigger','onSaved'])assert.ok(!Object.hasOwn(props,key));
 return props;
}
const response=()=>({ok:true,status:201,json:async()=>({saved:true,referenceCode:reference})});
async function exercise(locale,sourceOverride){
 const env=environment(locale);let f;
 const destinations=[];env.window.open=(url,target,features)=>{assert.equal(url,'about:blank');assert.equal(target,'_blank');assert.equal(features,undefined);env.popups.push({url,target});return {closed:false,opener:null,location:{replace:url=>destinations.push(url)},close(){this.closed=true}}};
 const pending=deferred();env.setRespond(()=>pending.promise);
 try {
  f=mount('contact-channel-chooser','ContactChannelChooser',actualProps(locale),env,{sourceOverride});
  assert.deepEqual(env.attempts,[],'No initial auth, claim, booking or provider request');
  const submit=()=>f.click('button',p=>p['data-contact-channel-submit']==='whatsapp');
  const alert=()=>f.find('p',p=>p.role==='alert').props.children;
  submit();await turn(f);assert.equal(alert(),locale==='en'?'Enter your international phone number.':'Введите номер телефона с кодом страны.');assert.equal(env.requests.length,0);
  f.change('select',()=>true,'CA');f.change('input',p=>p.type==='tel','4165550123');
  submit();await turn(f);assert.equal(alert(),locale==='en'?'Please agree to one personal reply before continuing.':'Для отправки подтвердите согласие на один личный ответ.');assert.equal(env.requests.length,0);assert.equal(env.popups.length,0);
  const question='Synthetic private request';f.change('textarea',()=>true,question);f.change('input',p=>p.type==='checkbox',true);
  submit();await turn(f);assert.equal(env.requests.length,1);assert.deepEqual(env.writes,[]);assert.deepEqual(destinations,[]);
  assert.equal(f.find('input',p=>p.type==='tel').props.disabled,true);assert.equal(f.find('input',p=>p.type==='checkbox').props.disabled,true);
  assertFreeReviewSyntheticPayload(JSON.parse(env.requests[0]),locale,question);
  pending.resolve(response());await turn(f);await turn(f);
  assert.equal(f.nodes().filter(n=>n.type==='form').length,0);
  const links=f.nodes().filter(n=>n.type==='acquisition-link');assert.equal(links.length,2);
  for(const link of links){assert.equal(link.props.target,'_blank');assert.equal(link.props.rel,'noopener noreferrer');assert.equal(link.hidden,false)}
  assertFreeReviewPreparedUrls(links.map(n=>n.props.href),[question]);
  assert.deepEqual(destinations,[links[0].props.href]);assert.equal(env.requests.length,1);
  assert.deepEqual(env.navigations,[]);assert.deepEqual(env.events,[]);
  const receipt=JSON.parse(env.storage.get(RECEIPT_SESSION_KEY));assert.deepEqual(Object.keys(receipt).sort(),['createdAt','referenceCode']);assert.equal(receipt.referenceCode,reference);
  for(const marker of [question,'4165550123'])assert.ok(!JSON.stringify([...env.storage]).includes(marker));
  assert.equal(f.nodes().filter(n=>n.props['data-express-save-to-google']!==undefined).length,1,'Actual Google claim is composed, not forced null');
  assert.deepEqual(env.attempts.map(v=>v.url),['/api/service-enquiries'],'Unselected Google claim and booking remain inactive');
 } finally {pending.resolve(response());f?.unmount()}
}
for(const locale of ['en','ru'])test(locale+' actual free-review compact source preserves explicit consent, private payload and optional unselected claim',()=>exercise(locale));
const original=read('components/contact-channel-chooser.tsx');
for(const [name,from,to] of [
 ['phone validation','(usePhone && !/^\\+[1-9][0-9]{7,14}$/.test(cleanedPhone))','false'],
 ['consent validation','if (!consent) {','if (false) {'],
 ['service identity','operationId: nextId, serviceTitle,','operationId: nextId, serviceTitle: "Wrong",'],
 ['private payload escape','originalMessage + "\\n\\n" + c.reference + ": " + saved.referenceCode','description + "\\n\\n" + c.reference + ": " + saved.referenceCode'],
])test('actual free-review rejects source mutation: '+name,async()=>{assert.equal(original.split(from).length-1,1);await assert.rejects(exercise('en',original.replace(from,to)),{code:'ERR_ASSERTION'})});
test('actual source fixture rejects unknown imports before any provider action',()=>{
 const env=environment('en');assert.throws(()=>mount('contact-channel-chooser','ContactChannelChooser',actualProps('en'),env,{sourceOverride:'import {x} from "@/unknown-provider";\n'+original+'\nvoid x;'}),/Unexpected runtime dependency/);assert.deepEqual(env.attempts,[]);
});
