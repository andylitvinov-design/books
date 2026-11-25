"use client";
import { useId, useState } from "react";
import { PHONE_COUNTRIES, composeCountryPhone, phoneCountryFromValue, phoneNationalPart } from "@/lib/contact/phone-country";
import styles from "./phone-country-input.module.css";

type PhoneLocale = "en"|"ru"|"es";
type Props = {
 value:string;onChange:(value:string)=>void;locale?:PhoneLocale;id?:string;
 required?:boolean;disabled?:boolean;placeholder?:string;name?:string;
};
const captions={
 en:{country:"Country calling code",number:"Phone number"},
 ru:{country:"Код страны",number:"Номер телефона"},
 es:{country:"Prefijo del país",number:"Número de teléfono"},
};
export function PhoneCountryInput({
 value,onChange,locale="en",id,required=false,disabled=false,
 placeholder="416 555 1234",name,
}:Props){
 const generatedId=useId(),inputId=id||generatedId;
 const [country,setCountry]=useState(()=>phoneCountryFromValue(value));
 const current=PHONE_COUNTRIES.find(item=>item.iso===country)||PHONE_COUNTRIES[0];
 const words=captions[locale]||captions.en;
 return <div className={styles.wrap} data-phone-country-input>
  <select aria-label={words.country} value={country} disabled={disabled} onChange={event=>{
   const next=event.target.value,chosen=PHONE_COUNTRIES.find(item=>item.iso===next);
   const national=phoneNationalPart(value,current.dial);
   setCountry(next);
   onChange(chosen?.dial?composeCountryPhone(chosen.dial,national):"");
  }}>
   {PHONE_COUNTRIES.map(item=><option key={item.iso} value={item.iso}>
    {item.flag} {item.dial||"+"} · {item.names[locale]||item.names.en}
   </option>)}
  </select>
  <input id={inputId} name={name} type="tel" inputMode="tel" autoComplete="tel-national"
   aria-label={words.number} disabled={disabled} required={required} maxLength={24}
   placeholder={country==="OTHER"?"+44 20 1234 5678":placeholder}
   value={phoneNationalPart(value,current.dial)} onChange={event=>{
    const next=composeCountryPhone(current.dial,event.target.value);
    if(event.target.value.trim().startsWith("+"))setCountry(phoneCountryFromValue(next));
    onChange(next);
   }}/>
 </div>;
}
