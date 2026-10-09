// Only publish a video as a guided practice after its exact title, language,
// creator/channel and YouTube ID have been independently checked.
// The owner supplied two source recordings on 2026-10-09:
// Tantra Reiki Practice (w2BN-HYmHUk) and Meditation - Reiki Yggdrasil Class. (80xZ7jN6o2Y).
// Titles were cross-checked against original YouTube page metadata; Flight to the Sun remains unverified.
export type EnglishGuidedMeditation = {
  key: "flight-to-sun" | "tantra-reiki" | "reiki-yggdrasil";
  title: string;
  description: string;
  image: string;
  courseHref: string;
  youtubeId: string | null;
};
export const englishGuidedMeditations: readonly EnglishGuidedMeditation[] = [
  {
    key: "flight-to-sun",
    title: "Flight to the Sun",
    description: "An introductory shamanic flight: a guided visualisation exploring attention, imagination and the image of the sun.",
    image: "/academy/reiki-yggdrasil/source/toltec-tradition.jpg",
    courseHref: "/en/academy/reiki",
    youtubeId: null,
  },
  {
    key: "tantra-reiki",
    title: "Tantra Reiki Practice",
    description: "Watch Andrey’s original Tantra Reiki practice and explore this approach through firsthand guidance.",
    image: "/library/maya-mysteries/media/post-217-1.jpg",
    courseHref: "/en/academy/reiki/tantra-reiki",
    youtubeId: "w2BN-HYmHUk",
  },
  {
    key: "reiki-yggdrasil",
    title: "Reiki Yggdrasil Meditation",
    description: "Watch the original Meditation - Reiki Yggdrasil Class recording shared by Andrey, a guided introduction to Reiki Yggdrasil practice.",
    image: "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
    courseHref: "/en/academy/reiki/yggdrasil",
    youtubeId: "80xZ7jN6o2Y",
  },
];
