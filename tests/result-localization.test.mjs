import test from 'node:test'
import assert from 'node:assert/strict'
import { resultCopy, resultDocumentText } from '../lib/consultations/result-copy.js'
test('Russian result includes translated navigation, actions and access feedback',()=>{
 const copy=resultCopy('ru')
 assert.equal(copy.title,'Документы готовы');assert.equal(copy.open,'Открыть');assert.equal(copy.copy,'Копировать ссылку');assert.equal(copy.pdf,'Скачать PDF');assert.equal(copy.print,'Печать')
 assert.equal(copy.newConsultation,'Новая консультация');assert.equal(copy.logout,'Выйти');assert.equal(copy.access,'Настройки доступа')
 for(const key of ['copied','copying','copyError','disabled','reactivate','revoke','reactivateHelp','editPayment','editRecommendation'])assert.match(copy[key],/[А-Яа-яЁё]/)
 assert.equal(resultCopy('en').copy,'Copy link')
})
test('localized document metadata covers receipt, invoice and Russian plural forms',()=>{
 for(const [count,expected] of [[1,'1 препарат'],[2,'2 препарата'],[5,'5 препаратов'],[11,'11 препаратов'],[21,'21 препарат'],[22,'22 препарата'],[114,'114 препаратов']])assert.equal(resultDocumentText({kind:'recommendation',count},'ru').description,expected)
 assert.equal(resultDocumentText({kind:'recommendation',count:1},'en').description,'1 remedy')
 assert.equal(resultDocumentText({kind:'recommendation',count:2},'en').description,'2 remedies')
 assert.equal(resultDocumentText({kind:'payment',paymentStatus:'received',currency:'CAD',amount:23000},'ru').description,'Квитанция · CAD 230,00')
 assert.equal(resultDocumentText({kind:'payment',paymentStatus:'unpaid',currency:'CAD',amount:23000},'ru').description,'Счёт · CAD 230,00')
})


test('Documents Ready labels Bach recommendations distinctly', () => {
 assert.equal(resultDocumentText({kind:'recommendation',recommendationType:'bach',count:1},'en').title,'BACH FLOWER ESSENCE RECOMMENDATION')
 assert.equal(resultDocumentText({kind:'recommendation',recommendationType:'bach',count:1},'en').description,'1 essence')
 assert.equal(resultDocumentText({kind:'recommendation',recommendationType:'bach',count:2},'ru').title,'РЕКОМЕНДАЦИЯ ПО ЭССЕНЦИЯМ БАХА')
 assert.equal(resultDocumentText({kind:'recommendation',recommendationType:'bach',count:2},'ru').description,'2 эссенции')
})
