import {HomeDialogFirst} from "@/components/home-dialog-first";
import type {Locale} from "@/data/remedies";

// Lightweight, server-rendered first paint. All seven existing bottom-dock
// destinations are mounted by RootLayout, never by this marketing entry.
// Catalogues, media editor and personal Cabinet load only on intentional entry.
export function HolisticHouseHome({locale="en"}:{locale?:Locale}){
  return <HomeDialogFirst locale={locale}/>;
}
