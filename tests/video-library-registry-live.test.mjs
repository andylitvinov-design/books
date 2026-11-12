import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {
  APPROVED_VAULT_COUNTS_SQL,readOwnerVaultRegistryCounts,
  normalizeReadyVaultCountRow,UNKNOWN_VAULT_REGISTRY_COUNTS,
} from "../lib/video-library/registry-health.mjs";

test("owner counts query reads only backend RLS-visible approved rows",()=>{
 assert.match(APPROVED_VAULT_COUNTS_SQL,/app\.video_vault_assets_v1/);
 assert.match(APPROVED_VAULT_COUNTS_SQL,/status='generator_eligible'/);
 assert.match(APPROVED_VAULT_COUNTS_SQL,/raw_client_delivery_ok=true/);
 assert.doesNotMatch(APPROVED_VAULT_COUNTS_SQL,/select\s+\*|service_role|security definer|insert|update|delete/i);
});
test("real zero DB counts are not mistaken for unknown R2 object state",async()=>{
 const calls=[];
 const snapshot=await readOwnerVaultRegistryCounts({
  async query(sql){calls.push(sql);return {rows:[{
   visible_ready_rows:0,browser_eligible_rows:0,browser_landscape_rows:0,browser_portrait_rows:0,
  }]};},
 });
 assert.equal(calls.length,1);
 assert.equal(snapshot.status,"db_policy_visible_only");
 assert.equal(snapshot.visibleApprovedRows,0);
 assert.equal(snapshot.browserEligibleRows,0);
 assert.equal(snapshot.currentCloudflareHeadVerified,false);
 assert.equal(snapshot.currentCloudflareFullReadbackVerified,false);
 assert.equal(snapshot.completedFourShotExportsVerified,false);
 assert.equal(UNKNOWN_VAULT_REGISTRY_COUNTS.visibleApprovedRows,null);
});
test("RLS-eligible source counts remain separate from raw-client/format readiness",()=>{
 const snapshot=normalizeReadyVaultCountRow({
  visible_ready_rows:"23",browser_eligible_rows:"18",
  browser_landscape_rows:"12",browser_portrait_rows:"6",
 });
 assert.equal(snapshot.visibleApprovedRows,23);
 assert.equal(snapshot.browserEligibleRows,18);
 assert.equal(snapshot.browserLandscapeRows,12);
 assert.equal(snapshot.browserPortraitRows,6);
 assert.equal(snapshot.allStatusesVerified,false);
});
test("invalid or unavailable database output never upgrades unknown to READY",async()=>{
 for(const row of [
  {visible_ready_rows:-1,browser_eligible_rows:0,browser_landscape_rows:0,browser_portrait_rows:0},
  {visible_ready_rows:1,browser_eligible_rows:2,browser_landscape_rows:0,browser_portrait_rows:0},
  {visible_ready_rows:3,browser_eligible_rows:3,browser_landscape_rows:2,browser_portrait_rows:2},
  {visible_ready_rows:3,browser_eligible_rows:"oops",browser_landscape_rows:0,browser_portrait_rows:0},
 ])assert.throws(()=>normalizeReadyVaultCountRow(row),/VAULT_COUNTS_UNVERIFIED/);
 assert.throws(()=>normalizeReadyVaultCountRow(null),/VAULT_COUNTS_UNVERIFIED/);
 await assert.rejects(()=>readOwnerVaultRegistryCounts(null),/VAULT_DB_UNAVAILABLE/);
 await assert.rejects(()=>readOwnerVaultRegistryCounts({query:async()=>({rows:[]})}),/VAULT_COUNTS_UNVERIFIED/);
});
test("live registry route and dashboard remain owner-only and server-side",()=>{
 const route=readFileSync(new URL("../app/api/admin/video-library/coverage/route.js",import.meta.url),"utf8");
 const page=readFileSync(new URL("../app/admin/video-library/page.tsx",import.meta.url),"utf8");
 const server=readFileSync(new URL("../lib/video-library/registry-health-server.js",import.meta.url),"utf8");
 assert.match(route,/ownerMaterialRequest\(request/);
 assert.match(route,/getOwnerVaultRegistrySnapshot\(\)/);
 assert.match(page,/requireAdminRequest\(\)/);
 assert.match(page,/liveVault\.browserEligibleRows/);
 assert.match(page,/t\.r2Unverified/);
 assert.match(server,/server-only/);
 assert.match(server,/transaction\(/);
 assert.match(server,/server:true/);
 assert.doesNotMatch(route+page+server,/service_role|NEXT_PUBLIC_|https:\/\/.*r2\.dev|R2_WRITE_ACCESS_KEY/);
});
