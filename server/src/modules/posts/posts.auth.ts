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
    content: z.string().trim().min(1, 'Post content cannot be empty').max(5000, 'Post content cannot exceed 5000 characters').optional().default(''),
    mediaIds: z.array(z.uuid()).max(10, 'A post cannot contain more than 10 media files').optional().default([])
}).refine(
    (data) => {
        return data.content.length > 0 || data.mediaIds.length > 0
    },
    {
        message: 'Post must contain text or media'
    }
)

type mediaItem = {
    postId: string,
    mediaId: string,
    type: 'image' | 'video'
    storageKey: string,
    mimeType: string,
    width: number | null
    height: number | null
    duration: number | null
    sortOrder: number
}

async function getPostMedia(postId: string, req: any) {
    const result = await db.select({
        mediaId: media.mediaId,
        type: media.type,
        storageKey: media.storageKey,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        duration: media. duration,
        sortOrder: postMedia.sortOrder
    })
    .from(postMedia)
    .innerJoin(
        media,
        eq(postMedia.mediaId, media.mediaId)
    )
    .where(
        eq(postMedia.postId, postId)
    )
    .orderBy(
        postMedia.sortOrder
    )

    return result.map(item => ({
        ...item,
        url: `${req.protocol}://${req.get('host')}/uploads/${item.storageKey}`
    }))
}

router.get('/all', optionalAuthenticateToken, async (req: AuthenticateReqest, res) => {
    const currentUserId = req.user?.userId ?? null

    try{
        const page = Math.max(Number.parseInt(String(req.query.page), 10) || 1, 1)
        const limit = Math.min(Math.max(Number.parseInt(String(req.query.limit), 10) || 10, 1), 50)
        const offset = (page - 1) * limit

        const result = await db.select({
            postId: posts.postId,
            content: posts.content,
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
            `.as('commentCount')
        })
        .from(posts)
        .leftJoin(users, eq(posts.userId, users.userId))
        .where(isNull(posts.deletedAt))
        .orderBy(desc(posts.createdAt))
        .limit(limit)
        .offset(offset)

        const [{count}] = await db.select({
            count: sql<number>`COUNT(*)::int`.as('count')
        })
        .from(posts)
        .where(isNull(posts.deletedAt))

        let mediaItems : mediaItem[] = []

        if(result.length > 0) {
            const postIds = result.map(post => post.postId)

            mediaItems = await db.select({
                postId: postMedia.postId,
                mediaId: media.mediaId,
                type: media.type,
                storageKey: media.storageKey,
                mimeType: media.mimeType,
                width: media.width,
                height: media.height,
                duration:media.duration,
                sortOrder:postMedia.sortOrder
            })
            .from(postMedia)
            .innerJoin(
                media,
                eq(postMedia.mediaId, media.mediaId)
            )
            .where(inArray(postMedia.postId, postIds))
            .orderBy(postMedia.sortOrder)
        }

        const mediaByPostId = new Map()

        for(const item of mediaItems){
            if(!mediaByPostId.has(item.postId)) {
                mediaByPostId.set(item.postId, [])
            }

            mediaByPostId.get(item.postId).push({
                mediaId: item.mediaId,
                type: item.type,
                storageKey: item.storageKey,
                mimeType: item.mimeType,
                width: item.width,
                height: item.height,
                duration: item.duration,
                sortOrder:item.sortOrder
            })
        }

        const postsWithMedia = result.map(post => ({
            ...post,
            media: mediaByPostId.get(post.postId) || []
        }))

        const total =  count
        const totalPages = Math.ceil(total/limit)

        return res.status(200).json({
            posts: postsWithMedia,
            
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasNextPage: page < totalPages,
                hasPreviousPage:page > 1
            }
        })
    }catch (error) {
        console.error(error)

        return res.status(500).json({error: 'Failed to retrieve post'})
    }
})

router.post('/', authenticateAccessToken, async (req: AuthenticateReqest, res) => {
    const validation = createPostSchema.safeParse(req.body)

    if(!validation.success){
        const err = validation.error
        return res.status(400).json({error: z.treeifyError(err)})
    }

    const userId = req.user?.userId 

    if(!userId){
        throw new Error('UserId is required')
    }

    const {content, mediaIds} = validation.data

    try{
        if(mediaIds.length > 0) {
            const userMedia = await db.select({
                mediaId: media.mediaId
            })
            .from(media)
            .where(
                and(
                    inArray(media.mediaId, mediaIds),
                    eq(media.uploadedBy, userId)
                )
            )

            const ownedMediaIds = new Set(
                userMedia.map(item => item.mediaId)
            )

            const unauthorizedMedia = mediaIds.filter(
                mediaId => !ownedMediaIds.has(mediaId)
            )

            if(unauthorizedMedia.length > 0) {
                return res.status(403).json({error: 'You cannot attach media that you do not own'})
            }
        }

        const [newPost] = await db.insert(posts).values({
            userId: userId,
            content: content || null
        }).returning()

        if(mediaIds.length > 0) {
            await db.insert(postMedia).values(mediaIds.map(
                (mediaId, index) => ({
                    postId: newPost.postId,
                    mediaId: mediaId,
                    sortOrder: index
                })
            ))
        }
        
        const postMediaItems = await getPostMedia(newPost.postId, req)

        return res.status(201).json({message: 'Post created', post: {...newPost, media: postMediaItems}})
        
    } catch (error){
        console.error(error)

        return res.status(500).json({error: 'Failed to create post'})
    }
})