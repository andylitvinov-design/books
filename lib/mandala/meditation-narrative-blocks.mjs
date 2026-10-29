/**
 * First-party, private and cost-free resource-oriented meditation composition.
 * Each option changes the actual guided steps, not just a label or file name.
 * This is deterministic authored content, not an LLM or clinical treatment.
 */
export const MEDITATION_TECHNIQUES=Object.freeze([
  "imagery","grounding","body-awareness","self-kindness","mindful-noticing","future-step"
]);
export const MEDITATION_ATTENTION=Object.freeze(["mixed","visual","sound","body","external"]);
export const MEDITATION_DEPTHS=Object.freeze(["light","reflective"]);
export const MEDITATION_ENDINGS=Object.freeze(["return","reflection","small-step"]);
export const MEDITATION_MOMENTS=Object.freeze(["any","morning","evening","before"]);
const TEXT={
  en:{
    techniques:{
      imagery:[
        "Notice a place in the image that gives you enough room. You may stay at the edge and observe it from a distance.",
        "Perhaps the scene has a path, a shelter, or a resting place. You can choose which, if any, feels useful today.",
        "Notice that the scene can change at your own pace. Nothing needs to be discovered, proved, or achieved."
      ],
      grounding:[
        "Look gently at the actual room. Find three ordinary, neutral objects around you. You may name them silently.",
        "Notice the contact between a surface and your body, or the sounds outside. Choose whichever feels easiest.",
        "Return to one detail here and now. The present room remains available even while an image appears."
      ],
      "body-awareness":[
        "If comfortable, notice the support beneath your hands or feet. If body awareness is uncomfortable, focus on a nearby object instead.",
        "You might notice temperature, weight, or the texture of clothing. You do not need to change your breathing or sensations.",
        "Choose a comfortable distance from each sensation. Your body can move or change position at any time."
      ],
      "self-kindness":[
        "Imagine talking to yourself as you might speak to a respected friend who needs a little room.",
        "You may offer a simple sentence: 'I can take this at my own pace.' You can also choose silence.",
        "Consider how a kind, practical gesture might look today. It need not be a large gesture."
      ],
      "mindful-noticing":[
        "Notice one colour, sound, or shape without deciding whether you like it. Attention can be gentle.",
        "Thoughts may come and go. You do not have to push them away or follow them.",
        "Allow the focus to widen for a moment: a scene, the room, and the simple fact that you can choose where to look."
      ],
      "future-step":[
        "Picture a small, ordinary moment in which you approach your chosen intention. The scene does not need to be perfect.",
        "You can try out one possible response, or pause and consider another. This is rehearsal, not a prediction.",
        "Notice one modest resource you could bring into a real situation. You decide whether to use it."
      ]
    },
    attention:{
      mixed:"You can notice one colour, one sound, and one gentle point of contact with the surface under you. Any of these may be skipped.",
      visual:"Let your attention rest on colours, light, shapes, and distance. It is fine not to picture anything clearly.",
      sound:"Listen for a nearby or distant sound and notice how it changes. Silence is also something you can notice.",
      body:"If it feels safe, notice physical support or a comfortable texture. Otherwise, look at the room and stay with what is outside you.",
      external:"You may keep your eyes open. Find a real object with a simple shape and return to it whenever you wish."
    },
    depths:{
      light:"Keep this exercise simple. One small detail is enough; there is no reason to go deeper.",
      reflective:"If it feels useful, consider what the chosen image tells you about a resource you already have. You can also leave the question unanswered."
    },
    moments:{
      any:"You can begin this practice at your own convenient time. No special conditions are needed.",
      morning:"As the day begins, imagine giving yourself enough room for a manageable first step.",
      evening:"As the day settles, it is fine to let unfinished tasks wait and notice a moment of rest.",
      before:"Before an important conversation, remember that you may pause, listen and choose words in your own time."
    },
    endings:{
      return:"Bring your attention to the actual room, the floor, and today's ordinary activities. There is nothing more you need to complete.",
      reflection:"If you like, finish with one sentence or a drawing about what seemed supportive. You can also leave the page blank.",
      "small-step":"You might name one small, voluntary step, or decide to rest. Both are valid ways to finish."
    },
    settings:{
      forest:"Imagine the light between trees and a path wide enough for a comfortable pause. There is no need to go into the woods.",
      coast:"Imagine a quiet coast with a safe place to watch the water from a distance. You choose whether to go nearer.",
      mountain:"Imagine a wide mountain view from a place where you can comfortably stand or sit. There is no climb to complete.",
      garden:"Let a garden have an open gate and somewhere to sit. You do not need to tend anything now.",
      water:"A gentle stream moves past a familiar bank. You may watch from where you are.",
      light:"Daylight falls on an ordinary surface, in any intensity that feels comfortable.",
      home:"A comfortable room has a window and a door. You choose which one, if either, to open.",
      video:"Look at the chosen video scene as a creative picture, not a demand to feel anything specific."
    },
    revisit:"Perhaps revisit the same resource from a different angle. It is also fine to choose a more ordinary, neutral scene.",
    choice:"What part of this feels manageable today? You may name a detail, imagine a different one, or simply rest."
  },
  ru:{
    techniques:{
      imagery:[
        "Заметьте место внутри образа, где достаточно пространства. Можно оставаться на краю и смотреть издалека.",
        "В этом пейзаже может быть тропинка, укрытие или место для отдыха. Вы сами выбираете, что сейчас подходит.",
        "Образ может меняться в вашем темпе. Здесь ничего не требуется открыть, доказать или достичь."
      ],
      grounding:[
        "Посмотрите на реальную комнату. Найдите три нейтральных, обычных предмета вокруг. Можно молча назвать их.",
        "Заметьте соприкосновение тела с опорой или звуки снаружи. Выбирайте то, что проще именно сейчас.",
        "Вернитесь вниманием к одной детали здесь и сейчас. Реальная комната остаётся доступной, даже когда появляется образ."
      ],
      "body-awareness":[
        "Если комфортно, заметьте опору под ладонями или стопами. Если ощущения в теле неприятны, выберите обычный предмет перед глазами.",
        "Можно заметить температуру, вес или фактуру одежды. Не нужно специально менять дыхание или ощущения.",
        "Вы сами выбираете расстояние до каждого ощущения. Положение тела можно менять в любой момент."
      ],
      "self-kindness":[
        "Представьте, что обращаетесь к себе так же уважительно, как к хорошему знакомому, которому нужна пауза.",
        "Можно предложить себе простую фразу: «Я могу двигаться в своём темпе». А можно выбрать тишину.",
        "Подумайте, как сегодня мог бы выглядеть небольшой и практичный жест заботы. Ему не обязательно быть значительным."
      ],
      "mindful-noticing":[
        "Заметьте один цвет, звук или форму, не решая, нравится ли вам это. Внимание может быть мягким.",
        "Мысли могут появляться и уходить. Не нужно прогонять их или обязательно следовать за ними.",
        "Позвольте вниманию ненадолго расшириться: образ, комната и простая возможность выбирать, куда смотреть."
      ],
      "future-step":[
        "Представьте небольшой повседневный момент, когда вы приближаетесь к выбранному намерению. Сцена не обязана быть идеальной.",
        "Можно примерить один вариант действия, сделать паузу и выбрать другой. Это репетиция, а не предсказание.",
        "Заметьте небольшой доступный ресурс, который можно взять с собой в реальную ситуацию. Использовать его необязательно."
      ]
    },
    attention:{
      mixed:"Можно заметить один цвет, один звук и одну точку опоры под собой. Любую часть этого приглашения можно пропустить.",
      visual:"Обратите внимание на цвет, свет, форму и расстояние. Чётко видеть картинку воображения необязательно.",
      sound:"Прислушайтесь к близкому или далёкому звуку и к тому, как он меняется. Тишину тоже можно замечать.",
      body:"Если безопасно, заметьте опору или приятную фактуру. Если нет — посмотрите на комнату и выберите внешние ориентиры.",
      external:"Можно оставить глаза открытыми. Найдите реальный предмет простой формы и возвращайтесь к нему по желанию."
    },
    depths:{
      light:"Пусть практика остаётся простой. Одной маленькой детали достаточно; углубляться необязательно.",
      reflective:"Если полезно, можно задуматься, о каком уже доступном вам ресурсе напоминает образ. Отвечать необязательно."
    },
    moments:{
      any:"Для такой практики не требуется особое время. Вы можете начинать, когда удобно.",
      morning:"В начале дня можно разрешить себе достаточно пространства для одного посильного шага.",
      evening:"Когда день подходит к концу, незавершённые дела могут немного подождать. Можно заметить отдых.",
      before:"Перед важным разговором можно вспомнить, что вы вправе сделать паузу, выслушать и подобрать свои слова."
    },
    endings:{
      return:"Верните внимание к реальной комнате, полу и привычным делам сегодняшнего дня. Здесь не нужно ничего завершать идеально.",
      reflection:"Если хочется, можно закончить одним предложением или рисунком о том, что поддерживало. Лист можно оставить пустым.",
      "small-step":"Можно назвать один небольшой добровольный шаг или выбрать отдых. Оба варианта подходят для завершения."
    },
    settings:{
      forest:"Представьте свет между деревьями и широкую тропу с местом для остановки. Углубляться в лес необязательно.",
      coast:"Представьте спокойный берег с безопасным местом, откуда можно смотреть на воду. Вы сами выбираете дистанцию.",
      mountain:"Представьте широкий горный пейзаж из удобного места, где можно стоять или сидеть. Подниматься никуда не нужно.",
      garden:"В саду есть открытая калитка и скамейка. Ухаживать за чем-либо сейчас необязательно.",
      water:"Мягкий ручей течёт мимо знакомого берега. Можно оставаться на своём месте.",
      light:"Дневной свет ложится на обычную поверхность с той яркостью, которая вам подходит.",
      home:"В уютной комнате есть окно и дверь. Вы сами решаете, открывать ли их.",
      video:"Посмотрите на выбранный видеосюжет как на творческую картину, а не требование испытать определённое чувство."
    },
    revisit:"Можно снова посмотреть на тот же ресурс под другим углом. Или выбрать более простой, нейтральный образ.",
    choice:"Какая часть этого сейчас посильна? Можно назвать деталь, заменить её или просто отдохнуть."
  },
  es:{
    techniques:{
      imagery:[
        "Observa un lugar de la imagen con suficiente espacio. Puedes quedarte al borde y mirarlo desde lejos.",
        "Quizá haya un sendero, un refugio o un lugar para descansar. Tú eliges lo que te resulte útil.",
        "La imagen puede cambiar a tu ritmo. No necesitas descubrir, demostrar ni conseguir nada."
      ],
      grounding:[
        "Mira la habitación real. Encuentra tres objetos cotidianos y neutros. Puedes nombrarlos mentalmente.",
        "Observa el contacto con una superficie o los sonidos externos. Elige lo que sea más sencillo.",
        "Vuelve a un detalle del aquí y ahora. La habitación real sigue disponible mientras imaginas."
      ],
      "body-awareness":[
        "Si te resulta cómodo, observa el apoyo bajo tus manos o pies. Si no, mira un objeto cercano.",
        "Puedes notar temperatura, peso o la textura de la ropa. No necesitas cambiar la respiración ni las sensaciones.",
        "Tú eliges la distancia respecto a cada sensación. Puedes cambiar de postura cuando quieras."
      ],
      "self-kindness":[
        "Imagina hablarte con el mismo respeto que tendrías hacia una amistad que necesita un descanso.",
        "Puedes decirte: «Puedo ir a mi propio ritmo». También puedes elegir el silencio.",
        "Piensa en un gesto sencillo y práctico de cuidado para hoy. No tiene que ser grande."
      ],
      "mindful-noticing":[
        "Observa un color, sonido o forma sin decidir si te agrada. La atención puede ser suave.",
        "Los pensamientos pueden llegar y marcharse. No necesitas alejarlos ni seguirlos.",
        "Amplía un instante tu atención: la imagen, la habitación y la libertad de elegir dónde mirar."
      ],
      "future-step":[
        "Imagina un momento cotidiano en que te acercas a tu intención. No tiene que salir perfecto.",
        "Puedes probar una respuesta, hacer una pausa y considerar otra. Es un ensayo, no una predicción.",
        "Reconoce un recurso modesto que podrías llevar a una situación real. Usarlo es opcional."
      ]
    },
    attention:{
      mixed:"Puedes observar un color, un sonido y un punto de apoyo bajo tu cuerpo. Puedes saltar cualquiera de ellos.",
      visual:"Deja que tu atención descanse en colores, luz, formas y distancias. No necesitas ver una imagen nítida.",
      sound:"Escucha un sonido cercano o lejano y observa cómo cambia. También puedes notar el silencio.",
      body:"Si te parece seguro, nota un apoyo o una textura agradable. De lo contrario, mira la habitación.",
      external:"Puedes mantener los ojos abiertos. Encuentra un objeto real de forma sencilla y vuelve a mirarlo cuando quieras."
    },
    depths:{
      light:"Mantén esta práctica sencilla. Un pequeño detalle es suficiente; no necesitas profundizar.",
      reflective:"Si te sirve, considera qué recurso que ya tienes te recuerda esta imagen. Puedes no responder."
    },
    moments:{
      any:"Puedes hacer esta práctica a la hora que te convenga; no necesitas condiciones especiales.",
      morning:"Al comenzar el día, imagina espacio para un primer paso que resulte manejable.",
      evening:"Al terminar el día, las tareas pendientes pueden esperar un momento mientras descansas.",
      before:"Antes de una conversación importante, recuerda que puedes pausar, escuchar y elegir tus palabras."
    },
    endings:{
      return:"Vuelve a observar la habitación real, el suelo y las actividades cotidianas de hoy. No hay nada más que completar.",
      reflection:"Si quieres, termina con una frase o dibujo sobre lo que te ha ayudado. También puedes dejar la hoja en blanco.",
      "small-step":"Puedes nombrar un paso pequeño y voluntario, o decidir descansar. Ambas opciones sirven para terminar."
    },
    settings:{
      forest:"Imagina luz entre los árboles y un camino amplio donde puedas hacer una pausa. No necesitas entrar en el bosque.",
      coast:"Imagina una costa tranquila y un lugar seguro desde el que mirar el agua. Tú eliges la distancia.",
      mountain:"Imagina una vista amplia de montañas desde un lugar cómodo. No tienes que subir a ninguna.",
      garden:"Un jardín tiene una puerta abierta y un banco. No tienes que cuidar nada ahora.",
      water:"Un arroyo suave pasa junto a una orilla conocida. Puedes quedarte donde estás.",
      light:"La luz del día cae sobre una superficie ordinaria, con una intensidad cómoda.",
      home:"Una habitación acogedora tiene una ventana y una puerta. Tú decides si las abres.",
      video:"Observa la escena del vídeo como una imagen creativa, no como una obligación de sentir algo determinado."
    },
    revisit:"Quizá puedas mirar el mismo recurso desde otro ángulo. También puedes elegir una imagen más sencilla.",
    choice:"¿Qué parte resulta manejable hoy? Puedes nombrar un detalle, cambiarlo o simplemente descansar."
  }
};
const sanitize=(value,options,backup)=>options.includes(value)?value:backup;
export function buildMeditationNarrativeBlocks(options={}){
  const locale=["en","ru","es"].includes(options.locale)?options.locale:"en";
  const t=TEXT[locale];
  const technique=sanitize(options.technique,MEDITATION_TECHNIQUES,"imagery");
  const attention=sanitize(options.attention,MEDITATION_ATTENTION,"mixed");
  const depth=sanitize(options.depth,MEDITATION_DEPTHS,"light");
  const ending=sanitize(options.ending,MEDITATION_ENDINGS,"return");
  const moment=sanitize(options.moment,MEDITATION_MOMENTS,"any");
  const setting=sanitize(options.setting,["video","garden","water","light","home","forest","coast","mountain"],"video");
  const length=[3,5,8,12].includes(options.length)?options.length:5;
  const steps=t.techniques[technique];
  const out=[t.moments[moment],t.settings[setting],steps[0],t.attention[attention],steps[1],t.depths[depth]];
  if(length>=5)out.push(t.choice);
  if(length>=8)out.push(steps[2],t.revisit);
  if(length>=12)out.push(t.choice,t.depths[depth],steps[0],t.revisit);
  out.push(t.endings[ending]);
  return out;
}
