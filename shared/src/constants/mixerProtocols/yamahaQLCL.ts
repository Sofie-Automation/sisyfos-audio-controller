import {
    MixerProtocol,
    emptyMixerMessage,
    MixerConnectionTypes,
} from '../MixerProtocolInterface'

export const YamahaQLCL: MixerProtocol = {
    protocol: MixerConnectionTypes.YamahaQlCl,
    label: 'Yamaha QL/CL',
    presetFileExtension: '',
    loadPresetCommand: [emptyMixerMessage()],
    MAX_UPDATES_PER_SECOND: 10,
    leadingZeros: false,
    pingCommand: [emptyMixerMessage()],
    pingResponseCommand: [emptyMixerMessage()],
    pingTime: 10000,
    initializeCommands: [
        {
            mixerMessage: 'f0 43 30 3e 19 01 00 37 00 00 {channel} f7',
            value: 0,
            type: '',
            min: 0,
            max: 1,
            zero: 0.75,
        },
    ],
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            'f0 43 10 3e 19 01 00 37 00 00 {channel} 00 00 00 {level} f7',
                        value: 0,
                        type: '',
                        min: 0,
                        max: 1,
                        zero: 0.75,
                    },
                ], //PgmChange 0 - ignores this command
                CHANNEL_VU: [
                    {
                        mixerMessage: '0',
                        value: 0,
                        type: 'f',
                        min: 0,
                        max: 1,
                        zero: 0.75,
                    },
                ], //PgmChange 0 - ignores this command
                CHANNEL_VU_REDUCTION: [emptyMixerMessage()],
                CHANNEL_NAME: [emptyMixerMessage()],
                PFL: [emptyMixerMessage()],
                NEXT_SEND: [emptyMixerMessage()],
                AUX_LEVEL: [emptyMixerMessage()],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage:
                            'f0 43 10 3e 19 01 00 35 00 00 {channel} 00 00 00 00 00 f7',
                        value: 0,
                        type: '',
                        min: 0,
                        max: 1,
                        zero: 0.75,
                    },
                ],
                // Only MUTE_ON is used as receiver
                CHANNEL_MUTE_OFF: [emptyMixerMessage()],
            },
            toMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            'f0 43 10 3e 19 01 00 37 00 00 {channel} 00 00 00 {level} f7',
                        value: 0,
                        type: '',
                        min: 0,
                        max: 1,
                        zero: 0.75,
                    },
                ],
                CHANNEL_NAME: [emptyMixerMessage()],
                PFL_ON: [emptyMixerMessage()],
                PFL_OFF: [emptyMixerMessage()],
                NEXT_SEND: [emptyMixerMessage()],
                AUX_LEVEL: [emptyMixerMessage()],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage:
                            'f0 43 10 3e 19 01 00 35 00 00 {channel} 00 00 00 00 00 f7',
                        value: 0,
                        type: '',
                        min: 0,
                        max: 1,
                        zero: 0.75,
                    },
                ],
                CHANNEL_MUTE_OFF: [
                    {
                        mixerMessage:
                            'f0 43 10 3e 19 01 00 35 00 00 {channel} 00 00 00 00 01 f7',
                        value: 0,
                        type: '',
                        min: 0,
                        max: 1,
                        zero: 0.75,
                    },
                ],
            },
        },
    ],
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
}
