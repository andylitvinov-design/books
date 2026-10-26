// Read-only mobile acceptance against the exact PR build or canonical alias.
// Chromium/WebKit emulate touch; this is not physical iPhone Safari verification.
// Never submit private questionnaires, create CRM leads, send messages or buy anything.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN import
import {createFreeReviewViewportIsolation} from './helpers/free-review-viewport-isolation.mjs';
import {clickDisclosureOnce,unsafeDisclosureCleanup,boundedDisclosureCleanup} from './helpers/free-review-native-disclosure-action.mjs';
// HH_DISCLOSURE_ACTION_EXPERIMENT_END import
// HH_DISCLOSURE_DIAGNOSTICS_BEGIN installer
// Bounded passive observation; never a repaired-behavior claim.
function installDisclosureDiagnostics() {
  const limit = 128;
  const observations = [];
  const listeners = [];
  let dropped = 0, sequence = 0, captureFailures = 0, finished = false;
  // HH_SCROLL_DIAGNOSTICS_BEGIN storage
  // Separate stream: scroll noise must never evict the original interaction ring.
  const scrollLimit = 64, scrollObservations = [];
  let scrollDropped = 0, scrollSequence = 0, scrollCaptureFailures = 0;
  // HH_SCROLL_DIAGNOSTICS_END storage
  const number = value => typeof value === 'number' && Number.isFinite(value)
    ? Math.max(-10000000, Math.min(10000000, value)) : null;
  const flag = value => value === 'true' ? 'true' : value === 'false' ? 'false' : value === null ? 'missing' : 'other';
  const category = node => {
    if (!(node instanceof Element)) return 'none';
    for (const [selector, role] of [
      ['[data-express-reveal]', 'reveal'],
      ['section[aria-labelledby="free-entry-title"] a[href="#request-free-review"]', 'hero-anchor'],
      ['a[href="#request-free-review"]', 'request-anchor'],
      ['input[name="express-review-focus"]', 'focus-radio'],
      ['[data-personal-express-enquiry] input[type="tel"]', 'phone'],
      ['[data-personal-express-enquiry] input[type="checkbox"]', 'consent'],
      ['[data-express-inline-disclosure]', 'panel'],
      ['[data-personal-express-enquiry]', 'enquiry'],
      ['.mobile-bottom-navigation', 'bottom-navigation'],
      ['header.house-header', 'header'],
    ]) if (node.closest(selector)) return role;
    return 'other';
  };
  const rect = node => {
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return Object.fromEntries(['left','right','top','bottom','width','height'].map(key => [key, number(box[key])]));
  };
  // HH_SCROLL_DIAGNOSTICS_BEGIN sampler
  const scrollFailure = () => { scrollCaptureFailures = Math.min(10000000, scrollCaptureFailures + 1); };
  const scrollSample = () => {
    try {
      const root = document.scrollingElement, viewport = window.visualViewport;
      const behavior = document.documentElement
        ? getComputedStyle(document.documentElement).scrollBehavior : null;
      return {
        scroll: {x:number(scrollX),y:number(scrollY)},
        rootScroll: root ? {x:number(root.scrollLeft),y:number(root.scrollTop)} : null,
        visualViewport: viewport ? Object.fromEntries(
          ['offsetLeft','offsetTop','pageLeft','pageTop','width','height','scale']
            .map(key => [key,number(viewport[key])])) : null,
        rootScrollBehavior: behavior === 'auto' || behavior === 'smooth' ? behavior
          : behavior == null ? 'missing' : 'other',
      };
    } catch { scrollFailure(); return null; }
  };
  const appendScroll = (kind, source, event) => {
    if (finished) return;
    try {
      const entry = {sequence:Math.min(10000000, scrollSequence + 1),kind,source,
        time:number(performance.now()),eventTime:number(event?.timeStamp),
        trusted:event?.isTrusted === true,sample:scrollSample(),
        reveal:rect(document.querySelector('[data-express-reveal]'))};
      scrollSequence = entry.sequence;
      if (scrollObservations.length === scrollLimit) {
        scrollObservations.shift(); scrollDropped = Math.min(10000000, scrollDropped + 1);
      }
      scrollObservations.push(entry);
    } catch { scrollFailure(); }
  };
  // HH_SCROLL_DIAGNOSTICS_END sampler
  const snapshot = () => {
    const reveal = document.querySelector('[data-express-reveal]');
    const panel = document.querySelector('[data-express-inline-disclosure]');
    return {
      // HH_SCROLL_DIAGNOSTICS_BEGIN context
      // The previous delivered scroll event is retained even after stream rollover.
      // This and all geometry reads can perturb timing; they are not a fix claim.
      scrollContext: {current:scrollSample(),previous:scrollObservations.at(-1) ?? null},
      // HH_SCROLL_DIAGNOSTICS_END context
      expanded: flag(reveal?.getAttribute('aria-expanded') ?? null),
      hidden: panel ? Boolean(panel.hidden) : null,
      focus: category(document.activeElement),
      atRequestHash: location.hash === '#request-free-review',
      scroll: {x:number(scrollX),y:number(scrollY)},
      viewport: {width:number(innerWidth),height:number(innerHeight)},
      reveal: rect(reveal), panel: rect(panel),
      nav: rect(document.querySelector('.mobile-bottom-navigation')),
      header: rect(document.querySelector('header.house-header')),
    };
  };
  const append = (kind, phase, event, attribute = null, oldState = null) => {
    if (finished) return;
    try {
    const x = number(event?.clientX), y = number(event?.clientY);
    const hit = x !== null && y !== null ? category(document.elementFromPoint(x, y)) : 'none';
    sequence = Math.min(10000000, sequence + 1);
    const entry = {sequence,kind,phase,time:number(performance.now()),
      eventTime:number(event?.timeStamp),trusted:event ? event.isTrusted === true : null,
      defaultPrevented:event ? event.defaultPrevented === true : null,
      pointerType:['mouse','pen','touch'].includes(event?.pointerType) ? event.pointerType : 'none',
      target:category(event?.target),hit,point:{x,y},detail:number(event?.detail),
      attribute,oldState,state:snapshot()};
    if (observations.length === limit) { observations.shift(); dropped = Math.min(10000000, dropped + 1); }
    observations.push(entry);
    } catch { captureFailures = Math.min(10000000, captureFailures + 1); }
  };
  const listen = (target, type, callback, capture) => {
    target.addEventListener(type, callback, {capture,passive:true});
    listeners.push({target,type,callback,capture});
  };
  for (const type of ['pointerdown','pointerup','mousedown','mouseup','click','keydown']) {
    for (const capture of [true,false]) {
      listen(document, type, event => {
        if (type === 'keydown' && event.key !== 'Escape') return;
        append(type, capture ? 'capture' : 'bubble', event);
      }, capture);
    }
  }
  listen(document, 'focusin', event => append('focusin','capture',event), true);
  listen(window, 'hashchange', event => append('hashchange','observe',event), false);
  // HH_SCROLL_DIAGNOSTICS_BEGIN listeners
  for (const type of ['scroll','scrollend']) {
    try { listen(window,type,event => appendScroll(type,'window',event),false); }
    catch { scrollFailure(); }
  }
  try {
    const viewport = window.visualViewport;
    if (viewport) for (const type of ['scroll','scrollend']) {
      try { listen(viewport,type,event => appendScroll(type,'visual-viewport',event),false); }
      catch { scrollFailure(); }
    }
  } catch { scrollFailure(); }
  // HH_SCROLL_DIAGNOSTICS_END listeners
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (!(record.target instanceof Element)) continue;
      if (record.attributeName === 'aria-expanded' && record.target.matches('[data-express-reveal]')) {
        append('mutation','observe',{target:record.target},'aria-expanded',flag(record.oldValue));
      } else if (record.attributeName === 'hidden' && record.target.matches('[data-express-inline-disclosure]')) {
        append('mutation','observe',{target:record.target},'hidden',record.oldValue !== null);
      } else if (record.attributeName === 'data-expanded' && record.target.matches('[data-personal-express-enquiry]')) {
        append('mutation','observe',{target:record.target},'data-expanded',flag(record.oldValue));
      }
    }
  });
  observer.observe(document,{subtree:true,attributes:true,attributeOldValue:true,
    attributeFilter:['aria-expanded','hidden','data-expanded']});
  window.__hhDisclosureDiagnostics = {
    finish() {
      if (!finished) {
        finished = true;
        for (const {target,type,callback,capture} of listeners) target.removeEventListener(type,callback,capture);
        observer.disconnect();
      }
      return {version:1,limit,dropped,captureFailures,observations};
    },
  };
  // HH_SCROLL_DIAGNOSTICS_BEGIN export
  const finishInteractions = window.__hhDisclosureDiagnostics.finish;
  window.__hhDisclosureDiagnostics.finish = () => ({
    ...finishInteractions(),
    scrollDiagnostics: {version:1,limit:scrollLimit,dropped:scrollDropped,
      captureFailures:scrollCaptureFailures,observations:scrollObservations},
  });
  // HH_SCROLL_DIAGNOSTICS_END export
}
// HH_DISCLOSURE_DIAGNOSTICS_END installer
// Check each actual action after positioning it in the current layout. The
// expanded inline panel may exceed a screen; its reveal and hero CTA must not.
function assertActionableGeometry(geometry, label) {
  const { control, viewport, header, nav } = geometry;
  assert.ok(control && viewport && header && nav, label + ': action, header and bottom navigation exist');
  for (const rect of [control, header, nav]) {
    assert.ok(['left','right','top','bottom','width','height'].every(key => Number.isFinite(rect[key])),
      label + ': finite rendered geometry');
  }
  assert.ok(Number.isFinite(viewport.width) && viewport.width > 0 && Number.isFinite(viewport.height) && viewport.height > 0,
    label + ': finite viewport');
  assert.ok(control.width >= 44 && control.height >= 44, label + ': 44px touch target');
  assert.ok(control.right > control.left && control.bottom > control.top, label + ': nonempty action');
  assert.ok(control.left >= -2 && control.right <= viewport.width + 2, label + ': horizontal viewport fit');
  assert.ok(nav.width > 0 && nav.height > 0 && nav.top < viewport.height && nav.bottom <= viewport.height + 2,
    label + ': visible bottom navigation');
  const availableTop = Math.max(0, header.bottom);
  const availableBottom = Math.min(viewport.height, nav.top);
  assert.ok(control.top >= availableTop - 1, label + ': clear of fixed header');
  assert.ok(control.bottom <= availableBottom - 1, label + ': clear of bottom navigation and viewport');
}
async function inspectActionableControl(control, label) {
  const geometry = await control.evaluate(element => {
    element.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
    const rect = node => {
      if (!node) return null;
      const {left,right,top,bottom,width,height} = node.getBoundingClientRect();
      return {left,right,top,bottom,width,height};
    };
    return {control:rect(element),viewport:{width:innerWidth,height:innerHeight},
      header:rect(document.querySelector('header.house-header')),
      nav:rect(document.querySelector('.mobile-bottom-navigation'))};
  });
  assertActionableGeometry(geometry, label);
  return geometry;
}
function assertFirstScreenGeometry(geometry) {
  assert.ok(geometry.hero && geometry.cta && geometry.nav && geometry.viewport,
    'First screen has hero, CTA and bottom navigation');
  assert.ok([geometry.hero.bottom,geometry.cta.bottom,geometry.nav.top,geometry.viewport.height].every(Number.isFinite),
    'Finite first-screen geometry');
  const availableBottom = Math.min(geometry.viewport.height, geometry.nav.top);
  assert.ok(geometry.cta.bottom <= availableBottom - 1, 'First-screen CTA clears bottom navigation');
  assert.ok(geometry.hero.bottom <= availableBottom + 1, 'First-screen hero fits above bottom navigation');
}
const { chromium, webkit } = await import(process.env.HH_PLAYWRIGHT_PACKAGE || "playwright");
const origin = (process.env.HH_LIVE_ORIGIN || "https://holistichouse.vercel.app").replace(/\/$/, "");
const output = "artifacts/free-review-live-mobile";
mkdirSync(output, { recursive: true });
// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN abort-state
const results = [];
let unsafeActionFailure = null;
// HH_DISCLOSURE_ACTION_EXPERIMENT_END abort-state
const cases = [[320, 568], [375, 667], [390, 844], [430, 932]];
// One personal express review, with two focus categories in a single form.
for (const [engine, driver] of [["chromium", chromium], ["webkit", webkit]]) {
  const browser = await driver.launch({ headless: true });
  try {
    for (const locale of ["en", "ru", "es"]) {
      for (const [width, height] of cases) {
        const name = engine + "-" + locale + "-" + width + "x" + height;
        const record = { engine, locale, width, height };
        const isolation=await createFreeReviewViewportIsolation(browser,{origin,locale,viewport:{width,height}});
        const {page}=isolation;
        const errors=[];
        page.on('pageerror',()=>errors.push('PAGE_ERROR'));
        try {
          // HH_DISCLOSURE_DIAGNOSTICS_BEGIN install
          try { await page.addInitScript(installDisclosureDiagnostics); }
          catch { record.disclosureDiagnostics = {version:1,status:'INSTALL_UNAVAILABLE'}; }
          // HH_DISCLOSURE_DIAGNOSTICS_END install
          const response = await page.goto(origin + "/" + locale + "/services/free-situation-review",
            { waitUntil: "domcontentloaded", timeout: 65000 });
          assert.equal(response?.status(), 200, "localized page HTTP 200");
          const main = page.locator('[data-free-entry-landing="situation"]');
          const hero = main.locator('section[aria-labelledby="free-entry-title"]');
          const video = main.locator("[data-featured-constellations-video]");
          const mainCta = hero.locator('a[href="#request-free-review"]');
          await video.waitFor({ state: "visible", timeout: 25000 });
          await mainCta.waitFor({ state: "visible" });
          assert.ok((await hero.locator("h1").innerText()).trim().length > 15);
          assert.match(await hero.innerText(), /Andrey|Андреем|Андрей/i, "Andrey named in hero");
          assert.equal(await video.locator("iframe").count(), 0, "hero video does not autoplay");
          const original = video.locator('a[href*="youtube.com/watch"]');
          assert.equal(await original.getAttribute("href"), "https://www.youtube.com/watch?v=sfVFOQNr2qk");
          const outcome = main.locator("#what-you-get");
          const process = main.locator("#how-it-works");
          const method = main.locator("#how-i-review");
          const enquiry = main.locator("[data-personal-express-enquiry]");
          await method.waitFor({ state: "visible" });
          await enquiry.waitFor({ state: "visible" });
          assert.equal(await main.locator("[data-diagnosis-offer]").count(), 0,
            "three retired offer cards must not be on this landing");
          assert.equal(await main.locator("[data-free-diagnosis-options]").count(), 0,
            "no choose-three-options section");
          assert.equal(await main.locator("[data-personal-express-enquiry]").count(), 1,
            "only one personal express request form");
          assert.equal(await main.locator("[data-free-diagnostic-start]").count(), 0,
            "no retired Step 1 form");
          await page.evaluate(() => document.fonts.ready);
          const geometry = await page.evaluate(() => {
            const r = element => {
              if (!element) return null;
              const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
              return { left, right, top, bottom, width, height };
            };
            const main = document.querySelector('[data-free-entry-landing="situation"]');
            const hero = main.querySelector('section[aria-labelledby="free-entry-title"]');
            const video = main.querySelector('[data-featured-constellations-video]');
            const frame = video.querySelector(".site-video-frame");
            const cta = hero.querySelector('a[href="#request-free-review"]');
            const nav = document.querySelector(".mobile-bottom-navigation");
            const process = main.querySelector("#how-it-works");
            const outcome = main.querySelector("#what-you-get");
            const method = main.querySelector("#how-i-review");
            const enquiry = main.querySelector("[data-personal-express-enquiry]");
            return {
              overflow: document.documentElement.scrollWidth - innerWidth,
              viewport: { width: innerWidth, height: innerHeight },
              hero: r(hero), video: r(video), frame: r(frame), cta: r(cta),
              nav: r(nav), outcome: r(outcome), method: r(method), process: r(process), enquiry: r(enquiry),
            };
          });
          record.geometry = geometry;
          assertFirstScreenGeometry(geometry);
          assert.ok(geometry.overflow <= 2, "no horizontal scroll: " + geometry.overflow);
          assert.ok(geometry.frame && Math.abs(geometry.frame.width / geometry.frame.height - 16 / 9) < 0.06,
            "landscape intro poster aspect ratio 16:9");
          assert.ok(geometry.video.bottom < geometry.cta.top, "watch first, CTA follows");
          assert.ok(geometry.cta.height >= 44, "CTA has 44px touch target");
          assert.ok(geometry.outcome.top > geometry.hero.top, "benefits after video hero");
          assert.ok(geometry.method.top > geometry.outcome.top, "one method screen after benefits");
          assert.ok(geometry.process.top > geometry.method.top, "steps after method");
          assert.ok(geometry.enquiry.top > geometry.process.top, "one form at the bottom");
          await page.screenshot({ path: output + "/" + name + "-first-screen.png",
            animations: "disabled", timeout: 20000 });
          const reveal = enquiry.locator("[data-express-reveal]");
          const disclosure = enquiry.locator("[data-express-inline-disclosure]");
          record.actionableControls = {
            hero: await inspectActionableControl(mainCta, 'Hero CTA'),
            revealCollapsed: await inspectActionableControl(reveal, 'Inline reveal collapsed'),
          };
          assert.equal(await reveal.count(), 1, "one inline reveal button");
          assert.equal(await reveal.getAttribute("aria-expanded"), "false", "collapsed by default");
          assert.equal(await disclosure.isVisible(), false, "form starts folded into landing");
          assert.equal(await main.locator('[role="dialog"], [aria-modal="true"]').count(), 0,
            "no modal or overlay at initial render");
          const radios = enquiry.locator('input[name="express-review-focus"]');
          assert.equal(await radios.count(), 2, "exactly two request focuses");
          assert.equal(await enquiry.locator('input[name="express-review-focus"]:checked').count(), 1, "a single selected focus");
          assert.equal(await enquiry.locator('[data-reiki-phone-enquiry]').count(), 1,
            "only one CRM-first contact capture");
          const reviews = main.locator("[data-review-stories]");
          assert.equal(await reviews.count(), 1, "existing authentic video reviews preserved");
          assert.equal(await reviews.evaluate(element => element.open), false, "light page until requested");
          await reviews.locator(":scope > summary").click();
          const reviewFeed = reviews.locator('[data-personal-testimonials="all"] [data-vertical-review-list]');
          await reviewFeed.waitFor({ state: "visible" });
          const reviewGeometry = await reviewFeed.evaluate(element => {
            const cards = [...element.querySelectorAll("[data-testimonial-video-id]")];
            return {
              direction: getComputedStyle(element).flexDirection,
              overflowX: getComputedStyle(element).overflowX,
              ids: cards.map(item => item.getAttribute("data-testimonial-video-id")),
              boxes: cards.map(item => {
                const r = item.getBoundingClientRect();
                return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
              }),
              iframes: element.querySelectorAll("iframe").length,
            };
          });
          assert.equal(reviewGeometry.ids.length, 12, "all twelve authentic testimonials remain");
          assert.equal(new Set(reviewGeometry.ids).size, 12, "no duplicated testimonials");
          assert.equal(reviewGeometry.ids[0], locale === "ru" ? "m9RfDgK76PU" : "Dk0LBmOivQo",
            "primary locale audio first");
          assert.equal(reviewGeometry.ids[6], locale === "ru" ? "Dk0LBmOivQo" : "m9RfDgK76PU",
            "other original-language reviews follow");
          assert.equal(reviewGeometry.direction, "column", "vertical mobile reviews");
          assert.notEqual(reviewGeometry.overflowX, 'auto', 'no horizontal review carousel');
          assert.notEqual(reviewGeometry.overflowX, 'scroll', 'no horizontal review scroll');
          assert.ok(reviewGeometry.boxes.every((r,i) => i === 0 || r.top >= reviewGeometry.boxes[i-1].bottom - 2),
            "testimonials vertically aligned");
          assert.ok(reviewGeometry.boxes.every(r => r.left >= -2 && r.right <= width + 2),
            "testimonials within viewport");
          assert.equal(reviewGeometry.iframes, 0, "testimonials do not autoplay");
          record.testimonials = reviewGeometry.ids.length;
          if (width === 390) await page.screenshot({
            path: output + "/" + name + "-reviews.png", animations: "disabled", timeout: 20000 });
          const play = video.locator("button.site-video-play");
          await play.waitFor({ state: "visible" });
          await play.click({ timeout: 15000 });
          const iframe = video.locator('iframe[data-video-playback="youtube"]');
          await iframe.waitFor({ state: "attached", timeout: 20000 });
          assert.match(await iframe.getAttribute("src"), /^https:\/\/www\.youtube-nocookie\.com\/embed\/sfVFOQNr2qk\?/,
            "approved YouTube source only");
          // The blocked provider iframe proves opt-in destination intent only.
          record.videoVerification='opt-in iframe intent only; provider playback not verified';
          await mainCta.click({ timeout: 15000 });
          assert.equal(new URL(page.url()).hash, "#request-free-review", "hero goes to start form");
          await enquiry.waitFor({ state: "visible" });
          await disclosure.waitFor({ state: "visible" });
          assert.equal(await reveal.getAttribute("aria-expanded"), "true", "hero CTA unfolds same-page form");
          assert.equal(await disclosure.getAttribute("role"), "region");
          record.actionableControls.revealExpanded = await inspectActionableControl(reveal, 'Inline reveal expanded');
          assert.equal(await disclosure.evaluate(element => getComputedStyle(element).position), "static",
            "unfolded form stays in normal document flow");
          // Read both rectangles in one browser task: while navigating to #request-free-review,
          // WebKit can still be smooth-scrolling. Two awaited locator.boundingBox()
          // calls may sample different scroll offsets and falsely report an overlap.
          const inFlowBounds = await enquiry.evaluate(root => {
            const trigger = root.querySelector("[data-express-reveal]");
            const region = root.querySelector("[data-express-inline-disclosure]");
            if (!(trigger instanceof HTMLElement) || !(region instanceof HTMLElement)) return null;
            const button = trigger.getBoundingClientRect();
            const panel = region.getBoundingClientRect();
            const style = getComputedStyle(region);
            return {
              revealBottom: button.bottom,
              panelTop: panel.top,
              gap: panel.top - button.bottom,
              position: style.position,
              transform: style.transform,
            };
          });
          assert.ok(inFlowBounds && inFlowBounds.position === "static"
            && inFlowBounds.transform === "none" && inFlowBounds.gap >= -2,
            "form pushes the landing down directly beneath its reveal button: "
              + JSON.stringify(inFlowBounds));
          assert.notEqual(await page.evaluate(() => document.body.style.overflow), "hidden",
            "capture must not block page scrolling");
          assert.equal(await main.locator('[role="dialog"], [aria-modal="true"]').count(), 0,
            "no modal after clicking the hero CTA");
          assert.equal(await enquiry.locator('input[type="tel"]').count(), 1, "one phone field");
          assert.equal(await enquiry.locator('input[type="checkbox"]').isChecked(), false,
            "opening the form is not contact consent");
          assert.equal(await enquiry.locator('[data-contact-channel-submit="whatsapp"]').count(), 1);
          assert.equal(await enquiry.locator('[data-contact-channel-submit="telegram"]').count(), 1);
          assert.equal(await enquiry.locator('[role="status"]').count(), 0,
            "no actual lead saved by navigating");
          await enquiry.locator('input[value="energy"]').check();
          assert.equal(await enquiry.locator('[data-express-focus="energy"]').getAttribute('data-selected'), "true");
          assert.equal(await enquiry.locator('input[type="checkbox"]').isChecked(), false,
            "changing the focus cannot silently opt the user in");
          await enquiry.locator('input[value="situation"]').check();
          assert.equal(await enquiry.locator('[data-express-focus="situation"]').getAttribute('data-selected'), "true");
          assert.equal(await enquiry.locator('[role="status"]').count(), 0,
            "changing focus is not a lead or booking");
          await enquiry.locator('input[type="tel"]').focus();
          await page.keyboard.press("Escape");
          assert.equal(await reveal.getAttribute("aria-expanded"), "false", "Escape folds the form");
          assert.equal(await disclosure.isVisible(), false);
          assert.equal(await reveal.evaluate(element => element === document.activeElement), true,
            "Escape restores focus to the inline reveal, without leaving the page");
          assert.equal(await enquiry.locator('[data-reiki-phone-enquiry]').count(), 1,
            "Folding hides the mounted chooser; it does not cancel or detach it");
          await mainCta.click();
          assert.equal(await disclosure.isVisible(), true, "Repeated current-hash anchor unfolds the same form");
// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN toggle-sequence
          await clickDisclosureOnce({page,reveal,context:isolation.context});
          assert.equal(await reveal.getAttribute("aria-expanded"), "false", "first local CTA folds the form");
          assert.equal(await disclosure.isVisible(), false, "first local CTA hides the disclosure");
          await clickDisclosureOnce({page,reveal,context:isolation.context});
          assert.equal(await reveal.getAttribute("aria-expanded"), "true", "local CTA unfolds again");
          assert.equal(await disclosure.isVisible(), true);
          await clickDisclosureOnce({page,reveal,context:isolation.context});
          assert.equal(await disclosure.isVisible(), false, "second tap closes in place");
// HH_DISCLOSURE_ACTION_EXPERIMENT_END toggle-sequence
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 2,
            "expanded content still fits viewport");
          // The independent private entry and three-offer hub remain supported;
          // the personal express page no longer substitutes for their coverage.
          if (width === 390) {
            const optional = main.locator('[data-optional-written-review]');
            assert.equal(await optional.evaluate(element => element.open), false);
            await optional.locator(':scope > summary').click();
            const privateEntry = optional.locator('[data-free-drawing-intake]');
            await privateEntry.waitFor({state:'visible'});
            assert.equal(await privateEntry.locator('form,textarea,[data-contact-channel-chooser]').count(), 0,
              'Private answers are entered only in the protected questionnaire');
            assert.equal(await privateEntry.locator('a').getAttribute('href'), '/' + locale + '/coaching/intake?topic=personal');
            assert.ok((await privateEntry.innerText()).includes(locale === 'ru' ? 'Не отправляйте' : locale === 'es' ? 'No envíes' : 'Do not send'));
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 2,
              'Expanded private entry fits the viewport');
            const hubResponse = await page.goto(origin + '/' + locale + '/services/free-consultation', {waitUntil:'domcontentloaded',timeout:65000});
            assert.equal(hubResponse?.status(), 200, 'Independent consultation hub HTTP 200');
            const hub = page.locator('[data-free-consultation-hub]');
            assert.equal(await hub.locator('[data-diagnosis-offer]').count(), 3, 'Hub retains its three separate offers');
            assert.equal(await hub.locator('[data-free-diagnostic-start]').count(), 0);
            await hub.locator('[data-diagnosis-order="wu-xing-free"]').click();
            const hubChooser = hub.locator('[data-diagnosis-order-form] [data-reiki-phone-enquiry]');
            await hubChooser.waitFor({state:'visible'});
            assert.equal(await hubChooser.locator('[data-contact-channel-submit]').count(), 2);
            assert.equal(await hubChooser.locator('input[type="checkbox"]').isChecked(), false);
            assert.ok(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth) <= 2, 'Hub fits viewport');
            await page.keyboard.press('Escape');
            await hubChooser.waitFor({state:'detached'}); // Only the old independent hub cancels by unmounting.
          }
          await isolation.assertClean();
          assert.equal(errors.length,0,'PAGE_ERROR');
          record.status='PASS';
          console.log("PASS " + name + " screen " + Math.round(geometry.hero.height) + "px");
        } catch (error) {
          record.status = "FAIL";
          record.error = String(error.stack || error.message).slice(0, 3000);
// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN abort-detection
          console.error("FAIL " + name + " " + record.error);
          if (unsafeDisclosureCleanup(error)) {
            unsafeActionFailure = error;
            record.actionAbort = 'UNCONFIRMED_CONTEXT_CLEANUP';
          }
// HH_DISCLOSURE_ACTION_EXPERIMENT_END abort-detection
// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN abort-snapshot
          if (!unsafeActionFailure) {
          await page.screenshot({ path: output + "/" + name + "-failed.png",
            fullPage: true, animations: "disabled", timeout: 15000 }).catch(() => {});
          }
// HH_DISCLOSURE_ACTION_EXPERIMENT_END abort-snapshot
        } finally {
// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN abort-page-cleanup
          if (!unsafeActionFailure) {
          // HH_DISCLOSURE_DIAGNOSTICS_BEGIN export
          // After the original verdict, never replacing its error.
          try {
            record.disclosureDiagnostics = await page.evaluate(() =>
              window.__hhDisclosureDiagnostics?.finish() ?? {version:1,status:'UNAVAILABLE'});
          } catch {
            record.disclosureDiagnostics = {version:1,status:'UNAVAILABLE'};
          }
          // HH_DISCLOSURE_DIAGNOSTICS_END export
          try { await isolation.close(); } catch(error) {
            record.status='FAIL';record.boundaryError=String(error.message).slice(0,500);
          }
          }
// HH_DISCLOSURE_ACTION_EXPERIMENT_END abort-page-cleanup
          if(errors.length){record.status='FAIL';record.pageErrorReason='PAGE_ERROR';}
          record.pageErrors=errors;record.boundary=isolation.summary();results.push(record);
        }
// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN abort-next-case
        if (unsafeActionFailure) break;
      }
      if (unsafeActionFailure) break;
    }
  } finally {
    if (unsafeActionFailure) {
      try { await boundedDisclosureCleanup(()=>browser.close()); } catch { /* primary remains fatal */ }
    } else await browser.close();
  }
  if (unsafeActionFailure) break;
}
// HH_DISCLOSURE_ACTION_EXPERIMENT_END abort-next-case
// browser.close() can emit a last pageerror after a viewport's isolation closed.
// Normalize only the verdict: preserve original errors, categorical evidence and
// the results artifact, then let the existing final assertion reject the run.
for (const record of results) {
  if (record.pageErrors.length) { record.status='FAIL';record.pageErrorReason='PAGE_ERROR'; }
}
writeFileSync(output + "/results.json", JSON.stringify({
  origin, scriptCommit:process.env.GITHUB_SHA || null,servedCommit:null,deploymentIdentity:'not established by this browser check', checkedAt: new Date().toISOString(), results,
}, null, 2));
// HH_DISCLOSURE_ACTION_EXPERIMENT_BEGIN abort-verdict
// Partial output remains explicitly nonpassing; preserve the primary input error.
if (unsafeActionFailure) throw unsafeActionFailure;
const failures = results.filter(record => record.status !== "PASS");
// HH_DISCLOSURE_ACTION_EXPERIMENT_END abort-verdict
console.log("TOTAL " + results.length + " PASS " + (results.length - failures.length) +
  " FAIL " + failures.length);
assert.equal(failures.length, 0, "Inspect screenshots and failed assertions in the workflow artifact");
