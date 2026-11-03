import { useEffect, useState } from 'react'
import { socketClientHandlers } from '../utils/SocketClientHandlers'
import io from 'socket.io-client'
import {
    SOCKET_GET_SNAPSHOT_LIST,
    SOCKET_GET_CCG_LIST,
    SOCKET_GET_MIXER_PRESET_LIST,
    SOCKET_GET_PAGES_LIST,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import defaultStoreRedux from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import type { Store } from 'redux'
import { setActiveSisyfosStore } from '../utils/labels'

export function useSocketConnection(
    customUri?: string,
    customPath?: string,
    query?: Record<string, string>,
    store?: Store
) {
    const [initialized, setInitialized] = useState(false)
    const querySignature = JSON.stringify(query ?? {})

    useEffect(() => {
        const resolvedStore = store ?? defaultStoreRedux
        window.storeRedux = resolvedStore
        setActiveSisyfosStore(resolvedStore)

        //Subscribe to redux store:
        window.reduxState = resolvedStore.getState()
        const unsubscribe = resolvedStore.subscribe(() => {
            window.reduxState = resolvedStore.getState()
        })

        const { pathname, host } = window.location
        const socketServerPath =
            customPath ??
            pathname + (pathname.endsWith('/') ? '' : '/') + 'socket.io/'
        const uri = customUri ?? host

        window.socketIoClient = io(uri, {
            path: socketServerPath,
            query,
        })
        socketClientHandlers(resolvedStore)

        window.socketIoClient.emit(SOCKET_GET_SNAPSHOT_LIST)
        window.socketIoClient.emit(SOCKET_GET_CCG_LIST)
        window.socketIoClient.emit(SOCKET_GET_MIXER_PRESET_LIST)

        console.log('Setting up SocketIO connection ' + socketServerPath)
        window.socketIoClient.emit(
            'get-mixerprotocol',
            'get selected mixerprotocol'
        )
        window.socketIoClient.emit('get-store', 'update local store')
        window.socketIoClient.emit('get-settings', 'update local settings')
        window.socketIoClient.emit(SOCKET_GET_PAGES_LIST)

        setInitialized(true)

        return () => {
            if (window.socketIoClient) {
                window.socketIoClient.disconnect()
                window.socketIoClient.removeAllListeners()
            }
            unsubscribe()
            window.socketIoClient = undefined
            setActiveSisyfosStore()
        }
    }, [customUri, customPath, querySignature, store, query])
    return { initialized }
}
