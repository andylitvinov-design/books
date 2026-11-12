import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const src=readFileSync("components/services-courses-shelf.tsx","utf8");
const css=readFileSync("components/services-courses-shelf.module.css","utf8");
const parent=readFileSync("components/services-studio-offers.tsx","utf8");
test("Mobile Assist Services includes three approved learning cards",()=>{
 assert.match(parent,/<ServicesCoursesShelf locale=\{locale\} \/>/);
 for(const id of ["dionysus","tantra","yggdrasil"]) assert.match(src,new RegExp('id: "'+id+'"'));
 assert.match(src,/data-assist-course-detail/);
 assert.match(src,/data-assist-course-order/);
 assert.match(src,/data-assist-course-all/);
});
test("Course detail links and explicit enquiry reuse first-party flows",()=>{
 for(const route of ["archive/dionysian-tantra-club","reiki/free-practitioner-course","reiki/yggdrasil/basic-course"]) assert.ok(src.includes(route));
 assert.match(src,/tantra-reiki-yin-yang-cover.svg/);
 assert.match(src,/<ContactChannelChooser/);
 assert.match(src,/whatsappEnquiryUrl/);
 assert.match(src,/publicServiceTitle/);
 assert.doesNotMatch(src,/bookingSku=/);
});
test("Localized filters and mobile tap targets are preserved",()=>{
 for(const locale of ["ru:","en:","es:"]) assert.ok(src.includes(locale));
 assert.match(src,/useState<Direction>/);
 assert.match(src,/useState<Format>/);
 assert.match(src,/aria-pressed/);
 assert.match(src,/filtered.length===0/);
 assert.match(css,/\.shelf\{display:none\}/);
 assert.match(css,/@media\(max-width:760px\)/);
 assert.match(css,/min-height:48px/);
});
