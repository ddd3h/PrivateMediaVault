---
name: architecture
description: "Directory structure, key architectural decisions, and known fixes for Private Media Vault"
metadata: 
  node_type: memory
  type: project
  originSessionId: a3403713-5805-4b56-87be-468b8d6bfcc1
---

# Architecture — Private Media Vault

**Why:** Electron + React + SQLite, Privacy First, no cloud, no telemetry.
**How to apply:** New files go in documented locations. Security boundaries must be respected.

## Directory Structure
```
src/
  main/
    db/
      index.ts        — open/close/getDb(), VAULT_MOUNT_PATH, MEDIA_PATH, THUMBNAILS_PATH
      migrations.ts   — CREATE TABLE + incremental ALTER TABLE (PRAGMA table_info check)
      schema.ts       — Drizzle schema (media, categories, tags, media_tags)
    ipc/
      index.ts              — registerAllHandlers()
      vaultHandlers.ts      — vault:check-mount, vault:lock, vault:mount-image, db:open, db:close
      mediaHandlers.ts      — media:import-files/folder/get/list/update/delete/update-tags/set-thumbnail
                              mapRow() export — converts snake_case SQL results to camelCase MediaItem
      searchHandlers.ts     — search:query (LIKE-based, searches title/filename/memo/tags/categories)
      settingsHandlers.ts   — settings:get/set (internal SSD only)
    services/
      VaultService.ts    — isVaultMounted() via statSync device ID comparison
      LockService.ts     — 6-step lock sequence (stop→close DB→clear cache→Recent Docs→unmount→navigate)
      ThumbnailService.ts — findBinary() checks resourcesPath/bin then Homebrew then system; -update 1 flag for ffmpeg8
      SettingsService.ts — settings.json on internal SSD (theme, windowBounds, gridColumns, thumbnailSize)
    index.ts           — BrowserWindow: sandbox:false, webSecurity:false, vault:// protocol, GPU flags
  preload/
    index.ts           — contextBridge: allowlist 20 channels + 3 events (playback:stop, vault:locked, media:import-progress)
                         getPathForFile() via webUtils for DnD file paths
  renderer/
    pages/             — UnlockPage, HomePage, PlayerPage, ViewerPage
    components/
      layout/          — AppLayout, TitleBar (lock button only), Sidebar (category DnD drop target)
      media/           — MediaGrid, MediaCard (draggable), ImportButton, ImportDialog (DnD+progress),
                         EditMediaDialog, BulkEditBar, MediaContextMenu (ContextMenu, right-click),
                         Slideshow
      search/          — SearchBar
    hooks/             — useDragDrop (webUtils.getPathForFile), useLazyImage (IntersectionObserver), useVirtualGrid
    store/             — vaultStore (status, debugInfo), mediaStore (items, categories, tags, pagination)
    lib/ipc.ts         — invoke(), onEvent(), getPathForFile()
  shared/types/        — MediaItem (camelCase), Category, Tag, IpcChannels
scripts/
  copy-ffmpeg.js       — copies ffmpeg/ffprobe from Homebrew to resources/bin/ for bundling
resources/
  bin/                 — ffmpeg, ffprobe (bundled into .app via extraResources)
  icons/icon.png       — 1254x1254 source icon
  icon.icns            — generated from icons/icon.png via sips+iconutil
```

## Key Bugs Fixed (do not revert)
- **snake_case→camelCase**: raw SQL returns snake_case; `mapRow()` in mediaHandlers converts to camelCase MediaItem. CRITICAL: media:list and search:query MUST use mapRow().
- **COUNT query alias**: `SELECT COUNT(*) FROM media WHERE m.category_id` fails (no alias). Use `WHERE category_id` (no `m.` prefix) in count query.
- **category_id missing column**: Existing DBs may lack category_id. migrations.ts uses `PRAGMA table_info` + `ALTER TABLE ADD COLUMN` to add missing columns.
- **file:// in renderer**: sandbox:true blocks file:// even with webSecurity:false. Fixed with sandbox:false.
- **better-sqlite3 ABI**: Electron 33 requires arm64 rebuild. `postinstall: electron-builder install-app-deps`.
- **FFmpeg -update 1**: FFmpeg 8.x requires `-update 1` flag for single-image output (image2 muxer).
- **DnD file paths**: file.path empty with sandbox; use webUtils.getPathForFile() via preload.
- **ContextMenu vs DropdownMenu**: DropdownMenu.Trigger fires on LEFT click. Use @radix-ui/react-context-menu for right-click.
- **Thumbnail cache**: Same path cached by browser. Append `?t=${Date.now()}` in renderer after update; strip `?...` in media:update handler before DB write.

## Security Decisions
- sandbox: false (needed for file:// access) — contextIsolation:true maintained
- webSecurity: false — needed for file:// media from /Volumes/SecretLibrary; safe because no external content loaded
- vault:// custom protocol registered but NOT used in renderer (webSecurity:false makes it unnecessary)
- No history/log/recent tables in DB schema by design

## Build
- `npm run dev` — Vite dev server + Electron (http://localhost)
- `npm run preview` — vite build + electron . (file:// mode, closer to production)
- `npm run build` — copy-ffmpeg + vite build + electron-builder → release/Private Media Vault-0.1.0-arm64.dmg
- Node: v22.17.0, Electron: 33.4.x, better-sqlite3: 12.x (arm64 rebuild required)
