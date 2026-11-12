import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const component=readFileSync("components/services-coach-therapist-mobile.jsx","utf8");
const css=readFileSync("components/services-coach-therapist-mobile.module.css","utf8");
const api=readFileSync("lib/practitioners/public-remote-support-masters.ts","utf8");
const parent=readFileSync("components/services-studio-offers.tsx","utf8");
test("mobile coaching cards have two distinct real actions and a profile dialog",()=>{
  assert.match(component,/data-assist-coach-profile-dialog/);
  assert.match(component,/data-assist-coach-master/);
  assert.match(component,/coachSessionHref\(locale,"mira"\)/);
  assert.match(component,/coaching#coaching-session-request/);
  assert.match(component,/\/app\/consultations\?service=/);
  assert.match(component,/\.showModal\(\)/);
});
test("no appointment date or duration fields, only day/evening preference and topic",()=>{
  assert.match(component,/const periods = \["any","day","evening"\]/);
  assert.match(component,/data-assist-coach-topic/);
  assert.doesNotMatch(component,/type="date"|type="time"|10 мин|20 мин|40 €/);
});
test("approved public profiles and responsive targets",()=>{
  assert.match(api,/practitionerSlug: practitioner.slug/);
  assert.match(api,/profilePhoto: publicConsultationPhoto/);
  assert.match(parent,/<ServicesCoachTherapistMobile locale=\{locale\} \/>/);
  assert.match(parent,/<ServicesVideoGenerationCard locale=\{locale\} \/>/);
  assert.match(parent,/<ServicesCoursesShelf locale=\{locale\} \/>/);
  assert.equal((parent.match(/<ServicesCoachTherapistMobile locale=\{locale\} \/>/g) || []).length, 1, "coach shelf is mounted exactly once");
  assert.match(css,/\.shelf\{display:none\}/);
  assert.match(css,/min-height:48px/);
});
