// Only publish a video as a guided practice after its exact title, language,
// creator/channel and YouTube ID have been independently checked.
// The original English meditation IDs remain unverified; null is deliberate.
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
    title: "Tantra Reiki Meditation",
    description: "An introduction to the Tantra Reiki practice through awareness of the body, presence and gentle attention to sensation.",
    image: "/library/maya-mysteries/media/post-217-1.jpg",
    courseHref: "/en/academy/reiki/tantra-reiki",
    youtubeId: null,
  },
  {
    key: "reiki-yggdrasil",
    title: "Reiki Yggdrasil Meditation",
    description: "An introductory practice related to the Reiki Yggdrasil learning path and its symbolic work with attention and imagery.",
    image: "/academy/reiki-yggdrasil/source/advanced-shamanic-therapy.png",
    courseHref: "/en/academy/reiki/yggdrasil",
    youtubeId: null,
  },
];
