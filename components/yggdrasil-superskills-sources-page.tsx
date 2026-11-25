import { redirect } from "next/navigation";
import type { PublicLocale } from "@/lib/public-locales";

// Old bookmarks resolve to the one canonical first-party course map.
// The audited external-source URLs remain in internal curriculum provenance,
// not a second public programme competing with the current seven modules.
export function YggdrasilSuperSkillsSourcesPage({ locale }: { locale: PublicLocale }) {
  return redirect("/" + locale + "/academy/reiki/yggdrasil#system-modules") as never;
}
