import {
    MixerProtocol,
    emptyMixerMessage,
    MixerConnectionTypes,
} from '../MixerProtocolInterface'

export const SSLSystemT: MixerProtocol = {
    protocol: MixerConnectionTypes.SSLSystemT,
    label: 'SSL System T',
    presetFileExtension: '',
    loadPresetCommand: [emptyMixerMessage()],
    MAX_UPDATES_PER_SECOND: 10,
    leadingZeros: false,
    pingCommand: [emptyMixerMessage()],
    pingResponseCommand: [emptyMixerMessage()],
    pingTime: 5000,
    initializeCommands: [
        {
            mixerMessage: 'f1 04 00 00 00 {channel}',
        },
    ],
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                CHANNEL_OUT_GAIN: [emptyMixerMessage()], // Handled by SSLMixerconnection
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage: 'f1 04 00 01 00 {channel}',
                    },
                ],
            },
            toMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage: 'f1 06 00 80 00 {channel} {level}',
                    },
                ],
                PFL_ON: [
                    {
                        mixerMessage: 'f1 05 00 80 05 {channel} 01',
                    },
                ],
                PFL_OFF: [
                    {
                        mixerMessage: 'f1 05 00 80 05 {channel} 00',
                    },
                ],
                NEXT_SEND: [
                    {
                        mixerMessage: 'f1 06 00 80 00 {channel} {level}',
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage: 'f1 05 00 80 01 {channel} 00',
                    },
                ],
                CHANNEL_MUTE_OFF: [
                    {
                        mixerMessage: 'f1 05 00 80 01 {channel} 01',
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
