import {pgTable, uuid, varchar, timestamp, unique} from 'drizzle-orm/pg-core'
import { posts } from './posts'

export const postViews = pgTable('post_views', {
    postId: uuid('post_id').notNull().references(() => posts.postId, {onDelete: 'cascade'}),
    viewerKey: varchar('viewer_key').notNull(),
    lastCountedAt: timestamp('last_counted_at').notNull().defaultNow()
},
(table) => [
    unique('unique_post_id_viewer_key').on(
        table.postId,
        table.viewerKey
    )
]

)