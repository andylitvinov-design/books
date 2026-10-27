// Russian passages below are verbatim teacher replies from the owner's
// manuscript "Даосские коаны-.docx" (Google Drive), grouped by the stages
// documented in "ДАОССКАЯ АЛХИМИЯ.docx". EN/ES are editorial translations.
// These are modern authorial koans, not quotations attributed to Laozi.
export const taoistKoanCards = Object.freeze([
  {
    "id": "spark",
    "stage": 3,
    "title": {
      "ru": "Прометей",
      "en": "Prometheus",
      "es": "Prometeo"
    },
    "text": {
      "en": "Even a single spark is visible in the darkness.",
      "ru": "Даже одна искра видна в темноте.",
      "es": "Hasta una sola chispa se ve en la oscuridad."
    }
  },
  {
    "id": "small-flame",
    "stage": 3,
    "title": {
      "ru": "Прометей",
      "en": "Prometheus",
      "es": "Prometeo"
    },
    "text": {
      "en": "First, learn to sit beside a small flame.",
      "ru": "Сначала научись сидеть рядом с маленьким пламенем.",
      "es": "Primero, aprende a sentarte junto a una llama pequeña."
    }
  },
  {
    "id": "walls",
    "stage": 4,
    "title": {
      "ru": "Крепость",
      "en": "Fortress",
      "es": "Fortaleza"
    },
    "text": {
      "en": "There is strength in the walls.\nThere is life in the space between them.",
      "ru": "В стенах — сила.\nВ пустоте между стенами — жизнь.",
      "es": "En los muros hay fuerza.\nEn el vacío entre ellos hay vida."
    }
  },
  {
    "id": "prison",
    "stage": 4,
    "title": {
      "ru": "Крепость",
      "en": "Fortress",
      "es": "Fortaleza"
    },
    "text": {
      "en": "Are you safe, or are you a prisoner?",
      "ru": "Ты в безопасности или в плену?",
      "es": "¿Estás a salvo o en cautiverio?"
    }
  },
  {
    "id": "open-heart",
    "stage": 5,
    "title": {
      "ru": "Королева в башне",
      "en": "Queen in the Tower",
      "es": "Reina en la torre"
    },
    "text": {
      "en": "If you open the window, the wind will enter. If you open your heart, the world will enter.\nThe walls will remain; loneliness will disappear.",
      "ru": "Если ты откроешь окно, ветер войдёт. Если ты откроешь сердце, мир войдёт.\nСтены не исчезнут — исчезнет одиночество.",
      "es": "Si abres la ventana, entrará el viento. Si abres el corazón, entrará el mundo.\nLos muros no desaparecerán; desaparecerá la soledad."
    }
  },
  {
    "id": "lamp",
    "stage": 5,
    "title": {
      "ru": "Королева в башне",
      "en": "Queen in the Tower",
      "es": "Reina en la torre"
    },
    "text": {
      "en": "When a lamp is lit, it does not search for eyes. It simply shines, and the mist clears by itself.",
      "ru": "Когда светильник горит, он не ищет глаз. Он просто светит, и туман сам становится прозрачным.",
      "es": "Cuando una lámpara está encendida, no busca miradas. Simplemente brilla, y la niebla se despeja por sí sola."
    }
  },
  {
    "id": "boat",
    "stage": 6,
    "title": {
      "ru": "Капитан",
      "en": "Captain",
      "es": "Capitán"
    },
    "text": {
      "en": "The boat is smaller than the sea, yet it is in the boat that you become a captain.",
      "ru": "Лодка меньше моря, но именно в лодке ты становишься Капитаном.",
      "es": "La barca es más pequeña que el mar, pero es en ella donde te conviertes en capitán."
    }
  },
  {
    "id": "quiet-heart",
    "stage": 6,
    "title": {
      "ru": "Капитан",
      "en": "Captain",
      "es": "Capitán"
    },
    "text": {
      "en": "When your steps are gentler than the waves and your heart is quieter than the wind.",
      "ru": "Когда твои шаги мягче волн, а сердце тише ветра.",
      "es": "Cuando tus pasos son más suaves que las olas y tu corazón está más sereno que el viento."
    }
  },
  {
    "id": "flow",
    "stage": 7,
    "title": {
      "ru": "Ручей",
      "en": "Stream",
      "es": "Arroyo"
    },
    "text": {
      "en": "A stream does not search for strength. It simply flows downhill.",
      "ru": "Ручей не ищет силу. Он просто течет вниз.",
      "es": "El arroyo no busca fuerza. Simplemente fluye cuesta abajo."
    }
  },
  {
    "id": "deep-calm",
    "stage": 7,
    "title": {
      "ru": "Ручей",
      "en": "Stream",
      "es": "Arroyo"
    },
    "text": {
      "en": "The wind plays on the surface, but the depths remain calm.",
      "ru": "Ветер играет с поверхностью, но глубина остаётся спокойной.",
      "es": "El viento juega en la superficie, pero las profundidades permanecen serenas."
    }
  },
  {
    "id": "depth",
    "stage": 8,
    "title": {
      "ru": "Река",
      "en": "River",
      "es": "Río"
    },
    "text": {
      "en": "Strength is not in speed.\nStrength is in depth.",
      "ru": "Сила не в скорости.\nСила — в глубине.",
      "es": "La fuerza no está en la velocidad.\nEstá en la profundidad."
    }
  },
  {
    "id": "permission",
    "stage": 8,
    "title": {
      "ru": "Река",
      "en": "River",
      "es": "Río"
    },
    "text": {
      "en": "A river does not ask permission.\nIt simply is.",
      "ru": "Река не просит разрешения.\nОна просто есть.",
      "es": "El río no pide permiso.\nSimplemente existe."
    }
  }
]);

/** Pick uniformly; a manual refresh never repeats the currently shown card. */
export function nextKoanIndex(previousIndex = -1, random = Math.random) {
  const count = taoistKoanCards.length;
  if (count === 0) return -1;
  if (count === 1) return 0;
  const sample = Math.max(0, Math.min(0.9999999999, Number(random()) || 0));
  if (!Number.isInteger(previousIndex) || previousIndex < 0 || previousIndex >= count) {
    return Math.floor(sample * count);
  }
  const candidate = Math.floor(sample * (count - 1));
  return candidate >= previousIndex ? candidate + 1 : candidate;
}
