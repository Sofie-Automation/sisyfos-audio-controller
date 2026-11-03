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

export function createDefaultFx(): number[] {
    return Array.from({ length: FX_PARAM_COUNT }, () => 0)
}

export function isValidFxParam(value: number): value is FxParam {
    return Number.isInteger(value) && value >= 0 && value < FX_PARAM_COUNT
}

export function fxParamName(fxParam: number): string {
    return FX_PARAM_LABELS[fxParam as FxParam] ?? `Fx${fxParam}`
}
