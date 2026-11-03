import React from 'react'
import { useDragSort } from '../hooks/useDragSort'
import { getFaderLabel } from '../utils/labels'

interface Props {
    faderIndices: number[]
    totalFaders: number
    scrollContainerRef: React.RefObject<HTMLElement>
    onReorder: (newFaders: number[]) => void
    onRemove: (faderIndex: number) => void
    onAdd: (faderIndex: number) => void
    onSort: () => void
    onClear: () => void
}

export function SortableFaderList({
    faderIndices,
    totalFaders,
    scrollContainerRef,
    onReorder,
    onRemove,
    onAdd,
    onSort,
    onClear,
}: Props) {
    const handleReorder = (from: number, insertAt: number) => {
        const next = [...faderIndices]
        const [moved] = next.splice(from, 1)
        next.splice(insertAt, 0, moved)
        onReorder(next)
    }

    const { dragOverIndex, listRef, getDragProps, getEndSentinelProps } =
        useDragSort({
            scrollContainerRef,
            onReorder: handleReorder,
        })

    return (
        <div ref={listRef}>
            <div className="pages-settings-section-header">
                ASSIGNED — in display order
            </div>

            {faderIndices.length === 0 && (
                <div className="pages-settings-empty">No faders assigned</div>
            )}

            {faderIndices.map((faderIndex, pos) => (
                <div
                    key={faderIndex}
                    className={
                        'pages-settings-assigned-fader' +
                        (dragOverIndex === pos ? ' drag-over' : '')
                    }
                    {...getDragProps(pos)}
                >
                    <span
                        className="pages-settings-drag-handle"
                        title="Drag to reorder"
                    >
                        ⠿
                    </span>
                    <span className="pages-settings-fader-label">
                        {`Fader ${faderIndex + 1} — ${getFaderLabel(faderIndex)}`}
                    </span>
                    <button
                        className="pages-settings-remove-btn"
                        onClick={() => onRemove(faderIndex)}
                        title="Remove from page"
                    >
                        ×
                    </button>
                </div>
            ))}

            <div
                className={
                    'pages-settings-drop-sentinel' +
                    (dragOverIndex === faderIndices.length ? ' drag-over' : '')
                }
                {...getEndSentinelProps(faderIndices.length)}
            />

            <div className="pages-settings-action-row">
                {faderIndices.length > 1 && (
                    <button
                        className="pages-settings-sort-btn"
                        onClick={onSort}
                        title="Sort by fader number"
                    >
                        SORT BY #
                    </button>
                )}
                <button className="button" onClick={onClear}>
                    CLEAR ALL
                </button>
            </div>

            <div className="pages-settings-section-header">AVAILABLE</div>

            {Array.from({ length: totalFaders }, (_, faderIndex) => {
                if (faderIndices.includes(faderIndex)) return null
                return (
                    <div
                        key={faderIndex}
                        className="pages-settings-available-fader"
                    >
                        <span className="pages-settings-fader-label">
                            {`Fader ${faderIndex + 1} — ${getFaderLabel(faderIndex)}`}
                        </span>
                        <button
                            className="pages-settings-add-btn"
                            onClick={() => onAdd(faderIndex)}
                            title="Add to page"
                        >
                            +
                        </button>
                    </div>
                )
            })}
        </div>
    )
}
