import type {Metadata} from 'next'
import {notFound} from 'next/navigation'
import {PublicSiteHeader} from '@/components/public-site-header'
import {isPublicLocale} from '@/data/academy/catalog'
import {metadataBaseFor} from '@/data/site-metadata'
import {getAppConfig} from '@/lib/app/config'
import {createArticleRepository} from '@/lib/practitioners/article-repository'
import styles from '@/components/practitioner-articles-public.module.css'
import {ArticleDirectory} from '@/components/practitioner-article-directory'
export const dynamic='force-dynamic';export const revalidate=0;
type Props={params:Promise<{locale:string}>}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale}=await params;if(!isPublicLocale(locale))return{robots:{index:false,follow:false}}
 return {metadataBase:metadataBaseFor(),title:locale==='ru'?'Статьи практиков | Holistic House':locale==='es'?'Artículos de profesionales | Holistic House':'Practitioner articles | Holistic House',description:locale==='ru'?'Практические статьи и объяснения от авторов Holistic House.':'Educational articles and practical insights by Holistic House practitioners.',alternates:{canonical:'/'+locale+'/articles'}}
}
export default async function Articles({params}:Props){
 const {locale}=await params;if(!isPublicLocale(locale))notFound()
 const ru=locale==='ru',es=locale==='es';
 let articles:{id:string;slug:string;practitionerName:string;publishedAt:string|null;published:{title:string;excerpt:string;coverPath?:string}}[]=[]
 try{articles=await createArticleRepository(getAppConfig()).publicList(locale)}catch{}
 return <main className="services-shell services-shell--studio" lang={locale}><PublicSiteHeader locale={locale}/>
  <section className={styles.hero}><p className="homeopathy-kicker">Holistic House · Journal</p>
   <h1>{ru?'Статьи наших практиков':es?'Artículos de profesionales':'Practitioner articles'}</h1>
   <p>{ru?'Материалы для самоисследования, обучения и выбора подходящих практик.':es?'Lecturas educativas para explorar enfoques y conocer a sus autores.':'Useful educational perspectives and thoughtful introductions to methods.'}</p>
  </section>
  <ArticleDirectory locale={locale} articles={articles.map(a=>({id:a.id,slug:a.slug,practitionerName:a.practitionerName,publishedAt:String(a.publishedAt||''),title:a.published.title,excerpt:a.published.excerpt,coverPath:a.published.coverPath||''}))}/>
 </main>
}
