// Editorial language corrections anchored to the original source text. These
// translate the author's archive; they do not medically validate its claims.
// The complete source file SHA is checked before this function is called.
const substances = new Map([
  ['Собачья петрушка', 'Perejil de perro'], ['Оксид алюминия', 'Óxido de aluminio'],
  ['Висмут', 'Bismuto'], ['пчелиный яд', 'Veneno de abeja'], ['Нитрат серебра', 'Nitrato de plata'],
  ['золото', 'Oro'], ['энергия овса', 'Energía de la avena'], ['карбонат бария', 'Carbonato de bario'],
  ['Бериллий / бериллий металл', 'Berilio / berilio metálico'], ['Ботропс, копьеголовая змея', 'Bothrops, serpiente de cabeza de lanza'],
  ['гриб пылевик', 'Hongo bejín'], ['камфора', 'Alcanfor'], ['Шпанская мушка', 'Mosca española'],
  ['Медноголовая змея', 'Serpiente cabeza de cobre'], ['хинна', 'Quina'], ['Кобальт', 'Cobalto'],
  ['Коккулюс, ядовитая лиана из Индии', 'Cocculus, una liana venenosa de la India'], ['Безвременник', 'Cólquico'],
  ['Цикламен / альпийская фиалка', 'Ciclamen / violeta de los Alpes'], ['железо', 'Hierro'],
  ['Женский половой гармон экстраген', 'Hormona sexual femenina: estrógeno'], ['Черный морозник', 'Eléboro negro'],
  ['Гидрастис, Золотарник канадский', 'Hydrastis, vara de oro canadiense'], ['водород', 'Hidrógeno'],
  ['Иодистый калий', 'Yoduro de potasio'], ['Ослиное молоко', 'Leche de burra'], ['материнское молоко', 'Leche materna'],
  ['яд змеи', 'Veneno de serpiente'], ['Вольчье лыко, кустарник', 'Dafne, un arbusto'], ['сода', 'Soda'],
  ['Сульфат натрия, глауберова соль', 'Sulfato de sodio, sal de Glauber'], ['Азотная кислота', 'Ácido nítrico'],
  ['Фитолакка', 'Fitolaca'], ['Рута душистая', 'Ruda'], ['Молочный сахар', 'Azúcar de la leche'],
  ['Тростниковый сахар', 'Azúcar de caña'], ['Сангвинария, кровавый корень', 'Sanguinaria, raíz de sangre'],
  ['кремень', 'Sílex'], ['Морская губка', 'Esponja marina'], ['сера', 'Azufre'], ['Тестостерон', 'Testosterona'],
  ['чабрец', 'Tomillo'], ['Туя западная', 'Tuya occidental'], ['энергия крапивы', 'Energía de la ortiga'],
]);
const lines = new Map([
  ['Poisonous. It is also called Borets (“Wrestler”), Tsar-grass, black root, and black potion.', 'Venenoso. También se llama Borets («luchador»), hierba del zar, raíz negra y poción negra.'],
  ['Buttercup/Anemone, a soft, delicate flower.', 'Ranúnculo/anémona, una flor suave y delicada.'],
  ['- Mentally cast off the chains. Whisper, then say loudly:', '- Libérate mentalmente de las cadenas. Susurra y después di en voz alta:'],
  ['- I cleanse and come alive.', '- Me purifico y vuelvo a sentirme vivo.'],
  ['- Rejected child (believes he is bad)', '- Niño rechazado (cree que es malo)'],
  ['You will open your window wide,', 'Abrirás de par en par tu ventana,'],
  ['BACH CERATO Remedy', 'BACH CERATO — remedio'], ['BACH ELM Remedy', 'BACH ELM — remedio'], ['BACH OAK Remedy', 'BACH OAK — remedio'],
  ['CAMPHORA (camphor).', 'CAMPHORA (alcanfor).'], ['- Liberator', '- Libertador'], ['- temptress', '- Tentadora'],
  ['🧪 SACCHARUM OFFICINALE (Cane Sugar)', '🧪 SACCHARUM OFFICINALE (azúcar de caña)'],
  ['SILICEA (flint).', 'SILICEA (sílex).'], ['SULPHUR (Sage).', 'SULPHUR (el sabio).'], ['TEUCRIUM (thyme)', 'TEUCRIUM (tomillo)'],
  ['ADMINISTRATION', 'Presentación'],
]);
export function applySpanishReview(original, translatedFields) {
  const fields = { ...translatedFields };
  if (substances.has(original.source_substance)) fields.source_substance = substances.get(original.source_substance);
  for (const field of Object.keys(fields)) {
    const sourceLines = original[field].split('\n');
    const translatedLines = fields[field].split('\n');
    if (sourceLines.length !== translatedLines.length) throw new Error('Spanish line review mismatch');
    fields[field] = translatedLines.map((line, index) => {
      const source = sourceLines[index];
      if (lines.has(source)) return lines.get(source);
      const reference = source.match(/^(- message\d+ — )case\.$/);
      if (reference) return reference[1] + 'caso.';
      return line.replace(/\bSHADOW\b/g, 'Sombra').replace(/\bGuardian\b/g, 'Guardián').replace(/\bPracticum\b/g, 'prácticas');
    }).join('\n');
  }
  return fields;
}
