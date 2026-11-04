import express from 'express'
import path from 'path'
import { logger } from '../../utils/logger'
import {
    STORAGE_FOLDER,
    getSnapShotList,
    saveSnapshotState,
} from '../../utils/SettingsStorage'
import { isValidSnapshot } from '../../utils/snapshotValidation'
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
        res.status(200).send('OK')
    })
)
