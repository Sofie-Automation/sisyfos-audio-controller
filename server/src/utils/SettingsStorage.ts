import fs from 'fs'
import path from 'path'

import { store } from '../reducers/store'
import { checkVersion } from './migrations'
import { STORAGE_FOLDER } from '../constants/storagePaths'

export { STORAGE_FOLDER } from '../constants/storagePaths'

// Redux:
import { ChannelActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { FaderActionTypes } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { logger } from './logger'
import { defaultFadersReducerState } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

import {
    Channels,
    NumberOfChannels,
    defaultChannelsReducerState,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'

import {
    CustomPages,
    Settings,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { Faders } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

export interface ShotStorage {
    channelState: Channels
    faderState: Faders
}

export const loadSettings = (storeRedux: any): Settings => {
    let newSettings = storeRedux.settings[0]
    try {
        newSettings = JSON.parse(
            fs.readFileSync(
                path.resolve(STORAGE_FOLDER, 'settings.json'),
                'utf8'
            )
        )
        checkVersion(newSettings)
        return newSettings
    } catch (error) {
        logger
            .data(error)
            .error('Couldn´t read Settings.json file, creating af new')
        saveSettings(newSettings)
        return newSettings
    }
}

export const saveSettings = (settings: any) => {
    const settingsCopy = { ...settings }
    delete settingsCopy.customPages
    let json = JSON.stringify(settingsCopy)
    if (!fs.existsSync(STORAGE_FOLDER)) {
        fs.mkdirSync(STORAGE_FOLDER)
    }
    fs.writeFile(
        path.resolve(STORAGE_FOLDER, 'settings.json'),
        json,
        'utf8',
        (error: any) => {
            if (error) {
                logger.data(error).error('Error writing settings.json file: ')
            }
        }
    )
}

export const loadSnapshotState = (
    numberOfChannels: NumberOfChannels[],
    numberOfFaders: number,
    fileName: string,
    loadAll: boolean
) => {
    try {
        const stateFromFile: ShotStorage = JSON.parse(
            fs.readFileSync(fileName, 'utf8')
        )

        if (loadAll) {
            store.dispatch({
                type: ChannelActionTypes.SET_COMPLETE_CH_STATE,
                numberOfTypeChannels: numberOfChannels,
                allState: stateFromFile.channelState as Channels,
            })
            store.dispatch({
                type: FaderActionTypes.SET_COMPLETE_FADER_STATE,
                numberOfFaders: numberOfFaders,
                allState: stateFromFile.faderState as Faders,
            })
        }
    } catch (error) {
        if (fileName.includes('default.shot')) {
            store.dispatch({
                type: FaderActionTypes.SET_COMPLETE_FADER_STATE,
                numberOfFaders: numberOfFaders,
                allState: defaultFadersReducerState(
                    numberOfFaders,
                    numberOfChannels
                )[0],
            })
            store.dispatch({
                type: ChannelActionTypes.SET_COMPLETE_CH_STATE,
                numberOfTypeChannels: numberOfChannels,
                allState: defaultChannelsReducerState(numberOfChannels)[0],
            })

            logger.data(error).error('Initializing empty faders/channels')
        } else {
            logger.data(error).error('Error loading Snapshot')
        }
    }
}

export const saveSnapshotState = (stateSnapshot: any, fileName: string) => {
    let json = JSON.stringify(stateSnapshot)
    fs.writeFile(fileName, json, 'utf8', (error: any) => {
        if (error) {
            logger.data(error).error('Error saving Snapshot')
        } else {
            logger.trace('Snapshot ' + fileName + ' Saved to storage folder')
        }
    })
}

export const getSnapShotList = (): string[] => {
    const files = fs
        .readdirSync(path.resolve(STORAGE_FOLDER))
        .filter((file: string) => {
            if (file.includes('.shot') && file !== 'default.shot') {
                return true
            }
        })
    return files
}

export const getMixerPresetList = (fileExtension: string): string[] => {
    if (fileExtension === '') {
        return []
    }
    const files = fs
        .readdirSync(path.resolve(STORAGE_FOLDER))
        .filter((file: string) => {
            if (
                file.toUpperCase().includes('.' + fileExtension.toUpperCase())
            ) {
                return true
            }
        })
    return files
}

export const deleteMixerPreset = async (filename: string): Promise<void> => {
    const filePath = path.join(STORAGE_FOLDER, filename)
    await fs.promises.unlink(filePath)
    logger.info(`Deleted mixer preset: ${filename}`)
}

export const saveMixerPreset = async (
    filename: string,
    data: Buffer
): Promise<void> => {
    const filePath = path.join(STORAGE_FOLDER, filename)
    await fs.promises.writeFile(filePath, data)
    logger.info(`Mixer preset ${filename} saved to storage folder`)
}

export const getCcgSettingsList = () => {
    const files = fs
        .readdirSync(path.resolve(STORAGE_FOLDER))
        .filter((file: string) => {
            if (file.includes('.ccg') && file !== 'default-casparcg.ccg') {
                return true
            }
        })
    return files
}

export const setCcgDefault = (fileName: string) => {
    let data: any
    try {
        data = fs.readFileSync(path.join(STORAGE_FOLDER, fileName))
    } catch (error) {
        logger.error('Couldn´t read ' + fileName + ' file')
        return
    }

    const defaultFile = path.join(STORAGE_FOLDER, 'default-casparcg.ccg')
    fs.writeFile(defaultFile, data, 'utf8', (error: any) => {
        if (error) {
            logger.data(error).error('Error setting default CasparCG setting')
        } else {
            logger.info('CasparCG' + fileName + ' Saved as default CasparCG')
        }
    })
}

export const getCustomPages = (): CustomPages[] => {
    try {
        return JSON.parse(
            fs.readFileSync(path.resolve(STORAGE_FOLDER, 'pages.json'), 'utf8')
        )
    } catch (error) {
        logger.error('Couldn´t read pages.json file')
        return []
    }
}

export const saveCustomPages = async (stateCustomPages: any): Promise<void> => {
    const json = JSON.stringify(stateCustomPages)
    await fs.promises.writeFile(
        path.join(STORAGE_FOLDER, 'pages.json'),
        json,
        'utf8'
    )
    logger.info('Pages saved to storage folder')
}
