import express from 'express'
import { saveCustomPages, getCustomPages } from '../../utils/SettingsStorage'
import { SOCKET_RETURN_PAGES_LIST } from '../../../../shared/src/constants/SOCKET_IO_DISPATCHERS'
import { socketServer } from '../server'
import { asyncHandler, HttpError } from '../asyncHandler'

export const pagesRouter = express.Router()

const isValidPages = (pages: any): boolean =>
    Array.isArray(pages) &&
    pages.every(
        (p: any) =>
            typeof p.id === 'string' &&
            typeof p.label === 'string' &&
            Array.isArray(p.faders)
    )

pagesRouter.get('/', (_req, res) => {
    res.setHeader('Content-Disposition', 'attachment; filename="pages.json"')
    res.json(getCustomPages())
})

pagesRouter.put(
    '/',
    express.json({ limit: '1mb' }),
    asyncHandler(async (req, res) => {
        const pages = req.body
        if (!isValidPages(pages)) {
            throw new HttpError(400, 'Invalid pages format')
        }
        await saveCustomPages(pages)
        socketServer.emit(SOCKET_RETURN_PAGES_LIST, pages)
        res.status(200).send('OK')
    })
)
