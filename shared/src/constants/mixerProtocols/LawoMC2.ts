import {
    MixerProtocol,
    emptyMixerMessage,
    VuLabelConversionType,
    MixerConnectionTypes,
} from '../MixerProtocolInterface'

export const LawoMC2: MixerProtocol = {
    protocol: MixerConnectionTypes.LawoMC2,
    label: 'Lawo MC2',
    presetFileExtension: 'MC2',
    loadPresetCommand: [
        {
            mixerMessage: 'Production.Load Snapshot',
        },
    ],
    MAX_UPDATES_PER_SECOND: 10,
    leadingZeros: false, //some OSC protocols needs channels to be 01, 02 etc.
    pingCommand: [emptyMixerMessage()],
    pingResponseCommand: [emptyMixerMessage()],
    pingTime: 0, //Bypass ping when pingTime is zero
    initializeCommands: [emptyMixerMessage()],
    vuLabelConversionType: VuLabelConversionType.DecibelMC2,
    vuLabelValues: [0.125, 0.25, 0.375, 0.5, 0.625, 0.75, 0.875, 1],
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Fader.Fader Level',
                        value: 0,
                        type: 'real',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_NAME: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.General.User Label',
                        value: 0,
                        type: 'real',
                        min: -200,
                        max: 20,
                        zero: 0,
                    },
                ],
                CHANNEL_INPUT_GAIN: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Signal Processing.Digital Amplifier.DigiAmp Level',
                        value: 0,
                        type: 'int',
                        min: -128,
                        max: 12,
                        zero: 0,
                        maxLabel: 12,
                        minLabel: -128,
                    },
                ],
                CHANNEL_INPUT_SELECTOR: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Signal Processing.Input Mixer.Input Left to Both',
                        value: 0,
                        type: 'bool',
                        label: 'LR',
                    },
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Signal Processing.Input Mixer.Input Left to Both',
                        value: true,
                        type: 'bool',
                        label: 'LL',
                    },
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Signal Processing.Input Mixer.Input Right to Both',
                        value: true,
                        type: 'bool',
                        label: 'RR',
                    },
                ],
                PFL: [
                    {
                        mixerMessage: 'Channels.Inputs.${channel}.Listen.PFL',
                        value: 0,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_AMIX: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Automix.Automix Active',
                        value: false,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage: 'Channels.Inputs.${channel}.Mute.Mute',
                        value: true,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_VU: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Metering.Main Level',
                        value: true,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
            },
            toMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Fader.Fader Level',
                        value: 0,
                        type: 'real',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                // CHANNEL_NAME: [
                //     {
                //         mixerMessage:
                //             'Channels.Inputs.${channel}.General.User Label',
                //         value: 0,
                //         type: 'real',
                //         min: -200,
                //         max: 20,
                //         zero: 0,
                //     },
                // ],
                CHANNEL_INPUT_GAIN: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Signal Processing.Digital Amplifier.DigiAmp Level',
                        value: 0,
                        type: 'int',
                        min: -128,
                        max: 12,
                        zero: 0,
                        maxLabel: 12,
                        minLabel: -128,
                    },
                ],
                CHANNEL_INPUT_SELECTOR: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Signal Processing.Input Mixer.Input Left to Both',
                        value: 0,
                        type: 'bool',
                        label: 'LR',
                    },
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Signal Processing.Input Mixer.Input Left to Both',
                        value: 1,
                        type: 'bool',
                        label: 'LL',
                    },
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Signal Processing.Input Mixer.Input Right to Both',
                        value: 1,
                        type: 'bool',
                        label: 'RR',
                    },
                ],
                PFL_ON: [
                    {
                        mixerMessage: 'Channels.Inputs.${channel}.Listen.PFL',
                        value: true,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                PFL_OFF: [
                    {
                        mixerMessage: 'Channels.Inputs.${channel}.Listen.PFL',
                        value: false,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_AMIX: [
                    {
                        mixerMessage:
                            'Channels.Inputs.${channel}.Automix.Automix Active',
                        value: false,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage: 'Channels.Inputs.${channel}.Mute.Mute',
                        value: true,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
            },
        },
        {
            channelTypeName: 'Groups',
            channelTypeColor: '#2f5f2f',
            fromMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            'Channels.Groups.${channel}.Fader.Fader Level',
                        value: 0,
                        type: 'real',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_NAME: [
                    {
                        mixerMessage:
                            'Channels.Groups.${channel}.General.User Label',
                        value: 0,
                        type: 'real',
                        min: -200,
                        max: 20,
                        zero: 0,
                    },
                ],
                CHANNEL_INPUT_GAIN: [
                    {
                        mixerMessage:
                            'Channels.Groups.${channel}.Signal Processing.Digital Amplifier.DigiAmp Level',
                        value: 0,
                        type: 'int',
                        min: -128,
                        max: 12,
                        zero: 0,
                        maxLabel: 12,
                        minLabel: -128,
                    },
                ],
                PFL: [
                    {
                        mixerMessage: 'Channels.Groups.${channel}.Listen.PFL',
                        value: 0,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_AMIX: [
                    {
                        mixerMessage:
                            'Channels.Groups.${channel}.Automix.Automix Active',
                        value: false,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage: 'Channels.Groups.${channel}.Mute.Mute',
                        value: true,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_VU: [
                    {
                        mixerMessage:
                            'Channels.Groups.${channel}.Metering.Main Level',
                        value: true,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
            },
            toMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            'Channels.Groups.${channel}.Fader.Fader Level',
                        value: 0,
                        type: 'real',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                // Empty user labels are written to the MC2, we're disabling the feature for NRK
                // CHANNEL_NAME: [
                //     {
                //         mixerMessage:
                //             'Channels.Groups.${channel}.General.User Label',
                //         value: 0,
                //         type: 'real',
                //         min: -200,
                //         max: 20,
                //         zero: 0,
                //     },
                // ],
                CHANNEL_INPUT_GAIN: [
                    {
                        mixerMessage:
                            'Channels.Groups.${channel}.Signal Processing.Digital Amplifier.DigiAmp Level',
                        value: 0,
                        type: 'int',
                        min: -128,
                        max: 12,
                        zero: 0,
                        maxLabel: 12,
                        minLabel: -128,
                    },
                ],
                PFL_ON: [
                    {
                        mixerMessage: 'Channels.Groups.${channel}.Listen.PFL',
                        value: true,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                PFL_OFF: [
                    {
                        mixerMessage: 'Channels.Groups.${channel}.Listen.PFL',
                        value: false,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_AMIX: [
                    {
                        mixerMessage:
                            'Channels.Groups.${channel}.Automix.Automix Active',
                        value: false,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage: 'Channels.Groups.${channel}.Mute.Mute',
                        value: true,
                        type: 'boolean',
                        min: -128,
                        max: 12,
                        zero: 0,
                    },
                ],
            },
        },
    ],
    fader: {
        min: 0,
        max: 1,
        zero: 0.75,
        step: 10,
    },
    meter: {
        min: 0,
        max: 1,
        zero: 0.75,
        test: 0.6,
    },
}
