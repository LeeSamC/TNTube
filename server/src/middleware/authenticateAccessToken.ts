import {Request, Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken'

export type AuthUser = {
    userId: string
}

export interface AuthenticateRequest extends Request {
    user?: AuthUser
}

export function authenticateAccessToken(req: AuthenticateRequest, res: Response, next: NextFunction){
    const token = req.cookies.accessToken

    if(!token){
        return res.status(401).json({message: 'Invalid Token'})
    }

    try{
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as AuthUser

        req.user = {userId: decoded.userId}

        next()
    }catch (error){
        if(error instanceof jwt.JsonWebTokenError){
            return res.status(401).json({message: 'Invalid token'})
        }

        return res.status(401).json({message: 'Invalid token'})
    }
}