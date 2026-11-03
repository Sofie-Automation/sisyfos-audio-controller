import { state } from '../../../reducers/store'
import { sendVuLevel } from '../../vuServer'
import { VuType } from '@sofie-automation/sisyfos-audio-controller-shared-lib'

const DATA_OFFSET = 4

export const behringerXrMeter = (mixerIndex: number, message: any) => {
    //Test data from Behringer:
    //message = [40, 0, 0, 0, 133, 157, 183, 156, 72, 154, 101, 157, 229, 162, 241, 158, 253, 162, 156, 162, 131, 162, 253, 162, 81, 162, 29, 162, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 0, 128, 223, 157, 223, 157, 223, 157, 223, 157];

    let uint8bytes = Uint8Array.from(message[0])
    let dataview = new DataView(uint8bytes.buffer)

    for (
        let i = 0;
        i < state.settings[0].mixers[0].numberOfChannelsInType[0];
        i++
    ) {
        let level = (dataview.getInt16(DATA_OFFSET + 2 * i, true) + 8000) / 8000
        sendVuLevel(i, VuType.Channel, 0, level)
    }
}

export const behringerReductionMeter = (mixerIndex: number, message: any) => {
    //Test data from Behringer:
    //message =

    let uint8bytes = Uint8Array.from(message[0])
    let dataview = new DataView(uint8bytes.buffer)

    for (
        let i = 0;
        i < state.settings[0].mixers[0].numberOfChannelsInType[0];
        i++
    ) {
        let level =
            1 -
            (dataview.getInt16(DATA_OFFSET + 2 * (i + 16), true) + 8000) / 8000
        sendVuLevel(i, VuType.Reduction, 0, level)
    }
}
