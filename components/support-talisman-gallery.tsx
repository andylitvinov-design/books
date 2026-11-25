"use client";

/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import styles from "./support-talisman-gallery.module.css";

type Locale = "en" | "ru" | "es";
type Category = "protection" | "energy" | "harmony" | "prosperity" | "wisdom" | "other";
type Item = { id: string; title: string; category: Category; imageUrl: string; createdAt: string };
const CATEGORIES: Category[] = ["protection", "energy", "harmony", "prosperity", "wisdom", "other"];
const COPY = {
  en: {
    all: "All", my: "My talismans", private: "Private to your account",
    intro: "Keep a personal collection of symbolic talismans, organized by intention. Upload your own image or photograph.",
    noItems: "No talismans in this category yet. Start by adding your own.",
    upload: "Upload my talisman", title: "Talisman name", placeholder: "For example, my sun symbol",
    category: "Category", photo: "Image or photo", choose: "Choose a photo", save: "Save talisman",
    saving: "Uploading…", delete: "Remove", open: "View image", cancel: "Cancel",
    note: "Personal collection only — not publicly published. Avoid photos of other people or private documents. Symbolic items are not medical or financial guarantees.",
    limit: "Up to 30 images · JPEG, PNG, WebP or iPhone HEIC · original up to 25 MB.",
    signIn: "Sign in to save talismans", signInLead: "Your collection belongs to your secure Holistic House account. It does not appear to other visitors.",
    loading: "Loading your collection…", unavailable: "Your collection is temporarily unavailable. Try again.",
    invalid: "Choose a supported photo under 25 MB.", tooLarge: "The image cannot be compressed enough. Choose a smaller photo.",
    required: "Add a name and choose a photo.", failed: "Upload failed. Please try again.",
    full: "Your collection has reached 30 talismans. Remove one to upload another.",
    saved: "Saved privately to your talismans.", removed: "Talisman removed.",
    confirm: "Remove this talisman from your private collection?", retry: "Retry",
    count: "saved",
  },
  ru: {
    all: "Все", my: "Мои талисманы", private: "Видны только вам",
    intro: "Соберите личную коллекцию символических талисманов по направлениям. Загрузите изображение или фотографию своего талисмана.",
    noItems: "В этой рубрике пока нет талисманов. Добавьте свой.",
    upload: "Загрузить свой талисман", title: "Название талисмана", placeholder: "Например, мой солнечный символ",
    category: "Рубрика", photo: "Изображение или фото", choose: "Выбрать фотографию", save: "Сохранить талисман",
    saving: "Загружаем…", delete: "Удалить", open: "Открыть изображение", cancel: "Отмена",
    note: "Коллекция личная и не публикуется автоматически. Не загружайте чужие фотографии и личные документы. Символы не гарантируют лечебного или финансового результата.",
    limit: "До 30 изображений · JPEG, PNG, WebP или HEIC с iPhone · исходник до 25 МБ.",
    signIn: "Войти, чтобы сохранять талисманы", signInLead: "Коллекция хранится в вашем защищённом кабинете Holistic House и не видна другим посетителям.",
    loading: "Загружаем коллекцию…", unavailable: "Коллекция временно недоступна. Повторите попытку.",
    invalid: "Выберите подходящее фото размером до 25 МБ.", tooLarge: "Фото не удалось достаточно сжать. Выберите другое.",
    required: "Укажите название и выберите изображение.", failed: "Не удалось загрузить. Попробуйте ещё раз.",
    full: "Можно хранить до 30 талисманов. Удалите один перед новой загрузкой.",
    saved: "Талисман сохранён в вашей личной коллекции.", removed: "Талисман удалён.",
    confirm: "Удалить талисман из вашей коллекции?", retry: "Повторить",
    count: "сохранено",
  },
  es: {
    all: "Todos", my: "Mis talismanes", private: "Solo visibles para ti",
    intro: "Guarda tus talismanes simbólicos en una colección personal organizada por intención. Sube una imagen o foto.",
    noItems: "Todavía no hay talismanes en esta categoría. Añade el tuyo.",
    upload: "Subir mi talismán", title: "Nombre del talismán", placeholder: "Por ejemplo, mi símbolo del sol",
    category: "Categoría", photo: "Imagen o foto", choose: "Elegir foto", save: "Guardar talismán",
    saving: "Subiendo…", delete: "Eliminar", open: "Abrir imagen", cancel: "Cancelar",
    note: "Colección personal, sin publicación automática. No subas fotos ajenas ni documentos privados. Los símbolos no garantizan resultados médicos o económicos.",
    limit: "Hasta 30 imágenes · JPEG, PNG, WebP o HEIC de iPhone · original hasta 25 MB.",
    signIn: "Iniciar sesión para guardar", signInLead: "Tu colección pertenece a tu cuenta privada de Holistic House y no es visible para otras personas.",
    loading: "Cargando tu colección…", unavailable: "La colección no está disponible temporalmente.",
    invalid: "Elige una foto compatible de menos de 25 MB.", tooLarge: "No se pudo comprimir la imagen. Elige una más pequeña.",
    required: "Indica un nombre y selecciona una imagen.", failed: "No se pudo subir la foto.",
    full: "Has alcanzado los 30 talismanes. Elimina uno para añadir otro.",
    saved: "Talismán guardado de forma privada.", removed: "Talismán eliminado.",
    confirm: "¿Eliminar este talismán de tu colección?", retry: "Reintentar",
    count: "guardados",
  },
} as const;
const NAMES: Record<Locale,Record<Category,string>> = {
  en: {protection:"Protection",energy:"Energy & vitality",harmony:"Love & harmony",prosperity:"Prosperity",wisdom:"Wisdom & direction",other:"Other"},
  ru: {protection:"Защита",energy:"Энергия и ресурсы",harmony:"Любовь и гармония",prosperity:"Благополучие",wisdom:"Мудрость и путь",other:"Другие"},
  es: {protection:"Protección",energy:"Energía y vitalidad",harmony:"Amor y armonía",prosperity:"Prosperidad",wisdom:"Sabiduría y dirección",other:"Otros"},
};
const ICONS: Record<Category,string> = {protection:"◇",energy:"☀",harmony:"♡",prosperity:"✧",wisdom:"☯",other:"✦"};

async function preparePhoto(source: File) {
  if(!source||source.size<128||source.size>25_000_000)throw new Error("INVALID_IMAGE");
  const url=URL.createObjectURL(source);
  try{
    const image=new Image();
    image.src=url;
    await image.decode();
    if(!image.naturalWidth||!image.naturalHeight||image.naturalWidth*image.naturalHeight>80_000_000)
      throw new Error("INVALID_IMAGE");
    const scale=Math.min(1,1400/Math.max(image.naturalWidth,image.naturalHeight));
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(image.naturalWidth*scale));
    canvas.height=Math.max(1,Math.round(image.naturalHeight*scale));
    const context=canvas.getContext("2d",{alpha:false});
    if(!context)throw new Error("INVALID_IMAGE");
    context.fillStyle="#ffffff";context.fillRect(0,0,canvas.width,canvas.height);
    context.drawImage(image,0,0,canvas.width,canvas.height);
    const encode=(quality:number)=>new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,"image/jpeg",quality));
    let blob=await encode(.78);
    if(blob&&blob.size>2_700_000)blob=await encode(.55);
    if(!blob||blob.size<128||blob.size>2_700_000)throw new Error("TALISMAN_TOO_LARGE");
    return blob;
  }catch(error){
    if(error instanceof Error&&error.message==="TALISMAN_TOO_LARGE")throw error;
    throw new Error("INVALID_IMAGE");
  }finally{URL.revokeObjectURL(url);}
}

export function SupportTalismanGallery({locale}: {locale:Locale}) {
  const t=COPY[locale],names=NAMES[locale];
  const [items,setItems]=useState<Item[]>([]);
  const [selected,setSelected]=useState<Category|"all">("all");
  const [authorized,setAuthorized]=useState<boolean|null>(null);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [formOpen,setFormOpen]=useState(false);
  const [title,setTitle]=useState("");
  const [category,setCategory]=useState<Category>("protection");
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const fileRef=useRef<HTMLInputElement>(null);
  const load=useCallback(async()=>{
    setLoading(true);
    try{
      const response=await fetch("/api/holistic-support/talismans",{credentials:"same-origin",cache:"no-store"});
      if(response.status===401){setAuthorized(false);setItems([]);setError("");return;}
      if(!response.ok)throw new Error("UNAVAILABLE");
      const data=await response.json();
      if(!Array.isArray(data.items))throw new Error("UNAVAILABLE");
      setItems(data.items);setAuthorized(true);setError("");
    }catch{setError(t.unavailable);}
    finally{setLoading(false);}
  },[t.unavailable]);
  useEffect(()=>{void load();},[load]);
  const visible=selected==="all"?items:items.filter(item=>item.category===selected);
  const submit=async(event:FormEvent<HTMLFormElement>)=>{
    event.preventDefault();
    const file=fileRef.current?.files?.[0];
    if(!title.trim()||!file){setError(t.required);return;}
    if(busy)return;
    setBusy(true);setError("");setMessage("");
    try{
      const clean=await preparePhoto(file);
      const form=new FormData();
      form.append("title",title.trim());form.append("category",category);
      form.append("image",clean,"talisman.jpg");
      const response=await fetch("/api/holistic-support/talismans",{
        method:"POST",credentials:"same-origin",body:form,cache:"no-store",
      });
      const result=await response.json().catch(()=>({}));
      if(!response.ok)throw new Error(result.error||"UPLOAD_FAILED");
      setTitle("");if(fileRef.current)fileRef.current.value="";
      setFormOpen(false);setSelected(category);setMessage(t.saved);
      await load();
    }catch(caught){
      const code=caught instanceof Error?caught.message:"";
      setError(code==="TALISMAN_LIMIT_REACHED"?t.full:code==="TALISMAN_TOO_LARGE"?t.tooLarge:
        code==="INVALID_IMAGE"?t.invalid:t.failed);
    }finally{setBusy(false);}
  };
  const remove=async(id:string)=>{
    if(busy||!window.confirm(t.confirm))return;
    setBusy(true);setError("");setMessage("");
    try{
      const response=await fetch("/api/holistic-support/talismans?id="+encodeURIComponent(id),{
        method:"DELETE",credentials:"same-origin",cache:"no-store",
      });
      if(!response.ok)throw new Error("DELETE_FAILED");
      setItems(previous=>previous.filter(item=>item.id!==id));setMessage(t.removed);
    }catch{setError(t.unavailable);}
    finally{setBusy(false);}
  };
  return <div className={styles.gallery} data-support-talismans>
    <div className={styles.intro}>
      <p>{t.intro}</p><span className={styles.privateBadge}>✦ {t.private}</span>
    </div>
    <div className={styles.categoryList} aria-label={t.category} role="group">
      <button type="button" onClick={()=>setSelected("all")} aria-pressed={selected==="all"} className={selected==="all"?styles.active:""}>
        {t.all} <small>{items.length}</small>
      </button>
      {CATEGORIES.map(key=><button key={key} type="button" onClick={()=>setSelected(key)}
        aria-pressed={selected===key} className={selected===key?styles.active:""}>
        <span aria-hidden="true">{ICONS[key]}</span> {names[key]} <small>{items.filter(item=>item.category===key).length}</small>
      </button>)}
    </div>
    {loading?<p className={styles.empty} role="status">{t.loading}</p>:
      authorized===false?<div className={styles.gate}>
        <p>{t.signInLead}</p><Link href={"/"+locale+"/app"} prefetch={false}>{t.signIn} <span aria-hidden="true">→</span></Link>
      </div>:
      authorized===true?<div className={styles.content}>
        {visible.length?<div className={styles.cards}>{visible.map(item=><article className={styles.card} key={item.id}>
          <a className={styles.preview} href={item.imageUrl} target="_blank" rel="noopener noreferrer" aria-label={t.open+": "+item.title}>
            <img src={item.imageUrl} alt={item.title} loading="lazy" />
          </a>
          <div className={styles.cardCopy}>
            <strong>{item.title}</strong><span>{names[item.category]}</span>
            <button type="button" disabled={busy} onClick={()=>void remove(item.id)}>{t.delete}</button>
          </div>
        </article>)}</div>:<p className={styles.empty}>{t.noItems}</p>}
        {!formOpen&&items.length<30?<button type="button" className={styles.addButton} onClick={()=>{setFormOpen(true);setError("");}}>
          <span aria-hidden="true">＋</span> {t.upload}
        </button>:null}
        {formOpen?<form className={styles.form} onSubmit={submit} data-talisman-upload>
          <label>{t.title}<input required maxLength={100} minLength={2} value={title} onChange={e=>setTitle(e.target.value)} placeholder={t.placeholder}/></label>
          <label>{t.category}<select value={category} onChange={e=>setCategory(e.target.value as Category)}>
            {CATEGORIES.map(key=><option key={key} value={key}>{names[key]}</option>)}
          </select></label>
          <label className={styles.fileLabel}>{t.photo}<input ref={fileRef} type="file" required accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" /></label>
          <p className={styles.hint}>{t.limit}</p>
          <div className={styles.formActions}>
            <button type="submit" disabled={busy}>{busy?t.saving:t.save}</button>
            <button type="button" disabled={busy} onClick={()=>{setFormOpen(false);setError("");}}>{t.cancel}</button>
          </div>
        </form>:null}
      </div>:<button type="button" className={styles.retry} onClick={()=>void load()}>{t.retry}</button>
    }
    {message&&<p className={styles.success} role="status">{message}</p>}
    {error&&<p className={styles.error} role="alert">{error}</p>}
    <p className={styles.note}>{t.note}</p>
  </div>;
}
