'use strict';
// A real browser launch is the fail-closed substitute for APT preinstallation.
// Existing Chromium/WebKit journeys remain mandatory and run after this proof.
const names = process.argv.slice(2);
(async () => {
  const playwrightModule = await import('@playwright/test');
  // CommonJS Playwright builds may not expose all named browser exports.
  const engines = playwrightModule.default || playwrightModule;
  if (!names.length || names.some(name => !Object.hasOwn(engines, name))) {
    console.error('Provide one or more known Playwright engines');
    process.exit(2);
  }
  for (const name of names) {
    const browser = await engines[name].launch({headless:true, timeout:15000});
    try {
      const page = await browser.newPage();
      await page.goto('data:text/html,<title>HH browser readiness</title>');
      if (await page.title() !== 'HH browser readiness') {
        throw Error('Real browser readiness mismatch: ' + name);
      }
      await page.close();
      console.log('HH_BROWSER_REAL_LAUNCH_OK:' + name);
    } finally { await browser.close(); }
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
