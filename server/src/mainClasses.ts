import { MixerProtocolPresets } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerGenericConnection } from './utils/MixerConnection'
import { AutomationConnection } from './utils/AutomationConnection'
import { RemoteConnection } from './utils/RemoteConnection'
import { mixerRegistry } from './plugins/MixerRegistry'
import { loadPlugins } from './plugins/PluginLoader'

mixerRegistry.registerBuiltins(MixerProtocolPresets)
loadPlugins()

const mixerProtocolPresets = mixerRegistry.getAllPresets()
const mixerProtocolList = mixerRegistry.getProtocolList()

const mixerGenericConnection = new MixerGenericConnection()
const automationConnection = new AutomationConnection()
const remoteConnections = new RemoteConnection()

export {
    mixerProtocolList,
    mixerProtocolPresets,
    mixerGenericConnection,
    automationConnection,
    remoteConnections,
    mixerRegistry,
}
