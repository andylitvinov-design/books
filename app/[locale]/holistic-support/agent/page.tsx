import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { HolisticAgentChat } from "@/components/holistic-agent-chat";
import { isPublicLocale } from "@/data/academy/catalog";

type Props={params:Promise<{locale:string}>};
export const dynamic="force-dynamic";
export const revalidate=0;
/** Preview-only. Never expose without explicit release gate and auth acceptance. */
export default async function HolisticAgentPreviewPage({params}:Props) {
  const {locale}=await params;
  if(!isPublicLocale(locale) || process.env.HH_AGENT_CHAT_UI_ENABLED!=="true" ||
    (process.env.VERCEL_ENV==="production" && process.env.HH_AGENT_PRODUCTION_APPROVED!=="true"))notFound();
  return <><PublicSiteHeader locale={locale}/>
    <main style={{minHeight:"calc(100vh - 160px)",padding:"10px 0 44px"}}>
      <HolisticAgentChat locale={locale}/>
    </main></>;
}
