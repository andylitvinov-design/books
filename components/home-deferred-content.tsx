"use client";
import { lazy, Suspense, useState } from "react";
import { MySpaceTopics } from "./my-space-topics";
import type { PublicLocale } from "@/lib/public-locales";

// Only import the long-form catalogue when the reader opens its disclosure;
// no first-screen CSS or JS dependency on its carousels and cards.
const HomeExpandedCatalog = lazy(
  () => import("./home-expanded-catalog").then(mod => ({ default: mod.HomeExpandedCatalog }))
);
const COPY={
 en:{more:"More ways to explore Holistic House",detail:"Courses, guidance, free starts and resources"},
 ru:{more:"Другие возможности Holistic House",detail:"Курсы, поддержка и дополнительные разделы"},
 es:{more:"Otras posibilidades de Holistic House",detail:"Cursos, orientación y recursos"},
} as const;
export function HomeDeferredContent({locale}:{locale:PublicLocale}){
  const [expanded,setExpanded]=useState(false);
  const t=COPY[locale];
  return <div data-home-deferred-content style={{display:"grid",gap:15,margin:"16px auto"}}>
    <MySpaceTopics locale={locale} publicHome/>
    <details data-home-discover-more onToggle={event=>setExpanded(event.currentTarget.open)}
      style={{border:"1px solid #e0e9e0",background:"#fffdf7",padding:"14px",borderRadius:18}}>
      <summary style={{cursor:"pointer",fontWeight:750,color:"#155344",minHeight:44}}>
        {t.more}
        <small style={{display:"block",fontWeight:450,color:"#6e7c70",padding:"5px 0"}}>{t.detail}</small>
      </summary>
      {expanded?<Suspense fallback={null}><HomeExpandedCatalog locale={locale}/></Suspense>:null}
    </details>
  </div>;
}
