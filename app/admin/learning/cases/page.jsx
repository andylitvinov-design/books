import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import CaseLab from './case-lab';
import styles from '../learning.module.css';
export const dynamic='force-dynamic';
export const revalidate=0;
export const metadata={title:'Ali Learning Studio · Dialogue Lab',robots:{index:false,follow:false},referrer:'no-referrer'};
export default async function LearningCasesPage(){
 if(!await requireAdminRequest())redirect('/admin/login');
 return <main className={styles.page}><header className={styles.hero}><p className={styles.eyebrow}>ALI · OWNER ONLY</p><h1>Dialogue Library & Training Lab</h1><p>Синтетические примеры, редактор кандидатов и отдельная тестовая база RU / EN / ES. Никаких клиентских переписок или автоматического обучения.</p></header><CaseLab/></main>;
}
