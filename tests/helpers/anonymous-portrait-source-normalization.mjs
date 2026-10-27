import assert from 'node:assert/strict';
const edits=[
  {
    "after": "import { createAnonymousPortraitBootstrapFixture, portraitBootstrapPattern, anonymousPortraitCopy } from \"./helpers/anonymous-portrait-bootstrap-fixture.mjs\";\nimport { attachPublicApiReadDiagnostics } from \"./helpers/public-api-read-diagnostics.mjs\";\n",
    "before": "import { attachPublicApiReadDiagnostics } from \"./helpers/public-api-read-diagnostics.mjs\";\n"
  },
  {
    "after": "const diagnostics = { runtime: \"next-start production\", console: [], apiReadObservations: [], anonymousPortraitDenials: [], pageErrors: [], devIssueOverlay: false };\nconst portraitFixtures = new WeakMap(), approvedPortraitConsole = new WeakSet();",
    "before": "const diagnostics = { runtime: \"next-start production\", console: [], apiReadObservations: [], pageErrors: [], devIssueOverlay: false };"
  },
  {
    "after": "        const entry = { type: message.type(), text: message.text(), path };\n        diagnostics.console.push(entry);\n        portraitFixtures.get(page)?.observeConsole(message, entry);",
    "before": "        diagnostics.console.push({ type: message.type(), text: message.text(), path });"
  },
  {
    "after": "      const portraitFixture = createAnonymousPortraitBootstrapFixture(page, origin, locale);\n      portraitFixtures.set(page, portraitFixture);\n      await page.route(portraitBootstrapPattern, portraitFixture.route);\n      page.on(\"response\", portraitFixture.observeResponse);\n      try {\n      portraitFixture.arm();\n      await cabinetEntry.click();",
    "before": "      await cabinetEntry.click();"
  },
  {
    "after": "      const anonymousCopy = anonymousPortraitCopy[locale];\n      await expect(privateSpaceDialog.getByText(anonymousCopy.guest, {exact:true})).toBeVisible();\n      await expect(privateSpaceDialog.getByRole(\"button\", {name:anonymousCopy.googleName, exact:true})).toBeVisible();\n      await expect(privateSpaceDialog.getByText(anonymousCopy.unavailable, {exact:true})).toHaveCount(0);\n      await expect(privateSpaceDialog.getByRole(\"button\", {name:anonymousCopy.retry, exact:true})).toHaveCount(0);\n      assert.deepEqual(await privateSpaceDialog.locator(\"a[data-space-link]\").evaluateAll(links=>links.map(link=>link.getAttribute(\"data-space-link\")).sort()), [\"plan\",\"profile\"]);\n      await expect.poll(()=>portraitFixture.responses).toBe(1);\n      await privateSpaceDialog.locator('header button[type=\"button\"]').first().click();",
    "before": "      await privateSpaceDialog.locator('header button[type=\"button\"]').first().click();"
  },
  {
    "after": "      await expect(cabinetEntry).toHaveAttribute(\"aria-expanded\", \"false\");\n      diagnostics.anonymousPortraitDenials.push(portraitFixture.finish(approvedPortraitConsole));\n      } finally {\n        await page.unroute(portraitBootstrapPattern, portraitFixture.route);\n        page.off(\"response\", portraitFixture.observeResponse);\n        portraitFixtures.delete(page);\n      }\n      const siteMenu = header.locator(\"details.site-main-menu\");",
    "before": "      await expect(cabinetEntry).toHaveAttribute(\"aria-expanded\", \"false\");\n      const siteMenu = header.locator(\"details.site-main-menu\");"
  },
  {
    "after": "  assert.equal(diagnostics.anonymousPortraitDenials.length, 8, \"Every deliberate EN/RU services My Space activation has an explicit anonymous denial\");\n  assert.deepEqual(diagnostics.console.filter((entry) => entry.type === \"error\" && !approvedPortraitConsole.has(entry)), [], \"Unexpected browser console errors\");",
    "before": "  assert.deepEqual(diagnostics.console.filter((entry) => entry.type === \"error\"), [], \"Unexpected browser console errors\");"
  }
];
export function removeAnonymousPortraitAdditions(source){
 for(const {after,before} of edits){assert.equal(source.split(after).length-1,1,'One exact portrait verifier addition');source=source.replace(after,before)}
 return source;
}
