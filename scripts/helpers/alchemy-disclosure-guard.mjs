// Exact source-declared legacy poster URLs only. This classifies an observation,
// never grants network permission or establishes the request initiator.
function declaredImageAlias(url, method, resource, origin) {
  if (method !== "GET" || resource !== "image" || origin !== "external") return "unknown"
  switch (url) {
    case "https://i.ytimg.com/vi/m9RfDgK76PU/hqdefault.jpg": return "legacy-ru-1-hq"
    case "https://i.ytimg.com/vi/m9RfDgK76PU/maxresdefault.jpg": return "legacy-ru-1-maxres"
    case "https://i.ytimg.com/vi/5oj0BIbLT4w/hqdefault.jpg": return "legacy-ru-2-hq"
    case "https://i.ytimg.com/vi/5oj0BIbLT4w/maxresdefault.jpg": return "legacy-ru-2-maxres"
    default: return "unknown"
  }
}

// Fixed synthetic 480x360 geometry placeholder, NOT the real public poster.
// No text, scripts, animation, external references or network access.
const syntheticLegacyPoster = '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="360" viewBox="0 0 480 360"><rect width="480" height="360" fill="#808080"/></svg>'

// Install before the first Book click; retain until the owned context is closed.
export async function installAlchemyDisclosureGuard(context, page, origin, violations, diagnostic = {}, useSyntheticLegacyPoster = false) {
  let emitted = 0
  const safe = read => { try { return read() } catch { return undefined } }
  const enumValue = (value, values, fallback = "unknown") => values.includes(value) ? value : fallback
  const observe = (event, request) => {
    // Observation phase is not proof of the request initiator. Never emit raw
    // URLs, paths, queries, payloads, headers, exception text or arbitrary enums.
    if (emitted >= 8) return
    emitted++
    const observedUrl = safe(() => request.url())
    const record = {
      event,
      phase: enumValue(safe(() => diagnostic.phase()), ["opening-contact", "contact-open", "closing-contact", "contact-closed", "sample-navigation", "sample-ready", "context-disposal"]),
      method: enumValue(safe(() => request.method()), ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], "OTHER"),
      origin: safe(() => new URL(observedUrl).origin === origin ? "same" : "external") ?? "invalid",
      resource: enumValue(safe(() => request.resourceType()), ["document", "stylesheet", "image", "media", "font", "script", "texttrack", "xhr", "fetch", "eventsource", "websocket", "manifest", "other"]),
      ownership: safe(() => request.frame().page() === page ? "primary" : "other") ?? "unavailable",
    }
    record.imageAlias = declaredImageAlias(observedUrl, record.method, record.resource, record.origin)
    // Diagnostics cannot replace a primary failure or interrupt abort/disposal.
    try { Promise.resolve(diagnostic.emit?.(record)).catch(() => {}) } catch {}
  }
  const pending = new Set()
  const track = operation => {
    const promise = Promise.resolve().then(operation).catch(error => {
      violations.push("booking guard error")
      observe("guard-error")
    })
    pending.add(promise)
    promise.finally(() => pending.delete(promise))
    return promise
  }
  context.on("page", popup => {
    if (popup !== page) {
      violations.push("unexpected booking popup")
      observe("unexpected-popup")
      track(() => popup.close())
    }
  })
  await context.route("**/*", route => track(async () => {
    const request = route.request()
    // Explicit isolated-verifier opt-in only; never an outbound permission.
    // All nonmatches still pass through the unchanged original fatal guard.
    if (useSyntheticLegacyPoster === true && /^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin) && safe(() =>
      request.method() === "GET" && request.resourceType() === "image" &&
      request.frame() === page.mainFrame() && request.frame().page() === page &&
      request.url() === "https://i.ytimg.com/vi/m9RfDgK76PU/hqdefault.jpg")) {
      await route.fulfill({ status: 200, contentType: "image/svg+xml", body: syntheticLegacyPoster })
      observe("image-fixture-fulfilled", request)
      return
    }
    // This context has service workers blocked. Popup first navigation is
    // intercepted here as well as recorded by the context page event.
    if (request.frame().page() !== page ||
        !["GET", "HEAD"].includes(request.method()) ||
        new URL(request.url()).origin !== origin) {
      violations.push("unexpected booking disclosure network request")
      observe("request-blocked", request)
      await route.abort()
    } else await route.continue()
  }))
  // Caller closes the owned context first: no new pages/requests can arrive.
  return async () => { while (pending.size) await Promise.all([...pending]) }
}
