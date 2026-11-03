//Utils:
import { loadSnapshotState, saveSnapshotState } from './SettingsStorage'
import { mixerProtocolPresets } from '../mainClasses'
import { state } from '../reducers/store'
import { logger } from './logger'
import { NumberOfChannels } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { STORAGE_FOLDER } from './SettingsStorage'

import path from 'path'
export class SnapshotHandler {
    numberOfChannels: NumberOfChannels[] = []

    constructor() {
        logger.info('Setting up state')

        this.snapShopStoreTimer()

        // Count total number of channels:
        for (
            let mixerIndex = 0;
            mixerIndex < state.settings[0].numberOfMixers;
            mixerIndex++
        ) {
            this.numberOfChannels.push({ numberOfTypeInCh: [] })
            mixerProtocolPresets[
                state.settings[0].mixers[mixerIndex].mixerProtocol
            ].channelTypes.forEach((item: any, index: number) => {
                this.numberOfChannels[mixerIndex].numberOfTypeInCh.push(
                    state.settings[0].mixers[mixerIndex].numberOfChannelsInType[
                        index
                    ]
                )
            })
        }
        this.loadSnapshotSettings(
            path.resolve(STORAGE_FOLDER, 'default.shot'),
            true
        )

        // ** UNCOMMENT TO DUMP A FULL STORE:
        //const fs = require('fs')
        //fs.writeFileSync('src/components/__tests__/__mocks__/parsedFullStore-UPDATE.json', JSON.stringify(global.storeRedux.getState()))
    }

    snapShopStoreTimer() {
        const saveTimer = setInterval(() => {
            let snapshot = {
                faderState: state.faders[0],
                channelState: state.channels[0],
            }
            saveSnapshotState(
                snapshot,
                path.resolve(STORAGE_FOLDER, 'default.shot')
            )
        }, 2000)
    }

    loadSnapshotSettings(fileName: string, loadAll: boolean) {
        loadSnapshotState(
            this.numberOfChannels,
            state.settings[0].numberOfFaders,
            fileName,
            loadAll
        )
    }

    saveSnapshotSettings(fileName: string) {
        let snapshot = {
            faderState: state.faders[0],
            channelState: state.channels[0],
        }
        saveSnapshotState(snapshot, fileName)
    }
}
