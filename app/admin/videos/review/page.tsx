import "@/app/site-video-admin.css";
import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import Link from "next/link";
import {PrescriptionAdminHeader} from "@/components/prescription-admin-header";
import {VideoReviewQueue} from "@/components/video-review-queue";
import {getAppConfig} from "@/lib/app/config";
import {requireAdminActor} from "@/lib/prescriptions/admin";
import {listVideoReviewRows} from "@/lib/site-videos/review-store";
import {uiLocaleCookie} from "@/lib/ui-locale";
export const dynamic="force-dynamic";
export const metadata={title:"Video review · Holistic House",robots:{index:false,follow:false}};
export default async function OwnerVideoReviewPage(){
  const actor=await requireAdminActor();
  if(!actor)redirect("/admin/login");
  const raw=(await cookies()).get(uiLocaleCookie)?.value;
  const locale=raw==="en"?"en":raw==="es"?"es":"ru";
  let rows:Awaited<ReturnType<typeof listVideoReviewRows>>=[];
  let unavailable=false;
  try{rows=await listVideoReviewRows(getAppConfig(),actor)}catch{unavailable=true}
  return <main className="prescription-admin-shell site-video-manager-shell" data-owner-video-review-page>
    <PrescriptionAdminHeader title={{en:"Video review",ru:"Проверка видео"}}
      description={{en:"Review videos before MyTube publication.",ru:"Проверяйте видео перед размещением в MyTube."}}/>
    <section className="site-video-review-entry">
      <div><strong>{locale==="ru"?"Проверка коротких видео":"Short video review"}</strong>
        <p>{locale==="ru"?"RU/EN · до 10 минут · проверка содержания и категорий":"RU/EN · up to 10 minutes · content and category verification"}</p></div>
      <Link href="/admin/videos">{locale==="ru"?"Назад к видео сайта":"Website video editor"}</Link>
    </section>
    <VideoReviewQueue initialRows={rows} initialLocale={locale} unavailable={unavailable}/>
  </main>;
}