// Passive only. No request is intercepted, allowed, fulfilled or retried here.
const methods = new Set(['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS']);
const resources = new Set(['document','fetch','xhr','script','stylesheet','image','font','media','other']);
export function publicApiReadDiagnostic(info, origin) {
  try {
    if (!/^http:\/\/(?:127\.0\.0\.1|localhost):\d+$/.test(origin) || new URL(origin).origin !== origin) return null;
    const raw = info?.url;
    if (typeof raw !== 'string' || raw.length > 2048 || raw !== raw.trim()) return null;
    const url = new URL(raw);
    if (url.origin !== origin || !url.pathname.startsWith('/api/')) return null;
    let apiKind = 'unclassified';
    if (!url.username && !url.password && !url.hash) {
      if (raw === origin + '/api/app/bootstrap') apiKind = 'account-bootstrap';
      else if (raw === origin + '/api/app/bootstrap?view=portrait') apiKind = 'portrait-bootstrap';
      else if (raw === origin + '/api/app/auth/contact-profile') apiKind = 'contact-profile';
    }
    let framePageAtResponse = 'unclassified';
    const frameRaw = info.frameUrl;
    try { if (typeof frameRaw === 'string' && frameRaw.length > 0 && frameRaw.length <= 2048) {
      const frame = new URL(frameRaw);
      if (frame.origin === origin && frameRaw === origin + frame.pathname && !frame.username && !frame.password) {
        if (['/','/en','/es'].includes(frame.pathname)) framePageAtResponse = 'public-home';
        else {
          const path = frame.pathname.replace(/^\/(?:en|ru|es)(?=\/)/, '');
          if (/^\/(?:en|ru|es)\//.test(frame.pathname)) framePageAtResponse = ({
            '/academy':'academy', '/services':'services', '/services/business-consulting':'business',
            '/services/free-situation-review':'free-review', '/services/free-consultation':'free-diagnosis',
          })[path] || 'unclassified';
        }
      }
    }
    } catch { /* Unknown frame URL is not a reason to lose a known response. */ }
    return {apiKind, framePageAtResponse,
      status: Number.isInteger(info.status) && info.status >= 100 && info.status <= 599 ? info.status : 'unclassified',
      method: methods.has(info.method) ? info.method : 'OTHER',
      resourceType: resources.has(info.resourceType) ? info.resourceType : 'unclassified',
      navigation: info.navigation === true};
  } catch { return null; }
}

export function attachPublicApiReadDiagnostics(page, origin, observations) {
  page.on('response', response => {
    if (observations.length >= 40) return;
    try {
      const request = response.request();
      let frameUrl = '';
      try { frameUrl = request.frame().url(); } catch { /* Detached frame remains unknown. */ }
      const entry = publicApiReadDiagnostic({url:request.url(),method:request.method(),resourceType:request.resourceType(),
        navigation:request.isNavigationRequest(),status:response.status(),frameUrl},origin);
      if (entry) observations.push(entry);
    } catch { observations.push({observerState:'unavailable'}); }
  });
}
