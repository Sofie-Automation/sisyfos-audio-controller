import { useEffect, useRef } from 'react'
import { LogEntry } from '../types'

interface MessageLogProps {
    entries: LogEntry[]
}

export function MessageLog({ entries }: MessageLogProps) {
    const bodyRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const body = bodyRef.current
        if (body) {
            body.scrollTop = body.scrollHeight
        }
    }, [entries])

    return (
        <div className="message-log">
            <div className="message-log-header">
                Message log (last {entries.length})
            </div>
            <div className="message-log-body" ref={bodyRef}>
                {entries.length === 0 ? (
                    <div className="message-log-empty">No messages yet</div>
                ) : (
                    entries.map((entry, index) => (
                        <div
                            key={`${entry.timestamp.getTime()}-${index}`}
                            className={`log-line log-${entry.direction}`}
                        >
                            <span className="log-time">
                                {entry.timestamp.toLocaleTimeString()}
                            </span>
                            <span className="log-direction">
                                {entry.direction === 'in' ? '←' : '→'}
                            </span>
                            <code>{JSON.stringify(entry.message)}</code>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
