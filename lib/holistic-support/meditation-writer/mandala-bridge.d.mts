export type MandalaWriterBridgeInput={
 locale:"ru"|"en"|"es";
 theme:"energy"|"money"|"relationships"|"goals"|"life"|"health";
 focusMode?:"state"|"vector";
 selectedState?:"calm"|"energy"|"support"|"connection"|null;
 selectedGoals?:string[];
 currentState?:string;desiredState?:string;
 allowPersonalNotes?:boolean;durationMinutes?:5|10|15;
 styleId?:"gentle_simple"|"grounded_practical"|"poetic_contained"|"contemplative";
 avoidElements?:string[];
};
export type MandalaWriterBridgeResult={status:"invalid";reason:string;request:null}|{
 status:"ready";version:string;
 request:{locale:"ru"|"en"|"es";focus:string;intentionCode:string;mode:"resource";
  durationMinutes:number;styleId:string;motifId:string;avoidElements:string[];
  problemFrame?:string;desiredExperience?:string};
 rationale:string;privateNotesSentToFirstParty:boolean;
 privateNotesAvailableToExternalFreeModel:false;externalProviderCalled:false;
 resourceImageryConsent:false;externalModelConsent:false;
 requiresServerSafetyPreflight:true;requiresAuthenticatedRequest:true;
 publishesAudioOrVideo:false;
};
export declare const MANDALA_WRITER_BRIDGE_VERSION:string;
export declare function buildMandalaWriterRequest(input?:MandalaWriterBridgeInput):MandalaWriterBridgeResult;
