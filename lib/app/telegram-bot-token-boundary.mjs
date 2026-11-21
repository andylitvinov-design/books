import {timingSafeEqual} from 'node:crypto'
/** Compare BotFather tokens without returning/logging secret contents. */
export function sameTelegramBotToken(a,b){
 if(typeof a!=='string'||typeof b!=='string'||
    !/^\d{6,16}:[A-Za-z0-9_-]{25,}$/.test(a)||
    !/^\d{6,16}:[A-Za-z0-9_-]{25,}$/.test(b))return false
 const left=Buffer.from(a,'utf8'),right=Buffer.from(b,'utf8')
 return left.length===right.length&&timingSafeEqual(left,right)
}
