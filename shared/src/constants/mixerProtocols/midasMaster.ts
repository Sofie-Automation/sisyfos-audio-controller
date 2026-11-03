import {
    MixerProtocol,
    FxParam,
    MixerConnectionTypes,
} from '../MixerProtocolInterface'

export const MidasMaster: MixerProtocol = {
    protocol: MixerConnectionTypes.OSC,
    fxList: FxParam,
    label: 'Midas M32 / Behringer X32 Master Mode',
    presetFileExtension: 'X32',
    loadPresetCommand: [
        {
            mixerMessage: '/load',
        },
    ],
    MAX_UPDATES_PER_SECOND: 15,
    leadingZeros: true,
    pingCommand: [
        {
            mixerMessage: '/xremote',
        },
        {
            mixerMessage: '/meters',
            value: '/meters/1',
            type: 's',
        },
    ],
    pingTime: 9500,
    mixerTimeout: 2000,
    initializeCommands: [
        {
            mixerMessage: '/ch/{channel}/mix/fader',
        },
        {
            mixerMessage: '/ch/{channel}/config/name',
        },
        {
            mixerMessage: '/ch/{channel}/mix/{argument}/level',
            type: 'aux',
        },
        {
            mixerMessage: '/ch/{channel}/preamp/trim',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/thr',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/ratio',
        },
        {
            mixerMessage: '/ch/{channel}/delay/time',
        },
        {
            mixerMessage: '/ch/{channel}/eq/1/g',
        },
        {
            mixerMessage: '/ch/{channel}/eq/2/g',
        },
        {
            mixerMessage: '/ch/{channel}/eq/3/g',
        },
        {
            mixerMessage: '/ch/{channel}/eq/4/g',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/thr',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/ratio',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/attack',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/hold',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/knee',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/mgain',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/ratio',
        },
        {
            mixerMessage: '/ch/{channel}/dyn/on',
        },
        {
            mixerMessage: '/ch/{channel}/delay/time',
        },
        {
            mixerMessage: '/ch/{channel}/eq/1/g',
        },
        {
            mixerMessage: '/ch/{channel}/eq/1/f',
        },
        {
            mixerMessage: '/ch/{channel}/eq/2/f',
        },
        {
            mixerMessage: '/ch/{channel}/eq/3/f',
        },
        {
            mixerMessage: '/ch/{channel}/eq/4/f',
        },
        {
            mixerMessage: '/ch/{channel}/eq/1/q',
        },
        {
            mixerMessage: '/ch/{channel}/eq/2/q',
        },
        {
            mixerMessage: '/ch/{channel}/eq/3/q',
        },
        {
            mixerMessage: '/ch/{channel}/eq/4/q',
        },
    ],
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage: '/ch/{channel}/mix/fader',
                    },
                ],
                CHANNEL_VU: [
                    {
                        mixerMessage: '/meters/1',
                    },
                ],
                CHANNEL_NAME: [
                    {
                        mixerMessage: '/ch/{channel}/config/name',
                    },
                ],
                [FxParam.GainTrim]: [
                    {
                        mixerMessage: '/ch/{channel}/preamp/trim',
                        minLabel: -18,
                        maxLabel: 18,
                        label: 'Gain Trim',
                        valueLabel: ' dB',
                    },
                ],
                [FxParam.CompOnOff]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/on',
                        minLabel: 0,
                        maxLabel: 1,
                        label: 'Comp On/Off',
                    },
                ],
                [FxParam.CompThrs]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/thr',
                        minLabel: -60,
                        maxLabel: 0,
                        label: 'Threshold',
                        valueLabel: ' dB',
                    },
                ],
                [FxParam.CompRatio]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/ratio',
                        min: 0,
                        max: 11,
                        minLabel: 0,
                        maxLabel: 11,
                        label: 'Ratio',
                        valueAsLabels: [
                            '1.1',
                            '1.3',
                            '1.5',
                            '2.0',
                            '2.5',
                            '3.0',
                            '4.0',
                            '5.0',
                            '7.0',
                            '10',
                            '20',
                            '100',
                        ],
                        valueLabel: ' :1',
                    },
                ],
                [FxParam.CompAttack]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/attack',
                        minLabel: 0,
                        maxLabel: 120,
                        label: 'Attack',
                        valueLabel: ' ms',
                    },
                ],
                [FxParam.CompHold]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/hold',
                        minLabel: 0,
                        maxLabel: 2000,
                        label: 'Hold',
                        valueLabel: ' ms',
                    },
                ],
                [FxParam.CompKnee]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/knee',
                        minLabel: 0,
                        maxLabel: 5,
                        label: 'Knee',
                        valueLabel: ' ',
                    },
                ],
                [FxParam.CompMakeUp]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/mgain',
                        minLabel: 0,
                        maxLabel: 24,
                        label: 'MakeUp',
                        valueLabel: ' dB',
                    },
                ],
                [FxParam.CompRelease]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/release',
                        minLabel: 5,
                        maxLabel: 4000,
                        label: 'Release',
                        valueLabel: ' ms',
                    },
                ],
                [FxParam.DelayTime]: [
                    {
                        mixerMessage: '/ch/{channel}/delay/time',
                        minLabel: 0,
                        maxLabel: 500,
                        label: 'Time',
                        valueLabel: ' ms',
                    },
                ],
                [FxParam.EqGain01]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/1/g',
                        minLabel: -15,
                        maxLabel: 15,
                        label: 'Low',
                        valueLabel: ' dB',
                    },
                ],
                [FxParam.EqGain02]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/2/g',
                        minLabel: -15,
                        maxLabel: 15,
                        label: 'LoMid',
                        valueLabel: ' dB',
                    },
                ],
                [FxParam.EqGain03]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/3/g',
                        minLabel: -15,
                        maxLabel: 15,
                        label: 'HiMid',
                        valueLabel: ' dB',
                    },
                ],
                [FxParam.EqGain04]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/4/g',
                        minLabel: -15,
                        maxLabel: 15,
                        label: 'High',
                        valueLabel: ' dB',
                    },
                ],
                [FxParam.EqFreq01]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/1/f',
                        minLabel: 20,
                        maxLabel: 20000,
                        label: 'Low Freq',
                        valueLabel: ' Freq',
                    },
                ],
                [FxParam.EqFreq02]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/2/f',
                        minLabel: 20,
                        maxLabel: 20000,
                        label: 'LoMid freq',
                        valueLabel: ' Freq',
                    },
                ],
                [FxParam.EqFreq03]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/3/f',
                        minLabel: 20,
                        maxLabel: 20000,
                        label: 'HiMid freq',
                        valueLabel: ' Freq',
                    },
                ],
                [FxParam.EqFreq04]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/4/f',
                        minLabel: 20,
                        maxLabel: 20000,
                        label: 'High freq',
                        valueLabel: ' Freq',
                    },
                ],
                [FxParam.EqQ01]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/1/q',
                        minLabel: 10,
                        maxLabel: 0.3,
                        label: 'Low Q',
                        valueLabel: ' Q',
                    },
                ],
                [FxParam.EqQ02]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/2/q',
                        minLabel: 10,
                        maxLabel: 0.3,
                        label: 'LoMid Q',
                        valueLabel: ' Q',
                    },
                ],
                [FxParam.EqQ03]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/3/q',
                        minLabel: 10,
                        maxLabel: 0.3,
                        label: 'HiMid Q',
                        valueLabel: ' Q',
                    },
                ],
                [FxParam.EqQ04]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/4/q',
                        minLabel: 10,
                        maxLabel: 0.3,
                        label: 'High Q',
                        valueLabel: ' Q',
                    },
                ],
                AUX_LEVEL: [
                    {
                        mixerMessage: '/ch/{channel}/mix/{argument}/level',
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage: '/ch/{channel}/mix/on',
                    },
                ],
            },
            toMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage: '/ch/{channel}/mix/fader',
                    },
                ],
                CHANNEL_NAME: [
                    {
                        mixerMessage: '/ch/{channel}/config/name',
                    },
                ],
                [FxParam.GainTrim]: [
                    {
                        mixerMessage: '/ch/{channel}/preamp/trim',
                        minLabel: -18,
                        maxLabel: 18,
                        label: 'Gain Trim',
                        valueLabel: ' dB',
                    },
                ],
                [FxParam.CompOnOff]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/on',
                        minLabel: 0,
                        maxLabel: 1,
                        label: 'Comp On/Off',
                    },
                ],
                [FxParam.CompThrs]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/thr',
                    },
                ],
                [FxParam.CompRatio]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/ratio',
                    },
                ],
                [FxParam.CompAttack]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/attack',
                    },
                ],
                [FxParam.CompHold]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/hold',
                    },
                ],
                [FxParam.CompKnee]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/knee',
                    },
                ],
                [FxParam.CompMakeUp]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/mgain',
                    },
                ],
                [FxParam.CompRelease]: [
                    {
                        mixerMessage: '/ch/{channel}/dyn/release',
                    },
                ],
                [FxParam.DelayTime]: [
                    {
                        mixerMessage: '/ch/{channel}/delay/time',
                    },
                ],
                [FxParam.EqGain01]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/1/g',
                    },
                ],
                [FxParam.EqGain02]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/2/g',
                    },
                ],
                [FxParam.EqGain03]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/3/g',
                    },
                ],
                [FxParam.EqGain04]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/4/g',
                    },
                ],
                [FxParam.EqFreq01]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/1/f',
                    },
                ],
                [FxParam.EqFreq02]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/2/f',
                    },
                ],
                [FxParam.EqFreq03]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/3/f',
                    },
                ],
                [FxParam.EqFreq04]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/4/f',
                    },
                ],
                [FxParam.EqQ01]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/1/q',
                    },
                ],
                [FxParam.EqQ02]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/2/q',
                    },
                ],
                [FxParam.EqQ03]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/3/q',
                    },
                ],
                [FxParam.EqQ04]: [
                    {
                        mixerMessage: '/ch/{channel}/eq/4/q',
                    },
                ],
                AUX_LEVEL: [
                    {
                        mixerMessage: '/ch/{channel}/mix/{argument}/level',
                    },
                ],
                CHANNEL_MUTE_ON: [
                    {
                        mixerMessage: '/ch/{channel}/mix/on',
                        value: 0,
                        type: 'f',
                    },
                ],
                CHANNEL_MUTE_OFF: [
                    {
                        mixerMessage: '/ch/{channel}/mix/on',
                        value: 1,
                        type: 'f',
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
