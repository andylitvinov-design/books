import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import vm from 'node:vm'

// Frozen pre-NAV2 authored outputs: module, locale, day, original ID/title/hash.
const legacySnapshots = [
  {"moduleId":"AS1","locale":"en","day":1,"id":"hh-opora-as1-01-hh-growth-v4-20261013","title":"Permission to pause","sha256":"8b25924144a281e0ce5630631ee314c288621e91356ed7c907a5d1840865bac6"},
  {"moduleId":"AS1","locale":"en","day":2,"id":"hh-opora-as1-02-hh-growth-v4-20261013","title":"My comfortable pace","sha256":"068ee1ccd65e4d093331cfbf5435e827aacfd289278d8491854c32e29077fb9f"},
  {"moduleId":"AS1","locale":"en","day":3,"id":"hh-opora-as1-03-hh-growth-v4-20261013","title":"Three ordinary objects","sha256":"a06020e0033062e824c74945421d63cf700628eaf7671703fbf3c76ff69454f4"},
  {"moduleId":"AS1","locale":"en","day":4,"id":"hh-opora-as1-04-hh-growth-v4-20261013","title":"One familiar anchor","sha256":"45e6ad9ce791172cd023c342768c33930967d2c867bb15b8f5d5a981a02aa5d7"},
  {"moduleId":"AS1","locale":"en","day":5,"id":"hh-opora-as1-05-hh-growth-v4-20261013","title":"Choosing comfortable input","sha256":"0911c2e7d7806d1412afad2633e87b3ff81c406e77ca05a2b7afe0cc9eb0162e"},
  {"moduleId":"AS1","locale":"en","day":6,"id":"hh-opora-as1-06-hh-growth-v4-20261013","title":"I can switch formats","sha256":"c55b6a831337aaa07ba3b61dafa5e10abaaaaf779a187fd93431cd2ba079da39"},
  {"moduleId":"AS1","locale":"en","day":7,"id":"hh-opora-as1-07-hh-growth-v4-20261013","title":"My real supports","sha256":"f67f36e46f6572a6c5239ac03b154f42617f8e2b2c4ea536b76656c45168976c"},
  {"moduleId":"AS1","locale":"en","day":8,"id":"hh-opora-as1-08-hh-growth-v4-20261013","title":"Surface and surroundings","sha256":"b81b740e5681fe22caae03a54227ad17fe10197badc17866279efb670d5a3278"},
  {"moduleId":"AS1","locale":"en","day":9,"id":"hh-opora-as1-09-hh-growth-v4-20261013","title":"My early pause signal","sha256":"dd5a4bfcaa40693b92688b3f60a1aa09823bb8a4c5bb2cf9123215a8faa206bd"},
  {"moduleId":"AS1","locale":"en","day":10,"id":"hh-opora-as1-10-hh-growth-v4-20261013","title":"Doing less is allowed","sha256":"852d927a661d542af45a90327ee89048668cc58e8b9c4d25effc08654c4693ae"},
  {"moduleId":"AS1","locale":"en","day":11,"id":"hh-opora-as1-11-hh-growth-v4-20261013","title":"A simple boundary phrase","sha256":"d99cef38ac520c88ab5d3e87d39fb5b1b15622edafb8606dbb4e18005f76640f"},
  {"moduleId":"AS1","locale":"en","day":12,"id":"hh-opora-as1-12-hh-growth-v4-20261013","title":"Available help","sha256":"8ff426436a6bc87b5435db254a67cf6c046c401d0d56bba3bdae1cff8b819592"},
  {"moduleId":"AS1","locale":"en","day":13,"id":"hh-opora-as1-13-hh-growth-v4-20261013","title":"Choosing my familiar support","sha256":"7942bf751bd2b1a34113b928563c14e33412079419ea2151599b5297fb7ba7d1"},
  {"moduleId":"AS1","locale":"en","day":14,"id":"hh-opora-as1-14-hh-growth-v4-20261013","title":"My gentle starting map","sha256":"513715c08e21a7a41d1b9a872e1fb8aa0aec2071bed186929987bb4903ae3fa5"},
  {"moduleId":"AS1","locale":"ru","day":1,"id":"hh-opora-as1-01-hh-growth-v4-20261013","title":"Право остановиться","sha256":"a21592c5f17458445acfd8ae780c58329df91afb7d358aace8543e638f8ce45b"},
  {"moduleId":"AS1","locale":"ru","day":2,"id":"hh-opora-as1-02-hh-growth-v4-20261013","title":"Мой удобный темп","sha256":"2194836f586a085d9c3c7d544a3f4a29bfa002c7998047aad3fac6a614018fc8"},
  {"moduleId":"AS1","locale":"ru","day":3,"id":"hh-opora-as1-03-hh-growth-v4-20261013","title":"Три обычных предмета","sha256":"574305063d0b2232ec4196d328d974c13fc26ff04cb86463a78b81fb1a960b1c"},
  {"moduleId":"AS1","locale":"ru","day":4,"id":"hh-opora-as1-04-hh-growth-v4-20261013","title":"Один знакомый ориентир","sha256":"4077b06806165ca057967ee64058c5057ee38793dd6261a3b032631c7294417b"},
  {"moduleId":"AS1","locale":"ru","day":5,"id":"hh-opora-as1-05-hh-growth-v4-20261013","title":"Выбираю комфортные стимулы","sha256":"9558d7fa1f4991a7d473855842b29885168dfdce66ed3ce963bbf5e177397750"},
  {"moduleId":"AS1","locale":"ru","day":6,"id":"hh-opora-as1-06-hh-growth-v4-20261013","title":"Я могу сменить формат","sha256":"14ad85f648efe57304a7686d4c34898593a9fa254ad5d94450f00bf01e0ff9a5"},
  {"moduleId":"AS1","locale":"ru","day":7,"id":"hh-opora-as1-07-hh-growth-v4-20261013","title":"Мои реальные опоры","sha256":"a9e2ef454f8112e32d2927179158ba108199fc671c0edc5fca6570bc8c8da90b"},
  {"moduleId":"AS1","locale":"ru","day":8,"id":"hh-opora-as1-08-hh-growth-v4-20261013","title":"Поверхность и пространство","sha256":"b9612e2ff20a195db1d5154638a40dd6adea4a9d0e29152979fadb085527a78b"},
  {"moduleId":"AS1","locale":"ru","day":9,"id":"hh-opora-as1-09-hh-growth-v4-20261013","title":"Ранний знак остановки","sha256":"b3cc231c55f263f436ea9b965b8f236aaadde4cdddd4276ddbf1b33994722a48"},
  {"moduleId":"AS1","locale":"ru","day":10,"id":"hh-opora-as1-10-hh-growth-v4-20261013","title":"Можно сделать меньше","sha256":"a1b9e37ef9ea58328a2d1f6666573aac1fe583ba514debf9394dea6376b3d774"},
  {"moduleId":"AS1","locale":"ru","day":11,"id":"hh-opora-as1-11-hh-growth-v4-20261013","title":"Спокойная фраза границы","sha256":"9ba9442242b9301056c4a9e238be01227c43d2c8277349f6cfc2e2e936775c65"},
  {"moduleId":"AS1","locale":"ru","day":12,"id":"hh-opora-as1-12-hh-growth-v4-20261013","title":"Доступная помощь","sha256":"840cc9cb46e4f9cf4b1d7450df919c3ae6f3f9444d9b0335b5d6a544698bad2b"},
  {"moduleId":"AS1","locale":"ru","day":13,"id":"hh-opora-as1-13-hh-growth-v4-20261013","title":"Я выбираю знакомую опору","sha256":"8759fe95af04cb43bca5bd34f5f8ef35bc6d23ee15b714839cbdba71beed3db4"},
  {"moduleId":"AS1","locale":"ru","day":14,"id":"hh-opora-as1-14-hh-growth-v4-20261013","title":"Карта моего безопасного начала","sha256":"1b89a653a187989f67e29bf2ae37a6b0a15363b0ea67567b828e51fc6d7d4dc7"},
  {"moduleId":"AS2","locale":"en","day":1,"id":"hh-growth-calm_regulation-01-hh-antistress-outcomes-v3-20261014","title":"I am here, and I can choose","sha256":"9fa5fa1957e9d12eee11d6f706753287744775b9bdfb83af1e7d1c78d7de65c3"},
  {"moduleId":"AS2","locale":"en","day":2,"id":"hh-growth-calm_regulation-02-hh-antistress-outcomes-v3-20261014","title":"I can return my attention","sha256":"7861b33153014bb33ea5727005dd4ee5654782265a25743b5cc3f4a671d84faa"},
  {"moduleId":"AS2","locale":"en","day":3,"id":"hh-growth-calm_regulation-03-hh-antistress-outcomes-v3-20261014","title":"My early overload signal","sha256":"7e4eb93bedcf20139f30655b641ea76b407560f3ddbb7adb4e9b5720f84ebf5d"},
  {"moduleId":"AS2","locale":"en","day":4,"id":"hh-growth-calm_regulation-04-hh-antistress-outcomes-v3-20261014","title":"Too much pressure or too little energy?","sha256":"fd7302c678f2968128a32694942ab20ae2f6440a8c6861f54d0a7da4a4474a89"},
  {"moduleId":"AS2","locale":"en","day":5,"id":"hh-growth-calm_regulation-05-hh-antistress-outcomes-v3-20261014","title":"A gentle pause for body and attention","sha256":"cbb12bb7a8707b391fc671164f8d40278d9c6d22f9810c35f5de0ca3a7ebb9b0"},
  {"moduleId":"AS2","locale":"en","day":6,"id":"hh-growth-calm_regulation-06-hh-antistress-outcomes-v3-20261014","title":"I can adjust the effort and make room for rest","sha256":"5c09749d60a662964f0e163e9444c517ccb8b61fecd88f5638eadc5851543ef8"},
  {"moduleId":"AS2","locale":"en","day":7,"id":"hh-growth-calm_regulation-07-hh-antistress-outcomes-v3-20261014","title":"Real support and one manageable demand","sha256":"38d0ebaf611c107312563e8b2db3a90899209b463bb21fbbc8a8ae4873246aaf"},
  {"moduleId":"AS2","locale":"en","day":8,"id":"hh-growth-calm_regulation-08-hh-antistress-outcomes-v3-20261014","title":"A resource I can use, plus real recovery","sha256":"df7ce907ea4d90a088ac7abebc10d7ccc124ec3dba4f79c84bd44c7d5da59a57"},
  {"moduleId":"AS2","locale":"en","day":9,"id":"hh-growth-calm_regulation-09-hh-antistress-outcomes-v3-20261014","title":"A worrying thought is not a confirmed fact","sha256":"f564ebb7d9d5236d5670ee6a875010cecb1932813319fe0308bd7230e9c93ddb"},
  {"moduleId":"AS2","locale":"en","day":10,"id":"hh-growth-calm_regulation-10-hh-antistress-outcomes-v3-20261014","title":"Fact, assumption and one manageable step","sha256":"dca612c6a6e0146d407add1923ff2b91eb8ab1c259f7e3f1eac184b05d83f9e0"},
  {"moduleId":"AS2","locale":"en","day":11,"id":"hh-growth-calm_regulation-11-hh-antistress-outcomes-v3-20261014","title":"A boundary without confrontation","sha256":"07c95f0994efc826b8350f42d42e261f550d5b14dfa6892efc6fbf116d81a685"},
  {"moduleId":"AS2","locale":"en","day":12,"id":"hh-growth-calm_regulation-12-hh-antistress-outcomes-v3-20261014","title":"People and practical help can be part of support","sha256":"e3273bddac75f46a7d498714a3890340636cde902443e07e8e8d73edf6276a0d"},
  {"moduleId":"AS2","locale":"en","day":13,"id":"hh-growth-calm_regulation-13-hh-antistress-outcomes-v3-20261014","title":"Which familiar support fits this situation?","sha256":"fb883c8d7ecd9a90fdf6833e43e000dd24fd5e890b0f73efdd90ba2e7f46998d"},
  {"moduleId":"AS2","locale":"en","day":14,"id":"hh-growth-calm_regulation-14-hh-antistress-outcomes-v3-20261014","title":"My practical OPORA support plan","sha256":"3c14be05980c7cf98efbccc4ab22d428e9fc7247a29e7bb8148a39babd463113"},
  {"moduleId":"AS2","locale":"ru","day":1,"id":"hh-growth-calm_regulation-01-hh-antistress-outcomes-v3-20261014","title":"Я здесь, и могу выбирать","sha256":"24a59988cf6619299a27912b4eb99cb022138f575a6dec123eb21bc8ba78ce87"},
  {"moduleId":"AS2","locale":"ru","day":2,"id":"hh-growth-calm_regulation-02-hh-antistress-outcomes-v3-20261014","title":"Я могу возвращать внимание","sha256":"6385fcef45f35a11a82828543e6e6c3b3a62bab686339530ad3fa32065f03b82"},
  {"moduleId":"AS2","locale":"ru","day":3,"id":"hh-growth-calm_regulation-03-hh-antistress-outcomes-v3-20261014","title":"Мой ранний сигнал перегрузки","sha256":"532657edb50f2a5910c8eef4e829ce634e1cb7bf63636d3c24c48bcce069efcd"},
  {"moduleId":"AS2","locale":"ru","day":4,"id":"hh-growth-calm_regulation-04-hh-antistress-outcomes-v3-20261014","title":"Слишком много давления или слишком мало сил?","sha256":"2b278a36ee3a7bbfc9ba46c2b921663b00ca75141b2641e88b7c70930c44491f"},
  {"moduleId":"AS2","locale":"ru","day":5,"id":"hh-growth-calm_regulation-05-hh-antistress-outcomes-v3-20261014","title":"Мягкая пауза для тела и внимания","sha256":"8457958e1f82af0e86f3e136cf3d16664202d079dd0cb734ffba211dd705178d"},
  {"moduleId":"AS2","locale":"ru","day":6,"id":"hh-growth-calm_regulation-06-hh-antistress-outcomes-v3-20261014","title":"Я могу менять нагрузку и оставлять место отдыху","sha256":"f70ef37c98bb1becab3e6f8e548bf93065070615a55630beaccf54b4b5655b4d"},
  {"moduleId":"AS2","locale":"ru","day":7,"id":"hh-growth-calm_regulation-07-hh-antistress-outcomes-v3-20261014","title":"Реальные опоры и одно посильное требование","sha256":"4933ee438e36d52833caeda78987bf65b183f7886cbfc5cdae312f8e0ffea96a"},
  {"moduleId":"AS2","locale":"ru","day":8,"id":"hh-growth-calm_regulation-08-hh-antistress-outcomes-v3-20261014","title":"Ресурсный образ и настоящее восстановление","sha256":"0d0958607d5a2093d36303ca64991c99df291aef2b8b345de0b2b6891bb51915"},
  {"moduleId":"AS2","locale":"ru","day":9,"id":"hh-growth-calm_regulation-09-hh-antistress-outcomes-v3-20261014","title":"Тревожная мысль не равна установленному факту","sha256":"9971f5b8c2789ae9d1d533d3aec361692186c789e2fee01b02d87617426268bb"},
  {"moduleId":"AS2","locale":"ru","day":10,"id":"hh-growth-calm_regulation-10-hh-antistress-outcomes-v3-20261014","title":"Факт, предположение и один посильный шаг","sha256":"2e5585bb76e96fe25c71450f9d94e4e0339ed16f10e2181ebcc72ac133216c63"},
  {"moduleId":"AS2","locale":"ru","day":11,"id":"hh-growth-calm_regulation-11-hh-antistress-outcomes-v3-20261014","title":"Граница без конфликта","sha256":"329613612837b1f653820c028ec210da9538510b2ac8e96c430f7f63536a4bd9"},
  {"moduleId":"AS2","locale":"ru","day":12,"id":"hh-growth-calm_regulation-12-hh-antistress-outcomes-v3-20261014","title":"Люди и практическая помощь могут быть опорой","sha256":"3b92126cecbc603cb57826a9be22acb52b102a4e98f1af48e1c7b8f5d3c9f523"},
  {"moduleId":"AS2","locale":"ru","day":13,"id":"hh-growth-calm_regulation-13-hh-antistress-outcomes-v3-20261014","title":"Какая знакомая опора подходит сейчас?","sha256":"036dbad5abb1deb28a02c227e7e0695f7e538d948c2282f3efdf78407c3bd9da"},
  {"moduleId":"AS2","locale":"ru","day":14,"id":"hh-growth-calm_regulation-14-hh-antistress-outcomes-v3-20261014","title":"Моя практическая карта ОПОРА","sha256":"3c4fbbbb5558eb1d518bd84c79e773f94526351037c853853635302fc34e5d75"},
  {"moduleId":"AS3","locale":"en","day":1,"id":"hh-opora-as3-01-hh-growth-v4-20261013","title":"Naming a feeling","sha256":"d5565fa1f875aba7a01cc72b131a03c5887651a1dc087b845f74bbdf00020d0d"},
  {"moduleId":"AS3","locale":"en","day":2,"id":"hh-opora-as3-02-hh-growth-v4-20261013","title":"Mixed feelings","sha256":"d46c875543f51ebff00de0cc0ed80d86747e3bfebe696568ca82d607e125adfa"},
  {"moduleId":"AS3","locale":"en","day":3,"id":"hh-opora-as3-03-hh-growth-v4-20261013","title":"The volume of a feeling","sha256":"c321c3b81f2cb18b8e9d5dba4522f14e4cdb1dce0a74d635fc9032a8588eaa92"},
  {"moduleId":"AS3","locale":"en","day":4,"id":"hh-opora-as3-04-hh-growth-v4-20261013","title":"Closeness and distance","sha256":"d8c7b6655dcd5eb89601b5c160548710801b07ece75b5f69b7056bd9bd255ffd"},
  {"moduleId":"AS3","locale":"en","day":5,"id":"hh-opora-as3-05-hh-growth-v4-20261013","title":"Three image associations","sha256":"ee5f0ef0fd8b28ac49c2a5d3eef5e266e3b6e960c2d1fe7dd07d826f942283de"},
  {"moduleId":"AS3","locale":"en","day":6,"id":"hh-opora-as3-06-hh-growth-v4-20261013","title":"Five ordinary qualities","sha256":"5de0a47c7c9b2c3a7c2236156ab0be526bd8af50768c999088996884f69909b1"},
  {"moduleId":"AS3","locale":"en","day":7,"id":"hh-opora-as3-07-hh-growth-v4-20261013","title":"Feelings and needs","sha256":"133b89fb41c2ba36d285927fd15bd1c3aea46d110c1aecac9695433586fb1153"},
  {"moduleId":"AS3","locale":"en","day":8,"id":"hh-opora-as3-08-hh-growth-v4-20261013","title":"Kind response to feelings","sha256":"76d81928d50496c6fe8ec7c564f2368c6e10cd7c6df8a592bf69f359390f1d56"},
  {"moduleId":"AS3","locale":"en","day":9,"id":"hh-opora-as3-09-hh-growth-v4-20261013","title":"Feelings are not commands","sha256":"a55a6f63e044a3642fa234b5d8d8c337a5750f001b6a04e1484862c62e0454e4"},
  {"moduleId":"AS3","locale":"en","day":10,"id":"hh-opora-as3-10-hh-growth-v4-20261013","title":"Several ways to respond","sha256":"f65b526cdbe1ca70277660d899cd9d27d3a4e55b89ac7e2f15c916957fe9466b"},
  {"moduleId":"AS3","locale":"en","day":11,"id":"hh-opora-as3-11-hh-growth-v4-20261013","title":"A boundary under stress","sha256":"b114eb1721c9333b40fee4573ed0e4da61d8b2a4f27b366930c5501c429c2322"},
  {"moduleId":"AS3","locale":"en","day":12,"id":"hh-opora-as3-12-hh-growth-v4-20261013","title":"Back to the room","sha256":"aa6538ec2f232697c637c9e816bf29cb11547fc3464ea409869a50dcc9e3ae74"},
  {"moduleId":"AS3","locale":"en","day":13,"id":"hh-opora-as3-13-hh-growth-v4-20261013","title":"Choosing my own response","sha256":"e3609ba172fb4928acf494fbaea5b7fff7b19d0f70fb3e3db3b377553c413e81"},
  {"moduleId":"AS3","locale":"en","day":14,"id":"hh-opora-as3-14-hh-growth-v4-20261013","title":"My feelings map","sha256":"7a83ba58de3b68c51059f5558e5944d39b18fc78e8f95ee52d008b7b7fff8089"},
  {"moduleId":"AS3","locale":"ru","day":1,"id":"hh-opora-as3-01-hh-growth-v4-20261013","title":"Называю эмоцию","sha256":"2177934302fbdf9c3aad5ac4709c338b171b3e326e332cc5e7b8c39ee28f24b8"},
  {"moduleId":"AS3","locale":"ru","day":2,"id":"hh-opora-as3-02-hh-growth-v4-20261013","title":"Смешанные чувства","sha256":"742ce854236d4187fa4281daec3d16236c05188bc331becf68e384543a97e285"},
  {"moduleId":"AS3","locale":"ru","day":3,"id":"hh-opora-as3-03-hh-growth-v4-20261013","title":"Громкость чувства","sha256":"15e1519bdac30d1b9147baedcda34d57744dea0a5ad2f23f5e7ab868fbc2cfc4"},
  {"moduleId":"AS3","locale":"ru","day":4,"id":"hh-opora-as3-04-hh-growth-v4-20261013","title":"Близость и дистанция","sha256":"ad8af10ab795566c9f749cfab1d1bb326f0c4955b0d11585735d56da6de6b0d8"},
  {"moduleId":"AS3","locale":"ru","day":5,"id":"hh-opora-as3-05-hh-growth-v4-20261013","title":"Три ассоциации к картинке","sha256":"20ca3c9942c51bf315ed19dc067da1dbb0fbc8b2727981f5093b8cc6e8342878"},
  {"moduleId":"AS3","locale":"ru","day":6,"id":"hh-opora-as3-06-hh-growth-v4-20261013","title":"Пять простых качеств","sha256":"d55050185dae848f11beeb7ea0bb55f2af8c3561fb6606f31ee3d38fb53c0891"},
  {"moduleId":"AS3","locale":"ru","day":7,"id":"hh-opora-as3-07-hh-growth-v4-20261013","title":"Чувство и возможная потребность","sha256":"2e57b98e65e8d9cad4752507d4b156c0cd26853c9aab1ef51adbb92f9c17b071"},
  {"moduleId":"AS3","locale":"ru","day":8,"id":"hh-opora-as3-08-hh-growth-v4-20261013","title":"Мягкая помощь чувству","sha256":"c398bebd11beaf4ea49dfeb9c941d07fd0d56d203d1852c404b037d869e8bf13"},
  {"moduleId":"AS3","locale":"ru","day":9,"id":"hh-opora-as3-09-hh-growth-v4-20261013","title":"Чувство — не приказ","sha256":"8b130315454e4c8fb45684c449fbc2ec4b2b212016b8f87cf65dcdb7f71c7a1b"},
  {"moduleId":"AS3","locale":"ru","day":10,"id":"hh-opora-as3-10-hh-growth-v4-20261013","title":"Несколько реакций на один эпизод","sha256":"28c5ba1725c61089aaaa765762e786137344e3b177bb7348f418d71fad9605bc"},
  {"moduleId":"AS3","locale":"ru","day":11,"id":"hh-opora-as3-11-hh-growth-v4-20261013","title":"Граница, когда трудно","sha256":"6c36aa161126ea20f84b1d82794f9c1bda9133761b0460f84a065d932e37f6b9"},
  {"moduleId":"AS3","locale":"ru","day":12,"id":"hh-opora-as3-12-hh-growth-v4-20261013","title":"Возвращение к окружающему","sha256":"df980533ed1a69b6f18bf071e5b1fed2255528d5ed72da0590b9e5e19ea2bb9e"},
  {"moduleId":"AS3","locale":"ru","day":13,"id":"hh-opora-as3-13-hh-growth-v4-20261013","title":"Я сам выбираю способ","sha256":"d73bbce82eea7df96626414f70929f3755d0d3a657356d1029ccaeb9ed793102"},
  {"moduleId":"AS3","locale":"ru","day":14,"id":"hh-opora-as3-14-hh-growth-v4-20261013","title":"Моя карта чувств","sha256":"44fdf2afdfb42242be18b3b170a5344c22ce30bfb8d4bad5e4cb058f28b4cb17"},
  {"moduleId":"AS4","locale":"en","day":1,"id":"hh-opora-as4-01-hh-growth-v4-20261013","title":"Noticing my usual response","sha256":"39f60e6b668a07df3e14260bb541d63f350900919b168ae4a6947916141103e9"},
  {"moduleId":"AS4","locale":"en","day":2,"id":"hh-opora-as4-02-hh-growth-v4-20261013","title":"Another possible response","sha256":"5ecc3b634eaa9d4692a327446b14649d8ea99ff2ab447b52b19b8535b35e0895"},
  {"moduleId":"AS4","locale":"en","day":3,"id":"hh-opora-as4-03-hh-growth-v4-20261013","title":"Words for stress signals","sha256":"2140eaaf5eb3e7d4d41ab7c2e5450aabccb789ca1889f5b30ec2d38b27c0d3ac"},
  {"moduleId":"AS4","locale":"en","day":4,"id":"hh-opora-as4-04-hh-growth-v4-20261013","title":"Different ways to cope","sha256":"fe648d8e62d8fb0b8f2570c477d35fd079dcd83f13edf51ed625c3b268b9ad02"},
  {"moduleId":"AS4","locale":"en","day":5,"id":"hh-opora-as4-05-hh-growth-v4-20261013","title":"Pausing before replying","sha256":"db4e4df6d19f0a8fd7c7034f7bcc1340806eee7e6ed98ec09f1ec9bf5e22c0d0"},
  {"moduleId":"AS4","locale":"en","day":6,"id":"hh-opora-as4-06-hh-growth-v4-20261013","title":"Changing pace","sha256":"809787f55dd1fdb0c990c2b190ce055e75478b4874fabf8ac24d4da3d72c8352"},
  {"moduleId":"AS4","locale":"en","day":7,"id":"hh-opora-as4-07-hh-growth-v4-20261013","title":"Choosing a manageable load","sha256":"90f318c254291e1b06a2f50c7c9a4e7b4c5834b4c8442b9759a22a9df75a8dc6"},
  {"moduleId":"AS4","locale":"en","day":8,"id":"hh-opora-as4-08-hh-growth-v4-20261013","title":"Switching attention","sha256":"cbeceaa135867fe61e088b3bfba5332693b5a35209c19319477a9c89e0455ed2"},
  {"moduleId":"AS4","locale":"en","day":9,"id":"hh-opora-as4-09-hh-growth-v4-20261013","title":"Fact and assumption","sha256":"b3c87e290ac0bb92158346b8630f6d092030e461a97f3bef237a0b0203c0beac"},
  {"moduleId":"AS4","locale":"en","day":10,"id":"hh-opora-as4-10-hh-growth-v4-20261013","title":"When–then choice","sha256":"d84734c096a4a123a59eac6f8f724b29f21661230a60a45890ffdb0e2f848f6d"},
  {"moduleId":"AS4","locale":"en","day":11,"id":"hh-opora-as4-11-hh-growth-v4-20261013","title":"A boundary in conversation","sha256":"63b4bf05e4767217d53a0a30fd667d346c91fba7fdf8fb65cf9bcd8a6a77d976"},
  {"moduleId":"AS4","locale":"en","day":12,"id":"hh-opora-as4-12-hh-growth-v4-20261013","title":"My alternatives","sha256":"0d04607e339d07042e773cd07720e8eb8a5b9fc383610ae514f5e94527ad5e37"},
  {"moduleId":"AS4","locale":"en","day":13,"id":"hh-opora-as4-13-hh-growth-v4-20261013","title":"Practising a response","sha256":"21efb8a7992a9799fb75e22967129a4c537ce21237e201e0d2641faa187472dc"},
  {"moduleId":"AS4","locale":"en","day":14,"id":"hh-opora-as4-14-hh-growth-v4-20261013","title":"My stress-response map","sha256":"5d0c5b5e816a58583a109c02903df85f6655bfebf7f988322e3893e1aae5560b"},
  {"moduleId":"AS4","locale":"ru","day":1,"id":"hh-opora-as4-01-hh-growth-v4-20261013","title":"Замечаю привычный ответ","sha256":"d6322073a823320e8f58d29a28e204a4b13d4c8a98a76602a0f57cb2941a2c91"},
  {"moduleId":"AS4","locale":"ru","day":2,"id":"hh-opora-as4-02-hh-growth-v4-20261013","title":"Другой возможный ответ","sha256":"d43a022a77dffbb0821601c7062134dd3af85010a42515f40b9926aafb8c2297"},
  {"moduleId":"AS4","locale":"ru","day":3,"id":"hh-opora-as4-03-hh-growth-v4-20261013","title":"Язык сигналов стресса","sha256":"acc7fedcef7b8aab72ce2020210a78b8a359055953eb9501c85ce9eacda13174"},
  {"moduleId":"AS4","locale":"ru","day":4,"id":"hh-opora-as4-04-hh-growth-v4-20261013","title":"Разные способы справляться","sha256":"1bf81059b8746f70661e13c315ede61a7a771accfdb3278e9fedaf2e7c43e778"},
  {"moduleId":"AS4","locale":"ru","day":5,"id":"hh-opora-as4-05-hh-growth-v4-20261013","title":"Пауза в переписке","sha256":"c4544e8c0c39c8cad60b1eda009978a03922cccf8f1c89d9e8e2492ac843690e"},
  {"moduleId":"AS4","locale":"ru","day":6,"id":"hh-opora-as4-06-hh-growth-v4-20261013","title":"Меняю скорость","sha256":"18f9b2cf5c68acd9d712de088b51b912442afaedb3f22bd40997067a89bfc4e3"},
  {"moduleId":"AS4","locale":"ru","day":7,"id":"hh-opora-as4-07-hh-growth-v4-20261013","title":"Выбираю удобную нагрузку","sha256":"d89a0bc952f1d4a8bd1169e3968d7d5c66e97dd6eb156fe09488e5aac06ca952"},
  {"moduleId":"AS4","locale":"ru","day":8,"id":"hh-opora-as4-08-hh-growth-v4-20261013","title":"Переключаю внимание","sha256":"c7a9dac15477bd148e8777190a4fd008b3db1eef2971259ac581ce6c8bbc7257"},
  {"moduleId":"AS4","locale":"ru","day":9,"id":"hh-opora-as4-09-hh-growth-v4-20261013","title":"Факт и предположение","sha256":"e544d4616ec002c047c8952d28eb534b21d382cc0f2feec7536585f5786d4ba4"},
  {"moduleId":"AS4","locale":"ru","day":10,"id":"hh-opora-as4-10-hh-growth-v4-20261013","title":"Когда — могу","sha256":"0a78c232dd57e9b07e594577cc5b4862895af1c39c4d2059d73de2bcd11c7a0e"},
  {"moduleId":"AS4","locale":"ru","day":11,"id":"hh-opora-as4-11-hh-growth-v4-20261013","title":"Граница в диалоге","sha256":"67dd348f89dc4c884b7608699405e4b3b3bacb1914d2ae0c1df43bd8e19481a6"},
  {"moduleId":"AS4","locale":"ru","day":12,"id":"hh-opora-as4-12-hh-growth-v4-20261013","title":"Мои альтернативы","sha256":"165ed62f0f5c9a89770937567b0b140e623340cbdfedafd7da331562ea23c86b"},
  {"moduleId":"AS4","locale":"ru","day":13,"id":"hh-opora-as4-13-hh-growth-v4-20261013","title":"Практика выбора","sha256":"4b5d99f2d0652f4d43a17fa731f836996245b4071668aa878f361b6684b2982a"},
  {"moduleId":"AS4","locale":"ru","day":14,"id":"hh-opora-as4-14-hh-growth-v4-20261013","title":"Карта стрессовой реакции","sha256":"56e4b0fcb22f93804c0773950ef1b2069326b7850b0fb1b5da569e10a86d45b8"},
  {"moduleId":"AS5","locale":"en","day":1,"id":"hh-opora-as5-01-hh-growth-v4-20261013","title":"More than how I feel today","sha256":"5adf1ce4ce2462f2eba4ad8e0f2aca45c0b17f16c46d6dbd710b8294e0afab25"},
  {"moduleId":"AS5","locale":"en","day":2,"id":"hh-opora-as5-02-hh-growth-v4-20261013","title":"My different sides","sha256":"dbee1051fd7c17b05bb49b524f63a4a8da744708f598c2bc508b78d67a7f1f37"},
  {"moduleId":"AS5","locale":"en","day":3,"id":"hh-opora-as5-03-hh-growth-v4-20261013","title":"A supportive inner voice","sha256":"909945418eec075c82e11f65ea487cded36825a6c049c1e5f93b9d54a41d03fe"},
  {"moduleId":"AS5","locale":"en","day":4,"id":"hh-opora-as5-04-hh-growth-v4-20261013","title":"From harsh to kind","sha256":"04823e11fbcbf59bd8636c1c4e457f2b1f066fe4f5efa90f6fcbdd5af16c7886"},
  {"moduleId":"AS5","locale":"en","day":5,"id":"hh-opora-as5-05-hh-growth-v4-20261013","title":"What matters to me","sha256":"ce0fdf0a632204e0e39959e1924d7e2f23e7f89693bac2b07a7f4a9c1a78d634"},
  {"moduleId":"AS5","locale":"en","day":6,"id":"hh-opora-as5-06-hh-growth-v4-20261013","title":"Values without pressure","sha256":"1c99382a99ffb013d043f10d5cc1c5bc95afce6b0c58dbf761b113a5604dfa0d"},
  {"moduleId":"AS5","locale":"en","day":7,"id":"hh-opora-as5-07-hh-growth-v4-20261013","title":"Resources I can use","sha256":"04d63e2f904bd11f1f082035271162454caca00fd434a3943e08728838fa6ef6"},
  {"moduleId":"AS5","locale":"en","day":8,"id":"hh-opora-as5-08-hh-growth-v4-20261013","title":"An image or a word","sha256":"9c0c5285002968193cac650b66e655c59a6ee437360de36d881305dda858b70d"},
  {"moduleId":"AS5","locale":"en","day":9,"id":"hh-opora-as5-09-hh-growth-v4-20261013","title":"Respect for myself","sha256":"cdf22213dd2953f7c0fa0913e35e9d5589a42b2c74f4365df0288bf79c84e456"},
  {"moduleId":"AS5","locale":"en","day":10,"id":"hh-opora-as5-10-hh-growth-v4-20261013","title":"Permission to say “not now”","sha256":"be412040fae144115b0657fefd56e83472a9c857d6608dc4f1bf3908adcab65f"},
  {"moduleId":"AS5","locale":"en","day":11,"id":"hh-opora-as5-11-hh-growth-v4-20261013","title":"Skills I have tried","sha256":"069e8f093f160d34b763526b66c8c98b0e6b43838d28cbc494f02c3d1d8574a2"},
  {"moduleId":"AS5","locale":"en","day":12,"id":"hh-opora-as5-12-hh-growth-v4-20261013","title":"I do not need every answer","sha256":"39f4d0f394a127ebe4b875409bf1baff643c5665c5317e454433fa152064e13d"},
  {"moduleId":"AS5","locale":"en","day":13,"id":"hh-opora-as5-13-hh-growth-v4-20261013","title":"Kindness and action","sha256":"8c7baba71489fe5bf347107b7934879ed926497a6603ab749d146a3132a044bd"},
  {"moduleId":"AS5","locale":"en","day":14,"id":"hh-opora-as5-14-hh-growth-v4-20261013","title":"My inner compass","sha256":"2273d5c67e322f30e77e8a6fb1c30d4e87b787044d88e9b26d8d8c5788cf77b2"},
  {"moduleId":"AS5","locale":"ru","day":1,"id":"hh-opora-as5-01-hh-growth-v4-20261013","title":"Я больше сегодняшнего состояния","sha256":"565cfe326fec4da5273079f7c5880b044efb3db780abdded452a6fb4de3cf8cf"},
  {"moduleId":"AS5","locale":"ru","day":2,"id":"hh-opora-as5-02-hh-growth-v4-20261013","title":"Мои разные стороны","sha256":"9092d9e5dd5da6f1ece61ea05887bfdd4fb712b3aeddc1d18085848612f7df97"},
  {"moduleId":"AS5","locale":"ru","day":3,"id":"hh-opora-as5-03-hh-growth-v4-20261013","title":"Поддерживающий голос","sha256":"0bde7396c46ddab5bf1e166449afc91f7d33174def90cc3d6bb6f1da2fbd1848"},
  {"moduleId":"AS5","locale":"ru","day":4,"id":"hh-opora-as5-04-hh-growth-v4-20261013","title":"От строгого к бережному","sha256":"613cefe57ba82cf601e8f9f2cd1f3367ce7cb3faa5ce86c35ef42f2e03817d25"},
  {"moduleId":"AS5","locale":"ru","day":5,"id":"hh-opora-as5-05-hh-growth-v4-20261013","title":"Что мне действительно важно","sha256":"cdb45c0817dafce7fe2b6f0652e63512c4b15f1f8546b6a4e0eb3e87073deb6e"},
  {"moduleId":"AS5","locale":"ru","day":6,"id":"hh-opora-as5-06-hh-growth-v4-20261013","title":"Ценность без давления","sha256":"b7cb0798f53a0501e3637f41439a4da6068341b524127afa4895e7f58e8eb6dd"},
  {"moduleId":"AS5","locale":"ru","day":7,"id":"hh-opora-as5-07-hh-growth-v4-20261013","title":"Доступные ресурсы","sha256":"493c0d6a6efd55c58c24a051400f4a5dd9c62480bfacbb8cd6777bf1fd6594a5"},
  {"moduleId":"AS5","locale":"ru","day":8,"id":"hh-opora-as5-08-hh-growth-v4-20261013","title":"Образ или слово","sha256":"37d49792df3898d2e6836dd05cfeffc3c1dcd9756a0f4fff5516f22d959d0968"},
  {"moduleId":"AS5","locale":"ru","day":9,"id":"hh-opora-as5-09-hh-growth-v4-20261013","title":"Отношение к себе","sha256":"4256ee595c2af27b21c5d9a5c7cd58c4ac0af45d2d42f54be8acca31ca973d06"},
  {"moduleId":"AS5","locale":"ru","day":10,"id":"hh-opora-as5-10-hh-growth-v4-20261013","title":"Право на «не сейчас»","sha256":"de5fb1278e86cdde06d00e89577974126e8dfbd44904fd949b9dcb743bddc467"},
  {"moduleId":"AS5","locale":"ru","day":11,"id":"hh-opora-as5-11-hh-growth-v4-20261013","title":"Мои освоенные навыки","sha256":"b849868195b52a57019bc4849a3d59d4184dc643e075b9ade191640d7210a3f0"},
  {"moduleId":"AS5","locale":"ru","day":12,"id":"hh-opora-as5-12-hh-growth-v4-20261013","title":"Не нужно знать всё заранее","sha256":"a81f557dc73c0feae944f84f8b62b8f6d4b8e8ab1106c455e854c5ea2f422a83"},
  {"moduleId":"AS5","locale":"ru","day":13,"id":"hh-opora-as5-13-hh-growth-v4-20261013","title":"Доброта и действие","sha256":"a895c974a6d380d937a43b6dca048a015366cf2bbc64145574dc3820259c77f2"},
  {"moduleId":"AS5","locale":"ru","day":14,"id":"hh-opora-as5-14-hh-growth-v4-20261013","title":"Мой внутренний компас","sha256":"8a82816fbec899b013938bec98846d2199ac0a8cf3dc8943ef51e9a595a491d7"},
  {"moduleId":"AS6","locale":"en","day":1,"id":"hh-opora-as6-01-hh-growth-v4-20261013","title":"What I want to reclaim","sha256":"05ce3fe1e1bf3f76286309ebc2d1cc93955830757ba2568b9e76d17de5d28732"},
  {"moduleId":"AS6","locale":"en","day":2,"id":"hh-opora-as6-02-hh-growth-v4-20261013","title":"The smallest step","sha256":"157f8244eb6122166da1fdc523276d69244fc0f18e34d80e74d62028938dd03a"},
  {"moduleId":"AS6","locale":"en","day":3,"id":"hh-opora-as6-03-hh-growth-v4-20261013","title":"Real-world limits","sha256":"daf59fce29fe73ead5c6cdfe7d5269276032679b37d67cd714ba11b981b7ac56"},
  {"moduleId":"AS6","locale":"en","day":4,"id":"hh-opora-as6-04-hh-growth-v4-20261013","title":"A manageable amount","sha256":"b101bb7898ce3546ebe74a67e0d50ac7e327607fe546f8619b8b4a7e9dfb9713"},
  {"moduleId":"AS6","locale":"en","day":5,"id":"hh-opora-as6-05-hh-growth-v4-20261013","title":"A pleasant small activity","sha256":"866258b4dc800ee4114f15313424eb91b41ca5305b28f64155b229a36b9efa28"},
  {"moduleId":"AS6","locale":"en","day":6,"id":"hh-opora-as6-06-hh-growth-v4-20261013","title":"A plan only if wanted","sha256":"fcf0dca4f1724765d1ffd08c78b4d1d6cb1238850e245955438d50c71e510273"},
  {"moduleId":"AS6","locale":"en","day":7,"id":"hh-opora-as6-07-hh-growth-v4-20261013","title":"Balance and rest","sha256":"388ffdb04d299af9b921bccc723b6d9732cd451349e9a74233849171c0292ea3"},
  {"moduleId":"AS6","locale":"en","day":8,"id":"hh-opora-as6-08-hh-growth-v4-20261013","title":"Adjusting my plan","sha256":"ab37b48fe66f18401153fb6486a5dac13ded83aa59d63c6225af59a5f0e2083e"},
  {"moduleId":"AS6","locale":"en","day":9,"id":"hh-opora-as6-09-hh-growth-v4-20261013","title":"Drafting a message without sending","sha256":"fc9fd8b263986bdc287370673bfba9d52a65ad0d3a8337cbb897c267ff4f1b28"},
  {"moduleId":"AS6","locale":"en","day":10,"id":"hh-opora-as6-10-hh-growth-v4-20261013","title":"Contact and boundaries","sha256":"d15268c01fdc7289aeb40b6d2f66265a51dc0d62e1ad62261de2d6731136753a"},
  {"moduleId":"AS6","locale":"en","day":11,"id":"hh-opora-as6-11-hh-growth-v4-20261013","title":"What I can influence","sha256":"f493a081931d66bbf6b6f384efe1d35393ff21b9818d48eeef12c24236bbd9af"},
  {"moduleId":"AS6","locale":"en","day":12,"id":"hh-opora-as6-12-hh-growth-v4-20261013","title":"My backup plan","sha256":"4b89b2fdec4401aeb03d0f510f5c970e6691eafe58e67985d045f4e2dd08296b"},
  {"moduleId":"AS6","locale":"en","day":13,"id":"hh-opora-as6-13-hh-growth-v4-20261013","title":"Trying without grading","sha256":"e8fbf040d5b2adbc36aeafe474782eabec5e76d483db5563ff137ecdfe6ecb00"},
  {"moduleId":"AS6","locale":"en","day":14,"id":"hh-opora-as6-14-hh-growth-v4-20261013","title":"My path into daily life","sha256":"02672d5ab137e6713685ccc8fb1ae4be89aec946adff365e4df10d00d6adfff6"},
  {"moduleId":"AS6","locale":"ru","day":1,"id":"hh-opora-as6-01-hh-growth-v4-20261013","title":"Что хочу вернуть","sha256":"8af3183fd96f369d10dc0601fca329936e472da86f2ba9a0039e360e0ad540d4"},
  {"moduleId":"AS6","locale":"ru","day":2,"id":"hh-opora-as6-02-hh-growth-v4-20261013","title":"Самый маленький шаг","sha256":"c867578089e89aec4bdb7a88f5cdbde57e69a672f9a8e51b2e50dd6a77c1a427"},
  {"moduleId":"AS6","locale":"ru","day":3,"id":"hh-opora-as6-03-hh-growth-v4-20261013","title":"Реальные ограничения","sha256":"7cd1990f0ba4556cb9aed70457adccf5d2180f3fef5a441d9e95cc588f41e8e7"},
  {"moduleId":"AS6","locale":"ru","day":4,"id":"hh-opora-as6-04-hh-growth-v4-20261013","title":"Нагрузка по силам","sha256":"d86e3087d7d045dbb9b7a8ca0436510a4314a1ef122ec0eb3f5f9c3bc0a1a74d"},
  {"moduleId":"AS6","locale":"ru","day":5,"id":"hh-opora-as6-05-hh-growth-v4-20261013","title":"Небольшое приятное занятие","sha256":"878082b588df7e89614436c58ffdc2cd1aaa02b47d88cc3ce0f9f68b2493d6df"},
  {"moduleId":"AS6","locale":"ru","day":6,"id":"hh-opora-as6-06-hh-growth-v4-20261013","title":"План по желанию","sha256":"7f42679804042221b5ce8d4c2afcf9babf257d7202243e6dcfdb94e872aed856"},
  {"moduleId":"AS6","locale":"ru","day":7,"id":"hh-opora-as6-07-hh-growth-v4-20261013","title":"Баланс и отдых","sha256":"add8566bd30ee9cd7c3a5417529a08db6397a3ef4184d3719f94290072e7124b"},
  {"moduleId":"AS6","locale":"ru","day":8,"id":"hh-opora-as6-08-hh-growth-v4-20261013","title":"Пересматриваю план","sha256":"8bc92583415fb8457f702ca39735043034b7a1ac121609c10e20b03568a95801"},
  {"moduleId":"AS6","locale":"ru","day":9,"id":"hh-opora-as6-09-hh-growth-v4-20261013","title":"Сообщение без отправки","sha256":"893550ca0c962082f9d6f6a5b13c8d272457d58d623d8d2224b587cb5fa857d1"},
  {"moduleId":"AS6","locale":"ru","day":10,"id":"hh-opora-as6-10-hh-growth-v4-20261013","title":"Контакт и граница","sha256":"8a0079fe943a0818447a7d94eefd0770ceed84701c777f33e22e25a3329210a8"},
  {"moduleId":"AS6","locale":"ru","day":11,"id":"hh-opora-as6-11-hh-growth-v4-20261013","title":"Что от меня зависит","sha256":"ded99deac85c897ab16cf5a431863c59636061b3bfbfd7852211934d4f5f1afd"},
  {"moduleId":"AS6","locale":"ru","day":12,"id":"hh-opora-as6-12-hh-growth-v4-20261013","title":"План Б","sha256":"ccb547ffb8cbd32e49b6803d5537da328b59f028722087311eeb7be07c651d3c"},
  {"moduleId":"AS6","locale":"ru","day":13,"id":"hh-opora-as6-13-hh-growth-v4-20261013","title":"Проба без отметки успеха","sha256":"a06699f8cee7ff67772b753c7fde636a1bd589d0ee2ae494eaca283df421da78"},
  {"moduleId":"AS6","locale":"ru","day":14,"id":"hh-opora-as6-14-hh-growth-v4-20261013","title":"Мой маршрут к делам","sha256":"e48c6686ff0d1176ab4e409d2ca571925d5b1b2259e0631114c48207fcdcb383"}
]

// Frozen public authored lesson outputs from the pre-NAV2 implementation.
// No user information or prior checkout is required by these portable tests.
const root = process.env.GROWTH_COURSE_ROOT ? resolve(process.env.GROWTH_COURSE_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = resolve(root, 'lib/app')
const load = path => import(pathToFileURL(resolve(root, path)).href)
const [lessonLibrary, moduleLessons, router, programs] = await Promise.all([
  'lib/inner-growth/lesson-library.js', 'lib/inner-growth/antistress-module-lessons.js',
  'lib/inner-growth/antistress-module-router.js', 'lib/inner-growth/course-programs.js',
].map(load))
const { moduleLesson, moduleDayOutline } = moduleLessons
const { lessonFor, COURSE_CONTENT_V4, COURSE_ANTISTRESS_OUTCOME_V3 } = lessonLibrary
const NAV1 = 'opora-nav-1.3-20261014'
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex')
const clone = value => structuredClone(value)
const snapshotFor = (id, locale, day) => legacySnapshots.find(item => item.moduleId === id && item.locale === locale && item.day === day)
const baseFor = (id, locale, day) => lessonFor('calm_regulation', day, locale, 'standard',
  id === 'AS2' ? COURSE_ANTISTRESS_OUTCOME_V3 : COURSE_CONTENT_V4)

for (const moduleId of ['AS1', 'AS2', 'AS3', 'AS4', 'AS5', 'AS6']) for (const locale of ['en', 'ru']) {
  test(`stored NAV1 ${moduleId} retains all 14 original lesson ids and complete payloads (${locale})`, () => {
    for (let day = 1; day <= 14; day++) {
      const base = baseFor(moduleId, locale, day), before = JSON.stringify(base)
      const pinned = moduleLesson(base, moduleId, day, locale, NAV1)
      const expected = snapshotFor(moduleId, locale, day)
      assert.equal(pinned.id, expected.id); assert.equal(pinned.title, expected.title)
      assert.equal(digest(pinned), expected.sha256, `${moduleId} ${locale} day ${day}: complete legacy lesson changed`)
      assert.equal(digest(moduleLesson(base, moduleId, day, locale)), expected.sha256, 'unversioned legacy lessons remain legacy')
      assert.equal(JSON.stringify(base), before, 'rendering never mutates the shared authored base lesson')
    }
    if (moduleId !== 'AS2') {
      const outline = moduleDayOutline(moduleId, locale, NAV1)
      assert.equal(outline.length, 14)
      for (const item of outline) assert.equal(item.title, snapshotFor(moduleId, locale, item.day).title)
    }
  })
}

for (const moduleId of ['AS1', 'AS3', 'AS4', 'AS5']) {
  test(`NAV2 ${moduleId} uses independently versioned ids while NAV1 stays pinned`, () => {
    for (const locale of ['en', 'ru']) for (let day = 1; day <= 14; day++) {
      const base = baseFor(moduleId, locale, day)
      const legacy = moduleLesson(base, moduleId, day, locale, NAV1)
      const current = moduleLesson(base, moduleId, day, locale, router.ANTISTRESS_PREVIOUS_ROUTER_VERSION)
      assert.notEqual(current.id, legacy.id); assert.ok(current.id.startsWith(legacy.id + '-'))
      assert.notEqual(current.source, legacy.source)
      assert.equal(digest(legacy), snapshotFor(moduleId, locale, day).sha256)
    }
  })
}

test('NAV1/NAV2 retain AS2 and AS6 content while the new router separately enables AS6', () => {
  for (const locale of ['en', 'ru']) for (let day = 1; day <= 14; day++) {
    const as2 = baseFor('AS2', locale, day)
    assert.equal(moduleLesson(as2, 'AS2', day, locale, NAV1), as2)
    assert.equal(moduleLesson(as2, 'AS2', day, locale, router.ANTISTRESS_PREVIOUS_ROUTER_VERSION), as2)
    const legacy6 = moduleLesson(baseFor('AS6', locale, day), 'AS6', day, locale, router.ANTISTRESS_PREVIOUS_ROUTER_VERSION)
    assert.equal(digest(legacy6), snapshotFor('AS6', locale, day).sha256)
  }
  assert.equal(router.ANTISTRESS_ACTIVE_MODULE_IDS.includes('AS6'), true)
  assert.equal(moduleLesson(baseFor('AS6', 'en', 1), 'AS6', 1, 'en', router.ANTISTRESS_ROUTER_VERSION).oporaModule.version, router.ANTISTRESS_ROUTER_VERSION)
  assert.equal(router.ANTISTRESS_MODULE_IDS.includes('AS6'), true)
})

// Entire real daily repository, with only transaction/transport replaced.
const dailyFile = resolve(appRoot, 'growth-daily.js')
const source = readFileSync(dailyFile, 'utf8')
const imports = [...source.matchAll(/^import\s+.*?\s+from\s+['"]([^'"]+)['"]/gm)].map(match => match[1])
const real = Object.fromEntries(await Promise.all(imports.filter(name => name !== './database.js').map(async name =>
  [name, await import(name.startsWith('node:') ? name : pathToFileURL(resolve(appRoot, name)).href)])))
const ts = createRequire(resolve(root, 'package.json'))('typescript')
const compiled = ts.transpileModule(source, { fileName: 'growth-daily.js', compilerOptions: {
  module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022,
} }).outputText
const OWNER = '00000000-0000-4000-8000-000000000301'
const COURSE = '00000000-0000-4000-8000-000000000302'
const CYCLE = '00000000-0000-4000-8000-000000000303'
const TARGET = '00000000-0000-4000-8000-000000000304'
function dailyReader(moduleId, routerVersion) {
  const now = new Date().toISOString(), course = { id: COURSE, account_id: OWNER, status: 'active', stage: 4,
    goals: ['calm_regulation'], scale_keys: [], test_keys: ['hh-weekly-pulse'],
    focus_tags: [...programs.getCourseProgram('stress').focusTags] }
  const stored = { id: CYCLE, account_id: OWNER, course_id: COURSE, status: 'active', revision: 5, cycle_number: 1,
    primary_domain: 'calm_regulation', content_version: moduleId === 'AS2' ? COURSE_ANTISTRESS_OUTCOME_V3 : COURSE_CONTENT_V4,
    start_local_date: now.slice(0, 10), time_zone: 'UTC', duration_days: 14, created_at: now,
    preferences: { oporaModuleId: moduleId, ...(routerVersion ? { oporaModuleRouter: routerVersion } : {}) } }
  const before = JSON.stringify(stored), queries = [], config = { multiCourseEnabled: true, billingEnvironment: 'sandbox' }
  const db = { async query(sql, values = []) {
    const q = sql.replace(/\s+/g, ' ').trim(), args = clone(values)
    queries.push({ sql: q, args })
    assert.match(q, /^select /i, 'reading an existing module cannot write or relabel its history')
    if (q.startsWith('select status,onboarding_state,timezone from app.accounts')) {
      assert.deepEqual(args, [OWNER]); return { rows: [{ status: 'active', onboarding_state: 'active', timezone: 'UTC' }] }
    }
    if (q === 'select * from app_private.course_access($1)') {
      assert.deepEqual(args, ['sandbox']); return { rows: [{ tier: 'advanced', active_course_limit: 5, active_course_count: 1 }] }
    }
    if (q.startsWith('select * from app_private.growth_courses')) {
      assert.match(q, /where account_id=\$1 and id=\$2/); assert.deepEqual(args, [OWNER, COURSE])
      return { rows: [clone(course)] }
    }
    if (q.startsWith('select * from app_private.growth_cycles')) {
      assert.match(q, /where account_id=\$1 and course_id=\$2/); assert.deepEqual(args, [OWNER, COURSE])
      return { rows: [clone(stored)] }
    }
    if (q.startsWith('select * from app_private.growth_targets')) {
      assert.match(q, /where account_id=\$1 and cycle_id=\$2/); assert.deepEqual(args, [OWNER, CYCLE])
      return { rows: [{ id: TARGET, account_id: OWNER, cycle_id: CYCLE, problem_label_ciphertext: null, intention_ciphertext: null }] }
    }
    if (/from app_private.growth_(checkins|sessions|reviews)/.test(q)) {
      assert.match(q, /where account_id=\$1 and cycle_id=\$2/); assert.deepEqual(args, [OWNER, CYCLE]); return { rows: [] }
    }
    if (q.includes('from app.assessment_results')) {
      assert.match(q, /where account_id=\$1/); assert.equal(args[0], OWNER); return { rows: [] }
    }
    assert.fail('Unexpected read with no live fallback: ' + q)
  } }
  const runTransaction = (cfg, actor, fn) => { assert.equal(cfg, config); assert.equal(actor.id, OWNER); return fn(db) }
  const dependencies = { ...real, 'server-only': {}, './database.js': { transaction() { assert.fail('Live transaction forbidden') } } }
  const runtime = { exports: {}, Date, Buffer, require(name) {
    assert.ok(Object.hasOwn(dependencies, name), name); return dependencies[name]
  } }
  vm.runInNewContext(compiled, runtime, { filename: dailyFile })
  const repo = runtime.exports.createDailyCourseRepository(config, { runTransaction })
  return { queries, stored, before, read: locale => repo.read({ id: OWNER }, locale, COURSE) }
}

for (const moduleId of ['AS1', 'AS2', 'AS3', 'AS4', 'AS5', 'AS6']) {
  test(`actual repository reads stored NAV1 ${moduleId} with the original current lesson and roadmap without writes`, async () => {
    const h = dailyReader(moduleId, NAV1), result = await h.read('en')
    assert.equal(result.cycle.moduleId, moduleId); assert.equal(result.cycle.preferences.oporaModuleRouter, NAV1)
    assert.equal(result.lesson.id, snapshotFor(moduleId, 'en', 1).id)
    assert.equal(digest(result.lesson), snapshotFor(moduleId, 'en', 1).sha256)
    assert.equal(result.roadmap.length, 14)
    for (const day of result.roadmap) assert.equal(day.title, snapshotFor(moduleId, 'en', day.day).title)
    assert.equal(JSON.stringify(h.stored), h.before); assert.ok(h.queries.every(q => q.sql.startsWith('select ')))
  })
}

test('actual repository reads an unversioned legacy AS6 cycle without upgrading it', async () => {
  const h = dailyReader('AS6'), result = await h.read('ru')
  assert.equal(result.cycle.moduleId, 'AS6'); assert.equal(result.cycle.preferences.oporaModuleRouter, undefined)
  assert.equal(digest(result.lesson), snapshotFor('AS6', 'ru', 1).sha256)
  assert.equal(JSON.stringify(h.stored), h.before)
})

test('actual repository uses the persisted NAV2 version for the new current lesson and roadmap', async () => {
  const h = dailyReader('AS4', router.ANTISTRESS_PREVIOUS_ROUTER_VERSION), result = await h.read('ru')
  const current = moduleLesson(baseFor('AS4', 'ru', 1), 'AS4', 1, 'ru', router.ANTISTRESS_PREVIOUS_ROUTER_VERSION)
  assert.equal(result.lesson.id, current.id); assert.equal(digest(result.lesson), digest(current))
  assert.notEqual(result.lesson.id, snapshotFor('AS4', 'ru', 1).id)
  for (const day of result.roadmap) assert.equal(day.title,
    moduleLesson(baseFor('AS4', 'ru', day.day), 'AS4', day.day, 'ru', router.ANTISTRESS_PREVIOUS_ROUTER_VERSION).title)
  assert.equal(JSON.stringify(h.stored), h.before)
})


for (const version of [NAV1, router.ANTISTRESS_PREVIOUS_ROUTER_VERSION, undefined]) {
  test(`persisted AS4 keeps its nonclinical title under ${version || 'unversioned history'}`, async () => {
    const h = dailyReader('AS4', version), result = await h.read('en')
    assert.equal(result.programme.title, 'Anti-Stress 4 · Flexibility with everyday stress')
    assert.equal(JSON.stringify(h.stored), h.before)
    assert.ok(h.queries.every(q => q.sql.startsWith('select ')))
  })
}
test('current AS4 label stays clinical while public title defaults stay current', async () => {
  const h = dailyReader('AS4', router.ANTISTRESS_ROUTER_VERSION), result = await h.read('en')
  assert.equal(result.programme.title, 'Anti-Stress 4 · Clinician-supported trauma care')
  assert.equal(router.antistressModuleTitle('AS4', 'en'), 'Clinician-supported trauma care')
  assert.equal(router.antistressModuleTitle('AS6', 'en', ''), 'Returning to daily life')
  assert.equal(router.antistressModuleTitle('AS6', 'en'), 'Returning to everyday life')
})
test('persisted course cards and curriculum labels pass their stored router version', () => {
  assert.match(readFileSync(resolve(root, 'components/app/course-entry-selector.jsx'), 'utf8'), /antistressModuleTitle\(moduleId,locale,course\.moduleChoice\.version\|\|''\)/)
  assert.match(readFileSync(resolve(root, 'components/app/course-14-day-overview.jsx'), 'utf8'), /antistressModuleTitle\(moduleId,locale,routerVersion\)/)
})
