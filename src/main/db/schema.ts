import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const categories = sqliteTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  parentId: text('parent_id').references((): ReturnType<typeof text> => categories.id, { onDelete: 'set null' }),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
})

export const tags = sqliteTable('tags', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  usageCount: integer('usage_count').notNull().default(0),
})

export const media = sqliteTable('media', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  originalFilename: text('original_filename').notNull(),
  filePath: text('file_path').notNull().unique(),
  mediaType: text('media_type', { enum: ['video', 'image'] }).notNull(),
  mimeType: text('mime_type').notNull(),
  fileSize: integer('file_size').notNull(),
  width: integer('width'),
  height: integer('height'),
  duration: real('duration'),
  thumbnailPath: text('thumbnail_path'),
  categoryId: text('category_id').references(() => categories.id, { onDelete: 'set null' }),
  memo: text('memo'),
  favorite: integer('favorite', { mode: 'boolean' }).notNull().default(false),
  rating: integer('rating').notNull().default(0),
  capturedAt: text('captured_at'),
  createdAt: text('created_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
  updatedAt: text('updated_at').notNull().default(sql`(strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))`),
}, (t) => ({
  mediaTypeIdx: index('idx_media_type').on(t.mediaType),
  categoryIdx: index('idx_media_category').on(t.categoryId),
  favoriteIdx: index('idx_media_favorite').on(t.favorite),
  ratingIdx: index('idx_media_rating').on(t.rating),
  capturedAtIdx: index('idx_media_captured_at').on(t.capturedAt),
}))

export const mediaTagsTable = sqliteTable('media_tags', {
  mediaId: text('media_id').notNull().references(() => media.id, { onDelete: 'cascade' }),
  tagId: text('tag_id').notNull().references(() => tags.id, { onDelete: 'cascade' }),
}, (t) => ({
  mediaTagIdx: index('idx_media_tags_media').on(t.mediaId),
  tagMediaIdx: index('idx_media_tags_tag').on(t.tagId),
}))
