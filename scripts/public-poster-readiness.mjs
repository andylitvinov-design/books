export async function decodeReadyPoster(image, expect) {
  if (!image) throw new Error('Poster element is absent');
  try {
    const source = await image.evaluate(el => ({ src: el.getAttribute('src'), srcset: el.getAttribute('srcset') }));
    await image.scrollIntoViewIfNeeded({ timeout: 7000 });
    let selected;
    await expect.poll(async () => {
      const current = await image.evaluate((el, expected) => {
      if (!el.isConnected || el.ownerDocument !== document || document.visibilityState !== 'visible') throw new Error('Poster document/element is no longer active');
      if (el.getAttribute('src') !== expected.src || el.getAttribute('srcset') !== expected.srcset) throw new Error('Poster source changed before decode');
      return el.complete && el.naturalWidth > 0 && el.naturalHeight > 0 ? el.currentSrc : null;
      }, source);
      if (current) selected = current;
      return !!current;
    }, { timeout: 7000, message: 'Current poster must finish loading before strict decode' }).toBe(true);
    await image.evaluate(async (el, expected) => {
      const selected = expected.selected;
      const unchanged = () => el.isConnected && el.ownerDocument === document && document.visibilityState === 'visible'
        && el.getAttribute('src') === expected.src && el.getAttribute('srcset') === expected.srcset
        && !!selected && el.currentSrc === selected && el.complete && el.naturalWidth > 0 && el.naturalHeight > 0;
      if (!unchanged()) throw new Error('Poster identity/readiness changed before decode');
      await el.decode();
      if (!unchanged()) throw new Error('Poster identity/readiness changed during decode');
    }, { ...source, selected });
  } catch (error) {
    const identity = await image.evaluate(el => {
      const path = value => { if (!value) return null; try { const url = new URL(value, document.baseURI); return ['http:', 'https:'].includes(url.protocol) ? url.pathname : null; } catch { return null; } };
      return { srcPath: path(el.getAttribute('src')), currentSrcPath: path(el.currentSrc), complete: el.complete,
        naturalWidth: el.naturalWidth, naturalHeight: el.naturalHeight, connected: el.isConnected, visibility: document.visibilityState };
    }).catch(() => ({ unavailable: true }));
    throw new Error(`${error.message}; poster=${JSON.stringify(identity)}`, { cause: error });
  } finally {
    await image.dispose().catch(() => {});
  }
}
