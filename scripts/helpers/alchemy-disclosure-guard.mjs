// Install before the first Book click; retain until the owned context is closed.
export async function installAlchemyDisclosureGuard(context, page, origin, violations) {
  const pending = new Set()
  const track = operation => {
    const promise = Promise.resolve().then(operation).catch(error => {
      violations.push("booking guard error: " + String(error))
    })
    pending.add(promise)
    promise.finally(() => pending.delete(promise))
    return promise
  }
  context.on("page", popup => {
    if (popup !== page) {
      violations.push("unexpected booking popup")
      track(() => popup.close())
    }
  })
  await context.route("**/*", route => track(async () => {
    const request = route.request()
    // This context has service workers blocked. Popup first navigation is
    // intercepted here as well as recorded by the context page event.
    if (request.frame().page() !== page ||
        !["GET", "HEAD"].includes(request.method()) ||
        new URL(request.url()).origin !== origin) {
      violations.push("unexpected booking disclosure network request")
      await route.abort()
    } else await route.continue()
  }))
  // Caller closes the owned context first: no new pages/requests can arrive.
  return async () => { while (pending.size) await Promise.all([...pending]) }
}
