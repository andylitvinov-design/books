import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const landing = read("components/tantra-free-initiation.tsx");
const chooser = read("components/contact-channel-chooser.tsx");
const locales = ["en", "ru", "es"];

// Frozen owner-approved copy from blob 45beca9484da44dad2883e64b14b2c360d54298d.
// Updating these digests requires explicit review of the approved steps/questions.
const approved = {
  "guideSteps": [
    "4526b1b0a76abc9422469d850b32ed45b3f14b64f082aae1b4a030ab492e77ac",
    "ce6058aeb4e0785d00ed5e6e3d0b406da903b3f7f20d678ac6d61366806ef786",
    "522823a1f5d614db78ac49378870f8c72595fc225cb322497bdb5cd6818241ce"
  ],
  "questions": [
    "21a4ee68d0a458e164b2997106a0b17652ecdeea530a6c80fa7b86635a7bd84b",
    "41e53786935eab1a4d5aafe6bc21121e565aeb63193bb12e705669fd54667af6",
    "cf77c243d7e3a116c683f98dfe98d5587bd5af136bcc0ab9e616d029e15bf450"
  ]
};

for (const key of ["personalButton", "combinedButton", "questionAction", "formEyebrow", "formLead"]) {
  test(`${key} describes both available channels in EN/RU/ES`, () => {
    const values = [...landing.matchAll(new RegExp(`${key}: "([^"\\n]*)"`, "g"))].map((match) => match[1]);
    assert.equal(values.length, 3);
    for (const [index, value] of values.entries()) {
      assert.match(value, /whatsapp/i, locales[index]);
      assert.match(value, /telegram/i, locales[index]);
    }
  });
}

for (const [key, hashes] of Object.entries(approved)) {
  test(`${key} preserves the owner's exact EN/RU/ES content`, () => {
    const groups = [...landing.matchAll(new RegExp(`${key}: \\[([\\s\\S]*?)\\n    \\]`, "g"))].map((match) => match[1]);
    assert.equal(groups.length, 3);
    for (const [index, group] of groups.entries()) {
      const count = key === "guideSteps" ? (group.match(/\{ title:/g) || []).length : (group.match(/^\s*"/gm) || []).length;
      assert.equal(count, key === "guideSteps" ? 5 : 7, locales[index]);
      assert.equal(createHash("sha256").update(group).digest("hex"), hashes[index], locales[index]);
    }
  });
}

test("fifth step remains optional personal initiation at the approved price", () => {
  for (const title of ["Book a personal distance initiation", "Запишитесь на личную дистанционную инициацию", "Reserva una iniciación personal a distancia"]) {
    assert.ok(landing.includes(`title: "${title}"`), title);
  }
  assert.equal((landing.match(/€50 \/ 30 min\./g) || []).length, 2);
  assert.ok(landing.includes("€50 / 30 мин."));
  assert.match(landing, /formatReikiLevelPrice\("tantra", locale\)/);
  assert.match(read("lib/academy/reiki-level-pricing.js"), /tantra: Object\.freeze\(\{ amountEur: 50, durationMinutes: 30 \}\)/);
  for (const price of ['freePrice: "€0"', 'freePrice: "0 €"', 'combinedPrice: "€100"', 'combinedPrice: "100 €"']) assert.ok(landing.includes(price));
});

test("labels still use the existing chooser and the approved original video", () => {
  for (const key of ["personalButton", "combinedButton", "questionAction"]) {
    assert.match(landing, new RegExp(`<ContactChannelChooser[^>]*label=\\{t\\.${key}\\}`));
  }
  assert.match(chooser, /data-contact-channel": "whatsapp"/);
  assert.match(chooser, /data-contact-channel": "telegram"/);
  assert.match(landing, /englishGuidedMeditations\.find\(\(item\) => item\.key === "tantra-reiki"\)/);
  assert.match(landing, /<AcademyVideoPlayer youtubeId=\{video\.youtubeId\} title=\{video\.title\} \/>/);
  assert.match(read("data/academy/english-guided-meditations.ts"), /key: "tantra-reiki"[\s\S]+?youtubeId: "w2BN-HYmHUk"/);
});
