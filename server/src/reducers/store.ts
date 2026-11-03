import storeRedux from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { SettingsActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { loadSettings } from '../utils/SettingsStorage'

storeRedux.dispatch({
    type: SettingsActionTypes.UPDATE_SETTINGS,
    settings: loadSettings(storeRedux.getState()),
})

//Subscribe to redux store:
let state = storeRedux.getState()
const unsubscribe = storeRedux.subscribe(() => {
    state = storeRedux.getState()
})

export { storeRedux as store }
export { state }
