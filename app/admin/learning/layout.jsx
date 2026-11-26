import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import Link from 'next/link';

export const dynamic='force-dynamic';
export default async function LearningLayout({children}){
  if(!await requireAdminRequest())redirect('/admin/login');
  return <><nav aria-label="Ali Learning Studio" style={{display:'flex',flexWrap:'wrap',gap:'16px',padding:'16px',maxWidth:1120,margin:'0 auto'}}><Link href="/admin/learning">Quality monitor</Link><Link href="/admin/learning/cases">Dialogue library & training lab</Link></nav>{children}</>;
}
