import { state } from '../../../reducers/store'
import { sendVuLevel } from '../../vuServer'
import { VuType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

const calcVuLevel = (level: number) => {
    return Math.log(level) / Math.log(600) + 1
}

export const midasMeter = (mixerIndex: number, message: any) => {
    const DATA_OFFSET = 4
    let uint8bytes = Uint8Array.from(message[0])
    let dataview = new DataView(uint8bytes.buffer)
    let level: number
    let reductionLevel: number
    let assignedFader: number
    let numberOfChannels =
        state.settings[0].mixers[mixerIndex].numberOfChannelsInType[0]

    for (let i = 0; i < numberOfChannels; i++) {
        assignedFader =
            state.channels[0].chMixerConnection[mixerIndex].channel[i]
                .assignedFader
        if (
            assignedFader >= 0 &&
            assignedFader < state.settings[0].numberOfFaders
        ) {
            level = calcVuLevel(dataview.getFloat32(4 * i + DATA_OFFSET, true))
            reductionLevel = dataview.getFloat32(
                4 * (i + 64) + DATA_OFFSET,
                true
            )
            let vuIndex: number = state.faders[0].fader[
                assignedFader
            ].assignedChannels?.findIndex((assigned) => {
                return (
                    assigned.mixerIndex === mixerIndex &&
                    assigned.channelIndex === i
                )
            })
            if (vuIndex === -1) vuIndex = 0
            sendVuLevel(assignedFader, VuType.Channel, vuIndex, level)
            sendVuLevel(assignedFader, VuType.Reduction, 0, 1 - reductionLevel)
        }
    }
}
