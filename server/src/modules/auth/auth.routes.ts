import { duration } from 'drizzle-orm/gel-core'
import {Router} from 'express'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { eq, and } from 'drizzle-orm'
import { db } from '../../db'
import {z} from 'zod'

import { refreshTokens, users } from '../../db/schema'
import { authenticateRefreshToken, AuthenticateReqest } from '../../middleware/authenticateRefreshToken'
import { authenticateAccessToken } from '../../middleware/authenticateAccessToken'

const router = Router()

const loginSchema = z.object({
    username: z.string().min(3).max(50),
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

function issueAccessToken(userId:string){
    if(!process.env.ACCESS_TOKEN_SECRET){
        throw new Error('Access token secret not configured')
    }

    return jwt.sign(userId, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '30m'})
}

function issueRefreshToken(userId: string){
    if(!process.env.REFRESH_TOKEN_SECRET){
        throw new Error('Refresh token secret not configured')
    }

    return jwt.sign(userId, process.env.REFRESH_TOKEN_SECRET, {expiresIn: '7d'})
}

function setAuthCookies(res:any, accessToken: string, refreshToken:string){
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
        maxAge: 7 * 24 * 60 * 60 * 100
    })
}

function clearAuthCookies(res:any){
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
            return res.status(401).json({message: 'Username or password invalid'})
        }

        const validPassword = await bcrypt.compare(data.password, user.passwordHash)

        if(!validPassword){
            return res.status(401).json({message: 'Username or password invalid'})
        }

        await db.delete(refreshTokens).where(eq(refreshTokens.userId, user.userId))

        const accessToken = issueAccessToken(user.userId)
        const refreshToken = issueRefreshToken(user.userId)

        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: user.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revoked: false
        })

        setAuthCookies(res, accessToken, refreshToken)

        return res.status(200).json({
            message: 'User successfully logged in',
            user: {
                userId: user.userId,
                firstName: user.firstName,
                lastName: user.lastName,
                username: user.username
            }
        })
    }catch (error){
        console.error(error)

        return res.status(500).json({message: 'Failedt to log in'})
    }
})

router.post('/register', async (req, res) => {
    try{
        const data = registerSchema.parse(req.body)

        const user = await db.query.users.findFirst({where: eq(users.username, data.username)})

        if(user){
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
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revoked: false
        })

        setAuthCookies(res, accessToken, refreshToken)

        return res.status(201).json({
            message: 'Successfully registered user',
            user: newUser
        })
    }catch (error){
        console.error(error)

        return res.status(500).json({message: 'Failed to register user'})
    }
})

router.post('/refresh', authenticateRefreshToken, async (req: AuthenticateReqest, res) => {
    try{
        if(!req.user){
            return res.status(401).json({error: 'Authentication Required'})
        }

        const oldRefreshToken = req.cookies.refreshToken

        if(!oldRefreshToken){
            return res.status(401).json({message: 'Refresh token required'})
        }

        const user = await db.query.users.findFirst({where: eq(users.userId, req.user.userId)})

        if(!user){
            clearAuthCookies(res)
            return res.status(404).json({message: 'User not found'})
        }

        await db.update(refreshTokens).set({revoked: true}).where(eq(refreshTokens.token, oldRefreshToken))

        const accessToken = issueAccessToken(user.userId)
        const refreshToken = issueRefreshToken(user.userId)

        await db.insert(refreshTokens).values({
            token: refreshToken,
            userId: user.userId,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            revoked: false
        })

        setAuthCookies(res, accessToken, refreshToken)

        return res.json({
            message: 'Successfully refreshed tokens',
            user: {userId: user.userId}
        })
    }catch (error) {
        console.log(error)

        return res.status(500).json({message: 'Failed to refresh tokens'})
    }
})

router.post('/logout', async (req, res) => {
    try{
        const refreshToken = req.cookies.refreshToken

        if(refreshToken) {
            await db.update(refreshTokens).set({revoked: true}).where(eq(refreshTokens.token, refreshToken))
        }

        clearAuthCookies(res)

        return res.status(200).json({message: 'Successfully logged out'})
    }catch (error) {
        console.error(error)

        return res.status(500).json({message: 'Failed to log out'})
    }
})

router.get('/me', authenticateAccessToken, async(req: AuthenticateReqest, res) => {
    try{
        if(!req.user){
            return res.status(401).json({message: 'Authentication requred'})
        }

        const result = await db.select({
            userId: users.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            
        })
        .from(users)
        .where(
            eq(users.userId, req.user.userId)
        )
        .limit(1)

        const user = result[0]

        if(!user){
            return res.status(404).json({message: 'User not found'})
        }

        return res.status(200).json({user})

    }catch (error){
        console.error(error)

        return res.status(500).json({message: "Failed to fetch user"})
    }
    
})
