import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {blockedApiDetails} from '../scripts/helpers/contact-request-diagnostics.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8'),origin='http://127.0.0.1:3100';
const alias=url=>blockedApiDetails({url,resourceType:'fetch',navigation:false},origin,'tantra').apiKind;
test('fixed alias matches the actual authored public PDF link for all three locales',()=>{
 const source=read('components/tantra-free-initiation.tsx');let links;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText()==='links')links=node.initializer.getText();ts.forEachChild(node,visit)};
 visit(ts.createSourceFile('actual.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX));assert.ok(links);
 for(const locale of ['en','ru','es']) {
  const actual=runInNewContext(links,{locale,root:'/'+locale+'/academy/reiki/tantra-reiki'});
  assert.equal(actual[3],'/api/academy/reiki-guide?course=tantra&locale='+locale);assert.equal(alias(origin+actual[3]),'tantra-guide');
 }
 const route=read('app/api/academy/reiki-guide/route.js');
 assert.match(route,/tantra: "tantra"/);assert.match(route,/"Content-Type": "application\/pdf"/);assert.match(route,/"Content-Disposition": 'attachment; filename="'/);
 // The current source uses a navigation Link; observing a fetch does not yet
 // prove this is the captured request or establish intended background fetches.
 assert.match(source,/<Link key=\{item.title\} href=\{href\} className=\{styles.resourceLink\}>/);
});
test('all noncanonical/private query variants remain unclassified and other courses never become Tantra',()=>{
 for(const url of [origin+'/api/academy/reiki-guide?course=tantra&locale=en&token=PRIVATE',origin+'/api/academy/reiki-guide?course=tantra&locale=en&locale=en',origin+'/api/academy/reiki-guide?locale=en&course=tantra',origin+'/api/academy/reiki-guide?course=%74antra&locale=en',origin+'/api/academy/reiki-guide?course=tantra&locale=%65n',origin+'/api/academy/reiki-guide?course=tantra&locale=fr',origin+'/api/academy/reiki-guide?course=kundalini&locale=en','http://PRIVATE@127.0.0.1:3100/api/academy/reiki-guide?course=tantra&locale=en',origin+'/wrong/../api/academy/reiki-guide?course=tantra&locale=en',origin+'/api/academy/reiki-guide?course=tantra&locale=en#PRIVATE']) {
  const result=blockedApiDetails({url,resourceType:'fetch',navigation:false},origin,'tantra');assert.equal(result.apiKind,'unclassified');assert.doesNotMatch(JSON.stringify(result),/PRIVATE|course=|3100/);
 }
 assert.equal(alias(origin+'/api/academy/reiki-guide?course=yggdrasil&locale=en'),'yggdrasil-guide');
});
test('single passive alias erases to current helper and preserves private-text precedence plus final denial',()=>{
 let source=read('scripts/helpers/contact-request-diagnostics.mjs');source=source.replace("      else if (url.pathname === '/api/academy/reiki-guide' && /^\\?course=tantra&locale=(?:en|ru|es)$/.test(url.search)) apiKind = 'tantra-guide';\n",'');
 const bytes=Buffer.from(source);assert.equal(createHash('sha1').update('blob '+bytes.length+'\0').update(bytes).digest('hex'),'b45e09471b49346dd0bcc34affdb7b1cd0cc0ff0');
 const browser=read('scripts/verify-contact-channel-chooser-browser.mjs');
 assert.ok(browser.indexOf("blocked.push({category:'private-text'})")<browser.indexOf("? blockedApiDetails("));
 assert.match(browser,/category:url.pathname.startsWith\('\/api\/'\)\?'unexpected-api'/);
 assert.match(browser,/assert.deepEqual\(blocked,\[\]/);assert.match(browser,/return route.abort\('blockedbyclient'\)/);
});
