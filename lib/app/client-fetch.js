export async function appFetch(path, body, method, { accountId, signal } = {}) {
  const response = await fetch(`/api/app/${path}`, {
    method: method || (body ? 'POST' : 'GET'),
    cache: 'no-store',
    credentials: 'same-origin', signal,
    headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(accountId ? { 'X-HH-Account-ID': accountId } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  })
  let value
  try {
    value = await response.json()
  } catch (cause) {
    // A response body can be interrupted after successful HTTP headers (e.g.
    // WebKit navigation). Never turn that read failure into successful data.
    throw responseError(response, 'SERVICE_UNAVAILABLE', cause)
  }
  if (!response.ok || value?.error) {
    throw responseError(response, value?.error || 'SERVICE_UNAVAILABLE')
  }
  if (path.split('?')[0] === 'bootstrap' && !isBootstrap(value)) {
    throw responseError(response, 'SERVICE_UNAVAILABLE')
  }
  return value
}
function responseError(response, code, cause) {
  const error = new Error(code, { cause })
  error.code = code
  error.status = response.status
  return error
}

function isBootstrap(value) {
  return value?.account && !Array.isArray(value.account) &&
    typeof value.account.id === 'string' &&
    typeof value.account.onboardingState === 'string' &&
    ['results', 'runs', 'requests', 'consents', 'services'].every(key => Array.isArray(value[key]))
}
