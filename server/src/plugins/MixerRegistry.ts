import { MixerProtocolPresets } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerProtocolGeneric } from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import {
    MixerPluginEntry,
    MixerPluginManifest,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { MixerConnection } from '../utils/mixerConnections'
import { createBuiltinConnection } from './builtinConnectionFactories'
import { logger } from '../utils/logger'

interface PluginRegistryEntry {
    displayName: string
    protocol: MixerProtocolGeneric
    pluginPath: string
    createConnection: MixerPluginEntry['createConnection']
}

export class MixerRegistry {
    private builtinPresets: Record<string, MixerProtocolGeneric> = {}
    private pluginEntries: Record<string, PluginRegistryEntry> = {}

    registerBuiltins(
        presets: Record<string, MixerProtocolGeneric> = MixerProtocolPresets
    ): void {
        this.builtinPresets = { ...presets }
    }

    registerPlugin(
        manifest: MixerPluginManifest,
        pluginPath: string,
        mixers: Record<string, MixerPluginEntry>
    ): void {
        for (const presetKey of Object.keys(manifest.mixers)) {
            if (!mixers[presetKey]) {
                logger.warn(
                    `Plugin "${manifest.id}": manifest key "${presetKey}" has no matching Mixers export`
                )
                continue
            }

            if (
                this.pluginEntries[presetKey] ||
                this.builtinPresets[presetKey]
            ) {
                logger.error(
                    `Plugin "${manifest.id}": preset key "${presetKey}" is already registered — skipping plugin entry`
                )
                continue
            }

            const entry = mixers[presetKey]
            if (
                !entry.protocol ||
                typeof entry.createConnection !== 'function'
            ) {
                logger.error(
                    `Plugin "${manifest.id}": mixer "${presetKey}" must export protocol and createConnection`
                )
                continue
            }

            this.pluginEntries[presetKey] = {
                displayName:
                    entry.displayName ||
                    manifest.mixers[presetKey].displayName ||
                    presetKey,
                protocol: entry.protocol,
                pluginPath,
                createConnection: entry.createConnection,
            }
        }
    }

    hasPreset(presetKey: string): boolean {
        return (
            presetKey in this.pluginEntries || presetKey in this.builtinPresets
        )
    }

    getProtocol(presetKey: string): MixerProtocolGeneric {
        if (this.pluginEntries[presetKey]) {
            return this.pluginEntries[presetKey].protocol
        }
        if (this.builtinPresets[presetKey]) {
            return this.builtinPresets[presetKey]
        }
        logger.warn(
            `Unknown mixer preset "${presetKey}", falling back to sslSystemT`
        )
        return this.builtinPresets.sslSystemT
    }

    getAllPresets(): Record<string, MixerProtocolGeneric> {
        const merged: Record<string, MixerProtocolGeneric> = {
            ...this.builtinPresets,
        }
        for (const [key, entry] of Object.entries(this.pluginEntries)) {
            merged[key] = entry.protocol
        }
        return merged
    }

    getProtocolList(): Array<{ value: string; label: string }> {
        const builtinList = Object.keys(this.builtinPresets).map((preset) => ({
            value: preset,
            label: this.builtinPresets[preset].label,
        }))

        const pluginList = Object.entries(this.pluginEntries).map(
            ([preset, entry]) => ({
                value: preset,
                label: entry.displayName || entry.protocol.label || preset,
            })
        )

        return [...builtinList, ...pluginList]
    }

    createConnection(
        presetKey: string,
        mixerIndex: number
    ): MixerConnection | undefined {
        const pluginEntry = this.pluginEntries[presetKey]
        if (pluginEntry) {
            const connection = pluginEntry.createConnection(
                pluginEntry.protocol,
                mixerIndex
            ) as MixerConnection
            return connection
        }

        const protocol = this.getProtocol(presetKey)
        return createBuiltinConnection(protocol, mixerIndex)
    }
}

export const mixerRegistry = new MixerRegistry()
