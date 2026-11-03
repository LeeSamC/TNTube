import { Router } from "express";
import { authenticateAccessToken, AuthenticateRequest } from "../../middleware/authenticateAccessToken";
import { subscriptions, users } from "../../db/schema";

import { db } from "../../db";
import { eq, and } from "drizzle-orm";
import { createNotification } from "../notifications/notifications.routes";

const router = Router()

router.post('/:id', authenticateAccessToken, async (req: AuthenticateRequest, res) => {
    try{
        const currentUserId = req.user?.userId
        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        const subscribeeId = req.params.id as string

        const [subscribee] = await db.select({
            userId: users.userId,
            username: users.username
        })
        .from(users)
        .where(
            eq(users.userId, subscribeeId)
        ).limit(1)

        if(!subscribee){
            return res.status(404).json({error: 'User you are trying to subscribe to cannot be found'})
        }

        if(subscribee.userId === currentUserId){
            return res.status(400).json({error: 'Cannot follow yourself'})
        }

        const existingSub = await db.query.subscriptions.findFirst({where: and(
            eq(subscriptions.subscriberId, currentUserId),
            eq(subscriptions.subscribeeId, subscribee.userId)
        )})

        if(existingSub){
            return res.status(409).json({error: 'You are already following this user'})
        }

        await db.insert(subscriptions).values({
            subscribeeId: subscribee.userId,
            subscriberId: currentUserId
        })

        await createNotification({
            recipientId: subscribee.userId,
            actorId: currentUserId,
            type: 'subscribe',
            postId: null,
            commentId: null,
            reactionId: null
        })

        return res.status(201).json({
            message: 'User subscribed successfully',
            isSubscribed: true
        })
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to follow user'})
    }
})

router.delete('/:id', authenticateAccessToken, async (req: AuthenticateRequest, res) => {
    try{
        const currentUserId = req.user?.userId
        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        const subscribeeId = req.params.id as string

        const [subscribee] = await db.select({
            userId: users.userId,
            username: users.username
        })
        .from(users)
        .where(
            eq(users.userId, subscribeeId)
        )
        .limit(1)

        if(!subscribee){
            return res.status(404).json({error: 'User not found'})
        }

        const [deleteSub] = await db.delete(subscriptions).where(
            and(
                eq(subscriptions.subscribeeId, subscribee.userId),
                eq(subscriptions.subscriberId, currentUserId)
            )
        ).returning({
            subscribeeId: subscriptions.subscribeeId,
            subscriberId: subscriptions.subscriberId
        })

        if(!deleteSub){
            return res.status(404).json({error: 'You are not following this user'})
        }

        return res.status(200).json({
            message: 'User unsubscribed',
            isSubscribed: false
        })
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to unsubscribe'})
    }
})