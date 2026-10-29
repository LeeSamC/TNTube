import { pgTable, uuid, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { users } from "./users";

export const subscriptions = pgTable('subscriptions', {
    subscriberId: uuid('subscriber_id').references(() => users.userId, {onDelete: 'cascade'}).notNull(),
    subscribeeId: uuid('subscribee_id').references(() => users.userId, {onDelete: 'cascade'}).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
},
    (table) => [
        primaryKey({
            columns: [table.subscriberId, table.subscribeeId]
        })
    ]
)