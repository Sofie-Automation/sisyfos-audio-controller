import express from 'express'
import { logger } from '../utils/logger'

export class HttpError extends Error {
    constructor(
        public status: number,
        message: string
    ) {
        super(message)
    }
}

// Express 4 does not forward rejected promises to the error middleware
export const asyncHandler =
    (fn: express.RequestHandler): express.RequestHandler =>
    (req, res, next) =>
        Promise.resolve(fn(req, res, next)).catch(next)

export const errorHandler: express.ErrorRequestHandler = (
    err,
    req,
    res,
    _next
) => {
    // Body parser errors (malformed JSON, body too large) carry their own
    // client error status and are marked safe to expose
    const isClientError =
        err instanceof HttpError ||
        (err.expose && err.status >= 400 && err.status < 500)
    const status = isClientError ? err.status : 500
    logger.data(err).error(`${req.method} ${req.originalUrl} failed`)
    if (!res.headersSent) {
        res.status(status).send(
            isClientError ? err.message : 'Internal server error'
        )
    }
}
