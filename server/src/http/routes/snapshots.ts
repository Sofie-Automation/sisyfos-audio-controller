import express from 'express'
import path from 'path'
import { logger } from '../../utils/logger'
import {
    STORAGE_FOLDER,
    getSnapShotList,
    saveSnapshotState,
} from '../../utils/SettingsStorage'
import { isValidSnapshot } from '../../utils/snapshotValidation'
import { mixerGenericConnection } from '../../mainClasses'
import { SOCKET_RETURN_SNAPSHOT_LIST } from '../../../../shared/src/constants/SOCKET_IO_DISPATCHERS'
import { socketServer } from '../server'
import { asyncHandler, HttpError } from '../asyncHandler'

export const snapshotsRouter = express.Router()

snapshotsRouter.get('/', (_req, res) => {
    res.json(getSnapShotList())
})

export const snapshotRouter = express.Router()

// The storage folder also holds settings, so only ever touch snapshot files
const snapshotFilename = (param: string): string => {
    const filename = path.basename(param)
    return filename.endsWith('.shot') ? filename : filename + '.shot'
}

// Loading only updates the store and clients; the mixers catch up on their
// own. push sends the new fader levels to the mixers straight away.
const loadSnapshot = (filename: string, push: boolean): boolean => {
    const loaded = global.mainThreadHandler.loadSnapshot(filename)
    if (loaded && push) {
        mixerGenericConnection.updateOutLevels()
    }
    return loaded
}

snapshotRouter.get('/:filename', (req, res) => {
    const filename = snapshotFilename(req.params.filename)
    const filePath = path.join(STORAGE_FOLDER, filename)
    res.download(filePath, filename, (err: any) => {
        if (err && !res.headersSent) {
            logger.error(`Error downloading snapshot ${filename}: ${err}`)
            res.status(404).send('File not found')
        }
    })
})

snapshotRouter.put(
    '/:filename',
    express.json({ limit: '50mb' }),
    asyncHandler(async (req, res) => {
        const filename = snapshotFilename(req.params.filename)
        if (filename === '.shot') {
            throw new HttpError(400, 'filename required')
        }
        if (filename === 'default.shot') {
            throw new HttpError(400, 'default.shot cannot be overwritten')
        }
        if (!isValidSnapshot(req.body)) {
            throw new HttpError(400, 'Invalid snapshot format')
        }
        await saveSnapshotState(req.body, path.join(STORAGE_FOLDER, filename))
        socketServer.emit(SOCKET_RETURN_SNAPSHOT_LIST, getSnapShotList())
        if (
            req.query.load === 'true' &&
            !loadSnapshot(filename, req.query.push === 'true')
        ) {
            // The body was validated before saving, so this is unexpected
            throw new Error(`Saved ${filename} but could not load it`)
        }
        res.status(200).send('OK')
    })
)

snapshotRouter.post('/:filename/load', (req, res) => {
    const filename = snapshotFilename(req.params.filename)
    if (!loadSnapshot(filename, req.query.push === 'true')) {
        throw new HttpError(404, 'Snapshot not found or invalid')
    }
    res.status(200).send('OK')
})
