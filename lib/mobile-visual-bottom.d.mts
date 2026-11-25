export interface MobileVisualBottomGapInput {
  layoutHeight?: number;
  visualHeight?: number;
  visualOffsetTop?: number;
}
export declare function mobileVisualBottomGap(input?: MobileVisualBottomGapInput): number;

export interface VisualDockBottomCorrectionInput {
  dockBottom?: number;
  visualBottom?: number;
  currentInset?: number;
}
export declare function visualDockBottomCorrection(input?: VisualDockBottomCorrectionInput): number;

/** Signed, clamped correction toward the visible Safari viewport edge. */
export interface VisualDockBottomOffsetInput {
  dockBottom?: number;
  visualBottom?: number;
  currentOffset?: number;
}
export declare function visualDockBottomOffset(input?: VisualDockBottomOffsetInput): number;

export interface VisualKeyboardInput {
  editing?: boolean;
  layoutHeight?: number;
  visualHeight?: number;
  visualOffsetTop?: number;
  lastUnfocusedVisualHeight?: number;
}
export declare function visualKeyboardOpen(input?: VisualKeyboardInput): boolean;
