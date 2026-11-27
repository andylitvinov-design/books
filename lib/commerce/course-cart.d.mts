export type PaidCourseOffer = {id:string; title:string; amountMinor:number; currency:'EUR'}
export const COURSE_CART_STORAGE_KEY:string
export const COURSE_CHECKOUT_NOTICE:string
export const APPROVED_COURSE_SALES:ReadonlyArray<unknown>
export function courseOffer(id:unknown,locale?:string):PaidCourseOffer|null
export function coachCourseOffer(id:unknown,locale?:string):PaidCourseOffer|null
export function restoreCourseCart(value:string|null):string[]
export function quoteCourseCart(ids:string[],locale?:string):{items:PaidCourseOffer[];currency:'EUR';totalMinor:number}
export function courseCartPath(locale:string,ids:string[]):string
export function courseCheckoutEnabled(env?:Record<string,string|undefined>):boolean
