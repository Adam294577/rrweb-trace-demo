import { EventType, IncrementalSource, type eventWithTime } from '@rrweb/types'
import { record } from 'rrweb'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { saveRecord } from '../services/recordStore'
import type { RecordStatus, ResultPayload, SafeFormData } from '../types'

const MAX_DURATION = 5 * 60 * 1000
/** 成功後續錄，讓成功訊息入鏡 */
const TAIL = 1000

interface Session {
  id: string
  startedAt: number
  status: RecordStatus
  truncated: boolean
  submission: SafeFormData | null
  events: eventWithTime[]
  dirty: boolean
  stopRrweb: (() => void) | undefined
  limitTimer: number | undefined
  tailTimer: number | undefined
}

export function useRecorder() {
  const recording = ref(false)
  const saveFailed = ref(false)
  let session: Session | null = null

  function start() {
    finish()
    saveFailed.value = false
    recording.value = true
    const s: Session = {
      id: crypto.randomUUID(),
      startedAt: Date.now(),
      status: 'unsent',
      truncated: false,
      submission: null,
      events: [],
      dirty: false,
      stopRrweb: undefined,
      limitTimer: undefined,
      tailTimer: undefined,
    }
    session = s
    s.stopRrweb = record({
      emit(event) {
        s.events.push(event)
        if (
          event.type === EventType.IncrementalSnapshot &&
          event.data.source === IncrementalSource.Input &&
          event.data.userTriggered
        )
          markDirty(s)
      },
      recordAfter: 'DOMContentLoaded',
      maskInputOptions: { password: true },
      userTriggeredOnInput: true,
      sampling: { mousemove: 100, scroll: 150 },
    })
  }

  /** 有輸入或送出才算一筆，錄製上限也由此起算 */
  function markDirty(s: Session) {
    if (s.dirty) return
    s.dirty = true
    s.limitTimer = window.setTimeout(() => {
      s.truncated = true
      stopCapture(s)
      save(s)
    }, MAX_DURATION)
  }

  function stopCapture(s: Session) {
    clearTimeout(s.limitTimer)
    s.stopRrweb?.()
    s.stopRrweb = undefined
    if (session === s) recording.value = false
  }

  function save(s: Session) {
    if (!s.dirty) return
    const { id, startedAt, status, truncated, submission, events } = s
    const endedAt = events.at(-1)?.timestamp ?? startedAt
    saveFailed.value = !saveRecord({ id, startedAt, endedAt, status, truncated, submission, events })
  }

  function finish() {
    const s = session
    if (!s) return
    clearTimeout(s.tailTimer)
    stopCapture(s)
    save(s)
    session = null
  }

  function addEvent(s: Session, tag: string, payload: object) {
    if (s.stopRrweb) record.addCustomEvent(tag, payload)
  }

  /** 回傳回報結果的函式；期間若已離開或重新開始，回報會被忽略 */
  function submitStarted(submission: SafeFormData): (result: ResultPayload) => void {
    const s = session
    if (!s) return () => {}
    markDirty(s)
    s.status = 'submitting'
    s.submission = submission
    addEvent(s, 'submit', {})
    return (result) => {
      if (session !== s) return
      s.status = result.status
      addEvent(s, 'result', result)
      save(s)
      if (result.status === 'success') s.tailTimer = window.setTimeout(finish, TAIL)
    }
  }

  const onPageHide = () => {
    if (session) save(session)
  }

  onMounted(() => {
    start()
    window.addEventListener('pagehide', onPageHide)
  })
  // 在卸載前停止，下一頁的畫面才不會被錄進來
  onBeforeUnmount(() => {
    window.removeEventListener('pagehide', onPageHide)
    finish()
  })

  return { recording, saveFailed, start, submitStarted }
}
