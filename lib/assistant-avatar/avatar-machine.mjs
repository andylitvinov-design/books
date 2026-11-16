/** A pure, monotonic turn/speech state machine. No conversation storage. */
export function initialAvatarState(compact=true) {
  return {phase:'idle', emotion:'neutral', intensity:0, visible:true, compact:Boolean(compact), speaking:false, turnId:0, speechId:0};
}
export function reduceAvatar(state, event) {
  switch(event.type) {
    case 'TURN_START':
      if (event.turnId <= state.turnId) return state;
      return {...state, turnId:event.turnId, phase:state.visible?'reacting':'hidden',
        emotion:event.emotion || 'neutral', intensity:event.intensity || 0, speaking:false,
        speechId:state.speechId+1};
    case 'THINKING':
      if (event.turnId !== state.turnId || !state.visible || state.speaking) return state;
      return {...state,phase:'thinking'};
    case 'TURN_DONE':
      if (event.turnId !== state.turnId || !state.visible || state.speaking) return state;
      return {...state,phase:'idle'};
    case 'TURN_ERROR':
      if (event.turnId !== state.turnId) return state;
      return {...state,phase:state.visible?'error':'hidden',emotion:'neutral',intensity:0,speaking:false,speechId:state.speechId+1};
    case 'SPEECH_START':
      if (event.turnId !== state.turnId || event.speechId < state.speechId || !state.visible) return state;
      return {...state,speechId:event.speechId,phase:'speaking',speaking:true};
    case 'SPEECH_END':
      if (event.turnId !== state.turnId || event.speechId !== state.speechId || !state.speaking) return state;
      return {...state,phase:state.visible?'idle':'hidden',speaking:false};
    case 'HIDE':
      return {...state,visible:false,phase:'hidden',speaking:false,speechId:state.speechId+1};
    case 'SHOW':
      return {...state,visible:true,phase:'idle',speaking:false};
    case 'RESET':
      if (event.turnId <= state.turnId) return state;
      return {...initialAvatarState(state.compact),visible:state.visible,
        phase:state.visible?'idle':'hidden',turnId:event.turnId,speechId:state.speechId+1};
    case 'LOCALE_CHANGE':
      return {...state,phase:state.visible?'idle':'hidden',emotion:'neutral',intensity:0,
        speaking:false,speechId:state.speechId+1};
    default: return state;
  }
}
