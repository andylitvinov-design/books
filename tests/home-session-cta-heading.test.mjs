import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Home has localized, direct paid-session action before free review for EN/RU/ES',()=>{
 const home=read('components/home-dialogue-entry.tsx');
 assert.match(home,/data-home-request-session/);
 assert.match(home,/services\/free-consultation/);
 for(const label of ['Request a session','Записаться на сессию','Solicitar una sesión'])assert.ok(home.includes(label),label);
 assert.ok(home.indexOf('data-home-request-session')<home.indexOf('data-home-free-review'));
 assert.match(read('components/home-dialogue-entry.module.css'),/\.sessionCta\{[^}]*min-height:48px/);
 assert.ok(read('app/es/page.tsx').includes('<HomeDialogueEntry locale="es" />'));
});

test('transient loading wordmark never adds a duplicate H1 to Home HTML',()=>{
 const loader=read('components/holistic-house-loading-scene.tsx');
 assert.doesNotMatch(loader,/<h1\b/);
 assert.match(loader,/<p className=\{styles\.wordmark\}>/);
 assert.match(read('components/home-dialogue-entry.tsx'),/<h1>Holistic House<\/h1>/);
});
