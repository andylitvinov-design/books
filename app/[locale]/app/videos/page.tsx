import {notFound} from "next/navigation";
import {MandalaMyAiVideos} from "@/components/mandala-my-ai-videos";
export const dynamic="force-dynamic";
export const revalidate=0;
export const metadata={
  title:"My AI Videos — Holistic House",
  robots:{index:false,follow:false},
};
export default async function MyAiVideosPage({
  params,
}:{
  params:Promise<{locale:string}>;
}){
  const {locale}=await params;
  if(!["ru","en","es"].includes(locale))notFound();
  return <MandalaMyAiVideos locale={locale as "ru"|"en"|"es"}/>;
}
