/** Gift-only emotional intent taxonomy. Separate from the canonical self/work MyTube axes.
 * No API calls, provider spending, photo upload or personal data in this module.
 */
export const VIDEO_GIFT_EMOTIONS=Object.freeze([
  {
    "id": "miss-you",
    "label": {
      "en": "Miss You",
      "ru": "Скучаю",
      "es": "Te extraño"
    },
    "defaultStyle": "warm",
    "messages": [
      {
        "id": "thinking-of-you",
        "occasion": "love",
        "label": {
          "en": "Thinking of You",
          "ru": "Думаю о тебе",
          "es": "Pienso en ti"
        },
        "copy": {
          "en": {
            "message": "Even on busy days, you are on my mind. I wanted to send you a little warmth from afar.",
            "finalWish": "With you in my thoughts!"
          },
          "ru": {
            "message": "Даже в самые занятые дни я думаю о тебе. Пусть это видео передаст немного моего тепла.",
            "finalWish": "Думаю о тебе!"
          },
          "es": {
            "message": "Incluso en los días más ocupados pienso en ti. Te envío un poquito de cariño desde lejos.",
            "finalWish": "¡Estás en mis pensamientos!"
          }
        }
      },
      {
        "id": "sending-you-a-hug",
        "occasion": "love",
        "label": {
          "en": "Sending You a Hug",
          "ru": "Посылаю объятие",
          "es": "Te mando un abrazo"
        },
        "copy": {
          "en": {
            "message": "Imagine this as a gentle hug across the distance. Wherever you are, I am sending you my warmth.",
            "finalWish": "A big hug from me!"
          },
          "ru": {
            "message": "Представь, что это нежное объятие через расстояние. Где бы ты ни был, моё тепло с тобой.",
            "finalWish": "Крепко обнимаю!"
          },
          "es": {
            "message": "Imagina un abrazo cálido a través de la distancia. Estés donde estés, te mando mi cariño.",
            "finalWish": "¡Un abrazo enorme!"
          }
        }
      },
      {
        "id": "youre-amazing",
        "occasion": "love",
        "label": {
          "en": "You're Amazing",
          "ru": "Ты удивительный человек",
          "es": "Eres increíble"
        },
        "copy": {
          "en": {
            "message": "I miss your light, your kindness and the way you make ordinary moments special. You truly are amazing.",
            "finalWish": "Keep shining!"
          },
          "ru": {
            "message": "Мне не хватает твоего света, доброты и умения делать обычные моменты особенными. Ты удивительный человек.",
            "finalWish": "Продолжай сиять!"
          },
          "es": {
            "message": "Extraño tu luz, tu bondad y cómo haces especiales los momentos cotidianos. Eres una persona increíble.",
            "finalWish": "¡Sigue brillando!"
          }
        }
      },
      {
        "id": "youre-in-my-heart",
        "occasion": "love",
        "label": {
          "en": "You're in My Heart",
          "ru": "Ты в моём сердце",
          "es": "Estás en mi corazón"
        },
        "copy": {
          "en": {
            "message": "No matter how far apart we are, you have a special place in my heart. Distance cannot erase our connection.",
            "finalWish": "Always close to my heart!"
          },
          "ru": {
            "message": "Сколько бы километров нас ни разделяло, у тебя особенное место в моём сердце. Наша связь остаётся.",
            "finalWish": "Ты всегда в моём сердце!"
          },
          "es": {
            "message": "Por mucha distancia que nos separe, tienes un lugar especial en mi corazón. Nuestro vínculo permanece.",
            "finalWish": "¡Siempre en mi corazón!"
          }
        }
      }
    ]
  },
  {
    "id": "thank-you",
    "label": {
      "en": "Thank You",
      "ru": "Спасибо",
      "es": "Gracias"
    },
    "defaultStyle": "warm",
    "messages": [
      {
        "id": "for-my-family",
        "occasion": "thanks",
        "label": {
          "en": "For My Family",
          "ru": "Моей семье",
          "es": "Para mi familia"
        },
        "copy": {
          "en": {
            "message": "Thank you for the laughter, care and countless little moments that make us a family. I treasure all we share.",
            "finalWish": "With love to our family!"
          },
          "ru": {
            "message": "Спасибо за смех, заботу и тысячи маленьких мгновений, из которых складывается наша семья. Я дорожу нами.",
            "finalWish": "С любовью к нашей семье!"
          },
          "es": {
            "message": "Gracias por las risas, el cuidado y esos pequeños momentos que nos hacen familia. Atesoro todo lo que compartimos.",
            "finalWish": "¡Con amor para mi familia!"
          }
        }
      },
      {
        "id": "for-your-support",
        "occasion": "thanks",
        "label": {
          "en": "For Your Support",
          "ru": "За твою поддержку",
          "es": "Por tu apoyo"
        },
        "copy": {
          "en": {
            "message": "Thank you for standing by me when it mattered. Your support made difficult moments feel less lonely.",
            "finalWish": "I'm grateful you're here!"
          },
          "ru": {
            "message": "Спасибо, что ты был рядом в важный момент. Благодаря твоей поддержке трудности было легче переживать.",
            "finalWish": "Благодарю за то, что ты рядом!"
          },
          "es": {
            "message": "Gracias por estar a mi lado cuando más importaba. Con tu apoyo, los momentos difíciles fueron menos solitarios.",
            "finalWish": "¡Agradezco que estés aquí!"
          }
        }
      },
      {
        "id": "from-the-heart",
        "occasion": "thanks",
        "label": {
          "en": "From the Heart",
          "ru": "От всего сердца",
          "es": "De corazón"
        },
        "copy": {
          "en": {
            "message": "Sometimes a simple thank you is not enough. Today I want you to know how deeply I appreciate you.",
            "finalWish": "Thank you from my heart!"
          },
          "ru": {
            "message": "Иногда обычного «спасибо» мало. Сегодня мне хочется сказать, как глубоко я тебя ценю.",
            "finalWish": "Спасибо от всего сердца!"
          },
          "es": {
            "message": "A veces un simple gracias no alcanza. Hoy quiero que sepas cuánto te valoro de verdad.",
            "finalWish": "¡Gracias de todo corazón!"
          }
        }
      },
      {
        "id": "you-mean-so-much",
        "occasion": "thanks",
        "label": {
          "en": "You Mean So Much",
          "ru": "Ты очень много значишь",
          "es": "Significas mucho"
        },
        "copy": {
          "en": {
            "message": "The world feels kinder with you in it. Your presence means more to me than I can put into words.",
            "finalWish": "I'm lucky to know you!"
          },
          "ru": {
            "message": "С тобой мир кажется добрее. Ты значишь для меня гораздо больше, чем можно выразить словами.",
            "finalWish": "Как хорошо, что ты есть!"
          },
          "es": {
            "message": "El mundo se siente más amable contigo. Tu presencia significa para mí más de lo que puedo expresar.",
            "finalWish": "¡Qué suerte tenerte!"
          }
        }
      }
    ]
  },
  {
    "id": "support-motivation",
    "label": {
      "en": "Support & Motivation",
      "ru": "Поддержка и мотивация",
      "es": "Apoyo y motivación"
    },
    "defaultStyle": "gentle",
    "messages": [
      {
        "id": "youre-not-alone",
        "occasion": "support",
        "label": {
          "en": "You're Not Alone",
          "ru": "Ты не один",
          "es": "No estás solo"
        },
        "copy": {
          "en": {
            "message": "You do not have to carry everything alone. I am here to listen, to stay close and to walk beside you.",
            "finalWish": "I'm here for you!"
          },
          "ru": {
            "message": "Тебе не нужно справляться со всем в одиночку. Я рядом, чтобы выслушать и поддержать тебя.",
            "finalWish": "Я рядом с тобой!"
          },
          "es": {
            "message": "No tienes que cargar con todo a solas. Estoy aquí para escucharte y acompañarte.",
            "finalWish": "¡Aquí estoy para ti!"
          }
        }
      },
      {
        "id": "this-too-shall-pass",
        "occasion": "support",
        "label": {
          "en": "This Too Shall Pass",
          "ru": "Всё пройдёт",
          "es": "Esto también pasará"
        },
        "copy": {
          "en": {
            "message": "I know this moment may feel heavy. Take it one breath at a time; you do not need to fix everything today.",
            "finalWish": "One gentle step at a time."
          },
          "ru": {
            "message": "Знаю, сейчас может быть нелегко. Дыши и двигайся маленькими шагами — не нужно решать всё сегодня.",
            "finalWish": "Шаг за шагом, с заботой о себе."
          },
          "es": {
            "message": "Sé que este momento puede ser difícil. Ve respiración a respiración; no tienes que resolverlo todo hoy.",
            "finalWish": "Paso a paso, con calma."
          }
        }
      },
      {
        "id": "better-days-ahead",
        "occasion": "support",
        "label": {
          "en": "Better Days Ahead",
          "ru": "Впереди лучшие дни",
          "es": "Vienen días mejores"
        },
        "copy": {
          "en": {
            "message": "When today feels cloudy, remember that life can change. I wish you moments of light, rest and new possibilities.",
            "finalWish": "There is still hope."
          },
          "ru": {
            "message": "Когда сегодняшний день кажется пасмурным, помни: жизнь меняется. Желаю тебе света, отдыха и новых возможностей.",
            "finalWish": "Надежда остаётся."
          },
          "es": {
            "message": "Cuando hoy parece nublado, recuerda que la vida puede cambiar. Te deseo luz, descanso y nuevas posibilidades.",
            "finalWish": "Todavía hay esperanza."
          }
        }
      },
      {
        "id": "i-believe-in-you",
        "occasion": "support",
        "label": {
          "en": "I Believe in You",
          "ru": "Я верю в тебя",
          "es": "Creo en ti"
        },
        "copy": {
          "en": {
            "message": "I see your courage and the effort you put in. Whatever the outcome, I believe in your ability to keep growing.",
            "finalWish": "You can do it!"
          },
          "ru": {
            "message": "Я вижу твою смелость и старания. Каким бы ни был результат, я верю в твою способность двигаться дальше.",
            "finalWish": "Ты справишься!"
          },
          "es": {
            "message": "Veo tu valentía y todo tu esfuerzo. Sea cual sea el resultado, confío en tu capacidad de seguir creciendo.",
            "finalWish": "¡Tú puedes!"
          }
        }
      }
    ]
  },
  {
    "id": "congratulations",
    "label": {
      "en": "Congratulations",
      "ru": "Поздравляю",
      "es": "Felicitaciones"
    },
    "defaultStyle": "joyful",
    "messages": [
      {
        "id": "happy-birthday",
        "occasion": "birthday",
        "label": {
          "en": "Happy Birthday",
          "ru": "С днём рождения",
          "es": "Feliz cumpleaños"
        },
        "copy": {
          "en": {
            "message": "Today is all about you! May this new year of life bring joyful surprises, laughter and moments worth remembering.",
            "finalWish": "Happy birthday!"
          },
          "ru": {
            "message": "Сегодня твой день! Пусть новый год жизни принесёт приятные сюрпризы, смех и моменты, которые хочется помнить.",
            "finalWish": "С днём рождения!"
          },
          "es": {
            "message": "¡Hoy es tu día! Que este nuevo año te traiga sorpresas alegres, risas y recuerdos hermosos.",
            "finalWish": "¡Feliz cumpleaños!"
          }
        }
      },
      {
        "id": "happy-holidays",
        "occasion": "custom",
        "label": {
          "en": "Happy Holidays",
          "ru": "С праздниками",
          "es": "Felices fiestas"
        },
        "copy": {
          "en": {
            "message": "Sending a little sparkle your way. May these holidays bring warmth, peaceful moments and time with those you love.",
            "finalWish": "Happy holidays!"
          },
          "ru": {
            "message": "Посылаю тебе немного праздничного волшебства. Пусть будут тепло, спокойные мгновения и встречи с близкими.",
            "finalWish": "С праздниками!"
          },
          "es": {
            "message": "Te envío un poco de magia festiva. Que estos días traigan calidez, paz y tiempo con quienes amas.",
            "finalWish": "¡Felices fiestas!"
          }
        }
      },
      {
        "id": "im-proud-of-you",
        "occasion": "custom",
        "label": {
          "en": "I'm Proud of You",
          "ru": "Горжусь тобой",
          "es": "Estoy orgulloso de ti"
        },
        "copy": {
          "en": {
            "message": "I have seen your dedication, your courage and how far you have come. I am genuinely proud of you.",
            "finalWish": "Celebrate your journey!"
          },
          "ru": {
            "message": "Я вижу, сколько труда и смелости ты вложил в свой путь. И я искренне горжусь тобой.",
            "finalWish": "Отпразднуй свой путь!"
          },
          "es": {
            "message": "He visto tu dedicación, tu valentía y cuánto has avanzado. Estoy muy orgulloso de ti.",
            "finalWish": "¡Celebra tu camino!"
          }
        }
      },
      {
        "id": "you-deserve-it",
        "occasion": "custom",
        "label": {
          "en": "You Deserve It",
          "ru": "Ты это заслужил",
          "es": "Te lo mereces"
        },
        "copy": {
          "en": {
            "message": "You worked for this moment and showed up again and again. Let yourself enjoy what you have achieved.",
            "finalWish": "You deserve this joy!"
          },
          "ru": {
            "message": "Ты много трудился ради этого момента и не сдавался. Позволь себе порадоваться своему достижению.",
            "finalWish": "Ты заслуживаешь этой радости!"
          },
          "es": {
            "message": "Trabajaste por este momento y seguiste adelante. Permítete disfrutar de lo que has logrado.",
            "finalWish": "¡Mereces esta alegría!"
          }
        }
      }
    ]
  }
].map(category=>Object.freeze({
 ...category,messages:Object.freeze(category.messages.map(message=>Object.freeze(message)))
})));
export const VIDEO_GIFT_STYLES=Object.freeze([
  {
    "id": "gentle",
    "label": {
      "en": "Gentle & Comforting",
      "ru": "Нежно и утешающе",
      "es": "Suave y reconfortante"
    },
    "motion": "float",
    "palette": "ocean",
    "soundtrack": "breeze",
    "group": "forest"
  },
  {
    "id": "warm",
    "label": {
      "en": "Warm & Heartfelt",
      "ru": "Тепло и душевно",
      "es": "Cálido y sincero"
    },
    "motion": "zoom",
    "palette": "rose",
    "soundtrack": "crystal",
    "group": "flowers"
  },
  {
    "id": "joyful",
    "label": {
      "en": "Bright & Joyful",
      "ru": "Светло и радостно",
      "es": "Luminoso y alegre"
    },
    "motion": "pan",
    "palette": "sunrise",
    "soundtrack": "crystal",
    "group": "sky"
  },
  {
    "id": "inspiring",
    "label": {
      "en": "Bold & Inspiring",
      "ru": "Ярко и вдохновляюще",
      "es": "Enérgico e inspirador"
    },
    "motion": "zoom",
    "palette": "forest",
    "soundtrack": "forest",
    "group": "mountain"
  }
].map(style=>Object.freeze(style)));
const locales=new Set(["en","ru","es"]);
export function getGiftEmotionCategory(id){
 return VIDEO_GIFT_EMOTIONS.find(category=>category.id===id)||null;
}
export function getGiftEmotionMessage(categoryId,messageId){
 return getGiftEmotionCategory(categoryId)?.messages.find(message=>message.id===messageId)||null;
}
export function getGiftEmotionStyle(id){
 return VIDEO_GIFT_STYLES.find(style=>style.id===id)||null;
}
export function suggestGiftEmotionText(locale,categoryId,messageId){
 const message=getGiftEmotionMessage(categoryId,messageId);
 if(!locales.has(locale)||!message)throw new TypeError("invalid_gift_emotion");
 const copy=message.copy[locale];
 return {intro:message.label[locale],message:copy.message,finalWish:copy.finalWish};
}
