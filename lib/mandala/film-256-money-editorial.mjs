/** Four individually staged money stories (RU/EN/ES), six real actions each.
 * Fictional creative briefs, not media approval or client biography.
 */
const f=(idea,pitch,scenes,symbol,arc)=>Object.freeze({idea,pitch,scenes:Object.freeze(scenes),symbol,arc:Object.freeze(arc)});
const source={
  "money-blocks-s1": {
    "en": {
      "idea": "An old rule about money can be noticed without being obeyed forever.",
      "pitch": "A freelancer chooses a reasoned price over an inherited apology.",
      "symbol": "A transparent frame",
      "arc": [
        "Habit",
        "Recognising",
        "Checking facts",
        "Open offer"
      ],
      "scenes": [
        "At a desk, a freelancer receives a request for a quote while a transparent frame covers their price list.",
        "Their finger pauses above an unsent reply: 'Sorry, this might cost too much.' The client has not answered.",
        "Under the frame lies an old note saying 'Never ask for too much.' The person lifts the glass and reads it.",
        "They place two receipts for completed projects beside the note and calculate hours and materials on paper.",
        "The apology is deleted. A clear estimate with a defined scope replaces it, and the figures are checked twice.",
        "The quote is sent. The frame, note and receipts remain on the desk; the conversation is still unanswered."
      ]
    },
    "ru": {
      "idea": "Старое правило о деньгах можно увидеть и не следовать ему автоматически.",
      "pitch": "Исполнитель готовит цену по фактам, а не по привычному стыду.",
      "symbol": "Прозрачная рамка",
      "arc": [
        "Привычка",
        "Узнавание",
        "Проверка фактов",
        "Открытое предложение"
      ],
      "scenes": [
        "На стол приходит запрос клиента о стоимости. Прозрачная рамка закрывает часть листа с расценками.",
        "Палец замирает над неотправленной фразой: «Извините, наверное, это слишком дорого». Ответа ещё нет.",
        "Под стеклом видна старая записка: «Не проси слишком много». Герой приподнимает рамку и читает её.",
        "Рядом ложатся два чека о выполненных заказах. Человек рассчитывает часы и материалы на отдельном листке.",
        "Извинение удалено. Вместо него появляется понятная смета и описание объёма работ. Цифры ещё раз проверены.",
        "Предложение отправлено. Рамка и чеки остаются на столе, а решение клиента пока неизвестно."
      ]
    },
    "es": {
      "idea": "Una regla antigua sobre el dinero se puede reconocer sin obedecerla siempre.",
      "pitch": "Una persona autónoma prepara un presupuesto con hechos en lugar de disculpas.",
      "symbol": "Un marco transparente",
      "arc": [
        "Costumbre",
        "Reconocer",
        "Comprobar",
        "Oferta abierta"
      ],
      "scenes": [
        "En el escritorio llega una solicitud de presupuesto. Un marco transparente tapa parte de la lista de precios.",
        "El dedo se detiene sobre un borrador: «Perdona, quizá sea demasiado caro». Todavía no ha enviado nada.",
        "Bajo el cristal aparece una nota vieja: «No pidas demasiado». Levanta el marco para leerla mejor.",
        "Coloca dos recibos de trabajos terminados junto a la nota y calcula horas y materiales en una hoja.",
        "Borra la disculpa y escribe una oferta clara con alcance y precio comprobado. Revisa los números otra vez.",
        "Envía la oferta. El marco y los recibos quedan en el escritorio; aún no conoce la respuesta."
      ]
    }
  },
  "money-blocks-s2": {
    "en": {
      "idea": "A fair price can be stated plainly without apologising for the work.",
      "pitch": "A craftsperson practices naming the value of a repaired chair.",
      "symbol": "A handwritten price tag",
      "arc": [
        "Hesitation",
        "Preparation",
        "Rehearsal",
        "Clear offer"
      ],
      "scenes": [
        "At a craft stall, a customer asks the price of a repaired wooden chair. The maker touches an empty tag.",
        "The maker slips the blank tag into a pocket and opens a notebook showing the hours of repair work.",
        "A fresh label lists materials and a modest labour fee. The tag is placed beside the chair's repaired leg.",
        "With the stall empty, the maker practices speaking the full price aloud. The first attempt falters slightly.",
        "The customer returns. The maker shows the repaired joint and says the price without adding an apology.",
        "The customer asks for time to think. The maker nods, and the price tag remains on the chair."
      ]
    },
    "ru": {
      "idea": "Справедливую цену можно назвать спокойно, без извинения за собственный труд.",
      "pitch": "Мастер репетирует честный разговор о цене отреставрированного стула.",
      "symbol": "Бумажный ценник",
      "arc": [
        "Замешательство",
        "Подготовка",
        "Репетиция",
        "Ясное предложение"
      ],
      "scenes": [
        "На ярмарке покупатель спрашивает цену отреставрированного стула. Мастер касается пустой бирки.",
        "Мастер прячет пустой ценник в карман и открывает блокнот, где записаны часы выполненной работы.",
        "На новой бирке появляются стоимость материалов и плата за труд. Её кладут у отремонтированной ножки.",
        "У пустого прилавка мастер вслух повторяет полную цену. Первая попытка звучит немного неуверенно.",
        "Покупатель возвращается. Мастер показывает восстановленное соединение и называет сумму без извинений.",
        "Покупатель просит время подумать. Мастер кивает, и ценник остаётся на стуле на прежнем месте."
      ]
    },
    "es": {
      "idea": "El precio de un trabajo puede decirse claramente, sin pedir disculpas.",
      "pitch": "Una artesana ensaya el precio de una silla que acaba de restaurar.",
      "symbol": "Una etiqueta escrita a mano",
      "arc": [
        "Vacilación",
        "Preparación",
        "Ensayo",
        "Oferta clara"
      ],
      "scenes": [
        "En un puesto de artesanía preguntan por una silla restaurada. La artesana toca una etiqueta vacía.",
        "Guarda la etiqueta sin escribir y abre un cuaderno donde anotó todas las horas de restauración.",
        "En una etiqueta nueva apunta materiales y mano de obra. La coloca junto a la pata de la silla reparada.",
        "Con el puesto vacío, ensaya en voz alta el precio completo. La primera frase sale con cierta duda.",
        "El cliente regresa. La artesana muestra la unión reparada y dice la cantidad sin disculparse.",
        "El cliente pide tiempo para pensar. Ella asiente, y la etiqueta permanece junto a la silla."
      ]
    }
  },
  "money-blocks-s3": {
    "en": {
      "idea": "Receiving agreed payment is not an obligation to give more than the work already done.",
      "pitch": "A repairer accepts an ordinary exchange instead of reflexively refusing payment.",
      "symbol": "A paid receipt",
      "arc": [
        "Reflex",
        "Evidence",
        "Acceptance",
        "Thanks"
      ],
      "scenes": [
        "A neighbour collects a repaired lamp and offers the agreed payment. The repairer's hand moves away reflexively.",
        "The neighbour pauses and points to the written receipt beside the working lamp on the table.",
        "The repairer opens the receipt and checks the listed work against the lamp's steady light.",
        "They accept the amount that both had agreed on, without crossing out the price in embarrassment.",
        "The receipt is marked 'Paid'. The repairer offers a simple 'Thank you' and hands over the lamp.",
        "The neighbour leaves with the lamp. The receipt is filed, without a promise to work free next time."
      ]
    },
    "ru": {
      "idea": "Принять согласованную оплату не значит оказаться обязанным сделать ещё что-то бесплатно.",
      "pitch": "Мастер принимает честную оплату за починенную лампу.",
      "symbol": "Квитанция с отметкой об оплате",
      "arc": [
        "Рефлекс",
        "Факты",
        "Принятие",
        "Благодарность"
      ],
      "scenes": [
        "Сосед забирает починенную лампу и предлагает согласованную оплату. Рука мастера привычно отстраняется.",
        "Сосед замедляется и указывает на заранее выписанную квитанцию рядом с исправной лампой.",
        "Мастер раскрывает квитанцию, сверяет сделанную работу и видит, как лампа ровно светит на столе.",
        "Согласованная сумма принята. Мастер не зачёркивает написанную цену из неловкости перед соседом.",
        "На квитанции появляется отметка «Оплачено». Мастер произносит простое «Спасибо» и отдаёт лампу.",
        "Сосед уходит с лампой. Квитанция отправляется в папку, без новых обещаний следующей бесплатной работы."
      ]
    },
    "es": {
      "idea": "Recibir un pago acordado no obliga a regalar más trabajo después.",
      "pitch": "Quien reparó una lámpara acepta el intercambio sin rechazar el dinero por costumbre.",
      "symbol": "Un recibo pagado",
      "arc": [
        "Reflejo",
        "Hechos",
        "Aceptar",
        "Agradecer"
      ],
      "scenes": [
        "Una vecina recoge una lámpara reparada y ofrece el pago acordado. La mano de quien reparó se aparta.",
        "La vecina se detiene y señala el recibo escrito junto a la lámpara que ya funciona.",
        "Quien hizo el trabajo abre el recibo y comprueba la reparación mirando la luz estable de la lámpara.",
        "Acepta la cantidad acordada sin borrar el precio que había escrito por vergüenza.",
        "Anota «Pagado» en el recibo. Dice simplemente «Gracias» y entrega la lámpara reparada.",
        "La vecina sale con su lámpara. El recibo queda archivado sin prometer más trabajo gratis."
      ]
    }
  },
  "money-blocks-s4": {
    "en": {
      "idea": "A difficult conversation about shared money can start from one checked fact.",
      "pitch": "Two housemates find a respectful time to discuss a bill without forcing agreement.",
      "symbol": "Two cups beside an invoice",
      "arc": [
        "Avoidance",
        "Space",
        "Fact",
        "Open response"
      ],
      "scenes": [
        "An overdue shared electricity bill lies under unopened letters. One housemate almost hides it again.",
        "Two mugs of tea are set on a table. The other housemate sits down after being asked if now is convenient.",
        "The first person turns the bill so both can see the actual amount and due date, without blaming anyone.",
        "They say, 'This bill is due Friday; could we review it together?' A pen stays between the mugs.",
        "The second person marks a time for a budget conversation on the calendar, without promising a sum.",
        "The bill and calendar stay between two warm mugs. No final decision or reconciliation is pretended."
      ]
    },
    "ru": {
      "idea": "Трудный разговор о деньгах может начаться с одного проверенного факта.",
      "pitch": "Двое жильцов находят время обсудить общий счёт без требования немедленного согласия.",
      "symbol": "Две чашки и квитанция",
      "arc": [
        "Избегание",
        "Пространство",
        "Факт",
        "Ответ позже"
      ],
      "scenes": [
        "Общий счёт за электричество лежит под неоткрытой почтой. Один жилец почти прячет его снова.",
        "На стол ставят две чашки чая. Второй садится только после вопроса, удобно ли сейчас поговорить.",
        "Первый поворачивает счёт, чтобы обоим были видны настоящие сумма и срок, не обвиняя другого.",
        "Он говорит: «Оплатить нужно до пятницы. Посмотрим вместе?» Ручка лежит между чашками.",
        "Второй отмечает в календаре время разговора о бюджете, не обещая сейчас конкретную сумму.",
        "Квитанция и календарь остаются между чашками. Решение пока открыто, согласие не изображается."
      ]
    },
    "es": {
      "idea": "Una conversación difícil de dinero puede empezar con un hecho comprobado.",
      "pitch": "Dos compañeros de piso eligen cuándo revisar una factura sin forzar un acuerdo.",
      "symbol": "Dos tazas y una factura",
      "arc": [
        "Evitar",
        "Espacio",
        "Dato",
        "Responder después"
      ],
      "scenes": [
        "Una factura de luz compartida queda bajo las cartas. Una persona está a punto de esconderla otra vez.",
        "Coloca dos tazas de té en la mesa. La otra persona se sienta cuando le preguntan si puede hablar ahora.",
        "Gira la factura para que ambas vean el importe y el vencimiento, sin culpar a nadie.",
        "Dice: «Hay que pagar el viernes. ¿Lo revisamos juntos?» Un bolígrafo queda entre las tazas.",
        "La otra persona marca una hora para hablar del presupuesto, sin prometer una cantidad de inmediato.",
        "La factura y el calendario siguen entre dos tazas tibias. Todavía no han tomado la decisión final."
      ]
    }
  }
};
export const moneyEditorial=Object.freeze(Object.fromEntries(
 Object.entries(source).map(([id,locales])=>[id,Object.freeze(Object.fromEntries(
 ["ru","en","es"].map(locale=>{const x=locales[locale];return [locale,f(x.idea,x.pitch,x.scenes,x.symbol,x.arc)];})
 ))])
));
