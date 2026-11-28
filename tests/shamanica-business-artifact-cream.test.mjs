import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("business artifacts uses localized four-card cream landing and real links",()=>{
 const m=read("components/shamanica-mobile.tsx"),b=read("components/shamanica-business-content.tsx"),c=read("components/shamanica-business-content.module.css");
 for(const title of ["Psychic Remedies","Artifacts","Rituals & Reiki Energy Support","Shamanic Mandalas Support","(homeopathic support)","(archetypal energy support)"]) assert.ok(b.includes(title));
 assert.ok(m.includes('href="#business-artifact-list"'));assert.ok(b.includes('id="business-artifact-list"'));assert.ok(b.includes('businessArtifactCards.map'));assert.ok(b.includes('"/holistic-support/mandala"'));assert.ok(b.includes('businessFeaturedArtifacts.map'));assert.ok(b.includes('businessShelves.map'));assert.ok(c.includes('SHAMANIC_BUSINESS_ARTIFACT_CREAM_20261127'));assert.ok(m.includes('href="#shamanic-artifact-list"'));
});
