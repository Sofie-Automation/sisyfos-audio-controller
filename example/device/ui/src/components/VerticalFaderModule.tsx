import { FX_PARAM_LABELS, FxParam } from '../constants/fxParams'

function clampLevel(value: number): number {
    return Math.min(1, Math.max(0, value))
}

function toPercent(level: number): number {
    return Math.round(clampLevel(level) * 100)
}

interface VerticalFaderModuleProps {
    label: string
    value: number
    onChange?: (value: number) => void
    accent?: string
    readOnly?: boolean
    showNumber?: boolean
}

export function VerticalFaderModule({
    label,
    value,
    onChange,
    accent = '#818cf8',
    readOnly = false,
    showNumber = true,
}: VerticalFaderModuleProps) {
    const percent = toPercent(value)

    return (
        <div className="fader-module">
            <span className="fader-module-label">{label}</span>
            {readOnly ? (
                <div className="fader-module-track">
                    <div
                        className="fader-module-fill vu"
                        style={{ height: `${percent}%` }}
                    />
                </div>
            ) : (
                <input
                    type="range"
                    min={0}
                    max={100}
                    value={percent}
                    className="fader-module-slider"
                    style={{ accentColor: accent }}
                    onChange={(event) =>
                        onChange?.(Number(event.target.value) / 100)
                    }
                />
            )}
            {showNumber ? (
                readOnly ? (
                    <span className="fader-module-readout">{percent}</span>
                ) : (
                    <input
                        type="number"
                        min={0}
                        max={100}
                        value={percent}
                        className="num-input"
                        onChange={(event) => {
                            const parsed = Number.parseInt(
                                event.target.value,
                                10
                            )
                            if (!Number.isNaN(parsed)) {
                                onChange?.(clampLevel(parsed / 100))
                            }
                        }}
                    />
                )
            ) : null}
        </div>
    )
}

interface EqBandProps {
    label: string
    gain: number
    freq: number
    q: number
    onGainChange: (value: number) => void
    onFreqChange: (value: number) => void
    onQChange: (value: number) => void
}

export function EqBand({
    label,
    gain,
    freq,
    q,
    onGainChange,
    onFreqChange,
    onQChange,
}: EqBandProps) {
    const freqPercent = toPercent(freq)
    const qPercent = toPercent(q)

    return (
        <div className="eq-band">
            <VerticalFaderModule
                label={label}
                value={gain}
                accent="#818cf8"
                onChange={onGainChange}
                showNumber={false}
            />
            <input
                type="number"
                min={0}
                max={100}
                value={freqPercent}
                className="num-input"
                aria-label={`EQ${label} frequency`}
                title="Frequency"
                onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10)
                    if (!Number.isNaN(parsed)) {
                        onFreqChange(clampLevel(parsed / 100))
                    }
                }}
            />
            <input
                type="number"
                min={0}
                max={100}
                value={qPercent}
                className="num-input"
                aria-label={`EQ${label} Q`}
                title="Q"
                onChange={(event) => {
                    const parsed = Number.parseInt(event.target.value, 10)
                    if (!Number.isNaN(parsed)) {
                        onQChange(clampLevel(parsed / 100))
                    }
                }}
            />
        </div>
    )
}

interface CompParamProps {
    fxParam: FxParam
    value: number
    onChange: (value: number) => void
}

export function CompParamModule({ fxParam, value, onChange }: CompParamProps) {
    const short = FX_PARAM_LABELS[fxParam]
        .replace('Comp ', '')
        .replace('Makeup', 'Mkup')

    return (
        <VerticalFaderModule
            label={short}
            value={value}
            accent="#6366f1"
            onChange={onChange}
        />
    )
}

export { clampLevel, toPercent }
