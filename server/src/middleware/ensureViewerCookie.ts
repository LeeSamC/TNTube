import { randomUUID } from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import {z} from 'zod'

export function ensureViewerCookie(req: Request, res: Response, next: NextFunction){
    const existing = z.uuid().safeParse(req.signedCookies.viewerId)

    if(!existing.success){
        const viewerId = randomUUID()

        res.cookie('viewerId', viewerId, {
            signed: true,
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path: '/api/posts',
            maxAge: 365 * 24 * 60 * 60 * 1000
        })

        req.signedCookies.viewerId = viewerId
    }

    next()
}