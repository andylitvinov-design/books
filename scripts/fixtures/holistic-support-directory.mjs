// Synthetic *browser-test-only* response, never imported by the application.
// The live gallery always fetches the existing published-only public API.
// No client records, provider messages or payment operations are present.
export function qaSupportDirectoryResponse(locale, kind) {
  if (kind === "consultation") return {
    consultations: [
      { serviceId: "qa-intro", title: locale === "ru" ? "Пробная консультация" : "Intro consultation",
        practitionerName: "QA Master One", description: "Public synthetic fixture",
        areaKey: "coaching", pricingMode: "free", price: 0, currency: "EUR",
        href: "/" + locale + "/services",
        photos: ["/images/holistic-house/distance-homeopathy.webp", "/images/holistic-house/homeopathy-still-life.svg"],
        presentations: [], deliveryFormat: "online" },
      { serviceId: "qa-session", title: locale === "ru" ? "Личная сессия" : "Personal session",
        practitionerName: "QA Master Two", description: "Public synthetic fixture",
        areaKey: "consultation", pricingMode: "fixed", price: 50, currency: "EUR",
        href: "/" + locale + "/services",
        photos: ["/images/holistic-house/books-library.webp", "/images/holistic-house/hero-olive-incense.webp"],
        presentations: [], deliveryFormat: "hybrid" },
    ],
  };
  const base = {
    photo: "", title: "QA published practitioner", bio: "Synthetic public test biography",
    description: "Synthetic practice listing, never used for a real booking",
    methods: ["Tantra Reiki", "Reiki Yggdrasil"], languages: ["en", "ru"],
    currency: "EUR", reviewCount: 0, reviewAverage: 0,
  };
  return { masters: [
    { ...base, serviceId: "qa-energy-one", slug: "qa-master-one",
      name: "QA Master One", priceOptions: [{ duration: 30, price: 50 }] },
    { ...base, serviceId: "qa-energy-two", slug: "qa-master-two",
      name: "QA Master Two", priceOptions: [{ duration: 60, price: 100 }] },
  ] };
}
