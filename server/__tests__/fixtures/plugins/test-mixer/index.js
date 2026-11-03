class TestPluginMixerConnection {
    constructor(protocol, mixerIndex) {
        this.protocol = protocol
        this.mixerIndex = mixerIndex
    }

    loadMixerPreset() {}
    updateInputGain() {}
    updateInputSelector() {}
    updatePflState() {}
    updateMuteState() {}
    updateAMixState() {}
    updateNextAux() {}
    updateFx() {}
    updateAuxLevel() {}
    updateChannelName() {}
    injectCommand() {}
    updateChannelSetting() {}
    updateFadeIOLevel() {}
}

const testProtocol = {
    label: 'Test Plugin Mixer',
    protocol: 'custom',
    MAX_UPDATES_PER_SECOND: 10,
    channelTypes: [
        {
            channelTypeName: 'CH',
            channelTypeColor: '#2f2f2f',
            fromMixer: {},
            toMixer: {},
        },
    ],
    fader: {
        min: 0,
        max: 1,
        zero: 0.75,
        step: 0.01,
    },
}

module.exports = {
    Mixers: {
        testPluginMixer: {
            displayName: 'Test Plugin Mixer',
            protocol: testProtocol,
            createConnection: (protocol, mixerIndex) =>
                new TestPluginMixerConnection(protocol, mixerIndex),
        },
    },
}
