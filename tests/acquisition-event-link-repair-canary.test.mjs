import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

// Read-only direct-source oracle for the existing public component.
// The intentionally introduced TS2304 is checked separately by real Core.
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('public acquisition event link preserves explicit analytics consent and click handoff',()=>{
 const source=read('components/acquisition-event-link.tsx');
 assert.match(source,/analyticsConsent !== "granted"/);
 assert.match(source,/export function AcquisitionEventLink/);
 assert.match(source,/event: AcquisitionEvent/);
 assert.match(source,/holistic-house:acquisition/);
});
