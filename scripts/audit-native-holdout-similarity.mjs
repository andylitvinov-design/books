/** Development audit of lexical similarity; not a semantic or blind-test guarantee. */
import {buildTrainingSet,nativeLexicalTrigrams as grams,nativeLexicalSimilarity as jaccard} from './train-native-ru-en-offline.mjs';
import {readGoldFile} from './evaluate-native-secretary-gold.mjs';
const {gold,sha256}=readGoldFile(),train=buildTrainingSet('v9');
for(const locale of ['ru','en']){
 const held=[...gold.cases.filter(x=>x.locale===locale).map(x=>({id:x.id,text:x.utterance})),...gold.dialogues.filter(x=>x.locale===locale).flatMap(d=>d.turns.map((t,i)=>({id:d.id+'-'+i,text:t.user})))].map(x=>({...x,g:grams(x.text)}));
 let matches=[];for(const [label,loc] of Object.entries(train))for(let i=0;i<loc[locale].length;i++){const phrase=loc[locale][i],g=grams(phrase);let best=0,id=null;for(const h of held){let v=jaccard(g,h.g);if(v>best){best=v;id=h.id}}if(best>=.70)matches.push({label,index:i,score:+best.toFixed(4),holdoutId:id});}
 console.log(JSON.stringify({locale,holdoutSha:sha256,threshold:.70,at70:matches.length,at80:matches.filter(x=>x.score>=.80).length,at90:matches.filter(x=>x.score>=.90).length,matches}));
}
