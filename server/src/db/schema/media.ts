import { pgTable, pgEnum, uuid, varchar, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./users";



export const media = pgTable('media', {
    mediaId: uuid('media_id').defaultRandom().primaryKey(),
    uploadedBy: uuid('uploaded_by').references(() => users.userId, {onDelete:'cascade'}).notNull(),
    type: varchar('type').notNull(),
    storageKey: varchar('storage_key', {length: 500}).notNull(),
    mimeType: varchar('mime_type', {length: 100}).notNull(),
    width: integer('width'),
    height: integer('height'),
    duration: integer('duration'),
    createdAt: timestamp('created_at').defaultNow().notNull()

})