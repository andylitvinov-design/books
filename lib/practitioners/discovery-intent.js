
/**
 * Legacy approved offerings are not required to have goal tags. A broad topic
 * fallback is shown only where the practitioner has not provided specific
 * goal tags; it never invents qualifications or expected treatment outcomes.
 */
export const DEFAULT_GOAL_AREAS = Object.freeze({
  confidence:['personal_development','emotional_psychological'],
  relationships:['relationships'],
  relaxation:['body_somatic','emotional_psychological'],
  learning:['energy_spiritual','personal_development'],
  clarity:['personal_development','career_purpose'],
  purpose:['career_purpose','personal_development'],
  energy:['energy_spiritual','body_somatic'],
  self_awareness:['personal_development','homeopathy_holistic'],
});
export function serviceMatchesGoal(service,goal){
  if(!goal)return true
  const declared=Array.isArray(service?.goals)?service.goals:[]
  if(declared.length)return declared.includes(goal)
  return (DEFAULT_GOAL_AREAS[goal]||[]).includes(service?.areaKey)
}

/**
 * Public-service intent matching. Deliberately local: no message leaves the
 * visitor's browser and nothing is stored, tracked, inferred as a diagnosis,
 * or silently sent to an AI provider. A separate opt-in provider may rerank.
 */
export const DISCOVERY_AREAS = Object.freeze([
  {
    key:"personal_development",
    label:{en:"Personal growth",ru:"Личностный рост",es:"Crecimiento personal"},
    short:{en:"Confidence, change and new direction",ru:"Опора, уверенность и перемены",es:"Confianza, cambios y nuevos pasos"},
    terms:["личност","саморазвит","самореал","уверенн","самооцен","осознан","опор","ресурс","потенциал","изменить жизн","рост","предназначен","мотивац","growth","self develop","confidence","self esteem","life direction","personal change","inner resource","purpose","crecimiento","confianza","desarrollo personal","autoestima","propósito"],
  },
  {
    key:"energy_spiritual",
    label:{en:"Energy & Reiki",ru:"Энергопрактики и Рейки",es:"Energía y Reiki"},
    short:{en:"Reiki, meditations and initiations",ru:"Рейки, медитации, инициации",es:"Reiki, meditación e iniciaciones"},
    terms:["рейк","энергет","энергокорр","энергопрак","энергобаланс","кундалин","поток","чакр","медитац","инициац","посвящени","иггдрас","йггдрас","рунич","тантра","энерги","reiki","energywork","energy work","energy balance","kundalini","chakra","meditat","initiat","yggdrasil","tantra","energía","equilibrio energético","iniciación","meditación","espiritual"],
  },
  {
    key:"emotional_psychological",
    label:{en:"Emotional balance",ru:"Эмоции и внутренняя опора",es:"Equilibrio emocional"},
    short:{en:"Stress and self-understanding",ru:"Стресс, чувства, самоисследование",es:"Estrés, emociones y autocuidado"},
    terms:["стресс","тревог","беспокой","напряжен","подавлен","эмоци","чувств","страх","выгора","устал","стыд","внутренн","психолог","пережив","stress","anxiety","emotion","burnout","fear","self awareness","emotional","worry","estrés","ansiedad","emocion","agotamiento","miedo"],
  },
  {
    key:"relationships",
    label:{en:"Relationships & constellations",ru:"Отношения и расстановки",es:"Relaciones y constelaciones"},
    short:{en:"Relationships, family and patterns",ru:"Семья, отношения и повторяющиеся сценарии",es:"Familia, vínculos y patrones"},
    terms:["отношен","семейн","партнер","партнёр","близост","любов","одиноч","развод","конфликт","созавис","расстанов","родов","сценари","отношени","relationship","love","family","partner","intimacy","connection","loneliness","constellation","attachment","couple","amor","relación","familia","pareja","constelación","vínculo","soledad"],
  },
  {
    key:"body_somatic",
    label:{en:"Body & somatic practices",ru:"Тело и соматические практики",es:"Cuerpo y prácticas somáticas"},
    short:{en:"Grounding, embodiment and relaxation",ru:"Расслабление, контакт с телом, заземление",es:"Relajación, movimiento y presencia"},
    terms:["телесн","соматик","мышечн","расслабл","дыхател","дыхан","движен","заземл","прикоснов","массаж","телом","body","somatic","breath","relax","grounding","embodiment","massage","movement","cuerpo","somático","respiración","relajación","movimiento"],
  },
  {
    key:"homeopathy_holistic",
    label:{en:"Holistic & Wu Xing",ru:"Холистический подход и У-Син",es:"Bienestar holístico y Wu Xing"},
    short:{en:"Resource exploration and complementary approaches",ru:"Ресурсный профиль, У-Син и дополнительные подходы",es:"Autoconocimiento, recursos y enfoques complementarios"},
    terms:["усин","у син","у-син","дао","гомеопат","психогомеопат","холистич","баланс ресурс","элемент","символическ","wu xing","five elements","dao","tao","homeopath","holistic","complementary","cinco elementos","homeopatía","holístico","recursos"],
  },
  {
    key:"career_purpose",
    label:{en:"Purpose & career",ru:"Призвание и карьера",es:"Propósito y carrera"},
    short:{en:"Decisions, direction and goals",ru:"Решения, цели, предназначение",es:"Decisiones, metas y dirección"},
    terms:["карьер","професс","работ","выбор пути","поиск себя","предназначен","цель","решени","career","work","job","calling","purpose","decision","goal","trabajo","carrera","vocación","decisión","meta"],
  },
  {
    key:"business_money",
    label:{en:"Goals & business",ru:"Цели и бизнес",es:"Metas y negocios"},
    short:{en:"Projects and business constellations",ru:"Проекты, бизнес-расстановки и решения",es:"Proyectos, constelaciones y decisiones"},
    terms:["бизнес","деньг","проект","предприним","финанс","бизнес расстанов","business","enterprise","startup","money","project","business constellation","negocio","dinero","proyecto","emprender","empresa"],
  },
]);

export const EDITORIAL_AREAS = Object.freeze({
  situation:"emotional_psychological",
  dao:"homeopathy_holistic",
  alchemy:"relationships",
  hypnotherapy:"personal_development",
  business:"business_money",
  imagery:"personal_development",
  psychohomeopathy:"homeopathy_holistic",
  constellations:"relationships",
  yggdrasil:"energy_spiritual",
  tantra:"energy_spiritual",
});

export function normalizeDiscoveryInput(value) {
  return String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ё/g, "е")
    .replace(/[^a-zа-я0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function classifyDiscoveryIntent(query) {
  const normal = normalizeDiscoveryInput(String(query ?? "").slice(0, 350));
  if (!normal) return [];
  return DISCOVERY_AREAS
    .map((group) => {
      const found = group.terms.filter((term) => normal.includes(normalizeDiscoveryInput(term)));
      return {key:group.key, score:Math.min(found.length, 5)*4, matchedTerms:found.slice(0,3)};
    })
    .filter((area) => area.score > 0)
    .sort((a,b) => b.score - a.score || a.key.localeCompare(b.key));
}

function overlaps(text, query) {
  const item = normalizeDiscoveryInput(text);
  const terms = normalizeDiscoveryInput(query).split(" ").filter((v) => v.length >= 4);
  return terms.filter((token) => item.includes(token)).length;
}

export function rankDiscoveryServices(query, services, {category = "", limit = 4} = {}) {
  const intent = classifyDiscoveryIntent(query);
  const normalizedQuery = normalizeDiscoveryInput(query);
  const list = Array.isArray(services) ? services.filter((s) => s && s.id && s.copy?.title && s.practitionerSlug && s.slug) : [];
  const rows = list
    .filter((service) => !category || service.areaKey === category)
    .map((service) => {
      const area = intent.find((item) => item.key === service.areaKey);
      const text = [service.copy.title,service.copy.shortDescription,service.copy.description,service.practitionerName,service.professionalTitle,service.locationLabel].join(" ");
      const direct = overlaps(text, normalizedQuery);
      // A lexical overlap alone must not override a clearly relevant topic.
      const score = (area?.score ?? 0)*3 + Math.min(direct,6)*5 +
        (service.areaKey === "energy_spiritual" || service.areaKey === "personal_development" ? 1 : 0);
      return {service,score,areaKey:service.areaKey,reasonKey:area?"topic":direct?"words":"explore"};
    })
    .sort((a,b) => b.score - a.score || a.service.copy.title.localeCompare(b.service.copy.title));
  if (!normalizedQuery && !category) return rows.filter((r)=>["energy_spiritual","personal_development","relationships","emotional_psychological"].includes(r.areaKey)).slice(0,limit);
  // Unknown free text is not a basis to invent a relevant specialist.
  // Show curated, accurately labeled editorial pages instead of false matches.
  const relevant = normalizedQuery && !category ? rows.filter((r)=>r.score >= 5) : rows;
  return relevant.slice(0,Math.max(0,Math.min(10,limit)));
}

export function rankEditorialDiscovery(query, offers, {category = "", limit = 4} = {}) {
  const areas = classifyDiscoveryIntent(query);
  const ranked = (Array.isArray(offers)? offers : [])
    .filter((offer)=>offer?.id && offer?.href && offer?.title && (!category || offer.areaKey === category))
    .map((offer)=>{
      const a=areas.find(x=>x.key===offer.areaKey);
      const overlap=overlaps([offer.title,offer.promise,offer.benefit].join(" "),query);
      return {...offer,score:(a?.score ?? 0)*3 + overlap*5};
    })
    .sort((a,b)=>b.score-a.score);
  // If a topic was recognized, avoid padding a focused result (e.g. "Love")
  // with unrelated generic suggestions just to fill four rows.
  const focused = !category && areas.length && ranked.some((offer)=>offer.score>0)
    ? ranked.filter((offer)=>offer.score>0)
    : ranked;
  return focused.slice(0,Math.max(0,Math.min(10,limit)));
}

/** Strict service discovery facets; never infer missing in-person locations. */
export function serviceMatchesDiscoveryFacets(service, {
  format = "online", city = "toronto", language = "en", price = "",
} = {}) {
  const delivery = String(service?.deliveryFormat || "").toLowerCase();
  if (format === "online" && delivery !== "online" && delivery !== "hybrid") return false;
  if (format === "in_person" && delivery !== "in_person" && delivery !== "hybrid") return false;
  if (format === "in_person" && city === "toronto" &&
      !/\btoronto\b/i.test(String(service?.locationLabel || ""))) return false;
  if (language && !Array.isArray(service?.languages)) return false;
  if (language && !service.languages.some(code => String(code).trim().toLowerCase() === language.toLowerCase())) return false;

  const isFree = service?.pricingMode === "free" ||
    (service?.pricingMode !== "contact" && service?.confirmedPrice === 0);
  if (price === "free") return isFree;
  if (!price) return true;
  const cap = Number(price);
  if (!Number.isFinite(cap) || cap < 0) return false;
  // A numeric euro cap must not misrepresent amounts in other currencies.
  return isFree || (service?.pricingMode !== "contact" && service?.currency === "EUR" &&
    service?.confirmedPrice != null && Number(service.confirmedPrice) <= cap);
}
