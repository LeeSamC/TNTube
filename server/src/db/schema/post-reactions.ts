import { pgTable, pgEnum, uuid, timestamp, unique } from "drizzle-orm/pg-core";
import { posts } from "./posts";
import { users } from "./users";

export const reactionTypeEnum = pgEnum('reaction_type', [
    'LIKE',
    'DISLIKE'
])

export const postReactions = pgTable('post_reactions', {
    reactionId: uuid('reaction_id').defaultRandom().primaryKey(),
    postId: uuid('post_id').references(() => posts.postId, {onDelete: 'cascade'}).notNull(),
    userId: uuid('user_id').references(() => users.userId, {onDelete: 'cascade'}).notNull(),
    type: reactionTypeEnum('type').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
},
(table) => [
    unique('unique_post_reactions').on(
        table.postId,
        table.userId
    ),
]
)