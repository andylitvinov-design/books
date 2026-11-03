// Export a neutral, one-off reminder that the learner must explicitly add
// to their phone's calendar. A downloaded .ics is NOT a confirmed notification.
export const REIKI_LESSON_REMINDER_DEFAULT = "19:00";
const PATH = "/academy/principles-of-energywork/learn";

function localStamp(date) {
  const pad = number => String(number).padStart(2, "0");
  return String(date.getFullYear()) + pad(date.getMonth() + 1) + pad(date.getDate()) +
    "T" + pad(date.getHours()) + pad(date.getMinutes()) + "00";
}

export function reikiTomorrowCalendar(locale = "en", time = REIKI_LESSON_REMINDER_DEFAULT, now = new Date()) {
  if (!(now instanceof Date) || !Number.isFinite(now.getTime())) throw new Error("INVALID_REMINDER_DATE");
  if (!/^(?:0[8-9]|1\d|2[01]):[0-5]\d$/.test(time)) throw new Error("INVALID_REMINDER_TIME");
  const language = locale === "ru" ? "ru" : "en";
  const [hour, minute] = time.split(":").map(Number);
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, hour, minute, 0);
  const end = new Date(start.getFullYear(), start.getMonth(), start.getDate(), hour, minute + 10, 0);
  const title = language === "ru" ? "Holistic House - время для урока" : "Holistic House - time for a lesson";
  const reminder = language === "ru" ? "Ваш следующий урок ждёт вас в Holistic House." : "Your next lesson awaits in Holistic House.";
  const url = "https://holistichouse.vercel.app/" + language + PATH;
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
  const lines = [
    "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Holistic House//Reiki Lesson Reminder//EN",
    "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "BEGIN:VEVENT",
    "UID:reiki-lesson-" + localStamp(start) + "@holistichouse.vercel.app",
    "DTSTAMP:" + stamp, "DTSTART:" + localStamp(start), "DTEND:" + localStamp(end),
    "SUMMARY:" + title, "DESCRIPTION:" + reminder + " " + url, "URL:" + url,
    "BEGIN:VALARM", "ACTION:DISPLAY", "TRIGGER:PT0M", "DESCRIPTION:" + title,
    "END:VALARM", "END:VEVENT", "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
