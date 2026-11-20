import { Router } from "express";
import { db } from "../../db";
import { eq, isNull, desc, sql, and, or } from "drizzle-orm";
import { optionalAuthenticateToken } from "../../middleware/optionAuthenticateToken";
import { AuthenticateReqest } from "../../middleware/authenticateRefreshToken";
import { users, posts, postMedia, media, comments, postReactions, postViews } from "../../db/schema";
import { authenticateAccessToken } from "../../middleware/authenticateAccessToken";

import z from 'zod'
import {rateLimit} from 'express-rate-limit'


const router = Router()

const viewLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 60,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: {error: 'Too many view requests. Try again'}
})

const clientUrl = process.env.CLIENT_URL

if(!clientUrl){
    throw new Error('CLIENT_URL is not configured')
}

const clientOrigin = new URL(clientUrl).origin

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
        viewCount: posts.viewCount,

        userId: users.userId,
        username: users.username,

        likeCount: sql<number>`
            (
                SELECT COUNT(*)::int
                FROM ${postReactions}
                WHERE ${postReactions.postId} = ${posts.postId}
                AND ${postReactions.type} = 'LIKE'
            )
        `.as('likeCount'),

        dislikeCount: sql<number>`
            (
                SELECT COUNT(*)::int
                FROM ${postReactions}
                WHERE ${postReactions.postId} = ${posts.postId}
                AND ${postReactions.type} = 'DISLIKE'
            )
        `.as('dislikeCount'),

        currentUserReaction: currentUserId
            ? sql<'LIKE' | 'DISLIKE' | null>`
                (
                    SELECT ${postReactions.type}
                    FROM ${postReactions}
                    WHERE ${postReactions.postId} = ${posts.postId}
                    AND ${postReactions.userId} = ${currentUserId}
                    LIMIT 1
                )
            `.as('currentUserReaction')
            : sql<'LIKE' | 'DISLIKE' | null>`
                NULL
            `.as('currentUserReaction'),

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
        viewCount: post.viewCount,

        userId: post.userId,
        username: post.username,

        likeCount: post.likeCount,
        dislikeCount: post.dislikeCount,
        currentUserReaction: post.currentUserReaction,
        commentCount: post.commentCount,
        media: postMedia,
    }
}

router.get('/all', optionalAuthenticateToken, async (req: AuthenticateReqest, res) => {
    const currentUserId = req.user?.userId ?? null

    const search = z.string()
        .trim()
        .max(100)
        .refine(term => !term.includes('/0'))
        .optional()
        .safeParse(req.query.q)

    if(!search.success){
        return res.status(400).json({message: 'Enter a single search term of up to 100 characters'})
    }

    const filters = z.object({
        authorId: z.uuid().optional(),
        liked: z.enum(['true', 'false']).optional(),
    }).safeParse({
        authorId: req.query.authorId,
        liked: req.query.liked
    })

    if(!filters.success){
        return res.status(400).json({message: 'Invalid post filters'})
    }

    const likedOnly = filters.data.liked === 'true'

    if(likedOnly && !currentUserId){
        return res.status(401).json({message: 'Sign in to view your liked posts'})
    }

    if(likedOnly){
        res.setHeader('Cache-Control', 'private, no-store')
    }

    const term = search.data

    const visiblePosts = and(
        isNull(posts.deletedAt),

        filters.data.authorId
            ? eq(posts.userId, filters.data.authorId)
            : undefined,

        likedOnly
            ? sql`EXIST (
                SELECT 1
                FROM ${postReactions}
                WHERE ${postReactions.postId} = ${posts.postId}
                AND ${postReactions.userId} = ${currentUserId}
                AND ${postReactions.type} = 'LIKE'
            )`
            : undefined,

        term
            ? or(
                sql`strpos(lower(${posts.title}), lower(${term})) > 0`,
                sql`strpos(lower(${users.username}), lower(${term})) > 0`,
            )
            :undefined
    )

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
            viewCount: posts.viewCount,

            userId: users.userId,
            username: users.username,

            likeCount: sql<number>`
                (
                    SELECT COUNT(*)::int
                    FROM ${postReactions}
                    WHERE ${postReactions.postId} = ${posts.postId}
                    AND ${postReactions.type} = 'LIKE'
                )
            `.as('likeCount'),

            dislikeCount: sql<number>`
                (
                    SELECT COUNT(*)::int
                    FROM ${postReactions}
                    WHERE ${postReactions.postId} = ${posts.postId}
                    AND ${postReactions.type} = 'DISLIKE'
                )
            `.as('dislikeCount'),

            currentUserReaction: currentUserId
                ? sql<'LIKE' | 'DISLIKE' | null>`
                    (
                        SELECT ${postReactions.type}
                        FROM ${postReactions}
                        WHERE ${postReactions.postId} = ${posts.postId}
                        AND ${postReactions.userId} = ${currentUserId}
                        LIMIT 1
                    )
                `.as('currentUserReaction')
                : sql<'LIKE' | 'DISLIKE' | null>`
                    NULL
                `.as('currentUserReaction'),

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
            duration: media.duration

        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.userId))
        .leftJoin(media, eq(posts.mediaId, media.mediaId))
        .where(visiblePosts)
        .orderBy(desc(posts.createdAt), desc(posts.postId))
        .limit(limit)
        .offset(offset)

        const [{count: total}] = await db.select({
            count: sql<number>`COUNT(*)::int`.as('count')
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.userId))
        .where(visiblePosts)

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
                    viewCount: post.viewCount,
                    userId: post.userId,
                    username: post.username,
                    likeCount: post.likeCount,
                    dislikeCount: post.dislikeCount,
                    currentUserReaction: post.currentUserReaction,
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

router.delete('/:id', authenticateAccessToken, async (req:AuthenticateReqest, res) => {
    try{
        const currentUserId = req.user?.userId
        const currentPostId = req.params.id as string

        if(!currentUserId){
            return res.status(401).json({error: 'Authentication required'})
        }

        const [existingPost] = await db.select({
            postId: posts.postId,
            userId: posts.userId
        })
        .from(posts)
        .where(
            and(
                eq(posts.postId, currentPostId),
                eq(posts.userId, currentUserId),
                isNull(posts.deletedAt)
            )
        )
        .limit(1)

        if(!existingPost){
            return res.status(404).json({error: 'Post not found'})
        }

        await db.update(posts).set({
            deletedAt: new Date()
        })
        .where(
            eq(posts.postId, existingPost.postId)
        )

        return res.status(200).json({message: 'Deleted post sucessfully'})
    }catch (error) {
        console.error(error)

        return res.status(500).json({error: 'Failed to delete post'})
    }
})


router.post('/:id/views', viewLimiter,optionalAuthenticateToken, async(req: AuthenticateReqest, res) => {

    const parsedId = z.uuid().safeParse(req.params.id)

    if(!parsedId.success){
        return res.status(400).json({error: 'Invalid post ID'})
    }
    
    if(req.get('origin') !== process.env.CLIENT_URL) {
        return res.status(403).json({error: 'Invalid request origin'})
    }

    const userId = req.user?.userId
    const guestId = z.uuid().safeParse(req.signedCookies.viewerId)

    if(!userId && !guestId.success){
        return res.status(400).json({error: 'Viewer identity is missing'})
    }

    const viewerKey = userId
        ? `user:${userId}`
        : `guest: ${guestId.data}`

    const postId = parsedId.data

    try{
        const result = await db.transaction(async tx => {
            const [post] = await tx.select({
                postId: posts.postId,
                mediaId: posts.mediaId,
                viewCount: posts.viewCount,
            })
            .from(posts)
            .where(
                and(
                    eq(posts.postId, postId),
                    isNull(posts.deletedAt)
                )
            )
            .limit(1)
            .for('update')

            if(!post){
                return {status: 'not-found'} as const
            }

            if(!post.mediaId){
                return {status: 'not-video'} as const
            }

            const [video] = await tx.select({type: media.type})
                .from(media)
                .where(
                    eq(media.mediaId, post.mediaId)
                )
                .limit(1)

            if(video.type !== 'video'){
                return {status: 'not-video'} as const
            }

            const [acceptedView] = await tx.insert(postViews).values({
                postId,
                viewerKey,
                lastCountedAt: sql`now() AT TIME ZONE 'UTC'`,
            })
            .onConflictDoNothing({
                target: [
                    postViews.postId,
                    postViews.viewerKey,
                ],
            })
            .returning({
                postId: postViews.postId
            })

            if(!acceptedView){
                return {
                    status: 'ok',
                    counted: false,
                    viewCount: post.viewCount
                } as const
            }

            const [updatedPost] = await tx.update(posts).set({
                viewCount: sql`${posts.viewCount} + 1`
            })
            .where(eq(posts.postId, postId))
            .returning({
                viewCount: posts.viewCount
            })

            return {
                status: 'ok',
                counted: true,
                viewCount: updatedPost.viewCount,
            } as const
        })

        if(result.status === 'not-found') {
            return res.status(404).json({error: 'Post not found'})
        }

        if(result.status === 'not-video'){
            return res.status(400).json({error: 'Only video posts can receive views'})
        }

        return res.status(200).json({
            counted: result.counted,
            viewCount: result.viewCount
        })
    }catch (error) {
        console.error('Failed to record view:', error)

        return res.status(500).json({error: 'Failed to record view'})
    }
})

export default router