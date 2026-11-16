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


test("Messenger-only order CTA stays compact until deliberate tap",()=>{
  assert.match(src,/compactTrigger/);
  assert.match(src,/data-assist-course-order=\{course\.id\}/);
  assert.match(css,/\.order:has\(details\) summary/);
  assert.match(css,/\.actions:has\(details\[open\]\)/);
  assert.match(css,/details\[open\]>div/);
  assert.match(src,/ContactChannelChooser/);
});

test("All, Free and Teacher filter options do not duplicate the same course selection",()=>{
 assert.match(src,/type Format = "all" \| "free" \| "teacher"/);
 assert.doesNotMatch(src,/online: "Онлайн"/);
 assert.match(src,/format === "all"/);
 assert.match(src,/format === "free" && course.freeIntro/);
 assert.match(src,/format === "teacher" && course.teacher/);
 assert.match(src,/id: "dionysus", direction: "temple", teacher: false, freeIntro: false/);
 assert.match(src,/id: "tantra", direction: "reiki", teacher: true, freeIntro: true/);
 assert.match(src,/id: "yggdrasil", direction: "reiki", teacher: true, freeIntro: false/);
});

test("Telegram course enquiry uses the same selected-course handoff as WhatsApp",()=>{
 const chooser=readFileSync("components/contact-channel-chooser.tsx","utf8");
 const messenger=readFileSync("components/mandatory-messenger-actions.tsx","utf8");
 const whatsapp=readFileSync("lib/whatsapp-enquiry.js","utf8");
 assert.match(src,/const enquiryUrl = whatsappEnquiryUrl/);
 assert.match(src,/telegramEnquiryUrl=\{telegramEnquiryUrlFromWhatsApp\(enquiryUrl\)\}/);
 assert.match(chooser,/telegramEnquiryUrl\?: string/);
 assert.match(chooser,/telegramUrl=\{telegramEnquiryUrl\}/);
 assert.match(messenger,/if\(telegramUrl\)\{setBot\(null\);return;\}/);
 assert.match(messenger,/telegramUrl\?"manual":bot\?\.kind/);
 assert.match(messenger,/!telegramUrl&&bot/);
 assert.match(whatsapp,/export const TELEGRAM_USERNAME = "AndyTherapist"/);
 assert.match(whatsapp,/new URL\(whatsappUrl\)/);
});

test("Course cards have readable mobile copy and tappable controls",()=>{
 assert.match(css,/\.body p\{[^}]*font-size:14px/);
 assert.match(css,/\.body small\{[^}]*font-size:12px/);
 assert.match(css,/\.details,\.order\{[^}]*min-height:48px/);
 assert.match(css,/\.order:has\(details\) summary\{[^}]*min-height:48px/);
});
