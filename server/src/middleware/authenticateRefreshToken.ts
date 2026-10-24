import {Request, Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken'

import { db } from '../db'
import { eq } from 'drizzle-orm'

import { refreshTokens } from '../db/schema'

export type AuthUser = {
    userId: string
}

export interface AuthenticateReqest extends Request {
    user?: AuthUser
}

export async function authenticateRefreshToken(req: AuthenticateReqest, res: Response, next: NextFunction){
    const token = req.cookies.refreshToken

    if(!token){
        return res.status(401).json({message: 'Invalid token'})
    }

    try{
        const decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET!) as AuthUser

        const refreshToken = await db.query.refreshTokens.findFirst({where: eq(refreshTokens.token, token)})

        if(!refreshToken || refreshToken.revoked || refreshToken.expiresAt <= new Date()) {
            return res.status(401).json({message: 'Invalid token'})
        }

        req.user = {userId: decoded.userId}

        next()
    }catch (error){
        console.error(error)

        return res.status(401).json({message: 'Invalid token'})
    }
}