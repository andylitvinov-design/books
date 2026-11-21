"use client";

import {useEffect,useMemo,useState} from "react";
import type {PublicLocale} from "@/lib/public-locales";
import {
  OPENMOTION_REFERENCE_COLLECTIONS,OPENMOTION_REFERENCE_COUNT,OPENMOTION_GUIDE_COUNT,
  listOpenMotionReferences,planOpenMotionReferenceSelection,
  type OpenMotionLocalSelection,
} from "@/lib/mandala/openmotion-reference.mjs";
import {createPresetMotionGuideV3,importCatalogMotionGuideV3,listPresetMotionGuides,moveMotionGuideScene,replaceMotionGuideScene,searchMotionGuideScenes,getPublishedStandardMotionMaster} from "@/lib/mandala/openmotion-preset-guide.mjs";
import css from "./mandala-openmotion-picker.module.css";

type EditableGuide={markdown:string;aspect:"portrait"|"landscape"|"square";
  clips:{id:string;assetId:string;canMoveEarlier:boolean;canMoveLater:boolean}[]};

type Props={
  locale:PublicLocale;
  disabled:boolean;
  onPick:(selection:OpenMotionLocalSelection)=>void;
  exportReady:boolean;
  onExport:(id:string,aspect:"portrait"|"landscape"|"square",markdown?:string)=>void;
};

const words={
  en:{
    standardPlay:"Play finished standard MP4",standardDownload:"Download fixed MP4",standardNotice:"Verified English 30s film, not personalized. Physical iPhone save test pending.",standardPending:"Standard file is published in English only; local export remains available in your language.",
    editPreset:"Edit in Studio",replaceScene:"Scene to replace",undoScene:"Undo scene edit",
    earlier:"Move earlier",later:"Move later",
    sceneSearch:"Catalog scenes for Motion.md",
    importGuide:"Import Motion.md",importedRender:"Render imported MP4",importError:"The Motion.md guide or its assets are unsupported.",
    templates:"Holistic House templates",downloadGuide:"Download Motion.md",renderPreset:"Render template MP4",
    title:"OpenMotion ideas",intro:"Explore external video references, then make your own original film using Holistic House's free scenes and editor.",
    caution:"These are video references, not licensed footage or guaranteed editable templates. Local results adapt the rhythm and format, not the original brand visuals.",
    search:"Find a video style",searchHint:"Search title, movement or creator",
    choose:"Make my version",watch:"Watch reference",none:"No matching references",all:"All",
    groups:{reference:"Reference",moment:"Short moments",example:"Examples",block:"Blocks",component:"Components"},
    previous:"Previous",next:"Next",of:"of",guide:"Motion.md guides",guideLink:"Browse guides at OpenMotion",
    external:"External video — original rights holder",source:"Original source",count:"public reference entries",approx:"Local adaptation",
  },
  ru:{
    standardPlay:"Посмотреть готовый MP4",standardDownload:"Скачать стандартный MP4",standardNotice:"Готовый английский фильм 30 с без персонализации. Проверка iPhone ещё ожидается.",standardPending:"Готовый стандартный MP4 пока на английском; русская сборка доступна локально.",
    editPreset:"Редактировать в Studio",replaceScene:"Сцена для замены",undoScene:"Отменить правку сцены",
    earlier:"Сдвинуть раньше",later:"Сдвинуть позже",
    sceneSearch:"Каталожные сцены для Motion.md",
    importGuide:"Загрузить Motion.md",importedRender:"Собрать загруженный MP4",importError:"Формат Motion.md или исходники не поддерживаются.",
    templates:"Шаблоны Holistic House",downloadGuide:"Скачать Motion.md",renderPreset:"Собрать шаблон в MP4",
    title:"Идеи OpenMotion",intro:"Посмотрите внешние видеореференсы и создайте собственный ролик из наших бесплатных сцен в редакторе Holistic House.",
    caution:"Это примеры движения, а не лицензированные исходники и не обязательно редактируемые проекты. Локальное видео повторяет общий ритм и формат, а не чужой бренд.",
    search:"Найти стиль видео",searchHint:"Название, анимация или автор",
    choose:"Создать свою версию",watch:"Смотреть пример",none:"Ничего не найдено",all:"Все",
    groups:{reference:"Референсы",moment:"Короткие моменты",example:"Примеры",block:"Блоки",component:"Компоненты"},
    previous:"Назад",next:"Дальше",of:"из",guide:"Гайды Motion.md",guideLink:"Смотреть гайды OpenMotion",
    external:"Внешнее видео — права у автора",source:"Источник",count:"видеореференсов",approx:"Локальная адаптация",
  },
  es:{
    standardPlay:"Ver película MP4 estándar",standardDownload:"Descargar MP4 estándar",standardNotice:"Película fija en inglés verificada; no personalizada. Pendiente la prueba física del iPhone.",standardPending:"MP4 estándar publicado solo en inglés; puedes crear el vídeo localmente en español.",
    editPreset:"Editar en Studio",replaceScene:"Escena que se reemplazará",undoScene:"Deshacer edición de escena",
    earlier:"Mover antes",later:"Mover después",
    sceneSearch:"Escenas del catálogo para Motion.md",
    importGuide:"Importar Motion.md",importedRender:"Crear MP4 importado",importError:"La guía Motion.md o sus recursos no son compatibles.",
    templates:"Plantillas de Holistic House",downloadGuide:"Descargar Motion.md",renderPreset:"Crear MP4 de la plantilla",
    title:"Ideas OpenMotion",intro:"Explora vídeos externos y crea tu propia película con escenas originales en el editor gratuito de Holistic House.",
    caution:"Son referencias, no material con licencia para reutilizar ni proyectos editables garantizados. La versión local adapta el ritmo y el formato, no la marca.",
    search:"Buscar estilo de vídeo",searchHint:"Título, movimiento o creador",
    choose:"Crear mi versión",watch:"Ver referencia",none:"Sin resultados",all:"Todos",
    groups:{reference:"Referencias",moment:"Momentos",example:"Ejemplos",block:"Bloques",component:"Componentes"},
    previous:"Anterior",next:"Siguiente",of:"de",guide:"Guías Motion.md",guideLink:"Ver guías OpenMotion",
    external:"Vídeo externo — derechos de autor",source:"Origen",count:"referencias",approx:"Adaptación local",
  },
} as const;

export function MandalaOpenMotionPicker({locale,disabled,onPick,exportReady,onExport}:Props){
  const t=words[locale];
  const [query,setQuery]=useState("");
  const [sceneQuery,setSceneQuery]=useState("");
  const [sceneSearchOpen,setSceneSearchOpen]=useState(false);
  const [collection,setCollection]=useState("all");
  const [page,setPage]=useState(0);
  const [selected,setSelected]=useState<string|null>(null);
  const [presetId,setPresetId]=useState("");
  // Opt-in deep link to this reusable public template; never read client data.
  useEffect(()=>{
    if (new URLSearchParams(window.location.search).get("motionPreset")==="anti-stress-30s")
      setPresetId("anti-stress-30s");
  },[]);
  const [imported,setImported]=useState<EditableGuide|null>(null);
  const [previousGuide,setPreviousGuide]=useState<EditableGuide|null>(null);
  const [replaceClipId,setReplaceClipId]=useState("");
  function readEditableGuide(markdown:string):EditableGuide{
    const {project}=importCatalogMotionGuideV3(markdown,"imported-motion",locale);
    return {markdown,aspect:project.aspect,clips:project.videoTracks.flatMap(track=>
      track.clips.map((clip,index)=>({id:clip.id,assetId:clip.assetId,
        canMoveEarlier:index>0,canMoveLater:index<track.clips.length-1})))};

  }
  const [importError,setImportError]=useState(false);
  const activeClip=imported?.clips.find(clip=>clip.id===replaceClipId);
  const presets=useMemo(()=>listPresetMotionGuides(locale),[locale]);
  const selectedPreset=presets.find(preset=>preset.id===presetId);
  const publishedMaster=useMemo(()=>getPublishedStandardMotionMaster(presetId,locale),[presetId,locale]);
  const scenes=useMemo(()=>sceneSearchOpen
    ?searchMotionGuideScenes(sceneQuery,locale,imported?.aspect??selectedPreset?.aspect??"portrait")
    :[],[sceneSearchOpen,sceneQuery,locale,imported?.aspect,selectedPreset?.aspect]);
  const guideHref=useMemo(()=>presetId
    ?"data:text/markdown;charset=utf-8,"+encodeURIComponent(createPresetMotionGuideV3(presetId,locale))
    :null,[presetId,locale]);
  const perPage=12;
  const {items,total}=useMemo(
    ()=>listOpenMotionReferences({query,collection,offset:page*perPage,limit:perPage}),
    [query,collection,page],
  );
  const pages=Math.max(1,Math.ceil(total/perPage));
  return <section className={css.library} data-openmotion-library-loaded aria-label={t.title}>
    <div className={css.intro}>
      <h4>{t.title}</h4>
      <p>{t.intro}</p>
      <small>{OPENMOTION_REFERENCE_COUNT} {t.count} · {OPENMOTION_GUIDE_COUNT} {t.guide}</small>
    </div>
    <label className={css.searchLabel} htmlFor="openmotion-library-search">{t.search}</label>
    <input id="openmotion-library-search" className={css.search} type="search" value={query}
      placeholder={t.searchHint} maxLength={100}
      onChange={event=>{setQuery(event.currentTarget.value);setPage(0);}}/>
    <div className={css.filters} role="group" aria-label={t.search}>
      {OPENMOTION_REFERENCE_COLLECTIONS.map(group=>
        <button key={group} type="button" aria-pressed={collection===group}
          onClick={()=>{setCollection(group);setPage(0);}} disabled={disabled}
          className={collection===group?css.active:""}>
          {group==="all"?t.all:t.groups[group as keyof typeof t.groups]}
        </button>)}
    </div>
    <p className={css.notice}>{t.caution}</p>
    {items.length?<div className={css.grid} role="list">
      {items.map(item=>{
        const choice=planOpenMotionReferenceSelection(item.id,locale);
        return <article key={item.id} role="listitem" className={css.card} data-motion-reference={item.id}>
          <strong>{item.title}</strong>
          <div className={css.meta}>
            <span>{item.seconds>0?item.seconds+"s · ":""}{item.ratio||"16/9"}</span>
            {item.source?<span>{item.source}</span>:null}
          </div>
          {item.description?<p className={css.description}>{item.description}</p>:null}
          {item.mechanics.length?<p className={css.mechanics}>{item.mechanics.slice(0,3).map(x=>x.replaceAll("_"," ")).join(" · ")}</p>:null}
          <div className={css.actions}>
            {item.preview?<a href={item.preview} target="_blank" rel="noopener noreferrer"
              referrerPolicy="no-referrer" aria-label={t.watch+": "+item.title}
              title={t.external}>{t.watch}</a>:null}
            <button type="button" disabled={disabled||!choice}
              aria-pressed={selected===item.id}
              onClick={()=>{if(choice){setSelected(item.id);onPick(choice);}}}>
              {t.choose}
            </button>
          </div>
        </article>;
      })}
    </div>:<p role="status" className={css.notice}>{t.none}</p>}
    <div className={css.paging}>
      <button type="button" disabled={page===0}
        onClick={()=>setPage(i=>Math.max(0,i-1))}>{t.previous}</button>
      <span aria-live="polite">{total?Math.min(page+1,pages):0} {t.of} {total?pages:0}</span>
      <button type="button" disabled={page+1>=pages}
        onClick={()=>setPage(i=>Math.min(pages-1,i+1))}>{t.next}</button>
    </div>
    <label className={css.searchLabel}>
      {t.templates}
      <select className={css.search} value={presetId} disabled={disabled}
        onChange={event=>setPresetId(event.currentTarget.value)}>
        <option value="" disabled>—</option>
        {presets.map(preset=><option key={preset.id} value={preset.id}>{preset.label}</option>)}
      </select>
    </label>
    {guideHref&&selectedPreset&&!disabled?<div className={css.actions}>
      <button type="button" data-openmotion-render-preset disabled={!exportReady}
        onClick={()=>onExport(selectedPreset.id,selectedPreset.aspect)}>{t.renderPreset}</button>
      <button type="button" data-openmotion-edit-preset onClick={()=>{
        setImported(readEditableGuide(createPresetMotionGuideV3(selectedPreset.id,locale)));
        setPreviousGuide(null);
        setReplaceClipId("");
        setImportError(false);
      }}>{t.editPreset}</button>
      <a data-openmotion-download-guide href={guideHref} download={presetId+".Motion.md"}>
        {t.downloadGuide}
      </a>
    </div>:null}
    {publishedMaster&&!disabled?<div className={css.actions} data-openmotion-published-standard-master>
      <a data-openmotion-play-standard href={publishedMaster.path} target="_blank" rel="noopener noreferrer">
        {t.standardPlay}</a>
      <a data-openmotion-download-standard href={publishedMaster.path}
        download={presetId+"-"+locale+".mp4"}>{t.standardDownload}</a>
      <p className={css.notice}>{t.standardNotice}</p>
    </div>:null}
    {selectedPreset?.id==="anti-stress-30s"&&!publishedMaster?<p role="status" className={css.notice}>{t.standardPending}</p>:null}
    <div className={css.actions}>
      <label>
        {t.importGuide}
        <input type="file" accept=".md,text/markdown" data-openmotion-import-guide disabled={disabled}
          onChange={async event=>{
            const input=event.currentTarget;
            const file=input.files?.[0];
            input.value="";
            if(!file)return;
            setImported(null);
            setPreviousGuide(null);
            setReplaceClipId("");
            setImportError(false);
            try{
              if(file.size>65536)throw Error("motion_guide_size");
              const markdown=await file.text();
              setImported(readEditableGuide(markdown));
            }catch{setImportError(true);}
          }}/>
      </label>
      {importError?<span role="alert">{t.importError}</span>:null}
      {imported?<button type="button" data-openmotion-render-imported disabled={disabled||!exportReady}
        onClick={()=>onExport("imported-motion",imported.aspect,imported.markdown)}>{t.importedRender}</button>:null}
    </div>
    <details onToggle={event=>setSceneSearchOpen(event.currentTarget.open)}>
      <summary>{t.sceneSearch}</summary>
      {sceneSearchOpen?<div>
        <input type="search" className={css.search} aria-label={t.sceneSearch}
          value={sceneQuery} maxLength={100} onChange={event=>setSceneQuery(event.currentTarget.value)}/>
        {imported?.clips.length?<label>{t.replaceScene}
          <select data-openmotion-replace-clip value={replaceClipId} disabled={disabled}
            onChange={event=>setReplaceClipId(event.currentTarget.value)}>
            <option value="">—</option>
            {imported.clips.map(clip=><option key={clip.id} value={clip.id}>{clip.id} · {clip.assetId}</option>)}
          </select>
        </label>:null}
        {imported&&activeClip?<div className={css.actions}>
          {([-1,1] as const).map(direction=><button key={direction} type="button"
            disabled={disabled||!(direction<0?activeClip.canMoveEarlier:activeClip.canMoveLater)}
            data-openmotion-move-scene={direction} onClick={()=>{
              try{
                const edited=moveMotionGuideScene(imported.markdown,replaceClipId,direction,locale);
                setPreviousGuide(imported);setImported(readEditableGuide(edited));setImportError(false);
              }catch{setImportError(true);}
            }}>{direction<0?t.earlier:t.later}</button>)}
        </div>:null}
        {previousGuide?<button type="button" data-openmotion-undo-scene disabled={disabled} onClick={()=>{
          setImported(previousGuide);setPreviousGuide(null);setImportError(false);
        }}>{t.undoScene}</button>:null}
        {scenes.length?<ul>{scenes.map(scene=><li key={scene.id}>
          {imported&&replaceClipId?<button type="button" data-openmotion-replace-scene={scene.id}
            disabled={disabled} onClick={()=>{
              try{
                const edited=replaceMotionGuideScene(imported.markdown,replaceClipId,scene.id,locale);
                const next=readEditableGuide(edited);
                setPreviousGuide(imported);setImported(next);setImportError(false);
              }catch{setImportError(true);}
            }}>{scene.label}</button>:scene.label} <code>{scene.id}</code>
        </li>)}</ul>
          :<p role="status">{t.none}</p>}
      </div>:null}
    </details>
    <p className={css.footer}>{t.guide}: <a target="_blank" rel="noopener noreferrer"
      href="https://github.com/nexu-io/openmotion/tree/main/library/templates/catalog">
      {t.guideLink}</a> · {t.approx}</p>
  </section>;
}
