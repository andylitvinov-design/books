/**
 * Mentalica photo-mandala layout contract.
 * The coordinates below are transcribed verbatim from
 * andylitvinov-design/reiki-yggdrasil/src/profileMandalaWorkspace.css
 * (the .geometry-* and .mandala-style-2/3 .source-* selectors).
 * The source project uses slot IDs client-1..client-N.
 * Keep this pure module usable by the browser canvas exporter and Node tests.
 */
export const MENTALICA_GEOMETRIES = Object.freeze([2, 4, 6, 8, 12]);
export const MENTALICA_STYLES = Object.freeze(["style-1", "style-2", "style-3"]);
const POSITIONS = {
  "style-1": {
    "2": [
      [
        50,
        15
      ],
      [
        50,
        85
      ]
    ],
    "4": [
      [
        50,
        13
      ],
      [
        87,
        50
      ],
      [
        50,
        87
      ],
      [
        13,
        50
      ]
    ],
    "6": [
      [
        50,
        12
      ],
      [
        83,
        31
      ],
      [
        83,
        69
      ],
      [
        50,
        88
      ],
      [
        17,
        69
      ],
      [
        17,
        31
      ]
    ],
    "8": [
      [
        50,
        10
      ],
      [
        78,
        22
      ],
      [
        90,
        50
      ],
      [
        78,
        78
      ],
      [
        50,
        90
      ],
      [
        22,
        78
      ],
      [
        10,
        50
      ],
      [
        22,
        22
      ]
    ],
    "12": [
      [
        50,
        10
      ],
      [
        76,
        24
      ],
      [
        90,
        50
      ],
      [
        76,
        76
      ],
      [
        50,
        90
      ],
      [
        24,
        76
      ],
      [
        10,
        50
      ],
      [
        24,
        24
      ],
      [
        15,
        15
      ],
      [
        85,
        15
      ],
      [
        85,
        85
      ],
      [
        15,
        85
      ]
    ]
  },
  "style-2": {
    "2": [
      [
        25,
        25
      ],
      [
        75,
        75
      ]
    ],
    "4": [
      [
        25,
        25
      ],
      [
        75,
        25
      ],
      [
        75,
        75
      ],
      [
        25,
        75
      ]
    ],
    "6": [
      [
        50,
        8
      ],
      [
        88,
        74
      ],
      [
        12,
        74
      ],
      [
        50,
        92
      ],
      [
        12,
        26
      ],
      [
        88,
        26
      ]
    ],
    "8": [
      [
        25,
        14
      ],
      [
        75,
        14
      ],
      [
        86,
        50
      ],
      [
        75,
        86
      ],
      [
        25,
        86
      ],
      [
        14,
        50
      ],
      [
        25,
        25
      ],
      [
        75,
        25
      ]
    ],
    "12": [
      [
        50,
        8
      ],
      [
        79,
        21
      ],
      [
        92,
        50
      ],
      [
        79,
        79
      ],
      [
        50,
        92
      ],
      [
        21,
        79
      ],
      [
        8,
        50
      ],
      [
        21,
        21
      ],
      [
        50,
        20
      ],
      [
        80,
        50
      ],
      [
        50,
        80
      ],
      [
        20,
        50
      ]
    ]
  },
  "style-3": {
    "2": [
      [
        50,
        28
      ],
      [
        50,
        72
      ]
    ],
    "4": [
      [
        50,
        24
      ],
      [
        76,
        50
      ],
      [
        50,
        76
      ],
      [
        24,
        50
      ]
    ],
    "6": [
      [
        50,
        18
      ],
      [
        75,
        36
      ],
      [
        75,
        64
      ],
      [
        50,
        82
      ],
      [
        25,
        64
      ],
      [
        25,
        36
      ]
    ],
    "8": [
      [
        50,
        16
      ],
      [
        72,
        28
      ],
      [
        84,
        50
      ],
      [
        72,
        72
      ],
      [
        50,
        84
      ],
      [
        28,
        72
      ],
      [
        16,
        50
      ],
      [
        28,
        28
      ]
    ],
    "12": [
      [
        50,
        14
      ],
      [
        70,
        20
      ],
      [
        84,
        36
      ],
      [
        90,
        56
      ],
      [
        84,
        74
      ],
      [
        70,
        86
      ],
      [
        50,
        90
      ],
      [
        30,
        84
      ],
      [
        16,
        72
      ],
      [
        10,
        55
      ],
      [
        16,
        38
      ],
      [
        30,
        22
      ]
    ]
  }
};
export function mentalicaPhotoSlots(geometry = 4, style = "style-1") {
  const n = MENTALICA_GEOMETRIES.includes(Number(geometry)) ? Number(geometry) : 4;
  const variant = MENTALICA_STYLES.includes(style) ? style : "style-1";
  return POSITIONS[variant][n].map(([x, y], i) => ({
    id: `client-${i + 1}`, label: `Источник ${i + 1}`, x, y
  }));
}
export function clampMentalicaNumber(value, min, max, fallback) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}
export function defaultMentalicaPhotoProject() {
  return {
    version: 1, id: "", title: "", geometry: 4, style: "style-1",
    fieldLayout: "square", centerShape: "circle", constructorType: "client", variant: "classic", tone: "mentalica", fieldScale: 100,
    centerFrameScale: 1, centerImageScale: 1, slotScale: 1,
    visible: { center: true, slots: true, inner: true, outer: true },
    assignments: {}, transforms: {}, assets: []
  };
}
const ASSET_DATA = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const REF_KEYS = /^(?:client-(?:[1-9]|1[0-2])|altar-top-[1-5]|altar-support-[12]|business-(?:goal|function|structure)-[1-3]|zodiac-(?:[1-9]|1[0-2])|zodiac-inner-(?:[1-9]|1[0-2])|zodiac-plus-[1-4]|star-[1-5]|star-extra-[1-5]|chess-(?:[1-9]|1[0-4])|dao-(?:water|wood|fire|earth|metal)|__(?:center_image|inner_cover|outer_cover))$/;
export function sanitizeMentalicaPhotoProject(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw Error("Invalid mandala file");
  const base = defaultMentalicaPhotoProject();
  const assets = Array.isArray(input.assets) ? input.assets : [];
  if (assets.length > 40) throw Error("Too many photographs");
  let bytes = 0;
  const cleanAssets = assets.map(asset => {
    if (!asset || typeof asset !== "object" || typeof asset.id !== "string" ||
        !/^[a-zA-Z0-9_-]{1,100}$/.test(asset.id) || typeof asset.data !== "string" ||
        !ASSET_DATA.test(asset.data) || asset.data.length > 6_000_000) {
      throw Error("Invalid or unsafe image in mandala");
    }
    bytes += asset.data.length;
    return { id: asset.id, name: String(asset.name || "Photo").slice(0,80), data: asset.data };
  });
  if (bytes > 45_000_000) throw Error("Project file too large");
  const assetIDs = new Set(cleanAssets.map(x => x.id));
  const assignments = {};
  for (const [key, value] of Object.entries(input.assignments || {})) {
    if (REF_KEYS.test(key) && typeof value === "string" && assetIDs.has(value)) assignments[key] = value;
  }
  const transforms = {};
  for (const [key, transform] of Object.entries(input.transforms || {})) {
    if (!REF_KEYS.test(key) || !transform || typeof transform !== "object") continue;
    transforms[key] = {
      x: clampMentalicaNumber(transform.x, 0, 100, 50),
      y: clampMentalicaNumber(transform.y, 0, 100, 50),
      zoom: clampMentalicaNumber(transform.zoom, 0.65, 4, 1),
      rotate: clampMentalicaNumber(transform.rotate, -180, 180, 0)
    };
  }
  return {
    ...base,
    id: typeof input.id === "string" ? input.id.slice(0,100) : "",
    title: String(input.title || "").slice(0,100),
    geometry: MENTALICA_GEOMETRIES.includes(Number(input.geometry)) ? Number(input.geometry) : 4,
    style: MENTALICA_STYLES.includes(input.style) ? input.style : "style-1",
    constructorType: MENTALICA_CONSTRUCTOR_TYPES.includes(input.constructorType) ? input.constructorType : "client",
    variant: typeof input.variant === "string" && /^[a-z0-9_-]{1,36}$/.test(input.variant) ? input.variant : "classic",
    tone: MENTALICA_BACKGROUND_TONES.includes(input.tone) ? input.tone : "mentalica",
    fieldLayout: ["square","vertical","horizontal","rectangle"].includes(input.fieldLayout) ? input.fieldLayout : "square",
    centerShape: input.centerShape === "square" ? "square" : "circle",
    fieldScale: clampMentalicaNumber(input.fieldScale, 48, 145, 100),
    centerFrameScale: clampMentalicaNumber(input.centerFrameScale, .72, 3.7, 1),
    centerImageScale: clampMentalicaNumber(input.centerImageScale, .65, 4, 1),
    slotScale: clampMentalicaNumber(input.slotScale, .35, 1.85, 1),
    visible: { center: input.visible?.center !== false, slots: input.visible?.slots !== false,
      inner: input.visible?.inner !== false, outer: input.visible?.outer !== false },
    assignments, transforms, assets: cleanAssets
  };
}


// Source: reiki-yggdrasil ProfileLitePowerPlaceModuleBase buildSlotList and
// profileMandalaWorkspace layouts. Normalized positions drive both preview and PNG;
// legacy client-N layout maps above remain unchanged for saved v1 projects.
export const MENTALICA_CONSTRUCTOR_TYPES = Object.freeze([
  "client", "altar", "business", "zodiac", "star", "chess", "dao", "dao-layout"
]);
export const MENTALICA_BACKGROUND_TONES = Object.freeze([
  "mentalica", "gold", "forest", "night", "fire", "water"
]);
export const MENTALICA_LAYOUT_VARIANTS = Object.freeze({
  client: ["classic"],
  altar: ["classic"],
  business: ["one-zone", "three-zones"],
  zodiac: ["classic", "zodiac-2-12", "plus-8"],
  star: ["closed", "open", "star-2-10"],
  chess: ["classic-14", "classic-8", "plus-8", "compact-5"],
  dao: ["style-1", "style-2", "talisman-1", "talisman-2"],
  "dao-layout": ["roof_double_line", "three_checks"]
});
const imageSlot = (id, label, x, y, diameter = 15.5, shape = "circle") =>
  ({ id, label, x, y, diameter, shape });
const polarSlots = (count, radius, prefix, label, diameter = 15.5) =>
  Array.from({ length: count }, (_, i) => {
    const angle = (-90 + 360 * i / count) * Math.PI / 180;
    return imageSlot(prefix + (i + 1), label + " " + (i + 1),
      50 + radius * Math.cos(angle), 50 + radius * Math.sin(angle), diameter);
  });
const STAR_POSITIONS = [[50,8],[87,36],[72,82],[28,82],[13,36]];
const STAR_INNER = [[50,26],[69,41],[62,65],[38,65],[31,41]];
const line = (...points) => points;

export function mentalicaPhotoLayout(project = {}) {
  const type = MENTALICA_CONSTRUCTOR_TYPES.includes(project.constructorType) ? project.constructorType : "client";
  const possible = MENTALICA_LAYOUT_VARIANTS[type];
  const variant = possible.includes(project.variant) ? project.variant : possible[0];
  const count = MENTALICA_GEOMETRIES.includes(Number(project.geometry)) ? Number(project.geometry) : 4;
  let slots = [];
  let guides = [];
  let fieldShape = "circle";
  let hasRings = false;
  let center = {x:50,y:50,diameter:34};
  if (type === "client") {
    slots = mentalicaPhotoSlots(count, project.style).map(p =>
      imageSlot(p.id, p.label, p.x, p.y, count === 12 ? 12 : 15.5));
    hasRings = true;
  } else if (type === "altar") {
    fieldShape = "rounded";center = {x:50,y:58,diameter:30};
    slots = Array.from({ length: 5 }, (_, i) =>
      imageSlot("altar-top-" + (i + 1), i === 2 ? "Верхний центр" : "Верхний " + (i + 1), 14 + i * 18, 17, i===2?17:13,"square"));
    slots.push(imageSlot("altar-support-1", "Нижняя опора 1", 15, 84, 16,"square"));
    slots.push(imageSlot("altar-support-2", "Нижняя опора 2", 85, 84, 16,"square"));
    guides = [line([10,29],[90,29]),line([18,72],[82,72]),line([50,29],[50,72])];
  } else if (type === "business") {
    fieldShape = "rounded";
    const positions = [{id:"goal",label:"Цель",x:50,y:17},
      {id:"function",label:"Функция / продукт",x:22,y:75},
      {id:"structure",label:"Структура / связи / клиенты",x:78,y:75}];
    const zones = variant === "three-zones" ? 3 : 1;
    slots = positions.flatMap(v => Array.from({length:zones}, (_,i) =>
      imageSlot("business-" + v.id + "-" + (i+1),
        v.label + (zones === 3 ? " · зона " + (i+1) : ""),
        v.x + (zones === 3 ? (i-1)*9 : 0),v.y + (zones === 3 ? (v.y<50?12:-5) : 0), zones === 3?10:18,"square")));
    guides = [line([50,14],[17,80],[83,80],[50,14]),line([50,27],[33,66],[67,66],[50,27])];
  } else if (type === "zodiac") {
    const n = variant === "plus-8" ? 8 : count;
    const radius = variant === "zodiac-2-12" ? 43 : 39;
    slots = polarSlots(n,radius,"zodiac-","Знак",n === 12 ? 12 : 15);
    if (variant === "zodiac-2-12") slots.push(...polarSlots(n,31,"zodiac-inner-","Внутренний",n === 12 ? 10 : 12));
    if (variant === "plus-8") slots.push(...[[26,26],[74,26],[74,74],[26,74]]
      .map(([x,y],i) => imageSlot("zodiac-plus-" + (i+1),"Дополнительный " + (i+1),x,y,11)));
    hasRings = true;
    guides = [line([50,5],[50,95]),line([5,50],[95,50])];
  } else if (type === "star") {
    fieldShape = "rounded";center = {x:50,y:50,diameter:29};
    const starPoints = variant === "open" ?
      [[50,8],[82,34],[72,82],[31,76],[13,36]] : STAR_POSITIONS;
    slots = starPoints.map(([x,y],i) => imageSlot("star-" + (i+1),"Луч " + (i+1),x,y,14,"square"));
    if (variant === "star-2-10") slots.push(...STAR_INNER.map(([x,y],i) =>
      imageSlot("star-extra-" + (i+1),"Дополнительная мандала " + (i+1),x,y,11)));
    guides = [line(...[0,2,4,1,3,0].map(i => STAR_POSITIONS[i])),
      line(...STAR_POSITIONS,STAR_POSITIONS[0])];
  } else if (type === "chess") {
    fieldShape = "rounded";
    if (variant === "plus-8") {
      slots = [[15,15],[85,15],[15,85],[85,85],[39,39],[61,39],[39,61],[61,61]]
        .map(([x,y],i)=>imageSlot("chess-"+(i+1),"Шахматная ячейка "+(i+1),x,y,i<4?22:17,"square"));
      guides=[line([12,12],[88,12],[88,88],[12,88],[12,12]),
              line([32,32],[68,32],[68,68],[32,68],[32,32])];
    } else if (variant === "compact-5") {
      const compact=[[50,17],[76,42],[65,76],[35,76],[24,42]];
      slots=compact.map(([x,y],i)=>imageSlot("chess-"+(i+1),"Мандала "+(i+1),x,y,22,"square"));
      guides=[line(...compact,compact[0])];
    } else {
      const rows=variant === "classic-14" ? 5 : 3;
      let index=0;
      for(let row=0;row<rows;row++)for(let col=0;col<3;col++){
        if(row===Math.floor(rows/2)&&col===1)continue;
        index++;
        slots.push(imageSlot("chess-"+index,"Шахматная ячейка "+index,
          (col+.5)*100/3,(row+.5)*100/rows,rows===5?16:23,"square"));
      }
      for(let c=1;c<3;c++)guides.push(line([c*100/3,0],[c*100/3,100]));
      for(let row=1;row<rows;row++)guides.push(line([0,row*100/rows],[100,row*100/rows]));
    }
  } else if (type === "dao" || type === "dao-layout") {
    fieldShape = type === "dao-layout" ? "scroll" : "circle";
    const elements=[["water","Вода"],["wood","Дерево"],["fire","Огонь"],["earth","Земля"],["metal","Металл"]];
    const points=type === "dao-layout" ? [[50,20],[72,38],[62,75],[38,75],[28,38]] :
      [[50,14],[83,39],[75,81],[25,81],[17,39]];
    slots=elements.map(([id,label],i)=>imageSlot("dao-"+id,label,points[i][0],points[i][1],16));
    guides = type === "dao-layout"
      ? [line([22,12],[50,5],[78,12]),line([50,8],[50,91]),line([22,88],[78,88])]
      : [line(...[0,2,4,1,3,0].map(i => STAR_POSITIONS[i]))];
    if(variant === "talisman-2") guides.push(line([50,7],[50,94]));
    if(variant === "style-2") guides.push(line([12,50],[88,50]));
  }
  return { type, variant, slots, guides, fieldShape, hasRings, center };
}
