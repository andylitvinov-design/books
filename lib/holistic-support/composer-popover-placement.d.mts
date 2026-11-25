export interface ComposerPopoverAnchor { left: number; top: number; bottom: number }
export interface ComposerPopoverViewport { width: number; height: number; offsetLeft?: number; offsetTop?: number }
export interface ComposerPopoverPlacement { left: number; top: number; width: number; maxHeight: number }
export declare function positionComposerPopover(options: {
  anchor: ComposerPopoverAnchor;
  viewport: ComposerPopoverViewport;
  contentHeight?: number;
  maxWidth?: number;
  margin?: number;
  gap?: number;
}): ComposerPopoverPlacement;
