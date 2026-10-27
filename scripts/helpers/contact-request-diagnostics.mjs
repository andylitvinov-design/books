// Diagnostic only: no URL, query value, body, header or identity is emitted.
// Aliases describe exact source-authored reads, never permission to make them.
const phases = new Set(['setup', 'tantra', 'yggdrasil', 'academy', 'dao-entry', 'dao-save', 'dao-receipt', 'temple']);
const resources = new Set(['document', 'fetch', 'xhr', 'script', 'stylesheet', 'image', 'font', 'media', 'other']);

export function blockedApiDetails(request, origin, phase) {
  let apiKind = 'unclassified';
  try {
    const raw = request?.url;
    const url = typeof raw === 'string' && raw.length <= 2048 && raw === raw.trim() ? new URL(raw) : null;
    const base = new URL(origin);
    if (base.origin === origin && base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname) &&
        url?.origin === origin && url.href === raw && !url.username && !url.password && !url.hash) {
      if (raw === origin + '/api/app/bootstrap') apiKind = 'account-bootstrap';
      else if (raw === origin + '/api/app/bootstrap?view=portrait') apiKind = 'portrait-bootstrap';
      else if (raw === origin + '/api/app/auth/contact-profile') apiKind = 'contact-profile';
      else if (url.pathname === '/api/academy/reiki-guide' && /^\?course=yggdrasil&locale=(?:en|ru|es)$/.test(url.search)) apiKind = 'yggdrasil-guide';
      else if (url.pathname === '/api/academy/reiki-guide' && /^\?course=tantra&locale=(?:en|ru|es)$/.test(url.search)) apiKind = 'tantra-guide';
    }
  } catch { /* Malformed inputs are unclassified, never printed. */ }
  let framePageAtBlock = 'unclassified';
  try {
    const raw = typeof request?.frameUrl === 'function' ? request.frameUrl() : request?.frameUrl;
    const url = typeof raw === 'string' && raw.length <= 2048 && raw === raw.trim() ? new URL(raw) : null;
    const base = new URL(origin);
    if (base.origin === origin && base.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(base.hostname) &&
        url?.origin === origin && raw === origin + url.pathname && !url.username && !url.password && !url.search && !url.hash) {
      const path = url.pathname.replace(/^\/(?:en|ru|es)(?=\/)/, '');
      framePageAtBlock = ({
        '/academy/reiki/tantra-reiki/free-initiation': 'tantra',
        '/academy/reiki/yggdrasil/free-initiation': 'yggdrasil',
        '/academy': 'academy', '/services/dao-health-profile': 'dao', '/academy/temple-studies': 'temple',
      })[path] || 'unclassified';
      if (!/^\/(?:en|ru|es)\//.test(url.pathname)) framePageAtBlock = 'unclassified';
    }
  } catch { /* Detached frames and unknown pages remain unclassified. */ }
  return {
    apiKind,
    framePageAtBlock,
    // Current verifier phase is not proof of which component initiated a read.
    scenarioPhase: phases.has(phase) ? phase : 'unclassified',
    resourceType: resources.has(request?.resourceType) ? request.resourceType : 'unclassified',
    navigation: request?.navigation === true,
  };
}
