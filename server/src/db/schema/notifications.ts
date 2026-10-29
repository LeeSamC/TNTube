import { pgTable, uuid, varchar, boolean, timestamp} from "drizzle-orm/pg-core";
import { users } from "./users";
import { posts } from "./posts";
import { comments } from "./comments";

export const notifications = pgTable('notifications', {
    notificationId: uuid('notification_id').defaultRandom().primaryKey(),
    recipientId: uuid('recipient_id').references(() => users.userId, {onDelete: 'cascade'}).notNull(),
    actorId: uuid('actor_id').references(() => users.userId, {onDelete: 'cascade'}).notNull(),
    type: varchar('type', {length: 50}).notNull(),
    postId: uuid('post_id').references(() => posts.postId, {onDelete: 'cascade'}),
    commentId: uuid('comment_id').references(() => comments.commentId, {onDelete: 'cascade'}),
    isRead: boolean('is_read').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
})