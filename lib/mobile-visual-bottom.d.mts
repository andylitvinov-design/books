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

export interface VisualKeyboardInput {
  editing?: boolean;
  layoutHeight?: number;
  visualHeight?: number;
  visualOffsetTop?: number;
  lastUnfocusedVisualHeight?: number;
}
export declare function visualKeyboardOpen(input?: VisualKeyboardInput): boolean;
