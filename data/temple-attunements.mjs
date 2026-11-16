// Temple tradition -> deity channel -> individual author-recorded attunement.
// Sources: verified author excerpts from "Античность — модуль 1–2" and "3. Античность".
// Telegram archive records are reused by the public page; their source assets are not duplicated.
// Historical lyric translations, invented coordinates and arbitrary stock imagery are excluded.
import { expandedTempleAttunements } from "./temple-attunements-expansion.mjs";
import { restoredTempleAttunements } from "./temple-attunements-restored.mjs";

export const templeTraditions = Object.freeze([
  {
    "id": "greek",
    "name": {
      "ru": "Греческая",
      "en": "Greek",
      "es": "Griega"
    },
    "channels": [
      {
        "id": "zeus",
        "name": {
          "ru": "Зевс",
          "en": "Zeus",
          "es": "Zeus"
        },
        "aliases": [
          "Зевса",
          "Jupiter"
        ]
      },
      {
        "id": "hera",
        "name": {
          "ru": "Гера",
          "en": "Hera",
          "es": "Hera"
        },
        "aliases": [
          "Геры"
        ]
      },
      {
        "id": "asclepius",
        "name": {
          "ru": "Асклепий",
          "en": "Asclepius",
          "es": "Asclepio"
        },
        "aliases": [
          "Асклепия",
          "Asklepios"
        ]
      },
      {
        "id": "hygieia",
        "name": {
          "ru": "Гигея",
          "en": "Hygieia",
          "es": "Higía"
        },
        "aliases": [
          "Гигеи",
          "Гигиея"
        ]
      },
      {
        "id": "dionysus",
        "name": {
          "ru": "Дионис",
          "en": "Dionysus",
          "es": "Dioniso"
        },
        "aliases": [
          "Диониса",
          "Dionysos"
        ]
      },
      {
        "id": "demeter",
        "name": {
          "ru": "Деметра",
          "en": "Demeter",
          "es": "Deméter"
        },
        "aliases": [
          "Деметры"
        ]
      },
      {
        "id": "athena",
        "name": {
          "ru": "Афина",
          "en": "Athena",
          "es": "Atenea"
        },
        "aliases": [
          "Афины"
        ]
      },
      {
        "id": "aphrodite",
        "name": {
          "ru": "Афродита",
          "en": "Aphrodite",
          "es": "Afrodita"
        },
        "aliases": [
          "Афродиты"
        ]
      },
      {
        "id": "poseidon",
        "name": {
          "ru": "Посейдон",
          "en": "Poseidon",
          "es": "Poseidón"
        },
        "aliases": [
          "Посейдона"
        ]
      },
      {
        "id": "eros",
        "name": {
          "ru": "Эрос",
          "en": "Eros",
          "es": "Eros"
        },
        "aliases": [
          "Эрота"
        ]
      },
      {
        "id": "apollo",
        "name": {
          "ru": "Аполлон",
          "en": "Apollo",
          "es": "Apolo"
        },
        "aliases": [
          "Аполлона"
        ]
      },
      {
        "id": "artemis",
        "name": {
          "ru": "Артемида",
          "en": "Artemis",
          "es": "Artemisa"
        },
        "aliases": [
          "Артемиды"
        ]
      },
      {
        "id": "ares",
        "name": {
          "ru": "Арес",
          "en": "Ares",
          "es": "Ares"
        },
        "aliases": [
          "Ареса"
        ]
      },
      {
        "id": "pan",
        "name": {
          "ru": "Пан",
          "en": "Pan",
          "es": "Pan"
        },
        "aliases": [
          "Пана"
        ]
      },
      {
        "id": "heracles",
        "name": {
          "ru": "Геракл",
          "en": "Heracles",
          "es": "Heracles"
        },
        "aliases": [
          "Геракла",
          "Геркулес"
        ]
      },
      {
        "id": "hermes",
        "name": {
          "ru": "Гермес",
          "en": "Hermes",
          "es": "Hermes"
        },
        "aliases": [
          "Гермеса"
        ]
      },
      {
        "id": "leto",
        "name": {
          "ru": "Лето",
          "en": "Leto",
          "es": "Leto"
        },
        "aliases": [
          "Латона",
          "Латонида"
        ]
      },
      {
        "id": "helios",
        "name": {
          "ru": "Гелиос",
          "en": "Helios",
          "es": "Helios"
        },
        "aliases": [
          "Гелиоса"
        ]
      },
      {
        "id": "tyche",
        "name": {
          "ru": "Тихе",
          "en": "Tyche",
          "es": "Tique"
        },
        "aliases": [
          "Фортуна",
          "Тихи",
          "Тюхе"
        ]
      }
    ]
  },
  {
    "id": "egyptian",
    "name": {
      "ru": "Египетская",
      "en": "Egyptian",
      "es": "Egipcia"
    },
    "channels": [
      {
        "id": "osiris",
        "name": {
          "ru": "Осирис",
          "en": "Osiris",
          "es": "Osiris"
        },
        "aliases": [
          "Осириса"
        ]
      },
      {
        "id": "isis",
        "name": {
          "ru": "Исида",
          "en": "Isis",
          "es": "Isis"
        },
        "aliases": [
          "Исиды"
        ]
      },
      {
        "id": "thoth",
        "name": {
          "ru": "Тот",
          "en": "Thoth",
          "es": "Tot"
        },
        "aliases": [
          "Тота"
        ]
      },
      {
        "id": "horus",
        "name": {
          "ru": "Гор",
          "en": "Horus",
          "es": "Horus"
        },
        "aliases": [
          "Гора"
        ]
      },
      {
        "id": "serapis",
        "name": {
          "ru": "Серапис",
          "en": "Serapis",
          "es": "Serapis"
        },
        "aliases": [
          "Сераписа"
        ]
      },
      {
        "id": "ra",
        "name": {
          "ru": "Ра",
          "en": "Ra",
          "es": "Ra"
        },
        "aliases": []
      },
      {
        "id": "maat",
        "name": {
          "ru": "Маат",
          "en": "Maat",
          "es": "Maat"
        },
        "aliases": [
          "Маат"
        ]
      },
      {
        "id": "ba",
        "name": {
          "ru": "Ба · Полёт души",
          "en": "Ba · Soul flight",
          "es": "Ba · Vuelo del alma"
        },
        "aliases": [
          "Полёт Ба",
          "Полет Ба",
          "Ba flight"
        ]
      }
    ]
  },
  {
    "id": "roman",
    "name": {
      "ru": "Римская",
      "en": "Roman",
      "es": "Romana"
    },
    "channels": [
      {
        "id": "venus",
        "name": {
          "ru": "Венера",
          "en": "Venus",
          "es": "Venus"
        },
        "aliases": [
          "Венеры"
        ]
      },
      {
        "id": "mars",
        "name": {
          "ru": "Марс",
          "en": "Mars",
          "es": "Marte"
        },
        "aliases": [
          "Марса"
        ]
      },
      {
        "id": "minerva",
        "name": {
          "ru": "Минерва",
          "en": "Minerva",
          "es": "Minerva"
        },
        "aliases": [
          "Минервы"
        ]
      },
      {
        "id": "fortuna",
        "name": {
          "ru": "Фортуна",
          "en": "Fortuna",
          "es": "Fortuna"
        },
        "aliases": [
          "Фортуны"
        ]
      },
      {
        "id": "emperor",
        "name": {
          "ru": "Римский император",
          "en": "Roman emperor",
          "es": "Emperador romano"
        },
        "aliases": [
          "Адриан",
          "Император",
          "Траян"
        ]
      },
      {
        "id": "jupiter",
        "name": {
          "ru": "Юпитер",
          "en": "Jupiter",
          "es": "Júpiter"
        },
        "aliases": [
          "Юпитера"
        ]
      }
    ]
  },
  {
    "id": "norse",
    "name": {
      "ru": "Скандинавская",
      "en": "Norse",
      "es": "Nórdica"
    },
    "channels": [
      {
        "id": "odin",
        "name": {
          "ru": "Один",
          "en": "Odin",
          "es": "Odín"
        },
        "aliases": [
          "Одина"
        ]
      },
      {
        "id": "freyja",
        "name": {
          "ru": "Фрейя",
          "en": "Freyja",
          "es": "Freyja"
        },
        "aliases": [
          "Фрейи"
        ]
      },
      {
        "id": "thor",
        "name": {
          "ru": "Тор",
          "en": "Thor",
          "es": "Thor"
        },
        "aliases": [
          "Тора"
        ]
      }
    ]
  },
  {
    "id": "slavic",
    "name": {
      "ru": "Славянская",
      "en": "Slavic",
      "es": "Eslava"
    },
    "channels": [
      {
        "id": "perun",
        "name": {
          "ru": "Перун",
          "en": "Perun",
          "es": "Perún"
        },
        "aliases": [
          "Перуна"
        ]
      },
      {
        "id": "veles",
        "name": {
          "ru": "Велес",
          "en": "Veles",
          "es": "Veles"
        },
        "aliases": [
          "Велеса"
        ]
      },
      {
        "id": "mokosh",
        "name": {
          "ru": "Мокошь",
          "en": "Mokosh",
          "es": "Mokosh"
        },
        "aliases": [
          "Макошь"
        ]
      }
    ]
  },
  {
    "id": "dao",
    "name": {
      "ru": "Даосская",
      "en": "Daoist",
      "es": "Taoísta"
    },
    "channels": [
      {
        "id": "dao",
        "name": {
          "ru": "Дао",
          "en": "Dao",
          "es": "Dao"
        },
        "aliases": []
      }
    ]
  },
  {
    "id": "maya",
    "name": {
      "ru": "Майя",
      "en": "Maya",
      "es": "Maya"
    },
    "channels": [
      {
        "id": "kinich-ahau",
        "name": {
          "ru": "Кинич-Ахау",
          "en": "Kinich Ahau",
          "es": "K'inich Ajaw"
        },
        "aliases": []
      },
      {
        "id": "k-uh",
        "name": {
          "ru": "К’ух",
          "en": "K'uh",
          "es": "K'uh"
        },
        "aliases": [
          "К'ух",
          "Кух",
          "Kuh",
          "K'uh"
        ]
      },
      {
        "id": "vision-serpent",
        "name": {
          "ru": "Змей Видения",
          "en": "Vision Serpent",
          "es": "Serpiente de la Visión"
        },
        "aliases": [
          "Змей видения",
          "Vision Snake"
        ]
      },
      {
        "id": "chulel",
        "name": {
          "ru": "Ч’улель",
          "en": "Ch'ulel",
          "es": "Ch'ulel"
        },
        "aliases": [
          "Ч'улель",
          "Чулель",
          "Chulel"
        ]
      },
      {
        "id": "ik",
        "name": {
          "ru": "Ик’ · Ветер",
          "en": "Ik' · Wind",
          "es": "Ik' · Viento"
        },
        "aliases": [
          "Ик",
          "Ик'",
          "Ik",
          "K'uh Ik"
        ]
      },
      {
        "id": "ixmucane",
        "name": {
          "ru": "Ишмукане",
          "en": "Ixmucane",
          "es": "Ixmucané"
        },
        "aliases": [
          "ИшМук'ане",
          "Шмукане",
          "Ixmukane",
          "Xmucane"
        ]
      },
      {
        "id": "kaah",
        "name": {
          "ru": "Каах · Земля и род",
          "en": "Kaah · Land and ancestry",
          "es": "Kaah · Tierra y linaje"
        },
        "aliases": [
          "Каах",
          "Kaah",
          "K'aah"
        ]
      }
    ]
  }
]);

export const templeAttunements = Object.freeze([
  ...[
  {
    "id": "asclepius-sofia",
    "traditionId": "greek",
    "channelId": "asclepius",
    "title": {
      "ru": "Канал Асклепия · София",
      "en": "Asclepius · Sofia",
      "es": "Asclepius · Sofia"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Уверенность в мере\nУмеренность в деле\nРешительность в речи\nВесомость в словах\nДостоинство в теме\nУсидчивость в теле\nБожественность в вере\nПорядок в веках.",
    "place": {
      "city": {
        "ru": "София",
        "en": "Sofia",
        "es": "Sofia"
      },
      "site": {
        "ru": "Музей в Софии",
        "en": "Museum in Sofia",
        "es": "Museum in Sofia"
      },
      "country": {
        "ru": "Болгария",
        "en": "Bulgaria",
        "es": "Bulgaria"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/asclepius-sofia.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 1,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "asclepius-asclepion",
    "traditionId": "greek",
    "channelId": "asclepius",
    "title": {
      "ru": "Асклепион · настройка места",
      "en": "Asclepion · place attunement",
      "es": "Asclepion · place attunement"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Целительна и благостна земля Асклепиона.\nВолшебна и возвышенна дорога к небесам.\nДышится свободно, Благости полна\nСилой многоводна Вечная земля",
    "place": {
      "city": {
        "ru": "Перге (по записи)",
        "en": "Perge (per source)",
        "es": "Perge (per source)"
      },
      "site": {
        "ru": "Асклепион",
        "en": "Asclepion",
        "es": "Asclepion"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/asclepius-asclepion.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 2,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "asclepius-sanctuary",
    "traditionId": "greek",
    "channelId": "asclepius",
    "title": {
      "ru": "Асклепион · святилище",
      "en": "Asclepion · sanctuary",
      "es": "Asclepion · sanctuary"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Решительная светлость.\nНе дрогнувшей рукой\nТвой взгляд пронзает вечность\nДавая смерти бой.\n\nВ душе чужой надежду \nТы сможешь отыскать\nРаскрыть зародыш силы\nИ света в жизни дать.\n\nВ твоих руках могучих \nВаяются сердца\nТы жизни сил носитель\nТворящий чудеса.",
    "place": {
      "city": {
        "ru": "Перге (по записи)",
        "en": "Perge (per source)",
        "es": "Perge (per source)"
      },
      "site": {
        "ru": "Место, обозначенное автором как святилище Асклепия",
        "en": "Site described as Asclepius's sanctuary",
        "es": "Site described as Asclepius's sanctuary"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/asclepius-sanctuary.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 3,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "asclepius-priene",
    "traditionId": "greek",
    "channelId": "asclepius",
    "title": {
      "ru": "Канал Асклепия · Приена",
      "en": "Asclepius · Priene",
      "es": "Asclepius · Priene"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Здоровья свет в больную душу\nПривносит благости адепт.\nОмоет пыль, напоит тело,\nДобавит к жизни много лет.\nТворя святой природы дело\nОн всей судьбой ее слуга\nНеся лечение умело\nОн жизни руки и глаза.\nОн знает сколько сердцу биться\nОн зрит рожденье и конец\nБогов несет благословенье\nИ очищение сердец.",
    "place": {
      "city": {
        "ru": "Приена",
        "en": "Priene",
        "es": "Priene"
      },
      "site": {
        "ru": "Святилище и чаша омовения",
        "en": "Sanctuary and lustral basin",
        "es": "Sanctuary and lustral basin"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/asclepius-priene.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 4,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "asclepius-antalya",
    "traditionId": "greek",
    "channelId": "asclepius",
    "title": {
      "ru": "Канал Асклепия · музей Анталии",
      "en": "Asclepius · Antalya Museum",
      "es": "Asclepius · Antalya Museum"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Забудь! пустых задач хлопоты.\nУж время встретиться с собой.\nПришел коль видеть жизней взлеты,\nВпусти вовнутрь себя покой.\n\nОставь! забот мирских отраду\nНе время праздной суете.\nДержать ключи здоровья надо\nКак меч, когда ты на войне.\n\nНа шаг не можешь отступиться,\nНе дрогнет сильная рука.\nТы знаешь долго ль сердцу биться.\nТы жизнь вершишь в своих руках.\n\nТы Бог и Демон для просящих.\nВся сила жить в твоих руках.\nТвори судьбу клинком разящим\nСчищая душу от греха.",
    "place": {
      "city": {
        "ru": "Анталия",
        "en": "Antalya",
        "es": "Antalya"
      },
      "site": {
        "ru": "Музей Анталии",
        "en": "Antalya Museum",
        "es": "Antalya Museum"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 5,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "asclepius-izmir-one",
    "traditionId": "greek",
    "channelId": "asclepius",
    "title": {
      "ru": "Канал Асклепия · Измир I",
      "en": "Asclepius · Izmir I",
      "es": "Asclepius · Izmir I"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Тебя, ученик, я приветствую твердо\nВ леченья пути я хочу указать\nБудь перстом судьбы вечной силы природной.\nВноси в исцеленье красы благодать.\n\nНеси сквозь себя силу огненных. сходней \nСтупеней, ведущих к престолу Богов.\nВводи пациента в каналы природы\nИспользуй ту силу для чистки оков.",
    "place": {
      "city": {
        "ru": "Измир",
        "en": "Izmir",
        "es": "Izmir"
      },
      "site": {
        "ru": "Музей Измира",
        "en": "Museum in Izmir",
        "es": "Museum in Izmir"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 6,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "asclepius-izmir-two",
    "traditionId": "greek",
    "channelId": "asclepius",
    "title": {
      "ru": "Канал Асклепия · Измир II",
      "en": "Asclepius · Izmir II",
      "es": "Asclepius · Izmir II"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Держи ножи здоровья твердо\nИ верь всегда в свою судьбу\nТвой труд и верность благородны\nТвори добро в сердцах саду.\n\nНеси здоровья силу смело\nВсем, кто осознанно живет\nКто жизнь использует умело\nИ кровь других за зря не пьет.\n\nТы светоч истинной свободы!\nНесешь ты право жизни - жить.\nТак будь профессии достоин!\nДругим сердцам примером будь.",
    "place": {
      "city": {
        "ru": "Измир",
        "en": "Izmir",
        "es": "Izmir"
      },
      "site": {
        "ru": "Музей Измира",
        "en": "Museum in Izmir",
        "es": "Museum in Izmir"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 7,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "hygieia-side",
    "traditionId": "greek",
    "channelId": "hygieia",
    "title": {
      "ru": "Канал Гигеи · музей Сиде",
      "en": "Hygieia · Side Museum",
      "es": "Hygieia · Side Museum"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Умеренность. Покладистость\nОпрятность на кровать\nТы стелишь в мир гармонию\nУюта благодать.\nНесешь ты в мир устойчивость\nВ делах и в головах\nХранишь в домах спокойствие\nЧтоб жизни сохранять.",
    "place": {
      "city": {
        "ru": "Сиде",
        "en": "Side",
        "es": "Side"
      },
      "site": {
        "ru": "Музей Сиде",
        "en": "Side Museum",
        "es": "Side Museum"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/hygieia-side.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 8,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "dionysus-sozopol",
    "traditionId": "greek",
    "channelId": "dionysus",
    "title": {
      "ru": "Канал Диониса · Созополь",
      "en": "Dionysus · Sozopol",
      "es": "Dionysus · Sozopol"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Нега вьется в наслажденье\nОт ума и красоты\nТам где мягкое общенье\nЕсть премудрости цветы.\nРасцветают взглядов звезды\nУ игристого костра\nВеселят хмельные взоры\nТех кто с нами до утра.\nЯства льются в упоенье\nГде ученые мужи\nДев ласкает вдохновенье\nИх улыбок чистоты.",
    "place": {
      "city": {
        "ru": "Созополь",
        "en": "Sozopol",
        "es": "Sozopol"
      },
      "site": {
        "ru": "Античный город Аполлония",
        "en": "Ancient Apollonia",
        "es": "Ancient Apollonia"
      },
      "country": {
        "ru": "Болгария",
        "en": "Bulgaria",
        "es": "Bulgaria"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/dionysus-sozopol.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 9,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "dionysus-pergamon",
    "traditionId": "greek",
    "channelId": "dionysus",
    "title": {
      "ru": "Канал Диониса · Пергамон",
      "en": "Dionysus · Pergamon",
      "es": "Dionysus · Pergamon"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Ласкает беззаботностью\nигривая волна\t\nТо шут ты, то властитель\nМеняет все она.\n\nНе прячься за награды\nНе выдержит скала\nНыряй в моря прохлады\nИспей вина до дна.\n\nРасслабь натерты члены,\nРаскрой души цветок.\nТы ярок, ты бесценен\nКак сняв ролей покров.\n\nВступай в обьятьев танцы,\nС подругами кружась.\nИграй любви пасьянсы\nКуражем веселясь.\n\nОткрой улыбкой нежной\nК своим желаньем путь\nКоснись с усладой тела\nСамим собою будь.\n\nТы с нежностью встречаем.\nМы здесь твои друзья.\nДыши любовью смело,\nВедь в этом суть твоя.\n\nОставь ума заботы\nТам, где-то за порог.\nВбирай сердец заботу,\nКоль к нам дойти ты смог.\n\nКружась в пьянящем танце\nВерни себе себя.\nСияй души струною.\nЛаскаясь и любя.",
    "place": {
      "city": {
        "ru": "Пергамон / Перге",
        "en": "Pergamon / Perge",
        "es": "Pergamon / Perge"
      },
      "site": {
        "ru": "Святилище Диониса у театра (по рассказу)",
        "en": "Sanctuary beside the theatre (per account)",
        "es": "Sanctuary beside the theatre (per account)"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": {
        "ru": "В тексте описан Пергамон, но заголовок стиха содержит «Перге» — точное место требует сверки.",
        "en": "The narrative says Pergamon, but the poem heading says Perge; location needs review.",
        "es": "The narrative says Pergamon, but the poem heading says Perge; location needs review."
      },
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/dionysus-pergamon.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 10,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "dionysus-ephesus",
    "traditionId": "greek",
    "channelId": "dionysus",
    "title": {
      "ru": "Канал Диониса · Эфес",
      "en": "Dionysus · Ephesus",
      "es": "Dionysus · Ephesus"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Влечения игривость \nплескается в цветах \nРазвеется унылость\nДля света в небесах.\n\nВключаются лампадки\nСияния полна\nМелодия веселья\nПьянящая волна\n\nОставь забот тоскливость\nХлебни скорей вина\nПрими ласканий милость\nВбирая жизнь до дна\n\nРасправь усталы члены\nИграй влеченья звук.\nТы с нами Бог и Демон\nТы сил природы друг.\n\nВдохни любви свободу\nВойди в блаженства круг\nДай должное природе\nТвори услады звук.",
    "place": {
      "city": {
        "ru": "Эфес",
        "en": "Ephesus",
        "es": "Ephesus"
      },
      "site": {
        "ru": "Античный город Эфес",
        "en": "Ancient Ephesus",
        "es": "Ancient Ephesus"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/dionysus-ephesus.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 11,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "dionysus-caunos",
    "traditionId": "greek",
    "channelId": "dionysus",
    "title": {
      "ru": "Канал Диониса · Каунос",
      "en": "Dionysus · Kaunos",
      "es": "Dionysus · Kaunos"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Расслабленность текучая \nстекает в глубине\nВойди (прийди), прошу, влекущая \nмелодия ко мне.\n\nРаскрой судьбы мгновение\nв мерцании ночи\nСними оков томление\nВ ласкании тиши.\n\n===\nЛегкая светлость, кружится играючи\nНежным касаньем (ласканьем) пьяня голову\nСладкая нега струится влюбляючи\nв истинность света в себе наяву.",
    "place": {
      "city": {
        "ru": "Каунос",
        "en": "Kaunos",
        "es": "Kaunos"
      },
      "site": {
        "ru": "Храм Диониса у театра (как обозначено в материале)",
        "en": "Dionysus temple by the theatre (as described)",
        "es": "Dionysus temple by the theatre (as described)"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/dionysus-caunos.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 12,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "dionysus-side",
    "traditionId": "greek",
    "channelId": "dionysus",
    "title": {
      "ru": "Канал Диониса · Сиде",
      "en": "Dionysus · Side",
      "es": "Dionysus · Side"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Приятности бравада \nструится в небесах.\nЯ пью тебя, прохлада, \nчтоб свет струить из глаз.\n\nЛюбою я жизни радость \nЛюблю ловить успех\nХочу любви усладу. \nДарить тебе при всех\n\nБукет цветочных звуков\nВ моей душе поет\nЛюблю я быль и не быль.\nТворю судьбы полет.",
    "place": {
      "city": {
        "ru": "Сиде",
        "en": "Side",
        "es": "Side"
      },
      "site": {
        "ru": "Храм Диониса у театра (по записи)",
        "en": "Dionysus temple beside the theatre (per source)",
        "es": "Dionysus temple beside the theatre (per source)"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [
      {
        "src": "/library/temple-channels/dionysus-side.jpg",
        "alt": {
          "ru": "Авторское архивное фото к храмовой настройке",
          "en": "Original archive photograph accompanying this temple attunement",
          "es": "Fotografía del archivo original de esta sintonización"
        }
      }
    ],
    "source": {
      "id": "antiquity-module-1-2",
      "title": "Античность — модуль 1–2",
      "type": "author-archive"
    },
    "sortOrder": 13,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "hera-perge",
    "traditionId": "greek",
    "channelId": "hera",
    "title": {
      "ru": "Канал Геры · Перге",
      "en": "Hera · Perge",
      "es": "Hera · Perge"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Хитрость и настойчивость.\nМогу вязать в узлы.\nУпрямых и расчетливых\nДержу я под в узды.\nКрасоты мира явного\nНесут подарком мне.\nКлючи чудес проявленных\nХраню на глубине.\n(Богатство и расчетливость.\nКозырные тузы)",
    "place": {
      "city": {
        "ru": "Перге",
        "en": "Perge",
        "es": "Perge"
      },
      "site": {
        "ru": "Место, названное автором храмом Геры",
        "en": "Site called Hera's temple in the source",
        "es": "Site called Hera's temple in the source"
      },
      "country": {
        "ru": "Турция",
        "en": "Türkiye",
        "es": "Türkiye"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [],
    "source": {
      "id": "antiquity-chapter-3",
      "title": "3. Античность",
      "type": "author-archive"
    },
    "sortOrder": 14,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  },
  {
    "id": "serapis-museum",
    "traditionId": "egyptian",
    "channelId": "serapis",
    "title": {
      "ru": "Канал Сераписа · музей",
      "en": "Serapis · museum",
      "es": "Serapis · museum"
    },
    "format": "verse",
    "language": "ru",
    "textRu": "Не сдержит - толпа вашей огненной силы.\nНе смоют моря ваших вкрадчивых знаний.\nДокажем - судьбе мудрость истинной веры.\nВ победу ума над невежеством сером.\n(Над невежества пылью, прахом, мраком, смрадом)",
    "place": {
      "city": {
        "ru": "Не указан",
        "en": "Not recorded",
        "es": "Not recorded"
      },
      "site": {
        "ru": "Музей (без уточнения в заголовке)",
        "en": "Museum (unspecified in heading)",
        "es": "Museum (unspecified in heading)"
      },
      "country": {
        "ru": "Не указана",
        "en": "Not recorded",
        "es": "Not recorded"
      },
      "note": null,
      "verification": "author-described"
    },
    "photos": [],
    "source": {
      "id": "antiquity-chapter-3",
      "title": "3. Античность",
      "type": "author-archive"
    },
    "sortOrder": 15,
    "visibility": "public",
    "photoContext": "Images included only where matched to a source section; no stock substitutions."
  }
],
  ...expandedTempleAttunements,
  ...restoredTempleAttunements,
]);

export function normalizeTempleSearch(value) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/giu, " ").trim();
}

export function getTempleChannel(traditionId, channelId) {
  return templeTraditions.find((tradition) => tradition.id === traditionId)?.channels.find((channel) => channel.id === channelId) ?? null;
}

export function findTempleAttunements({ traditionId = "", channelId = "", query = "" } = {}) {
  const phrase = normalizeTempleSearch(query).replace(/^канал\s+/, "");
  return templeAttunements.filter((entry) => {
    if (entry.visibility !== "public") return false;
    if (traditionId && entry.traditionId !== traditionId) return false;
    if (channelId && entry.channelId !== channelId) return false;
    if (!phrase) return true;
    const tradition = templeTraditions.find((item) => item.id === entry.traditionId);
    const channel = getTempleChannel(entry.traditionId, entry.channelId);
    const haystack = normalizeTempleSearch([
      entry.id, ...Object.values(entry.title), entry.textRu, ...Object.values(entry.place.city),
      ...Object.values(entry.place.site), ...Object.values(entry.place.country),
      ...Object.values(tradition?.name ?? {}), ...Object.values(channel?.name ?? {}),
      ...(channel?.aliases ?? [])
    ].join(" "));
    return haystack.includes(phrase);
  });
}
