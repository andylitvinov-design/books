import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {shamanicaBusinessHref} from "../lib/shamanica-business.mjs";

const source=readFileSync(new URL("../components/shamanica-business-content.tsx",import.meta.url),"utf8");
const styles=readFileSync(new URL("../components/shamanica-business-content.module.css",import.meta.url),"utf8");
test("business shelf grid keeps exact owner order without changing For Me",()=>{
 const ownerTitles=[
  "Express Business Insight","Remedies for Clarity & Leadership",
  "Strategy & Business Analyses","Artefacts for Goal Support",
  "Business Energy Support","Energywork in Business"];
 const positions=ownerTitles.map(title=>source.indexOf('"'+title+'"'));
 assert.ok(positions.every(i=>i>0));
 assert.ok(positions.every((p,i)=>i===0||p>positions[i-1]));
 assert.match(source,/businessShelves\.map/);
 assert.match(source,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(source,/data-business-shelf=\{id\}/);
 assert.match(source,/SHAMANIC_BUSINESS_SIX_SHELVES_20261121/);
 assert.doesNotMatch(source,/data-shamanica-cabinet-shelves/);
});
test("each category presents four real clickable second-level choices in all locales",()=>{
 for(const title of ["Express Situation Scan","Deep Business Analysis","Remote Energy Support","Business Launch Ritual","Personal Remedy Selection","Mandala for Focus"])
  assert.ok(source.includes('"'+title+'"'),title);
 for(const locale of ["ru","en","es"]){
  for(const id of ["express","analysis","support","team","leader","artifacts","remedies"]){
   const href=shamanicaBusinessHref(locale,id);
   assert.ok(href.startsWith("/"+locale+"/"),href);
  }
 }
 assert.match(source,/data-business-second-level=\{activeShelf.id\}/);
 assert.match(source,/data-business-subservice=/);
 assert.match(source,/onClick=\{\(\)=>setSelectedShelf\(null\)\}/);
 assert.match(source,/t\.subservices\[shelfIndex\]\[index\]/);
 assert.match(styles,/\.root \.secondCard/);
});
