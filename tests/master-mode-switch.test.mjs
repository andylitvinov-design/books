import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isUnifiedMobileDockPath, unifiedMobileDockActive, unifiedMobileDockHref } from "../lib/unified-mobile-dock.mjs";

const read = path => readFile(new URL("../" + path, import.meta.url), "utf8");

for (const locale of ["en", "ru", "es"]) {
  test("Work belongs to Profile while practitioner editors retain the separate protected route: " + locale, () => {
    assert.equal(unifiedMobileDockHref(locale, "practice"), "/" + locale + "/holistic-support/mobile");
    assert.equal(isUnifiedMobileDockPath("/" + locale + "/practice"), true);
    assert.equal(isUnifiedMobileDockPath("/" + locale + "/masters"), true);
    assert.equal(unifiedMobileDockActive("/" + locale + "/practice"), "profile");
    assert.equal(unifiedMobileDockActive("/" + locale + "/masters"), null);
    assert.equal(unifiedMobileDockActive("/" + locale + "/masters/andy-litvinov"), null);
  });
}

test("the same accessible segmented navigation is above both existing page surfaces", async () => {
  const [component, css, practice, finder, practiceBrowser, communityBrowser] = await Promise.all([
    read("components/master-mode-switch.tsx"),
    read("components/master-mode-switch.module.css"),
    read("components/practice-showcase.jsx"),
    read("app/[locale]/masters/page.tsx"),
    read("scripts/verify-practice-visual-browser.mjs"),
    read("scripts/verify-mentor-community-browser.mjs"),
  ]);
  for (const phrase of ["Find a Master", "I'm a Master", "Share services",
    "Найти мастера", "Разместить услуги", "Buscar un maestro", "Compartir servicios"]) {
    assert.ok(component.includes(phrase), phrase);
  }
  assert.match(component, /href=\{prefix \+ "\/masters"\}/);
  assert.match(component, /href=\{prefix \+ "\/practice"\}/);
  assert.match(component, /aria-current=\{active === "find"/);
  assert.match(component, /aria-current=\{active === "share"/);
  assert.doesNotMatch(component, /auth\/start|appFetch|fetch\(/);
  assert.doesNotMatch(practice, /MasterModeSwitch|data-master-network-heading/);
  assert.match(practice, /<PracticeWorkProfileIntro locale=\{locale\} t=\{t\} onAction=\{openAction\} \/>/);
  assert.match(finder, /<MasterModeSwitch locale=\{locale\} active="find"\s*\/>/);
  assert.match(finder, /<MarketplaceMasterFinder practitioners=/);
  assert.match(practice, /onClick=\{\(\) => void openAction\(key\)\}/);
  assert.match(css, /grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /min-height:\s*77px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(practiceBrowser, /data-legacy-practice-bottom-nav/);
  assert.match(communityBrowser, /data-master-mode="share"/);
});

test("Live / Work is a reversible profile-header switch to real service publishing", async () => {
  const [component, css, profile, practice, workIntro, workspace, route] = await Promise.all([
    read("components/master-mode-switch.tsx"),
    read("components/master-mode-switch.module.css"),
    read("components/app/profile-hub-tabs.jsx"),
    read("components/practice-showcase.jsx"),
    read("components/practice-work-profile-intro.jsx"),
    read("components/app/app-workspace.jsx"),
    read("app/[locale]/practice/page.jsx"),
  ]);
  assert.match(component, /export function ProfileModeSwitch/);
  assert.match(component, /profileLocale = language === "es" \? "en" : language/);
  assert.match(component, /href=\{"\/" \+ profileLocale \+ "\/app\/portrait"\}/);
  assert.match(component, /href=\{"\/" \+ language \+ "\/practice"\}/);
  assert.match(component, /data-profile-mode="live"/);
  assert.match(component, /data-profile-mode="work"/);
  assert.match(component, /aria-current=\{active === "live" \? "page"/);
  assert.match(component, /aria-current=\{active === "work" \? "page"/);
  assert.match(profile, /<ProfileModeSwitch locale=\{selected\} active="live" \/>/);
  const appShell = await read("components/app/app-workspace.jsx");
  const appShellCss = await read("app/[locale]/app/[[...path]]/workspace.css");
  assert.match(appShell, /page === 'portrait' \? 'hh-app hh-app--profile'/);
  assert.match(appShell, /page !== 'portrait' && <header className="hh-header">/);
  assert.match(appShell, /page !== 'portrait' && page !== 'runs' && page !== 'settings'/);
  assert.match(appShell, /data-profile-page-shell=\{page === 'portrait'/);
  assert.match(appShellCss, /\.hh-app\.hh-app--profile/);
  assert.match(profile, /data-profile-settings-link/);
  assert.doesNotMatch(profile.match(/<header className=\{styles\.heading\}>[\s\S]*?<\/header>/)?.[0] || '', /data-profile-my-page|data-profile-settings-link/);
  assert.doesNotMatch(profile.match(/<header className=\{styles\.heading\}>[\s\S]*?<\/header>/)?.[0] || '', /data-profile-my-page/);
  assert.match(profile, /data-profile-my-page-placement="below-video-buttons"/);
  assert.match(profile, /data-profile-my-page-placement="below-tabs"/);
  assert.match(profile, /data-profile-my-page/);
  assert.doesNotMatch(profile, /className=\{styles\.settings\}/);
  assert.match(workIntro, /<ProfileModeSwitch locale=\{locale\} active="work" \/>/);
  assert.doesNotMatch(workIntro, /data-work-my-page|myPageLink|profileHeadingActions/);
  assert.match(practice, /data-work-profile-actions/);
  assert.match(practice, /className=\{styles\.myPageAction\} data-work-my-page/);
  assert.match(practice, /href=\{'\/' \+ locale \+ '\/my-page'\}/);
  assert.match(practice, /<PracticeWorkProfileIntro[\s\S]*?<section className=\{styles\.identity\}/);
  assert.match(workIntro, /data-profile-work-hub/);
  assert.match(workIntro, /data-work-profile-tabs/);
  assert.match(workIntro, /data-work-profile-quick-actions/);
  assert.match(workIntro, /sun-autumn-hills\.mp4/);
  assert.match(workIntro, /TABS\.map/);
  assert.match(workIntro, /ACTIONS\.map/);
  assert.match(practice, /onClick=\{\(\) => void openAction\(key\)\}/);
  assert.match(workspace, /page === 'practice' && <PracticeWorkspace/);
  assert.match(workspace, /href=\{root \+ '\/settings'\}/);
  assert.match(route, /<PracticeShowcase locale=\{locale\} \/>/);
  assert.match(css, /\.profileSwitch a\[aria-current="page"\]/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /max-width: 360px/);
  assert.doesNotMatch(component, /auth\/start|appFetch|window\.|fetch\(/);
});
