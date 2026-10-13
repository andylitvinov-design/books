// Optional account settings must not keep navigation or busy state pending.
// Always consume the response body, including unavailable/error responses.
export async function boundedJsonFetch(url, options, fetcher = fetch, timeoutMs = 10000) {
  const controller = new AbortController(), outer = options.signal
  if (outer?.aborted) throw new Error('REQUEST_ABORTED')
  let rejectCancelled
  const cancelled = new Promise((_, reject) => { rejectCancelled = reject })
  const abort = () => { controller.abort(); rejectCancelled(new Error('REQUEST_ABORTED')) }
  outer?.addEventListener('abort', abort, { once: true })
  const timer = setTimeout(() => { controller.abort(); rejectCancelled(new Error('REQUEST_TIMEOUT')) }, timeoutMs)
  try {
    const work = (async () => {
      const response = await fetcher(url, { ...options, signal: controller.signal })
      const data = await response.json()
      return { response, data }
    })()
    return await Promise.race([work, cancelled])
  } finally { clearTimeout(timer); outer?.removeEventListener('abort', abort) }
}
