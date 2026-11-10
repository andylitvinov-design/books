import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('repair canary preserves analytics consent and the public link API',()=>{
 const source=read('components/acquisition-event-link.tsx');
 assert.match(source,/analyticsConsent !== "granted"/);
 assert.match(source,/export function AcquisitionEventLink/);
 assert.match(source,/onClick\?\.\(\)/);
});
