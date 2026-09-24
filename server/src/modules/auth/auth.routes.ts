import {Router} from 'express'
import { db } from '../../db'
import { eq } from 'drizzle-orm'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import {httpUrl, z} from 'zod'

import { users } from '../../db/schema'
import { refreshTokens } from '../../db/schema'
import { log } from 'node:console'

const router = Router()

const loginSchema = z.object({
    username: z.string().min(3).max(100),
    password: z.string().min(8)
})

const registerSchema = z.object({
    firstName: z.string().min(3).max(50),
    lastName: z.string().min(3).max(50),
    username: z.string().min(3).max(50),
    password: z.string().min(8),
    confirmPassword: z.string()
})
.refine(
    data => data.password === data.confirmPassword, {
        message: 'Passwords dont match'
    }
)

function issueAccessToken(userId: string){
    if(!process.env.ACCESS_TOKEN_SECRET){
        throw new Error('ACCESS_TOKEN_SECRET is not configured')
    }

    return jwt.sign({userId}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '30m'})
}
function issueRefreshToken(userId: string){
    if(!process.env.REFRESH_TOKEN_SECRET){
        throw new Error('REFRESH_TOKEN_SECRET is not configured')
    }

    return jwt.sign({userId}, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '15d'})
}

function setAuthCookie(res: any, accessToken: string, refreshToken: string){
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

function clearAuthCookie(res:any){
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

        const user = await db.query.users.findFirst({where: eq(users.username, data.username)})

        if(!user){
            return res.status(400).json({message: 'Username or password invalid'})
        }

        const validPassword = await bcrypt.compare(data.password, user.passwordHash)

        if(!validPassword){
            return res.status(400).json({message: 'Username or password invalid'})
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

        setAuthCookie(res, accessToken, refreshToken)

        return res.status(200).json({
            message: 'Successfully logged in'
        })
    }catch (error){
        console.error(error)

        return res.status(500).json({message: 'Failed to log in user'})
    }
})

router.post('/register', async (req, res) => {
    try{
        const data = registerSchema.parse(req.body)

        const existingUser = await db.query.users.findFirst({where: eq(users.username, data.username)})

        if(existingUser){
            return res.status(409).json({message: 'Username already exist'})
        }

        const passwordHash = await bcrypt.hash(data.password, 12)

        const [newUser] = await db.insert(users).values({
            firstName: data.firstName,
            lastName: data.lastName,
            username: data.username,
            passwordHash: passwordHash
        }).returning({
            userId: users.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username
        })

        const accessToken = issueAccessToken(newUser.userId)
        const refreshToken = issueRefreshToken(newUser.userId)

        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: newUser.userId,
            expiresAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
            revoked: false
        })

        setAuthCookie(res, accessToken, refreshToken)

        return res.status(201).json({user: newUser})
    }catch (error){
        console.error(error)

        return res.status(500).json({message: 'Failed to register user'})
    }
})