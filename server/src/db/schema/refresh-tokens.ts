import {pgTable, uuid, varchar, timestamp, boolean} from 'drizzle-orm/pg-core'
import { users } from './users'

export const refreshTokens = pgTable('refresh-tokens', {
    tokenId: uuid('token_id').defaultRandom().primaryKey(),
    token: varchar('token').notNull(),
    userId: uuid('user_id').notNull().references(() => users.userId, {onDelete: 'cascade'}),
    expiresAt: timestamp('expires_at').notNull(),
    revoked: boolean('revoked').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull()
})