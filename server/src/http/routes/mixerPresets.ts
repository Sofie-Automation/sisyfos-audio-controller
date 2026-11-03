import express from 'express'
import path from 'path'
import { logger } from '../../utils/logger'
import {
    STORAGE_FOLDER,
    saveMixerPreset,
    deleteMixerPreset,
} from '../../utils/SettingsStorage'
import { asyncHandler, HttpError } from '../asyncHandler'

export const mixerPresetsRouter = express.Router()

mixerPresetsRouter.get('/:filename', (req, res) => {
    const filename = path.basename(req.params.filename)
    const filePath = path.join(STORAGE_FOLDER, filename)
    res.download(filePath, filename, (err: any) => {
        if (err && !res.headersSent) {
            logger.error(`Error downloading preset ${filename}: ${err}`)
            res.status(404).send('File not found')
        }
    })
})

mixerPresetsRouter.put(
    '/:filename',
    express.raw({ type: '*/*', limit: '50mb' }),
    asyncHandler(async (req, res) => {
        const filename = path.basename(req.params.filename)
        if (!filename) {
            throw new HttpError(400, 'filename required')
        }
        await saveMixerPreset(filename, req.body as Buffer)
        res.status(200).send('OK')
    })
)

mixerPresetsRouter.delete(
    '/:filename',
    asyncHandler(async (req, res) => {
        const filename = path.basename(req.params.filename)
        try {
            await deleteMixerPreset(filename)
        } catch (error) {
            throw new HttpError(404, 'File not found')
        }
        res.status(200).send('OK')
    })
)
