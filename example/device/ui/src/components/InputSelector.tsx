interface InputSelectorProps {
    selected: number
    count: number
    onSelect: (selected: number) => void
}

export function InputSelector({
    selected,
    count,
    onSelect,
}: InputSelectorProps) {
    return (
        <div className="input-selector">
            <div className="block-label">In</div>
            <div className="input-selector-buttons">
                {Array.from({ length: count }, (_, index) => {
                    const value = index + 1
                    return (
                        <button
                            key={value}
                            type="button"
                            className={`input-selector-button ${selected === value ? 'active' : ''}`}
                            onClick={() => onSelect(value)}
                        >
                            {value}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
