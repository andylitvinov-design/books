import type {Metadata} from "next";
import {MonthlySupportOwner} from "@/components/monthly-support-owner";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Monthly support · Owner | Holistic House",
  robots:{index:false,follow:false,nocache:true}};
export default function PersonalSupportAdminPage(){return <MonthlySupportOwner/>}
