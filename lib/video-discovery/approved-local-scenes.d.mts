export interface ApprovedLocalFilmScene {
  id: string;
  kind: "video";
  title: string;
  description: string;
  image: string;
  videoSrc: string;
  sourceGroup: "approved-local-film-scenes";
  sourceLabel: string;
  mediaAttribution: string;
  mediaAttributionUrl: "https://creativecommons.org/licenses/by/4.0/";
  mediaLicense: "CC BY 4.0";
  mediaRightsApproved: true;
  localMediaVerified: true;
  mediaBytes: number;
  mediaSha256: string;
  sourceApproved: true;
  curation: "verified";
  durationVerifiedSeconds: 5;
  lifeAreas: string[];
  topicTags: string[];
  tags: string[];
}
export function isApprovedLocalFilmScene(scene: unknown): boolean;
export function listApprovedLocalFilmScenes(locale?: string): ApprovedLocalFilmScene[];
