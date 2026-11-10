import "server-only";
import {getAppConfig} from "../app/config.js";
import {transaction} from "../app/database.js";
import {
  readOwnerVaultRegistryCounts,
  UNKNOWN_VAULT_REGISTRY_COUNTS,
} from "./registry-health.mjs";

/**
 * Call only after verified owner session (requireAdminRequest or
 * ownerMaterialRequest). Does not set privileged DB roles or read raw media.
 * Backend transaction uses existing forced RLS / approved-only SELECT policy.
 */
export async function getOwnerVaultRegistrySnapshot(){
  try{
    const config=getAppConfig();
    const snapshot=await transaction(
      config,null,(db)=>readOwnerVaultRegistryCounts(db),{server:true},
    );
    return {...snapshot,observedAt:new Date().toISOString()};
  }catch{
    // Never convert an unavailable database into an invented empty catalog.
    return {...UNKNOWN_VAULT_REGISTRY_COUNTS,observedAt:null};
  }
}
