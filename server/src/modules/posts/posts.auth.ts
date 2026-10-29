import { Router } from "express";
import { db } from "../../db";
import { eq, isNull, desc, inArray, sql, and } from "drizzle-orm";
import { optionalAuthenticateToken } from "../../middleware/optionAuthenticateToken";
import { AuthenticateReqest } from "../../middleware/authenticateRefreshToken";
import { users, posts, postMedia, media, likes, comments } from "../../db/schema";
import { authenticateAccessToken } from "../../middleware/authenticateAccessToken";

import z from 'zod'


const router = Router()

const createPostSchema = z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(100, 'Title cannot exceed 100 characters'),
    description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),
    mediaId: z.uuid().optional()
})


const updatePostSchema = z.object({
    title: z.string().trim().min(1, 'Title cannot be empty').max(100, 'Title cannot exceed 100 characters').optional(),
    description: z.string().trim().max(5000, 'Description cannot exceed 5000 characters').optional(),
    mediaId: z.uuid().optional()
})

type PostMediaItem = {
    mediaId: string,
    type: string
    storageKey: string,
    mimeType: string,
    width: number | null
    height: number | null
    duration: number | null
    url: string
}

function getMediaUrl(storageKey: string, req: AuthenticateReqest) {
    return `${req.protocol}://${req.get('host')}/uploads/${storageKey}`
}

async function getOwnedVideo(mediaId: string, userId: string){
    const [item] = await db.select({
        mediaId: media.mediaId,
        type: media.type,
        storageKey:media.storageKey,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        duration: media.duration
    })
    .from(media)
    .where(
        and(
            eq(media.mediaId, mediaId),
            eq(media.uploadedBy, userId)
        )
    )
    .limit(1)

    if(!item) {
        return {
            success: false,
            error: 'Media not found or you do not own this media',
            status: 403,
        } as const
    }

    if(item.type !== 'video') {
        return {
            success: false,
            error: 'Posts can only contain video media',
            status: 400,
        } as const
    }

    return { success: true, item} as const
}

async function getPostWithDetails(postId: string, currentUserId: string | null, req: AuthenticateReqest){
    const [post] = await db.select({
        postId: posts.postId,
        title: posts.title,
        description: posts.description,
        createdAt: posts.createdAt,
        updatedAt: posts.updatedAt,

        userId: users.userId,
        username: users.username,

        likeCount: sql<number>`
            (
                SELECT COUNT(*)::int
                FROM ${likes}
                WHERE ${likes.postId} = ${posts.postId}
            )
        `.as('likeCount'),

        likedByCurrentUser: currentUserId
            ? sql<boolean>`
                (
                    SELECT 1
                    FROM ${likes}
                    WHERE ${likes.postId} = ${posts.postId}
                    AND ${likes.userId} = ${currentUserId}
                )
            `.as('likedByCurrentUser')
            : sql<boolean>`false`.as('likedByCurrentUser'),

        commentCount: sql<number>`
            (
                SELECT COUNT(*)::int
                FROM ${comments}
                WHERE ${comments.postId} = ${posts.postId}
                AND ${comments.deletedAt} IS NULL
            )
        `.as('commentCount'),

        mediaId: media.mediaId,
        mediaType: media.type,
        storageKey: media.storageKey,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        duration: media.duration,
    })
    .from(posts)
    .leftJoin(users, eq(posts.userId, users.userId))
    .leftJoin(media, eq(posts.mediaId, media.mediaId))
    .where(
        and(
            eq(posts.postId, postId),
            isNull(posts.deletedAt)
        )
    )
    .limit(1)

    if(!post){
        return null
    }

    const postMedia: PostMediaItem | null =
        post.mediaId &&
        post.mediaType &&
        post.storageKey &&
        post.mimeType
            ? {
                mediaId: post.mediaId,
                type: post.mediaType,
                storageKey: post.storageKey,
                mimeType: post.mimeType,
                width: post.width,
                height: post.height,
                duration: post.duration,
                url: getMediaUrl(post.storageKey, req),
            }
            : null

    return {
        postId: post.postId,
        title: post.title,
        description: post.description,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        userId: post.userId,
        username: post.username,
        likeCount: post.likeCount,
        likedByCurrentUser: post.likedByCurrentUser,
        commentCount: post.commentCount,
        media: postMedia,
    }
}

router.get('/all', optionalAuthenticateToken, async (req: AuthenticateReqest, res) => {
    const currentUserId = req.user?.userId ?? null

    try{
        const page = Math.max(Number.parseInt(String(req.query.page), 10) || 1, 1)
        const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit), 10) || 10, 1), 50)
        const offset = (page - 1) * limit

        const result = await db.select({
            postId: posts.postId,
            title: posts.title,
            description: posts.description,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,

            userId: users.userId,
            username: users.username,

            likeCount: sql`
                (
                    SELECT COUNT(*)::int
                    FROM ${likes}
                    WHERE ${likes.postId} = ${posts.postId}
                )
            `.as('likeCount'),

            likedByCurrentUser: currentUserId
                ? sql`
                        EXISTS (
                            SELECT 1
                            FROM ${likes}
                            WHERE ${likes.postId} = ${posts.postId}
                            AND ${likes.userId} = ${currentUserId}
                        )
                `.as('likedByCurrentUser')
                :sql`false`.as('likedByCurrentUser'),

            commentCount: sql`
                (
                    SELECT COUNT(*)::int
                    FROM ${comments}
                    WHERE ${comments.postId} = ${posts.postId}
                    AND ${comments.deletedAt} IS NULL
                )
            `.as('commentCount'),

            mediaId: media.mediaId,
            mediaType: media.type,
            storageKey: media.storageKey,
            mimeType: media.mimeType,
            width: media.width,
            height: media.height,
            duration: media.duration

        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.userId))
        .leftJoin(media, eq(posts.mediaId, media.mediaId))
        .where(isNull(posts.deletedAt))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset)

        const [{count: total}] = await db.select({
            count: sql<number>`COUNT(*)::int`.as('count')
        })
        .from(posts)
        .where(isNull(posts.deletedAt))

        const postsWithMedia = result.map((post) => {
            const postMedia: PostMediaItem | null = 
                post.mediaId &&
                post.mediaType &&
                post.storageKey &&
                post.mimeType
                        ? {
                            mediaId: post.mediaId,
                            type: post.mediaType,
                            storageKey: post.storageKey,
                            mimeType: post.mimeType,
                            width: post.width,
                            height: post.height,
                            duration: post.duration,
                            url: getMediaUrl(post.storageKey, req),
                        }
                        : null

            return {
                    postId: post.postId,
                    title: post.title,
                    description: post.description,
                    createdAt: post.createdAt,
                    updatedAt: post.updatedAt,
                    userId: post.userId,
                    username: post.username,
                    likeCount: post.likeCount,
                    likedByCurrentUser: post.likedByCurrentUser,
                    commentCount: post.commentCount,
                    media: postMedia,
                }
        })

        const totalPages = Math.ceil(total / limit)

        return res.status(200).json({
            posts: postsWithMedia,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        })


    
    }catch (error) {
        console.error(error)

        return res.status(500).json({error: 'Failed to retrieve post'})
    }
})

router.get('/:id', optionalAuthenticateToken, async(req: AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId ?? null

        const currentPostId = req.params.id as string

        const post = await getPostWithDetails(currentPostId, currentUserId, req)

        if(!post){
            return res.status(404).json({error: 'Post not found'})
        }

        return res.status(200).json({post})
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to get post'})
    }
})

router.post('/', authenticateAccessToken, async (req: AuthenticateReqest, res) => {
    const validation = createPostSchema.safeParse(req.body)
    if(!validation.success){
        return res.status(400).json({error: z.treeifyError(validation.error)})
    }

    const userId = req.user?.userId

    if(!userId){
        return res.status(401).json({error: 'Authentication requred'})
    }

    const {title, description, mediaId} = validation.data

    try{

        if(mediaId){
            const result = await getOwnedVideo(mediaId, userId)

            if(!result.success) {
                return res.status(result.status).json({
                    error: result.error
                })
            }
        }
        const [newPost] = await db.insert(posts).values({
            userId,
            title,
            description,
            mediaId: mediaId ?? null
        })
        .returning({postId:posts.postId})

        const post = await getPostWithDetails(newPost.postId, userId, req)

        return res.status(201).json({
            message: 'Post created successfully',
            post
        })
        
        
    } catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to create post'})
    }
})

router.patch('/:id', authenticateAccessToken, async(req:AuthenticateReqest, res) => {
    try{
        const validation = updatePostSchema.safeParse(req.body)
        if(!validation.success){
            return res.status(400).json({error: z.treeifyError(validation.error)})
        }
        const currentUserId = req.user?.userId
        const currentPostId = req.params.id as string

        const {title, description, mediaId} = validation.data

        const [existingPost] = await db.select({
            postId: posts.postId,
            userId: posts.userId
        })
        .from(posts)
        .where(
            and(
                eq(posts.postId, currentPostId),
                isNull(posts.deletedAt)
            )
        )
        .limit(1)

        if(!existingPost){
            return res.status(404).json({error: 'Post not found'})
        }

        if(existingPost.userId !== currentUserId){
            return res.status(403).json({error: 'You cannot update a post you do not own'})
        }

        if(mediaId){
            const result = await getOwnedVideo(mediaId, currentUserId)

            if(!result.success){
                return res.status(result.status).json({error: result.error})
            }
        }

        const updateValues: {
            title?: string
            description?: string
            mediaId?: string | null
            updatedAt: Date
        } = {
            updatedAt: new Date()
        }

        if(title !== undefined){
            updateValues.title = title
        }

        if(description !== undefined){
            updateValues.description = description
        }

        if(mediaId !== undefined){
            updateValues.mediaId = mediaId
        }

        await db.update(posts).set(updateValues).where(eq(posts.postId, currentPostId))

        const updatedPost = await getPostWithDetails(currentPostId, currentUserId, req)

        return res.status(200).json({
            message: 'Post updated successfully',
            post: updatedPost
        })
        
    }catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to updated post'})
    }
})