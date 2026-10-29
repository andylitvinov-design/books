/**
 * New Holistic House first-party film scenes, built once from licensed,
 * individually curated vertical HD video (not screenshots, CSS or Canvas
 * imitations). Each scene is layered/graded/branded; raw stock isn't served.
 *
 * Source licence: https://supareels.com/stock-footage-licence
 * Client photographs NEVER travel to these video CDNs or stock providers.
 */
import type { VideoTheme, LocalSceneId } from "./holistic-video-themes";
export type V2Theme = "money" | "energy" | "life" | "health";
export type FilmSource = {
  src: string;
  poster: string;
  seconds: number;
  mediaType: "video/mp4";
  quality: "Full HD";
  width: 1080;
  height: 1920;
};
export const V2_ROOT = "/videos/holistic-house/film-collection-v2/";

function film(id: string): FilmSource {
  return {
    src: V2_ROOT + id + ".mp4",
    poster: V2_ROOT + id + ".jpg",
    seconds: 5,
    mediaType: "video/mp4",
    quality: "Full HD",
    width: 1080,
    height: 1920,
  };
}
export const newMoneyFilms = {
  "wealth-sunrise": film("wealth-sunrise"),
  "golden-harvest": film("golden-harvest"),
  "radiant-portal": film("radiant-portal"),
  "prosperity-coast": film("prosperity-coast"),
} as const;

export const themedRealFilms = {
  energy: {
    "solar-surge": film("solar-surge"),
    "ocean-pulse": film("ocean-pulse"),
    "sunbeam-flow": film("sunbeam-flow"),
    "river-power": film("river-power"),
    "desert-light": film("desert-light"),
    "mountain-air": film("mountain-air"),
  },
  life: {
    "wildflower-dance": film("wildflower-dance"),
    "fern-awakening": film("fern-awakening"),
    "coastal-freedom": film("coastal-freedom"),
    "lone-tree": film("lone-tree"),
    "meadow-morning": film("meadow-morning"),
  },
  health: {
    "calm-sea": film("calm-sea"),
    "morning-dew": film("morning-dew"),
    "mossy-stream": film("mossy-stream"),
    "gentle-falls": film("gentle-falls"),
    "sea-breeze": film("sea-breeze"),
  },
} as const;

export const allV2FilmIds = [
  ...Object.keys(newMoneyFilms),
  ...Object.values(themedRealFilms).flatMap(group => Object.keys(group)),
] as const;

export function getThemedRealFilm(
  theme: VideoTheme,
  scene: LocalSceneId,
): FilmSource | null {
  if (theme !== "energy" && theme !== "life" && theme !== "health") return null;
  const group = themedRealFilms[theme] as Record<string, FilmSource>;
  return group[scene] || null;
}
