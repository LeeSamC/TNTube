import {pgTable, uuid, integer, primaryKey} from 'drizzle-orm/pg-core'
import { posts } from './posts'
import { media } from './media'

export const postMedia = pgTable('post_media', {
    postId: uuid('post_id').references(() => posts.postId, {onDelete: 'cascade'}).notNull(),
    mediaId: uuid('media_id').references(() => media.mediaId, {onDelete: 'cascade'}).notNull(),
    sortOrder: integer('sort_order').notNull().default(0)
},
    (table) => [
        primaryKey({
            columns: [table.postId, table.mediaId]
        })
    ]
)
