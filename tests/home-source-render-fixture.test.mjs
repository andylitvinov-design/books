import assert from 'node:assert/strict';
import test from 'node:test';
import { homeFixture, components, elements, links, nodes, readHomeSource } from './helpers/home-source-render-fixture.mjs';

// Offline source-contract checks only: real page/module exports and handlers,
// no React effects, hydration, account requests, or live browser claims.
for (const locale of ['en', 'ru', 'es']) {
  test(locale + ' current Home additions execute real exports and preserve their stateful public choices', async () => {
    const fixture = homeFixture({ locale });
    const first = await fixture.renderHome();
    const master = components(first, 'HomeMasterPath');
    const workspace = components(first, 'HomeFeaturedWorkspace');
    assert.equal(master.length, 1);
    assert.equal(workspace.length, 1);
    assert.equal(nodes(master[0]).filter(n => n.props?.['data-home-path-panel'] === 'personal').length, 1);
    assert.equal(nodes(workspace[0]).filter(n => n.props?.['data-home-module-selected'] === 'true')[0].props['data-home-module'], 'tests');
    assert.deepEqual(links(workspace[0]).map(n => n.props.href), [
      `/${locale}/client/tests?focus=stress`, `/${locale}/client/tests?focus=resources`, `/${locale}/client/tests`,
    ]);
    elements(master[0], 'button').find(n => n.props['data-home-path-switch'] === 'master').props.onClick();
    elements(workspace[0], 'button').find(n => n.props['data-home-module'] === 'courses').props.onClick();
    const next = await fixture.renderHome();
    const masterNext = components(next, 'HomeMasterPath')[0];
    const workspaceNext = components(next, 'HomeFeaturedWorkspace')[0];
    assert.equal(nodes(masterNext).filter(n => n.props?.['data-home-path-panel'] === 'master').length, 1);
    assert.equal(elements(masterNext, 'li').length, 6);
    const accountLocale = locale === 'ru' ? 'ru' : 'en';
    assert.equal(links(masterNext).find(n => n.props['data-home-master-action'] === 'publish-service').props.href, `/${accountLocale}/app/practice?panel=services`);
    assert.deepEqual(links(workspaceNext).map(n => n.props.href), [`/${locale}/courses/antistress`, `/${accountLocale}/app/business`]);
    assert.equal(nodes(workspaceNext).some(n => n.props?.href?.includes('courseId=')), false, 'No private account or course identity is synthesized');
  });
}

for (const file of ['components/home-master-path.tsx', 'components/home-featured-workspace.tsx', 'components/home-personal-space.tsx', 'lib/native/client.ts']) {
  test('actual Home dependency executes rather than becoming an opaque stub: ' + file, async () => {
    await assert.rejects(async () => homeFixture({ overrides: { [file]: readHomeSource(file) + '\nthrow new Error("ACTUAL_HOME_MODULE_PROBE");\n' } }).renderHome(), /ACTUAL_HOME_MODULE_PROBE/);
  });
}

for (const file of ['components/home-master-path.tsx', 'components/home-featured-workspace.tsx']) {
  test('unknown dependency remains fail-closed in ' + file, async () => {
    const source = 'import { probe } from "@/lib/unapproved-home-probe"; probe();\n' + readHomeSource(file);
    await assert.rejects(async () => homeFixture({ overrides: { [file]: source } }).renderHome(), /Unexpected import.*unapproved-home-probe/);
  });
  test('private account calls remain blocked in ' + file, async () => {
    const source = 'import { appFetch } from "@/lib/app/client-fetch"; appFetch("bootstrap?view=portrait");\n' + readHomeSource(file);
    await assert.rejects(async () => homeFixture({ overrides: { [file]: source } }).renderHome(), /Outside home fixture scope: private account request/);
  });
}

test('the bounded VM does not supply ambient network access', async () => {
  const file = 'components/home-master-path.tsx';
  const source = readHomeSource(file) + '\nfetch("https://example.invalid/private-account");\n';
  await assert.rejects(async () => homeFixture({ overrides: { [file]: source } }).renderHome(), /fetch is not defined/);
});
