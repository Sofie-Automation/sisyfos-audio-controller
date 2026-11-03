import {
    CasparCGMixerGeometry,
    CasparCGMixerGeometryFile,
    MixerConnectionTypes,
} from '../MixerProtocolInterface'

// TODO: This is just template data to avoid error if not loading
// default.caspar.ccg from storage folder
// should be simplified when storage is tested on new installations.
let geometry: CasparCGMixerGeometryFile = {
    label: 'Sofie CasparCG Example',
    fromMixer: {
        CHANNEL_VU: [
            [
                '/channel/1/stage/layer/51/audio/1/pFS',
                '/channel/1/stage/layer/51/audio/2/pFS',
            ],
            [
                '/channel/1/stage/layer/52/audio/1/pFS',
                '/channel/1/stage/layer/52/audio/2/pFS',
            ],
            [
                '/channel/1/stage/layer/53/audio/1/pFS',
                '/channel/1/stage/layer/53/audio/2/pFS',
            ],
            [
                '/channel/1/stage/layer/54/audio/1/pFS',
                '/channel/1/stage/layer/54/audio/2/pFS',
            ],
            [
                '/channel/1/stage/layer/55/audio/1/pFS',
                '/channel/1/stage/layer/55/audio/2/pFS',
            ],
            [
                '/channel/1/stage/layer/56/audio/1/pFS',
                '/channel/1/stage/layer/56/audio/2/pFS',
            ],
        ],
    },
    toMixer: {
        PFL_AUX_FADER_LEVEL: [
            [{ channel: 2, layer: 51 }],
            [{ channel: 2, layer: 52 }],
            [{ channel: 2, layer: 53 }],
            [{ channel: 2, layer: 54 }],
            [{ channel: 2, layer: 55 }],
            [{ channel: 2, layer: 56 }],
        ],
        NEXT_AUX_FADER_LEVEL: [
            [{ channel: 2, layer: 51 }],
            [{ channel: 2, layer: 52 }],
            [{ channel: 2, layer: 53 }],
            [{ channel: 2, layer: 54 }],
            [{ channel: 2, layer: 55 }],
            [{ channel: 2, layer: 56 }],
        ],
        PGM_CHANNEL_FADER_LEVEL: [
            [
                { channel: 1, layer: 51 },
                { channel: 3, layer: 51 },
            ],
            [
                { channel: 1, layer: 52 },
                { channel: 3, layer: 52 },
            ],
            [
                { channel: 1, layer: 53 },
                { channel: 3, layer: 53 },
            ],
            [
                { channel: 1, layer: 54 },
                { channel: 3, layer: 54 },
            ],
            [
                { channel: 1, layer: 55 },
                { channel: 3, layer: 55 },
            ],
            [
                { channel: 1, layer: 56 },
                { channel: 3, layer: 56 },
            ],
        ],
    },
    channelLabels: ['RM1', 'RM2', 'RM3', 'RM4', 'RM5', 'MP1'],
    sourceOptions: {
        sources: [
            { channel: 2, layer: 51, producer: '', file: '' },
            { channel: 2, layer: 52, producer: '', file: '' },
            { channel: 2, layer: 53, producer: '', file: '' },
            { channel: 2, layer: 54, producer: '', file: '' },
            { channel: 2, layer: 55, producer: '', file: '' },
            { channel: 2, layer: 56, producer: '', file: '' },
        ],
        options: {
            CHANNEL_LAYOUT: {
                '1L-2R': '8ch2',
                '1L-1R': '4ch-dleft',
                '2L-2R': '4ch-dright',
            },
        },
    },
}

let CasparCGMasterObject: CasparCGMixerGeometry = {
    protocol: MixerConnectionTypes.CasparCG,
    label: `CasparCG Audio Mixer`,
    presetFileExtension: '',
    MAX_UPDATES_PER_SECOND: 10,
    studio: 'studio0',
    leadingZeros: false,
    pingTime: 0,
    fromMixer: geometry.fromMixer,
    toMixer: geometry.toMixer,
    channelLabels: geometry.channelLabels,
    sourceOptions: geometry.sourceOptions,
    fader: {
        min: 0,
        max: 1,
        zero: 0.75,
        step: 0.001,
    },
    meter: {
        min: 0,
        max: 1,
        zero: 0.75,
        test: 0.6,
    },
    //CHANNELTYES ARE NOT IMPLEMENTED.
    //THIS IS JUST TO AVOID ERRORS AS
    //channelTypes are moved to IMixerProtocolGeneric
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage: 'MIXER ${CHANNEL} VOLUME ',
                        value: 0,
                        type: 'f',
                        min: 0,
                        max: 1,
                        zero: 0.75,
                    },
                ],
                CHANNEL_VU: [
                    {
                        mixerMessage:
                            '/channel/{ch}/stage/layer/{layer}/audio/1/pFS',
                    },
                    {
                        mixerMessage:
                            '/channel/{ch}/stage/layer/{layer}/audio/2/pFS',
                    },
                ],
            },
            toMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage: 'none',
                        value: 0,
                        type: 'f',
                        min: 0,
                        max: 1,
                        zero: 0.75,
                    },
                ],
                CHANNEL_INPUT_SELECTOR: [
                    {
                        mixerMessage: '',
                        label: '1L-2R',
                    },
                    {
                        mixerMessage: '',
                        label: '1L-1R',
                    },
                    {
                        mixerMessage: '',
                        label: '2L-2R',
                    },
                ],
            },
        },
    ],
}

export const CasparCGMaster = CasparCGMasterObject
