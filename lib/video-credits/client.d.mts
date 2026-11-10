export interface VideoCreditCatalog{
  chargeRequired:boolean
  ready:boolean
  blocked:boolean
  priceCredits:number
  starterGrant:number
  monthlyGrant:number
}
export interface VideoCreditState{
  balanceCredits:number
  starterCredits:number
  monthlyCredits:number
}
export interface VideoCreditChargeResult{
  operationId?:string
  status:string
  priceCredits?:number
  balance?:VideoCreditState
}
export declare function fetchVideoCreditCatalog():Promise<VideoCreditCatalog>
export declare function fetchVideoCreditStatus():Promise<VideoCreditState>
export declare function postVideoCreditAction(
  action:'hold'|'complete'|'release',body:Record<string,unknown>
):Promise<VideoCreditChargeResult>
export declare function releaseVideoCreditOnExit(operationId:string):void
