import Link from "next/link";
import { HomeProgramEntry } from "@/components/home-program-entry";
import type { PublicLocale } from "@/lib/public-locales";

export function HolisticHouseHome({locale="en"}:{locale?:PublicLocale}) {
 return <main className="house-home house-home--services" lang={locale} data-home-design="program-discovery-v2">
  <HomeProgramEntry locale={locale} />
  <footer className="service-home-footer"><p className="service-home-footer__legal"><Link href="/privacy" prefetch={false}>Privacy</Link><span aria-hidden="true"> · </span><Link href="/terms" prefetch={false}>Terms</Link></p></footer>
 </main>;
}
