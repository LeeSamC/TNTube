import { Router } from "express";
import { db } from "../../db";
import { eq, sql } from "drizzle-orm";
import { posts, subscriptions, users } from "../../db/schema";
import z from "zod";
import { authenticateAccessToken } from "../../middleware/authenticateAccessToken";
import { AuthenticateReqest } from "../../middleware/authenticateRefreshToken";

const clientUrl = process.env.CLIENT_URL

if(!clientUrl){
    throw new Error('CLIENT_URL is not configured')
}

const clientOrigin = new URL(clientUrl).origin

const profileSchema = z.object({
    firstName: z.string().trim().min(3).max(50),
    lastName: z.string().trim().min(3).max(50),
    username: z.string().trim().min(3).max(50)
}).strict()

const router = Router()

router.get('/:id', async(req, res) => {
    const validation = z.uuid().safeParse(req.params.id)

    if(!validation.success){
        return res.status(400).json({message: 'Invalid user Id'})
    }

    try{
        const [profile] = await db.select({
            userId: users.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            createdAt: users.createdAt,

            postCount: sql<Number>`(
                SELECT COUNT(*)::int
                FROM ${posts}
                WHERE ${posts.userId} = ${users.userId}
                AND ${posts.deletedAt} IS NULL
            )`,

            subscriberCount: sql<Number>`(
                SELECT COUNT(*)::int
                FROM ${subscriptions}
                WHERE ${subscriptions.subscribeeId} = ${users.userId}
            )`,

            subscriptionCount: sql<Number>`(
                SELECT COUNT(*)::int
                FROM ${subscriptions}
                WHERE ${subscriptions.subscriberId} = ${users.userId}
            )`,
        })
        .from(users)
        .where(
            eq(users.userId, validation.data)
        )
        .limit(1)

        if(!profile){
            return res.status(404).json({message: 'User not found'})
        }

        return res.json({profile})

    }catch (error) {
        console.error(error)

        return res.status(500).json({message: 'Could not load this profile'})
    }


})


router.patch('/me', authenticateAccessToken, async(req: AuthenticateReqest, res) => {
    const userId = req.user?.userId

    if(!userId){
        return res.status(401).json({message: 'Authentication required'})
    }

    if(req.get('origin') !== clientOrigin){
        return res.status(403).json({message: 'Request origin is not allowed'})
    }

    const validation = profileSchema.safeParse(req.body)

    if(!validation.success){
        return res.status(400).json({
            message: validation.error.issues[0]?.message
                ?? 'Invalid profile details'
        })
    }

    try{
        const [user] = await db.update(users).set(validation.data).where(
            eq(users.userId, userId)
        )
        .returning({
            userId: users.userId,
            firstName: users.firstName,
            lastName: users.lastName,
            username: users.username,
            createdAt: users.createdAt
        })

        if(!user){
                return res.status(404).json({message: 'User not found'})
        }

        return res.json({user})

    }catch (error){
        const databaseError = error as {
            code?: string
            cause?: {code?: string}
        }

        if(databaseError?.code === '23505' || databaseError?.cause?.code === '23505') {
            return res.status(409).json({message: 'That username is already taken'})
        }

        console.error(error)

        return res.status(500).json({message: 'Could not update your profile'})
    }
})



export default router