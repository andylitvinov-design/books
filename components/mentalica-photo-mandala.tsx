"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, PointerEvent } from "react";
import { Download, ImagePlus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import {
  MENTALICA_GEOMETRIES,
  MENTALICA_STYLES,
  MENTALICA_CONSTRUCTOR_TYPES,
  MENTALICA_BACKGROUND_TONES,
  MENTALICA_LAYOUT_VARIANTS,
  mentalicaPhotoLayout,
  clampMentalicaNumber,
  defaultMentalicaPhotoProject,
  sanitizeMentalicaPhotoProject
} from "@/lib/mandala/mentalica-photo-geometry.mjs";
import type { MentalicaPhotoAsset, MentalicaPhotoProject, MentalicaPhotoTransform } from "@/lib/mandala/mentalica-photo-geometry.mjs";
import styles from "./mentalica-photo-mandala.module.css";

type Props = { locale: PublicLocale };
type Saved = { id: string; title: string };
const CENTER = "__center_image";
const INNER = "__inner_cover";
const OUTER = "__outer_cover";
const IMAGE_LIMIT = 20 * 1024 * 1024;
const STORE = "mandalas";
const DB_NAME = "holistic-house-mentalica-mandalas";
const defaultTransform = (): MentalicaPhotoTransform => ({ x: 50, y: 50, zoom: 1, rotate: 0 });
const uuid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : "photo-" + Date.now() + "-" + Math.floor(Math.random() * 1e8);

const words = {
  ru: {
    kicker: "ФОТОМАНДАЛЫ · КОНСТРУКТОР MENTALICA",
    title: "Соберите мандалу из своих фотографий",
    intro: "Выберите центр, добавьте изображения и распределите их по источникам силы. Нажимайте на позиции или перетаскивайте фото из библиотеки.",
    privacy: "Фотографии обрабатываются только на этом устройстве. При сохранении они остаются в хранилище этого браузера, не отправляются в Mentalica, облако или ИИ.",
    name: "Название мандалы", namePlaceholder: "Моя мандала",
    geometry: "Источников силы", style: "Стиль расположения", layout: "Форма поля",
    square: "Квадрат", vertical: "Вертикально", horizontal: "Горизонтально", rectangle: "Прямоугольник",
    circle: "Круг", centerSquare: "Квадрат", centerShape: "Форма центра",
    photos: "Фотографии", add: "Добавить фотографии", choose: "Выбрана позиция", selected: "Выбрано фото",
    empty: "Фото пока нет. Загрузите свои изображения.", center: "Фото клиента / цели",
    inner: "Фон внутри", outer: "Внешний фон", slot: "Источник",
    assign: "Поместить в выбранную позицию", remove: "Убрать с позиции",
    adjust: "Настройка выбранной фотографии", pan: "Перетащите фото для изменения положения",
    zoom: "Масштаб", rotate: "Поворот", x: "По горизонтали", y: "По вертикали",
    fieldScale: "Размер поля", centerScale: "Размер центра", photoScale: "Масштаб фото", slotScale: "Размер окон",
    layers: "Показывать слои", showCenter: "Центр", showSlots: "Мини-фото", showInner: "Внутренний фон", showOuter: "Внешний фон",
    save: "Сохранить на устройстве", saved: "Сохранённые мандалы", new: "Новая мандала",
    export: "Скачать PNG", exportJSON: "Экспорт проекта", importJSON: "Импорт проекта",
    delete: "Удалить", load: "Открыть", savedOk: "Мандала сохранена в этом браузере.",
    loadedOk: "Мандала открыта.", importedOk: "Проект импортирован.",
    exportedOk: "PNG готов.", savedUnavailable: "Хранилище браузера недоступно. Используйте «Экспорт проекта».",
    badImage: "Не удалось открыть фото. Используйте JPG, PNG, WebP или поддерживаемое устройством HEIC до 20 МБ.",
    badProject: "Не удалось прочитать проект. Нужен файл экспорта фотомандалы Holistic House.",
    exportError: "Не удалось создать PNG. Проверьте фотографии.",
    newConfirm: "Начать новую мандалу? Несохранённые изменения будут потеряны.",
    removePhoto: "Удалить фото из библиотеки", nothing: "Пока нет сохранённых мандал на этом устройстве.",
    reuse: "Выберите фото в библиотеке, затем нажмите на нужный круг или выберите позицию в списке.",
    pending: "Обработка фотографии…", noPhoto: "Нажмите, чтобы выбрать позицию"
  },
  en: {
    kicker: "PHOTO MANDALAS · MENTALICA CONSTRUCTOR",
    title: "Build a mandala from your photographs",
    intro: "Choose a center photo and place pictures around the circle. Tap any position or drag from your photo library.",
    privacy: "Photos are processed on this device only. Saved photos stay in this browser, never uploaded to Mentalica, the cloud, or AI.",
    name: "Mandala name", namePlaceholder: "My mandala", geometry: "Sources of power",
    style: "Arrangement style", layout: "Field layout", square: "Square", vertical: "Vertical", horizontal: "Horizontal", rectangle: "Rectangle",
    circle: "Circle", centerSquare: "Square", centerShape: "Center shape",
    photos: "Photos", add: "Add photos", choose: "Selected position", selected: "Selected photo",
    empty: "No photos yet. Add images from your device.", center: "Client / goal photo",
    inner: "Inner background", outer: "Outer background", slot: "Source",
    assign: "Use in selected position", remove: "Clear position",
    adjust: "Adjust selected photo", pan: "Drag the photo to reposition it",
    zoom: "Zoom", rotate: "Rotation", x: "Horizontal", y: "Vertical",
    fieldScale: "Field size", centerScale: "Center size", photoScale: "Photo scale", slotScale: "Window size",
    layers: "Visible layers", showCenter: "Center", showSlots: "Mini photos", showInner: "Inner background", showOuter: "Outer background",
    save: "Save on this device", saved: "Saved mandalas", new: "New mandala",
    export: "Download PNG", exportJSON: "Export project", importJSON: "Import project",
    delete: "Delete", load: "Open", savedOk: "Saved in this browser.",
    loadedOk: "Mandala opened.", importedOk: "Project imported.",
    exportedOk: "PNG is ready.", savedUnavailable: "Browser storage is unavailable. Use Export project.",
    badImage: "Could not open this photo. Use JPG, PNG, WebP or device-supported HEIC, up to 20 MB.",
    badProject: "Could not read this project. Use a Holistic House photo mandala export.",
    exportError: "Could not create PNG. Check your photos.",
    newConfirm: "Start a new mandala? Unsaved changes will be lost.",
    removePhoto: "Remove from library", nothing: "No saved mandalas on this device.",
    reuse: "Choose a library photo, then click a position or select it from the list.",
    pending: "Processing photo…", noPhoto: "Select this position"
  },
  es: {
    kicker: "MANDALAS FOTOGRÁFICOS · CONSTRUCTOR MENTALICA",
    title: "Crea un mandala con tus fotografías",
    intro: "Elige la foto central y coloca imágenes alrededor. Toca una posición o arrastra fotos desde tu biblioteca.",
    privacy: "Las fotos se procesan solo en este dispositivo. Al guardarlas permanecen en este navegador; no se suben a Mentalica, la nube ni a la IA.",
    name: "Nombre del mandala", namePlaceholder: "Mi mandala", geometry: "Fuentes de poder",
    style: "Estilo de distribución", layout: "Forma del campo", square: "Cuadrado", vertical: "Vertical", horizontal: "Horizontal", rectangle: "Rectángulo",
    circle: "Círculo", centerSquare: "Cuadrado", centerShape: "Forma central",
    photos: "Fotografías", add: "Añadir fotos", choose: "Posición elegida", selected: "Foto elegida",
    empty: "Todavía no hay fotos. Añade imágenes.", center: "Foto del cliente / meta",
    inner: "Fondo interior", outer: "Fondo exterior", slot: "Fuente",
    assign: "Colocar en la posición", remove: "Quitar de la posición",
    adjust: "Ajustar fotografía", pan: "Arrastra la foto para cambiar su posición",
    zoom: "Zoom", rotate: "Rotación", x: "Horizontal", y: "Vertical",
    fieldScale: "Tamaño del campo", centerScale: "Tamaño del centro", photoScale: "Escala de foto", slotScale: "Tamaño de ventanas",
    layers: "Capas visibles", showCenter: "Centro", showSlots: "Mini fotos", showInner: "Fondo interior", showOuter: "Fondo exterior",
    save: "Guardar en este dispositivo", saved: "Mandalas guardados", new: "Nuevo mandala",
    export: "Descargar PNG", exportJSON: "Exportar proyecto", importJSON: "Importar proyecto",
    delete: "Eliminar", load: "Abrir", savedOk: "Mandala guardado en este navegador.",
    loadedOk: "Mandala abierto.", importedOk: "Proyecto importado.",
    exportedOk: "PNG preparado.", savedUnavailable: "El almacenamiento no está disponible. Usa Exportar proyecto.",
    badImage: "No se pudo abrir la foto. Usa JPG, PNG, WebP o HEIC compatible, hasta 20 MB.",
    badProject: "No se pudo leer el proyecto. Usa una exportación de Holistic House.",
    exportError: "No se pudo crear el PNG. Revisa las fotos.",
    newConfirm: "¿Nuevo mandala? Se perderán los cambios no guardados.",
    removePhoto: "Eliminar foto de la biblioteca", nothing: "No hay mandalas guardados en este dispositivo.",
    reuse: "Selecciona una foto y después una posición, o usa la lista de posiciones.",
    pending: "Procesando fotografía…", noPhoto: "Elige esta posición"
  }
} as const;


const constructorNames:Record<PublicLocale,Record<MentalicaPhotoProject["constructorType"],string>>={
  ru:{client:"Мандала",altar:"Алтарь",business:"Бизнес",zodiac:"Зодиак",star:"Звезда",chess:"Шахматы",dao:"ДАО","dao-layout":"ДАО-Макет"},
  en:{client:"Mandala",altar:"Altar",business:"Business",zodiac:"Zodiac",star:"Star",chess:"Chess",dao:"DAO","dao-layout":"DAO Layout"},
  es:{client:"Mandala",altar:"Altar",business:"Negocios",zodiac:"Zodíaco",star:"Estrella",chess:"Ajedrez",dao:"DAO","dao-layout":"Diseño DAO"}
};
const toneNames:Record<MentalicaPhotoProject["tone"],Record<PublicLocale,string>>={
  mentalica:{ru:"Mentalica",en:"Mentalica",es:"Mentalica"},
  gold:{ru:"Золото",en:"Gold",es:"Oro"},forest:{ru:"Лес",en:"Forest",es:"Bosque"},
  night:{ru:"Ночь",en:"Night",es:"Noche"},fire:{ru:"Огонь",en:"Fire",es:"Fuego"},
  water:{ru:"Вода",en:"Water",es:"Agua"}
};
const variantNames:Record<string,Record<PublicLocale,string>>={
  classic:{ru:"Классика",en:"Classic",es:"Clásico"},
  "one-zone":{ru:"1 зона",en:"1 zone",es:"1 zona"},
  "three-zones":{ru:"3 зоны",en:"3 zones",es:"3 zonas"},
  "zodiac-2-12":{ru:"Два круга",en:"Two rings",es:"Dos anillos"},
  "plus-8":{ru:"Дополнительные",en:"Extra positions",es:"Posiciones extra"},
  closed:{ru:"Замкнутая",en:"Closed",es:"Cerrada"},
  open:{ru:"Открытая",en:"Open",es:"Abierta"},
  "star-2-10":{ru:"Звезда 2",en:"Star 2",es:"Estrella 2"},
  "classic-14":{ru:"15 фото",en:"15 photos",es:"15 fotos"},
  "classic-8":{ru:"9 фото",en:"9 photos",es:"9 fotos"},
  "compact-5":{ru:"Компактная",en:"Compact",es:"Compacto"},
  "style-1":{ru:"Стиль 1",en:"Style 1",es:"Estilo 1"},
  "style-2":{ru:"Стиль 2",en:"Style 2",es:"Estilo 2"},
  "talisman-1":{ru:"Талисман 1",en:"Talisman 1",es:"Talismán 1"},
  "talisman-2":{ru:"Талисман 2",en:"Talisman 2",es:"Talismán 2"},
  roof_double_line:{ru:"Крыша",en:"Roof",es:"Techo"},
  three_checks:{ru:"Три галочки",en:"Three marks",es:"Tres marcas"}
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") return reject(new Error("IndexedDB unavailable"));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE, { keyPath: "id" });
    };
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
async function listProjects(): Promise<MentalicaPhotoProject[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE, "readonly");
      const request = transaction.objectStore(STORE).getAll();
      request.onsuccess = () => resolve((request.result as unknown[]).map(sanitizeMentalicaPhotoProject));
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}
async function putProject(project: MentalicaPhotoProject): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(project);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
async function deleteProject(id: string): Promise<void> {
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onabort = () => reject(tx.error);
      tx.onerror = () => reject(tx.error);
    });
  } finally { db.close(); }
}
function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  // Safari may only start the download after the click task returns.
  window.setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function safeFilename(name: string) {
  return (name || "mandala").normalize("NFKC").replace(/[^\p{L}\p{N}_-]+/gu, "-").slice(0, 65) || "mandala";
}
async function normalizePhoto(file: File): Promise<string> {
  const allowed = /^image\/(?:jpeg|png|webp|heic|heif)$/i.test(file.type) ||
    (!file.type && /\.(?:jpe?g|png|webp|heic|heif)$/i.test(file.name));
  if (!allowed || file.size < 1 || file.size > IMAGE_LIMIT) throw Error("Invalid image");
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("Image decode failed"));
      img.src = url;
    });
    if (!img.naturalWidth || !img.naturalHeight) throw Error("Empty image");
    const ratio = Math.min(1, 2048 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Re-encoding strips EXIF/GPS and avoids persisting huge originals.
    const data = canvas.toDataURL("image/jpeg", 0.86);
    if (!/^data:image\/jpeg;base64,/.test(data) || data.length > 6_000_000) throw Error("Normalized image too large");
    return data;
  } finally { URL.revokeObjectURL(url); }
}
async function decodeImage(data: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Invalid photo"));
    image.src = data;
  });
}

const renderPalettes: Record<MentalicaPhotoProject["tone"],{inner:string;mid:string;edge:string;line:string}> = {
  mentalica:{inner:"#dfbd79",mid:"#765026",edge:"#23150b",line:"#f6d99d"},
  gold:{inner:"#fff0c6",mid:"#cf9852",edge:"#44301b",line:"#fff0cf"},
  forest:{inner:"#b6c5a5",mid:"#536b55",edge:"#142c27",line:"#e2edcc"},
  night:{inner:"#c5c9e9",mid:"#555678",edge:"#131727",line:"#dadcf9"},
  fire:{inner:"#ffcd88",mid:"#b85129",edge:"#351810",line:"#ffe0a7"},
  water:{inner:"#a5d5df",mid:"#417b89",edge:"#142d3d",line:"#dcf7fb"}
};
// Shared crop semantics: CSS object-fit:cover and object-position, then zoom/rotate.
// This is also used for covers, slots, and center in PNG; no server requests.
function drawCover(ctx:CanvasRenderingContext2D,img:HTMLImageElement,
  cx:number,cy:number,w:number,h:number,t:MentalicaPhotoTransform,zoom:number){
  ctx.save();ctx.translate(cx,cy);ctx.rotate(t.rotate*Math.PI/180);
  ctx.scale(t.zoom*zoom,t.zoom*zoom);
  const factor=Math.max(w/img.naturalWidth,h/img.naturalHeight);
  const width=img.naturalWidth*factor,height=img.naturalHeight*factor;
  ctx.drawImage(img,-w/2+(w-width)*t.x/100,-h/2+(h-height)*t.y/100,width,height);
  ctx.restore();
}
function drawCropped(ctx:CanvasRenderingContext2D,img:HTMLImageElement,cx:number,cy:number,
  diameter:number,t:MentalicaPhotoTransform,circle:boolean,zoom:number){
  const half=diameter/2;
  ctx.save();ctx.beginPath();
  if(circle)ctx.arc(cx,cy,half,0,2*Math.PI);
  else ctx.rect(cx-half,cy-half,diameter,diameter);
  ctx.clip();drawCover(ctx,img,cx,cy,diameter,diameter,t,zoom);ctx.restore();
}
function traceField(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,shape:string){
  ctx.beginPath();
  if(shape==="circle")ctx.ellipse(x+w/2,y+h/2,w/2,h/2,0,0,2*Math.PI);
  else if(typeof ctx.roundRect==="function")ctx.roundRect(x,y,w,h,Math.min(w,h)*(shape==="scroll"?.095:.13));
  else ctx.rect(x,y,w,h);
}
async function renderPng(project:MentalicaPhotoProject):Promise<Blob>{
  const size=2048,layout=mentalicaPhotoLayout(project);
  const palette=renderPalettes[project.tone]||renderPalettes.mentalica;
  const canvas=document.createElement("canvas");canvas.width=size;canvas.height=size;
  const ctx=canvas.getContext("2d");if(!ctx)throw Error("Canvas unavailable");
  const images=new Map<string,HTMLImageElement>(),assigned=new Set(Object.values(project.assignments));
  await Promise.all(project.assets.filter(a=>assigned.has(a.id)).map(async a=>images.set(a.id,await decodeImage(a.data))));
  const asset=(key:string)=>images.get(project.assignments[key]||"");
  const t=(key:string)=>project.transforms[key]||defaultTransform();
  const w=size*.86*project.fieldScale/100;
  const h=w*(project.fieldLayout==="vertical"?1.25:project.fieldLayout==="horizontal"?.8:project.fieldLayout==="rectangle"?.75:1);
  const cx=size/2,cy=size/2,x=cx-w/2,y=cy-h/2;
  const bg=ctx.createRadialGradient(cx,cy,size*.04,cx,cy,size*.75);
  bg.addColorStop(0,palette.mid);bg.addColorStop(1,palette.edge);
  ctx.fillStyle=bg;ctx.fillRect(0,0,size,size);
  if(project.visible.outer&&asset(OUTER))drawCropped(ctx,asset(OUTER)!,cx,cy,size,t(OUTER),false,1);
  ctx.save();traceField(ctx,x,y,w,h,layout.fieldShape);ctx.clip();
  const gradient=ctx.createRadialGradient(cx,cy,w*.01,cx,cy,Math.max(w,h)*.66);
  gradient.addColorStop(0,palette.inner);gradient.addColorStop(.62,palette.mid);gradient.addColorStop(1,palette.edge);
  ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);
  ctx.strokeStyle="rgba(249,224,170,.12)";ctx.lineWidth=size*.0018;
  for(let i=0;i<36;i++){const a=i*2*Math.PI/36;ctx.beginPath();ctx.moveTo(cx,cy);
    ctx.lineTo(cx+Math.cos(a)*w,cy+Math.sin(a)*h);ctx.stroke();}
  if(project.visible.inner&&asset(INNER))drawCover(ctx,asset(INNER)!,cx,cy,w,h,t(INNER),1);
  if(layout.hasRings){
    ctx.strokeStyle=palette.line;
    for(const r of [.185,.35,.47]){ctx.globalAlpha=r===.47?.65:.38;ctx.lineWidth=r===.47?size*.003:size*.001;
      ctx.beginPath();ctx.ellipse(cx,cy,w*r,h*r,0,0,2*Math.PI);ctx.stroke();}
    ctx.globalAlpha=1;
  }
  ctx.strokeStyle=palette.line;ctx.lineWidth=size*.001;ctx.globalAlpha=.64;ctx.lineJoin="round";
  for(const path of layout.guides){if(path.length<2)continue;ctx.beginPath();
    path.forEach(([px,py],i)=>{if(i===0)ctx.moveTo(x+w*px/100,y+h*py/100);
      else ctx.lineTo(x+w*px/100,y+h*py/100);});ctx.stroke();}
  ctx.restore();ctx.strokeStyle=palette.line;ctx.lineWidth=size*.003;traceField(ctx,x,y,w,h,layout.fieldShape);ctx.stroke();
  const place=(key:string,px:number,py:number,d:number,circle:boolean,zoom=1,label="")=>{
    ctx.save();ctx.fillStyle=palette.mid;ctx.beginPath();
    if(circle)ctx.arc(px,py,d/2,0,2*Math.PI);
    else if(typeof ctx.roundRect==="function")ctx.roundRect(px-d/2,py-d/2,d,d,d*.1);
    else ctx.rect(px-d/2,py-d/2,d,d);
    ctx.fill();
    const img=asset(key);
    if(img)drawCropped(ctx,img,px,py,d,t(key),circle,zoom);
    else if(label){ctx.fillStyle=palette.line;ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.font="700 "+Math.max(16,Math.round(d*.22))+"px Arial";ctx.fillText(label,px,py,d*.9);}
    ctx.strokeStyle=palette.line;ctx.lineWidth=Math.max(3,d*.035);ctx.beginPath();
    if(circle)ctx.arc(px,py,d/2,0,2*Math.PI);
    else if(typeof ctx.roundRect==="function")ctx.roundRect(px-d/2,py-d/2,d,d,d*.1);
    else ctx.rect(px-d/2,py-d/2,d,d);
    ctx.stroke();ctx.restore();
  };
  if(project.visible.slots)layout.slots.forEach((slot,i)=>place(slot.id,x+w*slot.x/100,y+h*slot.y/100,
    w*slot.diameter/100*project.slotScale,slot.shape!=="square",1,String(i+1)));
  if(project.visible.center)place(CENTER,x+w*layout.center.x/100,y+h*layout.center.y/100,
    w*layout.center.diameter/100*project.centerFrameScale,
    project.centerShape==="circle",project.centerImageScale);
  ctx.fillStyle=palette.line;ctx.font="600 "+Math.round(size*.018)+"px Georgia";
  ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("Holistic House",cx,size*.963);
  return await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>
    blob?resolve(blob):reject(new Error("PNG encode failed")),"image/png"));
}

function Slider({ label, value, min, max, step = 1, onChange }: {label: string;value: number;min: number;max: number;step?: number;onChange: (value:number)=>void}) {
  return <label className={styles.slider}><span>{label}<b>{Math.round(value*100)/100}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))}/></label>;
}
function PreviewPhoto({ data, transform, zoom = 1 }: {data?: string;transform: MentalicaPhotoTransform;zoom?:number}) {
  return data ? <img draggable={false} src={data} alt="" className={styles.image}
    style={{objectPosition:transform.x+"% "+transform.y+"%",transform:"rotate("+transform.rotate+"deg) scale("+(transform.zoom*zoom)+")"}}/> : null;
}

export function MentalicaPhotoMandala({locale}: Props) {
  const t = words[locale];
  const [project, setProject] = useState<MentalicaPhotoProject>(() => defaultMentalicaPhotoProject());
  const [target, setTarget] = useState<string>(CENTER);
  const [saved, setSaved] = useState<Saved[]>([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const jsonRef = useRef<HTMLInputElement>(null);
  const dragRef = useRef<{key:string;pointerId:number;startX:number;startY:number;start:MentalicaPhotoTransform}|null>(null);
  const fingersRef = useRef(new Map<number,{x:number;y:number}>());
  const pinchRef = useRef<{key:string;distance:number;zoom:number}|null>(null);
  const layout = useMemo(() => mentalicaPhotoLayout(project),
    [project.constructorType,project.variant,project.geometry,project.style]);
  const slots = layout.slots;
  const assetMap = useMemo(() => new Map(project.assets.map(a=>[a.id,a])),[project.assets]);
  const dataFor = (key:string) => assetMap.get(project.assignments[key] || "")?.data;
  const transformFor = (key:string) => project.transforms[key] || defaultTransform();
  const set = <K extends keyof MentalicaPhotoProject>(key:K,value:MentalicaPhotoProject[K]) => {
    setProject(current=>({...current,[key]:value}));setNotice("");
  };
  const updateTransform = (key:string, patch:Partial<MentalicaPhotoTransform>) => {
    setProject(current=> {
      const old = current.transforms[key] || defaultTransform();
      return {...current,transforms:{...current.transforms,[key]:{
        x:clampMentalicaNumber(patch.x ?? old.x,0,100,50),
        y:clampMentalicaNumber(patch.y ?? old.y,0,100,50),
        zoom:clampMentalicaNumber(patch.zoom ?? old.zoom,.65,4,1),
        rotate:clampMentalicaNumber(patch.rotate ?? old.rotate,-180,180,0)
      }}};
    });
    setNotice("");
  };
  function assign(key:string, assetId:string) {
    if (!assetMap.has(assetId)) return;
    setProject(current=>({...current,assignments:{...current.assignments,[key]:assetId}}));
    setTarget(key);setNotice("");
  }
  function clear(key:string) {
    setProject(current=> {
      const assignments={...current.assignments};delete assignments[key];
      return {...current,assignments};
    });setNotice("");
  }
  async function onPhotos(files:File[] | FileList | null, key = target) {
    if (!files?.length || processing) return;
    setError("");setProcessing(true);
    const selected = Array.from(files).slice(0,Math.max(0,40-project.assets.length));
    try {
      const newAssets:MentalicaPhotoAsset[]=[];
      for (const file of selected) newAssets.push({id:uuid(),name:file.name.slice(0,80),data:await normalizePhoto(file)});
      if (!newAssets.length || project.assets.reduce((sum,asset)=>sum+asset.data.length,0)
        + newAssets.reduce((sum,asset)=>sum+asset.data.length,0)>45_000_000) {
        throw Error("Local project image limit reached");
      }
      setProject(current=>({...current,assets:[...current.assets,...newAssets],assignments:{...current.assignments,[key]:newAssets[0].id}}));
      setTarget(key);setNotice("");
    } catch {setError(t.badImage);} finally {setProcessing(false);}
  }
  function onChangeFiles(event:ChangeEvent<HTMLInputElement>) {
    const files=event.target.files;
    void onPhotos(files);
    event.target.value="";
  }
  function onDropPhoto(event:DragEvent<HTMLButtonElement>,key:string) {
    event.preventDefault();
    const id=event.dataTransfer.getData("application/x-hh-mandala-photo");
    if (id && assetMap.has(id)) assign(key,id);
    else if (event.dataTransfer.files.length) void onPhotos(event.dataTransfer.files,key);
  }
  function onPointerDown(event:PointerEvent<HTMLButtonElement>,key:string) {
    setTarget(key);
    if (!dataFor(key)) return;
    fingersRef.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    try{event.currentTarget.setPointerCapture(event.pointerId);}catch{}
    if (fingersRef.current.size === 2) {
      const [a,b]=[...fingersRef.current.values()];
      pinchRef.current={key,distance:Math.hypot(a.x-b.x,a.y-b.y),zoom:transformFor(key).zoom};
      dragRef.current=null;
    } else dragRef.current={key,pointerId:event.pointerId,startX:event.clientX,startY:event.clientY,start:transformFor(key)};
  }
  function onPointerMove(event:PointerEvent<HTMLButtonElement>,key:string) {
    if (!fingersRef.current.has(event.pointerId)) return;
    fingersRef.current.set(event.pointerId,{x:event.clientX,y:event.clientY});
    if (fingersRef.current.size === 2 && pinchRef.current?.key === key) {
      const [a,b]=[...fingersRef.current.values()];
      const distance=Math.hypot(a.x-b.x,a.y-b.y);
      if (pinchRef.current.distance > 1) updateTransform(key,{zoom:pinchRef.current.zoom*distance/pinchRef.current.distance});
      return;
    }
    const drag=dragRef.current;
    if (!drag || drag.key!==key || drag.pointerId!==event.pointerId) return;
    const rect=event.currentTarget.getBoundingClientRect();
    updateTransform(key,{x:drag.start.x-(event.clientX-drag.startX)/Math.max(rect.width,40)*100,
      y:drag.start.y-(event.clientY-drag.startY)/Math.max(rect.height,40)*100});
  }
  function onPointerEnd(event:PointerEvent<HTMLButtonElement>) {
    fingersRef.current.delete(event.pointerId);
    dragRef.current=null;pinchRef.current=null;
    try{event.currentTarget.releasePointerCapture(event.pointerId);}catch{}
  }
  useEffect(()=>{
    let active=true;
    listProjects().then(items=>{
      if(active)setSaved(items.map(item=>({id:item.id,title:item.title})).reverse());
    }).catch(()=>{});
    return ()=>{active=false;};
  },[]);
  async function save() {
    setError("");setNotice("");
    try {
      const copy=sanitizeMentalicaPhotoProject({...project,id:project.id||uuid(),title:project.title||t.namePlaceholder});
      await putProject(copy);setProject(copy);
      setSaved(items=>[{id:copy.id,title:copy.title},...items.filter(item=>item.id!==copy.id)]);
      setNotice(t.savedOk);
    } catch {setError(t.savedUnavailable);}
  }
  async function openSaved(id:string) {
    setError("");
    try {
      const item=(await listProjects()).find(item=>item.id===id);
      if(!item)throw Error("Not found");
      setProject(item);setTarget(CENTER);setNotice(t.loadedOk);
    } catch {setError(t.savedUnavailable);}
  }
  async function removeSaved(id:string) {
    try {
      await deleteProject(id);
      setSaved(items=>items.filter(item=>item.id!==id));
      if (project.id===id) setProject(current=>({...current,id:""}));
    } catch {setError(t.savedUnavailable);}
  }
  function exportProject() {
    downloadBlob(new Blob([JSON.stringify(project)],{type:"application/json"}),safeFilename(project.title)+"-mandala.json");
  }
  async function importProject(event:ChangeEvent<HTMLInputElement>) {
    const file=event.target.files?.[0];event.target.value="";
    if(!file)return;
    setError("");
    try {
      if (file.size>45_000_000)throw Error("Too large");
      const doc=sanitizeMentalicaPhotoProject(JSON.parse(await file.text()));
      setProject({...doc,id:""});setTarget(CENTER);setNotice(t.importedOk);
    } catch {setError(t.badProject);}
  }
  async function exportPng() {
    setError("");setProcessing(true);
    try {
      const blob=await renderPng(project);
      downloadBlob(blob,safeFilename(project.title)+"-mandala.png");
      setNotice(t.exportedOk);
    } catch {setError(t.exportError);}finally {setProcessing(false);}
  }
  function newProject() {
    if (!window.confirm(t.newConfirm)) return;
    setProject(defaultMentalicaPhotoProject());setTarget(CENTER);setNotice("");setError("");
  }
  function dropLibraryImage(id:string) {
    setProject(current=>{
      const assets=current.assets.filter(asset=>asset.id!==id);
      const assignments=Object.fromEntries(Object.entries(current.assignments).filter(([,value])=>value!==id));
      return {...current,assets,assignments};
    });setNotice("");
  }
  const targetLabel = (key:string) => key===CENTER?t.center:key===INNER?t.inner:key===OUTER?t.outer:
    slots.find(slot=>slot.id===key)?.label||key;
  const imageButton = (key:string,label:string,x:number,y:number,isCenter:boolean,diameter=15.5,shape="circle") => {
    const data=dataFor(key), transform=transformFor(key);
    const dimensions=isCenter?layout.center.diameter*project.centerFrameScale:diameter*project.slotScale;
    const zoom=isCenter?project.centerImageScale:1;
    return <button key={key} type="button" data-photo-mandala-slot={key}
      className={styles.slot+(isCenter?" "+styles.center:"")+(target===key?" "+styles.active:"")+((isCenter&&project.centerShape==="square"||!isCenter&&shape==="square")?" "+styles.square:"")}
      style={{left:String(x)+"%",top:String(y)+"%",width:String(dimensions)+"%",aspectRatio:"1"}}
      aria-label={label} aria-pressed={target===key} title={label}
      onClick={()=>{setTarget(key);if(!data&&!project.assets.length)inputRef.current?.click();}}
      onDragOver={e=>e.preventDefault()} onDrop={e=>onDropPhoto(e,key)}
      onPointerDown={e=>onPointerDown(e,key)} onPointerMove={e=>onPointerMove(e,key)}
      onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
      <PreviewPhoto data={data} transform={transform} zoom={zoom}/>
      {!data?<span className={styles.placeholder}>{isCenter?t.center:label}</span>:null}
    </button>;
  };
  const selectable=[{key:CENTER,label:t.center},{key:INNER,label:t.inner},{key:OUTER,label:t.outer},
    ...slots.map(slot=>({key:slot.id,label:slot.label}))];
  const fieldWidth=86*project.fieldScale/100;
  const empty=project.assets.length===0;

  return <section className={styles.workshop} data-mentalica-photo-mandala data-photo-mandala-privacy="local">
    <div className={styles.heading}>
      <span className={styles.kicker}>{t.kicker}</span>
      <h1>{t.title}</h1><p>{t.intro}</p>
    </div>
    <div className={styles.grid}>
      <div className={styles.stageColumn}>
        <div className={styles.stage} data-photo-mandala-stage data-photo-mandala-tone={project.tone}>
          {project.visible.outer&&dataFor(OUTER)?<div className={styles.outerCover}>
            <PreviewPhoto data={dataFor(OUTER)} transform={transformFor(OUTER)}/></div>:null}
          <div className={styles.field} data-photo-mandala-constructor={layout.type}
            data-photo-mandala-tone={project.tone} data-photo-mandala-field-shape={layout.fieldShape}
            style={{width:String(fieldWidth)+"%",
              aspectRatio:project.fieldLayout==="vertical"?"4 / 5":project.fieldLayout==="horizontal"?"5 / 4":project.fieldLayout==="rectangle"?"4 / 3":"1",
              borderRadius:layout.fieldShape==="circle"?"50%":layout.fieldShape==="scroll"?"9.5%":"13%"}}>
            {project.visible.inner&&dataFor(INNER)?<div className={styles.innerCover}>
              <PreviewPhoto data={dataFor(INNER)} transform={transformFor(INNER)}/></div>:null}
            {layout.hasRings?<><span className={styles.ringOne}/><span className={styles.ringTwo}/><span className={styles.ringThree}/></>:null}
            {layout.guides.length?<svg className={styles.guides} viewBox="0 0 100 100"
              preserveAspectRatio="none" aria-hidden="true" focusable="false">
              {layout.guides.map((path,i)=><polyline key={i}
                points={path.map(([x,y])=>x+","+y).join(" ")}/>)}
            </svg>:null}
            {project.visible.slots?slots.map(slot=>imageButton(slot.id,slot.label,slot.x,slot.y,false,slot.diameter,slot.shape)):null}
            {project.visible.center?imageButton(CENTER,t.center,layout.center.x,layout.center.y,true):null}
          </div>
          <span className={styles.watermark}>Holistic House</span>
        </div>
        <p className={styles.hint}>{t.pan}</p>
        <div className={styles.actionRow}>
          <button type="button" className={styles.primary} onClick={()=>void exportPng()} disabled={processing}>
            <Download size={17} aria-hidden="true"/>{t.export}
          </button>
          <button type="button" onClick={()=>void save()} disabled={processing}><Save size={16} aria-hidden="true"/>{t.save}</button>
        </div>
        {error?<p className={styles.error} role="alert">{error}</p>:null}
        {notice?<p className={styles.notice} role="status">{notice}</p>:null}
      </div>
      <div className={styles.controls}>
        <section className={styles.card}>
          <label className={styles.label}>{t.name}<input className={styles.textInput} value={project.title}
            maxLength={100} onChange={event=>set("title",event.target.value)} placeholder={t.namePlaceholder}/></label>
          <div className={styles.groupTitle}>{locale==="ru"?"Тип композиции":locale==="es"?"Tipo de composición":"Composition type"}</div>
          <div className={styles.constructorPills} role="group" aria-label={locale==="ru"?"Тип композиции":locale==="es"?"Tipo de composición":"Composition type"}>
            {MENTALICA_CONSTRUCTOR_TYPES.map(type=><button key={type} type="button"
              aria-pressed={layout.type===type} onClick={()=>{
                setProject(current=>({...current,constructorType:type,variant:MENTALICA_LAYOUT_VARIANTS[type][0]}));
                setTarget(CENTER);setNotice("");
              }}>{constructorNames[locale][type]}</button>)}
          </div>
          {MENTALICA_LAYOUT_VARIANTS[layout.type].length>1?<><div className={styles.groupTitle}>
            {locale==="ru"?"Вариант композиции":locale==="es"?"Variante":"Variant"}
          </div><div className={styles.pills} role="group" aria-label={locale==="ru"?"Вариант композиции":locale==="es"?"Variante":"Variant"}>
            {MENTALICA_LAYOUT_VARIANTS[layout.type].map(variant=><button key={variant}
              type="button" aria-pressed={layout.variant===variant}
              onClick={()=>set("variant",variant)}>{variantNames[variant]?.[locale]||variant}</button>)}
          </div></>:null}
          {["client","zodiac"].includes(layout.type)?<>
            <div className={styles.groupTitle}>{t.geometry}</div>
            <div className={styles.pills} role="group" aria-label={t.geometry}>
              {MENTALICA_GEOMETRIES.map(n=><button key={n} type="button" aria-pressed={project.geometry===n}
                onClick={()=>set("geometry",n)}>{n}</button>)}
            </div></>:null}
          {layout.type==="client"?<>
            <div className={styles.groupTitle}>{t.style}</div>
            <div className={styles.pills} role="group" aria-label={t.style}>
              {MENTALICA_STYLES.map((style,i)=><button key={style} type="button" aria-pressed={project.style===style}
                onClick={()=>set("style",style)}>{locale==="ru"?"Стиль":locale==="es"?"Estilo":"Style"} {i+1}</button>)}
            </div></>:null}
          <div className={styles.groupTitle}>{locale==="ru"?"Цветовая палитра":locale==="es"?"Paleta de colores":"Color palette"}</div>
          <div className={styles.pills} role="group" aria-label={locale==="ru"?"Цветовая палитра":locale==="es"?"Paleta de colores":"Color palette"}>
            {MENTALICA_BACKGROUND_TONES.map(tone=><button key={tone} type="button"
              aria-pressed={project.tone===tone} onClick={()=>set("tone",tone)}>{toneNames[tone][locale]}</button>)}
          </div>
          <div className={styles.groupTitle}>{t.layout}</div>
          <div className={styles.pills} role="group" aria-label={t.layout}>
            {(["square","vertical","horizontal","rectangle"] as const).map(k=><button type="button" key={k}
              aria-pressed={project.fieldLayout===k} onClick={()=>set("fieldLayout",k)}>{t[k]}</button>)}
          </div>
          <div className={styles.groupTitle}>{t.centerShape}</div>
          <div className={styles.pills} role="group" aria-label={t.centerShape}>
            <button type="button" aria-pressed={project.centerShape==="circle"} onClick={()=>set("centerShape","circle")}>{t.circle}</button>
            <button type="button" aria-pressed={project.centerShape==="square"} onClick={()=>set("centerShape","square")}>{t.centerSquare}</button>
          </div>
        </section>

        <section className={styles.card}>
          <h2>{t.photos}</h2>
          <p className={styles.small}>{t.reuse}</p>
          <label className={styles.label}>{t.choose}
            <select className={styles.textInput} value={target} onChange={event=>setTarget(event.target.value)}>
              {selectable.map(item=><option value={item.key} key={item.key}>{item.label}</option>)}
            </select>
          </label>
          <div className={styles.actionRow}>
            <button type="button" onClick={()=>inputRef.current?.click()} disabled={processing||project.assets.length>=40}>
              <ImagePlus size={17} aria-hidden="true"/>{processing?t.pending:t.add}
            </button>
            <button type="button" onClick={()=>clear(target)} disabled={!project.assignments[target]}>
              <Trash2 size={16} aria-hidden="true"/>{t.remove}
            </button>
          </div>
          <input ref={inputRef} className={styles.srOnly} type="file" accept="image/*" multiple onChange={onChangeFiles}/>
          <div className={styles.library} data-photo-mandala-library>
            {project.assets.map(asset=><div key={asset.id} className={styles.asset}>
              <button type="button" className={styles.assetPick} draggable onDragStart={event=>{
                event.dataTransfer.setData("application/x-hh-mandala-photo",asset.id);event.dataTransfer.effectAllowed="copy";
              }} onClick={()=>assign(target,asset.id)} aria-label={t.assign+": "+asset.name}>
                <img alt="" src={asset.data} draggable={false}/>
                <span title={asset.name}>{asset.name}</span>
              </button>
              <button type="button" className={styles.assetDelete} aria-label={t.removePhoto+": "+asset.name}
                onClick={()=>dropLibraryImage(asset.id)}><Trash2 size={15} aria-hidden="true"/></button>
            </div>)}
          </div>
          {empty?<p className={styles.small}>{t.empty}</p>:null}
        </section>

        <section className={styles.card}>
          <h2>{t.adjust}</h2>
          <p className={styles.small}>{targetLabel(target)}</p>
          <Slider label={t.zoom} value={transformFor(target).zoom} min={.65} max={4} step={.05}
            onChange={zoom=>updateTransform(target,{zoom})}/>
          <Slider label={t.x} value={transformFor(target).x} min={0} max={100} onChange={x=>updateTransform(target,{x})}/>
          <Slider label={t.y} value={transformFor(target).y} min={0} max={100} onChange={y=>updateTransform(target,{y})}/>
          <Slider label={t.rotate} value={transformFor(target).rotate} min={-180} max={180} step={5}
            onChange={rotate=>updateTransform(target,{rotate})}/>
          <button type="button" onClick={()=>updateTransform(target,defaultTransform())}>
            <RotateCcw size={16} aria-hidden="true"/> {locale==="ru"?"Сбросить":locale==="es"?"Restablecer":"Reset"}
          </button>
          <div className={styles.separator}/>
          <Slider label={t.slotScale} value={project.slotScale} min={.35} max={1.85} step={.05}
            onChange={v=>set("slotScale",v)}/>
          <Slider label={t.fieldScale} value={project.fieldScale} min={48} max={145} onChange={v=>set("fieldScale",v)}/>
          <Slider label={t.centerScale} value={project.centerFrameScale} min={.72} max={3.7} step={.05}
            onChange={v=>set("centerFrameScale",v)}/>
          <Slider label={t.photoScale} value={project.centerImageScale} min={.65} max={4} step={.05}
            onChange={v=>set("centerImageScale",v)}/>
          <div className={styles.groupTitle}>{t.layers}</div>
          <div className={styles.checks}>
            {([{key:"center",label:t.showCenter},{key:"slots",label:t.showSlots},
              {key:"inner",label:t.showInner},{key:"outer",label:t.showOuter}] as const).map(item=>
              <label key={item.key}><input type="checkbox" checked={project.visible[item.key]}
                onChange={event=>set("visible",{...project.visible,[item.key]:event.target.checked})}/>{item.label}</label>)}
          </div>
        </section>

        <section className={styles.card}>
          <h2>{t.saved}</h2>
          <div className={styles.actionRow}>
            <button type="button" onClick={newProject}>{t.new}</button>
            <button type="button" onClick={exportProject}><Download size={16} aria-hidden="true"/>{t.exportJSON}</button>
            <button type="button" onClick={()=>jsonRef.current?.click()}><Upload size={16} aria-hidden="true"/>{t.importJSON}</button>
            <input ref={jsonRef} className={styles.srOnly} type="file" accept=".json,application/json" onChange={event=>void importProject(event)}/>
          </div>
          <div className={styles.savedList}>
            {saved.map(item=><div className={styles.savedRow} key={item.id}>
              <span>{item.title||t.namePlaceholder}</span>
              <button type="button" onClick={()=>void openSaved(item.id)}>{t.load}</button>
              <button type="button" aria-label={t.delete+": "+item.title} onClick={()=>void removeSaved(item.id)}>
                <Trash2 size={15} aria-hidden="true"/>
              </button>
            </div>)}
          </div>
          {!saved.length?<p className={styles.small}>{t.nothing}</p>:null}
        </section>
      </div>
    </div>
    <p className={styles.privacy}>{t.privacy}</p>
  </section>;
}
