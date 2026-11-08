import {ownerMaterialRequest} from '@/lib/clients/material-library-http'
import {privateJson} from '@/lib/clients/delivery-http'
import {auditVideoSiteCoverage} from '@/lib/video-library/coverage.mjs'
import {getOwnerVaultRegistrySnapshot} from '@/lib/video-library/registry-health-server.js'

/**
 * Existing owner-authenticated admin surface. No live R2/DB queries or remote
 * video exposure; unknown production evidence stays explicitly unknown.
 * Never show client media, source licence files, private vault object keys,
 * presigned master URLs or hidden owner materials in a coverage response.
 */
export const runtime='nodejs'
export const dynamic='force-dynamic'
export async function GET(request){
  return ownerMaterialRequest(request,async()=>{
    const search=new URL(request.url).searchParams
    if([...search.keys()].some(key=>key!=='aspect')||
      search.getAll('aspect').length>1)return privateJson({error:'BAD_COVERAGE_QUERY'},400)
    const aspect=search.get('aspect')||'portrait'
    if(!['portrait','landscape','square'].includes(aspect))
      return privateJson({error:'BAD_COVERAGE_ASPECT'},400)
    const report=auditVideoSiteCoverage({aspect})
    const liveVaultRegistry=await getOwnerVaultRegistrySnapshot()
    return privateJson({...report,liveVaultRegistry})
  })
}
