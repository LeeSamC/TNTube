import { Router } from "express";
import { authenticateAccessToken } from "../../middleware/authenticateAccessToken";
import { db } from "../../db";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { comments, posts, users } from "../../db/schema";
import { AuthenticateReqest } from "../../middleware/authenticateRefreshToken";
import z from "zod";
import { createNotification } from "../notifications/notifications.routes";

const createCommentSchema = z.object({
    content: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment content cannot exceed 2000 characters'),
    parentCommentId: z.uuid().nullable().optional().default(null)
})

const updateCommentSchema = z.object({
    content: z.string().trim().min(1, 'Comment cannot be empty').max(2000, 'Comment cannot exceed 2000 characters')
})


const router = Router()

router.get('/:id', async (req, res) => {
    try{
        const currentPostId = req.params.id as string

        const post = await db.query.posts.findFirst({where: eq(posts.postId, currentPostId)})

        if(!post){
            return res.status(404).json({error: 'Post not found'})
        }

        const result = await db.select({
            commentId: comments.commentId,
            postId: comments.postId,
            parentCommentId: comments.parentCommentId,
            content: comments.content,
            createdAt: comments.createdAt,
            updatedAt: comments.updatedAt,

            userId: users.userId,
            username: users.username
        })
        .from(comments)
        .innerJoin(
            users,
            eq(comments.userId, users.userId)
        )
        .where(
            and(
                eq(comments.postId, currentPostId),
                isNull(comments.deletedAt)
            )
        )
        .orderBy(asc(comments.createdAt))

        const commentMap = new Map()

        for(const comment of result ){
            commentMap.set(
                comment.commentId,
                {
                    ...comment,
                    replies: []
                }
            )
        }

        const rootComments = []

        for(const comment of commentMap.values()){
            if(comment.parentCommentId){
                const parent = commentMap.get(comment.parentCommentId)

                if(parent){
                    parent.replies.push(comment)
                }
            }else{
                rootComments.push(comment)
            }
        }

        return res.status(200).json({comments: rootComments})
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to fetch comments'})
    }
})

router.post('/:id', authenticateAccessToken, async (req: AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId
        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        const currentPostId = req.params.id as string

        const validation = createCommentSchema.safeParse(req.body)

        if(!validation.success){
            return  res.status(400).json({error: validation.error.flatten().fieldErrors})
        }

        const {content, parentCommentId} = validation.data

        const post = await db.query.posts.findFirst({where: and(
            eq(posts.postId, currentPostId),
            isNull(posts.deletedAt)
        )})

        if(!post){
            return res.status(404).json({error: 'Post not found'})
        }

        let parentComment = null

        if(parentCommentId){
            [parentComment] = await db.select({
                commentId: comments.commentId,
                postId: comments.postId,
                userId: comments.userId
            })
            .from(comments)
            .where(
                and(
                    eq(comments.commentId, parentCommentId),
                    eq(comments.postId, currentPostId),
                    isNull(comments.deletedAt)
                )
            )
            .limit(1)
        }

        const [newComment] = await db.insert(comments).values({
            postId: currentPostId,
            userId: currentUserId,
            parentCommentId,
            content
        })
        .returning()

        if(parentComment && parentComment.userId !== currentUserId){
            await createNotification({
                recipientId: post.userId,
                actorId: currentUserId,
                type: 'comment',
                postId: currentPostId,
                commentId: newComment.commentId,
                reactionId: null
            })
        }

        if(post.userId !== currentUserId && (!parentComment || parentComment.userId !== post.userId)){
            await createNotification({
                recipientId: post.userId,
                actorId: currentUserId,
                type: 'comment',
                postId: currentPostId,
                commentId: newComment.commentId,
                reactionId: null
            })
        }

        return res.status(200).json({
            message: parentCommentId ? 'Reply created successfully': 'Comment created sucessfully',
            comment: newComment
        })

    }catch (error){
        console.error('Create comment error', error)

        return res.status(500).json({error: 'Failed to create comment'})
    }
})

router.patch('/:id', authenticateAccessToken, async (req: AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId
        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        const currentCommentId = req.params.id as string

        const validation = updateCommentSchema.safeParse(req.body)

        if(!validation.success){
            return res.status(400).json({error: validation.error.flatten().fieldErrors})
        }

        const [updatedComment] = await db.update(comments).set({
            content: validation.data.content,
            updatedAt: new Date()
        })
        .where(
            and(
                eq(comments.commentId, currentCommentId),
                eq(comments.userId, currentUserId),
                isNull(comments.deletedAt)
            )
        )
        .returning()

        if(!updatedComment){
            return res.status(404).json({error: 'Comment not found'})
        }

        return res.status(200).json({
            message: 'Comment updated sucessfully',
            comment: updatedComment
        })
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to update comment'})
    }
})

router.delete('/:id', authenticateAccessToken, async (req: AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId
        if(!currentUserId){
            return res.status(401).json({error: 'Authorization required'})
        }

        const currentCommentId = req.params.id as string

        const [deletedComment] = await db.delete(comments).where(
            and(
                eq(comments.commentId, currentCommentId),
                eq(comments.userId, currentUserId),
                isNull(comments.deletedAt)
            )
        )
        .returning({
            commentId: comments.commentId
        })

        if(!deletedComment){
            return res.status(404).json({error: 'Comment not found'})
        }

        return res.status(200).json({message: 'Comment deleted successfuly'})
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to delete comment'})
    }
})