"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, DragEvent, PointerEvent } from "react";
import { Download, ImagePlus, RotateCcw, Save, Trash2, Upload } from "lucide-react";
import type { PublicLocale } from "@/lib/public-locales";
import {
  MENTALICA_GEOMETRIES,
  MENTALICA_STYLES,
  clampMentalicaNumber,
  defaultMentalicaPhotoProject,
  mentalicaPhotoSlots,
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
    square: "Квадрат", vertical: "Вертикально", horizontal: "Горизонтально",
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
    style: "Arrangement style", layout: "Field layout", square: "Square", vertical: "Vertical", horizontal: "Horizontal",
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
    style: "Estilo de distribución", layout: "Forma del campo", square: "Cuadrado", vertical: "Vertical", horizontal: "Horizontal",
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
    const ratio = Math.min(1, 1500 / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * ratio));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw Error("Canvas unavailable");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    // Re-encoding strips EXIF/GPS and avoids persisting huge originals.
    const data = canvas.toDataURL("image/jpeg", 0.78);
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
function drawCropped(ctx: CanvasRenderingContext2D, image: HTMLImageElement, cx: number, cy: number, diameter: number, transform: MentalicaPhotoTransform, isCircle: boolean, zoom: number) {
  ctx.save();
  const half = diameter / 2;
  ctx.beginPath();
  if (isCircle) ctx.arc(cx, cy, half, 0, Math.PI * 2);
  else ctx.rect(cx - half, cy - half, diameter, diameter);
  ctx.clip();
  ctx.translate(cx, cy);
  ctx.rotate(transform.rotate * Math.PI / 180);
  const factor = Math.max(diameter / image.naturalWidth, diameter / image.naturalHeight) * transform.zoom * zoom;
  const width = image.naturalWidth * factor;
  const height = image.naturalHeight * factor;
  ctx.drawImage(image, -width / 2 + (50 - transform.x) / 100 * (width - diameter),
    -height / 2 + (50 - transform.y) / 100 * (height - diameter), width, height);
  ctx.restore();
}
async function renderPng(project: MentalicaPhotoProject): Promise<Blob> {
  const size = 1400;
  const canvas = document.createElement("canvas");
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw Error("Canvas unavailable");
  const images = new Map<string, HTMLImageElement>();
  const assigned = new Set(Object.values(project.assignments));
  await Promise.all(project.assets.filter(asset => assigned.has(asset.id)).map(async asset => images.set(asset.id, await decodeImage(asset.data))));
  const asset = (key: string) => images.get(project.assignments[key] || "");
  const transform = (key: string) => project.transforms[key] || defaultTransform();
  ctx.fillStyle = "#221507";
  ctx.fillRect(0, 0, size, size);
  if (project.visible.outer && asset(OUTER)) drawCropped(ctx, asset(OUTER)!, size / 2, size / 2, size, transform(OUTER), false, 1);
  const unit = size * .86 * project.fieldScale / 100;
  const unitY = unit * (project.fieldLayout === "vertical" ? 1.25 : project.fieldLayout === "horizontal" ? .8 : 1);
  const grad = ctx.createRadialGradient(size/2, size/2, unit*.02, size/2, size/2, Math.max(unit,unitY)*.55);
  grad.addColorStop(0, "#cfb575"); grad.addColorStop(.65, "#6a471f"); grad.addColorStop(1, "#201409");
  ctx.fillStyle = grad;
  ctx.beginPath(); ctx.ellipse(size/2, size/2, unit/2, unitY/2, 0, 0, Math.PI*2); ctx.fill();
  if (project.visible.inner && asset(INNER)) {
    ctx.save();ctx.beginPath();ctx.ellipse(size/2,size/2,unit/2,unitY/2,0,0,Math.PI*2);ctx.clip();
    drawCropped(ctx,asset(INNER)!,size/2,size/2,Math.max(unit,unitY),transform(INNER),false,1);
    ctx.restore();
  }
  ctx.strokeStyle = "rgba(244,214,145,.67)";
  for (const r of [.18,.35,.48]) {
    ctx.lineWidth = r === .48 ? 5 : 2;
    ctx.beginPath();ctx.ellipse(size/2,size/2,unit*r,unitY*r,0,0,Math.PI*2);ctx.stroke();
  }
  if (project.visible.slots) for (const [index, slot] of mentalicaPhotoSlots(project.geometry, project.style).entries()) {
    const x = size / 2 + (slot.x / 100 - .5) * unit;
    const y = size / 2 + (slot.y / 100 - .5) * unitY;
    const diameter = unit * .155 * project.slotScale;
    ctx.fillStyle = "#d6a04b";
    ctx.beginPath();ctx.arc(x,y,diameter*.53,0,Math.PI*2);ctx.fill();
    const picture = asset(slot.id);
    if (picture) drawCropped(ctx,picture,x,y,diameter,transform(slot.id),true,1);
    else {
      ctx.fillStyle = "#3d2918";ctx.beginPath();ctx.arc(x,y,diameter*.49,0,Math.PI*2);ctx.fill();
      ctx.font = "bold " + Math.round(diameter*.32) + "px Arial";ctx.textAlign="center";ctx.textBaseline="middle";
      ctx.fillStyle="#f4d29b";ctx.fillText(String(index+1),x,y);
    }
  }
  if (project.visible.center) {
    const diameter = unit * .34 * project.centerFrameScale;
    ctx.fillStyle="#f5d8a1";ctx.beginPath();
    if (project.centerShape==="square") ctx.rect(size/2-diameter*.525,size/2-diameter*.525,diameter*1.05,diameter*1.05);
    else ctx.arc(size/2,size/2,diameter*.525,0,Math.PI*2);
    ctx.fill();
    const picture = asset(CENTER);
    if (picture) drawCropped(ctx,picture,size/2,size/2,diameter,transform(CENTER),project.centerShape==="circle",project.centerImageScale);
    else {
      ctx.fillStyle="#624528";ctx.beginPath();ctx.arc(size/2,size/2,diameter*.48,0,Math.PI*2);ctx.fill();
    }
  }
  return await new Promise<Blob>((resolve, reject) => canvas.toBlob(b => b ? resolve(b) : reject(new Error("PNG encode failed")), "image/png"));
}
function Slider({ label, value, min, max, step = 1, onChange }: {label: string;value: number;min: number;max: number;step?: number;onChange: (value:number)=>void}) {
  return <label className={styles.slider}><span>{label}<b>{Math.round(value*100)/100}</b></span>
    <input type="range" min={min} max={max} step={step} value={value} onChange={event => onChange(Number(event.target.value))}/></label>;
}
function PreviewPhoto({ data, transform, zoom = 1 }: {data?: string;transform: MentalicaPhotoTransform;zoom?:number}) {
  return data ? <img draggable={false} src={data} alt="" className={styles.image}
    style={{objectPosition:String(transform.x)+"% "+String(transform.y)+"%",transform:"rotate("+transform.rotate+"deg) scale("+(transform.zoom*zoom)+")"}}/> : null;
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
  const slots = useMemo(() => mentalicaPhotoSlots(project.geometry,project.style),[project.geometry,project.style]);
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
      if (!newAssets.length) throw Error("Limit reached");
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
    const copy=sanitizeMentalicaPhotoProject({...project,id:project.id||uuid(),title:project.title||t.namePlaceholder});
    try {
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
  const targetLabel = (key:string) => key===CENTER?t.center:key===INNER?t.inner:key===OUTER?t.outer:t.slot+" "+key.replace("client-","");
  const imageButton = (key:string,label:string,x:number,y:number,isCenter:boolean) => {
    const data=dataFor(key), transform=transformFor(key);
    const dimensions=isCenter?34*project.centerFrameScale:15.5*project.slotScale;
    const zoom=isCenter?project.centerImageScale:1;
    return <button key={key} type="button" data-photo-mandala-slot={key}
      className={styles.slot+(isCenter?" "+styles.center:"")+(target===key?" "+styles.active:"")+(isCenter&&project.centerShape==="square"?" "+styles.square:"")}
      style={{left:String(x)+"%",top:String(y)+"%",width:String(dimensions)+"%",aspectRatio:"1"}}
      aria-label={label} aria-pressed={target===key} title={label}
      onClick={()=>setTarget(key)}
      onDragOver={e=>e.preventDefault()} onDrop={e=>onDropPhoto(e,key)}
      onPointerDown={e=>onPointerDown(e,key)} onPointerMove={e=>onPointerMove(e,key)}
      onPointerUp={onPointerEnd} onPointerCancel={onPointerEnd}>
      <PreviewPhoto data={data} transform={transform} zoom={zoom}/>
      {!data?<span className={styles.placeholder}>{isCenter?t.center:label}</span>:null}
    </button>;
  };
  const selectable=[{key:CENTER,label:t.center},{key:INNER,label:t.inner},{key:OUTER,label:t.outer},
    ...slots.map(slot=>({key:slot.id,label:t.slot+" "+slot.id.replace("client-","")}))];
  const fieldWidth=86*project.fieldScale/100;
  const empty=project.assets.length===0;

  return <section className={styles.workshop} data-mentalica-photo-mandala data-photo-mandala-privacy="local">
    <div className={styles.heading}>
      <span className={styles.kicker}>{t.kicker}</span>
      <h1>{t.title}</h1><p>{t.intro}</p>
    </div>
    <div className={styles.grid}>
      <div className={styles.stageColumn}>
        <div className={styles.stage} data-photo-mandala-stage>
          {project.visible.outer&&dataFor(OUTER)?<div className={styles.outerCover}>
            <PreviewPhoto data={dataFor(OUTER)} transform={transformFor(OUTER)}/></div>:null}
          <div className={styles.field} style={{width:String(fieldWidth)+"%",aspectRatio:project.fieldLayout==="vertical"?"4 / 5":project.fieldLayout==="horizontal"?"5 / 4":"1"}}>
            {project.visible.inner&&dataFor(INNER)?<div className={styles.innerCover}>
              <PreviewPhoto data={dataFor(INNER)} transform={transformFor(INNER)}/></div>:null}
            <span className={styles.ringOne}/><span className={styles.ringTwo}/><span className={styles.ringThree}/>
            {project.visible.slots?slots.map(slot=>imageButton(slot.id,targetLabel(slot.id),slot.x,slot.y,false)):null}
            {project.visible.center?imageButton(CENTER,t.center,50,50,true):null}
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
          <div className={styles.groupTitle}>{t.geometry}</div>
          <div className={styles.pills} role="group" aria-label={t.geometry}>
            {MENTALICA_GEOMETRIES.map(n=><button key={n} type="button" aria-pressed={project.geometry===n}
              onClick={()=>set("geometry",n)}>{n}</button>)}
          </div>
          <div className={styles.groupTitle}>{t.style}</div>
          <div className={styles.pills} role="group" aria-label={t.style}>
            {MENTALICA_STYLES.map((style,i)=><button key={style} type="button" aria-pressed={project.style===style}
              onClick={()=>set("style",style)}>{locale==="ru"?"Стиль":locale==="es"?"Estilo":"Style"} {i+1}</button>)}
          </div>
          <div className={styles.groupTitle}>{t.layout}</div>
          <div className={styles.pills} role="group" aria-label={t.layout}>
            {(["square","vertical","horizontal"] as const).map(k=><button type="button" key={k}
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
