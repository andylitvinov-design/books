import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
import { createServiceReviewRepository } from "@/lib/practitioners/reviews";
import type { PublicPractitioner } from "@/lib/practitioners/public-types";
import { RemoteEnergySupportBooking, type EnergySupportMaster } from "@/components/remote-energy-support-booking";

type PageProps = {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ practitioner?: string }>;
};
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isPublicLocale(locale)) return { title: "Not found" };
  return {
    metadataBase: metadataBaseFor(),
    title: (locale === "ru" ? "Энергетическая поддержка цели" : locale === "es" ? "Apoyo energético para tu objetivo" : "Energy support for your goal") + " | Holistic House",
    description: locale === "ru"
      ? "Сначала опишите запрос, затем выберите специалиста Рейки, узнайте стоимость и отправьте заявку на удобное время."
      : locale === "es"
        ? "Describe tu intención, consulta profesionales Reiki con precios publicados y solicita un horario."
        : "Describe the support you need, browse real Reiki practitioners and published prices, then request a preferred time.",
    alternates: {
      canonical: `/${locale}/services/remote-energy-support`,
      languages: {
        en: "/en/services/remote-energy-support",
        ru: "/ru/services/remote-energy-support",
        es: "/es/services/remote-energy-support",
      },
    },
  };
}

export default async function RemoteEnergySupportPage({ params, searchParams }: PageProps) {
  const { locale } = await params;
  if (!isPublicLocale(locale)) notFound();
  const { practitioner } = await searchParams;
  let records: PublicPractitioner[] = [];
  try {
    records = await createPractitionerRepository(getAppConfig()).listPublicPractitioners(locale);
  } catch {
    // Only actual published, eligible service offerings can accept a booking request.
  }
  const masters: EnergySupportMaster[] = records.flatMap((record) =>
    record.services
      .filter((service) => service.slug === "remote-energy-support" && service.areaKey === "energy_spiritual" && service.status === "published")
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
  const withReviews = await Promise.all(masters.map(async (master) => {
    try {
      const {summary} = await createServiceReviewRepository(getAppConfig()).listPublic(master.serviceId);
      return {...master,reviewCount:summary.count,reviewAverage:summary.average};
    } catch { return master; }
  }));
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale}/>
      <RemoteEnergySupportBooking locale={locale as "en" | "ru" | "es"} masters={withReviews} preferredPractitioner={practitioner || ""}/>
    </main>
  );
}
