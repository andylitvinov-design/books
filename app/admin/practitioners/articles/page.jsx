import {redirect} from 'next/navigation'
import {requireAdminRequest} from '@/lib/prescriptions/admin'
import ArticlesModeration from '@/components/practitioner-articles-moderation'
export const dynamic='force-dynamic'
export const metadata={title:'Article Moderation | Holistic House',robots:{index:false,follow:false}}
export default async function Page(){if(!(await requireAdminRequest()))redirect('/admin/login');return <ArticlesModeration/>}
