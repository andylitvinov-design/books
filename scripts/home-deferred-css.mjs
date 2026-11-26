// Serialized into the generated public document and authorized by its CSP hash.
export function restoreHomeStyles() {
  let started = false;
  let fallback;
  const afterPaint = callback => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(callback, 0)));
  function start() {
    if (started || document.readyState === 'loading') return;
    started = true;
    clearTimeout(fallback);
    // Keep the original link/href/data-precedence nodes in place so React's
    // stylesheet resource lookup and the original cascade are preserved.
    const links = [...document.querySelectorAll('link[data-home-full-style]')];
    const originalMedia = links.map(link => link.getAttribute('media'));
    const pending = links.map(link => new Promise(resolve => {
      link.addEventListener('load', () => resolve(true), {once: true});
      link.addEventListener('error', () => resolve(false), {once: true});
      link.media = 'print';
      link.disabled = false;
      if (link.sheet) resolve(true);
    }));
    const activate = () => links.forEach((link, i) => {
      if (originalMedia[i] === null) link.removeAttribute('media');
      else link.setAttribute('media', originalMedia[i]);
    });
    const timeout = setTimeout(activate, 2500);
    Promise.all(pending).then(results => {
      clearTimeout(timeout);
      activate();
      // The complete original rules now own the cascade. Retain the inline
      // fallback if any stylesheet failed, rather than blanking the hero.
      if (links.length && results.every(Boolean)) {
        document.querySelector('style[data-home-critical-css]')?.remove();
      }
    });
  }
  function ready() {
    // The fallback also covers a slow/broken image and background tabs.
    fallback = setTimeout(start, 1200);
    const portrait = document.querySelector('[data-home-ali-persona] > img');
    if (portrait && typeof portrait.decode === 'function') {
      portrait.decode().then(() => afterPaint(start), () => afterPaint(start));
    } else afterPaint(start);
  }
  for (const type of ['pointerdown', 'keydown', 'touchstart', 'scroll']) {
    addEventListener(type, start, {once: true, passive: true, capture: true});
  }
  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', ready, {once: true});
  else ready();
}
export const restoreStyles = '(' + restoreHomeStyles.toString() + ')();';
