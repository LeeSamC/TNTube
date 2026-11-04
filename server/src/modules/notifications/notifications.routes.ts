import { Router } from "express";
import { authenticateAccessToken } from "../../middleware/authenticateAccessToken";
import { AuthenticateReqest } from "../../middleware/authenticateRefreshToken";
import { db } from "../../db";
import { eq, and, desc, sql } from "drizzle-orm";
import { notifications, postReactions, users } from "../../db/schema";
import { not } from "drizzle-orm";

const router = Router()


type CreateNotificationParams ={
    recipientId: string,
    actorId: string,
    type: string,
    postId: string | null,
    commentId: string | null,
    reactionId: string | null
}

export const createNotification = async({recipientId, actorId, type, postId = null, commentId = null, reactionId = null}: CreateNotificationParams) => {
    if(recipientId === actorId){
        return
    }

    await db.insert(notifications).values({
        recipientId,
        actorId,
        type,
        postId,
        commentId,
        reactionId
    })
}

router.get('/', authenticateAccessToken, async(req:AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId

        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        const notificationResult = await db.select({
            notificationId: notifications.notificationId,
            type: notifications.type,
            isRead: notifications.isRead,
            createdAt: notifications.createdAt,
            actorId: notifications.actorId,
            actorUserName: users.username,
            postId: notifications.postId,
            commentId: notifications.commentId,
            reactionId: notifications.reactionId,
            reactionType: postReactions.type
        })
        .from(notifications)
        .innerJoin(
            users,
            eq(notifications.actorId, users.userId)
        )
        .leftJoin(
            postReactions,
            eq(notifications.reactionId, postReactions.reactionId)
        )
        .where(
            eq(notifications.recipientId, currentUserId)
        )
        .orderBy(desc(notifications.createdAt))
        .limit(10)

        const formattedNotifications = notificationResult.map(n => ({
            notificatonId: n.notificationId,
            type: n.type,
            isRead: n.isRead,
            createdAt: n.createdAt,
            actor: {
                userId: n.actorId,
                username: n.actorUserName
            },
            postId: n.postId,
            commentId: n.commentId,
            reaction: {
                reactionId: n.reactionId,
                type: n.reactionType
            }
            
        }))

        res.status(200).json({notifications: formattedNotifications})
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to fetch notifications'})
    }
})

router.get('/unread',authenticateAccessToken, async (req:AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId

        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        const [result] = await db.select({
            count: sql`COUNT(*)::int`
        })
        .from(notifications)
        .where(
            and(
                eq(notifications.recipientId, currentUserId),
                eq(notifications.isRead, false)
            )
        )

        res.status(200).json({unreadCount: Number(result.count)})
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to fetch unread count'})
    }
})

router.patch('/:id/read', authenticateAccessToken, async(req: AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId
        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        const currentNotificationId = req.params.id as string

        const [notification] = await db.update(notifications).set({
            isRead: true
        })
        .where(
            and(
                eq(notifications.notificationId, currentNotificationId),
                eq(notifications.recipientId, currentUserId),
                eq(notifications.isRead, false)
            )
        )
        .returning({
            notificationId: notifications.notificationId
        })

        if(!notification){
            return res.status(404).json({error: 'Notification not found'})
        }

        return res.status(200).json({message: 'Notification marked as read'})
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to mark notification as read'})
    }
})

router.patch('/read-all', authenticateAccessToken, async (req:AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId

        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        await db.update(notifications).set({
            isRead: true
        })
        .where(
            and(
                eq(notifications.recipientId, currentUserId),
                eq(notifications.isRead, false)
            )
        )

        return res.status(200).json({message: 'Marked all notifications as read'})
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to mark all notifications as read'})
    }
})

export default router