import { ChannelStrip } from './components/ChannelStrip'
import { ConnectionStatus } from './components/ConnectionStatus'
import { MessageLog } from './components/MessageLog'
import { PresetControls } from './components/PresetControls'
import { useDeviceSocket } from './hooks/useDeviceSocket'

export function App() {
    const {
        connected,
        sisyfosConnected,
        sisyfosClients,
        inputSelectorCount,
        channels,
        vuLevels,
        logEntries,
        lastUpdated,
        sendCommand,
        resetAll,
        loadPreset,
    } = useDeviceSocket()

    return (
        <div className="app">
            <header className="header">
                <h1>Sisyfos Mock Device</h1>
                <ConnectionStatus
                    uiConnected={connected}
                    sisyfosConnected={sisyfosConnected}
                    sisyfosClients={sisyfosClients}
                    channelCount={channels.length}
                />
                <div className="header-actions">
                    <PresetControls onLoadPreset={loadPreset} />
                    <button
                        type="button"
                        className="reset-button"
                        onClick={resetAll}
                    >
                        Reset all
                    </button>
                </div>
            </header>

            <section
                className="strips"
                style={{
                    gridTemplateColumns: `repeat(${channels.length}, minmax(0, 1fr))`,
                }}
            >
                {channels.map((channel) => (
                    <ChannelStrip
                        key={channel.index}
                        channel={channel}
                        vuLevel={vuLevels[channel.index] ?? 0}
                        lastUpdated={lastUpdated[channel.index]}
                        onFaderChange={(index, level) =>
                            sendCommand(
                                {
                                    type: 'setFaderLevel',
                                    channel: index,
                                    level,
                                },
                                true
                            )
                        }
                        inputSelectorCount={inputSelectorCount}
                        onInputGainChange={(index, level) =>
                            sendCommand(
                                { type: 'setInputGain', channel: index, level },
                                true
                            )
                        }
                        onInputSelectorChange={(index, selected) =>
                            sendCommand(
                                {
                                    type: 'setInputSelector',
                                    channel: index,
                                    selected,
                                },
                                true
                            )
                        }
                        onMuteToggle={(index, mute) =>
                            sendCommand(
                                { type: 'setMute', channel: index, mute },
                                true
                            )
                        }
                        onPflToggle={(index, pfl) =>
                            sendCommand(
                                { type: 'setPfl', channel: index, pfl },
                                true
                            )
                        }
                        onAmixToggle={(index, amixOn) =>
                            sendCommand(
                                { type: 'setAMix', channel: index, amixOn },
                                true
                            )
                        }
                        onNameCommit={(index, name) =>
                            sendCommand(
                                {
                                    type: 'setChannelName',
                                    channel: index,
                                    name,
                                },
                                true
                            )
                        }
                        onFxChange={(index, fxParam, level) =>
                            sendCommand(
                                {
                                    type: 'setFx',
                                    channel: index,
                                    fxParam,
                                    level,
                                },
                                true
                            )
                        }
                        onAuxChange={(index, auxIndex, level) =>
                            sendCommand(
                                {
                                    type: 'setAuxLevel',
                                    channel: index,
                                    auxIndex,
                                    level,
                                },
                                true
                            )
                        }
                    />
                ))}
            </section>

            <MessageLog entries={logEntries} />
        </div>
    )
}
