// Browser-only preflight. No provider call or permission prompt.
export function captureBrowserProblem(w){
 if(!w?.isSecureContext)return 'INSECURE_CONTEXT'
 if(!w.AudioContext&&!w.webkitAudioContext)return 'AUDIO_UNSUPPORTED'
 if(!w.MediaStream||!w.MediaRecorder||!['video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'].some(t=>w.MediaRecorder.isTypeSupported?.(t)))return 'RECORDER_UNSUPPORTED'
 return null
}
const messages={INSECURE_CONTEXT:'Откройте страницу по HTTPS в Safari или Chrome.',AUDIO_UNSUPPORTED:'Этот браузер не поддерживает обработку звука. Откройте Safari или Chrome.',RECORDER_UNSUPPORTED:'В этом браузере недоступна запись видео. Откройте Safari или Chrome.',AUDIO_MISSING:'Не удалось получить готовую озвучку Caesar.',AUDIO_TOO_LARGE:'Файл озвучки превышает допустимый размер.',CAPTURE_AUDIO_INVALID:'Не удалось прочитать озвучку.',CAPTURE_AUDIO_DURATION:'Длительность озвучки не соответствует ожидаемой.',ACCESS_DENIED:'Сессия администратора истекла. Войдите снова.',CAPTURE_NOT_APPROVED:'Сервер не разрешил бесплатный запуск.',RATE_LIMITED:'Лимит пробных записей исчерпан. Не запускайте повторно.',CAPTURE_ATTEMPT_LOCKED:'Сервер не подтвердил результат запуска.',NATIVE_HD_TRACKS_UNAVAILABLE:'Simli не передал обе дорожки в разрешении 1080 × 1920.',TRACK_CHANGED:'Во время записи изменилась или пропала дорожка.',CAPTURE_INCOMPLETE:'Simli не подтвердил окончание речи.',CAPTURE_EMPTY:'Запись не содержит данных.',RECORDER_STOP_TIMEOUT:'Браузер не завершил сохранение записи.',STOPPED:'Запись остановлена или превышено время ожидания.'}
export function captureProblem(code,attempted){
 const message=Object.hasOwn(messages,code)?messages[code]:'Не удалось завершить операцию в этом браузере.'
 return message+(attempted?' Не повторяйте запуск до проверки результата и лимита.':' Запрос в Simli не отправлялся.')
}
export function captureUiMime(w){return ['video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus'].find(t=>w?.MediaRecorder?.isTypeSupported?.(t))||null}
