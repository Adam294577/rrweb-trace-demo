import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { clearRecords, getRecord, listRecords, MAX_RECORDS, removeRecord, saveRecord } from '../src/services/recordStore'
import type { TraceRecord } from '../src/types'

const make = (n: number): TraceRecord => ({
  id: `r${n}`,
  startedAt: n,
  endedAt: n + 1,
  status: 'success',
  truncated: false,
  submission: null,
  events: [],
})

beforeEach(() => localStorage.clear())
afterEach(() => {
  vi.unstubAllGlobals()
})

describe('recordStore', () => {
  it('寫入、覆蓋、讀取、刪除，新的排前面', () => {
    saveRecord(make(1))
    saveRecord(make(2))
    saveRecord({ ...make(1), status: 'invalid' })
    expect(listRecords().map((s) => s.record.id)).toEqual(['r2', 'r1'])
    expect(getRecord('r1')?.status).toBe('invalid')
    removeRecord('r1')
    expect(getRecord('r1')).toBeNull()
  })

  it('略過損毀資料，清空不影響其他 key', () => {
    localStorage.setItem('rrweb-trace:record:x', '{bad')
    localStorage.setItem('rrweb-trace:record:y', '{"id":"y"}')
    localStorage.setItem('other', '1')
    expect(listRecords()).toEqual([])
    clearRecords()
    expect(localStorage.length).toBe(1)
  })

  it('超過上限刪最舊', () => {
    for (let i = 1; i <= MAX_RECORDS + 2; i++) saveRecord(make(i))
    const ids = listRecords().map((s) => s.record.id)
    expect(ids).toHaveLength(MAX_RECORDS)
    expect(ids).not.toContain('r2')
    expect(ids).toContain('r3')
  })

  it('配額不足刪最舊再試；全刪仍不足回傳 false', () => {
    const data = new Map<string, string>()
    let limit = 2
    vi.stubGlobal('localStorage', {
      get length() {
        return data.size
      },
      key: (i: number) => [...data.keys()][i] ?? null,
      getItem: (k: string) => data.get(k) ?? null,
      removeItem: (k: string) => data.delete(k),
      setItem: (k: string, v: string) => {
        if (!data.has(k) && data.size >= limit) throw new Error('QuotaExceededError')
        data.set(k, v)
      },
    })
    expect([1, 2, 3].map((n) => saveRecord(make(n)))).toEqual([true, true, true])
    expect(listRecords().map((s) => s.record.id)).toEqual(['r3', 'r2'])
    limit = 0
    expect(saveRecord(make(4))).toBe(false)
  })
})
