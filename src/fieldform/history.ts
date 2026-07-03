import type { Values } from './markers'

export interface Template {
  id: string
  title: string
  docText: string
  createdAt: number
}

export interface HistoryEntry {
  id: string
  templateId: string
  title: string
  fallbackTitle: string | null
  docText: string
  values: Values
  updatedAt: number
}

const DB_NAME = 'fieldform'
const STORE = 'documents'
const TEMPLATE_STORE = 'templates'
const MAX_PER_TEMPLATE = 20

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 2)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
      if (!db.objectStoreNames.contains(TEMPLATE_STORE)) db.createObjectStore(TEMPLATE_STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

export async function loadHistory(): Promise<HistoryEntry[]> {
  try {
    const db = await openDb()
    const list = await new Promise<HistoryEntry[]>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly')
      const req = tx.objectStore(STORE).getAll()
      req.onsuccess = () => resolve(req.result as HistoryEntry[])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return list.sort((a, b) => b.updatedAt - a.updatedAt)
  } catch {
    return []
  }
}

export async function putHistoryEntry(entry: HistoryEntry): Promise<HistoryEntry[]> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).put(entry)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    const list = await loadHistory()
    const overflow = list.filter((e) => e.templateId === entry.templateId).slice(MAX_PER_TEMPLATE)
    if (overflow.length) {
      const tx = db.transaction(STORE, 'readwrite')
      overflow.forEach((e) => tx.objectStore(STORE).delete(e.id))
      await new Promise<void>((resolve) => {
        tx.oncomplete = () => resolve()
      })
    }
    db.close()
    const overflowIds = new Set(overflow.map((e) => e.id))
    return list.filter((e) => !overflowIds.has(e.id))
  } catch {
    return loadHistory()
  }
}

export async function removeHistoryEntry(id: string): Promise<HistoryEntry[]> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite')
      tx.objectStore(STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // ignore
  }
  return loadHistory()
}

export async function loadTemplates(): Promise<Template[]> {
  try {
    const db = await openDb()
    const list = await new Promise<Template[]>((resolve, reject) => {
      const tx = db.transaction(TEMPLATE_STORE, 'readonly')
      const req = tx.objectStore(TEMPLATE_STORE).getAll()
      req.onsuccess = () => resolve(req.result as Template[])
      req.onerror = () => reject(req.error)
    })
    db.close()
    return list.sort((a, b) => b.createdAt - a.createdAt)
  } catch {
    return []
  }
}

export async function putTemplate(t: Template): Promise<Template[]> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TEMPLATE_STORE, 'readwrite')
      tx.objectStore(TEMPLATE_STORE).put(t)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // ignore
  }
  return loadTemplates()
}

export async function removeTemplate(id: string): Promise<Template[]> {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(TEMPLATE_STORE, 'readwrite')
      tx.objectStore(TEMPLATE_STORE).delete(id)
      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch {
    // ignore
  }
  return loadTemplates()
}

export function relTime(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const min = 60000
  const h = 3600000
  const d = 86400000
  if (diff < min) return 'agora'
  if (diff < h) return 'há ' + Math.floor(diff / min) + ' min'
  if (diff < d) return 'há ' + Math.floor(diff / h) + ' h'
  if (diff < 2 * d) return 'ontem'
  return new Date(ts).toLocaleDateString('pt-BR')
}

export function firstHeading(text: string): string {
  const m = /^#{1,3}\s+(.*)$/m.exec(text || '')
  return m ? m[1].replace(/\{\{[^}]*\}\}/g, '…').trim() : ''
}
