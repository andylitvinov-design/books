/** TypeScript contract for the same local, no-network text-source selector. */
export const SINGLE_VIDEO_TEXT_TRACK_VERSION: string;
export type SingleVideoTextSource = "affirmations" | "stage" | "caption" | "none";
export interface SingleVideoTextTrackInput {
  affirmationsEnabled?: boolean;
  affirmationLines?: readonly string[];
  affirmationVisibility?: readonly string[];
  timelineCaptions?: readonly { text?: string | null }[] | null;
  storyboardCaptions?: readonly string[];
  captionMode?: string;
  caption?: string;
  wish?: string;
  approvedNarration?: boolean;
}
export function pickSingleVideoTextSource(input?: SingleVideoTextTrackInput): SingleVideoTextSource;
