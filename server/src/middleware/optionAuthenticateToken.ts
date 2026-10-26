import {Request, Response, NextFunction} from 'express'
import jwt from 'jsonwebtoken'

export type AuthUser = {
    userId: string
}

export interface AuthenticateRequest extends Request {
    user?: AuthUser | null
}

export function optionalAuthenticateToken(req: AuthenticateRequest, res: Response, next: NextFunction) {
   const token = req.cookies.accessToken
   
   if(!token) {
        req.user = null
        return next()
   }

   try{
        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!)

        if(typeof decoded === 'string' || typeof decoded.userId !== 'string'){
            req.user = null
            return next()
        }

        req.user = {userId: decoded.userId}

        return next()

   }catch {
        req.user = null
        return next()
   }
  
}