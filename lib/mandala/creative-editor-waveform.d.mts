export declare const MYTUBE_WAVEFORM_PEAKS:48;
export declare const MYTUBE_WAVEFORM_MAX_FILE_BYTES:number;
export declare const MYTUBE_WAVEFORM_MAX_AUDIO_SECONDS:180;
export declare function extractMyTubeWaveform(samples:Float32Array,
  columns?:number):number[];
export declare function validateMyTubeWaveform(peaks:readonly number[]):number[];
