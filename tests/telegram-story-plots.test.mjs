import test from 'node:test';
import assert from 'node:assert/strict';
import {
  listTelegramStoryCategories,listTelegramStorySubcategories,
  listTelegramStoryTopics,listTelegramStoryScenarios,listTelegramStoryPlots,
  resolveTelegramStoryPlot,telegramStoryPlotCounts,
} from '../lib/mandala/telegram-story-plots.mjs';

test('Telegram plots reuse canonical 4x4x4x4 tree with four editorial variants each',()=>{
  assert.deepEqual(telegramStoryPlotCounts(),{
    categories:4,subcategories:16,topics:64,scenarios:256,plots:1024,
  });
  for(const locale of ['ru','en','es']){
    const ids=new Set();
    for(const category of listTelegramStoryCategories(locale)){
      for(const subcategory of listTelegramStorySubcategories(category.id,locale)){
        for(const topic of listTelegramStoryTopics(category.id,subcategory.id,locale)){
          for(const scenario of listTelegramStoryScenarios(topic.id,locale)){
            const plots=listTelegramStoryPlots(scenario.id,locale);
            assert.equal(plots.length,4);
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
    assert.equal(ids.size,1024);
  }
});
test('Invalid IDs never resolve to footage or another scenario',()=>{
  for(const id of ['',null,'__proto__','x:publish','hh-video:publish:ru:1','x'.repeat(200)]){
    assert.deepEqual(listTelegramStoryPlots(id),[]);
    assert.equal(resolveTelegramStoryPlot(id),null);
  }
});
