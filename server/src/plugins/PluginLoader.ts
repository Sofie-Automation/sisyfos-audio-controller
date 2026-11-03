import fs from 'fs'
import path from 'path'
import {
    MixerPluginManifest,
    MixerPluginModule,
} from '@sofie-automation/sisyfos-audio-controller-shared-lib'
import { PLUGINS_FOLDER } from '../constants/storagePaths'
import { mixerRegistry, MixerRegistry } from './MixerRegistry'
import { logger } from '../utils/logger'

const PLUGIN_PATH_ARG_NAMES = ['--plugin-path', '--sisyfos-plugin-path']

export function getPluginPathsFromArgv(
    argv: string[] = process.argv
): string[] {
    const paths: string[] = []
    const args = argv.slice(2)

    for (let i = 0; i < args.length; i++) {
        const arg = args[i]

        for (const argName of PLUGIN_PATH_ARG_NAMES) {
            if (arg === argName) {
                const value = args[i + 1]
                if (value && !value.startsWith('-')) {
                    paths.push(value.trim())
                    i++
                }
                break
            }

            const prefix = `${argName}=`
            if (arg.startsWith(prefix)) {
                const value = arg.slice(prefix.length).trim()
                if (value) {
                    paths.push(value)
                }
                break
            }
        }
    }

    return paths
}

function readManifest(pluginDir: string): MixerPluginManifest | undefined {
    const manifestPath = path.join(pluginDir, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
        return undefined
    }

    try {
        const raw = fs.readFileSync(manifestPath, 'utf8')
        const manifest = JSON.parse(raw) as MixerPluginManifest

        if (!manifest.id || !manifest.mixers) {
            logger.error(
                `Invalid plugin manifest in ${pluginDir}: requires id and mixers`
            )
            return undefined
        }

        return manifest
    } catch (error) {
        logger
            .data(error)
            .error(`Failed to read plugin manifest in ${pluginDir}`)
        return undefined
    }
}

function loadPluginDirectory(
    pluginDir: string,
    registry: MixerRegistry
): boolean {
    logger.info(`Checking plugin directory: ${pluginDir}`)

    const manifest = readManifest(pluginDir)
    if (!manifest) {
        logger.info(`Skipping ${pluginDir} (no valid manifest.json)`)
        return false
    }

    logger.info(
        `Found plugin manifest "${manifest.id}" v${manifest.version ?? '?'} in ${pluginDir}`
    )

    const entryPath = path.join(pluginDir, 'index.js')
    if (!fs.existsSync(entryPath)) {
        logger.error(
            `Plugin "${manifest.id}" in ${pluginDir} is missing index.js`
        )
        return false
    }

    try {
        logger.info(`Loading plugin entrypoint: ${entryPath}`)
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pluginModule = require(entryPath) as MixerPluginModule
        if (!pluginModule?.Mixers) {
            logger.error(
                `Plugin "${manifest.id}" in ${pluginDir} must export { Mixers: ... }`
            )
            return false
        }

        const presetKeys = Object.keys(manifest.mixers)
        logger.info(
            `Registering plugin "${manifest.id}" presets: ${presetKeys.join(', ')}`
        )
        registry.registerPlugin(manifest, pluginDir, pluginModule.Mixers)
        logger.info(`Loaded mixer plugin "${manifest.id}" from ${pluginDir}`)
        return true
    } catch (error) {
        logger.data(error).error(`Failed to load plugin from ${pluginDir}`)
        return false
    }
}

export function loadPlugins(registry: MixerRegistry = mixerRegistry): void {
    const argvPaths = getPluginPathsFromArgv()
    const envPath = process.env.SISYFOS_PLUGIN_PATH
    const envPaths = envPath
        ? envPath
              .split(path.delimiter)
              .map((entry) => entry.trim())
              .filter(Boolean)
        : []
    const searchPaths = [
        ...new Set([...argvPaths, ...envPaths, PLUGINS_FOLDER]),
    ]

    logger.info('Loading mixer plugins...')
    logger.info(
        `Plugin paths from CLI: ${argvPaths.length ? argvPaths.join(', ') : '(none)'}`
    )
    logger.info(
        `Plugin paths from SISYFOS_PLUGIN_PATH: ${envPaths.length ? envPaths.join(', ') : '(none)'}`
    )
    logger.info(`Plugin storage folder: ${PLUGINS_FOLDER}`)

    let loadedCount = 0

    for (const searchPath of searchPaths) {
        if (!fs.existsSync(searchPath)) {
            logger.info(
                `Skipping plugin search path (not found): ${searchPath}`
            )
            continue
        }

        logger.info(`Scanning plugin search path: ${searchPath}`)

        let entries: fs.Dirent[]
        try {
            entries = fs.readdirSync(searchPath, { withFileTypes: true })
        } catch (error) {
            logger.data(error).error(`Failed to read plugin path ${searchPath}`)
            continue
        }

        const pluginDirs = entries.filter((entry) => entry.isDirectory())
        logger.info(
            `Found ${pluginDirs.length} director${pluginDirs.length === 1 ? 'y' : 'ies'} in ${searchPath}`
        )

        for (const entry of pluginDirs) {
            if (
                loadPluginDirectory(path.join(searchPath, entry.name), registry)
            ) {
                loadedCount++
            }
        }
    }

    logger.info(
        `Mixer plugin loading complete (${loadedCount} plugin${loadedCount === 1 ? '' : 's'} loaded)`
    )
}
