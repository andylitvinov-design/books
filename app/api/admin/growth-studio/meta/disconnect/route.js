import {NextResponse} from 'next/server'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {deleteMetaInstagramCredentials,META_ACCOUNT_TARGETS} from '@/lib/growth-studio/meta-instagram.mjs'

export const dynamic='force-dynamic'
export async function POST(request) {
  if(!await requireAdminRequest())return NextResponse.json({ok:false,error:'unauthorized'},{status:401})
  let targetId
  try{const body=await request.json();targetId=body?.account}catch{}
  if(!Object.hasOwn(META_ACCOUNT_TARGETS,targetId||''))return NextResponse.json({ok:false,error:'invalid_account'},{status:400})
  try{
    await deleteMetaInstagramCredentials(targetId)
    return NextResponse.json({ok:true,account:targetId},{headers:{'Cache-Control':'no-store'}})
  }catch{
    return NextResponse.json({ok:false,error:'meta_disconnect_failed'},{status:503})
  }
}
