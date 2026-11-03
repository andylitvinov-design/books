// Per-case transport supervision. A caught transport error remains fatal.
export function createHomeRouteSupervisor({origin, engine, width, stage = () => 'setup', pageUrl = () => ''}, limit = 128) {
  const events = [];
  const failures = [];
  const homeRscEvents = [];
  const pending = new Set();
  let firstFailure;
  let nextId = 0;
  let dropped = 0;
  function record(kind, request, id, operation, category) {
    const safePath = value => {
      try { const url = new URL(value, origin); return url.origin === origin && !url.username && !url.password && ['/', '/ru'].includes(url.pathname) ? url.pathname : null; } catch { return null; }
    };
    let path = null;
    try { path = safePath(request?.url()); } catch { /* diagnostics only */ }
    let current;
    try { current = stage(); } catch { current = 'unlisted'; }
    let rsc = false;
    try {rsc = request?.headers?.().rsc === '1';} catch { /* metadata only */ }
    const event = {kind, id, rsc, time:Date.now(), engine, width, stage:['setup','en-to-ru','ru-to-en','free-offers','visual','journeys','cleanup'].includes(current) ? current : 'unlisted', path, observedPagePath:(() => { try {return safePath(pageUrl());} catch {return null;} })()};
    if (['fetch','delay','gate','fulfill','continue','abort','drain'].includes(operation)) event.operation = operation;
    if (['connection-reset','timeout','target-closed','other'].includes(category)) event.category = category;
    const bucket = rsc && path !== null ? homeRscEvents : events;
    if (bucket.length >= limit) dropped++; else bucket.push(event);
    return event;
  }
  function fail(error, request, id, kind = 'transport-failed', operation, start) {
    firstFailure ??= new Error('Home locale route transport failed; inspect sanitized transport evidence', {cause:error});
    const category = /ECONNRESET/.test(String(error?.code ?? '') + String(error?.message ?? '')) ? 'connection-reset' : /timeout|timed out/i.test(String(error?.message ?? '')) ? 'timeout' : /closed/i.test(String(error?.message ?? '')) ? 'target-closed' : 'other';
    const event = record(kind, request, id, operation, category);
    if (failures.length < 16) failures.push({start, ...event});
  }
  function handle(route, action) {
    const id = ++nextId;
    let request;
    try { request = route.request(); } catch { /* action still executes */ }
    const task = (async () => {
      const start = record('route-start',request,id);
      let operation;
      const perform = async (name, callback) => { operation = name; record('operation-start',request,id,name); return await callback(); };
      try { await action(perform); record('route-finished',request,id); }
      catch (error) {
        fail(error,request,id,'transport-failed',operation,start);
        try { await route.abort('failed'); record('route-aborted',request,id); }
        catch { record('abort-failed',request,id,'abort'); }
      }
    })();
    pending.add(task);
    void task.then(() => pending.delete(task), error => { pending.delete(task); fail(error,request,id); });
    return task;
  }
  function assertHealthy() { if (firstFailure) throw firstFailure; }
  async function drain(timeout = 30000) {
    let timer;
    try {
      const done = Promise.all([...pending]);
      const expired = new Promise(resolve => { timer = setTimeout(() => resolve(false), timeout); });
      if (await Promise.race([done.then(() => true), expired]) === false) fail(new Error('Route drain timed out'),null,0,'drain-timeout','drain');
    } finally { clearTimeout(timer); }
  }
  return {handle, assertHealthy, drain, events, homeRscEvents, failures, get failure(){return firstFailure;}, get dropped(){return dropped;}, get pending(){return pending.size;}};
}
