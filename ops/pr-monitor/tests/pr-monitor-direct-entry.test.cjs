'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(root,'pr-monitor.html'),'utf8');
const css=fs.readFileSync(path.join(root,'pr-monitor-mobile-safe.css'),'utf8');
test('first paint includes working legacy monitor instead of empty spinner',()=>{
 assert.ok(html.includes('<main class="wrap">'));
 assert.ok(html.includes('<h1>Очередь PR</h1>'));
 for(const forbidden of ['Загружаю проверенный монитор','pr-two-screen-boot.js','document.write','<style'])
  assert.equal(html.includes(forbidden),false,forbidden);
});
test('both graphs, full PR journey and recommendations are loaded directly',()=>{
 for(const file of ['monitor-core.js','pr-two-screen-pre.js','pr-two-screen.js','pr-merge-velocity-ui.js',
  'pr-compact-top.js','pr-dense-view.js','pr-recommendations.js','pr-lifecycle-ribbon.js',
  'pr-monitor-mobile-safe.css'])assert.ok(html.includes('/'+file),file);
 for(const id of ['id="quick-created"','id="quick-merged"','id="diagnostics-mount"'])
  assert.ok(html.includes(id),id);
});
test('mobile-first CSS is linked same-origin without inline CSP exception',()=>{
 assert.ok(html.includes('href="/pr-monitor-mobile-safe.css"'));
 assert.ok(css.includes('@media(max-width:700px)'));
 assert.ok(css.includes('#hh-merge-velocity'));
});
