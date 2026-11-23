import type {CompiledVideoPlanV3} from "./video-project-v3.mjs";

export function paintVideoProjectV3Frame(
  ctx: CanvasRenderingContext2D,
  plan: CompiledVideoPlanV3,
  projectMs: number,
  sourceAt: (assetId: string, sourceMs: number, clipId: string) => {
    image: CanvasImageSource;
    width: number;
    height: number;
  } | null,
): boolean;
