import assert from 'node:assert/strict';
import { runInNewContext } from 'node:vm';

export const origin = 'http://127.0.0.1:3100';
export const request = (url, method = 'GET', type = 'document', body) => ({
  url: () => url, method: () => method, resourceType: () => type,
  postDataJSON: () => structuredClone(body),
});

// In-memory Playwright shape only: no browser, server, fetch or real window.open.
export function fixture({ failSetup, closeFailure, lateRequest, latePopup, beforeRoute } = {}) {
  const events = [], contexts = [];
  const browser = {
    async newContext(options) {
      assert.equal(options.serviceWorkers, 'block');
      assert.equal(options.viewport.height, 844);
      assert.ok([320, 360, 390, 1188].includes(options.viewport.width));
      assert.deepEqual(Object.keys(options).sort(), ['serviceWorkers', 'viewport']);
      const id = contexts.length, listeners = new Map(), routes = [], sockets = [], pages = [];
      let init, binding;
      const mark = event => events.push(id + ':' + event);
      const context = {
        options, routes, sockets, pages, closed: false,
        async route(pattern, handler) {
          assert.equal(pattern, '**/*'); mark('route'); routes.push(handler);
          if (beforeRoute) await beforeRoute();
          if (failSetup) throw Error('SETUP_FAILURE');
        },
        async routeWebSocket(pattern, handler) { assert.equal(pattern, '**/*'); mark('websocket'); sockets.push(handler); },
        async exposeBinding(name, handler) { assert.equal(name, '__hhRecordPublicViewportPopup'); mark('binding'); binding = handler; },
        async addInitScript(handler) { mark('init'); init = handler; },
        on(event, handler) { listeners.set(event, handler); },
        async newPage() {
          assert.deepEqual(events.slice(-5), ['context', 'route', 'websocket', 'binding', 'init'].map(s => id + ':' + s));
          mark('newPage'); return this.makePage();
        },
        makePage() {
          const handlers = new Map();
          const window = { open() { throw Error('REAL_POPUP_FORBIDDEN'); }, __hhRecordPublicViewportPopup: () => Promise.resolve(binding()) };
          if (init) runInNewContext('(' + init.toString() + ')()', {window});
          const page = {
            window, closed: false, handlers, context: () => context,
            isClosed() { return this.closed; },
            async close() { mark('page-close'); this.closed = true; },
            async evaluate(fn) { return runInNewContext('(' + fn.toString() + ')()', {window}); },
            on(event, handler) { handlers.set(event, handler); },
          };
          pages.push(page); listeners.get('page')?.(page); return page;
        },
        async close() {
          mark('context-close');
          if (lateRequest) await routes[0](lateRequest);
          if (latePopup) this.makePage();
          for (const page of pages) await page.close();
          this.closed = true;
          if (closeFailure) throw Error('CONTEXT_CLOSE_FAILURE');
        },
      };
      contexts.push(context); mark('context'); return context;
    },
    async close() { events.push('browser-close'); },
  };
  return { browser, contexts, events };
}

export function route(url, method = 'GET', type = 'document', options = {}) {
  const calls = [], responses = [];
  return {
    calls, responses, request: () => request(url, method, type, options.body),
    async fetch(input) {
      calls.push('fetch'); assert.deepEqual(structuredClone(input), {maxRedirects: 0});
      if (options.beforeFetch) await options.beforeFetch();
      if (options.fetchFailure) throw Error('DO_NOT_LOG_FETCH');
      return { url: () => options.responseUrl ?? url, status: () => options.status ?? 200,
        async dispose() { calls.push('dispose'); if (options.disposeFailure) throw Error('DO_NOT_LOG_DISPOSE'); } };
    },
    async fulfill(response) { calls.push('fulfill'); responses.push(response); },
    async abort() { calls.push('abort'); },
    async fallback() { calls.push('fallback'); assert.ok(options.fallback); return options.fallback(this); },
    async continue() { calls.push('continue'); throw Error('NO_DIRECT_TRANSPORT'); },
  };
}
