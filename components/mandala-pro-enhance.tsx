"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
import {createVideoCartSelection,VIDEO_CART_STORAGE_KEY,SERVICE_CART_UPDATED_EVENT} from "@/lib/commerce/cart";
import type {ReactNode} from "react";
import {ArrowRight, Camera, Check, ChevronDown, Clapperboard, Film, Sparkles, UsersRound} from "lucide-react";
import type {StoryAddonKind} from "@/lib/mandala/story-addon-catalog";
import styles from "./mandala-pro-enhance.module.css";

type Locale="en"|"ru"|"es";
type Tier="standard"|"extra"|"pro";
const tiers=["standard","extra","pro"] as const;
const copy={
 ru:{
  title:"Видеоредактор PRO",tabs:{standard:"Стандарт",extra:"Экстра",pro:"PRO"},
  prices:{standard:"Бесплатно*",extra:"€3",pro:"€5"},
  standardTitle:"Монтаж вашего видео",standardDesc:"Соединяйте сцены, меняйте их порядок, длительность, переходы, титры и звук. Это наш действующий редактор — без второго видеодвижка.",
  extraTitle:"Анимированное фото и персонаж",extraDesc:"Добавьте собственное фото и выберите анимированного персонажа из каталога для вашего ролика.",
  photoTitle:"Анимировать моё фото",photoDesc:"Фото используется с вашего разрешения. Предпросмотр доступен в редакторе.",
  photoButton:"Загрузить фото",photoChosen:"Фото выбрано",photoPending:"Подготовка фото…",
  characterTitle:"Анимированные персонажи",characterDesc:"Выберите подходящего персонажа из существующего каталога.",
  showCharacters:"Выбрать персонажа",hideCharacters:"Свернуть список",
  proTitle:"Ролик по вашему сценарию",proDesc:"Опишите, каким должен быть весь фильм: сцены, настроение, герои, переходы и финал.",
  wishLabel:"Ваши пожелания",wishPlaceholder:"Например: первые 5 секунд — рассвет у моря, затем встреча двух людей, мягкий свет, спокойный финал…",
  proTools:"Дополнительные режиссёрские настройки",privacy:"Текст остаётся в редакторе. Он не отправляется платному AI-сервису автоматически.",
  freeCreate:"Создать видео бесплатно",extraCreate:"Создать видео за €3",proCreate:"Создать видео за €5",
  unavailable:"В корзине можно выбрать PayPal.Me. Перевод подтверждается вручную; видео не создаётся автоматически.",
  cartAdd:"В корзину",
  creditsInfo:"* Первый ролик для гостя бесплатно; следующие могут стоить кредиты согласно балансу.",
  preview:"Посмотреть монтаж"
 },
 en:{
  title:"PRO video editor",tabs:{standard:"Standard",extra:"Extra",pro:"PRO"},
  prices:{standard:"Free*",extra:"€3",pro:"€5"},
  standardTitle:"Edit your video",standardDesc:"Combine shots, reorder and trim scenes, adjust transitions, captions and sound in our existing editor — one real export engine.",
  extraTitle:"Animated photo & character",extraDesc:"Add your own photo and choose an animated character from the existing catalog.",
  photoTitle:"Animate my photo",photoDesc:"Only use a photo you have permission to use. Preview it in the editor.",
  photoButton:"Upload photo",photoChosen:"Photo selected",photoPending:"Preparing photo…",
  characterTitle:"Animated characters",characterDesc:"Choose a character from our existing catalog.",
  showCharacters:"Choose a character",hideCharacters:"Hide characters",
  proTitle:"A video made to your brief",proDesc:"Describe your full film: scenes, mood, characters, transitions and ending.",
  wishLabel:"Your directions",wishPlaceholder:"For example: first 5 seconds — seaside sunrise, then two people meet, soft golden light and a peaceful ending…",
  proTools:"Advanced director settings",privacy:"Your brief stays in the editor. It is not automatically sent to a paid AI service.",
  freeCreate:"Create video for free",extraCreate:"Create video for €3",proCreate:"Create video for €5",
  unavailable:"PayPal.Me is available in the cart. Payments require manual verification; video rendering is not automatic.",
  cartAdd:"Add to cart",
  creditsInfo:"* The first guest video is free; additional exports may use your existing credit balance.",
  preview:"Preview montage"
 },
 es:{
  title:"Editor de vídeo PRO",tabs:{standard:"Estándar",extra:"Extra",pro:"PRO"},
  prices:{standard:"Gratis*",extra:"€3",pro:"€5"},
  standardTitle:"Edita tu vídeo",standardDesc:"Combina y ordena escenas, ajusta duración, transiciones, títulos y sonido en el editor existente.",
  extraTitle:"Foto animada y personaje",extraDesc:"Añade tu foto y elige un personaje animado del catálogo actual.",
  photoTitle:"Animar mi foto",photoDesc:"Utiliza solo fotos autorizadas. Puedes ver una vista previa.",
  photoButton:"Subir foto",photoChosen:"Foto seleccionada",photoPending:"Preparando foto…",
  characterTitle:"Personajes animados",characterDesc:"Elige un personaje del catálogo existente.",
  showCharacters:"Elegir personaje",hideCharacters:"Ocultar personajes",
  proTitle:"Un vídeo a tu medida",proDesc:"Describe todo el vídeo: escenas, emoción, personajes, transiciones y final.",
  wishLabel:"Tus indicaciones",wishPlaceholder:"Por ejemplo: primero un amanecer junto al mar, después dos personas se encuentran, luz suave y un final tranquilo…",
  proTools:"Opciones avanzadas del director",privacy:"El texto permanece en el editor. No se envía automáticamente a un proveedor de IA de pago.",
  freeCreate:"Crear vídeo gratis",extraCreate:"Crear vídeo por €3",proCreate:"Crear vídeo por €5",
  unavailable:"Puedes usar PayPal.Me desde el carrito. El pago se verifica manualmente y el vídeo no se genera automáticamente.",
  cartAdd:"Añadir al carrito",
  creditsInfo:"* El primer vídeo de invitado es gratis; los siguientes pueden usar créditos.",
  preview:"Vista previa del montaje"
 }
} as const;

type Props={
 locale:Locale;
 disabled:boolean;
 onGenerateFree:()=>void;
 onPickPhoto:()=>void;
 photoSelected:boolean;
 photoPending:boolean;
 proWish:string;
 onProWishChange:(value:string)=>void;
 freeButtonLabel?:string;
 onChooseCatalog:(kind:StoryAddonKind)=>void;
 standardEditor:ReactNode;
 proTools?:ReactNode;
 children?:ReactNode;
};

export function MandalaProEnhance({
 locale,disabled,onGenerateFree,onPickPhoto,photoSelected,photoPending,proWish,
 onProWishChange,freeButtonLabel,onChooseCatalog,standardEditor,proTools,children
}:Props){
 const router=useRouter();
 const [tier,setTier]=useState<Tier>("standard");
 const [charactersOpen,setCharactersOpen]=useState(false);
 const t=copy[locale];
 const chooseTier=(next:Tier)=>{
   setTier(next);
   if(next==="extra"){onChooseCatalog("character");setCharactersOpen(true);}
 };
 const addToCart=()=>{
   const id=tier==="extra"?"video-extra":tier==="pro"?"video-pro":null;
   if(!id||disabled)return;
   const selected=createVideoCartSelection(id,proWish);
   if(!selected)return;
   try{window.sessionStorage.setItem(VIDEO_CART_STORAGE_KEY,JSON.stringify(selected));
     window.dispatchEvent(new Event(SERVICE_CART_UPDATED_EVENT));}catch{}
   router.push("/"+locale+"/cart?video="+id);
 };
 const heading=tier==="standard"?t.standardTitle:tier==="extra"?t.extraTitle:t.proTitle;
 const description=tier==="standard"?t.standardDesc:tier==="extra"?t.extraDesc:t.proDesc;
 return <section className={styles.panel} data-video-pro-enhance data-workspace-section="pro"
   data-pro-tier={tier} aria-label={t.title}>
   <nav className={styles.tiers} role="tablist" aria-label={t.title} data-video-pro-tiers>
     {tiers.map(item=><button type="button" role="tab" key={item} id={"pro-tab-"+item}
       aria-selected={tier===item} aria-controls="pro-tier-panel"
       disabled={disabled} data-video-pro-tier={item}
       onClick={()=>chooseTier(item)}>
       <strong>{t.tabs[item]}</strong><span>{t.prices[item]}</span>
     </button>)}
   </nav>
   <section id="pro-tier-panel" role="tabpanel" aria-labelledby={"pro-tab-"+tier}
     className={styles.section} data-video-pro-tier-panel={tier}>
     <header className={styles.heading}>
       <Clapperboard size={23} aria-hidden="true"/>
       <div><h3>{heading}</h3><p>{description}</p></div>
     </header>
     {tier==="standard"?<div className={styles.editor} data-video-pro-standard-editor>
       {standardEditor}
     </div>:null}
     {tier==="extra"?<div className={styles.extra} data-video-pro-extra-options>
       <div className={styles.feature}>
         <span className={styles.featureIcon}><Camera size={24} aria-hidden="true"/></span>
         <div><strong>{t.photoTitle}</strong><p>{t.photoDesc}</p>
           {photoSelected?<small className={styles.selected}><Check size={14} aria-hidden="true"/>{t.photoChosen}</small>:null}
         </div>
         <button type="button" className={styles.secondaryButton}
           disabled={disabled||photoPending} data-video-pro-upload-photo onClick={onPickPhoto}>
           {photoPending?t.photoPending:t.photoButton}
         </button>
       </div>
       <div className={styles.character}>
         <div className={styles.featureHeading}><UsersRound size={22} aria-hidden="true"/>
           <div><strong>{t.characterTitle}</strong><p>{t.characterDesc}</p></div>
         </div>
         <button type="button" className={styles.catalogToggle} data-video-pro-choose-character
           disabled={disabled} aria-expanded={charactersOpen}
           onClick={()=>{onChooseCatalog("character");setCharactersOpen(open=>!open);}}>
           {charactersOpen?t.hideCharacters:t.showCharacters}
           <ChevronDown size={17} aria-hidden="true"/>
         </button>
         {charactersOpen?<div className={styles.catalog} data-video-pro-character-catalog>{children}</div>:null}
       </div>
     </div>:null}
     {tier==="pro"?<div className={styles.proBrief} data-video-pro-custom-brief>
       <label htmlFor="video-pro-brief"><Sparkles size={18} aria-hidden="true"/>{t.wishLabel}</label>
       <textarea id="video-pro-brief" data-video-pro-brief value={proWish}
         onChange={event=>onProWishChange(event.currentTarget.value)}
         disabled={disabled} maxLength={800} rows={4} placeholder={t.wishPlaceholder}/>
       <small className={styles.wishCounter}>{proWish.length}/800</small>
       <p className={styles.privacy}>{t.privacy}</p>
       {proTools?<details className={styles.proTools} data-video-pro-director-tools>
         <summary>{t.proTools}<ChevronDown size={18} aria-hidden="true"/></summary>
         {proTools}
       </details>:null}
     </div>:null}
   </section>
   {tier==="standard"?<small className={styles.creditsNote}>{t.creditsInfo}</small>:
     <p className={styles.notice} role="status" data-video-pro-paid-unavailable>{t.unavailable}</p>}
   <div className={styles.actions} data-video-pro-actions>
     <button type="button" className={styles.createButton} data-video-pro-create={tier}
       data-video-generate-without-ai={tier==="standard"?"true":undefined}
       disabled={disabled} onClick={()=>{if(tier==="standard")onGenerateFree();else addToCart();}}>
       <Film size={20} aria-hidden="true"/>
       <span>{tier==="standard"?(freeButtonLabel||t.freeCreate):
         t.cartAdd+" · "+t.prices[tier]}</span>
       {tier==="standard"?<ArrowRight size={19} aria-hidden="true"/>:null}
     </button>
   </div>
 </section>;
}
