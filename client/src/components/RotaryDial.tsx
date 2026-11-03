import { useMemo, useRef, useState } from 'react'
import React from 'react'
import '../assets/css/RotaryDial.css'
import { throttle } from 'lodash'

function clampValue(value: number) {
    return value > 1 ? 1 : value < 0 ? 0 : value
}

export const RotaryDial = ({
    value,
    onChange,
}: {
    value: number
    onChange: (value: number) => void
}) => {
    const startYRef = useRef<number | null>(null)
    const initialValueRef = useRef<number>(0)
    const [rotatingValue, setRotatingValue] = useState<number | null>(null)

    const throttledOnChange = useMemo(() => {
        return throttle(onChange, 50, {
            trailing: true,
        })
    }, [onChange])

    const onMouseDown = (e: React.MouseEvent) => {
        startYRef.current = e.clientY
        initialValueRef.current = value
        setRotatingValue(value)
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)
    }

    const onMouseMove = (e: MouseEvent) => {
        if (startYRef.current !== null) {
            const deltaY = (e.clientY - startYRef.current) / 360
            const newValue = clampValue(initialValueRef.current - deltaY)
            throttledOnChange(newValue)
            setRotatingValue(newValue)
        }
    }

    const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        startYRef.current = null
        setRotatingValue(null)
    }

    const onTouchStart = (e: React.TouchEvent) => {
        startYRef.current = e.touches[0].clientY
        initialValueRef.current = value
        setRotatingValue(value)
        document.addEventListener('touchmove', onTouchMove)
        document.addEventListener('touchend', onTouchEnd)
    }

    const onTouchMove = (e: TouchEvent) => {
        if (startYRef.current !== null) {
            const deltaY = (e.touches[0].clientY - startYRef.current) / 360
            const newValue = clampValue(initialValueRef.current - deltaY)
            throttledOnChange(newValue)
            setRotatingValue(newValue)
        }
    }

    const onTouchEnd = () => {
        document.removeEventListener('touchmove', onTouchMove)
        document.removeEventListener('touchend', onTouchEnd)
        startYRef.current = null
        setRotatingValue(null)
    }

    return (
        <div className="rotary-dial-wrapper">
            <div
                className="rotary-dial"
                style={{
                    transform: `rotate(${(rotatingValue ?? value) * 300 - 150}deg)`,
                }}
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
            >
                <div className="rotary-dial-indicator"></div>
            </div>
        </div>
    )
}
