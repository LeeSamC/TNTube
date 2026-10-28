import { pgTable, uuid } from "drizzle-orm/pg-core";
import { posts } from "./posts";
import { users } from "./users";

export const likes = pgTable('likes', {
    likeId: uuid('like_id').defaultRandom().primaryKey(),
    postId: uuid('post_id').references(() => posts.postId, {onDelete: 'cascade'}).notNull(),
    userId: uuid('user_id').references(() => users.userId, {onDelete: 'cascade'}).notNull()
})