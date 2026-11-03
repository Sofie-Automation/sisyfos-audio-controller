import {
    MixerProtocol,
    emptyMixerMessage,
    VuLabelConversionType,
    MixerConnectionTypes,
} from '../MixerProtocolInterface'

export const INITIALIZE_COMMANDS_FADERS = 0
export const INITIALIZE_COMMANDS_SOURCE_LIST = 1
export const INITIALIZE_COMMANDS_FADER_SOURCE_ID = 2

export const DHDMixer: MixerProtocol = {
    protocol: MixerConnectionTypes.DHD,
    label: 'DHD.audio Series52',
    MAX_UPDATES_PER_SECOND: 50,
    initializeCommands: [
        {
            mixerMessage: '/audio/mixers/{mixerID}/faders',
        },
        {
            mixerMessage: '/audio/mixers/{mixerID}/sourcelist',
        },
        {
            mixerMessage: '/audio/mixers/{mixerID}/faders/{faderID}/sourceid',
        },
    ],
    leadingZeros: false, //some OSC protocols needs channels to be 01, 02 etc.
    pingTime: 20 * 1000, //Bypass ping when pingTime is zero
    vuLabelConversionType: VuLabelConversionType.Decibel,
    vuLabelValues: [0, 0.5, 0.75, 1],
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                CHANNEL_INPUT_GAIN: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/params/gain/again/value',
                        value: 0,
                        type: 'int',
                        min: -30,
                        max: 18,
                        zero: 0,
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/on',
                        type: 'bool',
                    },
                ],
                CHANNEL_VU: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/meter/_pfl',
                        value: 0,
                        type: 'int',
                        min: -160,
                        max: 10,
                        zero: 0,
                    },
                ],
                // CHANNEL_INPUT_SELECTOR: [
                // {
                //   mixerMessage: 'Ruby.Sources.{channel}.DSP.Input.LR Mode',
                //   value: 0,
                //   type: 'int',
                //   label: 'LR',
                // },
                // {
                //   mixerMessage: 'Ruby.Sources.{channel}.DSP.Input.LR Mode',
                //   value: 4,
                //   type: 'int',
                //   label: 'LL',
                // },
                // {
                //   mixerMessage: 'Ruby.Sources.{channel}.DSP.Input.LR Mode',
                //   value: 1,
                //   type: 'int',
                //   label: 'RR',
                // },
                // {
                //   mixerMessage: 'Ruby.Sources.{channel}.DSP.Input.LR Mode',
                //   value: 5,
                //   type: 'int',
                //   label: 'MONO',
                // },
                // ],
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/fader',
                        value: 0,
                        type: 'int',
                        min: -160,
                        max: 10,
                        zero: 0,
                    },
                ],
                CHANNEL_NAME: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/label',
                        type: 'string',
                    },
                ],
                // PFL: [emptyMixerMessage()],
                // CHANNEL_AMIX: [
                //   {
                //     mixerMessage: '/audio/mixers/{mixerID}/faders/{faderID}/busparams/automix/group',
                //   },
                // ],
            },
            toMixer: {
                CHANNEL_INPUT_GAIN: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/params/gain/again/value',
                        value: 0,
                        type: 'int',
                        min: -30,
                        max: 18,
                        zero: 0,
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/on',
                        type: 'bool',
                    },
                ],
                // CHANNEL_INPUT_SELECTOR: [
                // {
                //   mixerMessage: 'Ruby.Sources.{channel}.DSP.Input.LR Mode',
                //   value: 0,
                //   type: 'int',
                //   label: 'LR',
                // },
                // {
                //   mixerMessage: 'Ruby.Sources.{channel}.DSP.Input.LR Mode',
                //   value: 4,
                //   type: 'int',
                //   label: 'LL',
                // },
                // {
                //   mixerMessage: 'Ruby.Sources.{channel}.DSP.Input.LR Mode',
                //   value: 1,
                //   type: 'int',
                //   label: 'RR',
                // },
                // {
                //   mixerMessage: 'Ruby.Sources.{channel}.DSP.Input.LR Mode',
                //   value: 5,
                //   type: 'int',
                //   label: 'MONO',
                // },
                // ],
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/fader',
                        value: 0,
                        type: 'int',
                        min: -160,
                        max: 10,
                        zero: 0,
                    },
                ],
                CHANNEL_NAME: [
                    {
                        mixerMessage:
                            '/audio/mixers/{mixerID}/faders/{faderID}/label',
                        type: 'string',
                    },
                ],
                // CHANNEL_AMIX: [
                //   {
                //     mixerMessage: '/audio/mixers/{mixerID}/faders/{faderID}/busparams/automix/group',
                //   },
                // ],
            },
        },
    ],
    fader: {
        min: 0,
        max: 1,
        zero: 0.75,
        step: 1,
    },
    meter: {
        min: 0,
        max: 1,
        zero: 0.75,
        test: 0.6,
    },
}
