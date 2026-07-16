export type FlowState = 'idle' | 'preroll' | 'recording' | 'paused'

export type FlowEvent =
    | 'START_PREROLL'
    | 'START_RECORDING'
    | 'PAUSE'
    | 'RESUME'
    | 'FINISH'
    | 'RESET'

const transitions: Record<FlowState, Partial<Record<FlowEvent, FlowState>>> = {
    idle: {
        START_PREROLL: 'preroll',
        START_RECORDING: 'recording',
        RESET: 'idle',
    },
    preroll: {
        START_RECORDING: 'recording',
        FINISH: 'idle',
        RESET: 'idle',
    },
    recording: {
        PAUSE: 'paused',
        FINISH: 'idle',
        RESET: 'idle',
    },
    paused: {
        RESUME: 'recording',
        FINISH: 'idle',
        RESET: 'idle',
    },
}

export function transitionFlow(state: FlowState, event: FlowEvent): FlowState {
    return transitions[state][event] ?? state
}
