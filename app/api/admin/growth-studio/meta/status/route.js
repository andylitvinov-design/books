import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {verifyMetaInstagramConnection,META_ACCOUNT_TARGETS,metaInstagramConfigurationStatus} from '@/lib/growth-studio/meta-instagram.mjs'

export const dynamic='force-dynamic'
export async function GET() {
  if(!await requireAdminRequest())return NextResponse.json({ok:false,error:'unauthorized'},{status:401})
  try{
    const accounts=await Promise.all(Object.keys(META_ACCOUNT_TARGETS).map(verifyMetaInstagramConnection))
    return NextResponse.json({ok:true,accounts,configuration:metaInstagramConfigurationStatus()},{headers:{'Cache-Control':'no-store, private'}})
  }catch{
    return NextResponse.json({ok:false,error:'meta_status_unavailable'},{status:503,headers:{'Cache-Control':'no-store'}})
  }
}
