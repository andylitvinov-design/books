/**
 * Read-only/authorized seam between one existing Auto Video Director and the
 * private HH Video Vault. Not a raw-file proxy; never accepts outside URLs.
 * Server entrypoints never return credentials, origin licence evidence or
 * unrestricted catalog listings to the browser.
 */
import {isGeneratorEligible,selectVaultScenes} from './contracts.mjs';
import {r2Config,createR2Client} from './r2-client.mjs';

const ID=/^[a-z][a-z0-9-]{2,63}$/;
const TAG=/^[a-z][a-z0-9-]{1,35}$/;
const APPROVED_COLUMNS=[
 'asset_id','source_provider','source_asset_id','filmed_master_id','type',
 'status','owner_review_status','visual_review_score','commercial_use_ok',
 'derivative_edit_ok','raw_client_delivery_ok','subject_release_status',
 'category','aspect_ratio','pace','goals','motifs','tags','duration_ms',
 'width','height','codec','file_bytes','sha256','r2_object_key',
 'poster_object_key','r2_bucket','r2_readback_sha256',
 'technical_verified_at','r2_head_checked_at','attribution_text',
];
export const VAULT_SELECT_COLUMNS=APPROVED_COLUMNS.join(',');
export const VAULT_SEARCH_LIMIT=12;
export function validateVaultSearchParams(params){
  const string=(key)=>params.get(key)||'';
  const fields=['goal','motif','pace','category','aspect'];
  for(const key of fields){
    const val=string(key);
    if(val&&(!TAG.test(val)||val.length>35))throw Error('HH_VAULT_BAD_SEARCH_'+key);
  }
  if(string('aspect')&&!['portrait','landscape'].includes(string('aspect')))
    throw Error('HH_VAULT_BAD_ASPECT');
  if(string('pace')&&!['slow','moderate','upbeat'].includes(string('pace')))
    throw Error('HH_VAULT_BAD_PACE');
  if(string('category')&&!['nature','water','people','heritage','work','relationships'].includes(string('category')))
    throw Error('HH_VAULT_BAD_CATEGORY');
  const requested=string('limit');
  const limit=requested?Number(requested):12;
  if(!Number.isInteger(limit)||limit<1||limit>VAULT_SEARCH_LIMIT)
    throw Error('HH_VAULT_BAD_LIMIT');
  return {goal:string('goal'),motif:string('motif'),pace:string('pace'),
    category:string('category'),aspect:string('aspect'),limit,
    requireClientPlayback:true};
}
export function validateVaultResolveInput(body){
  if(!body||typeof body!=='object'||Array.isArray(body)||
    typeof body.projectId!=='string'||!ID.test(body.projectId)||
    !Array.isArray(body.assetIds)||body.assetIds.length!==4||
    body.assetIds.some(id=>!ID.test(id))||
    new Set(body.assetIds).size!==4||
    Object.keys(body).some(key=>!['projectId','assetIds'].includes(key)))
    throw Error('HH_VAULT_INVALID_RESOLVE');
  return body;
}
export async function listApprovedVaultRows(db,{assetIds=null}={}){
  if(assetIds!==null&&(!Array.isArray(assetIds)||assetIds.length>4||
    assetIds.some(id=>!ID.test(id))))throw Error('HH_VAULT_INVALID_IDS');
  const sql='select '+VAULT_SELECT_COLUMNS+' from app.video_vault_assets_v1 '+
    "where status='generator_eligible' and raw_client_delivery_ok=true"+
    (assetIds?' and asset_id=any($1::text[])':'')+
    ' order by asset_id limit '+(assetIds?'4':'500');
  return (await db.query(sql,assetIds?[assetIds]:[])).rows;
}
export function publicVaultSearchResult(rows,criteria,{signPoster}){
  return selectVaultScenes(rows,criteria).map(r=>({
    assetId:r.asset_id,
    posterUrl:signPoster(r.poster_object_key),title:r.asset_id.replace(/-/g,' '),
    durationMs:r.duration_ms,
    ratio:r.aspect_ratio,goalTags:r.goals,
    qualityScore:r.visual_review_score,
    attributionText:r.attribution_text,
    sourceType:'r2Approved',
  }));
}
export async function resolveVaultFourShots(rows,input,{r2,bucket,now=Date.now}={}){
  validateVaultResolveInput(input);
  if(!r2||typeof r2.head!=='function'||typeof r2.presignGet!=='function')
    throw Error('HH_VAULT_R2_DISABLED');
  const byId=new Map(rows.map(row=>[row.asset_id,row]));
  const selected=input.assetIds.map(id=>byId.get(id));
  if(selected.some(row=>!isGeneratorEligible(row,{requireClientPlayback:true})||
    row.r2_bucket!==bucket))throw Error('HH_VAULT_ASSET_UNAVAILABLE');
  if(new Set(selected.map(r=>r.filmed_master_id)).size!==4||
    new Set(selected.map(r=>r.sha256)).size!==4)
    throw Error('HH_VAULT_DUPLICATE_ORIGINAL_IN_FOUR_SHOTS');
  const output=[];
  for(const row of selected){
    const head=await r2.head(row.r2_object_key);
    if(head.bytes!==Number(row.file_bytes)||head.contentType!=='video/mp4'||
      head.checksum!==row.sha256)throw Error('HH_VAULT_R2_NOT_READY');
    output.push({
      assetId:row.asset_id,sourceType:'r2Approved',
      playbackUrl:r2.presignGet(row.r2_object_key,{seconds:1200}),
      expiresAt:new Date(now()+1200*1000).toISOString(),
      durationMs:row.duration_ms,width:row.width,height:row.height,
      sha256Hint:row.sha256.slice(0,12),attributionText:row.attribution_text,
    });
  }
  return {assets:output,renderable:true,sourceType:'r2Approved'};
}
export function serverVaultR2(env=process.env,options={}){
  if(env.HH_VIDEO_VAULT_SEARCH_ENABLED!=='true')
    throw Error('HH_VAULT_SEARCH_DISABLED');
  const config=r2Config(env,{write:false});
  return {config,r2:createR2Client(config,options)};
}
