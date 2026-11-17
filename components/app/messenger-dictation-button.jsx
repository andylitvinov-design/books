'use client';

import {useCallback,useEffect,useRef,useState} from 'react';
import {Mic,MicOff} from 'lucide-react';
import {speechResultSegments} from '@/lib/personal-coaching/speech-text';

// Text dictation is independent of optional voice conversation/TTS consent.
// No recording is stored or sent to a Holistic House server until user presses Send.
const COPY={
  en:{
    start:'Dictate a message',stop:'Stop dictation',listening:'Listening…',
    notice:'Your browser or phone may send microphone audio to its speech-recognition service. Holistic House does not store the recording. Check the recognized text before pressing Send. Continue?',
    unsupported:'Speech recognition is unavailable in this browser. Use keyboard dictation or type.',
    denied:'Microphone access is blocked. Allow it in browser settings or use keyboard dictation.',
    failed:'Speech recognition stopped. Tap the microphone again or use keyboard dictation.',
  },
  ru:{
    start:'Диктовать сообщение',stop:'Остановить диктовку',listening:'Слушаю…',
    notice:'Браузер или телефон могут передавать звук своему сервису распознавания речи. Holistic House не сохраняет аудиозапись. Проверьте текст перед отправкой. Продолжить?',
    unsupported:'В этом браузере распознавание речи недоступно. Используйте диктовку клавиатуры или ввод текста.',
    denied:'Микрофон заблокирован. Разрешите доступ в настройках браузера или используйте диктовку клавиатуры.',
    failed:'Распознавание остановилось. Нажмите микрофон ещё раз или используйте диктовку клавиатуры.',
  },
  es:{
    start:'Dictar un mensaje',stop:'Detener dictado',listening:'Escuchando…',
    notice:'Tu navegador o teléfono puede enviar el audio a su servicio de reconocimiento. Holistic House no guarda la grabación. Revisa el texto antes de enviarlo. ¿Continuar?',
    unsupported:'El reconocimiento de voz no está disponible. Usa el dictado del teclado o escribe.',
    denied:'El micrófono está bloqueado. Autoriza el acceso en el navegador o usa el dictado del teclado.',
    failed:'El reconocimiento se detuvo. Vuelve a tocar el micrófono o usa el dictado del teclado.',
  },
};

export function MessengerDictationButton({
  locale='en',disabled=false,resetRevision=0,className='',statusClassName='',
  onTranscript,onBegin,
}){
  const t=COPY[locale]||COPY.en;
  const [listening,setListening]=useState(false);
  const [interim,setInterim]=useState('');
  const [error,setError]=useState('');
  const captureRef=useRef(null);
  const consentRef=useRef(false);
  const transcriptCallback=useRef(onTranscript);
  const beginCallback=useRef(onBegin);
  transcriptCallback.current=onTranscript;
  beginCallback.current=onBegin;

  const abortCapture=useCallback(()=>{
    const capture=captureRef.current;
    captureRef.current=null;
    try{capture?.abort()}catch{/* capture may already be closed */}
    setListening(false);
    setInterim('');
  },[]);
  // Also stop recording on navigation, language change, reset and disabled submit.
  useEffect(()=>{
    const onHidden=()=>{if(document.hidden)abortCapture()};
    document.addEventListener('visibilitychange',onHidden);
    window.addEventListener('pagehide',abortCapture);
    return ()=>{
      document.removeEventListener('visibilitychange',onHidden);
      window.removeEventListener('pagehide',abortCapture);
      abortCapture();
    };
  },[abortCapture]);
  useEffect(()=>{abortCapture();setError('')},[locale,resetRevision,abortCapture]);
  useEffect(()=>{if(disabled)abortCapture()},[disabled,abortCapture]);

  const toggle=()=>{
    if(disabled)return;
    if(captureRef.current){
      try{captureRef.current.stop()}catch{abortCapture()}
      return;
    }
    const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!Recognition){setError(t.unsupported);return;}
    if(!consentRef.current){
      if(!window.confirm(t.notice))return;
      consentRef.current=true;
    }
    beginCallback.current?.();
    try{
      const capture=new Recognition();
      capture.lang=locale==='ru'?'ru-RU':locale==='es'?'es-ES':'en-US';
      capture.continuous=true;
      capture.interimResults=true;
      capture.maxAlternatives=1;
      let previousFinal='';
      let recognized=false;
      capture.onresult=event=>{
        if(captureRef.current!==capture)return;
        const {final,delta,interim:temporary}=speechResultSegments(event.results,previousFinal);
        if(final)previousFinal=final;
        if(delta){
          recognized=true;
          transcriptCallback.current?.(delta);
        }
        setInterim(temporary.slice(0,140));
      };
      capture.onerror=event=>{
        if(captureRef.current!==capture)return;
        abortCapture();
        setError(['not-allowed','service-not-allowed'].includes(event.error)?t.denied:t.failed);
      };
      capture.onend=()=>{
        if(captureRef.current!==capture)return;
        captureRef.current=null;
        setListening(false);
        setInterim('');
        if(!recognized)setError(t.failed);
      };
      captureRef.current=capture;
      setInterim('');
      setError('');
      setListening(true);
      capture.start();
    }catch{
      abortCapture();
      setError(t.failed);
    }
  };

  return <>
    <button type="button" className={className} data-hh-dictation-mic
      onClick={toggle} disabled={disabled} aria-pressed={listening}
      aria-label={listening?t.stop:t.start} title={listening?t.stop:t.start}>
      {listening?<MicOff size={20} aria-hidden="true"/>:<Mic size={20} aria-hidden="true"/>}
    </button>
    {(listening||error)&&<output className={statusClassName} data-hh-dictation-status
      role={error?'alert':'status'} aria-live="polite">{error||interim||t.listening}</output>}
  </>;
}
