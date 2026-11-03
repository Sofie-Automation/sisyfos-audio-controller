import { useRef, useState, useCallback, useEffect } from 'react'

interface UseDragSortOptions {
    scrollContainerRef: React.RefObject<HTMLElement>
    onReorder: (fromIndex: number, toIndex: number) => void
}

interface UseDragSortResult {
    dragOverIndex: number | null
    listRef: React.RefObject<HTMLDivElement>
    getDragProps: (pos: number) => {
        'data-drag-pos': number
        draggable: true
        onDragStart: () => void
        onDragOver: (e: React.DragEvent) => void
        onDragLeave: () => void
        onDrop: () => void
        onDragEnd: () => void
        onTouchStart: () => void
        onTouchEnd: (e: React.TouchEvent) => void
    }
    getEndSentinelProps: (length: number) => {
        'data-drag-pos': number
        onDragOver: (e: React.DragEvent) => void
        onDragLeave: () => void
        onDrop: () => void
    }
}

export function useDragSort({
    scrollContainerRef,
    onReorder,
}: UseDragSortOptions): UseDragSortResult {
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
    const dragIndexRef = useRef<number | null>(null)
    const listRef = useRef<HTMLDivElement>(null)
    const scrollRafId = useRef<number | null>(null)
    const scrollSpeed = useRef(0)

    const startAutoScroll = useCallback(() => {
        if (scrollRafId.current !== null) return
        const tick = () => {
            const el = scrollContainerRef.current
            if (el && scrollSpeed.current !== 0) {
                el.scrollTop += scrollSpeed.current
            }
            scrollRafId.current = requestAnimationFrame(tick)
        }
        scrollRafId.current = requestAnimationFrame(tick)
    }, [scrollContainerRef])

    const stopAutoScroll = useCallback(() => {
        if (scrollRafId.current !== null) {
            cancelAnimationFrame(scrollRafId.current)
            scrollRafId.current = null
        }
        scrollSpeed.current = 0
    }, [])

    const updateAutoScroll = useCallback(
        (clientY: number) => {
            const el = scrollContainerRef.current
            if (!el) return
            const { top, bottom } = el.getBoundingClientRect()
            const zone = 60
            const maxSpeed = 12
            if (clientY < top + zone) {
                scrollSpeed.current = -maxSpeed * (1 - (clientY - top) / zone)
                startAutoScroll()
            } else if (clientY > bottom - zone) {
                scrollSpeed.current = maxSpeed * (1 - (bottom - clientY) / zone)
                startAutoScroll()
            } else {
                stopAutoScroll()
            }
        },
        [scrollContainerRef, startAutoScroll, stopAutoScroll]
    )

    const drop = useCallback(
        (pos: number) => {
            setDragOverIndex(null)
            if (dragIndexRef.current === null) return
            const from = dragIndexRef.current
            dragIndexRef.current = null
            if (from === pos) return
            const insertAt = from < pos ? pos - 1 : pos
            onReorder(from, insertAt)
        },
        [onReorder]
    )

    const handleDragStart = useCallback((pos: number) => {
        dragIndexRef.current = pos
    }, [])

    const handleDragOver = useCallback(
        (e: React.DragEvent, pos: number) => {
            e.preventDefault()
            updateAutoScroll(e.clientY)
            setDragOverIndex(pos)
        },
        [updateAutoScroll]
    )

    const handleDragLeave = useCallback(() => {
        setDragOverIndex(null)
    }, [])

    const handleDragEnd = useCallback(() => {
        dragIndexRef.current = null
        setDragOverIndex(null)
        stopAutoScroll()
    }, [stopAutoScroll])

    const handleTouchStart = useCallback((pos: number) => {
        dragIndexRef.current = pos
    }, [])

    const handleTouchMoveNonPassive = useCallback(
        (e: TouchEvent) => {
            if (dragIndexRef.current === null) return
            e.preventDefault()
            const touch = e.touches[0]
            updateAutoScroll(touch.clientY)
            const el = document.elementFromPoint(touch.clientX, touch.clientY)
            const row = el
                ? ((el as HTMLElement).closest(
                      '[data-drag-pos]'
                  ) as HTMLElement | null)
                : null
            const pos = row
                ? parseInt(row.getAttribute('data-drag-pos') ?? '', 10)
                : NaN
            setDragOverIndex(isNaN(pos) ? null : pos)
        },
        [updateAutoScroll]
    )

    const handleTouchEnd = useCallback(
        (e: React.TouchEvent) => {
            stopAutoScroll()
            const touch = e.changedTouches[0]
            const el = document.elementFromPoint(touch.clientX, touch.clientY)
            const row = el
                ? ((el as HTMLElement).closest(
                      '[data-drag-pos]'
                  ) as HTMLElement | null)
                : null
            const pos = row
                ? parseInt(row.getAttribute('data-drag-pos') ?? '', 10)
                : NaN
            if (!isNaN(pos)) {
                drop(pos)
            } else {
                dragIndexRef.current = null
                setDragOverIndex(null)
            }
        },
        [stopAutoScroll, drop]
    )

    useEffect(() => {
        const el = listRef.current
        if (!el) return
        el.addEventListener('touchmove', handleTouchMoveNonPassive, {
            passive: false,
        })
        return () => {
            el.removeEventListener('touchmove', handleTouchMoveNonPassive)
            stopAutoScroll()
        }
    }, [handleTouchMoveNonPassive, stopAutoScroll])

    const getDragProps = useCallback(
        (pos: number) => ({
            'data-drag-pos': pos,
            draggable: true as const,
            onDragStart: () => handleDragStart(pos),
            onDragOver: (e: React.DragEvent) => handleDragOver(e, pos),
            onDragLeave: handleDragLeave,
            onDrop: () => drop(pos),
            onDragEnd: handleDragEnd,
            onTouchStart: () => handleTouchStart(pos),
            onTouchEnd: (e: React.TouchEvent) => handleTouchEnd(e),
        }),
        [
            handleDragStart,
            handleDragOver,
            handleDragLeave,
            drop,
            handleDragEnd,
            handleTouchStart,
            handleTouchEnd,
        ]
    )

    const getEndSentinelProps = useCallback(
        (length: number) => ({
            'data-drag-pos': length,
            onDragOver: (e: React.DragEvent) => handleDragOver(e, length),
            onDragLeave: handleDragLeave,
            onDrop: () => drop(length),
        }),
        [handleDragOver, handleDragLeave, drop]
    )

    return { dragOverIndex, listRef, getDragProps, getEndSentinelProps }
}
