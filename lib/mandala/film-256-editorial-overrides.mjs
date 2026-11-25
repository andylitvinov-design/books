/**
 * Individually directed films where four catalog fragments were insufficient.
 * These are original fictional storyboards, NOT claims about the viewer's life.
 * One source scene is one shot; the stock selector may only illustrate it.
 */
import {moneyEditorial} from "./film-256-money-editorial.mjs";
import {relationshipEditorial} from "./film-256-relationship-editorial.mjs";
import {selfAcceptanceEditorial} from "./film-256-self-acceptance-editorial.mjs";
import {selfEsteemEditorial} from "./film-256-self-esteem-editorial.mjs";
const film=(idea,pitch,scenes,symbol,arc)=>Object.freeze({idea,pitch,scenes,symbol,arc});
const A=Object.freeze({
 "motivation-drive-s1":{
 en:film("Meaning returns when an ordinary task becomes connected to a value chosen by the person doing it, not to a demand for constant motivation.",
 "A routine workday changes when one question on a forgotten card makes room for a small decision with personal meaning.",
 [
 "At a studio desk, an adult stamps an endless stack of identical paperwork. The last page slides forward automatically while the wall clock keeps ticking.",
 "As another form lands on the table, a small folded card falls from an old notebook. The person opens it: a simple handwritten question, 'Why?'",
 "They search the notebook and find a drawing of a small public garden. Their finger follows a path beside trees and a vacant bench.",
 "The person places the drawing beside the forms, opens the diary and circles a free half-hour marked for a local community planting day.",
 "Work resumes. This time a short message is written beside the stack: 'I can help for half an hour.' The person sends it.",
 "The notebook stays open next to the unfinished forms and the garden drawing. Nothing magical happened, but one concrete choice is now visible."
 ],"The folded question",["Routine","Recognition","A chosen step","An open beginning"]),
 ru:film("Смысл возвращается не по приказу. Иногда достаточно связать привычное дело с ценностью, которую человек выбирает сам.",
 "Одна забытая записка меняет привычный рабочий день: вместо механического движения появляется возможность личного выбора.",
 [
 "В мастерской человек без остановки ставит печати на одинаковых бумагах. Стопка медленно ползёт вперёд, часы продолжают мерно тикать.",
 "Из старого блокнота выпадает сложенная карточка. Герой разворачивает её и читает короткий вопрос, написанный от руки: «Зачем?»",
 "В блокноте находится рисунок небольшого общественного сада. Палец медленно проходит по дорожке рядом с деревьями и пустой скамейкой.",
 "Человек кладёт рисунок рядом с бумагами и отмечает в календаре свободные полчаса для помощи в местном саду.",
 "Работа продолжается, но рядом со стопкой появляется короткое сообщение: «Могу помочь полчаса». Герой отправляет его.",
 "Последний план держит открытый блокнот рядом с незаконченной работой. Ничего волшебного не произошло, но собственный выбор уже сделан."
 ],"Сложенная карточка",["Механический ритм","Встреча со смыслом","Личный выбор","Открытое начало"]),
 es:film("El sentido no aparece por obligación. A veces basta conectar una tarea cotidiana con un valor elegido personalmente.",
 "Una pregunta olvidada interrumpe una jornada automática y deja espacio para una decisión pequeña, pero propia.",
 [
 "En un taller, una persona sella papeles idénticos sin detenerse. La pila avanza lentamente mientras un reloj marca el tiempo.",
 "Una tarjeta doblada cae de un cuaderno antiguo. La abre y descubre una sola pregunta escrita a mano: «¿Para qué?»",
 "En el cuaderno encuentra el dibujo de un pequeño jardín comunitario. Un dedo recorre un sendero junto a los árboles.",
 "Coloca el dibujo al lado del trabajo y reserva media hora libre en el calendario para ayudar en el jardín.",
 "Vuelve a los papeles, pero al lado escribe un mensaje breve: «Puedo ayudar media hora». Lo envía.",
 "El cuaderno queda abierto junto a la pila inacabada. Nada se resolvió por arte de magia; una elección concreta ya existe."
 ],"La tarjeta doblada",["Rutina","Recuerdo del sentido","Elección propia","Comienzo abierto"])
 },
 "motivation-drive-s2":{
 en:film("The first spark is not an extraordinary feeling. Sometimes it is one imperfect mark that gives the next moment a different shape.",
 "A person waiting for inspiration finds that a tiny action can be enough to begin, with no duty to finish everything.",
 [
 "At a kitchen table, an untouched sketchbook sits beside cooling tea. A pencil moves from one hand to the other without touching the paper.",
 "A phone displays one more saved picture of a beautiful drawing. The person locks the screen and looks at their own empty page.",
 "Instead of planning a finished picture, they choose a single pencil from a jar and draw a crooked, almost accidental line.",
 "The line bends into the edge of a little bird. A second stroke becomes a wing; the person stops erasing every imperfection.",
 "They set down the pencil, look at the unfinished bird and notice how much of the blank page has already changed.",
 "The final image holds the small bird, the jar and the still-open sketchbook. The pencil rests beside it, ready for either another mark or a break."
 ],"The first imperfect line",["Waiting","First movement","Noticing","Freedom to continue"]),
 ru:film("Искра начала — не обязательно вдохновение. Иногда это один неровный штрих, после которого пустая страница уже выглядит иначе.",
 "Ожидая особого настроения, человек обнаруживает простой способ начать без обязательства немедленно завершить всё.",
 [
 "На кухонном столе лежит чистый альбом рядом с остывающим чаем. Карандаш переходит из одной руки в другую, не касаясь бумаги.",
 "На телефоне открыто ещё одно сохранённое красивое изображение. Человек гасит экран и снова смотрит на собственный пустой лист.",
 "Вместо плана идеального рисунка герой выбирает один карандаш из банки и проводит неровную, почти случайную линию.",
 "Линия превращается в очертание маленькой птицы. Второй штрих становится крылом; рука впервые не тянется сразу за ластиком.",
 "Человек откладывает карандаш, смотрит на незавершённую птицу и замечает, как сильно уже изменилась пустая страница.",
 "На последнем кадре — маленькая птица, банка карандашей и открытый альбом. Можно продолжить, а можно сделать паузу."
 ],"Первый неровный штрих",["Ожидание","Первое движение","Замеченный отклик","Свободный выбор"]),
 es:film("La primera chispa no tiene por qué ser una emoción extraordinaria. A veces es una línea imperfecta que transforma una página vacía.",
 "Mientras espera inspiración, una persona descubre que un gesto pequeño basta para comenzar sin obligación de terminarlo todo.",
 [
 "En la mesa de la cocina hay un cuaderno vacío junto a un té que se enfría. Un lápiz cambia de mano sin tocar el papel.",
 "En el móvil aparece otro dibujo precioso guardado. La persona apaga la pantalla y vuelve a mirar su propia página en blanco.",
 "En lugar de planear una obra perfecta, toma un lápiz del bote y traza una línea torcida, casi por accidente.",
 "La línea se convierte en el contorno de un pájaro pequeño. El segundo trazo forma un ala; esta vez no busca la goma.",
 "Deja el lápiz y contempla el pájaro incompleto. Se da cuenta de cuánto ha cambiado ya la página.",
 "En el último plano están el pájaro, el bote y el cuaderno abierto. Puede seguir dibujando o descansar."
 ],"La primera línea torcida",["Espera","Primer movimiento","Respuesta observada","Libertad de elegir"])
 },
 "motivation-drive-s3":{
 en:film("When energy is scarce, a smaller, more humane plan can matter more than another demand to be productive.",
 "An overwhelming to-do list becomes a moment of choice: ask for help, reduce the load and allow rest.",
 [
 "On a crowded desk, a huge to-do list spills over two pages. An exhausted person reads the last line and slowly closes their eyes.",
 "An alarm reminds them of three more tasks. They reach for a pen, hesitate and put it back without crossing out anything.",
 "The person folds the sheet and draws a line through the tasks that can safely wait until another day.",
 "On a fresh card they write one manageable request: 'Could you help me check this tomorrow?' Their thumb hovers over Send, then taps it.",
 "A reply appears: 'Yes, tomorrow is fine.' They put the phone beside the much shorter list and take their hands off the desk.",
 "The list remains incomplete. In the final wide shot the person sits back with a cup of tea, leaving the next task for another time."
 ],"The shorter list",["Overwhelm","An honest limit","Asking for support","Room to rest"]),
 ru:film("Когда сил мало, человеческий план бывает полезнее, чем очередной приказ себе собраться и стать продуктивнее.",
 "Огромный список дел становится поводом уменьшить нагрузку, попросить о помощи и позволить себе отдых.",
 [
 "На заваленном столе список дел не помещается на двух страницах. Уставший человек дочитывает последнюю строку и на мгновение закрывает глаза.",
 "Будильник напоминает ещё о трёх задачах. Герой берёт ручку, замирает и кладёт её обратно, ничего не зачеркнув.",
 "Человек складывает лист пополам и переносит на завтра дела, которые действительно могут подождать без вреда.",
 "На чистой карточке появляется короткая просьба: «Поможешь мне проверить это завтра?» Палец медлит над кнопкой и отправляет сообщение.",
 "Приходит ответ: «Да, завтра подойдёт». Телефон ложится рядом с заметно укороченным списком, руки свободно опускаются.",
 "Список остаётся незавершённым. В общем плане человек откидывается на спинку стула с чашкой чая, оставляя остальные дела на потом."
 ],"Короткий список",["Перегрузка","Реальная граница","Просьба о поддержке","Возможность отдохнуть"]),
 es:film("Cuando faltan fuerzas, un plan pequeño y humano puede importar más que otra orden de ser productivo.",
 "Una lista interminable abre una elección sencilla: pedir ayuda, reducir la carga y permitirse descansar.",
 [
 "Sobre una mesa abarrotada, la lista de tareas ocupa dos páginas. Una persona cansada lee la última línea y cierra los ojos un instante.",
 "Una alarma anuncia otras tres tareas. Toma el bolígrafo, duda y lo devuelve sin tachar nada.",
 "Dobla la hoja y separa las tareas que pueden esperar sin causar problemas hasta el día siguiente.",
 "En una tarjeta limpia escribe: «¿Me ayudas a revisar esto mañana?» El dedo se detiene sobre Enviar y finalmente pulsa.",
 "Llega una respuesta: «Sí, mañana está bien». El móvil queda junto a la lista ya más corta; las manos descansan.",
 "La lista sigue incompleta. En el plano final, la persona se recuesta con una taza de té y deja las otras tareas para después."
 ],"La lista breve",["Sobrecarga","Un límite real","Pedir apoyo","Tiempo para descansar"])
 },
 "motivation-drive-s4":{
 en:film("Sometimes momentum begins not in solitude but when another person shares the first ordinary action without judgment or competition.",
 "Two people find a way to begin a delayed community project by completing one small, shared task.",
 [
 "In a small hall, an adult struggles to hold a rolled-up event poster against a wall. The paper curls and falls to the floor.",
 "Someone enters carrying a second chair. Instead of giving advice, they set it beside the first chair and kneel by the poster.",
 "One person smooths the paper while the other holds the corners. The roll finally stays flat between their hands.",
 "They fix the poster to a board with two strips of tape, leaving an empty line where the event's date will go.",
 "Together they check a calendar, agree on one possible afternoon and write the date on the poster in large letters.",
 "The camera pulls back: the modest poster hangs on the board. The two chairs remain beside it, with room for others to join."
 ],"Two chairs and a poster",["Trying alone","Shared action","A first result","Room for others"]),
 ru:film("Иногда движение начинается не в одиночестве, а рядом с человеком, который разделяет первый шаг без оценок и соревнования.",
 "Двое берутся за отложенный общественный проект и завершают одно маленькое дело, которое одному никак не давалось.",
 [
 "В небольшом зале человек пытается прикрепить свёрнутую афишу к стене. Бумага загибается и снова падает на пол.",
 "Входит другой человек и приносит второй стул. Вместо советов он ставит стул рядом и присаживается к афише.",
 "Один расправляет бумагу, другой придерживает уголки. Лист наконец спокойно лежит между их ладонями.",
 "Они закрепляют афишу двумя полосками скотча, оставляя пустое место для даты будущего события.",
 "Вместе открывают календарь, выбирают подходящий день и крупно записывают дату на афише.",
 "Камера отъезжает: скромная афиша висит на доске. Рядом стоят два стула, и для других ещё осталось место."
 ],"Два стула и афиша",["Один не справляется","Совместное действие","Первый результат","Пространство для других"]),
 es:film("A veces el impulso empieza cuando alguien comparte un primer gesto cotidiano, sin juzgar ni competir.",
 "Dos personas consiguen poner en marcha un proyecto comunitario aplazado haciendo juntos una tarea pequeña.",
 [
 "En una sala, una persona intenta sujetar un cartel enrollado contra la pared. El papel se curva y vuelve a caer al suelo.",
 "Entra otra persona con una segunda silla. En lugar de dar consejos, la coloca al lado y se arrodilla junto al cartel.",
 "Una alisa el papel mientras la otra sujeta las esquinas. La hoja por fin queda plana entre sus manos.",
 "Fijan el cartel al tablero con dos tiras de cinta y dejan una línea libre para escribir la fecha.",
 "Abren un calendario, acuerdan una tarde posible y anotan la fecha en letras grandes.",
 "La cámara se aleja: el cartel sencillo queda colgado. Las dos sillas siguen allí, con espacio para que se unan otras personas."
 ],"Dos sillas y un cartel",["Intento solitario","Acción compartida","Primer resultado","Espacio para otros"])
 },
 ...moneyEditorial,
 ...relationshipEditorial,
 ...selfAcceptanceEditorial,
 ...selfEsteemEditorial
});
export function getFilm256EditorialOverride(id,locale="en"){return A[id]?.[locale]||null;}
export const film256EditorialOverrideIds=Object.freeze(Object.keys(A));
