import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicSiteHeader } from "@/components/public-site-header";
import { isPublicLocale } from "@/data/academy/catalog";
import { metadataBaseFor } from "@/data/site-metadata";
import { getAppConfig } from "@/lib/app/config";
import { createPractitionerRepository } from "@/lib/practitioners/repository";
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
    title: (locale === "ru" ? "Дистанционная энергетическая поддержка" : locale === "es" ? "Apoyo energético a distancia" : "Remote energy support") + " | Holistic House",
    description: locale === "ru"
      ? "Выберите формат, мастера и предпочтительное время дистанционной практики. Заявка подтверждается мастером."
      : locale === "es"
        ? "Elige el formato, profesional y horario preferido. El profesional confirmará la solicitud."
        : "Choose a practitioner, type of remote practice and preferred time. Requests are subject to practitioner confirmation.",
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
      .filter((service) => service.slug === "remote-energy-support" && service.areaKey === "energy_spiritual")
      .map((service) => ({
        slug: record.slug,
        name: record.profile.displayName || record.profile.name || service.practitionerName,
        title: record.profile.professionalTitle || "",
        photo: record.profile.photoPath || "",
        serviceId: service.id,
        methods: service.methods?.length ? service.methods : ["Reiki / energywork"],
      }))
  );
  return (
    <main className="services-shell services-shell--studio" lang={locale}>
      <PublicSiteHeader locale={locale}/>
      <RemoteEnergySupportBooking locale={locale as "en" | "ru" | "es"} masters={masters} preferredPractitioner={practitioner || ""}/>
    </main>
  );
}
