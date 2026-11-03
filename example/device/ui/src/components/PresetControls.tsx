import { useEffect, useState } from 'react'

interface PresetControlsProps {
    onLoadPreset: (presetName: string) => void
}

export function PresetControls({ onLoadPreset }: PresetControlsProps) {
    const [presets, setPresets] = useState<string[]>([])
    const [selectedPreset, setSelectedPreset] = useState('')

    useEffect(() => {
        let cancelled = false

        fetch('/presets')
            .then((response) => response.json())
            .then((data: { presets?: string[] }) => {
                if (cancelled) {
                    return
                }
                const names = data.presets ?? []
                setPresets(names)
                setSelectedPreset(names[0] ?? '')
            })
            .catch(() => {
                if (!cancelled) {
                    setPresets([])
                    setSelectedPreset('')
                }
            })

        return () => {
            cancelled = true
        }
    }, [])

    if (presets.length === 0) {
        return null
    }

    return (
        <div className="preset-controls">
            <label className="preset-label" htmlFor="preset-select">
                Preset
            </label>
            <select
                id="preset-select"
                className="preset-select"
                value={selectedPreset}
                onChange={(event) => setSelectedPreset(event.target.value)}
            >
                {presets.map((preset) => (
                    <option key={preset} value={preset}>
                        {preset}
                    </option>
                ))}
            </select>
            <button
                type="button"
                className="preset-button"
                disabled={!selectedPreset}
                onClick={() => onLoadPreset(selectedPreset)}
            >
                Load preset
            </button>
        </div>
    )
}
