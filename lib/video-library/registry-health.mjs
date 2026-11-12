/**
 * Exact, read-only Vault DB evidence for the owner coverage dashboard.
 *
 * Query runs through the EXISTING hh_app_backend role with its forced-RLS
 * ready-only SELECT policy. This is not an all-status inventory, is not a
 * Cloudflare HEAD/full-GET check, and is not proof of finished video exports.
 */
export const APPROVED_VAULT_COUNTS_SQL=[
  "select",
  "count(*)::integer as visible_ready_rows,",
  "count(*) filter (where raw_client_delivery_ok=true)::integer as browser_eligible_rows,",
  "count(*) filter (where raw_client_delivery_ok=true and aspect_ratio='landscape')::integer as browser_landscape_rows,",
  "count(*) filter (where raw_client_delivery_ok=true and aspect_ratio='portrait')::integer as browser_portrait_rows",
  "from app.video_vault_assets_v1",
  "where status='generator_eligible'",
].join(" ");

export function normalizeReadyVaultCountRow(row){
  if(!row||typeof row!=="object")throw Error("VAULT_COUNTS_UNVERIFIED");
  const keys=["visible_ready_rows","browser_eligible_rows","browser_landscape_rows","browser_portrait_rows"];
  const raw=keys.map(k=>row[k]);
  if(raw.some(v=>!((typeof v==="number"&&Number.isSafeInteger(v)&&v>=0)||
    (typeof v==="string"&&/^(0|[1-9][0-9]*)$/.test(v)))))
    throw Error("VAULT_COUNTS_UNVERIFIED");
  const numbers=raw.map(Number);
  if(numbers.some(x=>!Number.isSafeInteger(x)||x<0)||
    numbers[1]>numbers[0]||numbers[2]+numbers[3]>numbers[1])
    throw Error("VAULT_COUNTS_UNVERIFIED");
  return Object.freeze({
    status:"db_policy_visible_only",
    visibleApprovedRows:numbers[0],
    browserEligibleRows:numbers[1],
    browserLandscapeRows:numbers[2],
    browserPortraitRows:numbers[3],
    allStatusesVerified:false,
    currentCloudflareHeadVerified:false,
    currentCloudflareFullReadbackVerified:false,
    completedFourShotExportsVerified:false,
    definition:"RLS-visible generator_eligible rows, not newly decoded or HEAD-verified in this request",
  });
}

export async function readOwnerVaultRegistryCounts(db){
  if(!db||typeof db.query!=="function")throw Error("VAULT_DB_UNAVAILABLE");
  const result=await db.query(APPROVED_VAULT_COUNTS_SQL);
  if(!Array.isArray(result?.rows)||result.rows.length!==1)
    throw Error("VAULT_COUNTS_UNVERIFIED");
  return normalizeReadyVaultCountRow(result.rows[0]);
}

export const UNKNOWN_VAULT_REGISTRY_COUNTS=Object.freeze({
  status:"not_queried_or_unavailable",
  visibleApprovedRows:null,
  browserEligibleRows:null,
  browserLandscapeRows:null,
  browserPortraitRows:null,
  allStatusesVerified:false,
  currentCloudflareHeadVerified:false,
  currentCloudflareFullReadbackVerified:false,
  completedFourShotExportsVerified:false,
  definition:"Database connection not independently verified; unknown does not mean zero",
});
