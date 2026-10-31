import { Router } from "express";
import { authenticateAccessToken } from "../../middleware/authenticateAccessToken";
import { AuthenticateReqest } from "../../middleware/authenticateRefreshToken";

import { db } from "../../db";
import { eq, and, isNull } from "drizzle-orm";
import { postReactions, posts } from "../../db/schema";
import z from 'zod'

const router = Router()

const reactionSchema = z.object({
    type: z.enum(['LIKE', 'DISLIKE']),
})

router.get('/:id', authenticateAccessToken, async (req: AuthenticateReqest, res) => {
    try{
        const currentPostId = req.params.id as string

        const currentUserId = req.user?.userId

        if(!currentUserId){
            return res.status(401).json({error: 'Authentication required'})
        }

        const post = await db.query.posts.findFirst({where: and(
            eq(posts.postId, currentPostId),
            isNull(posts.deletedAt)
        )})

        if(!post){
            return res.status(404).json({error: 'Post not found'})
        }

        const reaction = await db.query.postReactions.findFirst({where: and(
            eq(postReactions.postId, currentPostId),
            eq(postReactions.userId, currentUserId)
        )})

        return res.status(200).json({
            reaction: reaction ?? null,
            currentUserReaction: reaction?.type ?? null
        })
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to fetch reaction'})
    }
})

router.put('/:id', authenticateAccessToken, async (req: AuthenticateReqest, res) => {
    try{
        const currentPostId = req.params.id as string
        const currentUserId = req.user?.userId

        if(!currentUserId){
            return res.status(401).json({error: 'Authentication required'})
        }
        
        const validation = reactionSchema.safeParse(req.body)
        if(!validation.success){
            return res.status(400).json({
                error: z.treeifyError(validation.error)
            })
        }

        const {type} = validation.data

        const post = await db.query.posts.findFirst({where: and(
            eq(posts.postId, currentPostId),
            isNull(posts.deletedAt)
        )})

        if(!post){
            return res.status(404).json({error: 'Post not found'})
        }

        const [reaction] = await db.insert(postReactions).values({
            postId: currentPostId,
            userId: currentUserId,
            type
        })
        .onConflictDoUpdate({
            target: [
                postReactions.postId,
                postReactions.userId
            ],
            set: {
                type,
                createdAt: new Date()
            }
        })
        .returning({
            reactionId: postReactions.reactionId,
            postId: postReactions.postId,
            userId: postReactions.userId,
            type: postReactions.type,
            createdAt: postReactions.createdAt
        })

        return res.status(200).json({
            message: 'Reaction saved successfully',
            reaction
        })

    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to save reaction'})
    }
})

router.delete('/:id', authenticateAccessToken, async (req:AuthenticateReqest, res) => {
    try{
        const currentPostId = req.params.id as string
        const currentUserId = req.user?.userId

        if(!currentUserId){
            return res.status(401).json({error: 'Authentication required'})
        }

        const post = await db.query.posts.findFirst({where: and(
            eq(posts.postId, currentPostId),
            isNull(posts.deletedAt)
        )})

        if(!post){
            return res.status(404).json({error: 'Post not found'})
        }

        const [deletedReaction] = await db.delete(postReactions).where(
            and(
                eq(postReactions.postId, currentPostId),
                eq(postReactions.userId, currentUserId)
            )
        )
        .returning({
            reactionId: postReactions.reactionId
        })

        if(!deletedReaction){
            return res.status(404).json({error: 'Reaction not found'})
        }

        return res.status(200).json({message: 'Reaction removed successfully'})

    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to remove reaction'})
    }
})