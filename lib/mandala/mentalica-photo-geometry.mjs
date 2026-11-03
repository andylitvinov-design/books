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
    fieldLayout: "square", centerShape: "circle", fieldScale: 100,
    centerFrameScale: 1, centerImageScale: 1, slotScale: 1,
    visible: { center: true, slots: true, inner: true, outer: true },
    assignments: {}, transforms: {}, assets: []
  };
}
const ASSET_DATA = /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;
const REF_KEYS = /^client-(?:[1-9]|1[0-2])$|^__(?:center_image|inner_cover|outer_cover)$/;
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
    fieldLayout: ["square","vertical","horizontal"].includes(input.fieldLayout) ? input.fieldLayout : "square",
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
