// Illustrative Fu-style designs, not approved SKUs, ready stock or medical claims.
// A practitioner confirms feasibility, finished item, delivery and price.
export const TAOIST_TALISMANS = Object.freeze([
  { id:"fu-prosperity", goal:"Work and money",
    image:"/images/holistic-house/tao-fu-prosperity.webp",
    en:{ title:"Fu · Prosperity & Direction", description:"A Daoist-inspired written symbol for reflecting on your work, financial decisions and next steps." },
    ru:{ title:"Фу · Достаток и путь", description:"Даосский символ для осмысления своих дел, денежных решений и дальнейшего пути." },
    es:{ title:"Fu · Prosperidad y camino", description:"Un símbolo inspirado en el taoísmo para reflexionar sobre el trabajo y tus decisiones económicas." }
  },
  { id:"fu-harmony", goal:"Connection and relationships",
    image:"/images/holistic-house/tao-fu-harmony.webp",
    en:{ title:"Fu · Harmony & Relationships", description:"An intention for kindness, dialogue and balance in relationships, without promising to change others." },
    ru:{ title:"Фу · Гармония и отношения", description:"Символическое напоминание о тепле, диалоге и бережном отношении к себе и другому." },
    es:{ title:"Fu · Armonía y vínculos", description:"Un recordatorio simbólico de la amabilidad, el diálogo y el respeto en las relaciones." }
  },
  { id:"fu-balance", goal:"Inner balance and calm",
    image:"/images/holistic-house/tao-fu-balance.webp",
    en:{ title:"Fu · Energy & Inner Balance", description:"A personal reminder to pause, restore attention and practise self-care. Not a healthcare treatment." },
    ru:{ title:"Фу · Энергия и равновесие", description:"Личный символ для паузы, внимания и бережного отношения к себе. Не медицинское средство." },
    es:{ title:"Fu · Energía y equilibrio", description:"Un símbolo para la pausa, la atención y el autocuidado. No es un tratamiento médico." }
  }
]);
export function talismanFromCatalog(id) {
  return typeof id === "string" ? TAOIST_TALISMANS.find(item => item.id === id) || null : null;
}
