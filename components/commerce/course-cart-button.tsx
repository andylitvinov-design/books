'use client'
import {ArrowRight,ShoppingCart} from 'lucide-react'
import {useCourseCart} from './use-course-cart'
import {courseCartPath,courseOffer} from '@/lib/commerce/course-cart.mjs'
import type {ServiceLocale} from '@/lib/commerce/catalog'

const labels={en:['Add to cart','Pay'],ru:['В корзину','Оплатить'],es:['Añadir al carrito','Pagar']} as const
export function CourseCartButton({sku,locale,className}:{sku:string;locale:ServiceLocale;className?:string}){
  const {ids,ready,change}=useCourseCart()
  const offer=courseOffer(sku,locale)
  if(!offer)return null
  const added=ids.includes(sku)
  return <button type="button" className={className} disabled={!ready}
    data-paid-course-cta={sku} data-added={added}
    onClick={()=>{if(added)window.location.assign(courseCartPath(locale,ids));else change(sku,true)}}>
    {added?<ArrowRight size={18} aria-hidden="true"/>:<ShoppingCart size={18} aria-hidden="true"/>}
    {labels[locale][added?1:0]}
  </button>
}
