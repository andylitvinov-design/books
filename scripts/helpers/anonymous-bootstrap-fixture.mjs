import assert from 'node:assert/strict';
import { types as nodeTypes } from 'node:util';

// One observed anonymous Academy mount probe, not a backend/auth health check.
// The real missing-session branch returns this denial before any repository call.
export const anonymousBootstrapDenial = Object.freeze({
  status: 401,
  contentType: 'application/json',
  body: '{"error":"SIGN_IN_REQUIRED"}',
  headers: Object.freeze({
    'Cache-Control': 'private, no-store, max-age=0, must-revalidate',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', Vary: 'Cookie',
  }),
});
const browserHeaders = new Set(['accept','accept-encoding','accept-language','cache-control','connection','dnt','host','origin','pragma','priority','referer','user-agent',
  'sec-ch-ua','sec-ch-ua-mobile','sec-ch-ua-platform','sec-fetch-dest','sec-fetch-mode','sec-fetch-site']);

const diagnosticPhases = new Set(['setup','tantra','yggdrasil','academy','dao-entry','dao-save','dao-receipt','temple']);
const diagnosticReasons = new Set(['phase','already-denied','method','resource','navigation','body','frame','headers-unavailable','duplicate-header','auth-session-header','prefetch-header','unrecognized-header','host','referer','origin','fetch-site','request-unavailable','fulfilled']);
const diagnosticFrames = new Set(['tantra','yggdrasil','academy','dao','temple']);
const diagnosticMethods = new Set(['GET','HEAD','POST','PUT','PATCH','DELETE']);
const diagnosticResources = new Set(['document','fetch','xhr','script','stylesheet','image','font','media','other']);
const diagnosticApis = new Set(['account-bootstrap','portrait-bootstrap','contact-profile','yggdrasil-guide','tantra-guide']);
const diagnosticCategories = new Set(['non-synthetic-enquiry','private-text','unexpected-api','external-navigation','unexpected-write']);
const isProxy = nodeTypes.isProxy;
const ownDescriptor = Object.getOwnPropertyDescriptor;
const defineOwn = Object.defineProperty;
const arrayIsArray = Array.isArray;
const integer = Number.isSafeInteger;
const create = Object.create;
const assign = Object.assign;
const setPrototype = Object.setPrototypeOf;
const setHas = Function.call.bind(Set.prototype.has);
const weakGet = Function.call.bind(WeakMap.prototype.get);
const weakSet = Function.call.bind(WeakMap.prototype.set);
const diagnosticStates = new WeakMap();
const fixed = (value, allowed) => typeof value === 'string' && setHas(allowed,value) ? value : 'unclassified';
const ownData = (value,key) => {
  if (value === null || typeof value !== 'object' || isProxy(value)) return undefined;
  const descriptor = ownDescriptor(value,key);
  return descriptor && ownDescriptor(descriptor,'value') ? descriptor.value : undefined;
};
const ownArrayLength = value => {
  if (value === null || typeof value !== 'object' || isProxy(value) || !arrayIsArray(value)) return null;
  const length = ownData(value,'length');
  return typeof length === 'number' && integer(length) && length >= 0 ? length : null;
};
const outputObject = values => assign(create(null),values);
const outputArray = () => setPrototype([],null);
const unavailableSnapshot = () => outputObject({snapshotState:'unavailable',scenarioPhase:'unclassified',denialState:'unexpected',decisions:outputArray(),blocked:outputArray(),blockedTruncated:false});

// Own data only: never call input methods/getters, proxy traps or coercion.
// Private state avoids invoking the actual fixture's public diagnostic getters.
export function bootstrapFixtureFailureDetails(fixture, blocked, phase) {
  try {
    if (fixture === null || typeof fixture !== 'object' || isProxy(fixture)) return unavailableSnapshot();
    const state = weakGet(diagnosticStates,fixture) || fixture;
    const denials = ownData(state,'denials');
    const observations = ownData(state,'observations');
    const decisionLength = ownArrayLength(observations), blockedLength = ownArrayLength(blocked);
    if (decisionLength === null || blockedLength === null) return unavailableSnapshot();
    const decisions = outputArray(), blockedEntries = outputArray();
    for (let index = 0; index < 16 && index < decisionLength; index++) {
      const entry = ownData(observations,''+index);
      decisions[index] = outputObject({
        reason:fixed(ownData(entry,'reason'),diagnosticReasons),scenarioPhase:fixed(ownData(entry,'scenarioPhase'),diagnosticPhases),
        framePageAtDecision:fixed(ownData(entry,'framePageAtDecision'),diagnosticFrames),denialState:ownData(entry,'denialState') === 'used' ? 'used' : 'unused',
      });
    }
    for (let index = 0; index < 16 && index < blockedLength; index++) {
      const entry = ownData(blocked,''+index);
      blockedEntries[index] = outputObject({
        category:fixed(ownData(entry,'category'),diagnosticCategories),method:fixed(ownData(entry,'method'),diagnosticMethods),
        apiKind:fixed(ownData(entry,'apiKind'),diagnosticApis),scenarioPhase:fixed(ownData(entry,'scenarioPhase'),diagnosticPhases),
        framePageAtBlock:fixed(ownData(entry,'framePageAtBlock'),diagnosticFrames),resourceType:fixed(ownData(entry,'resourceType'),diagnosticResources),navigation:ownData(entry,'navigation') === true,
      });
    }
    return outputObject({snapshotState:'available',scenarioPhase:fixed(phase,diagnosticPhases),
      denialState:denials === 0 ? 'unused' : denials === 1 ? 'used' : 'unexpected',decisions,blocked:blockedEntries,blockedTruncated:blockedLength > 16});
  } catch { return unavailableSnapshot(); }
}

// Capture eligibility and sink insertion also use own data, never public
// fixture getters or an input-controlled push method before the final gates.
export function appendBootstrapFixtureFailure(sink, fixture, blocked, phase) {
  try {
    const snapshot = bootstrapFixtureFailureDetails(fixture,blocked,phase);
    if (snapshot.snapshotState === 'available' && snapshot.denialState === 'used' && snapshot.blocked.length === 0) return;
    const length = ownArrayLength(sink);
    if (length === null || length >= 16) return;
    defineOwn(sink,''+length,{value:snapshot,writable:true,enumerable:true,configurable:true});
  } catch { /* A diagnostic sink failure cannot replace the primary assertion. */ }
}

export function createAnonymousAcademyBootstrapFixture(origin, locale) {
  assert.match(origin, /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/);
  assert.equal(new URL(origin).origin, origin);
  assert.ok(['en','ru','es'].includes(locale));
  let denials = 0;
  const observations = [];
  const diagnosticState = {denials:0,observations};
  const record = (reason, phase, route) => {
    if (observations.length >= 16) return;
    try {
      const request = route.request();
      if (request.url() !== origin + '/api/app/bootstrap') return;
      let framePageAtDecision = 'unclassified';
      try {
        const raw = request.frame().url();
        for (const [path, alias] of [['academy/reiki/tantra-reiki/free-initiation','tantra'],['academy/reiki/yggdrasil/free-initiation','yggdrasil'],['academy','academy'],['services/dao-health-profile','dao'],['academy/temple-studies','temple']]) {
          if (raw === origin + '/' + locale + '/' + path) framePageAtDecision = alias;
        }
      } catch { /* Detached frame is unknown observation context. */ }
      observations.push({reason,scenarioPhase:fixed(phase,diagnosticPhases),framePageAtDecision,denialState:denials === 0 ? 'unused' : 'used'});
    } catch { /* Passive observation must never alter the original decision. */ }
  };
  const reject = (reason,phase,route) => { record(reason,phase,route); return false; };
  const fixture = {
    get denials() { return denials; },
    get observations() { return observations.map(entry => ({...entry})); },
    async tryFulfill(route, phase) {
      if (denials !== 0) return reject('already-denied',phase,route);
      if (phase !== 'academy') return reject('phase',phase,route);
      try {
        const request = route.request();
        if (request.url() !== origin + '/api/app/bootstrap') return false;
        if (request.method() !== 'GET') return reject('method',phase,route);
        if (request.resourceType() !== 'fetch') return reject('resource',phase,route);
        if (request.isNavigationRequest() !== false) return reject('navigation',phase,route);
        if (![null, ''].includes(request.postData())) return reject('body',phase,route);
        if (request.frame().url() !== origin + '/' + locale + '/academy') return reject('frame',phase,route);
        // Full header observation is required. Unknown/private/auth/session or
        // prefetch headers fail closed; values/identifiers are never recorded.
        const headers = await request.allHeaders();
        if (!headers || typeof headers !== 'object' || Array.isArray(headers)) return reject('headers-unavailable',phase,route);
        const names = Object.keys(headers);
        if (new Set(names.map(name => name.toLowerCase())).size !== names.length) return reject('duplicate-header',phase,route);
        if (names.some(name => !browserHeaders.has(name.toLowerCase()))) {
          const lower = names.map(name => name.toLowerCase());
          const reason = lower.some(name => ['authorization','cookie','x-hh-account-id','x-api-key','x-session'].includes(name)) ? 'auth-session-header'
            : lower.some(name => ['purpose','sec-purpose','next-router-prefetch','rsc'].includes(name)) ? 'prefetch-header' : 'unrecognized-header';
          return reject(reason,phase,route);
        }
        const value = key => headers[names.find(name => name.toLowerCase() === key)];
        if (value('host') !== undefined && value('host') !== new URL(origin).host) return reject('host',phase,route);
        if (value('referer') !== undefined && value('referer') !== origin + '/' + locale + '/academy') return reject('referer',phase,route);
        if (value('origin') !== undefined && value('origin') !== origin) return reject('origin',phase,route);
        if (value('sec-fetch-site') !== undefined && value('sec-fetch-site') !== 'same-origin') return reject('fetch-site',phase,route);
      } catch { return reject('request-unavailable',phase,route); }
      // Reserve before awaiting fulfillment: concurrent duplicates cannot pass.
      if (denials !== 0) return reject('already-denied',phase,route);
      denials++;
      diagnosticState.denials = denials;
      await route.fulfill({ ...anonymousBootstrapDenial, headers: { ...anonymousBootstrapDenial.headers } });
      record('fulfilled',phase,route);
      return true;
    },
  };
  weakSet(diagnosticStates,fixture,diagnosticState);
  return fixture;
}
