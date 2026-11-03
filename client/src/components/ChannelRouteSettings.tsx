import React from 'react'
import ClassNames from 'classnames'

import '../assets/css/ChannelRouteSettings.css'
import { Store } from 'redux'
import { connect } from 'react-redux'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    SOCKET_ASSIGN_CH_TO_FADER,
    SOCKET_ASSIGN_ONE_TO_ONE,
    SOCKET_REMOVE_ALL_CH_ASSIGNMENTS,
    SOCKET_SET_LINK,
    SOCKET_SET_CAPABILITY,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { ChMixerConnection } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    ChannelReference,
    Fader,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getFaderLabel } from '../utils/labels'
import { RootState } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

interface ChannelSettingsInjectProps {
    label: string
    chMixerConnections: ChMixerConnection[]
    fader: Fader[]
}
interface ChannelRouteSettingsState {
    selectedFaderIndex: number
}

class ChannelRouteSettings extends React.PureComponent<
    ChannelSettingsInjectProps & Store,
    ChannelRouteSettingsState
> {
    constructor(props: any) {
        super(props)
        this.state = {
            selectedFaderIndex: props.faderIndex,
        }
    }

    handleAssignChannel(mixerIndex: number, channelIndex: number, event: any) {
        console.log('Bind/Unbind Channel')
        if (
            window.confirm(
                'Bind/Unbind Mixer ' +
                    String(mixerIndex + 1) +
                    ' Channel ' +
                    String(channelIndex + 1) +
                    ' from Fader ' +
                    String(this.state.selectedFaderIndex + 1)
            )
        ) {
            // Check if channel already is assigned to another fader and remove that binding prior to bind it to the new fader
            if (event.target.checked) {
                this.props.fader.forEach((fader: Fader, index: number) => {
                    if (
                        fader.assignedChannels?.some((assignedChan) => {
                            return (
                                assignedChan.mixerIndex === mixerIndex &&
                                assignedChan.channelIndex === channelIndex
                            )
                        })
                    ) {
                        window.socketIoClient.emit(SOCKET_ASSIGN_CH_TO_FADER, {
                            mixerIndex: mixerIndex,
                            channel: channelIndex,
                            faderIndex: index,
                            assigned: false,
                        })
                    }
                })
            }

            window.socketIoClient.emit(SOCKET_ASSIGN_CH_TO_FADER, {
                mixerIndex: mixerIndex,
                channel: channelIndex,
                faderIndex: this.state.selectedFaderIndex,
                assigned: event.target.checked,
            })
        }
    }

    handleClearAllRouting() {
        if (window.confirm('REMOVE ALL FADER ASSIGNMENTS????')) {
            window.socketIoClient.emit(SOCKET_REMOVE_ALL_CH_ASSIGNMENTS)
        }
    }

    handleOneToOneRouting() {
        if (window.confirm('Reassign all Faders 1:1 to Channels????')) {
            window.socketIoClient.emit(SOCKET_ASSIGN_ONE_TO_ONE)
        }
    }

    handleClose = () => {
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_OPTION,
            channel: this.state.selectedFaderIndex,
        })
    }

    handleFaderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
        const newFaderIndex = parseInt(event.target.value)
        this.setState({ selectedFaderIndex: newFaderIndex })
    }

    renderFaderSelector() {
        return (
            <select
                value={this.state.selectedFaderIndex}
                title="Select the fader to configure the channel routing for"
                onChange={this.handleFaderChange}
                className="channel-route-selector"
            >
                {this.props.fader.map((fader, index) => (
                    <option key={index} value={index}>
                        {getFaderLabel(index, 'FADER')}
                    </option>
                ))}
            </select>
        )
    }

    getAssignedToFaderIndex = (channel: ChannelReference): number => {
        let assignedFaderIndex = -1
        this.props.fader.forEach((fader, index: number) => {
            if (
                fader.assignedChannels?.some(
                    (assignedChan: ChannelReference) => {
                        return (
                            assignedChan.channelIndex ===
                                channel.channelIndex &&
                            assignedChan.mixerIndex === channel.mixerIndex
                        )
                    }
                )
            )
                assignedFaderIndex = index
        })
        return assignedFaderIndex
    }

    renderChannels(chMixerConnection: ChMixerConnection, mixerIndex: number) {
        let previousChannelType: number | null = null

        return chMixerConnection.channel.map((channel, index) => {
            const assignedFaderIndex = this.getAssignedToFaderIndex({
                mixerIndex: mixerIndex,
                channelIndex: index,
            })

            // Compare with previous channel type before updating it
            const showChannelType = previousChannelType !== channel.channelType
            previousChannelType = channel.channelType

            return (
                <React.Fragment key={index}>
                    {showChannelType && (
                        <p className="channel-type-name">
                            {
                                window.mixerProtocol.channelTypes[
                                    channel.channelType
                                ].channelTypeName
                            }
                        </p>
                    )}
                    <div
                        className={ClassNames('channel-route-text', {
                            checked:
                                assignedFaderIndex ===
                                this.state.selectedFaderIndex,
                        })}
                    >
                        {' Channel ' + (index + 1) + ' : '}
                        <input
                            title="Bind/Unbind Channel"
                            type="checkbox"
                            checked={
                                assignedFaderIndex ===
                                this.state.selectedFaderIndex
                            }
                            onChange={(event) =>
                                this.handleAssignChannel(
                                    mixerIndex,
                                    index,
                                    event
                                )
                            }
                        />
                        {assignedFaderIndex >= 0
                            ? '   (' +
                              getFaderLabel(assignedFaderIndex, 'FADER') +
                              ')'
                            : ' (not assigned)'}
                    </div>
                </React.Fragment>
            )
        })
    }

    handleSetCapability(
        capability: 'isLinkablePrimary' | 'isLinkableSecondary',
        enabled: boolean
    ) {
        const faderIndex = this.state.selectedFaderIndex
        const fader = this.props.fader[faderIndex]
        // If disabling primary while currently linked, unlink first
        if (capability === 'isLinkablePrimary' && !enabled && fader?.isLinked) {
            window.socketIoClient.emit(SOCKET_SET_LINK, {
                faderIndex,
                linkOn: false,
            })
        }
        window.socketIoClient.emit(SOCKET_SET_CAPABILITY, {
            faderIndex,
            capability,
            enabled,
        })
        // Capabilities are mutually exclusive
        if (enabled) {
            const other =
                capability === 'isLinkablePrimary'
                    ? 'isLinkableSecondary'
                    : 'isLinkablePrimary'
            window.socketIoClient.emit(SOCKET_SET_CAPABILITY, {
                faderIndex,
                capability: other,
                enabled: false,
            })
        }
    }

    renderLinkability() {
        const fader = this.props.fader[this.state.selectedFaderIndex]
        if (!fader) return null
        const isPrimary = !!fader.capabilities?.isLinkablePrimary
        const isSecondary = !!fader.capabilities?.isLinkableSecondary
        return (
            <div className="channel-route-linkability">
                <p className="channel-route-mixer-name">LINKABILITY</p>
                <label className="channel-route-text">
                    <input
                        type="checkbox"
                        checked={isPrimary}
                        onChange={(e) =>
                            this.handleSetCapability(
                                'isLinkablePrimary',
                                e.target.checked
                            )
                        }
                    />
                    {' Primary (controls linked secondary)'}
                </label>
                <label className="channel-route-text">
                    <input
                        type="checkbox"
                        checked={isSecondary}
                        onChange={(e) =>
                            this.handleSetCapability(
                                'isLinkableSecondary',
                                e.target.checked
                            )
                        }
                    />
                    {' Secondary (follows primary)'}
                </label>
                {isPrimary && (
                    <label className="channel-route-text">
                        <input
                            type="checkbox"
                            checked={!!fader.isLinked}
                            onChange={(e) =>
                                window.socketIoClient.emit(SOCKET_SET_LINK, {
                                    faderIndex: this.state.selectedFaderIndex,
                                    linkOn: e.target.checked,
                                })
                            }
                        />
                        {' Linked'}
                    </label>
                )}
            </div>
        )
    }

    renderMixer(chMixerConnection: ChMixerConnection, mixerIndex: number) {
        return (
            <div>
                <p className="channel-route-mixer-name">
                    {' '}
                    {'MIXER ' + (mixerIndex + 1)}
                </p>
                {this.renderChannels(chMixerConnection, mixerIndex)}
            </div>
        )
    }

    render() {
        return (
            <div className="channel-route-body">
                <div className="channel-route-header">
                    {this.renderFaderSelector()}
                </div>
                <button className="close" onClick={() => this.handleClose()}>
                    X
                </button>
                <button
                    className="button"
                    onClick={() => this.handleClearAllRouting()}
                >
                    CLEAR ALL
                </button>
                <button
                    className="button"
                    onClick={() => this.handleOneToOneRouting()}
                >
                    ROUTE 1.Mixer 1:1
                </button>
                <hr />
                {this.renderLinkability()}
                <hr />
                {this.props.chMixerConnections.map(
                    (
                        chMixerConnection: ChMixerConnection,
                        mixerIndex: number
                    ) => this.renderMixer(chMixerConnection, mixerIndex)
                )}
            </div>
        )
    }
}

const mapStateToProps = (
    state: RootState,
    props: any
): ChannelSettingsInjectProps => {
    return {
        label: getFaderLabel(props.faderIndex, 'FADER'),
        chMixerConnections: state.channels[0].chMixerConnection,
        fader: state.faders[0].fader,
    }
}

export default connect<any, ChannelSettingsInjectProps>(mapStateToProps)(
    ChannelRouteSettings
) as any
