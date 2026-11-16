import {pgTable, uuid, timestamp, text, varchar, integer} from 'drizzle-orm/pg-core'
import { users } from './users'
import { media } from './media'

export const posts = pgTable('posts', {
    postId: uuid('post_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.userId, {onDelete: 'cascade'}).notNull(),
    mediaId: uuid('media_id').references(() => media.mediaId, {onDelete: 'cascade'}),
    title: varchar('title', {length: 100}).notNull(),
    description: text('description'),
    viewCount: integer('view_count').notNull().default(0),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at')
})