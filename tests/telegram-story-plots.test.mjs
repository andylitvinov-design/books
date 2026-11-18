import test from 'node:test';
import assert from 'node:assert/strict';
import {listMyTubePlots} from '../lib/mandala/mytube-scenario-plots.mjs';
import {
  listTelegramStoryCategories,listTelegramStorySubcategories,
  listTelegramStoryTopics,listTelegramStoryScenarios,listTelegramStoryPlots,
  resolveTelegramStoryPlot,telegramStoryPlotCounts,
} from '../lib/mandala/telegram-story-plots.mjs';

test('Telegram plots reuse canonical 4x4x4x4 tree with six editorial variants each',()=>{
  assert.deepEqual(telegramStoryPlotCounts(),{
    categories:4,subcategories:16,topics:64,scenarios:256,plots:1536,
  });
  for(const locale of ['ru','en','es']){
    const ids=new Set();
    for(const category of listTelegramStoryCategories(locale)){
      for(const subcategory of listTelegramStorySubcategories(category.id,locale)){
        for(const topic of listTelegramStoryTopics(category.id,subcategory.id,locale)){
          for(const scenario of listTelegramStoryScenarios(topic.id,locale)){
            const plots=listTelegramStoryPlots(scenario.id,locale);
            assert.equal(plots.length,6);
            for(const plot of plots){
              assert.equal(plot.categoryId,category.id);
              assert.equal(plot.subcategoryId,subcategory.id);
              assert.equal(plot.topicId,topic.id);
              assert.equal(plot.scenarioId,scenario.id);
              assert.equal(plot.canExport,false);
              assert.equal(plot.sourceStatus,'editorial_only_unbound');
              assert.equal(plot.visualBeats.length,4);
              assert.ok(plot.label);
              assert.ok(plot.creativeBrief);
              assert.deepEqual(resolveTelegramStoryPlot(plot.id,locale),plot);
              assert.ok(!ids.has(plot.id));
              ids.add(plot.id);
            }
          }
        }
      }
    }
    assert.equal(ids.size,1536);
  }
});
test('Invalid IDs never resolve to footage or another scenario',()=>{
  for(const id of ['',null,'__proto__','x:publish','hh-video:publish:ru:1','x'.repeat(200)]){
    assert.deepEqual(listTelegramStoryPlots(id),[]);
    assert.equal(resolveTelegramStoryPlot(id),null);
  }
});

test('Telegram plot IDs, labels, synopsis and all four story beats equal the live MyTube website',async()=>{
 let compared=0,languageVariants=0;
 for(const lang of ['ru','en','es']){
  for(const category of listTelegramStoryCategories(lang)){
   for(const sub of listTelegramStorySubcategories(category.id,lang)){
    for(const topic of listTelegramStoryTopics(category.id,sub.id,lang)){
     for(const scenario of listTelegramStoryScenarios(topic.id,lang)){
      const site=await listMyTubePlots(scenario.id,lang);
      const bot=listTelegramStoryPlots(scenario.id,lang);
      assert.equal(site.length,6,scenario.id);
      assert.deepEqual(bot.map(p=>p.id),site.map(p=>p.id));
      for(let i=0;i<6;i++){
       assert.equal(bot[i].label,site[i].label);
       assert.equal(bot[i].synopsis,site[i].synopsis);
       assert.equal(bot[i].plotMode,site[i].plotMode);
       assert.deepEqual(bot[i].visualBeats,site[i].beats);
       assert.equal(bot[i].categoryId,site[i].categoryId);
       assert.equal(bot[i].topicId,site[i].topicId);
       assert.equal(bot[i].canExport,false);
       languageVariants++;
      }
      compared++;
     }
    }
   }
  }
 }
 assert.equal(compared,256*3);
 assert.equal(languageVariants,1536*3);
});
