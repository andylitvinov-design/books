import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createServiceReviewRepository } from "@/lib/practitioners/reviews";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import { getPublicServiceDetailHref } from "@/lib/practitioners/public-service-links.js";
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

/** Other approved 1:1/intro/assessment offers, never copied from the energy-only catalog.
 * Discovery is read-only: the service page or secure Cabinet owns enquiry/booking.
 */
export type PublicConsultationOffer = {
  serviceId: string;
  title: string;
  practitionerName: string;
  description: string;
  areaKey: string;
  pricingMode: string;
  price: number | null;
  currency: string;
  href: string;
};

export async function listPublishedConsultationOffers(locale: "en" | "ru" | "es"): Promise<PublicConsultationOffer[]> {
  const config = getAppConfig();
  const records: PublicPractitioner[] = await createPractitionerRepository(config).listPublicPractitioners(locale);
  return records.flatMap(practitioner =>
    practitioner.services
      .filter(service => service.status === "published" && service.active &&
        ["session", "assessment", "intro"].includes(service.offeringType) &&
        service.slug !== "remote-energy-support" && Boolean(service.copy?.title))
      .map(service => {
        const validOptions = (service.priceOptions || [])
          .filter(option => Number.isFinite(option.price) && option.price >= 0);
        const free = service.pricingMode === "free" ||
          (service.pricingMode !== "contact" && service.confirmedPrice === 0);
        const confirmed = service.pricingMode !== "contact" &&
          typeof service.confirmedPrice === "number" && Number.isFinite(service.confirmedPrice) &&
          service.confirmedPrice >= 0 ? service.confirmedPrice : null;
        const price = free ? 0 : confirmed ??
          (service.pricingMode !== "contact" && validOptions.length
            ? Math.min(...validOptions.map(option => option.price)) : null);
        return {
          serviceId: service.id,
          title: service.copy.title,
          practitionerName: practitioner.profile.displayName || practitioner.profile.name || service.practitionerName,
          description: service.copy.shortDescription || "",
          areaKey: service.areaKey,
          pricingMode: service.pricingMode,
          price,
          currency: service.currency || "",
          href: getPublicServiceDetailHref(locale, practitioner.slug, service.slug),
        };
      })
  );
}
