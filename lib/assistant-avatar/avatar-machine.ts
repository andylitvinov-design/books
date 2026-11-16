// Typed entry point. Runtime is shared with Node behavioral tests in .mjs.
export {initialAvatarState, reduceAvatar} from './avatar-machine.mjs';
export type {AvatarPhase, AvatarEmotion, AvatarViewModel, AvatarState, AvatarEvent} from './avatar-machine.mjs';
