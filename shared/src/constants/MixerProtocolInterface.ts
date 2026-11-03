export enum MixerConnectionTypes {
    'OSC' = 'OSC',
    'EMBER' = 'EMBER',
    'YamahaQlCl' = 'YamahaQlCl',
    'GenericMidi' = 'GenericMidi',
    'LawoRuby' = 'LawoRuby',
    'LawoMC2' = 'LawoMC2',
    'CasparCG' = 'CasparCG',
    'SSLSystemT' = 'SSLSystemT',
    'Studer' = 'Studer',
    'StuderVista' = 'StuderVista',
    'vMix' = 'vMix',
    'Atem' = 'Atem',
    'DHD' = 'DHD',
}

export enum FxParam {
    EqGain01,
    EqGain02,
    EqGain03,
    EqGain04,
    EqFreq01,
    EqFreq02,
    EqFreq03,
    EqFreq04,
    EqQ01,
    EqQ02,
    EqQ03,
    EqQ04,
    DelayTime,
    GainTrim,
    CompThrs,
    CompRatio,
    CompKnee,
    CompMakeUp,
    CompAttack,
    CompHold,
    CompRelease,
    CompOnOff,
}
export enum VuLabelConversionType {
    Linear = 'linear',
    Decibel = 'decibel',
    DecibelRuby = 'decibelRuby',
    DecibelMC2 = 'decibelMC2',
}
export interface MixerProtocolGeneric {
    protocol: string
    fxList?: {}
    label: string
    presetFileExtension?: string
    loadPresetCommand?: Array<MixerMessageProtocol>
    MAX_UPDATES_PER_SECOND: number
    pingTime?: number
    vuLabelConversionType?: VuLabelConversionType
    vuLabelValues?: Array<number>
    fader: {
        min: number
        max: number
        zero: number
        step: number
    }
    meter?: {
        min: number
        max: number
        zero: number
        test: number
    }
    channelTypes: Array<ChannelTypes>
}

export interface MixerProtocol extends MixerProtocolGeneric {
    leadingZeros?: boolean
    /** Simple command for pinging Audio mixer */
    pingCommand?: Array<MixerMessageProtocol>
    /** Ping commands that expects responses */
    pingResponseCommand?: Array<MixerMessageProtocol>
    /** How often should mixer ping the pingCommands, in milliseconds */
    pingTime?: number
    /** Max time between responses from AudioMixer, in milliseconds */
    mixerTimeout?: number
    /** Commands to be sent to the mixer after connection is established */
    initializeCommands?: Array<MixerMessageProtocol>
}

export interface VMixMixerProtocol extends MixerProtocol {
    channelMatrixPrefix?: string // Prefix used for channel identification (e.g., "EXT")
    lrPreset: string // LR matrix preset name (hardcoded as "LR")
}

export interface ChannelTypes {
    channelTypeName: string
    channelTypeColor: string
    fromMixer: {
        CHANNEL_INPUT_GAIN?: Array<MixerMessageProtocol>
        CHANNEL_INPUT_SELECTOR?: Array<MixerMessageProtocol>
        CHANNEL_OUT_GAIN?: Array<MixerMessageProtocol>
        CHANNEL_VU?: Array<MixerMessageProtocol>
        CHANNEL_VU_REDUCTION?: Array<MixerMessageProtocol>
        CHANNEL_NAME?: Array<MixerMessageProtocol>
        PFL?: Array<MixerMessageProtocol>
        NEXT_SEND?: Array<MixerMessageProtocol>
        [FX_PARAM: number]: any
        AUX_LEVEL?: Array<MixerMessageProtocol>
        CHANNEL_MUTE_ON?: Array<MixerMessageProtocol>
        CHANNEL_MUTE_OFF?: Array<MixerMessageProtocol>
        CHANNEL_AMIX?: Array<MixerMessageProtocol>
        [command: string]: any
    }
    toMixer: {
        CHANNEL_INPUT_GAIN?: Array<MixerMessageProtocol>
        CHANNEL_INPUT_SELECTOR?: Array<MixerMessageProtocol>
        CHANNEL_OUT_GAIN?: Array<MixerMessageProtocol>
        CHANNEL_NAME?: Array<MixerMessageProtocol>
        PFL_ON?: Array<MixerMessageProtocol>
        PFL_OFF?: Array<MixerMessageProtocol>
        NEXT_SEND?: Array<MixerMessageProtocol>
        [FX_PARAM: number]: any
        AUX_LEVEL?: Array<MixerMessageProtocol>
        CHANNEL_MUTE_ON?: Array<MixerMessageProtocol>
        CHANNEL_MUTE_OFF?: Array<MixerMessageProtocol>
        CHANNEL_AMIX?: Array<MixerMessageProtocol>
        [command: string]: any
    }
}

export interface MixerMessageProtocol {
    mixerMessage: string
    value?: any
    type?: string
    min?: number
    max?: number
    zero?: number
    label?: string
    valueAsLabels?: Array<string>
    valueLabel?: string
    minLabel?: number
    maxLabel?: number
    zeroLabel?: number
}

export interface FxProtocol {
    key: FxParam
    params: Array<MixerMessageProtocol>
}

export const emptyMixerMessage = (): MixerMessageProtocol => {
    return {
        mixerMessage: 'none',
        value: 0,
        type: '',
        min: 0,
        max: 0,
        zero: 0,
    }
}

// CasparCG Specific interfaces:
export interface CasparCGChannelLayerPair {
    channel: number
    layer: number
}

export interface CasparCGMixerGeometryFile {
    label?: string
    channelLabels?: string[]
    fromMixer: {
        CHANNEL_VU: Array<string[]>
    }
    toMixer: {
        PGM_CHANNEL_FADER_LEVEL: Array<CasparCGChannelLayerPair[]>
        PFL_AUX_FADER_LEVEL: Array<CasparCGChannelLayerPair[]>
        NEXT_AUX_FADER_LEVEL: Array<CasparCGChannelLayerPair[]>
        CHANNEL_INPUT_SELECTOR?: Array<MixerMessageProtocol>
    }
    sourceOptions?: {
        sources: Array<
            CasparCGChannelLayerPair & {
                producer: string
                file: string
            }
        >
        options: {
            [key: string]: {
                // producer property invocation
                [key: string]: string // label: property
            }
        }
    }
}

export interface CasparCGMixerGeometry extends MixerProtocolGeneric {
    studio: string
    leadingZeros: boolean
    pingTime: number
    fromMixer: {
        // CHANNEL_FADER_LEVEL: ChannelLayerPair[],
        // CHANNEL_OUT_GAIN: ChannelLayerPair[],
        CHANNEL_VU: Array<string[]>
    }
    toMixer: {
        PGM_CHANNEL_FADER_LEVEL: Array<CasparCGChannelLayerPair[]>
        PFL_AUX_FADER_LEVEL: Array<CasparCGChannelLayerPair[]>
        NEXT_AUX_FADER_LEVEL: Array<CasparCGChannelLayerPair[]>
        CHANNEL_INPUT_SELECTOR?: Array<MixerMessageProtocol>
    }
    channelLabels?: string[]
    sourceOptions?: {
        sources: Array<
            CasparCGChannelLayerPair & {
                producer: string
                file: string
            }
        >
        options: {
            [key: string]: {
                // producer property invocation
                [key: string]: string // label: property
            }
        }
    }
}
