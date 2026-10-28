import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";

const source = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");
const offers = source("components/free-diagnosis-offers.tsx");
const css = source("components/free-diagnosis-offers.module.css");
const landing = source("components/free-entry-landing.tsx");
const hub = source("app/[locale]/services/free-consultation/page.tsx");
const capture = source("components/compact-lead-capture.tsx");
const diagnostic = source("components/free-diagnostic-start.tsx");
const phoneCss = source("components/free-diagnostic-start.module.css");
const chooser = source("components/contact-channel-chooser.tsx");

test("express landing has one service; consultation hub keeps its existing three offers", () => {
  assert.match(landing, /<PersonalExpressEnquiry locale=\{locale\} intro=\{/);
  assert.doesNotMatch(landing, /<FreeDiagnosisOffers/);
  assert.match(hub, /<FreeDiagnosisOffers locale=\{lang\} \/>/);
  assert.match(landing, /<PersonalTestimonials locale=\{locale\} variant="all" \/>/);
  assert.match(hub, /<PersonalTestimonials locale=\{lang\} variant="all" \/>/);
  assert.match(landing, /data-free-review-intro-video/);
  assert.match(landing, /data-featured-free-review-testimonials/);
  assert.match(offers, /\{intro\}/);
  const oneService = source("components/personal-express-enquiry.tsx");
  assert.match(oneService, /data-personal-express-enquiry/);
  assert.match(oneService, /express-review-focus/);
  assert.match(oneService, /"situation" \| "energy"/);
  assert.match(oneService, /"По ситуации"/);
  assert.match(oneService, /"По энергии и здоровью"/);
  assert.match(oneService, /compactPhone stayAfterSave resetKey=\{focus\}/);
  assert.match(oneService, /publicTopic=\{"Express review focus: " \+ t\.areas\[focus\]\.tag\}/);
  assert.doesNotMatch(oneService, /option:|topic:|context:|fetch\(|payment_received/);
  assert.match(offers, /data-free-diagnosis-layout=\{compact \? "compact" : "full"\}/);
  assert.match(source("components/personal-express-enquiry.module.css"), /@media\(max-width:360px\)/);
  assert.match(source("components/personal-express-enquiry.module.css"), /:focus-visible/);
  assert.match(css, /\.expandedInfo/);
});

test("personal express diagnosis unfolds inside the same landing, without a modal", () => {
  const enquiry = source("components/personal-express-enquiry.tsx");
  const enquiryCss = source("components/personal-express-enquiry.module.css");
  assert.match(landing, /<PersonalExpressEnquiry locale=\{locale\} intro=\{/);
  assert.match(enquiry, /data-express-reveal aria-expanded=\{expanded\}/);
  assert.match(enquiry, /aria-controls="express-request-form"/);
  assert.match(enquiry, /data-express-inline-disclosure hidden=\{!expanded\}/);
  assert.match(enquiry, /role="region" aria-label=\{t\.title\}/);
  assert.match(enquiry, /window\.location\.hash === "#request-free-review"/);
  assert.match(enquiry, /document\.addEventListener\("click", openFromAnchor\)/);
  assert.match(enquiry, /onClick=\{\(\) => setExpanded\(open => !open\)\}/);
  assert.match(enquiry, /useEffect\(\(\) => \{/);
  assert.match(enquiry, /setExpanded\(false\)/);
  assert.match(enquiry, /revealRef\.current\?\.focus\(\)/);
  assert.match(enquiry, /<ContactChannelChooser key=\{focus\}/);
  assert.match(enquiry, /compactPhone stayAfterSave resetKey=\{focus\}/);
  assert.match(enquiry, /"situation" \| "energy"/);
  // Messenger cards now carry the request CTA; the inline form stays available
  // as a smaller, accessible alternative rather than a duplicate primary button.
  for (const localized of [
    "Use the secure website form instead",
    "Заполнить защищённую форму на сайте",
    "Usar el formulario seguro de esta web",
  ]) assert.ok(enquiry.includes(localized), localized);
  const messenger = source("components/telegram-diagnostic-entry.tsx");
  for (const localized of [
    "Request my free review via Telegram", "Request my free review via WhatsApp",
    "Запросить бесплатный разбор через Telegram", "Запросить бесплатный разбор через WhatsApp",
    "Solicitar mi revisión gratis por Telegram", "Solicitar mi revisión gratis por WhatsApp",
  ]) assert.ok(messenger.includes(localized), localized);
  assert.ok(enquiry.indexOf("<TelegramDiagnosticEntry locale={locale} />") <
    enquiry.indexOf("<button ref={revealRef}"), "messenger actions appear before the optional website form");
  assert.doesNotMatch(enquiry, /reveal: "Request my free review"/);
  assert.match(enquiryCss, /\.disclosure\[hidden\]\{display:none!important\}/);
  assert.match(enquiryCss, /animation:expressUnfold/);
  assert.match(enquiryCss, /@media\(max-width:720px\)/);
  assert.match(enquiryCss, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(enquiry, /role="dialog"|aria-modal|style\.overflow|fetch\(|booking_confirmed|payment_received/);
  assert.doesNotMatch(enquiryCss, /position:fixed|\.scrim/);
});

test("the old consultation hub retains three separate offer scenes without changing them", () => {
  for (const id of ["situation-written-free", "wu-xing-free", "personal-session-30-eur50"]) {
    assert.equal((offers.match(new RegExp('id: "' + id + '"', "g")) || []).length, 3, id + " in all locales");
  }
  for (const text of [
    "Free situation diagnosis", "Бесплатная диагностика ситуации", "Diagnóstico gratuito de tu situación",
    "Wu Xing (Five Elements)", "У-Син (Пять стихий)", "Wu Xing (Cinco Elementos)",
    "Personal consultation", "Личная консультация", "Consulta personal",
    "30 MIN · €50", "30 МИН · €50", "БЕСПЛАТНО", "GRATIS",
    "ME — GOAL — PROBLEM", "Я — ЦЕЛЬ — ПРОБЛЕМА", "YO — META — PROBLEMA",
  ]) assert.ok(offers.includes(text), "Missing offer copy: " + text);
  for (const path of [
    "public/images/holistic-house/hero-olive-incense.webp",
    "public/academy/reiki-yggdrasil/source/eastern-tradition.png",
    "public/images/holistic-house/andy-about.png",
  ]) assert.ok(existsSync(new URL("../" + path, import.meta.url)), "Missing authentic image: " + path);

  assert.match(offers, /<article className=\{styles\.scene\}\s/);
  assert.match(offers, /<Image src=\{photos\[offer\.id\]\} alt=\{offer\.imageAlt\} fill loading="lazy"/);
  assert.match(offers, /<p className=\{styles\.summary\}>\{offer\.summary\}<\/p>/);
  assert.match(offers, /<p className=\{styles\.detail\}>\{offer\.detail\}<\/p>/);
  assert.match(offers, /<ol>\{offer\.steps\.map/);
  assert.doesNotMatch(offers, /<details className=\{styles\.details\}>|<summary>\{t\.details\}|moreHref/);
  assert.match(css, /grid-template-columns:minmax\(0,46%\) minmax\(0,54%\)/);
  assert.match(css, /min-height:calc\(100svh - 80px/);
  assert.match(css, /object-fit:cover/);
  assert.match(css, /@media\(max-width:390px\)/);
  assert.match(css, /@media\(max-width:720px\) and \(max-height:720px\)/);
  assert.match(css, /:focus-visible/);
});

test("the legacy consultation hub still opens its existing localized messenger sheet", () => {
  assert.match(offers, /onClick=\{\(\) => requestOffer\(offer\.id\)\}/);
  assert.match(offers, /setSelected\(id\)/);
  assert.match(offers, /setRequestOpen\(true\)/);
  assert.match(offers, /data-diagnosis-order-form/);
  assert.match(offers, /id="request-free-review" data-diagnosis-placement="top"/);
  assert.match(offers, /id="free-diagnosis-request-dialog"/);
  assert.match(offers, /data-diagnosis-placement="top"/);
  assert.match(offers, /data-diagnosis-placement="bottom"/);
  assert.match(offers, /id="free-diagnosis-top"/);
  assert.match(offers, /id="free-diagnosis-bottom"/);
  assert.match(offers, /onClick=\{\(\) => requestOffer\("situation-written-free"\)\}/);
  assert.match(offers, /\{children\}/);
  assert.match(css, /\.formWrap\[data-open="false"\]\{display:none\}/);
  assert.match(offers, /data-open=\{requestOpen \? "true" : "false"\}/);
  assert.match(offers, /role=\{requestOpen \? "dialog" : undefined\}/);
  assert.match(offers, /aria-modal=\{requestOpen \|\| undefined\}/);
  assert.match(offers, /aria-haspopup="dialog"/);
  assert.match(offers, /<ContactChannelChooser key=\{selected\} locale=\{locale\}/);
  assert.match(offers, /compactPhone stayAfterSave resetKey=\{selected\}/);
  assert.match(offers, /whatsappUrl=\{whatsappEnquiryUrl\(\{/);
  assert.match(offers, /service: activeOffer\.title, request: t\.messengerRequest/);
  assert.match(offers, /option: activeOffer\.price, pagePath: pathname/);
  assert.match(offers, /publicTopic=\{activeOffer\.label \+ " · " \+ activeOffer\.price\}/);
  assert.match(offers, /closeButtonRef\.current\?\.focus\(\)/);
  assert.match(offers, /previousFocus\?\.focus\(\)/);
  assert.match(css, /position:fixed;z-index:111;bottom:0/);
  assert.match(css, /@media\(max-width:350px\)/);
  assert.doesNotMatch(offers, /<FreeDiagnosticStart|<CompactLeadCapture/);
  assert.doesNotMatch(offers, /fetch\(|gtag\(|dataLayer|autoplay|payment_received|payment_captured/);
  for (const localized of [
    "Request free diagnosis", "Заказать бесплатную диагностику", "Solicitar diagnóstico gratuito",
    "WhatsApp or Telegram", "WhatsApp или Telegram", "WhatsApp o Telegram",
  ]) assert.ok(offers.includes(localized), localized);
  assert.match(offers, /not a medical diagnosis or treatment/);
  assert.match(offers, /символическая модель/);
});

test("Messenger buttons commit a consented lead to CRM before direct WhatsApp or Telegram handoff", () => {
  assert.match(chooser, /<PhoneCountryInput/);
  assert.match(chooser, /contactConsent: consent/);
  assert.match(chooser, /fetch\("\/api\/service-enquiries"/);
  assert.match(chooser, /data\.saved !== true/);
  assert.match(chooser, /window\.open\("about:blank", "_blank"\)/);
  assert.match(chooser, /telegramEnquiryUrlFromWhatsApp/);
  assert.match(chooser, /handoffWindow\.location\.replace\(destination\)/);
  assert.match(chooser, /saveEnquiry\("whatsapp"\)/);
  assert.match(chooser, /saveEnquiry\("telegram"\)/);
  assert.match(offers, /No appointment or payment is confirmed/);
  assert.doesNotMatch(offers, /contact: \{.*health|sessionStorage\.setItem|booking_confirmed/);
});

test("legacy coaching questionnaire remains reachable separately without intercepting Request", () => {
  assert.match(landing, /<Link href=\{"\/" \+ locale \+ "\/coaching\/intake"\}/);
  assert.match(diagnostic, /compact = false/);
  assert.match(diagnostic, /data-free-diagnostic-phone-only/);
  assert.match(diagnostic, /type="tel" inputMode="tel" autoComplete="tel"/);
  assert.match(diagnostic, /compact && !phone/);
  assert.match(diagnostic, /sessionStorage\.setItem\(DIAGNOSTIC_START_KEY/);
  assert.match(diagnostic, /window\.location\.assign\("\/" \+ locale \+ "\/coaching\/intake"\)/);
  assert.match(diagnostic, /until you explicitly send your completed questionnaire/);
  assert.match(phoneCss, /\.compactForm/);
  assert.match(phoneCss, /@media\(max-width:610px\)/);
});
