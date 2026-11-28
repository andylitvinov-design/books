import type { ForwardRefExoticComponent, RefAttributes } from 'react'

export interface SimliDialoguePilotProps {
  target?: 'coach' | 'chatbot'
  locale?: string
  personaId?: string
  text?: string
  revision?: string
  phase?: string
  blocked?: boolean
}
export interface SimliDialoguePilotHandle {
  schedule(samples: Float32Array, start: number, context: BaseAudioContext, canSend: () => boolean): void
  clear(): void
}
declare const SimliDialoguePilot: ForwardRefExoticComponent<SimliDialoguePilotProps & RefAttributes<SimliDialoguePilotHandle>>
export default SimliDialoguePilot
