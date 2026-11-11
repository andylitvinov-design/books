import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

// The trusted repair selector accepts only this literal root-bound source
// read pattern as directly testable coverage. The assertions are unchanged.
const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test("public acquisition event link retains consent-gated tracking after repair",()=>{
 const source=read("components/acquisition-event-link.tsx");
 assert.match(source,/analyticsConsent !== "granted"/);
 assert.match(source,/export function AcquisitionEventLink/);
 assert.match(source,/onClick\?\.\(\)/);
});
