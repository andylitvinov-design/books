import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createServiceReviewRepository } from "@/lib/practitioners/reviews";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import { getPublicServiceDetailHref } from "@/lib/practitioners/public-service-links.js";
import type { EnergySupportMaster } from "@/components/remote-energy-support-booking";

/** Allow only intentionally public external presentation providers. Never expose uploaded private assets. */
function isPublicPresentationUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ["youtube.com", "www.youtube.com", "www.youtube-nocookie.com", "youtu.be",
        "vimeo.com", "player.vimeo.com", "soundcloud.com", "www.soundcloud.com"].includes(url.hostname);
  } catch { return false; }
}

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
        presentations: [
          ...(service.serviceIntroductions || [])
            .filter(intro => intro.language === locale && intro.media.kind === "external" &&
              isPublicPresentationUrl(intro.media.url))
            .map(intro => ({ type: intro.type, url: (intro.media as {kind:"external";url:string}).url })),
          ...(record.profile.videoPresentation?.kind === "external" &&
            isPublicPresentationUrl(record.profile.videoPresentation.url)
              ? [{ type: "video" as const, url: record.profile.videoPresentation.url }] : []),
        ],
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

/** Master-authored Reiki services share the existing moderated service records.
 * The legacy remote-support booking remains intact for older published offers.
 * No draft, paused service, credentials claim or unapproved price is leaked.
 */
export async function listReikiSupportMasters(locale: "en" | "ru" | "es"): Promise<EnergySupportMaster[]> {
  const [legacy, records]: [EnergySupportMaster[], PublicPractitioner[]] = await Promise.all([
    listRemoteEnergySupportMasters(locale),
    createPractitionerRepository(getAppConfig()).listPublicPractitioners(locale),
  ]);
  const masterOffers: EnergySupportMaster[] = records.flatMap(record =>
    record.services
      .filter(service => service.status === "published" && service.active &&
        service.areaKey === "energy_spiritual" && ["online", "hybrid"].includes(service.deliveryFormat) &&
        Boolean(service.reikiOffer?.variants.length))
      .map(service => ({
        slug: record.slug,
        name: record.profile.displayName || record.profile.name || service.practitionerName,
        title: record.profile.professionalTitle || "",
        photo: record.profile.photoPath || "",
        serviceId: service.id,
        serviceHref: getPublicServiceDetailHref(locale, record.slug, service.slug),
        methods: service.methods || [],
        bio: record.profile.shortBio || "",
        description: service.copy?.shortDescription || "",
        languages: service.languages || [],
        currency: service.reikiOffer!.currency,
        reikiOffer: service.reikiOffer,
        reviewCount: 0, reviewAverage: 0,
        // The structured Reiki variants, not legacy duration-only options,
        // control the price, report and certificate matched by the filter.
        priceOptions: [],
        presentations: (service.serviceIntroductions || [])
          .filter(intro => intro.language === locale && intro.media.kind === "external" &&
            isPublicPresentationUrl(intro.media.url))
          .map(intro => ({ type: intro.type, url: (intro.media as {kind:"external";url:string}).url })),
      }))
  );
  return [...masterOffers, ...legacy];
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
  deliveryFormat: string;
  photos: string[];
  presentations: { type: "audio" | "video"; url: string }[];
};

// Display only media explicitly marked public, without exposing private storage paths.
function publicConsultationPhoto(path: string): string {
  return /^\/(?:images\/|api\/public\/)[a-zA-Z0-9_/%.-]+$/.test(path) ? path : "";
}

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
          deliveryFormat: service.deliveryFormat,
          photos: [...new Set([service.imagePath, ...(service.photos || [])]
            .map(publicConsultationPhoto).filter(Boolean))].slice(0, 5),
          presentations: (service.serviceIntroductions || [])
            .filter(intro => intro.language === locale && intro.media.kind === "external" &&
              isPublicPresentationUrl(intro.media.url))
            .map(intro => ({ type: intro.type, url: (intro.media as { kind: "external"; url: string }).url })),

        };
      })
  );
}
