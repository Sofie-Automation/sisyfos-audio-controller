//While developing mixer specific settings will be in one file.
//At first release these will be in seperate files
//So it´s easy to add new equipment.

export interface AutomationProtocol {
    protocol: string
    label: string
    mode: string
    leadingZeros: boolean
    initializeCommands: [
        {
            mixerMessage: string
            value: string
            type: string
        },
    ]
    fromAutomation: {
        CHANNEL_PGM_ON_OFF: string
        CHANNEL_PST_ON_OFF: string
        CHANNEL_FADER_LEVEL: string
        CHANNEL_INPUT_GAIN: string
        CHANNEL_INPUT_SELECTOR: string
        SET_CHANNEL_STATE: string
        INJECT_COMMAND: string
        CHANNEL_VISIBLE: string
        CHANNEL_MUTE: string
        X_MIX: string
        SET_LABEL: string
        FADE_TO_BLACK: string
        CLEAR_PST: string
        SNAP_RECALL: string
        STATE_CHANNEL_PGM: string
        STATE_CHANNEL_PST: string
        STATE_CHANNEL_FADER_LEVEL: string
        STATE_CHANNEL_INPUT_GAIN: string
        STATE_CHANNEL_INPUT_SELECTOR: string
        STATE_CHANNEL_MUTE: string
        STATE_FULL: string
        STATE_CHANNEL: string
        LOAD_MIXER_PRESET: string
        PING: string
    }
    toAutomation: {
        STATE_CHANNEL_PGM: string
        STATE_CHANNEL_PST: string
        STATE_CHANNEL_FADER_LEVEL: string
        STATE_CHANNEL_INPUT_GAIN: string
        STATE_CHANNEL_INPUT_SELECTOR: string
        STATE_CHANNEL_MUTE: string
        STATE_FULL: string
        STATE_CHANNEL: string
        PONG: string
    }
    fader: {
        min: number
        max: number
        zero: number
        step: number
    }
    meter: {
        min: number
        max: number
        zero: number
        test: number
    }
}

export interface AutomationChannelAPI {
    faderLevel: number
    pgmOn: boolean
    voOn: boolean
    pstOn: boolean
    showChannel: boolean
    muteOn: boolean
    inputGain: number
    inputSelector: number
    label: string
}

export const AutomationPresets: { [key: string]: AutomationProtocol } = {
    sofie: {
        protocol: 'OSC',
        label: 'Sofie Automation',
        mode: 'client',
        leadingZeros: true,
        initializeCommands: [
            {
                mixerMessage: '/info',
                value: '',
                type: 'f',
            },
        ],
        fromAutomation: {
            CHANNEL_PGM_ON_OFF: '/ch/{value1}/pgm',
            CHANNEL_PST_ON_OFF: '/ch/{value1}/pst',
            CHANNEL_FADER_LEVEL: '/ch/{value1}/faderlevel',
            CHANNEL_INPUT_GAIN: '/ch/{value1}/inputgain',
            CHANNEL_INPUT_SELECTOR: '/ch/{value1}/inputselector',
            CHANNEL_VISIBLE: '/ch/{value1}/visible',
            SET_CHANNEL_STATE: '/setchannel/{value1}',
            CHANNEL_MUTE: '/ch/{value1}/mute',
            X_MIX: '/take',
            INJECT_COMMAND: '/inject',
            SET_LABEL: '/ch/{value1}/label',
            FADE_TO_BLACK: '/fadetoblack',
            CLEAR_PST: '/clearpst',
            SNAP_RECALL: '/snap/{value1}',
            STATE_CHANNEL_INPUT_GAIN: '/ch/{value1}/inputgain/state',
            STATE_CHANNEL_INPUT_SELECTOR: '/ch/{value1}/inputselector/state',
            STATE_CHANNEL_PGM: '/ch/{value1}/pgm/state',
            STATE_CHANNEL_PST: '/ch/{value1}/pst/state',
            STATE_CHANNEL_FADER_LEVEL: '/ch/{value1}/faderlevel/state',
            STATE_CHANNEL_MUTE: '/ch/{value1}/mute/state',
            STATE_FULL: '/state/full',
            STATE_CHANNEL: '/ch/{value1}/state',
            LOAD_MIXER_PRESET: '/loadmixerpreset',
            PING: '/ping/{value1}',
        },
        toAutomation: {
            STATE_CHANNEL_INPUT_GAIN: '/ch/{value1}/inputgain/state',
            STATE_CHANNEL_INPUT_SELECTOR: '/ch/{value1}/inputselector/state',
            STATE_CHANNEL_PGM: '/ch/{value1}/pgm/state',
            STATE_CHANNEL_PST: '/ch/{value1}/pst/state',
            STATE_CHANNEL_FADER_LEVEL: '/ch/{value1}/faderlevel/state',
            STATE_CHANNEL_MUTE: '/ch/{value1}/mute/state',
            STATE_FULL: '/state/full',
            STATE_CHANNEL: '/ch/{value1}/state',
            PONG: '/pong',
        },
        fader: {
            min: 0,
            max: 1,
            zero: 0.75,
            step: 0.01,
        },
        meter: {
            min: 0,
            max: 1,
            zero: 0.75,
            test: 0.6,
        },
    },
}

export const AutomationProtocolList = Object.getOwnPropertyNames(
    AutomationPresets
).map((preset) => {
    return {
        value: preset,
        label: AutomationPresets[preset].label,
    }
})
