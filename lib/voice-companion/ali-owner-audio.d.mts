export function unlockAliOwnerAudio(environment?: Window): AudioContext|null;
export function aliOwnerAudioAvailable(environment?: Window,signal?: AbortSignal): Promise<boolean>;
export function startAliOwnerAudio(options:{environment?:Window;context:AudioContext|null;personaId:string;locale:string;text:string;onStart?:()=>void;onEnd?:()=>void;onError?:()=>void}):{cancel:()=>void};
