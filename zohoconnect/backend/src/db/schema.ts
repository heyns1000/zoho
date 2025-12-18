import { pgTable, uuid, text, timestamp, bigint, boolean, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Users table - unified identity
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  collapseId: text('collapse_id').unique(),
  zohoUserId: text('zoho_user_id'),
  githubUsername: text('github_username'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

// Files table - all files from all sources, deduplicated
export const files = pgTable('files', {
  id: uuid('id').primaryKey().defaultRandom(),
  hash: text('hash').notNull().unique(),
  name: text('name').notNull(),
  size: bigint('size', { mode: 'number' }).notNull(),
  mimeType: text('mime_type'),
  source: text('source').notNull(),
  sourceId: text('source_id'),
  r2Path: text('r2_path'),
  zohoCreatorId: text('zoho_creator_id'),
  userId: uuid('user_id').references(() => users.id),
  hasSecrets: boolean('has_secrets').default(false),
  processedAt: timestamp('processed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
}, (table) => ({
  hashIdx: index('idx_files_hash').on(table.hash),
  userIdx: index('idx_files_user').on(table.userId, table.createdAt),
  sourceIdx: index('idx_files_source').on(table.source, table.sourceId),
}));

// Projects table - unified project management
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  brandId: text('brand_id'),
  githubRepo: text('github_repo'),
  hotstackUploadId: uuid('hotstack_upload_id'),
  codenestSection: text('codenest_section'),
  status: text('status').default('active'),
  ownerId: uuid('owner_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  metadata: jsonb('metadata'),
});

// Activity log table
export const activityLog = pgTable('activity_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: uuid('entity_id'),
  userId: uuid('user_id').references(() => users.id),
  sourceSystem: text('source_system').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('idx_activity_user').on(table.userId, table.createdAt),
}));

// Cache table
export const cache = pgTable('cache', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  expiresIdx: index('idx_cache_expires').on(table.expiresAt),
}));

// API metrics table
export const apiMetrics = pgTable('api_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  endpoint: text('endpoint').notNull(),
  method: text('method').notNull(),
  statusCode: integer('status_code').notNull(),
  durationMs: integer('duration_ms').notNull(),
  userId: uuid('user_id').references(() => users.id),
  cached: boolean('cached').default(false),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
}, (table) => ({
  timestampIdx: index('idx_metrics_timestamp').on(table.timestamp),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type File = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type ActivityLogEntry = typeof activityLog.$inferSelect;
export type NewActivityLogEntry = typeof activityLog.$inferInsert;
