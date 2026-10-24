import {pgTable, uuid, timestamp, text} from 'drizzle-orm/pg-core'
import { users } from './users'

export const posts = pgTable('posts', {
    postId: uuid('post_id').defaultRandom().primaryKey(),
    userId: uuid('user_id').references(() => users.userId, {onDelete: 'cascade'}).notNull(),
    content: text('content'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at')
})