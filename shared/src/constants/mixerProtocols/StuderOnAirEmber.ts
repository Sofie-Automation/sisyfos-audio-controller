import {
    MixerProtocol,
    emptyMixerMessage,
    MixerConnectionTypes,
} from '../MixerProtocolInterface'

export const StuderOnAirMaster: MixerProtocol = {
    protocol: MixerConnectionTypes.EMBER,
    label: 'Studer OnAir 3000',
    presetFileExtension: '',
    loadPresetCommand: [emptyMixerMessage()],
    MAX_UPDATES_PER_SECOND: 10,
    leadingZeros: false, //some OSC protocols needs channels to be 01, 02 etc.
    pingCommand: [emptyMixerMessage()],
    pingResponseCommand: [emptyMixerMessage()],
    pingTime: 0, //Bypass ping when pingTime is zero
    initializeCommands: [emptyMixerMessage()],
    channelTypes: [
        {
            channelTypeName: 'MONO',
            channelTypeColor: '#2f2f2f',
            fromMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            'System/Mixer/Channels/Inp Mono/Inp Mono #{channel}/Functions/Fader/Value',
                        value: 0,
                        type: 'real',
                        min: 0,
                        max: 1000,
                        zero: 0,
                    },
                ],
                CHANNEL_VU: [emptyMixerMessage()],
                CHANNEL_VU_REDUCTION: [emptyMixerMessage()],
                CHANNEL_NAME: [
                    {
                        mixerMessage:
                            'System/Mixer/Channels/Inp Mono/Inp Mono #{channel}/Functions/Channel Attribute/User Label',
                        value: 0,
                        type: 'real',
                        min: -90,
                        max: 10,
                        zero: 0,
                    },
                ],
                PFL: [emptyMixerMessage()],
                NEXT_SEND: [emptyMixerMessage()],
                AUX_LEVEL: [emptyMixerMessage()],
                CHANNEL_MUTE_ON: [emptyMixerMessage()],
                CHANNEL_MUTE_OFF: [emptyMixerMessage()],
            },
            // Ch 1: Max level :
            // 7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 a1 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 03 e8 00 00 00 00
            // Ch 2: Min level :
            /*
C1:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 a1 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00


C2:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 a2 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00


C4:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 a4 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00


C5:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 a5 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00


C9:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 a9 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00


C10:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 aa 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00

C15:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 af 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00

C16:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 b0 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00


C17:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 b1 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00


C23:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 b7 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00


C24:
7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 b8 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 01 4a 00 00 00 00

C31:
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 1f 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 1f 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 ee 00 00 00 00

C32:
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 20 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00

C32:
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 21 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 21 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 00 00 00 00 00 00

testtool:
0000   00 d8 61 3f 19 1c 00 d8 61 47 56 eb 08 00 45 00
0010   00 50 66 c6 40 00 80 06 12 88 c0 a8 00 05 c0 a8
0020   00 04 e9 13 1d b0 cb 35 a7 04 eb f8 11 6c 50 18
0030   20 12 41 e8 00 00 7f 8f ff fe d9 5c 80 30 80 a4
0040   19 31 17 a1 15 31 13 bf 20 10 31 0e a6 0c 31 0a
0050   e1 08 31 06 63 04 02 02 03 20 00 00 00 00

0000   00 d8 61 3f 19 1c 00 d8 61 47 56 eb 08 00 45 00
0010   00 50 67 04 40 00 80 06 12 4a c0 a8 00 05 c0 a8
0020   00 04 ea 5e 1d b0 01 3d 11 88 f9 2a 39 99 50 18
0030   20 14 6b 29 00 00 7f 8f ff fe d9 5c 80 30 80 a4
0040   19 31 17 a1 15 31 13 bf 20 10 31 0e a6 0c 31 0a
0050   e1 08 31 06 63 04 02 02 02 a8 00 00 00 00

sisyfos:
0000   00 d8 61 3f 19 1c 50 9f 27 8b 82 d0 08 00 45 00
0010   00 50 00 00 40 00 37 06 b8 32 bc b0 0e 19 c0 a8
0020   00 04 c1 2c 1d b0 07 cf 83 42 4b a4 bf a2 50 18
0030   10 00 45 39 00 00 7f 8f ff fe d9 5c 80 30 80 a4
0040   19 31 17 a1 15 31 13 bf 26 10 31 0e a6 0c 31 0a
0050   e1 08 31 06 63 04 02 02 00 f3 00 00 00 00


CH47:
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 2f 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00


CH 48:
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 30 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00

CH 71:
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 47 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00

CH 72:
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 48 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00

CH 95:
7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 5f 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00

CH 96:7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf 60 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 02 12 00 00 00 00

*/

            toMixer: {
                CHANNEL_OUT_GAIN: [
                    {
                        mixerMessage:
                            '7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a1 14 31 12 {channel} 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 {level} 00 00 00 00', // '7f 8f ff fe d9 5c 80 30 80 a4 18 31 16 a2 14 31 12 {channel} 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 {level} 00 00 00 00',
                        value: 0,
                        type: 'real',
                        min: 0,
                        max: 1000,
                        zero: 750,
                    },
                    {
                        mixerMessage:
                            '7f 8f ff fe d9 5c 80 30 80 a4 19 31 17 a1 15 31 13 bf {channel} 10 31 0e a6 0c 31 0a e1 08 31 06 63 04 02 02 {level} 00 00 00 00',
                        value: 0,
                        type: 'real',
                        min: 0,
                        max: 1000,
                        zero: 750,
                    },
                ],
                CHANNEL_NAME: [
                    {
                        mixerMessage:
                            'System/Mixer/Channels/Inp Mono/Inp Mono #{channel}/Functions/Channel Attribute/User Label',
                        value: 0,
                        type: 'real',
                        min: -90,
                        max: 10,
                        zero: 0,
                    },
                ],
                PFL_ON: [emptyMixerMessage()],
                PFL_OFF: [emptyMixerMessage()],
                NEXT_SEND: [emptyMixerMessage()],
                AUX_LEVEL: [emptyMixerMessage()],
                CHANNEL_MUTE_ON: [emptyMixerMessage()],
                CHANNEL_MUTE_OFF: [emptyMixerMessage()],
            },
        },
    ],
    fader: {
        min: 0,
        max: 1000,
        zero: 750,
        step: 1,
    },
    meter: {
        min: 0,
        max: 1,
        zero: 0.75,
        test: 0.6,
    },
}
