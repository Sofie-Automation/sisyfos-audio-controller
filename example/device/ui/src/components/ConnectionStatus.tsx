interface ConnectionStatusProps {
    uiConnected: boolean
    sisyfosConnected: boolean
    sisyfosClients: number
    channelCount: number
}

export function ConnectionStatus({
    uiConnected,
    sisyfosConnected,
    sisyfosClients,
    channelCount,
}: ConnectionStatusProps) {
    return (
        <div className="status-bar">
            <div className="status-item">
                <span
                    className={`status-dot ${uiConnected ? 'online' : 'offline'}`}
                />
                <span>UI {uiConnected ? 'Connected' : 'Disconnected'}</span>
            </div>
            <div className="status-item">
                <span
                    className={`status-dot ${sisyfosConnected ? 'online' : 'offline'}`}
                />
                <span>
                    Sisyfos {sisyfosConnected ? 'Connected' : 'Disconnected'}
                    {sisyfosClients > 1 ? ` (${sisyfosClients})` : ''}
                </span>
            </div>
            <span>{channelCount} channels</span>
        </div>
    )
}
