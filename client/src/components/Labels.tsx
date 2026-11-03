import React, { ChangeEvent } from 'react'

import '../assets/css/LabelSettings.css'
import { Dispatch, Store } from 'redux'
import { connect } from 'react-redux'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Fader } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    SOCKET_FLUSH_LABELS,
    SOCKET_SET_LABELS,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { CustomPages } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getChannelLabel } from '../utils/labels'

import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    ChannelActions,
    ChannelActionTypes,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

interface LabelSettingsInjectProps {
    customPages: CustomPages[]
    fader: Fader[]
}

class LabelSettings extends React.PureComponent<
    LabelSettingsInjectProps & Store
> {
    state = {
        mutations: {} as Record<string, string>,
    }
    dispatch: Dispatch<ChannelActions> = this.props.dispatch

    constructor(props: any) {
        super(props)
    }

    componentDidMount() {
        this.setState({ label: this.props.customPages[0].label })
    }

    handleLabel = (event: ChangeEvent<HTMLInputElement>, index: number) => {
        console.log(event.target.value, index)
        this.setState({
            mutations: { ...this.state.mutations, [index]: event.target.value },
        })
    }

    handleClearLabels() {
        if (window.confirm('Clear all user defined labels?')) {
            const faders = this.props.fader
                .map((f, i) => ({ label: f.userLabel, i }))
                .filter((f) => f.label)
                .reduce(
                    (a, b) => ({ ...a, [b.i]: '' }),
                    {} as Record<string, string>
                )

            this.props.dispatch({
                type: FaderActionTypes.UPDATE_LABEL_LIST,
                update: faders,
            })
            this.props.dispatch({
                type: SettingsActionTypes.TOGGLE_SHOW_LABEL_SETTINGS,
            })
            window.socketIoClient.emit(SOCKET_SET_LABELS, { update: faders })
        }
    }

    handleFlushLabels() {
        if (
            window.confirm(
                'Flush all external (automation and channel) labels?'
            )
        ) {
            this.props.dispatch({ type: FaderActionTypes.FLUSH_FADER_LABELS })
            this.props.dispatch({
                type: ChannelActionTypes.FLUSH_CHANNEL_LABELS,
            })
            window.socketIoClient.emit(SOCKET_FLUSH_LABELS)
        }
    }

    handleClose = () => {
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_LABEL_SETTINGS,
        })
    }

    handleCancel = () => {
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_LABEL_SETTINGS,
        })
    }

    handleSave = () => {
        this.props.dispatch({
            type: FaderActionTypes.UPDATE_LABEL_LIST,
            update: this.state.mutations,
        })
        this.props.dispatch({
            type: SettingsActionTypes.TOGGLE_SHOW_LABEL_SETTINGS,
        })
        window.socketIoClient.emit(SOCKET_SET_LABELS, {
            update: this.state.mutations,
        })
    }

    renderLabelList() {
        return (
            <div>
                {this.props.fader.map((fader: Fader, index: number) => {
                    const faderLabel = fader.label || '-'
                    const channelLabel =
                        getChannelLabel(window.reduxState, index) || '-'
                    const mutated = this.state.mutations[index]

                    return (
                        <React.Fragment>
                            <label className="settings-input-field">
                                {`Fader ${
                                    index + 1
                                } (${faderLabel}/${channelLabel}) : `}
                                <input
                                    name="fadeTime"
                                    type="text"
                                    value={mutated ?? fader.userLabel}
                                    onChange={(ev) =>
                                        this.handleLabel(ev, index)
                                    }
                                />
                            </label>
                            <br />
                        </React.Fragment>
                    )
                })}
            </div>
        )
    }

    render() {
        return (
            <div className="label-settings-body">
                <h2>CUSTOM LABELS</h2>
                <button className="close" onClick={() => this.handleClose()}>
                    X
                </button>
                {this.renderLabelList()}
                <button
                    className="button"
                    onClick={() => this.handleFlushLabels()}
                >
                    FLUSH EXTERNAL
                </button>
                <button
                    className="button"
                    onClick={() => this.handleClearLabels()}
                >
                    CLEAR ALL
                </button>
                <br />
                <button
                    className="settings-cancel-button"
                    onClick={() => {
                        this.handleCancel()
                    }}
                >
                    CANCEL
                </button>
                <button
                    className="settings-save-button"
                    onClick={() => {
                        this.handleSave()
                    }}
                >
                    SAVE LABELS
                </button>
            </div>
        )
    }
}

const mapStateToProps = (state: any, props: any): LabelSettingsInjectProps => {
    return {
        customPages: state.settings[0].customPages,
        fader: state.faders[0].fader,
    }
}

export default connect<any, LabelSettingsInjectProps>(mapStateToProps)(
    LabelSettings
) as any
