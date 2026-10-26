import { Router } from "express";
import { db } from "../../db";
import { eq, isNull, desc, inArray, sql } from "drizzle-orm";
import { optionalAuthenticateToken } from "../../middleware/optionAuthenticateToken";
import { AuthenticateReqest } from "../../middleware/authenticateRefreshToken";
import { users, posts, postMedia, media } from "../../db/schema";




const router = Router()

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
            username: users.username
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