import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createServiceReviewRepository } from "@/lib/practitioners/reviews";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import type { EnergySupportMaster } from "@/components/remote-energy-support-booking";

// Single published-only source for the standalone wizard and the in-page wizard.
// No personal profile fields beyond those already public on the master's page.
export async function listRemoteEnergySupportMasters(locale: "en" | "ru" | "es"): Promise<EnergySupportMaster[]> {
  const config = getAppConfig();
  const records: PublicPractitioner[] = await createPractitionerRepository(config).listPublicPractitioners(locale);
  const masters: EnergySupportMaster[] = records.flatMap((record) =>
    record.services
      .filter((service) => service.slug === "remote-energy-support" && service.areaKey === "energy_spiritual" &&
        service.status === "published" && service.active &&
        ["online", "hybrid"].includes(service.deliveryFormat) &&
        ["fixed", "from"].includes(service.pricingMode))
      .map((service) => ({
        slug: record.slug,
        name: record.profile.displayName || record.profile.name || service.practitionerName,
        title: record.profile.professionalTitle || "",
        photo: record.profile.photoPath || "",
        serviceId: service.id,
        methods: service.methods?.length ? service.methods : ["Remote support"],
        bio: record.profile.shortBio || "",
        description: service.copy?.shortDescription || service.copy?.description || "",
        languages: service.languages || [],
        currency: service.currency || "",
        reviewCount: 0,
        reviewAverage: 0,
        priceOptions: service.priceOptions?.length
          ? service.priceOptions
          : ([10, 20, 30, 60].includes(service.durationMinutes || 0) &&
             service.confirmedPrice != null && service.pricingMode !== "contact" && service.pricingMode !== "free"
              ? [{ duration: service.durationMinutes as 10 | 20 | 30 | 60, price: service.confirmedPrice }] : []),
      }))
  );
  return Promise.all(masters.map(async (master) => {
    try {
      const { summary } = await createServiceReviewRepository(config).listPublic(master.serviceId);
      return { ...master, reviewCount: summary.count, reviewAverage: summary.average };
    } catch {
      return master;
    }
  }));
}
