import assert from "node:assert/strict";
import test from "node:test";

import { createPublicEventCalendar } from "../lib/public-event-calendar.js";

const event = {
  id: "toronto-workshop-2026-10-25",
  status: "published",
  startsAt: "2026-10-25T19:00:00-04:00",
  endsAt: "2026-10-25T22:00:00-04:00",
  location: "665 Dupont Street, Toronto, ON M6G 1Z5",
  title: { en: "A; title, with \\ punctuation", ru: "", es: "" },
  description: { en: `A public workshop
with two lines.`, ru: "", es: "" },
};

test("calendar export contains only verified public event details in RFC5545-safe fields", () => {
  const ics = createPublicEventCalendar(event, {
    locale: "en",
    publicUrl: "https://holistichouse.vercel.app/en/events/toronto-workshop-2026-10-25",
    now: new Date("2026-10-19T12:00:00Z"),
  });

  const unfolded = ics.replace(/\r\n[ \t]/g, "");
  for (const line of ics.split("\r\n").filter(Boolean)) {
    assert.ok(Buffer.byteLength(line, "utf8") <= 75, "calendar line exceeds 75 octets");
  }

  assert.match(unfolded, /^BEGIN:VCALENDAR\r\nVERSION:2\.0\r\nPRODID:-\/\/Holistic House\/\/Events\/\/EN\r\n/m);
  assert.match(unfolded, /UID:toronto-workshop-2026-10-25@holistichouse\.vercel\.app\r\n/);
  assert.match(unfolded, /DTSTART:20261025T230000Z\r\nDTEND:20261026T020000Z\r\n/);
  assert.match(unfolded, /SUMMARY:A\\; title\\, with \\\\ punctuation\r\n/);
  assert.match(unfolded, /DESCRIPTION:A public workshop\\nwith two lines\.\r\n/);
  assert.match(unfolded, /LOCATION:665 Dupont Street\\, Toronto\\, ON M6G 1Z5\r\n/);
  assert.match(unfolded, /URL:https:\/\/holistichouse\.vercel\.app\/en\/events\/toronto-workshop-2026-10-25\r\n/);
  assert.doesNotMatch(unfolded, /price|organizer|offer/i);
});

test("calendar export rejects events that are not currently confirmed and upcoming", () => {
  const options = {
    locale: "en",
    publicUrl: "https://holistichouse.vercel.app/en/events/toronto-workshop-2026-10-25",
    now: new Date("2026-10-19T12:00:00Z"),
  };
  assert.equal(createPublicEventCalendar({ ...event, status: "draft" }, options), null);
  assert.equal(createPublicEventCalendar({ ...event, startsAt: "2026-10-18T19:00:00-04:00" }, options), null);
  assert.equal(createPublicEventCalendar(event, { ...options, locale: "de" }), null);
});

test("folds long multilingual fields on UTF-8 boundaries without losing any characters", () => {
  const title = "Приглашение на открытый практический семинар по осознанности и творческим упражнениям для начинающих участников";
  const description = "Этот текст содержит очень длинное описание для календаря и проверяет сохранение всех букв кириллицы после переноса длинной строки в файле события";
  const ics = createPublicEventCalendar({
    ...event,
    title: { ru: title },
    description: { ru: description },
  }, {
    locale: "ru",
    publicUrl: "https://holistichouse.vercel.app/ru/events/toronto-workshop-2026-10-25",
    now: new Date("2026-10-19T12:00:00Z"),
  });
  const lines = ics.split("\r\n").filter(Boolean);
  assert.ok(lines.some(line => line.startsWith(" ")), "a long line should be folded");
  for (const line of lines) {
    assert.ok(Buffer.byteLength(line, "utf8") <= 75, "RFC 5545 line exceeded 75 octets");
  }
  const unfolded = ics.replace(/\r\n[ \t]/g, "");
  assert.ok(unfolded.includes("SUMMARY:" + title));
  assert.ok(unfolded.includes("DESCRIPTION:" + description));
  assert.ok(unfolded.includes("URL:https://holistichouse.vercel.app/ru/events/toronto-workshop-2026-10-25"));
});
