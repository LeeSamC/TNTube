import {pgTable, uuid, text, timestamp} from 'drizzle-orm/pg-core'
import { posts } from './posts'
import { users } from './users'
import { AnyPgColumn } from 'drizzle-orm/pg-core'



export const comments = pgTable('comments', {
    commentId: uuid('comment_id').defaultRandom().primaryKey(),
    postId: uuid('post_id').references(() => posts.postId, {onDelete: 'cascade'}).notNull(),
    userId: uuid('user_id').references(() => users.userId,{onDelete: 'cascade'}).notNull(),
    parentCommentId: uuid('parent_comment_id').references((): AnyPgColumn => comments.commentId, {onDelete: 'cascade'}),
    content: text('content').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    deletedAt: timestamp('deleted_at')
})