import type {Metadata} from 'next'
import Link from 'next/link'
import {notFound} from 'next/navigation'
import {PublicSiteHeader} from '@/components/public-site-header'
import {isPublicLocale} from '@/data/academy/catalog'
import {metadataBaseFor} from '@/data/site-metadata'
import {getAppConfig} from '@/lib/app/config'
import {createArticleRepository} from '@/lib/practitioners/article-repository'
import {articleBlocks,inlineArticleSegments} from '@/lib/practitioners/article-format'
import styles from '@/components/practitioner-articles-public.module.css'
export const dynamic='force-dynamic';export const revalidate=0;
type Props={params:Promise<{locale:string;slug:string}>}
async function load(locale:string,slug:string){
 try{return await createArticleRepository(getAppConfig()).publicArticle(locale,slug)}catch{return null}
}
export async function generateMetadata({params}:Props):Promise<Metadata>{
 const {locale,slug}=await params
 if(!isPublicLocale(locale))return{robots:{index:false,follow:false}}
 const article=await load(locale,slug)
 if(!article)return{title:'Not found',robots:{index:false,follow:false}}
 return {metadataBase:metadataBaseFor(),title:article.published.title+' | Holistic House',description:article.published.excerpt,alternates:{canonical:'/'+locale+'/articles/'+slug},openGraph:{type:'article',title:article.published.title,description:article.published.excerpt}}
}
// Renderer creates React text/strong elements only; article text is always escaped.
function inlineArticleText(value:string){
 return inlineArticleSegments(value).map((segment,i)=>
  segment.strong?<strong key={i}>{segment.text}</strong>:segment.text)
}
export default async function ArticleDetail({params}:Props){
 const {locale,slug}=await params;if(!isPublicLocale(locale))notFound()
 const article=await load(locale,slug);if(!article)notFound()
 const ru=locale==='ru',es=locale==='es',published=article.published
 const blocks=articleBlocks(published.body||'')
 return <main className="services-shell services-shell--studio" lang={locale}><PublicSiteHeader locale={locale}/>
  <article className={styles.article}>
   <Link href={'/'+locale+'/articles'}>← {ru?'Все статьи':es?'Artículos':'All articles'}</Link>
   <p className="homeopathy-kicker">{ru?'Публикация практика':es?'Artículo de profesional':'Practitioner article'}</p>
   <h1>{published.title}</h1>
   <p className={styles.lead}>{published.excerpt}</p>
   <p className={styles.meta}><Link href={'/'+locale+'/masters/'+article.practitionerSlug}>{article.practitionerName}</Link> · {article.publishedAt?new Date(article.publishedAt).toLocaleDateString(locale):''}</p>
   {published.coverPath?<img className={styles.heroCover} src={published.coverPath} alt="" loading="lazy"/>:null}
   <div className={styles.body}>{blocks.map((block,i)=>
    block.type==='h2'?<h2 key={i}>{inlineArticleText(block.text)}</h2>:
    block.type==='h3'?<h3 key={i}>{inlineArticleText(block.text)}</h3>:
    block.type==='ul'?<ul key={i}>{block.items.map((item,j)=><li key={j}>{inlineArticleText(item)}</li>)}</ul>:
    block.type==='ol'?<ol key={i}>{block.items.map((item,j)=><li key={j}>{inlineArticleText(item)}</li>)}</ol>:
    <p key={i} style={{whiteSpace:'pre-line'}}>{inlineArticleText(block.text)}</p>
   )}</div>
   {(published.sourceUrls||[]).length>0&&<aside className={styles.sources}><h2>{ru?'Источники':es?'Fuentes':'Sources'}</h2><ul>{published.sourceUrls.map((url:string,i:number)=><li key={i}><a href={url} rel="noopener noreferrer nofollow" target="_blank">{new URL(url).hostname}</a></li>)}</ul></aside>}
   {article.services?.length>0&&<aside className={styles.related}><h2>{ru?'Услуги автора':es?'Servicios del autor':'Work with this practitioner'}</h2><div className={styles.grid}>
    {article.services.map((service:{id:string;slug:string;title:string;pricingMode:string;price:number|null;currency:string})=><section key={service.id} className={styles.card}>
     <h3>{service.title}</h3>
     <p>{service.pricingMode==='free'?(ru?'Бесплатно':'Free'):service.price!=null?service.currency+' '+service.price:(ru?'Цена по запросу':'Price on request')}</p>
     <Link href={'/'+locale+'/services/'+article.practitionerSlug+'/'+service.slug} className={styles.primary}>{ru?'Подробнее':es?'Ver servicio':'View service'} →</Link>
    </section>)}
   </div></aside>}
   <p className={styles.notice}>{ru?'Это образовательный материал, а не медицинская консультация или гарантия результата.':es?'Contenido educativo: no constituye asesoramiento médico ni garantía de resultados.':'Educational information, not medical advice or a guarantee of results.'}</p>
  </article>
 </main>
}
