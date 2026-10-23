import type {Metadata} from "next";
import {MonthlySupportOwner} from "@/components/monthly-support-owner";
import {requireAdminRequest} from "@/lib/prescriptions/admin";
import {redirect} from "next/navigation";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Monthly support · Owner | Holistic House",
  robots:{index:false,follow:false,nocache:true}};
export default async function PersonalSupportAdminPage(){
  if(!await requireAdminRequest())redirect("/admin/login");
  return <MonthlySupportOwner/>;
}
