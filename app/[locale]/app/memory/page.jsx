import { notFound } from 'next/navigation'
import ClientMemoryWorkspace from '@/components/app/client-memory-workspace'
export const dynamic='force-dynamic'
export const revalidate=0
export const metadata={title:'My Memory & Practices | Holistic House',robots:{index:false,follow:false},referrer:'no-referrer'}
export default async function MemoryPage({params,searchParams}){
  const {locale}=await params
  if(!['en','ru','es'].includes(locale))notFound()
  const query=await searchParams||{}
  const requestId=typeof query.requestId==='string'&&/^[a-f0-9-]{36}$/i.test(query.requestId)?query.requestId:null
  return <ClientMemoryWorkspace locale={locale} masterRequestId={requestId}/>
}
