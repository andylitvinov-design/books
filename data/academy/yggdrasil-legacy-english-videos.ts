export type YggdrasilLegacyVideo = {
  youtubeId: string;
  title: string;
  language: "en";
  sourcePage: string;
  kind: "overview" | "testimonial" | "attunement";
  stepId?: string;
};

export const yggdrasilLegacyEnglishVideoSource = "https://psitrends.com/studies/master-taory";

export const yggdrasilEnglishOverviewVideos: YggdrasilLegacyVideo[] = [
  {
    youtubeId: "XvMdX5czoOc",
    title: "What really is Reiki Yggdrasil",
    language: "en",
    sourcePage: yggdrasilLegacyEnglishVideoSource,
    kind: "overview",
  },
  {
    youtubeId: "hjmVJrgEsZ8",
    title: "Why I prefer Reiki Yggdrasil to other modalities",
    language: "en",
    sourcePage: yggdrasilLegacyEnglishVideoSource,
    kind: "overview",
  },
  {
    youtubeId: "u275Zz78vhs",
    title: "Why is it called Reiki",
    language: "en",
    sourcePage: yggdrasilLegacyEnglishVideoSource,
    kind: "overview",
  },
  {
    youtubeId: "wN_SNwZ1Epo",
    title: "Reiki Yggdrasil course testimonial",
    language: "en",
    sourcePage: yggdrasilLegacyEnglishVideoSource,
    kind: "testimonial",
  },
  {
    youtubeId: "3Apc8P1Yudc",
    title: "Reiki Yggdrasil course testimonial 2",
    language: "en",
    sourcePage: yggdrasilLegacyEnglishVideoSource,
    kind: "testimonial",
  },
  {
    youtubeId: "Hk9XpeUI0BQ",
    title: "About some of my favorite attunements",
    language: "en",
    sourcePage: yggdrasilLegacyEnglishVideoSource,
    kind: "attunement",
  },
];

export const yggdrasilEnglishStepVideos: Record<string, YggdrasilLegacyVideo[]> = {
  "RY-L01-S01": [
    {
      youtubeId: "p29qu8-dtZk",
      title: "About the Healing attunement",
      language: "en",
      sourcePage: yggdrasilLegacyEnglishVideoSource,
      kind: "attunement",
      stepId: "RY-L01-S01",
    },
  ],
  "RY-L02-S01": [
    {
      youtubeId: "0G_xvbuClII",
      title: "Healing using Reiki Yggdrasil attunements",
      language: "en",
      sourcePage: yggdrasilLegacyEnglishVideoSource,
      kind: "attunement",
      stepId: "RY-L02-S01",
    },
  ],
  "RY-L02-S02": [
    {
      youtubeId: "3msoUyWr6bY",
      title: "Attunements to increase energy flow in business",
      language: "en",
      sourcePage: yggdrasilLegacyEnglishVideoSource,
      kind: "attunement",
      stepId: "RY-L02-S02",
    },
  ],
  "RY-L02-S03": [
    {
      youtubeId: "Nx8DwWk27VY",
      title: "Attunements for relationship healing",
      language: "en",
      sourcePage: yggdrasilLegacyEnglishVideoSource,
      kind: "attunement",
      stepId: "RY-L02-S03",
    },
  ],
};
