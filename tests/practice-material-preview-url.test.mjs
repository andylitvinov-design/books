import test from 'node:test'
import assert from 'node:assert/strict'
import {safeMaterialVideoUrl,youtubePreviewId} from '../lib/practitioners/material-preview.js'

test('extracts YouTube poster IDs from approved watch, short, embed and live URLs',()=>{
  const id='80xZ7jN6o2Y'
  assert.equal(youtubePreviewId('https://www.youtube.com/watch?v='+id+'&si=abc'),id)
  assert.equal(youtubePreviewId('https://youtu.be/'+id+'?si=abc'),id)
  assert.equal(youtubePreviewId('https://m.youtube.com/shorts/'+id),id)
  assert.equal(youtubePreviewId('https://www.youtube-nocookie.com/embed/'+id),id)
  assert.equal(youtubePreviewId('https://www.youtube.com/live/'+id),id)
})

test('blocks malformed IDs and unsafe or lookalike external hosts',()=>{
  for(const url of [
    'javascript:alert(1)','http://youtu.be/80xZ7jN6o2Y',
    'https://youtu.be/80xZ7jN6o2Y.evil.invalid',
    'https://youtu.be/invalid', 'https://youtube.com.evil.invalid/watch?v=80xZ7jN6o2Y',
    'https://youtube.com@evil.invalid/watch?v=80xZ7jN6o2Y',
    'https://user:pass@youtube.com/watch?v=80xZ7jN6o2Y',
    '/api/app/practice/report-materials/private-id/media',
  ]){
    assert.equal(youtubePreviewId(url),'',url)
    assert.equal(safeMaterialVideoUrl(url),'',url)
  }
})

test('allows only HTTPS YouTube and Vimeo educational source links',()=>{
  assert.equal(safeMaterialVideoUrl('https://vimeo.com/12345'),'https://vimeo.com/12345')
  assert.equal(safeMaterialVideoUrl('https://www.youtube.com/watch?v=80xZ7jN6o2Y'),'https://www.youtube.com/watch?v=80xZ7jN6o2Y')
  assert.equal(youtubePreviewId('https://vimeo.com/12345'),'')
})
