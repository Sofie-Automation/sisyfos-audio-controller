import express from 'express'
import path from 'path'
import { logger } from '../../utils/logger'
import { STORAGE_FOLDER, getSnapShotList } from '../../utils/SettingsStorage'

export const snapshotsRouter = express.Router()

snapshotsRouter.get('/', (_req, res) => {
    res.json(getSnapShotList())
})

export const snapshotRouter = express.Router()

snapshotRouter.get('/:filename', (req, res) => {
    const filename = path.basename(req.params.filename)
    // The storage folder also holds settings, so only serve snapshot files
    if (!filename.endsWith('.shot')) {
        res.status(404).send('File not found')
        return
    }
    const filePath = path.join(STORAGE_FOLDER, filename)
    res.download(filePath, filename, (err: any) => {
        if (err && !res.headersSent) {
            logger.error(`Error downloading snapshot ${filename}: ${err}`)
            res.status(404).send('File not found')
        }
    })
})
