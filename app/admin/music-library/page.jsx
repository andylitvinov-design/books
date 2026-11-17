import {cookies} from "next/headers";
import {redirect} from "next/navigation";
import {requireAdminRequest} from "@/lib/prescriptions/admin";
import {uiLocaleCookie} from "@/lib/ui-locale";
import AdminStudioMusic from "@/components/admin-studio-music";
export const dynamic="force-dynamic";
export const metadata={title:"MyVideo Music Library — Holistic House",robots:{index:false,follow:false}};
export default async function StudioMusicAdminPage(){
 if(!await requireAdminRequest())redirect("/admin/login");
 const raw=(await cookies()).get(uiLocaleCookie)?.value;
 const locale=raw==="en"?"en":raw==="es"?"es":"ru";
 return <AdminStudioMusic locale={locale}/>;
}
