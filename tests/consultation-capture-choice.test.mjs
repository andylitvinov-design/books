import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const component = read("components/consultation-choice-capture.tsx");
const styles = read("components/consultation-choice-capture.module.css");

test("four clearly selectable consultation topics and three service intents work without compulsory fields", () => {
  for (const key of ["personal", "goal", "business", "wellbeing"]) assert.ok(component.includes(key), key);
  for (const key of ["session", "free", "questions"]) assert.ok(component.includes(key), key);
  assert.match(component, /useState<Topic>\("personal"\)/);
  assert.match(component, /useState<ServiceChoice>\("session"\)/);
  assert.match(component, /aria-pressed=\{topic === choice\}/);
  assert.match(component, /aria-pressed=\{serviceChoice === choice\}/);
  assert.match(component, /onClick=\{\(\) => setTopic\(choice\)\}/);
  assert.match(component, /onClick=\{\(\) => setServiceChoice\(choice\)\}/);
  assert.doesNotMatch(component, /<input|<textarea|<form|<select|required=|FormData/);
});

test("the selected topic or paid service is included in a WhatsApp draft, not sent to a hidden backend", () => {
  assert.match(component, /encodeURIComponent\(message\)/);
  assert.match(component, /t\.topicOptions\[topic\]/);
  assert.match(component, /t\.serviceOptions\[serviceChoice\]/);
  assert.match(component, /service \|\|/);
  assert.match(component, /https:\/\/wa\.me\/14376066502\?text=/);
  assert.match(component, /https:\/\/t\.me\/AndyTherapist/);
  assert.match(component, /event="service_request_start"/);
  assert.match(component, /event="contact_click"/);
  assert.match(component, /Nothing is sent until you press Send/);
  assert.match(component, /not a confirmed appointment or payment/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|sendBeacon|fetch\(|window\.open|payment checkout|diagnose|cure/i);
});

test("EN RU ES messages are distinct and make no compulsory medical or paid commitment", () => {
  for (const phrase of ["Personal situation", "Личная ситуация", "Situación personal",
    "Free introductory conversation", "Бесплатная вводная беседа", "Conversación inicial gratuita",
    "No obligation", "Без обязательств", "Sin compromiso",
    "not a medical diagnosis", "не медицинская диагностика", "no un diagnóstico médico"]) {
    assert.ok(component.includes(phrase), phrase);
  }
});

test("pale blue/teal card and orange CTA are compact, legible and keyboard accessible", () => {
  assert.match(styles, /linear-gradient\(125deg, #e9f7fe 0%, #ddf5f2 55%, #dcf6ea 100%\)/);
  assert.match(styles, /\.choice\[data-selected="true"\]/);
  assert.match(styles, /background:#17728b/);
  assert.match(styles, /background:#e66d50/);
  assert.match(styles, /\.capture :is\(a,button\):focus-visible/);
  assert.match(styles, /@media \(max-width:640px\)/);
  assert.match(styles, /prefers-reduced-motion/);
  assert.match(component, /role="group"/);
  assert.match(component, /aria-labelledby=\{titleId\}/);
});

test("free review and paid service stay public-only; training Reiki and the private client cabinet are untouched", () => {
  const free = read("components/free-situation-review-form.tsx");
  const paid = read("components/personal-consultation-form.tsx");
  const academy = read("components/reiki-choice-capture.tsx");
  assert.match(free, /variant="free"/);
  assert.match(paid, /variant="service"/);
  assert.match(academy, /"tantra" \| "yggdrasil"/);
  assert.doesNotMatch(free + paid + component, /\/api\/app\/|client-report|patient-data|HEYGEN_API_KEY/);
});
