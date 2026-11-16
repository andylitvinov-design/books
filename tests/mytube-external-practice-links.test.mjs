import test from "node:test";
import assert from "node:assert/strict";
import {MYTUBE_EXTERNAL_PRACTICE_LINKS as links} from "../lib/video-discovery/mytube-external-practice-links.mjs";

test("external practice links are unique, attributed and point only to canonical YouTube watch URLs",()=>{
  const ids=new Set();
  for(const item of links){
    assert.match(item.youtubeId,/^[A-Za-z0-9_-]{11}$/);
    assert.ok(!ids.has(item.youtubeId),item.youtubeId);
    ids.add(item.youtubeId);
    assert.ok(item.title&&item.creator&&item.description);
    assert.equal(item.href,`https://www.youtube.com/watch?v=${item.youtubeId}`);
    assert.equal(item.poster,`https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`);
    assert.ok(["en","ru"].includes(item.language));
  }
  assert.equal(links.length,12);
});

test("external practice links are all genuinely under ten minutes",()=>{
  for(const item of links){
    assert.ok(Number.isInteger(item.durationSeconds)&&item.durationSeconds>0);
    assert.ok(item.durationSeconds<=600,item.youtubeId);
  }
});

test("high-risk financial, exaggerated health and breath-retention candidates remain excluded",()=>{
  const ids=new Set(links.map(item=>item.youtubeId));
  for(const held of ["oDpcVcvjNz0","R8YH_iOJKcA","AwIrkNWAIZ0"]) assert.equal(ids.has(held),false);
});

test("the shelf is metadata-only and links to the creator's YouTube page",()=>{
  for(const item of links){
    assert.equal("videoFile" in item,false);
    assert.equal("embedUrl" in item,false);
    assert.ok(item.href.startsWith("https://www.youtube.com/watch?v="));
  }
});
