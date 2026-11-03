import { useEffect, useState } from 'react'
import { FxParam } from '../constants/fxParams'
import { ChannelState } from '../types'
import { AuxControls } from './AuxControls'
import { FxControls } from './FxControls'
import { InputSelector } from './InputSelector'
import { VerticalFaderModule } from './VerticalFaderModule'

interface ChannelStripProps {
    channel: ChannelState
    vuLevel?: number
    lastUpdated?: Date
    onFaderChange: (channel: number, level: number) => void
    onInputGainChange: (channel: number, level: number) => void
    onInputSelectorChange: (channel: number, selected: number) => void
    inputSelectorCount: number
    onMuteToggle: (channel: number, mute: boolean) => void
    onPflToggle: (channel: number, pfl: boolean) => void
    onAmixToggle: (channel: number, amixOn: boolean) => void
    onNameCommit: (channel: number, name: string) => void
    onFxChange: (channel: number, fxParam: FxParam, level: number) => void
    onAuxChange: (channel: number, auxIndex: number, level: number) => void
}

export function ChannelStrip({
    channel,
    vuLevel = 0,
    lastUpdated,
    onFaderChange,
    onInputGainChange,
    onInputSelectorChange,
    inputSelectorCount,
    onMuteToggle,
    onPflToggle,
    onAmixToggle,
    onNameCommit,
    onFxChange,
    onAuxChange,
}: ChannelStripProps) {
    const [nameDraft, setNameDraft] = useState(channel.name)

    useEffect(() => {
        setNameDraft(channel.name)
    }, [channel.name])

    return (
        <div className="channel-strip">
            <div className="strip-head">
                <span className="ch-index">CH{channel.index + 1}</span>
                <input
                    className="channel-name"
                    value={nameDraft}
                    onChange={(event) => setNameDraft(event.target.value)}
                    onBlur={() => {
                        const trimmed = nameDraft.trim()
                        if (trimmed && trimmed !== channel.name) {
                            onNameCommit(channel.index, trimmed)
                        } else {
                            setNameDraft(channel.name)
                        }
                    }}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.currentTarget.blur()
                        }
                    }}
                    aria-label={`Channel ${channel.index + 1} name`}
                />
            </div>

            <div className="strip-body">
                <div className="strip-row strip-row-core">
                    <VerticalFaderModule label="VU" value={vuLevel} readOnly />
                    <VerticalFaderModule
                        label="FDR"
                        value={channel.faderLevel}
                        accent="#60a5fa"
                        onChange={(level) =>
                            onFaderChange(channel.index, level)
                        }
                    />
                    <VerticalFaderModule
                        label="GN"
                        value={channel.inputGain}
                        accent="#34d399"
                        onChange={(level) =>
                            onInputGainChange(channel.index, level)
                        }
                    />
                    <div className="side-panel">
                        <InputSelector
                            selected={channel.inputSelector}
                            count={inputSelectorCount}
                            onSelect={(selected) =>
                                onInputSelectorChange(channel.index, selected)
                            }
                        />
                        <div className="toggle-row">
                            <button
                                type="button"
                                className={`toggle ${channel.mute ? 'active danger' : ''}`}
                                onClick={() =>
                                    onMuteToggle(channel.index, !channel.mute)
                                }
                            >
                                M
                            </button>
                            <button
                                type="button"
                                className={`toggle ${channel.pfl ? 'active' : ''}`}
                                onClick={() =>
                                    onPflToggle(channel.index, !channel.pfl)
                                }
                            >
                                P
                            </button>
                            <button
                                type="button"
                                className={`toggle ${channel.amixOn ? 'active' : ''}`}
                                onClick={() =>
                                    onAmixToggle(channel.index, !channel.amixOn)
                                }
                                title="A-Mix"
                            >
                                A
                            </button>
                        </div>
                    </div>
                    <VerticalFaderModule
                        label="Nx"
                        value={channel.nextAuxLevel}
                        accent="#a78bfa"
                        readOnly
                    />
                </div>

                <AuxControls
                    auxLevels={channel.auxLevels}
                    onAuxChange={(auxIndex, level) =>
                        onAuxChange(channel.index, auxIndex, level)
                    }
                />

                <FxControls
                    fx={channel.fx}
                    onFxChange={(fxParam, level) =>
                        onFxChange(channel.index, fxParam, level)
                    }
                />
            </div>

            <div className="last-updated">
                {lastUpdated ? lastUpdated.toLocaleTimeString() : '—'}
            </div>
        </div>
    )
}
