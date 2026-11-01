import {notFound} from "next/navigation";
import type {Metadata} from "next";
import {MonthlySupportClient} from "@/components/monthly-support-client";
export const metadata:Metadata={title:"My personal support | Holistic House",
  robots:{index:false,follow:false,nocache:true}};
export default async function PersonalSupportPrivatePage({params}:{params:Promise<{locale:string}>}){
  const {locale}=await params;
  if(locale!=="en"&&locale!=="ru"&&locale!=="es")notFound();
  return <MonthlySupportClient locale={locale}/>;
}
