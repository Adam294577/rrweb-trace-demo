import type { eventWithTime } from '@rrweb/types'
import type { FormData } from './utils/validate'

export type RecordStatus = 'unsent' | 'submitting' | 'invalid' | 'server-error' | 'success'

export const STATUS_LABEL: Record<RecordStatus, string> = {
  unsent: '未送出',
  submitting: '送出中離開',
  invalid: '失敗（驗證）',
  'server-error': '失敗（伺服器）',
  success: '成功',
}

export const FIELD_LABEL: Record<string, string> = {
  mockResult: '模擬結果',
  name: '姓名',
  email: 'Email',
  phone: '手機',
  password: '密碼',
  category: '類別',
  remark: '備註',
  agree: '同意條款',
}

/** 送出內容，不含密碼 */
export type SafeFormData = Omit<FormData, 'password'>

export interface TraceRecord {
  id: string
  startedAt: number
  endedAt: number
  status: RecordStatus
  /** 達錄製時間上限，後段沒有畫面 */
  truncated: boolean
  /** 最後一次送出的內容 */
  submission: SafeFormData | null
  events: eventWithTime[]
}

export interface ResultPayload {
  status: Extract<RecordStatus, 'invalid' | 'server-error' | 'success'>
  message: string
}
