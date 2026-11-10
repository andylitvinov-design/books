import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('acquisition event link stays consent-gated during isolated source repair',()=>{
 const source=read('components/acquisition-event-link.tsx');
 assert.match(source,/analyticsConsent !== "granted"/);
 assert.match(source,/export function AcquisitionEventLink/);
});
