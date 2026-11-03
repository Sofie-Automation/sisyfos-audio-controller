import React from 'react'
import ReactDom from 'react-dom'
import App from './src/components/App'

import { MixerProtocol } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import ContextProvider from './src/components/ContextProvider'
declare global {
    interface Window {
        storeRedux: any
        reduxState: any
        mixerProtocol: MixerProtocol
        mixerProtocolPresets: any
        mixerProtocolList: any
        socketIoClient: any
        socketIoVuClient: any
        snapshotFileList: string[]
        ccgFileList: string[]
        mixerPresetList: string[]
    }
}

// *** Uncomment to log Socket I/O:
// localStorage.debug = 'socket.io-client:socket';

ReactDom.render(
    <ContextProvider>
        <App />
    </ContextProvider>,
    document.getElementById('root')
)
