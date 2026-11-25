import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("public shell publishes canonical WebSite, Organization and Person without invented medical credentials", () => {
  assert.match(layout, /type="application\/ld\+json"/);
  assert.match(layout, /"@context": "https:\/\/schema\.org"/);
  assert.match(layout, /"@type": "WebSite"/);
  const literal=layout.match(/const websiteSchema = (\{[\s\S]*?\n  \});/)[1];
  const origin="https://example.test";
  const schema=new Function("publicOrigin", "return ("+literal+")")(origin);
  assert.equal(schema["@context"],"https://schema.org");
  assert.deepEqual(schema["@graph"].map(node=>node["@type"]),["WebSite","Organization","Person"]);
  const [website,organization,person]=schema["@graph"];
  assert.equal(website.url,origin+"/");
  assert.equal(website.name,"Holistic House");
  assert.deepEqual(website.inLanguage,["en","ru","es"]);
  assert.equal(organization.url,origin+"/");
  assert.equal(person.worksFor["@id"],organization["@id"]);
  assert.equal(person.url,origin+"/en/about");
  assert.doesNotMatch(JSON.stringify(schema),/streetAddress|aggregateRating|reviewRating|hasCredential/);
  assert.doesNotMatch(layout, /MedicalOrganization|Physician|healthCondition/);
});
