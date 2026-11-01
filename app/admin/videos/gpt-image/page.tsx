import {redirect} from 'next/navigation';
import {requireAdminRequest} from '@/lib/prescriptions/admin';
import {GptImageOwnerPanel} from '@/components/gpt-image-owner-panel';
export const dynamic='force-dynamic';
export const metadata={title:'GPT Image pilot — Holistic House',robots:{index:false,follow:false}};
export default async function GptImageOwnerPage(){
  if(!await requireAdminRequest())redirect('/admin/login');
  return <main style={{maxWidth:760,margin:'2rem auto',padding:'1rem'}}>
    <h1 style={{fontSize:'1.5rem',marginBottom:12}}>GPT Image · тест владельца</h1>
    <p>Генерация кинематографических фонов через OpenAI. Бесплатный просмотр брифа не вызывает API; платная генерация разрешается только после отдельного включения лимитов на сервере. Персональные данные клиентов не отправляются.</p>
    <GptImageOwnerPanel/>
  </main>;
}