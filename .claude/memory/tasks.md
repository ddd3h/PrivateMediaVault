---
name: tasks
description: Implementation progress and remaining work for Private Media Vault
metadata: 
  node_type: memory
  type: project
  originSessionId: a3403713-5805-4b56-87be-468b8d6bfcc1
---

# Tasks

## Completed (2026-05-31)
- [x] Step 1-12: Full implementation
- [x] Architecture, DB, Electron main, React UI, IPC, security
- [x] Media import (file/folder, DnD, progress bar)
- [x] Search (LIKE-based, title/filename/memo/tags/categories)
- [x] Video playback (play/pause/seek/speed/fullscreen)
- [x] Image viewer (zoom/rotate/fullscreen/slideshow)
- [x] Lock sequence (6-step: stop→close DB→clear cache→Recent Docs→unmount→navigate)
- [x] Vault mount/unmount from UnlockPage (hdiutil open .dmg via macOS dialog)
- [x] Right-click context menu (ContextMenu: play/edit/favorite/delete)
- [x] Category management (create/delete in sidebar, DnD media→category)
- [x] Bulk edit (⌘A select all, tag append, category/rating batch)
- [x] Thumbnail custom (capture current video frame via canvas, cache-bust ?t=)
- [x] Resolution badge on thumbnails (480p/720p/1080p/2K/4K)
- [x] Import progress bar (IPC event media:import-progress with %)
- [x] Production build (.app + .dmg) with bundled ffmpeg/ffprobe
- [x] App icon (.icns from resources/icons/icon.png via sips+iconutil)
- [x] Virtual scroll + lazy image loading

## Known Issues / Future Work
- Video playback requires H.264 codec (Electron 33 built-in ffmpeg)
- No Phase 2/3 features yet (AI tagging, OCR, vector search — all local-only per spec)
- App is unsigned (ad-hoc signature) — users see "unidentified developer" on first launch → right-click → Open
