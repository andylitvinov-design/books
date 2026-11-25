import test from 'node:test'
import assert from 'node:assert/strict'
import {classifyIsolatedVideoRedisCommand} from '../scripts/helpers/isolate-video-redis-command.mjs'

test('site video mock still reads and checks real isolated Redis state',()=>{
 for(const c of [
  ['HGET','holistic-house:site-videos:v1','home:ru'],
  ['HGETALL','holistic-house:site-videos:v1'],
  ['EVAL','script','1','holistic-house:site-videos:v1','home:ru']
 ])assert.equal(classifyIsolatedVideoRedisCommand(c),'site-redis')
})
test('only two verified optional YouTube HGET queries return synthetic absence',()=>{
 for(const key of [
  'holistic-house:youtube:phone-channels:v1',
  'holistic-house:youtube:heygen-en:completed:v1'
 ]){
  assert.equal(classifyIsolatedVideoRedisCommand(['HGET',key,'en']),'synthetic-missing')
  for(const c of [
   ['HSET',key,'en','data'],['HDEL',key,'en'],
   ['HGETALL',key],['EVAL','script','1',key,'en'],
   ['HGET',key,'en','extra'],['HGET',key]
  ])assert.equal(classifyIsolatedVideoRedisCommand(c),'deny')
 }
})
test('other namespaces and all mutating operations are rejected',()=>{
 for(const c of [
  ['HGET','holistic-house:client-private:v1','data'],
  ['HGET','holistic-house:youtube:phone-oauth:v1','web_client_id'],
  ['HGETALL','holistic-house:youtube:phone-history:v1'],
  ['HSET','holistic-house:site-videos:v1','key','value'],
  ['DEL','holistic-house:site-videos:v1'],
  null,{},[],['HGET']
 ])assert.equal(classifyIsolatedVideoRedisCommand(c),'deny')
})
