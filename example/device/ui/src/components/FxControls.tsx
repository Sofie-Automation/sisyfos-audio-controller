import { COMP_PARAMS, EQ_BANDS, FxParam } from '../constants/fxParams'
import {
    CompParamModule,
    EqBand,
    VerticalFaderModule,
} from './VerticalFaderModule'

interface FxControlsProps {
    fx: number[]
    onFxChange: (fxParam: FxParam, level: number) => void
}

export function FxControls({ fx, onFxChange }: FxControlsProps) {
    const compOn = (fx[FxParam.CompOnOff] ?? 0) >= 0.5

    return (
        <>
            <div className="module-group eq-group">
                <div className="module-group-label">EQ</div>
                <div className="module-group-row eq-row">
                    <div className="eq-row-labels" aria-hidden="true">
                        <span className="eq-row-label-spacer" />
                        <span className="eq-sub-label">F</span>
                        <span className="eq-sub-label">Q</span>
                    </div>
                    {EQ_BANDS.map((band) => (
                        <EqBand
                            key={band.label}
                            label={band.label}
                            gain={fx[band.gain] ?? 0}
                            freq={fx[band.freq] ?? 0}
                            q={fx[band.q] ?? 0}
                            onGainChange={(level) =>
                                onFxChange(band.gain, level)
                            }
                            onFreqChange={(level) =>
                                onFxChange(band.freq, level)
                            }
                            onQChange={(level) => onFxChange(band.q, level)}
                        />
                    ))}
                </div>
            </div>

            <div className="module-group dly-group">
                <div className="module-group-label">Dly / Trim</div>
                <div className="module-group-row dly-row">
                    <VerticalFaderModule
                        label="Dly"
                        value={fx[FxParam.DelayTime] ?? 0}
                        accent="#a78bfa"
                        onChange={(level) =>
                            onFxChange(FxParam.DelayTime, level)
                        }
                    />
                    <VerticalFaderModule
                        label="Trim"
                        value={fx[FxParam.GainTrim] ?? 0}
                        accent="#34d399"
                        onChange={(level) =>
                            onFxChange(FxParam.GainTrim, level)
                        }
                    />
                </div>
            </div>

            <div className="module-group comp-group">
                <div className="module-group-head">
                    <span className="module-group-label">Comp</span>
                    <button
                        type="button"
                        className={`comp-toggle ${compOn ? 'active' : ''}`}
                        onClick={() =>
                            onFxChange(FxParam.CompOnOff, compOn ? 0 : 1)
                        }
                    >
                        ON
                    </button>
                </div>
                <div className="module-group-row">
                    {COMP_PARAMS.map((fxParam) => (
                        <CompParamModule
                            key={fxParam}
                            fxParam={fxParam}
                            value={fx[fxParam] ?? 0}
                            onChange={(level) => onFxChange(fxParam, level)}
                        />
                    ))}
                </div>
            </div>
        </>
    )
}
