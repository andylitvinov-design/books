// Harness experiment only. Separates ordinary driver setup from one real mouse
// activation; it does not repair runtime scrolling or promise physical Safari.
// Pinned Playwright 1.63.0: page/context defaults are not overridden in this
// verifier; DEFAULT_PLAYWRIGHT_TIMEOUT is 30_000. Raw Mouse.click has no timeout.
export const FREE_REVIEW_DISCLOSURE_ACTION_TIMEOUT_MS = 30_000;
const unsafeCleanupErrors = new WeakSet();
export const unsafeDisclosureCleanup = error => Boolean(error && typeof error === 'object' && unsafeCleanupErrors.has(error));

// Serialized by Locator.evaluate. Only geometry, public state and hit testing;
// no text/input values, focus, scroll, event dispatch, style or DOM mutation.
export function stableDisclosurePoint(button, {remainingMs}) {
  return new Promise((resolve, reject) => {
    const start = performance.now();
    let frame = null, previous = null, previousTime = null, stable = 0, done = false;
    const finish = (error, value) => {
      if (done) return;
      done = true;
      if (frame !== null) cancelAnimationFrame(frame);
      if (error) reject(error); else resolve(value);
    };
    const fail = reason => { throw Error('DISCLOSURE_READY_' + reason); };
    const finite = value => typeof value === 'number' && Number.isFinite(value) && Math.abs(value) <= 10000000;
    const rect = node => {
      if (!node) fail('MISSING_GEOMETRY');
      const box = node.getBoundingClientRect();
      const values = ['left','right','top','bottom','width','height'].map(key => box[key]);
      if (!values.every(finite)) fail('NONFINITE_GEOMETRY');
      return values;
    };
    const sample = () => {
      if (!(button instanceof HTMLButtonElement)) fail('MISSING_TARGET');
      const root = button.closest('[data-personal-express-enquiry]');
      const main = root?.closest('[data-free-entry-landing="situation"]');
      if (!(button instanceof HTMLButtonElement) || !button.isConnected || !main
        || main.querySelectorAll('[data-express-reveal]').length !== 1
        || !button.matches('[data-express-reveal]')) fail('MISSING_TARGET');
      if (button.matches(':disabled') || button.closest('[aria-disabled="true"], [inert]')) fail('DISABLED');
      const style = getComputedStyle(button);
      if (button.hidden || !button.getClientRects().length || style.display === 'none'
        || style.visibility === 'hidden' || style.visibility === 'collapse') fail('HIDDEN');
      const control = rect(button), header = rect(document.querySelector('header.house-header')),
        nav = rect(document.querySelector('.mobile-bottom-navigation'));
      const viewport = [innerWidth,innerHeight], scroll = [scrollX,scrollY],
        documentScroll = [document.scrollingElement?.scrollLeft,document.scrollingElement?.scrollTop];
      const visual = window.visualViewport ? ['offsetLeft','offsetTop','pageLeft','pageTop','width','height','scale']
        .map(key => window.visualViewport[key]) : [];
      if (![...viewport,...scroll,...documentScroll,...visual].every(finite)
        || viewport.some(value => value <= 0) || (visual.length && (visual[4] <= 0 || visual[5] <= 0 || visual[6] <= 0))) fail('NONFINITE_VIEWPORT');
      const [left,right,top,bottom,width,height] = control;
      if (width < 44 || height < 44 || right <= left || bottom <= top
        || left < -2 || right > innerWidth + 2 || top < Math.max(0,header[3]) - 1
        || nav[4] <= 0 || nav[5] <= 0 || nav[2] >= innerHeight || nav[3] > innerHeight + 2
        || bottom > Math.min(innerHeight,nav[2]) - 1) fail('NOT_ACTIONABLE');
      const point = {x:(left+right)/2,y:(top+bottom)/2};
      if (visual.length && (point.x < visual[0] || point.y < visual[1]
        || point.x >= visual[0] + visual[4] || point.y >= visual[1] + visual[5])) fail('NOT_VISIBLE_POINT');
      const hit = document.elementFromPoint(point.x,point.y);
      if (!(hit instanceof Element) || !button.contains(hit)) fail('COVERED');
      return {point,values:[...control,...header,...nav,...viewport,...scroll,...documentScroll,...visual]};
    };
    const tick = time => {
      frame = null;
      if (done) return;
      try {
        if (!finite(start) || !finite(time) || !finite(remainingMs) || remainingMs <= 0
          || performance.now() - start >= remainingMs) fail('DEADLINE');
        const current = sample();
        const unchanged = previous && current.values.length === previous.length
          && current.values.every((value,index) => value === previous[index]);
        stable = unchanged && previousTime !== null && time > previousTime ? stable + 1 : 1;
        previous = current.values; previousTime = time;
        if (stable >= 3) {
          // This last sample includes a fresh unobstructed hit test. No locator
          // click (and therefore no second implicit scroll) follows this gate.
          finish(null,current.point);
        } else frame = requestAnimationFrame(tick);
      } catch (error) { finish(error); }
    };
    try { frame = requestAnimationFrame(tick); } catch (error) { finish(error); }
  });
}

const realClock = {now:()=>performance.now(),set:(callback,ms)=>setTimeout(callback,ms),clear:handle=>clearTimeout(handle)};
// Safety-only abort barrier, not extra action/readiness/input budget. An
// unconfirmed close or undrained protocol promise is fatal for the entire run.
export const FREE_REVIEW_CLEANUP_TIMEOUT_MS = 5_000;
export async function boundedDisclosureCleanup(operation, clock = realClock) {
  const deadline = clock.now() + FREE_REVIEW_CLEANUP_TIMEOUT_MS;
  const timeoutError = Error('DISCLOSURE_CLEANUP_DEADLINE');
  let expired = false;
  const pending = Promise.resolve().then(operation);
  pending.catch(()=>{});
  let timer;
  const expiry = new Promise((_,reject)=>{
    timer=clock.set(()=>{expired=true;reject(timeoutError);},FREE_REVIEW_CLEANUP_TIMEOUT_MS);
  });
  expiry.catch(()=>{});
  try {
    await Promise.race([pending,expiry]);
    if (expired || !Number.isFinite(deadline) || clock.now() >= deadline) throw timeoutError;
  } finally { clock.clear(timer); }
}
// Clock injection is solely a deterministic offline-test seam. The verifier uses
// the exported default action and cannot supply a wider or zero timeout.
export function createDisclosureAction(clock = realClock) {
  return async function clickDisclosureOnce({page,reveal,context}) {
    const start = clock.now(), deadline = start + FREE_REVIEW_DISCLOSURE_ACTION_TIMEOUT_MS;
    if (!Number.isFinite(start)) throw Error('DISCLOSURE_ACTION_CLOCK');
    const timeoutError = Error('DISCLOSURE_ACTION_DEADLINE');
    let expired = false, inputStarted = false, launched = false, pending = null, settled = true;
    let rejectDeadline;
    const expiry = new Promise((_,reject)=>{rejectDeadline=reject;});
    // Raw Mouse.click is uncancellable by a per-call timeout in pinned 1.63.0.
    // A handled deadline race alone is NOT cancellation. Catch below attempts
    // bounded termination/drain; unconfirmed cleanup is fatal for the run.
    expiry.catch(()=>{});
    const timer = clock.set(()=>{expired=true;rejectDeadline(timeoutError);},FREE_REVIEW_DISCLOSURE_ACTION_TIMEOUT_MS);
    const remaining = () => {
      const value = deadline - clock.now();
      if (expired || !Number.isFinite(value) || value <= 0) throw timeoutError;
      return value;
    };
    const run = async operation => {
      remaining();
      settled = false;
      pending = Promise.resolve().then(()=>{
        const budget = remaining();
        launched = true;
        return operation(budget);
      }).then(value=>{settled=true;return value;},error=>{settled=true;throw error;});
      pending.catch(()=>{});
      const value = await Promise.race([pending,expiry]);
      remaining(); // A late resolution must fail even if the Node timer was delayed.
      return value;
    };
    try {
      await run(budget=>reveal.scrollIntoViewIfNeeded({timeout:budget}));
      const point = await run(budget=>reveal.evaluate(stableDisclosurePoint,{remainingMs:budget},{timeout:budget}));
      if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) throw Error('DISCLOSURE_READY_INVALID_POINT');
      await run(()=>{inputStarted=true;return page.mouse.click(point.x,point.y);});
      return {activationCount:1};
    } catch (error) {
      const primary = error && typeof error === 'object' ? error : Error('DISCLOSURE_ACTION_FAILED');
      // No new case may inherit a pending operation or a partially issued input.
      if ((launched && !settled) || inputStarted) {
        try {
          await boundedDisclosureCleanup(async()=>{
            await context.close({reason:'DISCLOSURE_ACTION_ABORT'});
            if (!page.isClosed()) throw Error('DISCLOSURE_CONTEXT_STILL_OPEN');
            if (pending) await pending.catch(()=>{});
          },clock);
        } catch {
          unsafeCleanupErrors.add(primary);
        }
      }
      throw primary;
    } finally { clock.clear(timer); }
  };
}
export const clickDisclosureOnce = createDisclosureAction();
