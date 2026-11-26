/** Offline synthetic dialogue exercise. No model, live request, database, or provider call. */
import {createHash} from 'node:crypto';
import {ALI_CASES_VERSION,holdout,seed,inspectHoldout,evalScripts} from '../lib/holistic-support/ali-learning-cases.mjs';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';
import {waveTelegramLocalReply} from '../lib/crm/telegram-wave-local-reply.mjs';
if(!inspectHoldout(holdout,seed))throw Error('INVALID_HOLDOUT');
const hash=createHash('sha256').update(JSON.stringify(holdout)).digest('hex');
const native=evalScripts(holdout,({message,locale,history})=>waveNativeTurn({message,locale,history})?.reply??null);
const telegram=evalScripts(holdout,({message,locale,history})=>waveTelegramLocalReply({locale,turns:[...history,{role:'user',text:message}]}));
process.stdout.write(JSON.stringify({version:ALI_CASES_VERSION,holdoutHash:hash,synthetic:true,liveVerified:false,automaticPromotion:false,native,telegram,limitations:['Host-dependent turns stop at requiresHost; direct native/Telegram fallback exercises do not verify routing, safety, signed delivery, provider behavior, semantic quality, or LIVE.','Human review of held-out scenarios is required before any promotion.']},null,2)+'\n');
