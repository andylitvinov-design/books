import { HomepageFreeCapture } from "@/components/homepage-free-capture";
import type { Locale } from "@/data/remedies";

/** Three free entry points live only in the existing blue capture at the foot of Home.
 * Paid consultation selectors on other pages use the unchanged shared component.
 */
export function HomepageContactCta({ locale }: { locale: Locale }) {
  return (
    <div id="home-consultation" className="home-contact-choice" data-home-contact-capture lang={locale}>
      <HomepageFreeCapture locale={locale} />
    </div>
  );
}
