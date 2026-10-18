declare global {
  interface Window {
    vault: {
      invoke: <T>(channel: string, params?: unknown) => Promise<T>
      on: (channel: string, listener: (...args: unknown[]) => void) => () => void
      getPathForFile: (file: File) => string
    }
  }
}

export async function invoke<T>(channel: string, params?: unknown): Promise<T> {
  return window.vault.invoke<T>(channel, params)
}

export function onEvent(channel: string, listener: (...args: unknown[]) => void): () => void {
  return window.vault.on(channel, listener)
}

export function getPathForFile(file: File): string {
  return window.vault.getPathForFile(file)
}
