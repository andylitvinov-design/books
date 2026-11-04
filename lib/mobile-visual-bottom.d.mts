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
