import {
    MixerProtocolGeneric,
    MixerConnectionTypes,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerConnection } from '../utils/mixerConnections'
import { logger } from '../utils/logger'

// This is not pretty, needs future refactor. This should be done after the repo is established.
export function createBuiltinConnection(
    protocol: MixerProtocolGeneric,
    mixerIndex: number
): MixerConnection | undefined {
    switch (protocol.protocol) {
        case MixerConnectionTypes.OSC: {
            const {
                OscMixerConnection,
            } = require('../utils/mixerConnections/OscMixerConnection')
            return new OscMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.YamahaQlCl: {
            const {
                QlClMixerConnection,
            } = require('../utils/mixerConnections/YamahaQlClConnection')
            return new QlClMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.GenericMidi: {
            const {
                MidiMixerConnection,
            } = require('../utils/mixerConnections/MidiMixerConnection')
            return new MidiMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.CasparCG: {
            const {
                CasparCGConnection,
            } = require('../utils/mixerConnections/CasparCGConnection')
            return new CasparCGConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.EMBER: {
            const {
                EmberMixerConnection,
            } = require('../utils/mixerConnections/EmberMixerConnection')
            return new EmberMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.LawoMC2: {
            const {
                LawoMC2Connection,
            } = require('../utils/mixerConnections/LawoMC2Connection')
            return new LawoMC2Connection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.LawoRuby: {
            const {
                LawoRubyMixerConnection,
            } = require('../utils/mixerConnections/LawoRubyConnection')
            return new LawoRubyMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.Studer: {
            const {
                StuderMixerConnection,
            } = require('../utils/mixerConnections/StuderMixerConnection')
            return new StuderMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.StuderVista: {
            const {
                StuderVistaMixerConnection,
            } = require('../utils/mixerConnections/StuderVistaMixerConnection')
            return new StuderVistaMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.SSLSystemT: {
            const {
                SSLMixerConnection,
            } = require('../utils/mixerConnections/SSLMixerConnection')
            return new SSLMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.vMix: {
            const {
                VMixMixerConnection,
            } = require('../utils/mixerConnections/VMixMixerConnection')
            return new VMixMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.Atem: {
            const {
                AtemMixerConnection,
            } = require('../utils/mixerConnections/AtemConnection')
            return new AtemMixerConnection(protocol, mixerIndex)
        }
        case MixerConnectionTypes.DHD: {
            const {
                DHDMixerConnection,
            } = require('../utils/mixerConnections/DHDConnection')
            return new DHDMixerConnection(protocol, mixerIndex)
        }
        default:
            logger.error(
                `Builtin mixer protocol "${protocol.protocol}" is not supported`
            )
            return undefined
    }
}
