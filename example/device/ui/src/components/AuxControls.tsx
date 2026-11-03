import { VerticalFaderModule } from './VerticalFaderModule'

interface AuxControlsProps {
    auxLevels: number[]
    onAuxChange: (auxIndex: number, level: number) => void
}

export function AuxControls({ auxLevels, onAuxChange }: AuxControlsProps) {
    return (
        <div className="module-group aux-group">
            <div className="module-group-label">Aux</div>
            <div className="module-group-row">
                {auxLevels.map((level, auxIndex) => (
                    <VerticalFaderModule
                        key={auxIndex}
                        label={`${auxIndex + 1}`}
                        value={level}
                        accent="#c084fc"
                        onChange={(value) => onAuxChange(auxIndex, value)}
                    />
                ))}
            </div>
        </div>
    )
}
