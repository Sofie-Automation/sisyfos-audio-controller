import {
    MixerProtocol,
    emptyMixerMessage,
    MixerConnectionTypes,
} from '../MixerProtocolInterface'

export const GenericMidi: MixerProtocol = {
    protocol: MixerConnectionTypes.GenericMidi,
    label: 'Generic Midi',
    presetFileExtension: '',
    loadPresetCommand: [emptyMixerMessage()],
    MAX_UPDATES_PER_SECOND: 10,
    leadingZeros: false,
    pingCommand: [emptyMixerMessage()],
    pingResponseCommand: [emptyMixerMessage()],
    pingTime: 0,
    initializeCommands: [emptyMixerMessage()],
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage: '0',
                        value: 0,
                        type: 'f',
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
                CHANNEL_MUTE_ON: [emptyMixerMessage()],
                CHANNEL_MUTE_OFF: [emptyMixerMessage()],
            },
            toMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage: '38',
                        value: 0,
                        type: 'f',
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
                CHANNEL_MUTE_ON: [emptyMixerMessage()],
                CHANNEL_MUTE_OFF: [emptyMixerMessage()],
            },
        },
    ],
    fader: {
        min: 0,
        max: 127,
        zero: 100,
        step: 1,
    },
    meter: {
        min: 0,
        max: 127,
        zero: 100,
        test: 80,
    },
}
