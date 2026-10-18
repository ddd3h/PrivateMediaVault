import { ipcMain, dialog, BrowserWindow } from 'electron'
import { copyFileSync, mkdirSync, readdirSync, statSync, unlinkSync, existsSync, writeFileSync } from 'fs'
import { join, basename, extname } from 'path'
import { randomUUID } from 'crypto'
import { eq, inArray, sql } from 'drizzle-orm'
import { getDb, getRawDb, MEDIA_PATH, THUMBNAILS_PATH } from '../db'
import { media, tags, mediaTagsTable, categories } from '../db/schema'
import { generateVideoThumbnail, generateImageThumbnail, extractMetadata } from '../services/ThumbnailService'
import type { ImportOptions, MediaItem } from '@shared/types'

export function mapRow(r: Record<string, unknown>): MediaItem {
  return {
    id: r.id as string,
    title: r.title as string,
    originalFilename: r.original_filename as string,
    filePath: r.file_path as string,
    mediaType: r.media_type as 'video' | 'image',
    mimeType: r.mime_type as string,
    fileSize: r.file_size as number,
    width: r.width as number | null,
    height: r.height as number | null,
    duration: r.duration as number | null,
    thumbnailPath: r.thumbnail_path as string | null,
    categoryId: r.category_id as string | null,
    memo: r.memo as string | null,
    favorite: Boolean(r.favorite),
    rating: r.rating as number,
    capturedAt: r.captured_at as string | null,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
    tags: (r.tag_list as string | null)?.split(',').filter(Boolean) ?? [],
  }
}

const VIDEO_EXTS = new Set(['.mp4', '.mov', '.mkv', '.avi', '.webm', '.m4v', '.flv', '.wmv'])
const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.heic', '.bmp', '.tiff', '.tif'])

function isVideo(ext: string) { return VIDEO_EXTS.has(ext.toLowerCase()) }
function isImage(ext: string) { return IMAGE_EXTS.has(ext.toLowerCase()) }
function isMedia(ext: string) { return isVideo(ext) || isImage(ext) }

function ensureMediaDirs() {
  mkdirSync(join(MEDIA_PATH, 'video'), { recursive: true })
  mkdirSync(join(MEDIA_PATH, 'image'), { recursive: true })
}

async function importSingleFile(filePath: string, options: ImportOptions = {}): Promise<string | null> {
  const ext = extname(filePath)
  if (!isMedia(ext)) return null

  const db = getDb()
  const raw = getRawDb()
  const id = randomUUID()
  const mediaType = isVideo(ext) ? 'video' : 'image'
  const originalFilename = basename(filePath)

  ensureMediaDirs()
  const destPath = join(MEDIA_PATH, mediaType, `${id}${ext}`)
  copyFileSync(filePath, destPath)

  const meta = extractMetadata(destPath)
  const thumbPath = mediaType === 'video'
    ? generateVideoThumbnail(destPath, id)
    : generateImageThumbnail(destPath, id)

  const fileSize = statSync(destPath).size
  const title = options.title ?? originalFilename.replace(/\.[^.]+$/, '')

  await db.insert(media).values({
    id,
    title,
    originalFilename,
    filePath: destPath,
    mediaType,
    mimeType: meta.mimeType,
    fileSize,
    width: meta.width,
    height: meta.height,
    duration: meta.duration,
    thumbnailPath: thumbPath,
    categoryId: options.categoryId ?? null,
    memo: options.memo ?? null,
    favorite: options.favorite ?? false,
    rating: options.rating ?? 0,
    capturedAt: options.capturedAt ?? null,
  })

  // Handle tags
  const tagNames = options.tags ?? []
  if (tagNames.length > 0) {
    const tagIds: string[] = []
    for (const name of tagNames) {
      const existing = await db.select().from(tags).where(eq(tags.name, name)).limit(1)
      let tagId: string
      if (existing.length > 0) {
        tagId = existing[0].id
        await db.update(tags).set({ usageCount: sql`usage_count + 1` }).where(eq(tags.id, tagId))
      } else {
        tagId = randomUUID()
        await db.insert(tags).values({ id: tagId, name, usageCount: 1 })
      }
      tagIds.push(tagId)
    }
    await db.insert(mediaTagsTable).values(tagIds.map(tid => ({ mediaId: id, tagId: tid })))
  }

  // Update FTS5 index
  const catName = options.categoryId
    ? (await db.select().from(categories).where(eq(categories.id, options.categoryId)).limit(1))[0]?.name ?? ''
    : ''

  raw.prepare(`
    INSERT INTO media_fts(media_id, title, original_filename, tags, category, memo)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, title, originalFilename, (options.tags ?? []).join(' '), catName, options.memo ?? '')

  return id
}

function collectMediaFiles(folderPath: string): string[] {
  const result: string[] = []
  try {
    for (const entry of readdirSync(folderPath, { withFileTypes: true })) {
      const full = join(folderPath, entry.name)
      if (entry.isDirectory()) {
        result.push(...collectMediaFiles(full))
      } else if (entry.isFile() && isMedia(extname(entry.name))) {
        result.push(full)
      }
    }
  } catch { /* skip unreadable dirs */ }
  return result
}

export function registerMediaHandlers(): void {
  ipcMain.handle('media:import-files', async (event, params: { paths: string[]; options?: ImportOptions }) => {
    let paths = params.paths

    // If no paths provided, open file dialog
    if (!paths || paths.length === 0) {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { imported: 0, failed: [] }
      const result = await dialog.showOpenDialog(win, {
        properties: ['openFile', 'multiSelections'],
        filters: [
          { name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'avi', 'webm', 'm4v', 'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'bmp'] },
        ],
      })
      if (result.canceled) return { imported: 0, failed: [] }
      paths = result.filePaths
    }

    const total = paths.length
    let imported = 0
    const failed: string[] = []
    for (let i = 0; i < paths.length; i++) {
      const p = paths[i]
      event.sender.send('media:import-progress', {
        current: i + 1,
        total,
        filename: basename(p),
        percentage: Math.round((i + 1) / total * 100),
      })
      try {
        const r = await importSingleFile(p, params.options)
        if (r) imported++
        else failed.push(basename(p))
      } catch {
        failed.push(basename(p))
      }
    }
    return { imported, failed }
  })

  ipcMain.handle('media:import-folder', async (event, params: { folderPath: string; options?: ImportOptions }) => {
    let folderPath = params.folderPath

    if (!folderPath) {
      const win = BrowserWindow.fromWebContents(event.sender)
      if (!win) return { imported: 0, failed: [] }
      const result = await dialog.showOpenDialog(win, {
        properties: ['openDirectory'],
      })
      if (result.canceled) return { imported: 0, failed: [] }
      folderPath = result.filePaths[0]
    }

    const files = collectMediaFiles(folderPath)
    const total = files.length
    let imported = 0
    const failed: string[] = []
    for (let i = 0; i < files.length; i++) {
      const p = files[i]
      event.sender.send('media:import-progress', {
        current: i + 1,
        total,
        filename: basename(p),
        percentage: Math.round((i + 1) / total * 100),
      })
      try {
        const r = await importSingleFile(p, params.options)
        if (r) imported++
        else failed.push(basename(p))
      } catch {
        failed.push(basename(p))
      }
    }
    return { imported, failed }
  })

  ipcMain.handle('media:get', async (_event, { id }: { id: string }) => {
    const db = getDb()
    const raw = getRawDb()
    const rows = await db.select().from(media).where(eq(media.id, id)).limit(1)
    if (!rows.length) return null

    const item = rows[0]
    const tagRows = raw.prepare(`
      SELECT t.name FROM tags t
      JOIN media_tags mt ON mt.tag_id = t.id
      WHERE mt.media_id = ?
    `).all(id) as { name: string }[]

    return { ...item, tags: tagRows.map(r => r.name) }
  })

  ipcMain.handle('media:list', async (_event, { page, pageSize, categoryId }: { page: number; pageSize: number; categoryId?: string }) => {
    const raw = getRawDb()
    const offset = (page - 1) * pageSize

    const params: unknown[] = []
    // Use alias-free WHERE so it works in both JOIN query and COUNT query
    const whereClause = categoryId ? (params.push(categoryId), 'WHERE m.category_id = ?') : ''
    const countWhereClause = categoryId ? 'WHERE category_id = ?' : ''
    const countParams = categoryId ? [categoryId] : []

    const rows = raw.prepare(`
      SELECT m.*, GROUP_CONCAT(t.name, ',') as tag_list
      FROM media m
      LEFT JOIN media_tags mt ON mt.media_id = m.id
      LEFT JOIN tags t ON t.id = mt.tag_id
      ${whereClause}
      GROUP BY m.id
      ORDER BY m.created_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, pageSize, offset) as (typeof media.$inferSelect & { tag_list: string | null })[]

    const total = (raw.prepare(`SELECT COUNT(*) as n FROM media ${countWhereClause}`).get(...countParams) as { n: number }).n

    return {
      items: (rows as unknown as Record<string, unknown>[]).map(mapRow),
      total,
      page,
      pageSize,
    }
  })

  ipcMain.handle('media:update', async (_event, { id, updates }: { id: string; updates: Partial<typeof media.$inferInsert> }) => {
    const db = getDb()
    const { tags: _tags, ...safeUpdates } = updates as Record<string, unknown>
    // Strip cache-busting query params from thumbnailPath before saving to DB
    if (typeof safeUpdates.thumbnailPath === 'string') {
      safeUpdates.thumbnailPath = safeUpdates.thumbnailPath.split('?')[0]
    }
    if (Object.keys(safeUpdates).length > 0) {
      await db.update(media).set(safeUpdates as Partial<typeof media.$inferInsert>).where(eq(media.id, id))
    }
    return { success: true }
  })

  ipcMain.handle('media:update-tags', async (_event, { id, tags: newTags }: { id: string; tags: string[] }) => {
    const db = getDb()
    const raw = getRawDb()

    // Remove all existing tag associations
    await db.delete(mediaTagsTable).where(eq(mediaTagsTable.mediaId, id))

    // Re-insert tags
    const tagIds: string[] = []
    for (const name of newTags) {
      const existing = await db.select().from(tags).where(eq(tags.name, name)).limit(1)
      let tagId: string
      if (existing.length > 0) {
        tagId = existing[0].id
      } else {
        tagId = randomUUID()
        await db.insert(tags).values({ id: tagId, name, usageCount: 0 })
      }
      tagIds.push(tagId)
    }

    if (tagIds.length > 0) {
      await db.insert(mediaTagsTable).values(tagIds.map(tid => ({ mediaId: id, tagId: tid })))
    }

    // Recalculate usage counts
    raw.prepare(`
      UPDATE tags SET usage_count = (
        SELECT COUNT(*) FROM media_tags WHERE tag_id = tags.id
      )
    `).run()

    // Update FTS
    const item = await db.select().from(media).where(eq(media.id, id)).limit(1)
    if (item.length > 0) {
      raw.prepare(`DELETE FROM media_fts WHERE media_id = ?`).run(id)
      raw.prepare(`
        INSERT INTO media_fts(media_id, title, original_filename, tags, category, memo)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, item[0].title, item[0].originalFilename, newTags.join(' '), '', item[0].memo ?? '')
    }

    return { success: true }
  })

  ipcMain.handle('media:set-thumbnail', async (_event, { id, dataUrl }: { id: string; dataUrl: string }) => {
    const db = getDb()

    // dataUrl = "data:image/jpeg;base64,/9j/..."
    const base64 = dataUrl.replace(/^data:image\/\w+;base64,/, '')
    const buffer = Buffer.from(base64, 'base64')

    const thumbPath = `${THUMBNAILS_PATH}/${id}.jpg`
    writeFileSync(thumbPath, buffer)

    await db.update(media).set({ thumbnailPath: thumbPath }).where(eq(media.id, id))

    return { success: true, thumbnailPath: thumbPath }
  })

  ipcMain.handle('media:delete', async (_event, { ids }: { ids: string[] }) => {
    const db = getDb()
    const raw = getRawDb()

    // Collect file paths before deleting from DB
    const rows = await db
      .select({ filePath: media.filePath, thumbnailPath: media.thumbnailPath })
      .from(media)
      .where(inArray(media.id, ids))

    await db.delete(media).where(inArray(media.id, ids))

    for (const id of ids) {
      raw.prepare(`DELETE FROM media_fts WHERE media_id = ?`).run(id)
    }

    // Delete physical files from encrypted volume
    for (const row of rows) {
      try { if (row.filePath && existsSync(row.filePath)) unlinkSync(row.filePath) } catch { /* best-effort */ }
      try { if (row.thumbnailPath && existsSync(row.thumbnailPath)) unlinkSync(row.thumbnailPath) } catch { /* best-effort */ }
    }

    return { success: true }
  })

  ipcMain.handle('media:get-thumbnail-path', async (_event, { id }: { id: string }) => {
    const db = getDb()
    const rows = await db.select({ thumbnailPath: media.thumbnailPath }).from(media).where(eq(media.id, id)).limit(1)
    return { path: rows[0]?.thumbnailPath ?? null }
  })

  // Categories
  ipcMain.handle('category:list', async () => {
    const db = getDb()
    return db.select().from(categories).orderBy(categories.sortOrder, categories.name)
  })

  ipcMain.handle('category:create', async (_event, { name, parentId }: { name: string; parentId?: string }) => {
    const db = getDb()
    const id = randomUUID()
    await db.insert(categories).values({ id, name, parentId: parentId ?? null })
    return { id, name, parentId: parentId ?? null, sortOrder: 0, createdAt: new Date().toISOString() }
  })

  ipcMain.handle('category:update', async (_event, { id, name }: { id: string; name: string }) => {
    const db = getDb()
    await db.update(categories).set({ name }).where(eq(categories.id, id))
    return { success: true }
  })

  ipcMain.handle('category:delete', async (_event, { id }: { id: string }) => {
    const db = getDb()
    await db.delete(categories).where(eq(categories.id, id))
    return { success: true }
  })

  // Tags
  ipcMain.handle('tag:list', async () => {
    const db = getDb()
    return db.select().from(tags).orderBy(sql`usage_count DESC`, tags.name)
  })

  ipcMain.handle('tag:delete', async (_event, { id }: { id: string }) => {
    const db = getDb()
    await db.delete(tags).where(eq(tags.id, id))
    return { success: true }
  })
}
