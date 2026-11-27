import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
test("cream Shamanic landing keeps six functional categories, places four before featured catalogue",()=>{
 const s=read("components/shamanica-mobile.tsx"),css=read("components/shamanica-mobile.module.css");
 assert.match(s,/data-shamanic-artifact-hero/);
 assert.match(s,/data-shamanic-featured-artifacts/);
 assert.match(s,/setSelectedShelf\("rituals"\)/);
 assert.match(s,/featuredArtifacts\.map/);
 for(const key of ["guidance","rituals","remedies","mysteries","energy","academy"]) assert.ok(s.includes('id:"'+key+'"'));
 for(const key of ["personal","fu","mandala"])assert.ok(s.includes('id:"'+key+'"'));
 assert.match(css,/SHAMANIC_ARTIFACT_CREAM_20261127/);
 assert.match(css,/grid-template-columns:33% minmax\(0,1fr\)/);
 assert.match(css,/\.featuredArtifacts\{order:1/);
 assert.match(css,/\[data-shamanica-service="academy"\]\{order:2\}/);
 assert.match(s,/ShamanicaBusinessContent locale=\{locale\}/);
});
