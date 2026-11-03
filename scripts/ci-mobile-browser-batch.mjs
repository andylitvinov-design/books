// Reuse each real browser process but give each test an independent browser context.
// Two workers at most; a failing assertion must fail the whole specialist gate.
export async function runMobileBrowserCases(groups, verify) {
  const parallel = Number(process.env.HH_BROWSER_QA_PARALLEL || "1");
  if (!Number.isInteger(parallel) || parallel < 1 || parallel > 2) {
    throw new Error("HH_BROWSER_QA_PARALLEL must be 1 or 2");
  }
  for (const { browserType, cases } of groups) {
    if (!Array.isArray(cases) || cases.length === 0) throw new Error("Missing browser cases");
    const browser = await browserType.launch();
    try {
      let cursor = 0;
      let firstFailure;
      await Promise.all(Array.from({ length: Math.min(parallel, cases.length) }, async () => {
        while (cursor < cases.length && !firstFailure) {
          const testCase = cases[cursor++];
          try {
            await verify(browserType, browser, ...testCase);
          } catch (error) {
            firstFailure ??= error;
          }
        }
      }));
      if (firstFailure) throw firstFailure;
    } finally {
      await browser.close();
    }
  }
}
