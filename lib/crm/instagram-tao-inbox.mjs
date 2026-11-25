// Instagram Business Login (NOT Facebook Page login) inbound DM parsing.
// Pure, no provider calls, tokens, private media URLs or cross-account merging.
export const TAO_IDEAS_INSTAGRAM_HANDLE = 'tao.ideas';

const ACCOUNT_ID = /^\d{5,25}$/;
const META_MESSAGE_ID = /^[^\x00-\x1f\x7f]{1,256}$/;
const SAFE_TYPES = new Set(['image','video','audio','file','share','story_mention','sticker']);
const safe = value => typeof value === 'string'
  ? value.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,1200) : '';

function mediaLabels(message) {
  const media = Array.isArray(message?.attachments) ? message.attachments.slice(0,10) : [];
  const labels = [...new Set(media.map(item=>item?.type).filter(type=>SAFE_TYPES.has(type)))];
  // Unsupported attachment kinds still appear in CRM as a neutral marker.
  if(media.length&&labels.length===0) labels.push('other');
  return labels;
}

// Instagram's event sender/recipient are scoped numeric IDs, never a user handle.
// Messages are accepted for the one explicitly configured account only.
// Never accept spoofed business IDs, messages emitted by the business itself,
// a malformed source object, read receipts, comments, postbacks or reactions as DMs.
export function normalizeTaoIdeasInstagramMessages(payload, businessId) {
  if (!ACCOUNT_ID.test(String(businessId||'')) || payload?.object !== 'instagram' ||
      !Array.isArray(payload?.entry)) return [];
  const updates=[];
  for (const entry of payload.entry) {
    if (String(entry?.id||'') !== String(businessId) ||
        !Array.isArray(entry?.messaging)) continue;
    for (const item of entry.messaging) {
      const message=item?.message;
      const sender=String(item?.sender?.id||'');
      const recipient=String(item?.recipient?.id||'');
      // Deleted messages are not republished; a separate deletion/retention
      // workflow is needed to retract already delivered content.
      if (!message || message.is_echo === true || message.is_deleted === true ||
          !ACCOUNT_ID.test(sender) || sender===String(businessId) ||
          recipient!==String(businessId) ||
          typeof message.mid!=='string' || !META_MESSAGE_ID.test(message.mid)) continue;
      const body=safe(message.text);
      const media=mediaLabels(message);
      const storyReply=Boolean(message.reply_to?.story);
      if (!body && media.length===0 && !storyReply) continue;
      // Preserve human-readable text plus type, but never persist a Meta CDN
      // URL, photo content, auth ID or customer's private media reference here.
      // Attachments are represented as a private conversation marker; real
      // media playback requires a separately reviewed owner-only proxy.
      const mediaNote=media.length?'[Instagram attachment: '+media.join(', ')+']':'';
      const storyNote=storyReply?'[Instagram story reply]':'';
      const summary=[body,storyNote,mediaNote].filter(Boolean).join(' · ').slice(0,1200);
      const ts=Number(item.timestamp);
      // An absent or seconds-resolution time is not a new customer message.
      // Never convert it to Date.now(): that could falsely reopen Meta's
      // customer-initiated reply window. Signed Meta messaging uses UTC ms.
      if (!Number.isSafeInteger(ts) || ts<1000000000000 ||
          ts>Date.now()+5*60*1000) continue;
      updates.push({
        type:'incoming',accountId:String(businessId),userId:sender,
        // Instagram webhook does not provide an authenticated sender handle.
        // Give the owner a distinguishable, masked conversation label instead.
        name:'Instagram DM · #'+sender.slice(-4),
        language:null,body:summary,
        eventId:'instagram:'+message.mid,messageId:'instagram:'+message.mid,
        sentAt:ts,
        stop:/^\s*(?:stop|unsubscribe|стоп|parar)\s*$/i.test(body),
      });
      if(updates.length>30) throw new RangeError('INSTAGRAM_WEBHOOK_BATCH_LIMIT');
    }
  }
  return updates;
}

export function instagramIdentityMatches(profile, configuredId) {
  return Boolean(profile &&
    ACCOUNT_ID.test(String(configuredId||'')) &&
    String(profile.id)===String(configuredId) &&
    String(profile.username||'').replace(/^@/,'').toLowerCase()===TAO_IDEAS_INSTAGRAM_HANDLE &&
    ['BUSINESS','MEDIA_CREATOR','CREATOR'].includes(String(profile.account_type||'').toUpperCase()));
}

export function instagramMessagesSubscribed(value) {
  if (!Array.isArray(value?.data)) return false;
  return value.data.some(item=> {
    const list=Array.isArray(item?.subscribed_fields)?item.subscribed_fields:
      typeof item?.subscribed_fields==='string'?item.subscribed_fields.split(','):[];
    return list.map(field=>String(field).trim()).includes('messages');
  });
}
