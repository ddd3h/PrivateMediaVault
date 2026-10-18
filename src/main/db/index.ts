import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { runMigrations } from './migrations'
import * as schema from './schema'

let _db: Database.Database | null = null
let _drizzle: ReturnType<typeof drizzle> | null = null

const VAULT_PATH = '/Volumes/SecretLibrary'
const DB_PATH = `${VAULT_PATH}/vault.db`

export function openDatabase(): void {
  if (_db) return

  _db = new Database(DB_PATH, {
    fileMustExist: false,
    timeout: 5000,
  })

  runMigrations(_db)

  // Performance: run ANALYZE after migrations to update query planner stats
  _db.exec('ANALYZE;')

  _drizzle = drizzle(_db, { schema })
}

export function closeDatabase(): void {
  if (_db) {
    // Checkpoint WAL before close to minimize next open time
    try { _db.exec('PRAGMA wal_checkpoint(TRUNCATE);') } catch { /* best-effort */ }
    _db.close()
    _db = null
    _drizzle = null
  }
}

export function isDatabaseOpen(): boolean {
  return _db !== null && _db.open
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!_drizzle) throw new Error('Database not open')
  return _drizzle
}

export function getRawDb(): Database.Database {
  if (!_db) throw new Error('Database not open')
  return _db
}

export const VAULT_MOUNT_PATH = VAULT_PATH
export const MEDIA_PATH = `${VAULT_PATH}/media`
export const THUMBNAILS_PATH = `${VAULT_PATH}/thumbnails`
