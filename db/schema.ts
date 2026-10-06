import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const schools = sqliteTable('schools', {id:text('id').primaryKey(),owner:text('owner').notNull(),payload:text('payload').notNull(),version:integer('version').notNull().default(0)});
export const users = sqliteTable('users', {
 id:text('id').primaryKey(),email:text('email').notNull().unique(),name:text('name').notNull(),passwordHash:text('password_hash').notNull(),salt:text('salt').notNull(),verified:integer('verified').notNull().default(0),testAccount:integer('test_account').notNull().default(0),mustChange:integer('must_change').notNull().default(0),epoch:integer('epoch').notNull().default(0),verifyHash:text('verify_hash'),verifyExpires:integer('verify_expires'),resetHash:text('reset_hash'),resetExpires:integer('reset_expires'),createdAt:integer('created_at').notNull()
});
export const sessions = sqliteTable('sessions',{hash:text('hash').primaryKey(),userId:text('user_id').notNull(),epoch:integer('epoch').notNull(),expiresAt:integer('expires_at').notNull()});
export const rateLimits = sqliteTable('rate_limits',{key:text('key').primaryKey(),count:integer('count').notNull().default(0),expiresAt:integer('expires_at').notNull()});
