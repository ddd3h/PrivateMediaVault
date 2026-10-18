import type Database from 'better-sqlite3'

export function runMigrations(db: Database.Database): void {
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
    PRAGMA synchronous = NORMAL;
    PRAGMA temp_store = MEMORY;
    PRAGMA mmap_size = 268435456;

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      parent_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      usage_count INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS media (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      file_path TEXT NOT NULL UNIQUE,
      media_type TEXT NOT NULL CHECK(media_type IN ('video', 'image')),
      mime_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      width INTEGER,
      height INTEGER,
      duration REAL,
      thumbnail_path TEXT,
      category_id TEXT REFERENCES categories(id) ON DELETE SET NULL,
      memo TEXT,
      favorite INTEGER NOT NULL DEFAULT 0,
      rating INTEGER NOT NULL DEFAULT 0 CHECK(rating BETWEEN 0 AND 5),
      captured_at TEXT,
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
      updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    );

    CREATE TABLE IF NOT EXISTS media_tags (
      media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
      tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
      PRIMARY KEY (media_id, tag_id)
    );

    CREATE INDEX IF NOT EXISTS idx_media_type ON media(media_type);
    CREATE INDEX IF NOT EXISTS idx_media_category ON media(category_id);
    CREATE INDEX IF NOT EXISTS idx_media_favorite ON media(favorite);
    CREATE INDEX IF NOT EXISTS idx_media_rating ON media(rating);
    CREATE INDEX IF NOT EXISTS idx_media_captured_at ON media(captured_at);
    CREATE INDEX IF NOT EXISTS idx_media_tags_media ON media_tags(media_id);
    CREATE INDEX IF NOT EXISTS idx_media_tags_tag ON media_tags(tag_id);

    CREATE VIRTUAL TABLE IF NOT EXISTS media_fts USING fts5(
      media_id UNINDEXED,
      title,
      original_filename,
      tags,
      category,
      memo,
      content='',
      contentless_delete=1
    );

    CREATE TRIGGER IF NOT EXISTS media_updated_at
    AFTER UPDATE ON media
    BEGIN
      UPDATE media SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = NEW.id;
    END;
  `)

  // Incremental migrations — add columns missing from older DBs
  const mediaColumns = (db.prepare(`PRAGMA table_info(media)`).all() as { name: string }[]).map(r => r.name)
  if (!mediaColumns.includes('category_id')) {
    db.exec(`ALTER TABLE media ADD COLUMN category_id TEXT`)
  }
  if (!mediaColumns.includes('memo')) {
    db.exec(`ALTER TABLE media ADD COLUMN memo TEXT`)
  }
  if (!mediaColumns.includes('rating')) {
    db.exec(`ALTER TABLE media ADD COLUMN rating INTEGER NOT NULL DEFAULT 0`)
  }
  if (!mediaColumns.includes('captured_at')) {
    db.exec(`ALTER TABLE media ADD COLUMN captured_at TEXT`)
  }
  if (!mediaColumns.includes('thumbnail_path')) {
    db.exec(`ALTER TABLE media ADD COLUMN thumbnail_path TEXT`)
  }
}
