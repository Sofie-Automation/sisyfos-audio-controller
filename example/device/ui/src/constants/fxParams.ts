/** Mirrors Sisyfos shared/src/constants/MixerProtocolInterface.ts FxParam */
export enum FxParam {
    EqGain01 = 0,
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

export const FX_PARAM_COUNT = 22

export const FX_PARAM_SHORT_LABELS: Record<FxParam, string> = {
    [FxParam.EqGain01]: 'E1G',
    [FxParam.EqGain02]: 'E2G',
    [FxParam.EqGain03]: 'E3G',
    [FxParam.EqGain04]: 'E4G',
    [FxParam.EqFreq01]: 'E1F',
    [FxParam.EqFreq02]: 'E2F',
    [FxParam.EqFreq03]: 'E3F',
    [FxParam.EqFreq04]: 'E4F',
    [FxParam.EqQ01]: 'E1Q',
    [FxParam.EqQ02]: 'E2Q',
    [FxParam.EqQ03]: 'E3Q',
    [FxParam.EqQ04]: 'E4Q',
    [FxParam.DelayTime]: 'DLY',
    [FxParam.GainTrim]: 'TRM',
    [FxParam.CompThrs]: 'THR',
    [FxParam.CompRatio]: 'RAT',
    [FxParam.CompKnee]: 'KNE',
    [FxParam.CompMakeUp]: 'MKU',
    [FxParam.CompAttack]: 'ATK',
    [FxParam.CompHold]: 'HLD',
    [FxParam.CompRelease]: 'REL',
    [FxParam.CompOnOff]: 'CMP',
}

export const FX_PARAM_LABELS: Record<FxParam, string> = {
    [FxParam.EqGain01]: 'EQ1 Gain',
    [FxParam.EqGain02]: 'EQ2 Gain',
    [FxParam.EqGain03]: 'EQ3 Gain',
    [FxParam.EqGain04]: 'EQ4 Gain',
    [FxParam.EqFreq01]: 'EQ1 Freq',
    [FxParam.EqFreq02]: 'EQ2 Freq',
    [FxParam.EqFreq03]: 'EQ3 Freq',
    [FxParam.EqFreq04]: 'EQ4 Freq',
    [FxParam.EqQ01]: 'EQ1 Q',
    [FxParam.EqQ02]: 'EQ2 Q',
    [FxParam.EqQ03]: 'EQ3 Q',
    [FxParam.EqQ04]: 'EQ4 Q',
    [FxParam.DelayTime]: 'Delay',
    [FxParam.GainTrim]: 'Gain Trim',
    [FxParam.CompThrs]: 'Comp Thrs',
    [FxParam.CompRatio]: 'Comp Ratio',
    [FxParam.CompKnee]: 'Comp Knee',
    [FxParam.CompMakeUp]: 'Comp Makeup',
    [FxParam.CompAttack]: 'Comp Attack',
    [FxParam.CompHold]: 'Comp Hold',
    [FxParam.CompRelease]: 'Comp Release',
    [FxParam.CompOnOff]: 'Comp On',
}

export const EQ_BANDS = [
    {
        label: '1',
        gain: FxParam.EqGain01,
        freq: FxParam.EqFreq01,
        q: FxParam.EqQ01,
    },
    {
        label: '2',
        gain: FxParam.EqGain02,
        freq: FxParam.EqFreq02,
        q: FxParam.EqQ02,
    },
    {
        label: '3',
        gain: FxParam.EqGain03,
        freq: FxParam.EqFreq03,
        q: FxParam.EqQ03,
    },
    {
        label: '4',
        gain: FxParam.EqGain04,
        freq: FxParam.EqFreq04,
        q: FxParam.EqQ04,
    },
] as const

export const COMP_PARAMS = [
    FxParam.CompThrs,
    FxParam.CompRatio,
    FxParam.CompKnee,
    FxParam.CompMakeUp,
    FxParam.CompAttack,
    FxParam.CompHold,
    FxParam.CompRelease,
] as const

export function createDefaultFx(): number[] {
    return Array.from({ length: FX_PARAM_COUNT }, () => 0)
}
