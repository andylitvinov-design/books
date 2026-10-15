'use server'

import {requireAdminRequest} from '@/lib/prescriptions/admin'
import {getYoutubeHistoryStore} from '@/lib/youtube/upload-history-store'

function unavailable() {return {ok:false,error:'history_unavailable'}}
function errorCode(error) {
  const code = error instanceof Error ? error.message : ''
  return ['invalid_record','invalid_channel','channel_conflict','wrong_channel','invalid_title',
    'invalid_visibility','history_conflict'].includes(code) ? code : 'history_unavailable'
}

export async function getYoutubeUploadStateAction() {
  if (!await requireAdminRequest()) return {ok:false,error:'unauthorized'}
  try {
    const store = getYoutubeHistoryStore()
    if (!store) return unavailable()
    const [history,channels] = await Promise.all([store.list(),store.channels()])
    return {ok:true,history,channels}
  } catch {return unavailable()}
}

export async function pairEnglishYoutubeChannelAction(input) {
  if (!await requireAdminRequest()) return {ok:false,error:'unauthorized'}
  if (!input || input.confirmed !== true || typeof input.id !== 'string') return {ok:false,error:'invalid_channel'}
  try {
    const store = getYoutubeHistoryStore()
    if (!store) return unavailable()
    const channel = await store.pairEnglish({id:input.id,name:input.name,handle:input.handle})
    return {ok:true,channel}
  } catch (error) {return {ok:false,error:errorCode(error)}}
}

export async function saveYoutubeUploadHistoryAction(input) {
  if (!await requireAdminRequest()) return {ok:false,error:'unauthorized'}
  try {
    const store = getYoutubeHistoryStore()
    if (!store) return unavailable()
    const record = await store.save(input)
    return {ok:true,record}
  } catch (error) {return {ok:false,error:errorCode(error)}}
}
