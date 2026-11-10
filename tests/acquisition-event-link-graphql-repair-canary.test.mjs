import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

test("acquisition event link retains consent gating across protected source repair",()=>{
  const source=readFileSync(new URL("../components/acquisition-event-link.tsx",import.meta.url),"utf8");
  assert.match(source,/analyticsConsent !== "granted"/);
  assert.match(source,/export function AcquisitionEventLink/);
  assert.match(source,/import type \{ PublicAnalyticsEvent \}/);
});
