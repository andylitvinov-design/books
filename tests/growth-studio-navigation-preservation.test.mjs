import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=(p)=>readFileSync(new URL("../"+p,import.meta.url),"utf8");

test("Growth Studio is owner-admin only, not publicly writable",()=>{
 const page=read("app/admin/growth-studio/page.js");
 const actions=read("app/admin/growth-studio/actions.js");
 assert.match(page,/requireAdminRequest\(\)/);
 assert.match(page,/redirect\('\/admin\/login'\)/);
 assert.match(page,/robots:\{index:false,follow:false\}/);
 for(const action of ["listGrowthStudioPostsAction","updateGrowthStudioPostAction","createGrowthStudioBulkAction","checkGrowthTelegramPublisherAction","publishGrowthTelegramNowAction"]){
  const start=actions.indexOf("export async function "+action);
  assert.ok(start>=0,"missing guarded function "+action);
  assert.ok(actions.slice(start,start+310).includes("requireAdminRequest()"),action+" must check auth first");
 }
});

test("new owner Growth Studio links do not replace practitioner onboarding, CRM and services",()=>{
 const practice=read("components/app/practice-workspace.jsx");
 const admin=read("components/prescription-admin-header.jsx");
 const cabinet=read("components/practitioner-cabinet.jsx");
 assert.match(practice,/isOwner&&<PracticeTile Icon=\{Megaphone\}/);
 assert.match(practice,/window\.location\.assign\('\/admin\/growth-studio'\)/);
 assert.match(practice,/needsOnboarding/);
 // The current live onboarding no longer uses the older showSignup toggle.
 // Preserve the actual onboarding component and its new entry point instead.
 assert.match(practice,/hh-practice-onboarding/);
 assert.match(practice,/MasterOnboarding/);
 assert.match(practice,/PractitionerClientProfiles/);
 assert.match(practice,/PracticeRequestsOverview/);
 assert.match(practice,/CrmManager/);
 assert.match(cabinet,/href:'\/admin\/growth-studio'/);
 assert.match(admin,/href="\/admin\/growth-studio"/);
 assert.match(admin,/href="\/admin\/seo"/);
});

test("editing workflow is manual by default; Telegram sends only after verified owner consent",()=>{
 const actions=read("app/admin/growth-studio/actions.js");
 const telegram=read("lib/growth-studio/telegram.mjs");
 const workflows=read(".github/workflows/hh-growth-studio.yml");
 assert.match(actions,/input\.confirmed!==true/);
 assert.match(actions,/verifyTelegramPostingPermissions\(\)/);
 assert.match(actions,/await store\.save\(claimed,source\.revision\)/);
 assert.match(actions,/telegram_delivery_unknown/);
 assert.match(telegram,/HH_GROWTH_TELEGRAM_ENABLED==='true'/);
 assert.match(telegram,/getChatMember/);
 assert.match(workflows,/persist-credentials: false/);
 assert.doesNotMatch(workflows,/VERCEL_TOKEN|SUPABASE_SECRET|REDIS_TOKEN/);
});

test("provider OAuth links are owner-invoked and never imply publishing connectivity",()=>{
 const panel=read("components/growth-studio-connections.jsx");
 const admin=read("app/admin/growth-studio/page.js");
 assert.ok(admin.includes("requireAdminRequest()"));
 for(const url of [
  "https://t.me/BotFather",
  "https://vercel.com/super10/codex-public-book-library/settings/environment-variables",
  "https://app.metricool.com/",
  "https://business.facebook.com/",
  "/admin/youtube-upload",
 ])assert.ok(panel.includes(url),url);
 // Marketing pixel/ad connectors never grant social publishing OAuth.
 assert.doesNotMatch(panel,/app\.hypd\.ai\/sources\?manage=/);
 assert.ok(panel.includes("t.ownerConnectNote"));
 assert.ok(!panel.includes("autoConnect(") && !panel.includes("accessToken"));
 assert.match(panel,/rel="noopener noreferrer"/);
});
