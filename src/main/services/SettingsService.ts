import { app } from 'electron'
import { join } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'

const SETTINGS_PATH = join(app.getPath('userData'), 'settings.json')

type SettingsValue = string | number | boolean | null | object

interface Settings {
  theme: 'dark' | 'light'
  windowBounds: { x: number; y: number; width: number; height: number } | null
  gridColumns: number
  thumbnailSize: 'small' | 'medium' | 'large'
  [key: string]: SettingsValue
}

const DEFAULT_SETTINGS: Settings = {
  theme: 'dark',
  windowBounds: null,
  gridColumns: 4,
  thumbnailSize: 'medium',
}

function loadSettings(): Settings {
  if (!existsSync(SETTINGS_PATH)) return { ...DEFAULT_SETTINGS }
  try {
    const raw = readFileSync(SETTINGS_PATH, 'utf-8')
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

function saveSettings(settings: Settings): void {
  writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}

export function getSetting(key: string): SettingsValue {
  const settings = loadSettings()
  return settings[key] ?? null
}

export function setSetting(key: string, value: SettingsValue): void {
  const settings = loadSettings()
  settings[key] = value
  saveSettings(settings)
}
