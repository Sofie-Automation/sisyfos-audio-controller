import * as React from 'react'
import { connect } from 'react-redux'
import { compose } from 'redux'
import { ReduxStore } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

import '../assets/css/App.css'
import Channels from './Channels'
import Settings from './Settings'
import Storage from './RoutingStorage'
import MiniChannels from './MiniChannels'
import MicTally from './MicTally'
import { withTranslation } from 'react-i18next'
import PagesSettings from './PagesSettings'
import LabelSettings from './Labels'

export interface AppProps {
    store: ReduxStore
    t: any
}

class App extends React.Component<AppProps> {
    constructor(props: AppProps) {
        super(props)
    }

    componentWillMount() {
        console.log(
            'http args : ',
            window.location.search.includes('settings=1')
        )
        window.socketIoClient.emit(
            'get-mixerprotocol',
            'get selected mixerprotocol'
        )
        window.socketIoClient.emit('get-store', 'update local store')
        window.socketIoClient.emit('get-settings', 'update local settings')
        this.iFrameFocusHandler()
        this.contextMenuHandler()

        const urlParams = new URLSearchParams(window.location.search)
        const styleClass = urlParams.get('style')
        if (styleClass) {
            document.body.classList.add(styleClass)
        }
    }

    public shouldComponentUpdate(nextProps: AppProps): boolean {
        return (
            nextProps.store.settings[0].showSettings !=
                this.props.store.settings[0].showSettings ||
            nextProps.store.settings[0].showPagesSetup !=
                this.props.store.settings[0].showPagesSetup ||
            nextProps.store.settings[0].showLabelSettings !=
                this.props.store.settings[0].showLabelSettings ||
            nextProps.store.settings[0].serverOnline !=
                this.props.store.settings[0].serverOnline ||
            nextProps.store.settings[0].showStorage !=
                this.props.store.settings[0].showStorage
        )
    }

    sendSofieMessage(type: string, payload?: any | '', replyTo?: string | '') {
        window.top.postMessage(
            {
                id: Date.now().toString(),
                replyToId: replyTo,
                type: type,
                payload: payload,
            },
            '*'
        )
    }

    iFrameFocusHandler() {
        if (window.top !== window.self) {
            this.sendSofieMessage('hello')
            document.addEventListener(
                'click',
                (e) => {
                    e.preventDefault()
                    this.sendSofieMessage('focus_in')
                },
                true
            )
            window.addEventListener('message', (event) => {
                try {
                    const message = event.data
                    if (!message || !message.type) return
                    switch (message.type) {
                        case 'welcome':
                            console.log('Hosted by: ' + message.payload)
                            // finish three-way handshake
                            this.sendSofieMessage('ack', undefined, message.id)
                            break
                    }
                } catch (e) {
                    console.log('Error Sofie API')
                }
            })
        }
    }

    /**
     * disables context menu in order to enable multi touch support
     */
    contextMenuHandler() {
        document.addEventListener(
            'contextmenu',
            function (e) {
                e.preventDefault()
            },
            false
        )
    }

    render() {
        const urlParams = new URLSearchParams(window.location.search)
        const viewId = urlParams.get('view')
        return (
            <div>
                {!this.props.store.settings[0].serverOnline && (
                    <div className="server-offline">
                        {this.props.t('TRYING TO CONNECT TO SISYFOS SERVER')}
                    </div>
                )}
                {viewId === 'minimonitor' ? (
                    <MiniChannels />
                ) : viewId === 'mic-tally' ? (
                    <MicTally />
                ) : (
                    <Channels />
                )}
                {this.props.store.settings[0].showLabelSettings && (
                    <LabelSettings />
                )}
                {this.props.store.settings[0].showPagesSetup && (
                    <PagesSettings />
                )}
                {this.props.store.settings[0].showStorage && <Storage />}
                {this.props.store.settings[0].showSettings && <Settings />}
            </div>
        )
    }
}

const mapStateToProps = (state: any, t: any): AppProps => {
    return {
        store: state,
        t: t,
    }
}

export default compose(
    connect<any, AppProps>(mapStateToProps),
    withTranslation()
)(App) as any
