---
name: project-spec
description: Official spec for Private Media Vault — offline Electron app for private media management
metadata: 
  node_type: memory
  type: project
  originSessionId: a3403713-5805-4b56-87be-468b8d6bfcc1
---

# Private Media Vault — Official Spec

**Why:** Personal private media manager, offline-only, no cloud, no telemetry.
**How to apply:** All implementation decisions must align with this spec. Security > Privacy > Features.

## Tech Stack
- Frontend: React + TypeScript + Vite
- Desktop: Electron
- DB: SQLite + FTS5, ORM: Drizzle ORM
- State: Zustand
- Media: FFmpeg
- UI: TailwindCSS + shadcn/ui

## Storage Rules
- Internal SSD: app binary, UI/theme/window settings ONLY
- Encrypted volume `/Volumes/SecretLibrary`: media, thumbnails, database

## Security HARD RULES (never violate)
- NO play history, search history, recent items, recent docs
- NO password storage, access logs, telemetry
- NO console.log in production
- NO cloud, external API, external network calls

## Features
- Home: search dashboard (global search, categories, tags, quick filters, smart collections)
- Search: FTS5, advanced syntax (tag:X type:video favorite:true width:>=1920 date:range), AND/OR/NOT/()
- Media import: file + folder, bulk edit, title/category/tags/memo/favorite/rating/date
- Video: play/pause/seek/fullscreen/speed control (in-app only)
- Image: zoom/rotate/fullscreen/slideshow
- Lock: stop playback → close DB → clear cache → delete Recent Docs → unmount volume → unlock screen

## Lock sequence (exact order required)
1. Stop playback
2. Close DB
3. Clear cache
4. Delete Recent Documents
5. Unmount /Volumes/SecretLibrary
6. Show Unlock screen

## Future (local-only, no external API)
- Phase 2: AI tagging, OCR, speech-to-text, face recognition, similar media search
- Phase 3: local LLM, vector search, natural language search

## Implementation Order
1. System architecture design ← CURRENT
2. Directory structure
3. DB design
4. Electron init
5. React UI
6. Encryption library management
7. Media import
8. Search
9. Video playback
10. Image viewer
11. Security audit
12. Performance optimization
