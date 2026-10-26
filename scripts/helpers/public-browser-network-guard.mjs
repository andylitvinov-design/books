// Pure request classification and bounded cleanup for synthetic browser QA.
// No transport, browser creation, form data or external state is used here.
export function serviceEnquiryAction(url, method, origin) {
  let parsed;
  try { parsed = new URL(url); } catch { return 'block'; }
  return parsed.origin === origin && parsed.pathname === '/api/service-enquiries' &&
    parsed.search === '' && method === 'POST' ? 'mock' : 'block';
}

export function publicQaRequestAction(url, method, origin) {
  let parsed;
  try { parsed = new URL(url); } catch { return 'block-mutation'; }
  if (!['GET', 'HEAD'].includes(method)) return 'block-mutation';
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return 'allow-read';
  return parsed.origin === origin ? 'allow-read' : 'block-read';
}

export async function fulfillSyntheticServiceEnquiry(route, origin, submissions, failures) {
  const request = route.request();
  if (serviceEnquiryAction(request.url(), request.method(), origin) !== 'mock') {
    failures.push('UNEXPECTED_SERVICE_ENQUIRY_REQUEST');
    await route.abort();
    return;
  }
  submissions.push(JSON.parse(request.postData() || '{}'));
  await route.fulfill({status:200,contentType:'application/json',
    body:JSON.stringify({saved:true,referenceCode:'HH-CA5016DE79E4'})});
}

export function createPopupClosureTracker(primaryPage) {
  const pending = new Set();
  const failures = [];
  return {
    close(popup) {
      if (popup === primaryPage) return;
      const operation = Promise.resolve().then(() => popup.close())
        .catch(() => { failures.push('POPUP_CLOSE_FAILED'); })
        .finally(() => { pending.delete(operation); });
      pending.add(operation);
    },
    async drain() {
      while (pending.size) await Promise.all([...pending]);
    },
    failures: () => [...failures],
  };
}

export async function closePublicQaContext(page, context, popups) {
  const failures = [];
  await popups.drain();
  try { await page.close(); } catch { failures.push('PAGE_CLOSE_FAILED'); }
  try { await context.close(); } catch { failures.push('CONTEXT_CLOSE_FAILED'); }
  // Closing pages/context may dispatch a late popup event: drain after both.
  await popups.drain();
  return [...failures, ...popups.failures()];
}
