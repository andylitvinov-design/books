// Passive diagnostics only: no waiting for fonts, scroll/focus changes, retries
// or relaxed fold assertion. This records the failing first-screen state.
export async function holisticFirstScreenDiagnostics(page) {
  return page.evaluate(() => {
    const snapshot = node => {
      const r = node.getBoundingClientRect(), s = getComputedStyle(node);
      return {x:r.x, y:r.y, width:r.width, height:r.height,
        fontFamily:s.fontFamily, fontSize:s.fontSize, lineHeight:s.lineHeight,
        paddingTop:s.paddingTop, paddingBottom:s.paddingBottom,
        marginTop:s.marginTop, marginBottom:s.marginBottom, display:s.display,
        minHeight:s.minHeight, gap:s.gap, boxSizing:s.boxSizing};
    };
    const selectors = [
      '[data-sitewide-personal-review-banner]', 'header.house-header',
      '[data-holistic-three-choices]', '#holistic-journey-title',
      '[data-holistic-three-choices] [class*="journeyEyebrow"]',
      '[data-holistic-three-choices] [class*="journeyLead"]',
      '[data-holistic-three-choices] [class*="journeyPrompt"]',
      '[data-holistic-choose]', '[data-holistic-choose] strong',
      '[data-holistic-choose] small', '.mobile-bottom-navigation',
    ];
    const viewport = window.visualViewport;
    return {
      viewport:{width:innerWidth,height:innerHeight,scrollX,scrollY,devicePixelRatio,
        clientWidth:document.documentElement.clientWidth,clientHeight:document.documentElement.clientHeight,
        visual:viewport ? {width:viewport.width,height:viewport.height,offsetLeft:viewport.offsetLeft,
          offsetTop:viewport.offsetTop,scale:viewport.scale} : null},
      fontStatus:document.fonts.status,
      fonts:[...document.fonts].map(font => ({family:font.family,status:font.status})),
      shortMobile:matchMedia('(max-width:700px) and (max-height:700px)').matches,
      narrowShortMobile:matchMedia('(max-width:350px) and (max-height:700px)').matches,
      elements:Object.fromEntries(selectors.map(selector =>
        [selector,[...document.querySelectorAll(selector)].map(snapshot)])),
    };
  });
}
