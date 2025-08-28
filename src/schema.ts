import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const checkinTypes = sqliteTable('checkin_types', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
});

export const checkinTypesRelations = relations(checkinTypes, ({ many }) => ({
    checkins: many(checkins),
}))

export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  oauthSub: text('oauth_sub').notNull().unique(),
  username: text('username').notNull().unique(),
  commonName: text('common_name').notNull(),
  mayRemoveCheckins: integer('may_remove_checkins', { mode: 'boolean' }).default(false),
  mayEditTypes: integer('may_edit_types', { mode: 'boolean' }).default(false),
});

export const usersRelations = relations(users, ({ many }) => ({
  checkins: many(checkins, { relationName: "checkinUser"}),
  checkedIn: many(checkins, { relationName: "checkedInBy"}),
}));

export const checkins = sqliteTable('checkins', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user: integer('user').notNull().references(() => users.id),
  checkedInBy: integer('checked_in_by').notNull().references(() => users.id),
  type: integer('type').notNull().references(() => checkinTypes.id),
  description: text('description'),
  timestamp: text('timestamp').notNull(),
  date: text('date').notNull(),
  duration: integer('duration')
});

export const checkinsRelations = relations(checkins, ({ one }) => ({
  user: one(users, {
    fields: [checkins.user],
    references: [users.id],
    relationName: "checkinUser"
  }),
  type: one(checkinTypes, {
    fields: [checkins.type],
    references: [checkinTypes.id],
  }),
  checkedInBy: one(users, {
    fields: [checkins.checkedInBy],
    references: [users.id],
    relationName: "checkedInBy"
  }),
}));
