import {Router} from 'express'
import { db } from '../../db'
import { users } from '../../db/schema'
import { eq, is } from 'drizzle-orm'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import {set, z} from 'zod'

import { refreshTokens } from '../../db/schema'

const router = Router()

const loginSchema = z.object({
    username: z.string().min(3).max(30),
    password: z.string().min(8)
})

function issueAccessToken(userId: string){
    if(!process.env.ACCESS_TOKEN_SECRET){
        throw new Error('ACCESS_TOKEN_SECRET not configured')
    }

    return jwt.sign(userId, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '30m'})
}

function issueRefreshToken(userId: string){
    if(!process.env.REFRESH_TOKEN_SECRET){
        throw new Error('REFRESH_TOKEN_SECRET is not configured')
    }

    return jwt.sign(userId, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '15d'})
}

function setAuthCookies(accessToken: string, refreshToken: string, res: any){
    const isProduction = process.env.NODE_ENV === 'production'

    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/'
    }

    res.cookie('accessToken', accessToken, {
        ...cookieOptions,
        maxAge: 30 * 60 * 1000
    })

    res.cookie('refreshToken', refreshToken, {
        ...cookieOptions,
        maxAge: 15 * 24 * 60 * 60 * 1000
    })
}

function clearAuthCookies(res: any){
    const isProduction = process.env.NODE_ENV === 'production'

    const cookieOptions = {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax' as const,
        path: '/'
    }

    res.clearCookie('accessToken', cookieOptions)
    res.clearCookie('refreshToken', cookieOptions)
}

router.post('/login', async (req, res) => {
    try{
        const data = loginSchema.parse(req.body)

        if(!data){
            return res.status(400).json({message: 'Need username and password'})
        }

        const user = await db.query.users.findFirst({where: eq(users.username, data.username)})

        if(!user){
            return res.status(401).json({message: 'Username or password invalid'})
        }

        const password = await bcrypt.compare(data.password, user.passwordHash) 

        if(!password){
            return res.status(401).json({message: 'Username or password invalid'})
        }

        await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.userId))

        const accessToken = issueAccessToken(user.userId)
        const refreshToken = issueRefreshToken(user.userId)

        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: user.userId,
            expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            revoked: false
        })

        setAuthCookies(accessToken, refreshToken, res)

        return res.status(200).json({message: 'Successfully logged in '})
    }catch (error){
        console.error(error)

        return res.status(500).json({message: 'Unable to login user'})
    }
})