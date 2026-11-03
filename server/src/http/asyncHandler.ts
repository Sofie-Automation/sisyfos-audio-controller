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
    const status = err instanceof HttpError ? err.status : 500
    logger.data(err).error(`${req.method} ${req.originalUrl} failed`)
    if (!res.headersSent) {
        res.status(status).send(
            err instanceof HttpError ? err.message : 'Internal server error'
        )
    }
}
