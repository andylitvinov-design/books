import type {GiftVisualGroup,GiftOccasion,GiftAspect,GiftScene} from "./video-gift-clip-catalog.mjs";
export declare const GIFT_LIVE_SEGMENT_SECONDS:5;
export declare const GIFT_LIVE_STOCK_COUNT:4;
export declare const GIFT_LIVE_TOTAL_SECONDS:25;
export declare function giftLiveSegmentAt(second:number):number;
export declare function planGiftLiveSequence(args?:{
  sceneId?:string|null;group?:GiftVisualGroup|"all";occasion?:GiftOccasion;
  aspect?:GiftAspect;
}):ReadonlyArray<Readonly<GiftScene&{from:number;to:number}>>;
