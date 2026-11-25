import { STATUS_LABEL, type TraceRecord } from '../types'

const PREFIX = 'rrweb-trace:record:'
export const MAX_RECORDS = 20

export interface RecordSummary {
  record: TraceRecord
  size: number
}

function keys(): string[] {
  return Array.from({ length: localStorage.length }, (_, i) => localStorage.key(i)!).filter((k) => k.startsWith(PREFIX))
}

function parse(raw: string | null): TraceRecord | null {
  if (!raw) return null
  try {
    const r = JSON.parse(raw)
    const valid =
      r &&
      typeof r.id === 'string' &&
      typeof r.startedAt === 'number' &&
      typeof r.endedAt === 'number' &&
      r.status in STATUS_LABEL &&
      Array.isArray(r.events)
    return valid ? r : null
  } catch {
    return null
  }
}

/** 新到舊；損毀資料略過 */
export function listRecords(): RecordSummary[] {
  return keys()
    .flatMap((k) => {
      const raw = localStorage.getItem(k)
      const record = parse(raw)
      return record ? [{ record, size: new Blob([raw!]).size }] : []
    })
    .sort((a, b) => b.record.startedAt - a.record.startedAt)
}

export const getRecord = (id: string) => parse(localStorage.getItem(PREFIX + id))
export const removeRecord = (id: string) => localStorage.removeItem(PREFIX + id)
export const clearRecords = () => keys().forEach((k) => localStorage.removeItem(k))

/** 寫入或覆蓋。空間不足時由最舊刪起再試；仍失敗回傳 false，不拋錯 */
export function saveRecord(record: TraceRecord): boolean {
  const json = JSON.stringify(record)
  const others = listRecords()
    .map((s) => s.record.id)
    .filter((id) => id !== record.id)
  while (others.length >= MAX_RECORDS) removeRecord(others.pop()!)
  for (;;) {
    try {
      localStorage.setItem(PREFIX + record.id, json)
      return true
    } catch {
      const oldest = others.pop()
      if (!oldest) return false
      removeRecord(oldest)
    }
  }
}
