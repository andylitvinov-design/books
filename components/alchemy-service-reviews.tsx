import { ServiceReviews } from "@/components/service-reviews";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import styles from "@/components/alchemy-soul-landing.module.css";

/** Reuse the one approved homeopathy service ID on both dynamic EN/RU and static ES routes. */
export async function AlchemyServiceReviews({locale}: {locale:"en"|"ru"|"es"}) {
  let serviceId: string | null = null;
  try {
    // The legacy listing has EN/RU catalogue snapshots; ES uses its approved EN ID.
    const service = await createPractitionerRepository(getAppConfig())
      .getPublicService("andy-litvinov", "homeopathy-consultation", locale === "es" ? "en" : locale);
    serviceId = service?.service?.id || null;
  } catch {
    // An unavailable catalogue must not break the standalone public Alchemy page.
    return null;
  }
  if (!serviceId) return null;
  return (
    <div className={styles.serviceReviewWrap}>
      <ServiceReviews serviceId={serviceId} locale={locale} sectionId="service-reviews" />
    </div>
  );
}
