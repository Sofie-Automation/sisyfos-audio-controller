import React from 'react'
import { useSocketConnection } from '../hooks/useSocketConnection'
import { I18nextProvider } from 'react-i18next'
import i18n from '../utils/i18n'
import storeRedux from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Provider as ReduxProvider } from 'react-redux'
import type { Store } from 'redux'

const ContextProvider = ({
    children,
    uri,
    path,
    query,
    store,
}: {
    children: React.ReactNode
    uri?: string
    path?: string
    query?: Record<string, string>
    store?: Store
}) => {
    const { initialized } = useSocketConnection(uri, path, query, store)

    return (
        <ReduxProvider store={store ?? storeRedux}>
            <I18nextProvider i18n={i18n}>
                {initialized && children}
            </I18nextProvider>
        </ReduxProvider>
    )
}

export default ContextProvider
