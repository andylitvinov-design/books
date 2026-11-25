const LOCALES = new Set(["en", "ru", "es"]);

function escapeIcs(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n")
    .replace(/\r/g, "");
}

// RFC 5545 lines are limited to 75 UTF-8 octets; a folded continuation
// starts with one space, which must be included in that 75-octet budget.
// Iterating code points avoids cutting multibyte Cyrillic/Spanish characters.
function foldIcsLine(line) {
  const encoder = new TextEncoder();
  const segments = [];
  let segment = "";
  let octets = 0;
  for (const char of line) {
    const width = encoder.encode(char).length;
    if (octets + width > 75) {
      segments.push(segment);
      segment = " " + char;
      octets = 1 + width;
    } else {
      segment += char;
      octets += width;
    }
  }
  segments.push(segment);
  return segments.join("\r\n");
}

function utcStamp(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function validPublicUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

/**
 * Produces a calendar invitation only for an event that is already approved
 * for the public site and has not begun yet. It deliberately accepts no
 * ticket, attendee, price, or organiser data.
 *
 * @param {Record<string, unknown>} event
 * @param {{ locale: string, publicUrl: string, now?: Date }} options
 */
export function createPublicEventCalendar(event, { locale, publicUrl, now = new Date() } = {}) {
  if (!event || !LOCALES.has(locale) || event.status !== "published" || !validPublicUrl(publicUrl)) return null;
  const startsAt = Date.parse(event.startsAt);
  if (!Number.isFinite(startsAt) || startsAt <= new Date(now).getTime()) return null;
  const title = event.title?.[locale] || event.title?.en;
  const description = event.description?.[locale] || event.description?.en;
  const start = utcStamp(event.startsAt);
  if (!title || !description || !start) return null;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Holistic House//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    "UID:" + escapeIcs(event.id) + "@holistichouse.vercel.app",
    "DTSTAMP:" + utcStamp(now),
    "DTSTART:" + start,
  ];
  const end = event.endsAt && Date.parse(event.endsAt) > startsAt ? utcStamp(event.endsAt) : null;
  if (end) lines.push("DTEND:" + end);
  lines.push(
    "STATUS:CONFIRMED",
    "SUMMARY:" + escapeIcs(title),
    "DESCRIPTION:" + escapeIcs(description),
    ...(event.location ? ["LOCATION:" + escapeIcs(event.location)] : []),
    "URL:" + escapeIcs(publicUrl),
    "END:VEVENT",
    "END:VCALENDAR",
  );
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
