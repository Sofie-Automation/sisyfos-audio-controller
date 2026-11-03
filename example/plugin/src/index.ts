import { WebSocketMixerConnection } from './WebSocketMixerConnection'
import { FxParam } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import type {
    MixerMessageProtocol,
    MixerProtocolGeneric,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

function fx(
    mixerMessage: string,
    meta: Omit<MixerMessageProtocol, 'mixerMessage'> = {}
): MixerMessageProtocol[] {
    return [{ mixerMessage, ...meta }]
}

const fxFromMixer: Record<number, MixerMessageProtocol[]> = {
    [FxParam.EqGain01]: fx('fx/eq/1/g', {
        minLabel: -15,
        maxLabel: 15,
        label: 'Low',
        valueLabel: ' dB',
    }),
    [FxParam.EqGain02]: fx('fx/eq/2/g', {
        minLabel: -15,
        maxLabel: 15,
        label: 'LoMid',
        valueLabel: ' dB',
    }),
    [FxParam.EqGain03]: fx('fx/eq/3/g', {
        minLabel: -15,
        maxLabel: 15,
        label: 'HiMid',
        valueLabel: ' dB',
    }),
    [FxParam.EqGain04]: fx('fx/eq/4/g', {
        minLabel: -15,
        maxLabel: 15,
        label: 'High',
        valueLabel: ' dB',
    }),
    [FxParam.EqFreq01]: fx('fx/eq/1/f', {
        minLabel: 20,
        maxLabel: 20000,
        label: 'Low Freq',
        valueLabel: ' Freq',
    }),
    [FxParam.EqFreq02]: fx('fx/eq/2/f', {
        minLabel: 20,
        maxLabel: 20000,
        label: 'LoMid freq',
        valueLabel: ' Freq',
    }),
    [FxParam.EqFreq03]: fx('fx/eq/3/f', {
        minLabel: 20,
        maxLabel: 20000,
        label: 'HiMid freq',
        valueLabel: ' Freq',
    }),
    [FxParam.EqFreq04]: fx('fx/eq/4/f', {
        minLabel: 20,
        maxLabel: 20000,
        label: 'High freq',
        valueLabel: ' Freq',
    }),
    [FxParam.EqQ01]: fx('fx/eq/1/q', {
        minLabel: 10,
        maxLabel: 0.3,
        label: 'Low Q',
        valueLabel: ' Q',
    }),
    [FxParam.EqQ02]: fx('fx/eq/2/q', {
        minLabel: 10,
        maxLabel: 0.3,
        label: 'LoMid Q',
        valueLabel: ' Q',
    }),
    [FxParam.EqQ03]: fx('fx/eq/3/q', {
        minLabel: 10,
        maxLabel: 0.3,
        label: 'HiMid Q',
        valueLabel: ' Q',
    }),
    [FxParam.EqQ04]: fx('fx/eq/4/q', {
        minLabel: 10,
        maxLabel: 0.3,
        label: 'High Q',
        valueLabel: ' Q',
    }),
    [FxParam.DelayTime]: fx('fx/delay/time', {
        minLabel: 0,
        maxLabel: 500,
        label: 'Time',
        valueLabel: ' ms',
    }),
    [FxParam.GainTrim]: fx('fx/gain/trim', {
        minLabel: -18,
        maxLabel: 18,
        label: 'Gain Trim',
        valueLabel: ' dB',
    }),
    [FxParam.CompThrs]: fx('fx/comp/thr', {
        minLabel: -60,
        maxLabel: 0,
        label: 'Threshold',
        valueLabel: ' dB',
    }),
    [FxParam.CompRatio]: fx('fx/comp/ratio', {
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
    }),
    [FxParam.CompKnee]: fx('fx/comp/knee', {
        minLabel: 0,
        maxLabel: 5,
        label: 'Knee',
        valueLabel: ' ',
    }),
    [FxParam.CompMakeUp]: fx('fx/comp/mgain', {
        minLabel: 0,
        maxLabel: 24,
        label: 'MakeUp',
        valueLabel: ' dB',
    }),
    [FxParam.CompAttack]: fx('fx/comp/attack', {
        minLabel: 0,
        maxLabel: 120,
        label: 'Attack',
        valueLabel: ' ms',
    }),
    [FxParam.CompHold]: fx('fx/comp/hold', {
        minLabel: 0,
        maxLabel: 2000,
        label: 'Hold',
        valueLabel: ' ms',
    }),
    [FxParam.CompRelease]: fx('fx/comp/release', {
        minLabel: 5,
        maxLabel: 4000,
        label: 'Release',
        valueLabel: ' ms',
    }),
    [FxParam.CompOnOff]: fx('fx/comp/on', {
        minLabel: 0,
        maxLabel: 1,
        label: 'Comp On/Off',
    }),
}

const fxToMixer: Record<number, MixerMessageProtocol[]> = Object.fromEntries(
    Object.entries(fxFromMixer).map(([key, messages]) => [
        key,
        messages.map(({ mixerMessage }) => ({ mixerMessage })),
    ])
)

const channelInputGain = fx('input/gain', {
    minLabel: -18,
    maxLabel: 18,
    label: 'Input Gain',
    valueLabel: ' dB',
})

/** Matches mock device default `MOCK_INPUT_SELECTORS` (4). */
const channelInputSelector: MixerMessageProtocol[] = [
    { mixerMessage: 'input/selector/1', label: '1' },
    { mixerMessage: 'input/selector/2', label: '2' },
    { mixerMessage: 'input/selector/3', label: '3' },
    { mixerMessage: 'input/selector/4', label: '4' },
]

const mockWebSocketProtocol: MixerProtocolGeneric = {
    label: 'Mock WebSocket Device',
    protocol: 'custom',
    MAX_UPDATES_PER_SECOND: 15,
    pingTime: 30000,
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                ...fxFromMixer,
                CHANNEL_INPUT_GAIN: channelInputGain,
                CHANNEL_INPUT_SELECTOR: channelInputSelector,
                CHANNEL_AMIX: [{ mixerMessage: 'amix/on' }],
                AUX_LEVEL: [{ mixerMessage: 'aux/{argument}/level' }],
            } as Record<string, unknown>,
            toMixer: {
                ...fxToMixer,
                CHANNEL_INPUT_GAIN: [{ mixerMessage: 'input/gain' }],
                CHANNEL_INPUT_SELECTOR: channelInputSelector.map(
                    ({ mixerMessage, label }) => ({ mixerMessage, label })
                ),
                CHANNEL_AMIX: [{ mixerMessage: 'amix/on' }],
                AUX_LEVEL: [{ mixerMessage: 'aux/{argument}/level' }],
            } as Record<string, unknown>,
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
        test: 0.75,
    },
    presetFileExtension: 'json',
}

module.exports = {
    Mixers: {
        mockWebSocket: {
            displayName: 'Mock WebSocket Device',
            protocol: mockWebSocketProtocol,
            createConnection: (
                protocol: MixerProtocolGeneric,
                mixerIndex: number
            ) => new WebSocketMixerConnection(protocol, mixerIndex),
        },
    },
}
