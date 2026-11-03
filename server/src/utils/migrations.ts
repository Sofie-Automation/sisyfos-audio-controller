import fs from 'fs'
import path from 'path'

import { logger } from './logger'
import { Settings } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { getSnapShotList, ShotStorage, STORAGE_FOLDER } from './SettingsStorage'

const version = process.env.npm_package_version

export const checkVersion = (currentSettings: Settings): Settings => {
    if (
        versionAsNumber(version) >
        versionAsNumber(currentSettings.sisyfosVersion)
    ) {
        currentSettings = migrateVersion(currentSettings)
    }
    return currentSettings
}

const migrateVersion = (currentSettings: Settings): Settings => {
    logger.info(
        `Migrating VERSION from ${currentSettings.sisyfosVersion} to ${version}`
    )
    let newSettings = currentSettings
    if (versionAsNumber(version) >= versionAsNumber('4.7.0')) {
        newSettings = migrate45to47(currentSettings)
    }
    return newSettings
}

const migrate45to47 = (currentSettings: Settings): Settings => {
    let files: string[] = getSnapShotList()
    files.push('default.shot')

    files.forEach((fileName: string) => {
        try {
            let stateFromShot = JSON.parse(
                fs.readFileSync(path.join(STORAGE_FOLDER, fileName), 'utf8')
            )
            // As this is the first implemented migration it also looks .shot files from ealier versions than 4.xx
            if (stateFromShot.channelState.chConnection) {
                // From Version 4.xx
                stateFromShot.channelState.chMixerConnection =
                    stateFromShot.channelState?.chConnection
                delete stateFromShot.channelState.chConnection
            } else if (stateFromShot.channelState.channel) {
                // Version lower than 4.0
                stateFromShot.channelState.chMixerConnection = [
                    { channel: stateFromShot.channelState.channel },
                ]
                delete stateFromShot.channelState.channel
            }
            let migratedShot: ShotStorage = stateFromShot

            fs.writeFileSync(
                path.join(STORAGE_FOLDER, fileName),
                JSON.stringify(migratedShot),
                'utf8'
            )
            logger.trace(`Snapshot ${fileName} Saved to storage folder`)
        } catch (error) {
            logger.data(error).error('Error migrating Snapshot')
        }
    })
    currentSettings.sisyfosVersion = version
    delete currentSettings.customPages
    try {
        fs.writeFileSync(
            path.join(STORAGE_FOLDER, 'settings.json'),
            JSON.stringify(currentSettings),
            'utf8'
        )
    } catch (error: any) {
        logger
            .data(error)
            .error('Migration failed - error writing settings.json file')
    }
    return currentSettings
}

const versionAsNumber = (versionString: string): number => {
    if (!versionString) return 0
    let versionArray: string[] = versionString.split('.')
    let versionValue: number =
        parseInt(versionArray[0]) * 10000 +
        parseInt(versionArray[1]) * 100 +
        (parseInt(versionArray[2]) || 0)
    return versionValue
}
