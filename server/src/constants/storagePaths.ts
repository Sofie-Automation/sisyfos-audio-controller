import path from 'path'
import { homedir, platform as getPlatform } from 'os'

const platform = getPlatform()
const homeDir = homedir()

// Linux place in "app"/storage to be backward compatible with Docker containers.
// Windows and Mac place the storagefolder in home -> sisyfos-storage
export const STORAGE_FOLDER =
    platform === 'linux'
        ? path.resolve(process.cwd(), 'storage')
        : path.resolve(homeDir, 'sisyfos-storage')

export const PLUGINS_FOLDER = path.join(STORAGE_FOLDER, 'plugins')
